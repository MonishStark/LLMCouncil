import React, { useState, useEffect } from 'react';
import { CopyButton } from './CopyButton';
import { ConversationState, AVAILABLE_MODELS } from '../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Stage1InputProps {
  state: ConversationState;
  setState: React.Dispatch<React.SetStateAction<ConversationState>>;
  onNext: () => void;
}

export const Stage1Input: React.FC<Stage1InputProps> = ({ state, setState, onNext }) => {
  const [questionInput, setQuestionInput] = useState(state.question);

  // Update state when question input changes (debounced or on blur could be better, but direct is fine for now)
  useEffect(() => {
    setState(prev => ({ ...prev, question: questionInput }));
  }, [questionInput, setState]);

  const toggleModel = (model: string) => {
    setState(prev => {
      const newModels = prev.selectedModels.includes(model)
        ? prev.selectedModels.filter(m => m !== model)
        : [...prev.selectedModels, model];
      
      // Also update responses array to match selected models
      const newResponses = prev.stage1Responses.filter(r => newModels.includes(r.model));
      // Add empty entries for new models if not present
      newModels.forEach(m => {
        if (!newResponses.find(r => r.model === m)) {
          newResponses.push({ model: m, response: '' });
        }
      });

      return { ...prev, selectedModels: newModels, stage1Responses: newResponses };
    });
  };

  const handleResponseChange = (model: string, value: string) => {
    setState(prev => ({
      ...prev,
      stage1Responses: prev.stage1Responses.map(r => 
        r.model === model ? { ...r, response: value } : r
      )
    }));
  };

  const isComplete = state.question.length > 0 && 
                     state.selectedModels.length >= 2 && 
                     state.stage1Responses.every(r => r.response.length > 50);

  return (
    <div className="space-y-8">
      {/* Question Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">Step 1</span>
          Define Your Question
        </h2>
        <div className="relative">
          <textarea
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Enter your question for the council..."
            className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {questionInput && (
            <div className="absolute top-2 right-2">
              <CopyButton text={questionInput} />
            </div>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Select Council Members</h2>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_MODELS.map(model => (
            <button
              key={model}
              onClick={() => toggleModel(model)}
              className={`px-4 py-2 rounded-full border transition-colors ${
                state.selectedModels.includes(model)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {model}
            </button>
          ))}
        </div>
        {state.selectedModels.length < 2 && (
          <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
            <AlertCircle size={16} /> Select at least 2 models
          </p>
        )}
      </div>

      {/* Response Collection */}
      {state.selectedModels.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Collect Responses</h2>
          <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm mb-4">
            <strong>Instructions:</strong> Copy your question above, paste it into each AI model's website, and paste their full response below.
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {state.stage1Responses.map((item) => (
              <div key={item.model} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-lg">{item.model} Response</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.response.length > 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.response.length} chars
                  </span>
                </div>
                <textarea
                  value={item.response}
                  onChange={(e) => handleResponseChange(item.model, e.target.value)}
                  placeholder={`Paste response from ${item.model} here...`}
                  className="w-full h-64 p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!isComplete}
          className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
            isComplete
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Proceed to Stage 2 <CheckCircle size={20} />
        </button>
      </div>
    </div>
  );
};
