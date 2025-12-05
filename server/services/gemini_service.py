import os
import google.generativeai as genai
from dotenv import load_dotenv
from models import SynthesisResponse, AggregateRanking
import re
from typing import List, Dict

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def get_model():
    model_name = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    return genai.GenerativeModel(model_name)

def parse_rankings(reviews: List[Dict[str, str]]) -> List[AggregateRanking]:
    """
    Parses the 'FINAL RANKING:' section from each review and calculates aggregate scores.
    Scoring: 1st place = 1 point, 2nd = 2 points, etc. Lower is better.
    """
    model_scores = {} # model -> list of ranks
    
    for review_item in reviews:
        review_text = review_item.review
        # Look for the ranking section
        match = re.search(r"FINAL RANKING:(.*)", review_text, re.DOTALL | re.IGNORECASE)
        if match:
            ranking_text = match.group(1)
            # Parse lines like "1. Response A" or "1. ChatGPT"
            # We need to map "Response A" back to the model name if anonymized.
            # But wait, the Stage 2 prompt uses "Response A", "Response B".
            # The backend receives the reviews. The reviews themselves will contain "Response A", etc.
            # We need to know which model corresponds to "Response A".
            # The frontend generates A, B, C based on the order of stage1_responses.
            # We assume stage1_responses order is preserved.
            
            # This is tricky. The backend needs to know the mapping.
            # The current API request `SynthesisRequest` has `stage1_responses` list.
import os
import google.generativeai as genai
from dotenv import load_dotenv
from models import SynthesisResponse, AggregateRanking
import re
from typing import List, Dict

import httpx
import json

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def get_model():
    model_name = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    return genai.GenerativeModel(model_name)

def parse_rankings(reviews: List[Dict[str, str]]) -> List[AggregateRanking]:
    """
    Parses the 'FINAL RANKING:' section from each review and calculates aggregate scores.
    Scoring: 1st place = 1 point, 2nd = 2 points, etc. Lower is better.
    """
    model_scores = {} # model -> list of ranks
    
    for review_item in reviews:
        review_text = review_item.review
        # Look for the ranking section
        match = re.search(r"FINAL RANKING:(.*)", review_text, re.DOTALL | re.IGNORECASE)
        if match:
            ranking_text = match.group(1)
            # Parse lines like "1. Response A" or "1. ChatGPT"
            # We need to map "Response A" back to the model name if anonymized.
            # But wait, the Stage 2 prompt uses "Response A", "Response B".
            # The backend receives the reviews. The reviews themselves will contain "Response A", etc.
            # We need to know which model corresponds to "Response A".
            # The frontend generates A, B, C based on the order of stage1_responses.
            # We assume stage1_responses order is preserved.
            
            # This is tricky. The backend needs to know the mapping.
            # The current API request `SynthesisRequest` has `stage1_responses` list.
            # We can reconstruct the mapping: Index 0 -> A, Index 1 -> B...
            pass

    # Actually, let's do the parsing in the main synthesis logic where we have all data.
    return []

async def synthesize_answer(request_data) -> SynthesisResponse:
    # 1. Construct the prompt (Same as before)
    question = request_data.question
    responses = request_data.stage1_responses
    reviews = request_data.stage2_reviews

    prompt_text = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {question}

STAGE 1 - Individual Responses:
"""
    
    letter_to_model = {}
    for i, r in enumerate(responses):
        letter = chr(65 + i) # A, B, C...
        letter_to_model[f"Response {letter}"] = r.model
        prompt_text += f"\nModel: {r.model}\nResponse: {r.response}\n"

    prompt_text += "\nSTAGE 2 - Peer Rankings:\n"
    
    for r in reviews:
        prompt_text += f"\nModel: {r.model}\nRanking: {r.review}\n"

    prompt_text += """
Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:
"""

    print("Prompt:", prompt_text)
    # 2. Call Custom REST API
    custom_key = os.getenv("GEMINI_CUSTOM_KEY")
    endpoint = os.getenv("GEMINI_CUSTOM_ENDPOINT")
    
    if not custom_key or not endpoint:
        return SynthesisResponse(final_answer="Error: Missing GEMINI_CUSTOM_KEY or GEMINI_CUSTOM_ENDPOINT", aggregate_rankings=[])

    url = f"{endpoint}?key={custom_key}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt_text
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 1,
            "maxOutputTokens": 65535,
            "topP": 0.95,
            "thinkingConfig": {
                "thinkingLevel": "HIGH"
            }
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "OFF"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "OFF"}
        ],
        "tools": [
            {
                "googleSearch": {}
            }
        ]
    }

    final_answer = ""
    try:
        async with httpx.AsyncClient() as client:
            # Increased timeout for thinking models
            response = await client.post(url, json=payload, timeout=300.0)
            
            if response.status_code != 200:
                final_answer = f"Error {response.status_code}: {response.text}"
            else:
                # Parse streaming response
                # The response is a JSON array of chunks if streamGenerateContent is used, 
                # but httpx.post returns the full body if we don't use stream=True.
                # However, the endpoint returns a list of JSON objects (like `[{...}, {...}]`).
                data = response.json()
                
                # Aggregate text from all chunks
                for chunk in data:
                    if "candidates" in chunk:
                        for candidate in chunk["candidates"]:
                            if "content" in candidate and "parts" in candidate["content"]:
                                for part in candidate["content"]["parts"]:
                                    if "text" in part:
                                        final_answer += part["text"]

    except Exception as e:
        final_answer = f"Error calling API: {str(e)}"

    # 3. Calculate Rankings (Same as before)
    model_ranks = {} 
    
    for review in reviews:
        text = review.review
        match = re.search(r"FINAL RANKING:(.*)", text, re.DOTALL | re.IGNORECASE)
        if match:
            ranking_lines = match.group(1).strip().split('\n')
            for line in ranking_lines:
                line = line.strip()
                rank_match = re.match(r"(\d+)\.\s*(Response [A-Z])", line, re.IGNORECASE)
                if rank_match:
                    rank = int(rank_match.group(1))
                    label = rank_match.group(2)
                    label_key = label.title() 
                    
                    if label_key in letter_to_model:
                        target_model = letter_to_model[label_key]
                        if target_model not in model_ranks:
                            model_ranks[target_model] = []
                        model_ranks[target_model].append(rank)

    # Compute aggregates
    aggregate_rankings = []
    for m_name, ranks in model_ranks.items():
        avg = sum(ranks) / len(ranks)
        aggregate_rankings.append(AggregateRanking(
            model=m_name,
            avg_rank=round(avg, 2),
            votes=len(ranks)
        ))
    
    # Sort by avg_rank (ascending)
    aggregate_rankings.sort(key=lambda x: x.avg_rank)

    return SynthesisResponse(
        final_answer=final_answer,
        aggregate_rankings=aggregate_rankings
    )
