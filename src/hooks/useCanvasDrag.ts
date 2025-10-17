import { useRef, useCallback } from 'react';
import type { CanvasObject } from '../types/canvas';
import type { CanvasObjectUpdate } from '../services/canvasService';
import type { SnapGuide, SnapSettings } from '../types/snap';
import { getShapeDimensions } from '../utils/shapeUtils';
import { constrainToBounds } from '../utils/constrainToBounds';
import { applySnapping } from '../utils/snapUtils';

interface UseCanvasDragParams {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  user: { id: string } | null;
  updateObjectOptimistic: (objectId: string, updates: CanvasObjectUpdate) => Promise<CanvasObject | null>;
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
  batchUpdateObjectsOptimistic,
  throttledCursorUpdate,
  snapSettings,
  isModifierPressed,
  setSnapGuides
}: UseCanvasDragParams): UseCanvasDragReturn {
  
  // Store initial positions for group drag (to calculate accurate deltas)
  const groupDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Handle rectangle drag events (supports group movement for multi-select)
  const handleRectangleDragStart = useCallback((objectId: string) => {
    // Verify the user has the lock before allowing drag
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag start blocked: User ${user?.id} doesn't own lock on ${objectId}`);
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
      console.log(`🎯 Group drag started for ${selectedObjectIds.length} objects`);
    } else {
      // Single object drag - clear any stored positions
      groupDragStartPositions.current.clear();
      console.log(`🎯 Drag started for object ${objectId} by user ${user.id}`);
    }
    
    return true; // Allow drag
  }, [objects, user?.id, selectedObjectIds]);

  const handleRectangleDragMove = useCallback((objectId: string, x: number, y: number) => {
    // Only allow drag moves if user has acquired the lock (safety check)
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag blocked: User ${user?.id} doesn't own lock on ${objectId}`);
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
        console.warn('⚠️ No initial position stored for group drag');
        return;
      }
      
      const deltaX = x - initialPos.x;
      const deltaY = y - initialPos.y;
      
      console.log(`🔄 Group drag for ${selectedObjectIds.length} objects:`, selectedObjectIds);
      
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
          
          // Use throttled updates for real-time collaboration visibility
          // The batch update at drag end will cancel any pending throttled updates
          updateObjectOptimistic(selectedId, {
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            modifiedBy: user.id
          });
        }
      });
      
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

      updateObjectOptimistic(objectId, {
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        modifiedBy: user.id
      });
    }
  }, [user?.id, updateObjectOptimistic, objects, selectedObjectIds, snapSettings, isModifierPressed, setSnapGuides, throttledCursorUpdate]);

  const handleRectangleDragEnd = useCallback(async (objectId: string, x: number, y: number) => {
    // Verify the user still has the lock 
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag end blocked: User ${user?.id} doesn't own lock on ${objectId}`);
      return;
    }

    // Check if this was a group drag
    const wasGroupDrag = groupDragStartPositions.current.size > 1;
    
    if (wasGroupDrag) {
      // For group drag, collect all final positions and batch update
      console.log(`🏁 Group drag ended for ${selectedObjectIds.length} objects - sending batch update`);
      
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
      
      // Send batch update to Firebase
      if (batchUpdates.size > 0) {
        await batchUpdateObjectsOptimistic(batchUpdates);
      }
    } else {
      // Single object drag - send final position update
      const dimensions = getShapeDimensions(object);
      const constrainedPosition = constrainToBounds(x, y, dimensions.width, dimensions.height);
      
      console.log(`🏁 Drag ended for object ${objectId} at position (${constrainedPosition.x}, ${constrainedPosition.y})`);

      // Send final position update to Firestore (this will override any pending throttled updates)
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
    console.log(`🔒 Lock maintained after drag completion`);
  }, [objects, user?.id, updateObjectOptimistic, batchUpdateObjectsOptimistic, selectedObjectIds, setSnapGuides]);

  return {
    handleRectangleDragStart,
    handleRectangleDragMove,
    handleRectangleDragEnd
  };
}

