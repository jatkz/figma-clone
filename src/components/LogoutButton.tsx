import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton: React.FC = () => {
  const { logout, isAuthenticated, user, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <button 
        className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
        disabled
      >
        Loading...
      </button>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't show logout button if not authenticated
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-700">
        Welcome, {user?.name || user?.email || 'User'}
      </span>
      <button
        onClick={() => logout({ 
          logoutParams: { 
            returnTo: window.location.origin 
          } 
        })}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Log Out
      </button>
    </div>
  );
};

export default LogoutButton;
