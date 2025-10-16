import { useRef, useState, useCallback } from 'react';
import type { ResizeHandle } from '../components/ResizeHandles';
import type { CanvasObject } from '../types/canvas';
import { getShapeDimensions } from '../utils/shapeUtils';
import { constrainToBounds } from '../utils/constrainToBounds';

interface UseResizeProps {
  objects: CanvasObject[];
  selectedObjectId: string | null;
  updateObjectOptimistic: (id: string, updates: any) => void;
  userId?: string;
}

interface ResizeDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

export const useResize = ({
  objects,
  selectedObjectId,
  updateObjectOptimistic,
  userId
}: UseResizeProps) => {
  // Resize state
  const resizeStartBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeDimensions, setResizeDimensions] = useState<ResizeDimensions | null>(null);
  const lastResizeUpdateRef = useRef<number>(0);
  const pendingResizeUpdateRef = useRef<any>(null);

  // Handle resize start
  const handleResizeStart = useCallback((_handle: ResizeHandle) => {
    if (!selectedObjectId) return;

    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObject) return;

    // Store original bounds in ref (not state to avoid closure issues)
    const dimensions = getShapeDimensions(selectedObject);
    const startBounds = {
      x: selectedObject.x,
      y: selectedObject.y,
      width: dimensions.width,
      height: dimensions.height
    };
    
    resizeStartBoundsRef.current = startBounds;
  }, [selectedObjectId, objects]);

  // Handle resize (during drag)
  const handleResize = useCallback((handle: ResizeHandle, pointerX: number, pointerY: number, shiftKey: boolean) => {
    const resizeStartBounds = resizeStartBoundsRef.current;
    
    if (!selectedObjectId || !resizeStartBounds) return;

    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObject) return;

    // Calculate new dimensions based on handle
    let newX = resizeStartBounds.x;
    let newY = resizeStartBounds.y;
    let newWidth = resizeStartBounds.width;
    let newHeight = resizeStartBounds.height;

    // Calculate delta from original position
    const deltaX = pointerX - resizeStartBounds.x;
    const deltaY = pointerY - resizeStartBounds.y;

    // Original aspect ratio
    const aspectRatio = resizeStartBounds.width / resizeStartBounds.height;

    switch (handle) {
      // Corner handles
      case 'top-left':
        newX = pointerX;
        newY = pointerY;
        newWidth = resizeStartBounds.width + (resizeStartBounds.x - pointerX);
        newHeight = resizeStartBounds.height + (resizeStartBounds.y - pointerY);
        
        if (shiftKey) {
          // Lock aspect ratio - use the larger change
          const avgChange = (newWidth + newHeight) / 2;
          newWidth = avgChange;
          newHeight = avgChange / aspectRatio;
          newX = resizeStartBounds.x + resizeStartBounds.width - newWidth;
          newY = resizeStartBounds.y + resizeStartBounds.height - newHeight;
        }
        break;
      case 'top-right':
        newY = pointerY;
        newWidth = deltaX;
        newHeight = resizeStartBounds.height + (resizeStartBounds.y - pointerY);
        
        if (shiftKey) {
          const avgChange = (newWidth + newHeight) / 2;
          newWidth = avgChange;
          newHeight = avgChange / aspectRatio;
          newY = resizeStartBounds.y + resizeStartBounds.height - newHeight;
        }
        break;
      case 'bottom-left':
        newX = pointerX;
        newWidth = resizeStartBounds.width + (resizeStartBounds.x - pointerX);
        newHeight = deltaY;
        
        if (shiftKey) {
          const avgChange = (newWidth + newHeight) / 2;
          newWidth = avgChange;
          newHeight = avgChange / aspectRatio;
          newX = resizeStartBounds.x + resizeStartBounds.width - newWidth;
        }
        break;
      case 'bottom-right':
        newWidth = deltaX;
        newHeight = deltaY;
        
        if (shiftKey) {
          const avgChange = (newWidth + newHeight) / 2;
          newWidth = avgChange;
          newHeight = avgChange / aspectRatio;
        }
        break;
      
      // Side handles (Stage 2)
      case 'top':
        newY = pointerY;
        newHeight = resizeStartBounds.height + (resizeStartBounds.y - pointerY);
        if (shiftKey) {
          newWidth = newHeight * aspectRatio;
          newX = resizeStartBounds.x + (resizeStartBounds.width - newWidth) / 2;
        }
        break;
      case 'bottom':
        newHeight = deltaY;
        if (shiftKey) {
          newWidth = newHeight * aspectRatio;
          newX = resizeStartBounds.x + (resizeStartBounds.width - newWidth) / 2;
        }
        break;
      case 'left':
        newX = pointerX;
        newWidth = resizeStartBounds.width + (resizeStartBounds.x - pointerX);
        if (shiftKey) {
          newHeight = newWidth / aspectRatio;
          newY = resizeStartBounds.y + (resizeStartBounds.height - newHeight) / 2;
        }
        break;
      case 'right':
        newWidth = deltaX;
        if (shiftKey) {
          newHeight = newWidth / aspectRatio;
          newY = resizeStartBounds.y + (resizeStartBounds.height - newHeight) / 2;
        }
        break;
    }

    // Apply constraints
    const MIN_SIZE = 20;
    const MAX_SIZE = 2000;

    // Minimum size constraint
    if (newWidth < MIN_SIZE) {
      if (handle === 'top-left' || handle === 'bottom-left') {
        newX = resizeStartBounds.x + resizeStartBounds.width - MIN_SIZE;
      }
      newWidth = MIN_SIZE;
    }
    if (newHeight < MIN_SIZE) {
      if (handle === 'top-left' || handle === 'top-right') {
        newY = resizeStartBounds.y + resizeStartBounds.height - MIN_SIZE;
      }
      newHeight = MIN_SIZE;
    }

    // Maximum size constraint
    newWidth = Math.min(newWidth, MAX_SIZE);
    newHeight = Math.min(newHeight, MAX_SIZE);

    // Canvas boundary constraint
    const constrainedPos = constrainToBounds(newX, newY, newWidth, newHeight);
    newX = constrainedPos.x;
    newY = constrainedPos.y;

    // Type-specific handling (Stage 3)
    let updateData: any = {
      x: newX,
      y: newY,
      modifiedBy: userId
    };

    if (selectedObject.type === 'rectangle') {
      // Rectangle: Standard resize
      updateData.width = newWidth;
      updateData.height = newHeight;
    } else if (selectedObject.type === 'circle') {
      // Circle: Maintain circular shape (use larger dimension for both)
      const size = Math.max(newWidth, newHeight);
      updateData.radius = size / 2;
      // Center the circle in the resize area
      updateData.x = newX + (newWidth - size) / 2 + size / 2;
      updateData.y = newY + (newHeight - size) / 2 + size / 2;
      newWidth = size; // For tooltip
      newHeight = size; // For tooltip
    } else if (selectedObject.type === 'text') {
      // Text: Resize bounding box only (font size stays constant)
      updateData.width = newWidth;
      updateData.height = newHeight;
      // Font size remains unchanged - user can manually change it via text formatting tools
    }

    // Update resize dimensions for tooltip (always immediate for smooth feedback)
    setResizeDimensions({ 
      width: Math.round(newWidth), 
      height: Math.round(newHeight),
      x: newX + newWidth / 2, // Center of object
      y: newY - 30 // Above object
    });

    // Throttled Firestore updates (Stage 3): Configurable via VITE_OBJECT_SYNC_THROTTLE
    const now = Date.now();
    const timeSinceLastUpdate = now - lastResizeUpdateRef.current;
    const THROTTLE_MS = parseInt(import.meta.env.VITE_OBJECT_SYNC_THROTTLE) || 50;

    // Store pending update
    pendingResizeUpdateRef.current = { id: selectedObjectId, data: updateData };

    if (timeSinceLastUpdate >= THROTTLE_MS) {
      // Enough time has passed, send update now
      lastResizeUpdateRef.current = now;
      updateObjectOptimistic(selectedObjectId, updateData);
      pendingResizeUpdateRef.current = null;
    }
    // If not enough time, the pending update will be sent in handleResizeEnd
  }, [selectedObjectId, objects, updateObjectOptimistic, userId]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    // Send any pending throttled update (ensures final state is synced)
    if (pendingResizeUpdateRef.current) {
      const { id, data } = pendingResizeUpdateRef.current;
      updateObjectOptimistic(id, data);
      pendingResizeUpdateRef.current = null;
    }
    
    resizeStartBoundsRef.current = null;
    setResizeDimensions(null); // Clear tooltip
    lastResizeUpdateRef.current = 0; // Reset throttle timer
  }, [updateObjectOptimistic]);

  return {
    resizeDimensions,
    handleResizeStart,
    handleResize,
    handleResizeEnd
  };
};

