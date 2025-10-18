import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  initializeCanvas,
  subscribeToObjects,
  generateObjectId,
  createObject,
  updateObject,
  batchUpdateObjects,
  deleteObject,
  deleteAllObjects,
  acquireObjectLock as acquireLock,
  releaseObjectLock as releaseLock,
  releaseExpiredLocks,
} from '../services/canvasRTDBService';
import type { CanvasObject } from '../types/canvas';

// Type definitions for canvas operations
type CanvasObjectInput = Omit<CanvasObject, 'id'>;

type CanvasObjectUpdate = Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textDecoration: string;
  textColor: string;
  backgroundColor: string;
  color: string;
  rotation: number;
  modifiedBy: string;
  lockedBy: string | null;
  lockedAt: number | null;
  version: number;
}>;

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
  updateObjectLocal: (objectId: string, updates: CanvasObjectUpdate) => CanvasObject | null;
  batchUpdateObjectsOptimistic: (updates: Map<string, CanvasObjectUpdate>) => Promise<boolean>;
  deleteObjectOptimistic: (objectId: string) => Promise<boolean>;
  deleteAllObjectsOptimistic: () => Promise<boolean>;
  initializeCanvasIfNeeded: () => Promise<void>;
  acquireObjectLock: (objectId: string, lockingUserName?: string) => Promise<boolean>;
  releaseObjectLock: (objectId: string) => Promise<boolean>;
}

interface UseCanvasReturn extends UseCanvasState, UseCanvasActions {}

// Toast notification interface
interface ToastFunction {
  (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number): void;
}

// Default toast implementation (console-based fallback)
const defaultToast: ToastFunction = (message: string, type: string = 'info') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
};

// Throttle utility with cancellation support
type ThrottledFunction<T extends (...args: any[]) => void> = T & {
  cancel: () => void;
};

const throttle = <T extends (...args: any[]) => void>(func: T, delay: number): ThrottledFunction<T> => {
  let timeoutId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = ((...args: Parameters<T>) => {
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
  }) as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return throttled;
};

/**
 * Custom hook for managing canvas state with real-time RTDB synchronization
 * Handles optimistic updates, error recovery, throttled RTDB operations, and object locking
 */
export const useCanvas = (userId?: string, toast: ToastFunction = defaultToast): UseCanvasReturn => {
  // State management
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for managing async operations and cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastKnownGoodStateRef = useRef<CanvasObject[]>([]);
  const pendingUpdatesRef = useRef<Map<string, CanvasObjectUpdate>>(new Map());
  const throttledFunctionsRef = useRef<Map<string, ThrottledFunction<any>>>(new Map());
  const pendingPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  // Initialize canvas and set up real-time subscription
  useEffect(() => {
    // Don't initialize if user is not authenticated
    if (!userId) {
      console.log('Waiting for authentication before initializing canvas...');
      return;
    }

    let mounted = true;
    let authUnsubscribe: (() => void) | null = null;

    const setupCanvas = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for Firebase Auth to be ready
        await new Promise<void>((resolve) => {
          authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              console.log('Firebase Auth ready, initializing canvas...');
              resolve();
            }
          });
        });

        if (!mounted) return;

        // Initialize canvas document if needed
        await initializeCanvas();
        
        if (!mounted) return;

        // Set up real-time subscription to objects
        const unsubscribe = subscribeToObjects((newObjects) => {
          if (!mounted) return;

          // Always trust RTDB data - it's the source of truth
          // Optimistic updates in acquireObjectLock/releaseObjectLock are temporary
          // and will be confirmed/overridden by RTDB in milliseconds
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
        toast('Failed to connect to canvas', 'error');
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
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]); // Re-initialize when authentication status changes

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

  // Throttled object update function (configurable via environment variable)
  // Reduced to 100ms for smoother real-time collaboration during drag
  const objectThrottle = parseInt(import.meta.env.VITE_OBJECT_SYNC_THROTTLE) || 100;
  
  // Helper to flush (wait for) pending updates for specific objects
  const flushPendingUpdates = useCallback(async (objectIds: string[]) => {
    const promises = objectIds
      .map(objectId => pendingPromisesRef.current.get(objectId))
      .filter((p): p is Promise<void> => p !== undefined);
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }, []);
  
  // Get or create throttled function for a specific object
  const getThrottledUpdate = useCallback((objectId: string) => {
    if (!throttledFunctionsRef.current.has(objectId)) {
      // Store resolve function so we can create promise before throttle fires
      let resolveCurrentPromise: (() => void) | null = null;
      
      const throttledFn = throttle(async (updates: CanvasObjectUpdate) => {
        // This fires AFTER the throttle delay
        try {
          await updateObject(objectId, updates);
          
          // Remove from pending updates and cleanup
          pendingUpdatesRef.current.delete(objectId);
          throttledFunctionsRef.current.delete(objectId);
        } catch (error) {
          // Rollback to last known good state
          setObjects([...lastKnownGoodStateRef.current]);
          toast('Update failed, changes reverted', 'error');
          
          // Clear pending update and cleanup
          pendingUpdatesRef.current.delete(objectId);
          throttledFunctionsRef.current.delete(objectId);
        } finally {
          // Resolve the promise after throttle completes (or fails)
          if (resolveCurrentPromise) {
            resolveCurrentPromise();
            resolveCurrentPromise = null;
          }
          pendingPromisesRef.current.delete(objectId);
        }
      }, objectThrottle);
      
      // Wrap the throttled function to create promise IMMEDIATELY
      const wrappedFn = (updates: CanvasObjectUpdate) => {
        // Create promise BEFORE calling throttle (so it's tracked immediately)
        if (!pendingPromisesRef.current.has(objectId)) {
          const promise = new Promise<void>((resolve) => {
            resolveCurrentPromise = resolve;
          });
          pendingPromisesRef.current.set(objectId, promise);
        }
        
        // Call the throttled function (will fire after delay)
        throttledFn(updates);
      };
      
      throttledFunctionsRef.current.set(objectId, wrappedFn as any);
    }
    return throttledFunctionsRef.current.get(objectId)!;
  }, [objectThrottle, toast]);

  // Optimistic object creation
  const createObjectOptimistic = useCallback(async (
    objectData: CanvasObjectInput
  ): Promise<CanvasObject | null> => {
    // Pre-generate the RTDB key so object has its final ID immediately
    const objectId = generateObjectId();
    
    try {
      const optimisticObject: any = {
        ...objectData,
        id: objectId
      };

      // 1. Create locally (optimistic) with final ID
      setObjects(prev => {
        // Check for duplicates before adding (safety check)
        if (prev.some(obj => obj.id === objectId)) {
          console.warn('[createObjectOptimistic] Object already exists:', objectId);
          return prev;
        }
        return [...prev, optimisticObject];
      });

      // 2. Send to RTDB with the same ID
      await createObject(objectId, objectData);

      // 3. Real-time listener will update with any server-side changes
      return optimisticObject;

    } catch (error) {
      console.error('Object creation failed:', error);
      
      // Rollback: remove the optimistic object that failed
      setObjects(prev => prev.filter(obj => obj.id !== objectId));
      toast('Failed to create object', 'error');
      
      return null;
    }
  }, [toast]);

  // Local-only object update (no RTDB sync)
  // Used during multi-select drag to avoid creating individual throttled updates
  const updateObjectLocal = useCallback((
    objectId: string, 
    updates: CanvasObjectUpdate
  ): CanvasObject | null => {
    const currentObject = objects.find(obj => obj.id === objectId);
    if (!currentObject) {
      return null;
    }

    // Update locally immediately (no RTDB sync)
    const updatedObject = {
      ...currentObject,
      ...updates,
      version: currentObject.version + 1
    } as CanvasObject;

    setObjects(prev => 
      prev.map(obj => 
        obj.id === objectId ? updatedObject : obj
      )
    );

    return updatedObject;
  }, [objects]);

  // Optimistic object update (with RTDB sync)
  const updateObjectOptimistic = useCallback(async (
    objectId: string, 
    updates: CanvasObjectUpdate
  ): Promise<CanvasObject | null> => {
    try {
      // Store current state for potential rollback
      const currentObject = objects.find(obj => obj.id === objectId);
      if (!currentObject) {
        return null;
      }

        // 1. Update locally immediately
        const updatedObject: any = {
        ...currentObject,
        ...updates,
        version: currentObject.version + 1
      };

      setObjects(prev => 
        prev.map(obj => 
          obj.id === objectId ? updatedObject : obj
        )
      );

      // 2. Store pending update and use per-object throttled update
      pendingUpdatesRef.current.set(objectId, updates);
      const throttledFn = getThrottledUpdate(objectId);
      throttledFn(updates);

      return updatedObject;

    } catch (error) {
      toast('Update failed', 'error');
      return null;
    }
  }, [objects, getThrottledUpdate]);

  // Batch optimistic update for multiple objects (used for alignment, distribution, multi-drag)
  const batchUpdateObjectsOptimistic = useCallback(async (
    updates: Map<string, CanvasObjectUpdate>
  ): Promise<boolean> => {
    try {
      // 1. Update all objects locally immediately (optimistic)
      const updatedObjectsMap = new Map<string, CanvasObject>();
      updates.forEach((update, objectId) => {
        const currentObject = objects.find(obj => obj.id === objectId);
        if (currentObject) {
          updatedObjectsMap.set(objectId, {
            ...currentObject,
            ...update,
            version: currentObject.version + 1
          } as CanvasObject);
        }
      });

      setObjects(prev => 
        prev.map(obj => updatedObjectsMap.has(obj.id) ? updatedObjectsMap.get(obj.id)! : obj)
      );

      // 2. Wait for any pending throttled updates to complete first (prevents race condition)
      const objectIds = Array.from(updates.keys());
      await flushPendingUpdates(objectIds);

      // 3. Send batch update to Firestore (after all throttled updates are done)
      // Convert Map to Array format for RTDB batch update
      const updateArray = Array.from(updates.entries()).map(([id, data]) => ({ id, data }));
      await batchUpdateObjects(updateArray);
      
      return true;

    } catch (error) {
      
      // Rollback to last known good state
      setObjects([...lastKnownGoodStateRef.current]);
      toast('Batch update failed, changes reverted', 'error');
      
      return false;
    }
  }, [objects, toast, flushPendingUpdates]);

  // Optimistic object deletion
  const deleteObjectOptimistic = useCallback(async (objectId: string): Promise<boolean> => {
    try {
      // Store object for potential rollback
      const objectToDelete = objects.find(obj => obj.id === objectId);
      if (!objectToDelete) {
        return false;
      }

      // 1. Remove locally (optimistic)
      setObjects(prev => prev.filter(obj => obj.id !== objectId));

      // 2. Send deletion to Firestore
      await deleteObject(objectId);

      return true;

    } catch (error) {
      
      // Rollback: restore the deleted object
      setObjects(prev => [...prev, objects.find(obj => obj.id === objectId)!]);
      toast('Failed to delete object', 'error');
      
      return false;
    }
  }, [objects]);

  // Initialize canvas if needed (can be called manually)
  const initializeCanvasIfNeeded = useCallback(async (): Promise<void> => {
    try {
      await initializeCanvas();
      toast('Canvas initialized successfully', 'success');
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
      toast('Failed to initialize canvas', 'error');
      throw error;
    }
  }, [toast]);

  // Optimistic delete all objects
  const deleteAllObjectsOptimistic = useCallback(async (): Promise<boolean> => {
      try {
        // 1. Clear local state immediately
        setObjects([]);
        toast('Clearing canvas...', 'info');
        
        // 2. Delete all objects from Firestore
        const deletedCount = await deleteAllObjects();
        
        toast(`Deleted ${deletedCount} objects from canvas`, 'success');
        return true;
        
      } catch (error) {
        console.error('Failed to delete all objects:', error);
      toast('Failed to clear canvas', 'error');
      
      // Note: We don't rollback here since the real-time listener will restore 
      // the correct state from Firestore if the deletion failed
      return false;
    }
  }, [toast]);

  // Acquire lock on an object with enhanced user messaging
  const acquireObjectLock = useCallback(async (objectId: string, lockingUserName?: string): Promise<boolean> => {
    if (!userId) {
      console.warn('Cannot acquire lock: user ID not provided');
      return false;
    }

    // No need to check for temp IDs anymore - objects have their final RTDB ID immediately

    try {
      // Preserve original lock state before optimistic update
      const originalObject = objects.find(obj => obj.id === objectId);
      const originalLockBy = originalObject?.lockedBy || null;
      const originalLockAt = originalObject?.lockedAt || null;
      
      // Optimistically update local state BEFORE waiting for RTDB
      // This prevents race condition where user drags before RTDB update arrives
      setObjects(prev => 
        prev.map(obj => 
          obj.id === objectId 
            ? { ...obj, lockedBy: userId, lockedAt: Date.now() } 
            : obj
        )
      );

      const success = await acquireLock(objectId, userId);
      
      if (!success) {
        // Rollback to ORIGINAL lock state (don't clear other user's lock!)
        setObjects(prev => 
          prev.map(obj => 
            obj.id === objectId 
              ? { ...obj, lockedBy: originalLockBy, lockedAt: originalLockAt } 
              : obj
          )
        );

        // Find the object to get the locking user info
        const object = objects.find(obj => obj.id === objectId);
        if (object?.lockedBy && lockingUserName) {
          toast(`Being edited by ${lockingUserName}`, 'warning', 3000);
        } else {
          toast('Object is being edited by another user', 'warning', 3000);
        }
      }
      return success;
    } catch (error) {
      // Rollback to ORIGINAL lock state on error
      const originalObject = objects.find(obj => obj.id === objectId);
      const originalLockBy = originalObject?.lockedBy || null;
      const originalLockAt = originalObject?.lockedAt || null;
      
      setObjects(prev => 
        prev.map(obj => 
          obj.id === objectId 
            ? { ...obj, lockedBy: originalLockBy, lockedAt: originalLockAt } 
            : obj
        )
      );
      toast('Failed to lock object', 'error');
      return false;
    }
  }, [userId, objects, toast]);

  // Release lock on an object
  const releaseObjectLock = useCallback(async (objectId: string): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      // Optimistically update local state BEFORE waiting for RTDB
      setObjects(prev => 
        prev.map(obj => 
          obj.id === objectId 
            ? { ...obj, lockedBy: null, lockedAt: null } 
            : obj
        )
      );

      await releaseLock(objectId);
      return true;
    } catch (error) {
      // RTDB will send the correct state back via real-time listener
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
    updateObjectLocal,
    batchUpdateObjectsOptimistic,
    deleteObjectOptimistic,
    deleteAllObjectsOptimistic,
    initializeCanvasIfNeeded,
    acquireObjectLock,
    releaseObjectLock
  };
};

export default useCanvas;
