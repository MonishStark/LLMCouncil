import React, { useEffect, useState } from 'react';
import { ConversationState, SynthesisResult } from '../types';
import { RefreshCw, Save, AlertCircle, User, MessageSquare } from 'lucide-react';
import { CopyButton } from './CopyButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Stage3ResultProps {
  state: ConversationState;
  setState: React.Dispatch<React.SetStateAction<ConversationState>>;
  onRestart: () => void;
  onAutoSave?: () => void;
}

export const Stage3Result: React.FC<Stage3ResultProps> = ({ state, setState, onRestart, onAutoSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(state.selectedModels[0] || '');
  const [activeStage2Tab, setActiveStage2Tab] = useState<string>(state.selectedModels[0] || '');

  useEffect(() => {
    // Only fetch if we don't have a result yet
    if (!state.stage3Result && !loading && !error) {
      synthesize();
    }
  }, []);

  const synthesize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: state.id,
          question: state.question,
          stage1_responses: state.stage1Responses,
          stage2_reviews: state.stage2Reviews,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize response');
      }

      const data: SynthesisResult = await response.json();
      setState(prev => ({ ...prev, stage3Result: data }));
      
      // Notify parent to refresh list
      if (onAutoSave) {
        onAutoSave();
      }
      
      // Persist this as the active session
      if (state.id) {
        localStorage.setItem('lastActiveConversationId', state.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveConversation = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: state.question.substring(0, 50) + '...',
          question: state.question,
          data: state
        }),
      });
      
      if (response.ok) {
        alert('Conversation saved!');
      }
    } catch (err) {
      console.error('Failed to save', err);
      alert('Failed to save conversation');
    }
  };



  const stage3Ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.stage3Result && stage3Ref.current) {
      stage3Ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.stage3Result]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">The Chairman is deliberating...</h2>
        <p className="text-gray-500 mt-2">Synthesizing insights from {state.selectedModels.length} models</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Synthesis Failed</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={synthesize}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  if (!state.stage3Result) return null;

  return (
    <div className="space-y-12">
      
      {/* Section 1: YOU */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <User size={16} /> YOU
        </h3>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-gray-800 text-lg">
          {state.question}
        </div>
      </div>

      {/* Section 2: LLM COUNCIL (Stage 1) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare size={16} /> LLM COUNCIL
        </h3>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
            {state.stage1Responses.map((r) => (
              <button
                key={r.model}
                onClick={() => setActiveTab(r.model)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === r.model
                    ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200 -mb-px'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {r.model}
              </button>
            ))}
          </div>
          <div className="p-6 min-h-[200px]">
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {state.stage1Responses.find(r => r.model === activeTab)?.response || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Stage 2 Responses */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare size={16} /> Stage 2: Peer Reviews
        </h3>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
            {state.stage2Reviews.map((r) => (
              <button
                key={r.model}
                onClick={() => setActiveStage2Tab(r.model)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeStage2Tab === r.model
                    ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200 -mb-px'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {r.model}
              </button>
            ))}
          </div>
          <div className="p-6 min-h-[200px]">
            {state.stage2Reviews.map((review) => {
              if (review.model !== activeStage2Tab) return null;
              
              const extractedRanking = (() => {
                const match = review.review.match(/FINAL RANKING:([\s\S]*)/i);
                if (!match) return [];
                const lines = match[1].trim().split('\n');
                const ranking: string[] = [];
                for (const line of lines) {
                  const rankMatch = line.trim().match(/(\d+)\.\s*(Response [A-Z])/i);
                  if (rankMatch) {
                    ranking.push(rankMatch[2]); // "Response A"
                  }
                }
                return ranking;
              })();

              return (
                <div key={review.model} className="animate-in fade-in duration-200">
                  <div className="prose prose-sm max-w-none text-gray-700 mb-8">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{review.review}</ReactMarkdown>
                  </div>

                  <div className="space-y-6">
                    {/* Extracted Ranking */}
                    {extractedRanking.length > 0 && (
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h5 className="font-bold text-blue-700 text-sm mb-4 flex items-center gap-2">
                          Extracted Ranking:
                        </h5>
                        <div className="space-y-2 pl-4">
                          {extractedRanking.map((label, i) => (
                            <div key={i} className="text-sm text-gray-700 font-medium">
                              {i + 1}. {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Aggregate Ranking */}
                    {state.stage3Result && state.stage3Result.aggregate_rankings.length > 0 && (
                      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h5 className="font-bold text-blue-700 text-sm mb-4 flex items-center gap-2">
                          Aggregate Rankings
                        </h5>
                        <p className="text-xs text-gray-500 mb-4">
                          Combined results across all peer evaluations (lower score is better):
                        </p>
                        <div className="space-y-2">
                          {state.stage3Result.aggregate_rankings.map((rank, i) => {
                            const modelIndex = state.stage1Responses.findIndex(r => r.model === rank.model);
                            const label = modelIndex !== -1 ? `Response ${String.fromCharCode(65 + modelIndex)}` : rank.model;
                            
                            return (
                              <div key={rank.model} className="flex items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 bg-blue-100 text-blue-700">
                                  #{i + 1}
                                </div>
                                <div className="flex-1 flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-800">{label}</span>
                                  <span className="text-xs text-gray-500">
                                    Avg: {rank.avg_rank} <span className="opacity-50">({rank.votes} votes)</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 4: Stage 3 Final Answer */}
      <div className="space-y-4" ref={stage3Ref}>
        <h3 className="text-xl font-bold text-green-800">Stage 3: Final Council Answer</h3>
        <div className="bg-white p-8 rounded-lg shadow-lg border border-green-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                Chairman: <span className="font-mono text-sm bg-green-100 px-2 py-1 rounded text-green-700">gemini-3-pro-preview</span>
              </h2>
            </div>
            <div className="flex gap-2">
               <CopyButton text={state.stage3Result.final_answer} />
               <button 
                 onClick={saveConversation}
                 className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                 title="Save Conversation"
               >
                 <Save size={20} />
               </button>
            </div>
          </div>
          
          <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.stage3Result.final_answer}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-8 pb-12">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
        >
          <RefreshCw size={18} /> Start New Session
        </button>
      </div>
    </div>
  );
};
