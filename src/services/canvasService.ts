import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

import { db } from '../config/firebase';
import type { CanvasObject } from '../types/canvas';

/**
 * Canvas Service for Firestore operations
 * Handles all canvas-related database operations including objects, cursors, and canvas state
 */

// Canvas document path
const CANVAS_DOC_PATH = 'canvas/global';
const OBJECTS_COLLECTION_PATH = 'canvas/global/objects';
const CURSORS_COLLECTION_PATH = 'canvas/global/cursors';

// Type definitions for canvas data structures
interface CanvasDocument {
  initialized: boolean;
  createdAt: number;
  lastModified: number;
  metadata?: {
    title?: string;
    description?: string;
  };
}

interface CanvasObjectInput extends Omit<CanvasObject, 'id'> {
  // For creating objects, we don't need the ID as Firestore will generate it
}

// Flexible update type that supports all object properties
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
  color: string;
  rotation: number;
  modifiedBy: string;
  lockedBy: string | null;
  lockedAt: number | null;
  version: number;
}>;

// Cursor data structure for multiplayer cursor tracking
export interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
  lastSeen: number;
}

/**
 * Initialize the global canvas document if it doesn't exist
 * This should be called when the app starts or when a user first accesses the canvas
 */
export const initializeCanvas = async (): Promise<void> => {
  try {
    const canvasDocRef = doc(db, CANVAS_DOC_PATH);
    const canvasDoc = await getDoc(canvasDocRef);

    if (!canvasDoc.exists()) {
      console.log('Creating global canvas document...');
      
      const canvasData: CanvasDocument = {
        initialized: true,
        createdAt: Date.now(),
        lastModified: Date.now(),
        metadata: {
          title: 'CollabCanvas',
          description: 'Collaborative canvas workspace'
        }
      };

      await setDoc(canvasDocRef, {
        ...canvasData,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp()
      });

      console.log('Global canvas document created successfully');
    } else {
      console.log('Global canvas document already exists');
    }
  } catch (error) {
    console.error('Error initializing canvas:', error);
    throw new Error('Failed to initialize canvas');
  }
};

/**
 * Subscribe to real-time updates of canvas objects
 * @param callback Function to call when objects change
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToObjects = (
  callback: (objects: CanvasObject[]) => void
): Unsubscribe => {
  try {
    const objectsCollectionRef = collection(db, OBJECTS_COLLECTION_PATH);
    
    console.log('Setting up real-time listener for canvas objects...');
    
    const unsubscribe = onSnapshot(
      objectsCollectionRef,
      (snapshot) => {
        const objects: CanvasObject[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamps to numbers if needed
          // Create object based on type, cast as CanvasObject for flexibility
          const object: CanvasObject = {
            id: doc.id,
            ...data
          } as CanvasObject;
          
          objects.push(object);
        });
        
        console.log(`Received ${objects.length} objects from Firestore`);
        callback(objects);
      },
      (error) => {
        console.error('Error in objects subscription:', error);
        // Call callback with empty array on error to handle gracefully
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up objects subscription:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

/**
 * Create a new canvas object in Firestore
 * @param objectData Object data without ID (Firestore will generate it)
 * @returns Promise resolving to the created object with Firestore-generated ID
 */
export const createObject = async (objectData: CanvasObjectInput): Promise<CanvasObject> => {
  try {
    console.log('Creating object in Firestore:', objectData);
    
    const objectsCollectionRef = collection(db, OBJECTS_COLLECTION_PATH);
    
    // Prepare data for Firestore
    const firestoreData = {
      ...objectData,
      createdAt: serverTimestamp(),
      modifiedAt: serverTimestamp()
    };
    
    // Add document to Firestore (Firestore will generate the ID)
    const docRef = await addDoc(objectsCollectionRef, firestoreData);
    
    console.log('Object created with ID:', docRef.id);
    
    // Return the object with the generated ID
    const createdObject = {
      ...objectData,
      id: docRef.id
    } as CanvasObject;
    
    return createdObject;
  } catch (error) {
    console.error('Error creating object:', error);
    throw new Error('Failed to create object');
  }
};

/**
 * Update an existing canvas object in Firestore
 * @param objectId ID of the object to update
 * @param updates Partial object data to update
 * @returns Promise resolving to the updated object
 */
export const updateObject = async (
  objectId: string, 
  updates: CanvasObjectUpdate
): Promise<CanvasObject> => {
  try {
    console.log('Updating object in Firestore:', objectId, updates);
    
    const objectDocRef = doc(db, OBJECTS_COLLECTION_PATH, objectId);
    
    // Use a transaction to ensure atomic updates with version increment
    const updatedObject = await runTransaction(db, async (transaction) => {
      const objectDoc = await transaction.get(objectDocRef);
      
      if (!objectDoc.exists()) {
        throw new Error(`Object with ID ${objectId} not found`);
      }
      
      const currentData = objectDoc.data() as CanvasObject;
      const currentVersion = currentData.version || 1;
      
      // Prepare update data with incremented version
      const updateData = {
        ...updates,
        version: currentVersion + 1,
        modifiedAt: serverTimestamp()
      };
      
      // Perform the update
      transaction.update(objectDocRef, updateData);
      
      // Return the updated object (with local data since server timestamp isn't available yet)
      return {
        ...currentData,
        ...updates,
        version: currentVersion + 1
      };
    });
    
    console.log('Object updated successfully:', objectId);
    return updatedObject;
  } catch (error) {
    console.error('Error updating object:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      throw error; // Re-throw not found errors as-is
    }
    
    throw new Error('Failed to update object');
  }
};

/**
 * Delete a canvas object from Firestore
 * @param objectId ID of the object to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteObject = async (objectId: string): Promise<void> => {
  try {
    console.log('Deleting object from Firestore:', objectId);
    
    const objectDocRef = doc(db, OBJECTS_COLLECTION_PATH, objectId);
    
    // Check if object exists before deletion
    const objectDoc = await getDoc(objectDocRef);
    if (!objectDoc.exists()) {
      console.warn(`Object with ID ${objectId} not found, skipping deletion`);
      return; // Silently succeed if object doesn't exist
    }
    
    await deleteDoc(objectDocRef);
    
    console.log('Object deleted successfully:', objectId);
  } catch (error) {
    console.error('Error deleting object:', error);
    throw new Error('Failed to delete object');
  }
};

/**
 * Batch operations for better performance when dealing with multiple objects
 */

/**
 * Create multiple objects in a single batch
 * @param objects Array of object data to create
 * @returns Promise resolving to array of created objects with IDs
 */
export const createObjectsBatch = async (objects: CanvasObjectInput[]): Promise<CanvasObject[]> => {
  try {
    console.log(`Creating ${objects.length} objects in batch...`);
    
    const createdObjects: CanvasObject[] = [];
    const objectsCollectionRef = collection(db, OBJECTS_COLLECTION_PATH);
    
    // Note: Firestore doesn't support batch adds with auto-generated IDs
    // We need to create them one by one or use batch with manual IDs
    for (const objectData of objects) {
      const docRef = await addDoc(objectsCollectionRef, {
        ...objectData,
        createdAt: serverTimestamp()
      });
      
      createdObjects.push({
        ...objectData,
        id: docRef.id
      } as CanvasObject);
    }
    
    console.log(`Batch creation completed: ${createdObjects.length} objects created`);
    return createdObjects;
  } catch (error) {
    console.error('Error in batch object creation:', error);
    throw new Error('Failed to create objects in batch');
  }
};

/**
 * Acquire a lock on a canvas object
 * @param objectId ID of the object to lock
 * @param userId ID of the user requesting the lock
 * @returns Promise resolving to true if lock acquired, false if already locked
 */
export const acquireLock = async (objectId: string, userId: string): Promise<boolean> => {
  try {
    console.log(`🔒 Attempting to acquire lock on ${objectId} for user ${userId}`);
    
    const objectDocRef = doc(db, OBJECTS_COLLECTION_PATH, objectId);
    
    const result = await runTransaction(db, async (transaction) => {
      const objectDoc = await transaction.get(objectDocRef);
      
      if (!objectDoc.exists()) {
        throw new Error(`Object with ID ${objectId} not found`);
      }
      
      const currentData = objectDoc.data() as CanvasObject;
      
      // Check if object is already locked
      if (currentData.lockedBy && currentData.lockedBy !== userId) {
        // Check if lock is expired (older than 30 seconds)
        const lockAge = Date.now() - (currentData.lockedAt || 0);
        const LOCK_TIMEOUT = 30 * 1000; // 30 seconds
        
        if (lockAge < LOCK_TIMEOUT) {
          console.log(`❌ Object ${objectId} is locked by ${currentData.lockedBy}`);
          return false; // Lock is still valid
        }
        
        console.log(`⏰ Lock on ${objectId} has expired, acquiring for ${userId}`);
      }
      
      // Acquire the lock
      const lockData = {
        lockedBy: userId,
        lockedAt: Date.now(),
        version: currentData.version + 1
      };
      
      transaction.update(objectDocRef, lockData);
      console.log(`✅ Lock acquired on ${objectId} for user ${userId}`);
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error acquiring lock:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      throw error; // Re-throw not found errors
    }
    
    return false; // Return false for other errors (conflict, network, etc.)
  }
};

/**
 * Release a lock on a canvas object
 * @param objectId ID of the object to unlock
 * @param userId ID of the user releasing the lock
 * @returns Promise resolving to true if lock released, false if user doesn't own lock
 */
export const releaseLock = async (objectId: string, userId: string): Promise<boolean> => {
  try {
    console.log(`🔓 Attempting to release lock on ${objectId} for user ${userId}`);
    
    const objectDocRef = doc(db, OBJECTS_COLLECTION_PATH, objectId);
    
    const result = await runTransaction(db, async (transaction) => {
      const objectDoc = await transaction.get(objectDocRef);
      
      if (!objectDoc.exists()) {
        console.warn(`Object with ID ${objectId} not found, considering lock released`);
        return true; // Object doesn't exist, so lock is effectively released
      }
      
      const currentData = objectDoc.data() as CanvasObject;
      
      // Check if user owns the lock
      if (currentData.lockedBy !== userId) {
        console.warn(`❌ User ${userId} does not own lock on ${objectId} (owned by ${currentData.lockedBy})`);
        return false;
      }
      
      // Release the lock
      const unlockData = {
        lockedBy: null,
        lockedAt: null,
        version: currentData.version + 1
      };
      
      transaction.update(objectDocRef, unlockData);
      console.log(`✅ Lock released on ${objectId} by user ${userId}`);
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error releasing lock:', error);
    return false;
  }
};

/**
 * Release expired locks on all objects (cleanup function)
 * @param userId Current user ID (to avoid releasing own locks unnecessarily)
 * @returns Promise resolving to number of locks released
 */
export const releaseExpiredLocks = async (userId: string): Promise<number> => {
  try {
    const objectsCollectionRef = collection(db, OBJECTS_COLLECTION_PATH);
    const snapshot = await getDocs(objectsCollectionRef);
    
    let releasedCount = 0;
    const LOCK_TIMEOUT = 30 * 1000; // 30 seconds
    const now = Date.now();
    
    const promises = snapshot.docs.map(async (docSnapshot) => {
      const objectData = docSnapshot.data() as CanvasObject;
      
      // Skip if not locked or locked by current user
      if (!objectData.lockedBy || objectData.lockedBy === userId) {
        return;
      }
      
      // Check if lock is expired
      const lockAge = now - (objectData.lockedAt || 0);
      if (lockAge > LOCK_TIMEOUT) {
        console.log(`⏰ Releasing expired lock on ${docSnapshot.id} (${lockAge}ms old)`);
        
        try {
          const success = await releaseLock(docSnapshot.id, objectData.lockedBy);
          if (success) {
            releasedCount++;
          }
        } catch (error) {
          console.warn(`Failed to release expired lock on ${docSnapshot.id}:`, error);
        }
      }
    });

    await Promise.all(promises);
    
    if (releasedCount > 0) {
      console.log(`✅ Released ${releasedCount} expired locks`);
    }
    
    return releasedCount;
  } catch (error) {
    console.error('Error checking for expired locks:', error);
    return 0;
  }
};

/**
 * Update cursor position for multiplayer cursor tracking
 * Each user writes to their OWN cursor document to avoid write contention
 * @param userId ID of the user
 * @param x Canvas x coordinate
 * @param y Canvas y coordinate
 * @param name User display name
 * @param color User cursor color
 * @returns Promise that resolves when cursor is updated
 */
export const updateCursor = async (
  userId: string,
  x: number,
  y: number,
  name: string,
  color: string
): Promise<void> => {
  try {
    const cursorDocRef = doc(db, CURSORS_COLLECTION_PATH, userId);
    const cursorData: CursorData = {
      x,
      y,
      name,
      color,
      lastSeen: Date.now()
    };

    await setDoc(cursorDocRef, cursorData);
    console.log(`📍 Cursor updated for user ${userId} at (${x}, ${y})`);
  } catch (error) {
    console.error('Error updating cursor:', error);
    // Don't throw error for cursor updates - they're not critical
  }
};

/**
 * Subscribe to cursor positions for multiplayer cursor display
 * @param callback Function to call with updated cursor data
 * @returns Unsubscribe function to stop the listener
 */
export const subscribeToCursors = (
  callback: (cursors: Map<string, CursorData>) => void
): Unsubscribe => {
  const cursorsCollectionRef = collection(db, CURSORS_COLLECTION_PATH);
  console.log(`Subscribing to cursors at: ${CURSORS_COLLECTION_PATH}`);

  const unsubscribe = onSnapshot(
    cursorsCollectionRef,
    (snapshot) => {
      const cursors = new Map<string, CursorData>();
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as CursorData;
        cursors.set(doc.id, data);
      });
      
      console.log(`📍 Received ${cursors.size} cursor positions`);
      callback(cursors);
    },
    (error) => {
      console.error('Error setting up cursors subscription:', error);
      // Call callback with empty map on error
      callback(new Map());
    }
  );

  return unsubscribe;
};

/**
 * Clean up stale cursors (older than 30 seconds)
 * @param excludeUserId Current user ID to exclude from cleanup
 * @returns Promise resolving to number of cursors cleaned up
 */
export const cleanupStaleCursors = async (excludeUserId: string): Promise<number> => {
  try {
    const cursorsCollectionRef = collection(db, CURSORS_COLLECTION_PATH);
    const snapshot = await getDocs(cursorsCollectionRef);
    
    let cleanedCount = 0;
    const staleThreshold = Date.now() - (30 * 1000); // 30 seconds ago
    
    const promises = snapshot.docs.map(async (docSnapshot) => {
      const userId = docSnapshot.id;
      const cursorData = docSnapshot.data() as CursorData;
      
      // Skip current user and check if cursor is stale
      if (userId !== excludeUserId && cursorData.lastSeen < staleThreshold) {
        console.log(`⏰ Removing stale cursor for user ${userId}`);
        try {
          await deleteDoc(docSnapshot.ref);
          cleanedCount++;
        } catch (error) {
          console.warn(`Failed to remove stale cursor for ${userId}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} stale cursors`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up stale cursors:', error);
    return 0;
  }
};

/**
 * Health check function to verify Firestore connection
 * @returns Promise resolving to true if connection is healthy
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const canvasDocRef = doc(db, CANVAS_DOC_PATH);
    await getDoc(canvasDocRef);
    return true;
  } catch (error) {
    console.error('Firestore health check failed:', error);
    return false;
  }
};

// Export types for use in other files
export type { CanvasObjectInput, CanvasObjectUpdate, CanvasDocument };
