import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import type { AppState, Auth0ProviderOptions } from '@auth0/auth0-react';

// Auth0 configuration
export const auth0Config: Auth0ProviderOptions = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN!,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID!,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
  // Configure for email/password connection only (no social login for MVP)
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
};

// Wrapper component for Auth0Provider with error handling
export interface Auth0WrapperProps {
  children: React.ReactNode;
}

export const Auth0ProviderWithConfig: React.FC<Auth0WrapperProps> = ({ children }) => {
  const onRedirectCallback = (appState?: AppState) => {
    // Navigate to the URL that the user was trying to access before authentication
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname
    );
  };

  // Validate that required environment variables are present
  if (!import.meta.env.VITE_AUTH0_DOMAIN || !import.meta.env.VITE_AUTH0_CLIENT_ID) {
    console.error('Auth0 environment variables are missing. Please check your .env file.');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-gray-700">
            Auth0 configuration is missing. Please check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Auth0Provider
      {...auth0Config}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWithConfig;
