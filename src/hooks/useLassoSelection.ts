import { useState, useCallback } from 'react';
import type { CanvasObject } from '../types/canvas';
import type { ToolType } from '../components/ToolPanel';
import { isObjectInLasso, shouldCloseLasso, simplifyPath } from '../utils/lassoUtils';

interface LassoState {
  isDrawing: boolean;
  points: number[]; // Flat array: [x1, y1, x2, y2, ...]
  isClosing: boolean;
}

interface UseLassoSelectionParams {
  activeTool: ToolType;
  objects: CanvasObject[];
  selectedObjectIds: string[];
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  acquireMultipleLocks: (objectIds: string[]) => Promise<string[]>;
  releaseMultipleLocks: (objectIds: string[]) => Promise<void>;
  screenToCanvasCoords: (screenX: number, screenY: number) => { x: number; y: number };
  viewport: { scale: number };
  toastFunction: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

interface UseLassoSelectionReturn {
  lassoState: LassoState;
  setLassoState: React.Dispatch<React.SetStateAction<LassoState>>;
  handleLassoStart: (screenX: number, screenY: number) => void;
  handleLassoMove: (screenX: number, screenY: number) => void;
  handleLassoComplete: (shiftKey?: boolean, altKey?: boolean) => Promise<void>;
}

/**
 * Custom hook for managing lasso selection tool
 * Handles freeform path drawing and object selection within the lasso area
 */
export function useLassoSelection({
  activeTool,
  objects,
  selectedObjectIds,
  setSelectedObjectIds,
  acquireMultipleLocks,
  releaseMultipleLocks,
  screenToCanvasCoords,
  viewport,
  toastFunction
}: UseLassoSelectionParams): UseLassoSelectionReturn {
  
  // Lasso selection state
  const [lassoState, setLassoState] = useState<LassoState>({
    isDrawing: false,
    points: [],
    isClosing: false
  });

  // Handle lasso selection start
  const handleLassoStart = useCallback((screenX: number, screenY: number) => {
    if (activeTool !== 'lasso') return;
    
    // Convert screen coordinates to canvas coordinates
    const { x, y } = screenToCanvasCoords(screenX, screenY);
    
    setLassoState({
      isDrawing: true,
      points: [x, y],
      isClosing: false
    });
  }, [activeTool, screenToCanvasCoords]);

  // Handle lasso path drawing (throttled)
  const handleLassoMove = useCallback((screenX: number, screenY: number) => {
    if (!lassoState.isDrawing) return;
    
    // Convert screen coordinates to canvas coordinates
    const { x, y } = screenToCanvasCoords(screenX, screenY);
    
    // Check if we're close to the starting point (for visual feedback)
    const isClosing = shouldCloseLasso(lassoState.points, { x, y }, 20 / viewport.scale);
    
    // Only add point if it's far enough from the last point (distance-based throttling)
    const lastX = lassoState.points[lassoState.points.length - 2];
    const lastY = lassoState.points[lassoState.points.length - 1];
    const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
    
    if (distance >= 5 / viewport.scale) { // Scale-aware distance threshold
      setLassoState(prev => ({
        ...prev,
        points: [...prev.points, x, y],
        isClosing
      }));
    } else if (isClosing !== lassoState.isClosing) {
      // Update closing state even if not adding point
      setLassoState(prev => ({
        ...prev,
        isClosing
      }));
    }
  }, [lassoState.isDrawing, lassoState.points, lassoState.isClosing, screenToCanvasCoords, viewport.scale]);

  // Handle lasso selection complete
  const handleLassoComplete = useCallback(async (shiftKey: boolean = false, altKey: boolean = false) => {
    if (!lassoState.isDrawing || lassoState.points.length < 6) {
      // Need at least 3 points (6 coordinates) to form a valid selection area
      setLassoState({
        isDrawing: false,
        points: [],
        isClosing: false
      });
      return;
    }
    
    // Simplify the path to improve performance
    const simplifiedPoints = simplifyPath(lassoState.points, 3);
    
    // Find all objects whose center point is inside the lasso
    const objectsInLasso = objects.filter(obj => isObjectInLasso(obj, simplifiedPoints));
    
    if (objectsInLasso.length === 0) {
      toastFunction('No objects in lasso area', 'info', 1500);
      setLassoState({
        isDrawing: false,
        points: [],
        isClosing: false
      });
      return;
    }
    
    const objectIdsInLasso = objectsInLasso.map(obj => obj.id);
    
    // Handle modifier keys for add/remove from selection
    let newSelection: string[];
    
    if (shiftKey) {
      // Shift: Add to current selection
      newSelection = [...new Set([...selectedObjectIds, ...objectIdsInLasso])];
    } else if (altKey) {
      // Alt: Remove from current selection
      newSelection = selectedObjectIds.filter(id => !objectIdsInLasso.includes(id));
    } else {
      // No modifier: Replace selection
      // Release current locks first
      await releaseMultipleLocks(selectedObjectIds);
      newSelection = objectIdsInLasso;
    }
    
    // Acquire locks on the new selection
    const lockedIds = await acquireMultipleLocks(newSelection);
    setSelectedObjectIds(lockedIds);
    
    // Show feedback
    if (lockedIds.length > 0) {
      const totalCount = newSelection.length;
      if (lockedIds.length === totalCount) {
        toastFunction(`${lockedIds.length} object${lockedIds.length > 1 ? 's' : ''} selected`, 'success', 1500);
      } else {
        const lockedCount = totalCount - lockedIds.length;
        toastFunction(`Selected ${lockedIds.length} of ${totalCount} objects. ${lockedCount} locked by others`, 'warning', 2000);
      }
    }
    
    // Clear lasso
    setLassoState({
      isDrawing: false,
      points: [],
      isClosing: false
    });
  }, [lassoState.isDrawing, lassoState.points, objects, selectedObjectIds, acquireMultipleLocks, releaseMultipleLocks, toastFunction]);

  return {
    lassoState,
    setLassoState,
    handleLassoStart,
    handleLassoMove,
    handleLassoComplete
  };
}

