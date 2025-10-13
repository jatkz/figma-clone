import { 
  doc, 
  getDoc, 
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

interface CanvasObjectUpdate extends Partial<Omit<CanvasObject, 'id' | 'createdBy' | 'version'>> {
  // For updates, we can't change id, createdBy, or version (version is handled automatically)
  modifiedBy: string; // This is required for updates
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
          const object: CanvasObject = {
            id: doc.id,
            type: data.type,
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            color: data.color,
            rotation: data.rotation,
            createdBy: data.createdBy,
            modifiedBy: data.modifiedBy,
            lockedBy: data.lockedBy || null,
            lockedAt: data.lockedAt || null,
            version: data.version
          };
          
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
    const createdObject: CanvasObject = {
      ...objectData,
      id: docRef.id
    };
    
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
      });
    }
    
    console.log(`Batch creation completed: ${createdObjects.length} objects created`);
    return createdObjects;
  } catch (error) {
    console.error('Error in batch object creation:', error);
    throw new Error('Failed to create objects in batch');
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
