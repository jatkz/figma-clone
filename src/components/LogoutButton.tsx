import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth0();
  const { user, isAuthenticated, isLoading, error } = useAuth();

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

  if (!isAuthenticated || !user) {
    return null; // Don't show logout button if not authenticated
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full border border-gray-300"
          style={{ backgroundColor: user.cursorColor }}
          title="Your cursor color"
        />
        <span className="text-gray-700">
          Welcome, {user.displayName}
        </span>
      </div>
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
