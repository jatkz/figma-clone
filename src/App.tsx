import { useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import LogoutButton from './components/LogoutButton';
import Canvas from './components/Canvas';
import ToolPanel, { useToolState } from './components/ToolPanel';
import FirestoreTest from './components/FirestoreTest';
import './App.css';

function App() {
  const { activeTool, setActiveTool } = useToolState('select');
  const [showFirestoreTest, setShowFirestoreTest] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ProtectedRoute>
        {/* Header with logout */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  CollabCanvas
                </h1>
                
                {/* Firestore Test Toggle */}
                <button
                  onClick={() => setShowFirestoreTest(!showFirestoreTest)}
                  className={`ml-4 px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    showFirestoreTest 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  🔥 Test Firestore
                </button>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>


        {/* Main content area - Canvas and Tool Panel OR Firestore Test */}
        <main className="flex-1 overflow-hidden">
          {showFirestoreTest ? (
            /* Firestore Test Interface */
            <div className="p-4 h-full overflow-y-auto">
              <FirestoreTest />
            </div>
          ) : (
            /* Normal Canvas Interface */
            <div className="flex h-full">
              {/* Tool Panel */}
              <div className="p-4 flex-shrink-0">
                <ToolPanel 
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                />
              </div>
              
              {/* Canvas Area */}
              <div className="flex-1 p-4 pl-0">
                <div className="bg-white rounded-lg shadow h-full">
                  <Canvas activeTool={activeTool} />
                </div>
              </div>
            </div>
          )}
        </main>
      </ProtectedRoute>
    </div>
  );
}


export default App;
