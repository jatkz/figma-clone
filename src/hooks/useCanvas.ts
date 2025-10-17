import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  initializeCanvas,
  subscribeToObjects,
  createObject,
  updateObject,
  batchUpdateObjects,
  deleteObject,
  deleteAllObjects,
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
 * Custom hook for managing canvas state with real-time Firestore synchronization
 * Handles optimistic updates, error recovery, throttled Firestore operations, and object locking
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

          // Merge Firestore objects with any local temporary objects
          setObjects(prev => {
            // Keep any temporary objects that aren't represented in Firestore yet
            const tempObjects = prev.filter(obj => {
              const isTemp = obj.id.startsWith('temp_');
              if (!isTemp) return false;
              
              // Only keep temp objects that don't have a Firestore counterpart
              // Use more lenient matching to account for floating point precision
              const hasFirestoreVersion = newObjects.some(fsObj => 
                Math.abs(fsObj.x - obj.x) < 1 && 
                Math.abs(fsObj.y - obj.y) < 1 && 
                fsObj.type === obj.type &&
                fsObj.createdBy === obj.createdBy
              );
              
              return !hasFirestoreVersion;
            });
            
            // Create a Map to ensure no duplicate IDs from Firestore
            const firestoreMap = new Map();
            newObjects.forEach(obj => firestoreMap.set(obj.id, obj));
            
            // Combine temp objects with unique Firestore objects
            const merged = [...tempObjects, ...Array.from(firestoreMap.values())];
            
            return merged;
          });
          
          lastKnownGoodStateRef.current = [...newObjects]; // Deep copy for rollback (Firestore objects only)
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

  // Throttled object update function (configurable via environment variable)
  // Reduced to 100ms for smoother real-time collaboration during drag
  const objectThrottle = parseInt(import.meta.env.VITE_OBJECT_SYNC_THROTTLE) || 100;
  
  // Helper to flush (wait for) pending updates for specific objects
  const flushPendingUpdates = useCallback(async (objectIds: string[]) => {
    const promises = objectIds
      .map(objectId => pendingPromisesRef.current.get(objectId))
      .filter((p): p is Promise<void> => p !== undefined);
    
    if (promises.length > 0) {
      console.log(`⏳ Waiting for ${promises.length} pending throttled updates to complete...`);
      await Promise.all(promises);
      console.log(`✅ All pending throttled updates completed`);
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
          console.log(`✅ Throttled update sent to Firestore for ${objectId}`);
          
          // Remove from pending updates and cleanup
          pendingUpdatesRef.current.delete(objectId);
          throttledFunctionsRef.current.delete(objectId);
        } catch (error) {
          console.error(`❌ Throttled update failed for ${objectId}:`, error);
          
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
          console.log(`📝 Queued throttled update for ${objectId}`);
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
    // Use the existing temp ID from the object data (shapes come with pre-generated IDs)
    const tempId = (objectData as any).id;
    if (!tempId) {
      throw new Error('Object data must have a temporary ID');
    }
    
        try {
          const optimisticObject: any = {
            ...objectData,
            id: tempId
          };

          // 1. Create locally (optimistic)
          setObjects(prev => [...prev, optimisticObject]);

          // 2. Send to Firestore
          const createdObject = await createObject(objectData);

          // 3. Real-time listener will automatically handle the temp-to-real replacement
          // based on the matching position and properties
          return createdObject;

        } catch (error) {
          console.error('Object creation failed:', error);
      
      // Rollback: remove the specific optimistic object that failed
      setObjects(prev => prev.filter(obj => obj.id !== tempId));
      toast('Failed to create object', 'error');
      
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
      console.error('❌ Object update failed:', error);
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
          });
        }
      });

      setObjects(prev => 
        prev.map(obj => updatedObjectsMap.has(obj.id) ? updatedObjectsMap.get(obj.id)! : obj)
      );

      // 2. Wait for any pending throttled updates to complete first (prevents race condition)
      const objectIds = Array.from(updates.keys());
      await flushPendingUpdates(objectIds);

      // 3. Send batch update to Firestore (after all throttled updates are done)
      console.log('📤 Sending batch update to Firestore for', updates.size, 'objects...');
      await batchUpdateObjects(updates);
      
      console.log('✅ Batch update completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Batch update failed:', error);
      
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
      return true;

    } catch (error) {
      console.error('❌ Object deletion failed:', error);
      
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

    // Check if this is a temporary ID - if so, the object hasn't been created in Firestore yet
    if (objectId.startsWith('temp_')) {
      console.log(`⚠️  Cannot acquire lock on temporary object ${objectId} - object not yet in Firestore`);
      toast('Please wait for object creation to complete', 'warning', 1500);
      return false;
    }

    try {
      const success = await acquireLock(objectId, userId);
      if (!success) {
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
      console.error('Failed to acquire lock:', error);
      toast('Failed to lock object', 'error');
      return false;
    }
  }, [userId, objects, toast]);

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
    batchUpdateObjectsOptimistic,
    deleteObjectOptimistic,
    deleteAllObjectsOptimistic,
    initializeCanvasIfNeeded,
    acquireObjectLock,
    releaseObjectLock
  };
};

export default useCanvas;
