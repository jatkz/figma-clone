import { useRef, useCallback } from 'react';
import type { CanvasObject } from '../types/canvas';

interface UseRotationProps {
  selectedObjectId: string | null;
  objects: CanvasObject[];
  updateObjectOptimistic: (id: string, updates: any) => void;
  userId?: string;
}

export const useRotation = ({
  selectedObjectId,
  objects,
  updateObjectOptimistic,
  userId
}: UseRotationProps) => {
  const lastRotationUpdateRef = useRef<number>(0);
  const pendingRotationUpdateRef = useRef<{ id: string; rotation: number } | null>(null);

  // Handle rotation start
  const handleRotationStart = useCallback(() => {
    // Just mark that rotation has started
  }, []);

  // Handle rotation (during drag)
  const handleRotation = useCallback((angle: number, _shiftKey: boolean) => {
    if (!selectedObjectId) return;

    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObject) return;

    // Throttled Firestore updates: Configurable via VITE_OBJECT_SYNC_THROTTLE
    const now = Date.now();
    const timeSinceLastUpdate = now - lastRotationUpdateRef.current;
    const THROTTLE_MS = parseInt(import.meta.env.VITE_OBJECT_SYNC_THROTTLE) || 50;

    // Store pending update
    pendingRotationUpdateRef.current = { id: selectedObjectId, rotation: angle };

    if (timeSinceLastUpdate >= THROTTLE_MS) {
      // Enough time has passed, send update now
      lastRotationUpdateRef.current = now;
      updateObjectOptimistic(selectedObjectId, {
        rotation: angle,
        modifiedBy: userId
      });
      pendingRotationUpdateRef.current = null;
    }
  }, [selectedObjectId, objects, updateObjectOptimistic, userId]);

  // Handle rotation end
  const handleRotationEnd = useCallback(() => {
    // Send any pending throttled update (ensures final state is synced)
    if (pendingRotationUpdateRef.current) {
      const { id, rotation } = pendingRotationUpdateRef.current;
      updateObjectOptimistic(id, {
        rotation,
        modifiedBy: userId
      });
      pendingRotationUpdateRef.current = null;
    }

    lastRotationUpdateRef.current = 0; // Reset throttle timer
  }, [updateObjectOptimistic, userId]);

  // Rotate by specific angle (for keyboard shortcuts)
  const rotateBy = useCallback((degrees: number) => {
    if (!selectedObjectId) return;

    const selectedObject = objects.find(obj => obj.id === selectedObjectId);
    if (!selectedObject) return;

    let newRotation = (selectedObject.rotation + degrees) % 360;
    if (newRotation < 0) newRotation += 360;

    updateObjectOptimistic(selectedObjectId, {
      rotation: newRotation,
      modifiedBy: userId
    });
  }, [selectedObjectId, objects, updateObjectOptimistic, userId]);

  // Reset rotation to 0
  const resetRotation = useCallback(() => {
    if (!selectedObjectId) return;

    updateObjectOptimistic(selectedObjectId, {
      rotation: 0,
      modifiedBy: userId
    });
  }, [selectedObjectId, updateObjectOptimistic, userId]);

  return {
    handleRotationStart,
    handleRotation,
    handleRotationEnd,
    rotateBy,
    resetRotation
  };
};

