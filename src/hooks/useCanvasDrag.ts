import { useRef, useCallback, useEffect } from 'react';
import type { CanvasObject } from '../types/canvas';

type CanvasObjectUpdate = Partial<Omit<CanvasObject, 'id'>>;
import type { SnapGuide, SnapSettings } from '../types/snap';
import { getShapeDimensions } from '../utils/shapeUtils';
import { constrainToBounds } from '../utils/constrainToBounds';
import { applySnapping } from '../utils/snapUtils';

// Throttle utility for batch updates
const throttle = <T extends (...args: any[]) => void>(func: T, delay: number) => {
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
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return throttled;
};

interface UseCanvasDragParams {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  user: { id: string } | null;
  updateObjectOptimistic: (objectId: string, updates: CanvasObjectUpdate) => Promise<CanvasObject | null>;
  updateObjectLocal: (objectId: string, updates: CanvasObjectUpdate) => CanvasObject | null;
  batchUpdateObjectsOptimistic: (updates: Map<string, CanvasObjectUpdate>) => Promise<boolean>;
  throttledCursorUpdate: (x: number, y: number) => void;
  snapSettings: SnapSettings;
  isModifierPressed: boolean;
  setSnapGuides: (guides: SnapGuide[]) => void;
}

interface UseCanvasDragReturn {
  handleRectangleDragStart: (objectId: string) => boolean;
  handleRectangleDragMove: (objectId: string, x: number, y: number) => void;
  handleRectangleDragEnd: (objectId: string, x: number, y: number) => Promise<void>;
}

/**
 * Custom hook for managing canvas object drag operations
 * Handles single drag, group drag, snapping, and batch updates
 */
export function useCanvasDrag({
  objects,
  selectedObjectIds,
  user,
  updateObjectOptimistic,
  updateObjectLocal,
  batchUpdateObjectsOptimistic,
  throttledCursorUpdate,
  snapSettings,
  isModifierPressed,
  setSnapGuides
}: UseCanvasDragParams): UseCanvasDragReturn {
  
  // Store initial positions for group drag (to calculate accurate deltas)
  const groupDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // Throttled batch update function for group drag
  const throttledBatchUpdateRef = useRef<(((updates: Map<string, CanvasObjectUpdate>) => void) & { cancel: () => void }) | undefined>(undefined);
  
  // Throttled update functions for individual objects (single drag)
  const throttledSingleUpdateRef = useRef<Map<string, ((update: CanvasObjectUpdate) => void) & { cancel: () => void }>>(new Map());
  
  // Get throttle delay from environment variable
  const THROTTLE_MS = parseInt(import.meta.env.VITE_OBJECT_SYNC_THROTTLE) || 300;
  
  // Create throttled batch update function
  if (!throttledBatchUpdateRef.current) {
    throttledBatchUpdateRef.current = throttle((updates: Map<string, CanvasObjectUpdate>) => {
      // Send batch update to Firestore (throttled via VITE_OBJECT_SYNC_THROTTLE)
      batchUpdateObjectsOptimistic(updates);
    }, THROTTLE_MS);
  }
  
  // Helper to get or create throttled update function for a single object
  const getThrottledSingleUpdate = useCallback((objectId: string) => {
    if (!throttledSingleUpdateRef.current.has(objectId)) {
      const throttledFn = throttle((update: CanvasObjectUpdate) => {
        updateObjectOptimistic(objectId, update);
      }, THROTTLE_MS);
      throttledSingleUpdateRef.current.set(objectId, throttledFn);
    }
    return throttledSingleUpdateRef.current.get(objectId)!;
  }, [updateObjectOptimistic, THROTTLE_MS]);
  
  // Cleanup throttled functions on unmount
  useEffect(() => {
    return () => {
      throttledBatchUpdateRef.current?.cancel();
      throttledSingleUpdateRef.current.forEach(fn => fn.cancel());
      throttledSingleUpdateRef.current.clear();
    };
  }, []);

  // Handle rectangle drag events (supports group movement for multi-select)
  const handleRectangleDragStart = useCallback((objectId: string) => {
    // Verify the user has the lock before allowing drag
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      return false; // Prevent drag
    }
    
    // Check if this object is part of a multi-selection
    const isInSelection = selectedObjectIds.includes(objectId);
    if (isInSelection && selectedObjectIds.length > 1) {
      // Store initial positions of ALL selected objects for accurate delta calculation
      const initialPositions = new Map<string, { x: number; y: number }>();
      selectedObjectIds.forEach(id => {
        const obj = objects.find(o => o.id === id);
        if (obj) {
          initialPositions.set(id, { x: obj.x, y: obj.y });
        }
      });
      groupDragStartPositions.current = initialPositions;
    } else {
      // Single object drag - clear any stored positions
      groupDragStartPositions.current.clear();
    }
    
    return true; // Allow drag
  }, [objects, user?.id, selectedObjectIds]);

  const handleRectangleDragMove = useCallback((objectId: string, x: number, y: number) => {
    // Only allow drag moves if user has acquired the lock (safety check)
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      return;
    }

    // Update cursor position during drag so other users can see where you're dragging
    if (user?.id) {
      throttledCursorUpdate(x, y);
    }

    // Check if this is a group drag (multi-select)
    const isInSelection = selectedObjectIds.includes(objectId);
    if (isInSelection && selectedObjectIds.length > 1) {
      // Group movement: Calculate delta from INITIAL position (stored at drag start)
      const initialPos = groupDragStartPositions.current.get(objectId);
      if (!initialPos) {
        return;
      }
      
      const deltaX = x - initialPos.x;
      const deltaY = y - initialPos.y;
      
      // Collect batch updates for all selected objects
      const batchUpdates = new Map<string, CanvasObjectUpdate>();
      
      // Move all selected objects by the same delta (from THEIR initial positions)
      selectedObjectIds.forEach(selectedId => {
        const selectedObj = objects.find(obj => obj.id === selectedId);
        const selectedInitialPos = groupDragStartPositions.current.get(selectedId);
        
        if (selectedObj && selectedObj.lockedBy === user?.id && selectedInitialPos) {
          const newX = selectedInitialPos.x + deltaX;
          const newY = selectedInitialPos.y + deltaY;
          
          // Constrain each object to canvas boundaries
          const dimensions = getShapeDimensions(selectedObj);
          const constrainedPosition = constrainToBounds(newX, newY, dimensions.width, dimensions.height);
          
          // Update local state immediately (no Firestore sync to avoid N individual throttled updates)
          updateObjectLocal(selectedId, {
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            modifiedBy: user.id
          });
          
          // Collect update for batch Firestore write
          batchUpdates.set(selectedId, {
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            modifiedBy: user.id
          });
        }
      });
      
      // Send single throttled batch update to Firestore (replaces N individual throttled updates)
      if (batchUpdates.size > 0 && throttledBatchUpdateRef.current) {
        throttledBatchUpdateRef.current(batchUpdates);
      }
      
      // Clear snap guides for group drag (too complex to show)
      setSnapGuides([]);
    } else {
      // Single object movement - apply snapping
      const dimensions = getShapeDimensions(object);
      
      // Apply snapping (grid and/or smart guides)
      const snapResult = applySnapping(
        x,
        y,
        dimensions.width,
        dimensions.height,
        objects,
        objectId,
        snapSettings,
        isModifierPressed
      );
      
      // Update snap guides
      setSnapGuides(snapResult.guides);
      
      // Use snapped position
      const constrainedPosition = constrainToBounds(
        snapResult.x,
        snapResult.y,
        dimensions.width,
        dimensions.height
      );

      // Update local state immediately for smooth UI
      updateObjectLocal(objectId, {
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        modifiedBy: user.id
      });
      
      // Send throttled Firestore update so other users see real-time movement
      const throttledUpdate = getThrottledSingleUpdate(objectId);
      throttledUpdate({
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        modifiedBy: user.id
      });
    }
  }, [user?.id, updateObjectLocal, getThrottledSingleUpdate, objects, selectedObjectIds, snapSettings, isModifierPressed, setSnapGuides, throttledCursorUpdate]);

  const handleRectangleDragEnd = useCallback(async (objectId: string, x: number, y: number) => {
    // Verify the user still has the lock 
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      return;
    }

    // Check if this was a group drag
    const wasGroupDrag = groupDragStartPositions.current.size > 1;
    
    if (wasGroupDrag) {
      // Cancel any pending throttled batch update (we'll send final state immediately)
      throttledBatchUpdateRef.current?.cancel();
      
      // For group drag, collect all final positions and batch update
      const batchUpdates = new Map<string, CanvasObjectUpdate>();
      
      // Collect all final positions from current object state
      selectedObjectIds.forEach(selectedId => {
        const selectedObj = objects.find(obj => obj.id === selectedId);
        if (selectedObj && selectedObj.lockedBy === user?.id) {
          batchUpdates.set(selectedId, {
            x: selectedObj.x,
            y: selectedObj.y,
            modifiedBy: user.id
          });
        }
      });
      
      // Send final batch update to Firestore immediately
      if (batchUpdates.size > 0) {
        await batchUpdateObjectsOptimistic(batchUpdates);
      }
    } else {
      // Single object drag - cancel pending throttled update and send final position
      const throttledUpdate = throttledSingleUpdateRef.current.get(objectId);
      if (throttledUpdate) {
        throttledUpdate.cancel();
      }
      
      const dimensions = getShapeDimensions(object);
      const constrainedPosition = constrainToBounds(x, y, dimensions.width, dimensions.height);

      // Send final position update to Firestore immediately
      await updateObjectOptimistic(objectId, {
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        modifiedBy: user.id
      });
    }

    // Clear stored initial positions (for group drag)
    groupDragStartPositions.current.clear();
    
    // Clear snap guides
    setSnapGuides([]);

    // Keep lock active - user still has the object(s) selected for further editing
  }, [objects, user?.id, updateObjectOptimistic, batchUpdateObjectsOptimistic, selectedObjectIds, setSnapGuides]);

  return {
    handleRectangleDragStart,
    handleRectangleDragMove,
    handleRectangleDragEnd
  };
}

