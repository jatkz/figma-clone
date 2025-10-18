import { useCallback } from 'react';
import type { CanvasObject, User, RectangleObject, CircleObject, TextObject } from '../types/canvas';
import { createNewRectangle, createNewCircle, createNewText, isWithinCanvasBounds } from '../utils/shapeFactory';

type CanvasObjectInput = Omit<RectangleObject, 'id'> | Omit<CircleObject, 'id'> | Omit<TextObject, 'id'>;

interface UseCanvasObjectCreationParams {
  user: User | null;
  screenToCanvasCoords: (screenX: number, screenY: number) => { x: number; y: number };
  createObjectOptimistic: (object: CanvasObjectInput) => Promise<CanvasObject | null>;
}

interface UseCanvasObjectCreationReturn {
  handleCreateRectangle: (screenX: number, screenY: number) => Promise<void>;
  handleCreateCircle: (screenX: number, screenY: number) => Promise<void>;
  handleCreateText: (screenX: number, screenY: number) => Promise<void>;
}

/**
 * Custom hook for managing canvas object creation
 * Handles creation of rectangles, circles, and text objects
 */
export function useCanvasObjectCreation({
  user,
  screenToCanvasCoords,
  createObjectOptimistic
}: UseCanvasObjectCreationParams): UseCanvasObjectCreationReturn {

  // Handle rectangle creation with Firestore sync
  const handleCreateRectangle = useCallback(async (screenX: number, screenY: number) => {
    if (!user?.id) {
      return;
    }

    // Convert screen coordinates to canvas coordinates
    const { x, y } = screenToCanvasCoords(screenX, screenY);

    // Check if position is within canvas boundaries
    if (!isWithinCanvasBounds(x, y)) {
      return;
    }

    // Create new rectangle object
    const newRectangle = createNewRectangle(x, y, user.id);

    // Create with optimistic updates and Firestore sync
    await createObjectOptimistic(newRectangle);
    
    // Note: Don't auto-select during creation (user is in creation mode)
  }, [user?.id, screenToCanvasCoords, createObjectOptimistic]);

  // Handle circle creation with Firestore sync
  const handleCreateCircle = useCallback(async (screenX: number, screenY: number) => {
    if (!user?.id) {
      return;
    }

    // Convert screen coordinates to canvas coordinates
    const { x, y } = screenToCanvasCoords(screenX, screenY);

    // Check if position is within canvas boundaries
    if (!isWithinCanvasBounds(x, y)) {
      return;
    }

    // Create new circle object
    const newCircle = createNewCircle(x, y, user.id);

    // Create with optimistic updates and Firestore sync
    await createObjectOptimistic(newCircle);
    
    // Note: Don't auto-select during creation (user is in creation mode)
  }, [user?.id, screenToCanvasCoords, createObjectOptimistic]);

  // Handle text creation with Firestore sync
  const handleCreateText = useCallback(async (screenX: number, screenY: number) => {
    if (!user?.id) {
      return;
    }

    // Convert screen coordinates to canvas coordinates
    const { x, y } = screenToCanvasCoords(screenX, screenY);

    // Check if position is within canvas boundaries
    if (!isWithinCanvasBounds(x, y)) {
      return;
    }

    // Create new text object
    const newText = createNewText(x, y, user.id);

    // Create with optimistic updates and Firestore sync
    await createObjectOptimistic(newText);
    
    // Note: Don't auto-select during creation (user is in creation mode)
  }, [user?.id, screenToCanvasCoords, createObjectOptimistic]);

  return {
    handleCreateRectangle,
    handleCreateCircle,
    handleCreateText
  };
}

