import ProtectedRoute from './components/ProtectedRoute';
import LogoutButton from './components/LogoutButton';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedRoute>
        {/* Header with logout */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  CollabCanvas
                </h1>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Main content area - Canvas will go here */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to CollabCanvas!
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              You're now logged in. The canvas component will be implemented in Phase 3.
            </p>
            <div className="bg-gray-100 rounded-lg p-8 border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                🎨 Canvas component coming soon...
              </p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    </div>
  );
}

export default App;
