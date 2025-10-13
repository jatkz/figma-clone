import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  initializeCanvas,
  subscribeToObjects,
  createObject,
  updateObject,
  deleteObject,
  acquireLock,
  releaseLock,
  releaseExpiredLocks
} from '../services/canvasService';
import type { CanvasObject } from '../types/canvas';
import type { CanvasObjectInput, CanvasObjectUpdate } from '../services/canvasService';

// Types for the hook
interface UseCanvasState {
  objects: CanvasObject[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

interface UseCanvasActions {
  createObjectOptimistic: (objectData: CanvasObjectInput) => Promise<CanvasObject | null>;
  updateObjectOptimistic: (objectId: string, updates: CanvasObjectUpdate) => Promise<CanvasObject | null>;
  deleteObjectOptimistic: (objectId: string) => Promise<boolean>;
  initializeCanvasIfNeeded: () => Promise<void>;
  acquireObjectLock: (objectId: string) => Promise<boolean>;
  releaseObjectLock: (objectId: string) => Promise<boolean>;
}

interface UseCanvasReturn extends UseCanvasState, UseCanvasActions {}

// Toast notification type (simple for now)
type ToastType = 'success' | 'error' | 'info';
const showToast = (message: string, type: ToastType = 'info') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Replace with actual toast notification system
};

// Throttle utility for batching updates
const throttle = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let timeoutId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
        lastArgs = null;
      }, delay);
    }
  }) as T;
};

/**
 * Custom hook for managing canvas state with real-time Firestore synchronization
 * Handles optimistic updates, error recovery, throttled Firestore operations, and object locking
 */
export const useCanvas = (userId?: string): UseCanvasReturn => {
  // State management
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for managing async operations and cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastKnownGoodStateRef = useRef<CanvasObject[]>([]);
  const pendingUpdatesRef = useRef<Map<string, CanvasObjectUpdate>>(new Map());

  // Initialize canvas and set up real-time subscription
  useEffect(() => {
    let mounted = true;

    const setupCanvas = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize canvas document if needed
        await initializeCanvas();
        
        if (!mounted) return;

        // Set up real-time subscription to objects
        const unsubscribe = subscribeToObjects((newObjects) => {
          if (!mounted) return;

          console.log(`📦 Received ${newObjects.length} objects from Firestore`);
          setObjects(newObjects);
          lastKnownGoodStateRef.current = [...newObjects]; // Deep copy for rollback
          setIsConnected(true);
          setError(null);
        });

        unsubscribeRef.current = unsubscribe;
        setIsConnected(true);
      } catch (err) {
        if (!mounted) return;
        
        console.error('Failed to setup canvas:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to canvas');
        setIsConnected(false);
        showToast('Failed to connect to canvas', 'error');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setupCanvas();

    // Cleanup function
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Lock timeout checker - runs every 5 seconds
  useEffect(() => {
    if (!userId || !isConnected) return;

    const checkExpiredLocks = async () => {
      try {
        await releaseExpiredLocks(userId);
      } catch (error) {
        console.error('Error checking expired locks:', error);
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = window.setTimeout(checkExpiredLocks, 5000);
    
    // Then check every 5 seconds
    const interval = window.setInterval(checkExpiredLocks, 5000);

    return () => {
      window.clearTimeout(initialTimeout);
      window.clearInterval(interval);
    };
  }, [userId, isConnected]);

  // Throttled Firestore update function (500ms for production-grade efficiency)
  const throttledFirestoreUpdate = useCallback(
    throttle(async (objectId: string, updates: CanvasObjectUpdate) => {
      try {
        await updateObject(objectId, updates);
        console.log(`✅ Throttled update sent to Firestore for ${objectId}`);
        
        // Remove from pending updates since it succeeded
        pendingUpdatesRef.current.delete(objectId);
      } catch (error) {
        console.error(`❌ Throttled update failed for ${objectId}:`, error);
        
        // Rollback to last known good state
        setObjects([...lastKnownGoodStateRef.current]);
        showToast('Update failed, changes reverted', 'error');
        
        // Clear pending update
        pendingUpdatesRef.current.delete(objectId);
      }
    }, 500),
    []
  );

  // Optimistic object creation
  const createObjectOptimistic = useCallback(async (
    objectData: CanvasObjectInput
  ): Promise<CanvasObject | null> => {
    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticObject: CanvasObject = {
        ...objectData,
        id: tempId
      };

      // 1. Create locally (optimistic)
      console.log('✨ Creating object optimistically:', tempId);
      setObjects(prev => [...prev, optimisticObject]);

      // 2. Send to Firestore
      console.log('📤 Sending object to Firestore...');
      const createdObject = await createObject(objectData);

      // 3. Update local object with returned ID
      console.log('🔄 Updating local object with Firestore ID:', createdObject.id);
      setObjects(prev => 
        prev.map(obj => 
          obj.id === tempId ? createdObject : obj
        )
      );

      console.log('✅ Object creation completed successfully');
      showToast('Object created successfully', 'success');
      return createdObject;

    } catch (error) {
      console.error('❌ Object creation failed:', error);
      
      // Rollback: remove the optimistic object
      setObjects(prev => prev.filter(obj => !obj.id.startsWith('temp-')));
      showToast('Failed to create object', 'error');
      
      return null;
    }
  }, []);

  // Optimistic object update
  const updateObjectOptimistic = useCallback(async (
    objectId: string, 
    updates: CanvasObjectUpdate
  ): Promise<CanvasObject | null> => {
    try {
      // Store current state for potential rollback
      const currentObject = objects.find(obj => obj.id === objectId);
      if (!currentObject) {
        console.warn(`Object ${objectId} not found for update`);
        return null;
      }

      // 1. Update locally immediately
      console.log('🔄 Updating object optimistically:', objectId);
      const updatedObject: CanvasObject = {
        ...currentObject,
        ...updates,
        version: currentObject.version + 1
      };

      setObjects(prev => 
        prev.map(obj => 
          obj.id === objectId ? updatedObject : obj
        )
      );

      // 2. Store pending update and use throttled Firestore update
      pendingUpdatesRef.current.set(objectId, updates);
      throttledFirestoreUpdate(objectId, updates);

      return updatedObject;

    } catch (error) {
      console.error('❌ Object update failed:', error);
      showToast('Update failed', 'error');
      return null;
    }
  }, [objects, throttledFirestoreUpdate]);

  // Optimistic object deletion
  const deleteObjectOptimistic = useCallback(async (objectId: string): Promise<boolean> => {
    try {
      // Store object for potential rollback
      const objectToDelete = objects.find(obj => obj.id === objectId);
      if (!objectToDelete) {
        console.warn(`Object ${objectId} not found for deletion`);
        return false;
      }

      // 1. Remove locally (optimistic)
      console.log('🗑️ Deleting object optimistically:', objectId);
      setObjects(prev => prev.filter(obj => obj.id !== objectId));

      // 2. Send deletion to Firestore
      console.log('📤 Sending deletion to Firestore...');
      await deleteObject(objectId);

      console.log('✅ Object deletion completed successfully');
      showToast('Object deleted successfully', 'success');
      return true;

    } catch (error) {
      console.error('❌ Object deletion failed:', error);
      
      // Rollback: restore the deleted object
      setObjects(prev => [...prev, objects.find(obj => obj.id === objectId)!]);
      showToast('Failed to delete object', 'error');
      
      return false;
    }
  }, [objects]);

  // Initialize canvas if needed (can be called manually)
  const initializeCanvasIfNeeded = useCallback(async (): Promise<void> => {
    try {
      await initializeCanvas();
      showToast('Canvas initialized successfully', 'success');
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
      showToast('Failed to initialize canvas', 'error');
      throw error;
    }
  }, []);

  // Acquire lock on an object
  const acquireObjectLock = useCallback(async (objectId: string): Promise<boolean> => {
    if (!userId) {
      console.warn('Cannot acquire lock: user ID not provided');
      return false;
    }

    try {
      const success = await acquireLock(objectId, userId);
      if (success) {
        showToast('Object locked for editing', 'success');
      } else {
        showToast('Object is being edited by another user', 'error');
      }
      return success;
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      showToast('Failed to lock object', 'error');
      return false;
    }
  }, [userId]);

  // Release lock on an object
  const releaseObjectLock = useCallback(async (objectId: string): Promise<boolean> => {
    if (!userId) {
      console.warn('Cannot release lock: user ID not provided');
      return false;
    }

    try {
      const success = await releaseLock(objectId, userId);
      if (success) {
        console.log(`🔓 Lock released on ${objectId}`);
      }
      return success;
    } catch (error) {
      console.error('Failed to release lock:', error);
      return false;
    }
  }, [userId]);

  return {
    // State
    objects,
    isLoading,
    error,
    isConnected,
    
    // Actions
    createObjectOptimistic,
    updateObjectOptimistic,
    deleteObjectOptimistic,
    initializeCanvasIfNeeded,
    acquireObjectLock,
    releaseObjectLock
  };
};

export default useCanvas;
