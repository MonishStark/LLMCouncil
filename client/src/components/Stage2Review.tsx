import React, { useState, useEffect } from 'react';
import { CopyButton } from './CopyButton';
import { ConversationState } from '../types';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface Stage2ReviewProps {
  state: ConversationState;
  setState: React.Dispatch<React.SetStateAction<ConversationState>>;
  onNext: () => void;
  onBack: () => void;
}

export const Stage2Review: React.FC<Stage2ReviewProps> = ({ state, setState, onNext, onBack }) => {
  const [prompt, setPrompt] = useState('');

  // Generate prompt on mount
  useEffect(() => {
    const anonymizedResponses = state.stage1Responses.map((r, index) => {
      const label = String.fromCharCode(65 + index); // A, B, C...
      return `Response ${label}:\n${r.response}\n`;
    }).join('\n');

    const generatedPrompt = `You are evaluating different responses to the following question:

Question: ${state.question}

Here are the responses from different models (anonymized):

${anonymizedResponses}
Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

    setPrompt(generatedPrompt);
    
    // Initialize reviews if empty
    if (state.stage2Reviews.length === 0) {
      const initialReviews = state.selectedModels.map(model => ({
        model,
        review: ''
      }));
      setState(prev => ({ ...prev, stage2Reviews: initialReviews }));
    }
  }, [state.question, state.stage1Responses, state.selectedModels, state.stage2Reviews.length, setState]);

  const handleReviewChange = (model: string, value: string) => {
    setState(prev => ({
      ...prev,
      stage2Reviews: prev.stage2Reviews.map(r => 
        r.model === model ? { ...r, review: value } : r
      )
    }));
  };

  const isComplete = state.stage2Reviews.length > 0 && 
                     state.stage2Reviews.every(r => r.review.length > 50);

  return (
    <div className="space-y-8">
      {/* Prompt Generation Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded">Step 2</span>
          Peer Review Prompt
        </h2>
        <div className="bg-orange-50 p-4 rounded-lg text-orange-800 text-sm mb-4">
          <strong>Instructions:</strong> Copy the prompt below and paste it to <strong>EACH</strong> AI model website. They will evaluate each other's work blindly.
        </div>
        <div className="relative">
          <textarea
            readOnly
            value={prompt}
            className="w-full h-64 p-4 border rounded-lg bg-gray-50 font-mono text-xs focus:outline-none"
          />
          <div className="absolute top-2 right-2">
            <CopyButton text={prompt} />
          </div>
        </div>
      </div>

      {/* Review Collection */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Collect Peer Reviews</h2>
        
        <div className="grid grid-cols-1 gap-6">
          {state.stage2Reviews.map((item) => (
            <div key={item.model} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">{item.model} Peer Review</h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.review.length > 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.review.length} chars
                </span>
              </div>
              <textarea
                value={item.review}
                onChange={(e) => handleReviewChange(item.model, e.target.value)}
                placeholder={`Paste ${item.model}'s evaluation of the other responses here...`}
                className="w-full h-64 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {item.review.length > 0 && !item.review.includes("FINAL RANKING:") && (
                <div className="mt-2 text-amber-600 text-xs flex items-center gap-1">
                  <AlertTriangle size={12} /> Warning: "FINAL RANKING:" not detected. Make sure the model followed the format.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
            isComplete
              ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Proceed to Stage 3 <CheckCircle size={20} />
        </button>
      </div>
    </div>
  );
};
