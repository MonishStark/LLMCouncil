import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from utils import parse_ranking_from_text, calculate_aggregate_rankings

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "conversations")

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def list_conversations() -> List[Dict]:
    ensure_data_dir()
    conversations = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            try:
                with open(os.path.join(DATA_DIR, filename), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Return minimal metadata
                    conversations.append({
                        "id": data.get("id"),
                        "title": data.get("title", "Untitled"),
                        "created_at": data.get("created_at"),
                        # We don't load the full data here to save memory
                        "data": None 
                    })
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    
    # Sort by created_at desc
    conversations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return conversations

def get_conversation(conversation_id: str) -> Optional[Dict]:
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, f"{conversation_id}.json")
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            stored_data = json.load(f)
            
        # Transform stored JSON back to frontend ConversationState
        # Stored format:
        # {
        #   "id": "...", "title": "...", "messages": [
        #     { "role": "user", "content": "..." },
        #     { "role": "assistant", "stage1": [...], "stage2": [...], "stage3": {...} }
        #   ]
        # }
        
        messages = stored_data.get("messages", [])
        user_msg = next((m for m in messages if m["role"] == "user"), None)
        assistant_msg = next((m for m in messages if m["role"] == "assistant"), None)
        
        question = user_msg["content"] if user_msg else ""
        
        stage1_responses = []
        stage2_reviews = []
        stage3_result = None
        selected_models = []
        
        if assistant_msg:
            # Stage 1
            for item in assistant_msg.get("stage1", []):
                stage1_responses.append({
                    "model": item["model"],
                    "response": item["response"]
                })
                selected_models.append(item["model"])
            
            # Stage 2
            for item in assistant_msg.get("stage2", []):
                stage2_reviews.append({
                    "model": item["model"],
                    "review": item["ranking"] # Map 'ranking' back to 'review'
                })
                
            # Stage 3
            s3_data = assistant_msg.get("stage3")
            if s3_data:
                # Re-calculate aggregates
                aggregates = calculate_aggregate_rankings(stage1_responses, stage2_reviews)
                stage3_result = {
                    "final_answer": s3_data["response"],
                    "aggregate_rankings": aggregates
                }
        
        # Determine current stage
        current_stage = 1
        if stage3_result:
            current_stage = 3
        elif stage2_reviews:
            current_stage = 3 # If we have reviews, we are likely at stage 3 or done with 2
        elif stage1_responses:
            current_stage = 2
            
        return {
            "id": stored_data["id"],
            "title": stored_data["title"],
            "created_at": stored_data["created_at"],
            "data": { # Frontend expects 'data' wrapper for state
                "id": stored_data["id"],
                "question": question,
                "selectedModels": selected_models,
                "stage1Responses": stage1_responses,
                "stage2Reviews": stage2_reviews,
                "stage3Result": stage3_result,
                "currentStage": current_stage
            }
        }

    except Exception as e:
        print(f"Error reading conversation {conversation_id}: {e}")
        return None

def save_conversation(frontend_state: Dict) -> Dict:
    ensure_data_dir()
    
    # Generate ID if not present
    conv_id = frontend_state.get("id") or str(uuid.uuid4())
    
    # Check if file exists to preserve created_at
    filepath = os.path.join(DATA_DIR, f"{conv_id}.json")
    created_at = datetime.utcnow().isoformat()
    
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                created_at = existing_data.get("created_at", created_at)
        except:
            pass # Use new timestamp if read fails
    title = frontend_state.get("question", "Untitled")[:50]
    
    # Transform frontend state to User JSON format
    messages = []
    
    # User Message
    messages.append({
        "role": "user",
        "content": frontend_state.get("question", "")
    })
    
    # Assistant Message (Aggregated)
    assistant_msg = {
        "role": "assistant",
        "stage1": [],
        "stage2": [],
        "stage3": None
    }
    
    # Stage 1
    for r in frontend_state.get("stage1Responses", []):
        assistant_msg["stage1"].append({
            "model": r["model"],
            "response": r["response"]
        })
        
    # Stage 2
    for r in frontend_state.get("stage2Reviews", []):
        # Parse ranking for storage
        parsed = parse_ranking_from_text(r["review"])
        assistant_msg["stage2"].append({
            "model": r["model"],
            "ranking": r["review"],
            "parsed_ranking": parsed
        })
        
    # Stage 3
    s3_res = frontend_state.get("stage3Result")
    if s3_res:
        # We need the chairman model name. 
        # Since it's not in frontend state explicitly, we'll use env or default.
        chairman_model = os.getenv("GEMINI_MODEL", "google/gemini-2.0-flash-exp:free")
        assistant_msg["stage3"] = {
            "model": chairman_model,
            "response": s3_res["final_answer"]
        }
        
    messages.append(assistant_msg)
    
    stored_data = {
        "id": conv_id,
        "created_at": created_at,
        "title": title,
        "messages": messages
    }
    
    filepath = os.path.join(DATA_DIR, f"{conv_id}.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(stored_data, f, indent=4)
        
    # Return in the format expected by the frontend (wrapper)
    return {
        "id": conv_id,
        "title": title,
        "created_at": created_at,
        "data": frontend_state
    }

def delete_conversation(conversation_id: str) -> bool:
    ensure_data_dir()
    filepath = os.path.join(DATA_DIR, f"{conversation_id}.json")
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            return True
        except Exception as e:
            print(f"Error deleting conversation {conversation_id}: {e}")
            return False
    return False
