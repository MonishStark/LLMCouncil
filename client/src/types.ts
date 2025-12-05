export interface ModelResponse {
  model: string;
  response: string;
}

export interface PeerReview {
  model: string;
  review: string;
}

export interface AggregateRanking {
  model: string;
  avg_rank: number;
  votes: number;
}

export interface SynthesisResult {
  final_answer: string;
  aggregate_rankings: AggregateRanking[];
}

export interface ConversationState {
  id?: string;
  title?: string;
  question: string;
  selectedModels: string[];
  stage1Responses: ModelResponse[];
  stage2Reviews: PeerReview[];
  stage3Result: SynthesisResult | null;
  currentStage: 1 | 2 | 3;
}

export const AVAILABLE_MODELS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "Llama",
  "Mistral"
];
