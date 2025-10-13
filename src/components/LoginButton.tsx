import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginButton: React.FC = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

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

  if (isAuthenticated) {
    return null; // Don't show login button if already authenticated
  }

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Log In
    </button>
  );
};

export default LoginButton;
