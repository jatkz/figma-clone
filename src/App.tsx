import { useState, useRef, useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import LogoutButton from './components/LogoutButton';
import Canvas, { type CanvasRef } from './components/Canvas';
import ToolPanel, { useToolState } from './components/ToolPanel';
import PresenceIndicator from './components/PresenceIndicator';
import UserList from './components/UserList';
import AIChat from './components/AIChat';
import { ToastProvider, useToastContext } from './contexts/ToastContext';
import { ToastManager } from './components/Toast';
import { useCanvas } from './hooks/useCanvas';
import { useAuth } from './hooks/useAuth';
import { createToastFunction } from './contexts/ToastContext';
import './App.css';


function AppContent() {
  const { activeTool, setActiveTool } = useToolState('select');
  const [showUserList, setShowUserList] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const { toasts, removeToast } = useToastContext();
  const { user } = useAuth();
  const toastFunction = createToastFunction(useToastContext());
  const { deleteAllObjectsOptimistic } = useCanvas(user?.id, toastFunction);
  const canvasRef = useRef<CanvasRef>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // Consolidated keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger shortcuts during text editing
      if (canvasRef.current?.isTextEditing()) {
        return;
      }

      // Tool shortcuts (V, R, C, T)
      switch (e.key.toLowerCase()) {
        case 'v':
          e.preventDefault();
          setActiveTool('select');
          return;
        case 'r':
          e.preventDefault();
          setActiveTool('rectangle');
          return;
        case 'c':
          e.preventDefault();
          setActiveTool('circle');
          return;
        case 't':
          e.preventDefault();
          setActiveTool('text');
          return;
      }

      // Duplicate: Ctrl/Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        canvasRef.current?.duplicate();
        return;
      }

      // Reset rotation: Ctrl/Cmd+Shift+R (only for single selection)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        canvasRef.current?.resetRotation();
        return;
      }

      // Rotate 90° clockwise: ] key (only for single selection)
      if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        canvasRef.current?.rotateBy(90);
        return;
      }

      // Rotate 90° counter-clockwise: [ key (only for single selection)
      if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        canvasRef.current?.rotateBy(-90);
        return;
      }

      // Delete: Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        await canvasRef.current?.deleteSelected();
        return;
      }

      // Escape: Clear selection and switch to select tool
      if (e.key === 'Escape') {
        await canvasRef.current?.clearSelection();
        setActiveTool('select');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

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

                  {/* AI Chat Toggle */}
                  <button
                    onClick={() => setShowAIChat(!showAIChat)}
                    className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors flex-shrink-0 ${
                      showAIChat 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    🤖 AI Chat
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
                onDuplicate={() => canvasRef.current?.duplicate()}
                hasSelection={hasSelection}
              />
            </div>
            
            {/* Canvas Area */}
            <div className="flex-1 p-4 pl-0 pr-0">
              <div className="bg-white rounded-lg shadow h-full mr-4">
                <Canvas 
                  ref={canvasRef}
                  activeTool={activeTool}
                  onSelectionChange={setHasSelection}
                />
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

        {/* AI Chat Sidebar - Fixed Position (left side) */}
        {showAIChat && (
          <div 
            className="fixed top-0 left-0 h-full w-96 bg-white shadow-xl border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out"
            style={{ 
              transform: showAIChat ? 'translateX(0)' : 'translateX(-100%)',
              paddingTop: '4rem' // Account for header height
            }}
          >
            <div className="h-full p-4 overflow-hidden flex flex-col">
              {/* Close button */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">AI Canvas Agent</h2>
                <button
                  onClick={() => setShowAIChat(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Close AI chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* AI Chat Content */}
              <div className="flex-1 min-h-0">
                <AIChat />
              </div>
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
        
        {/* Backdrop overlay for AI chat */}
        {showAIChat && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setShowAIChat(false)}
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