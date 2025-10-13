import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from '../components/LoginButton';

const Landing: React.FC = () => {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              CollabCanvas
            </h1>
            <p className="text-gray-600 text-lg">
              Real-time collaborative canvas
            </p>
          </div>
          
          <div className="mb-8">
            <p className="text-gray-700 mb-6">
              Create, edit, and collaborate on shapes with multiple users in real-time. 
              See live cursors and changes instantly.
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Real-time sync
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Live cursors
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                Shape creation
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                Collaborative editing
              </div>
            </div>
          </div>

          <LoginButton />
          
          <p className="text-xs text-gray-500 mt-6">
            Sign in with your email to start collaborating
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
