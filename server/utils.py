import re
from typing import List, Dict, Any

def parse_ranking_from_text(text: str) -> List[str]:
    """
    Extracts the ranked list of models/responses from the review text.
    Returns a list of labels (e.g., ["Response C", "Response A", "Response B"]).
    """
    match = re.search(r"FINAL RANKING:(.*)", text, re.DOTALL | re.IGNORECASE)
    parsed_ranking = []
    if match:
        ranking_lines = match.group(1).strip().split('\n')
        for line in ranking_lines:
            line = line.strip()
            # Match "1. Response A" or "1. Response A..."
            rank_match = re.match(r"(\d+)\.\s*(Response [A-Z])", line, re.IGNORECASE)
            if rank_match:
                parsed_ranking.append(rank_match.group(2).title()) # "Response A"
    return parsed_ranking

def calculate_aggregate_rankings(stage1_responses: List[Dict], stage2_reviews: List[Dict]) -> List[Dict]:
    """
    Re-calculates aggregate rankings based on Stage 1 responses (for mapping A/B/C to models)
    and Stage 2 reviews (containing the rankings).
    """
    # 1. Map "Response A" -> Model Name
    letter_to_model = {}
    for i, r in enumerate(stage1_responses):
        letter = chr(65 + i) # A, B, C...
        letter_to_model[f"Response {letter}"] = r['model']

    # 2. Collect Ranks
    model_ranks = {} # model -> list of ranks
    
    for review in stage2_reviews:
        # If review is a dict from frontend state, it has 'review' key
        # If it's from storage JSON, it might be different, but let's assume standard dict
        text = review.get('review', '') or review.get('ranking', '')
        
        parsed = parse_ranking_from_text(text)
        
        for i, label in enumerate(parsed):
            rank = i + 1
            if label in letter_to_model:
                target_model = letter_to_model[label]
                if target_model not in model_ranks:
                    model_ranks[target_model] = []
                model_ranks[target_model].append(rank)

    # 3. Compute Aggregates
    aggregate_rankings = []
    for m_name, ranks in model_ranks.items():
        avg = sum(ranks) / len(ranks)
        aggregate_rankings.append({
            "model": m_name,
            "avg_rank": round(avg, 2),
            "votes": len(ranks)
        })
    
    # Sort by avg_rank
    aggregate_rankings.sort(key=lambda x: x['avg_rank'])
    
    return aggregate_rankings
