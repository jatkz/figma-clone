import { useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import LogoutButton from './components/LogoutButton';
import Canvas from './components/Canvas';
import ToolPanel, { useToolState } from './components/ToolPanel';
import PresenceIndicator from './components/PresenceIndicator';
import UserList from './components/UserList';
import { ToastProvider, useToastContext } from './contexts/ToastContext';
import { ToastManager } from './components/Toast';
import { useCanvas } from './hooks/useCanvas';
import { useAuth } from './hooks/useAuth';
import { createToastFunction } from './contexts/ToastContext';
import './App.css';


function AppContent() {
  const { activeTool, setActiveTool } = useToolState('select');
  const [showUserList, setShowUserList] = useState(false);
  const { toasts, removeToast } = useToastContext();
  const { user } = useAuth();
  const toastFunction = createToastFunction(useToastContext());
  const { deleteAllObjectsOptimistic } = useCanvas(user?.id, toastFunction);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast Manager - Rendered at App level with Portal */}
      <ToastManager toasts={toasts} onClose={removeToast} />
      
      <ProtectedRoute>
          {/* Header with logout */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16 min-w-0">
                <div className="flex items-center gap-6 min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">
                    CollabCanvas
                  </h1>
                  
                  {/* Presence Indicator */}
                  <div className="flex-shrink-0 min-w-fit">
                    <PresenceIndicator />
                  </div>

                  {/* User List Toggle */}
                  <button
                    onClick={() => setShowUserList(!showUserList)}
                    className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors flex-shrink-0 ${
                      showUserList 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    👥 Users
                  </button>

                  {/* Clear Canvas Button */}
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all objects from the canvas? This cannot be undone.')) {
                        deleteAllObjectsOptimistic();
                      }
                    }}
                    className="px-3 py-1 text-sm rounded-lg font-medium transition-colors flex-shrink-0 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
                    title="Delete all objects from canvas"
                  >
                    🗑️ Clear All
                  </button>
                </div>
                <div className="flex-shrink-0">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>

        {/* Main content area - Canvas and Tool Panel */}
        <main className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Tool Panel */}
            <div className="p-4 flex-shrink-0">
              <ToolPanel 
                activeTool={activeTool}
                onToolChange={setActiveTool}
              />
            </div>
            
            {/* Canvas Area */}
            <div className="flex-1 p-4 pl-0 pr-0">
              <div className="bg-white rounded-lg shadow h-full mr-4">
                <Canvas activeTool={activeTool} />
              </div>
            </div>
          </div>
        </main>

        {/* User List Sidebar - Fixed Position (bypasses layout issues) */}
        {showUserList && (
          <div 
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out"
            style={{ 
              transform: showUserList ? 'translateX(0)' : 'translateX(100%)',
              paddingTop: '4rem' // Account for header height
            }}
          >
            <div className="h-full p-4 overflow-y-auto">
              {/* Close button */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Online Users</h2>
                <button
                  onClick={() => setShowUserList(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Close user list"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* User List Content */}
              <UserList />
            </div>
          </div>
        )}

        {/* Backdrop overlay when sidebar is open */}
        {showUserList && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowUserList(false)}
          />
        )}
      </ProtectedRoute>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;