import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getOrCreateUserProfile } from '../services/userService';
import type { User } from '../types/canvas';

interface UseAuthReturn {
  user: User | null;
  auth0User: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const { 
    user: auth0User, 
    isAuthenticated, 
    isLoading: auth0Loading 
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isAuthenticated || !auth0User?.sub || !auth0User?.email) {
        setUser(null);
        setError(null);
        return;
      }

      setUserLoading(true);
      setError(null);

      try {
        const userProfile = await getOrCreateUserProfile(
          auth0User.sub,
          auth0User.email,
          auth0User.name || auth0User.nickname
        );

        setUser(userProfile);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
      } finally {
        setUserLoading(false);
      }
    };

    loadUserProfile();
  }, [isAuthenticated, auth0User]);

  return {
    user,
    auth0User,
    isLoading: auth0Loading || userLoading,
    isAuthenticated,
    error,
  };
};
