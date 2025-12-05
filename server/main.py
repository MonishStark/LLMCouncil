from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import storage
from models import SynthesisRequest, SynthesisResponse, ConversationCreate, Conversation
from services.gemini_service import synthesize_answer

app = FastAPI(title="LLM Council API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to LLM Council API"}

@app.post("/api/synthesize", response_model=SynthesisResponse)
async def synthesize(request: SynthesisRequest):
    # 1. Generate Synthesis
    result = await synthesize_answer(request)
    
    # 2. Auto-Save Conversation
    # Construct the full conversation state to save
    conversation_state = {
        "id": request.id,
        "question": request.question,
        "selectedModels": [r.model for r in request.stage1_responses],
        "stage1Responses": [r.dict() for r in request.stage1_responses],
        "stage2Reviews": [r.dict() for r in request.stage2_reviews],
        "stage3Result": result.dict(),
        "currentStage": 3
    }
    
    try:
        storage.save_conversation(conversation_state)
        print("Auto-saved conversation successfully.")
    except Exception as e:
        print(f"Failed to auto-save conversation: {e}")

    return result

@app.get("/api/conversations", response_model=List[Dict[str, Any]])
def get_conversations():
    return storage.list_conversations()

@app.post("/api/conversations", response_model=Dict[str, Any])
def create_conversation(conversation: ConversationCreate):
    # The frontend sends 'data' which is the ConversationState
    # We pass this directly to storage.save_conversation
    return storage.save_conversation(conversation.data)

@app.get("/api/conversations/{conversation_id}", response_model=Dict[str, Any])
def get_conversation(conversation_id: str):
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    success = storage.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or could not be deleted")
    return {"message": "Conversation deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
