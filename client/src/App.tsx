import { useState, useEffect } from 'react'
import { Stage1Input } from './components/Stage1Input'
import { Stage2Review } from './components/Stage2Review'
import { Stage3Result } from './components/Stage3Result'
import { ConversationState } from './types'
import { MessageSquare, Plus, X, Menu } from 'lucide-react'

function App() {
  const [conversation, setConversation] = useState<ConversationState>({
    id: crypto.randomUUID(),
    question: '',
    selectedModels: [],
    stage1Responses: [],
    stage2Reviews: [],
    stage3Result: null,
    currentStage: 1
  });

  const [savedConversations, setSavedConversations] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
    
    // Check for last active session
    const lastId = localStorage.getItem('lastActiveConversationId');
    if (lastId) {
      loadConversation({ id: lastId });
    }
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setSavedConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const loadConversation = async (saved: any) => {
    try {
      const res = await fetch(`http://localhost:8000/api/conversations/${saved.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setConversation({
          ...fullData.data,
          id: fullData.id
        });
        localStorage.setItem('lastActiveConversationId', fullData.id);
        setIsSidebarOpen(false); // Close sidebar on mobile selection
      } else {
        if (saved.id === localStorage.getItem('lastActiveConversationId')) {
          localStorage.removeItem('lastActiveConversationId');
        }
      }
    } catch (err) {
      console.error("Failed to load conversation", err);
    }
  };

  const startNewSession = () => {
    const newId = crypto.randomUUID();
    setConversation({
      id: newId,
      question: '',
      selectedModels: [],
      stage1Responses: [],
      stage2Reviews: [],
      stage3Result: null,
      currentStage: 1
    });
    localStorage.removeItem('lastActiveConversationId');
    setIsSidebarOpen(false);
  };

  const handleStage1Next = () => {
    setConversation(prev => ({ ...prev, currentStage: 2 }));
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const res = await fetch(`http://localhost:8000/api/conversations/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSavedConversations(prev => prev.filter(c => c.id !== id));
        
        if (conversation.id === id) {
          startNewSession();
        }
        
        if (id === localStorage.getItem('lastActiveConversationId')) {
          localStorage.removeItem('lastActiveConversationId');
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-20">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600 -ml-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="text-blue-600" size={20} />
          LLM Council
        </h1>
        <div className="w-8"></div> {/* Spacer to center title if needed, or just leave as space-between */}
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col h-full transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-200 hidden md:block">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-blue-600" />
            LLM Council
          </h1>
        </div>
        
        <div className="p-4">
          <button 
            onClick={startNewSession}
            className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} /> New Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {savedConversations.length === 0 ? (
              <div className="text-sm text-gray-400 italic">No saved sessions</div>
            ) : (
              savedConversations.map(c => (
                <div key={c.id} className="group relative">
                  <button
                    onClick={() => loadConversation(c)}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm text-gray-700 truncate pr-8"
                    title={c.title}
                  >
                    {c.title || 'Untitled Session'}
                  </button>
                  <button
                    onClick={(e) => deleteConversation(e, c.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Session"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Progress Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
              
              {[1, 2, 3].map((step) => (
                <div key={step} className={`flex flex-col items-center bg-gray-50 px-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 transition-colors ${
                    conversation.currentStage >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  <span className={`text-xs font-medium ${
                    conversation.currentStage >= step ? 'text-blue-800' : 'text-gray-500'
                  }`}>
                    {step === 1 ? 'Collect Responses' : step === 2 ? 'Peer Review' : 'Synthesis'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Content */}
          {conversation.currentStage === 1 && (
            <Stage1Input 
              state={conversation} 
              setState={setConversation} 
              onNext={handleStage1Next} 
            />
          )}
          
          {conversation.currentStage === 2 && (
            <Stage2Review 
              state={conversation} 
              setState={setConversation} 
              onNext={() => setConversation(prev => ({ ...prev, currentStage: 3 }))}
              onBack={() => setConversation(prev => ({ ...prev, currentStage: 1 }))}
            />
          )}

          {conversation.currentStage === 3 && (
            <Stage3Result 
              state={conversation} 
              setState={setConversation}
              onRestart={() => {
                startNewSession();
                fetchConversations(); // Refresh list
              }}
              onAutoSave={fetchConversations}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
