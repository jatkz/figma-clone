import { useCallback } from 'react';
import type { CanvasObject, User } from '../types/canvas';

type CanvasObjectUpdate = Partial<Omit<CanvasObject, 'id'>>;
import { alignObjects, distributeObjects, alignToCanvas, type AlignmentType, type DistributionType } from '../utils/alignmentUtils';

interface UseCanvasAlignmentParams {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  user: User | null;
  batchUpdateObjectsOptimistic: (updates: Map<string, CanvasObjectUpdate>) => Promise<boolean>;
  toastFunction: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  canvasWidth: number;
  canvasHeight: number;
}

interface UseCanvasAlignmentReturn {
  handleAlign: (alignmentType: AlignmentType) => Promise<void>;
  handleDistribute: (distributionType: DistributionType) => Promise<void>;
  handleAlignToCanvas: (alignType: 'center' | 'left' | 'right' | 'top' | 'bottom') => Promise<void>;
}

/**
 * Custom hook for managing alignment and distribution operations
 * Handles align, distribute, and align-to-canvas actions
 */
export function useCanvasAlignment({
  objects,
  selectedObjectIds,
  user,
  batchUpdateObjectsOptimistic,
  toastFunction,
  canvasWidth,
  canvasHeight
}: UseCanvasAlignmentParams): UseCanvasAlignmentReturn {

  // Handle alignment
  const handleAlign = useCallback(async (alignmentType: AlignmentType) => {
    if (!user?.id || selectedObjectIds.length < 2) return;

    // Get selected objects
    const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
    
    if (selectedObjects.length < 2) {
      toastFunction('Select at least 2 objects to align', 'info', 1500);
      return;
    }

    // Calculate new positions
    const updates = alignObjects(selectedObjects, alignmentType);

    // Apply batch update to Firebase (atomic transaction)
    const success = await batchUpdateObjectsOptimistic(updates);
    
    if (!success) {
      toastFunction('Alignment failed', 'error', 1500);
      return;
    }

    // Show feedback
    const alignmentNames: Record<AlignmentType, string> = {
      'left': 'left',
      'center-horizontal': 'center horizontally',
      'right': 'right',
      'top': 'top',
      'center-vertical': 'center vertically',
      'bottom': 'bottom'
    };
    toastFunction(`Aligned ${updates.size} objects ${alignmentNames[alignmentType]}`, 'success', 1500);
  }, [user?.id, selectedObjectIds, objects, batchUpdateObjectsOptimistic, toastFunction]);

  // Handle distribution
  const handleDistribute = useCallback(async (distributionType: DistributionType) => {
    if (!user?.id || selectedObjectIds.length < 3) return;

    // Get selected objects
    const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
    
    if (selectedObjects.length < 3) {
      toastFunction('Select at least 3 objects to distribute', 'info', 1500);
      return;
    }

    // Calculate new positions
    const updates = distributeObjects(selectedObjects, distributionType);

    // Apply batch update to Firebase (atomic transaction)
    const success = await batchUpdateObjectsOptimistic(updates);
    
    if (!success) {
      toastFunction('Distribution failed', 'error', 1500);
      return;
    }

    // Show feedback
    const distributionNames: Record<DistributionType, string> = {
      'horizontal-edges': 'horizontally',
      'horizontal-centers': 'centers horizontally',
      'vertical-edges': 'vertically',
      'vertical-centers': 'centers vertically'
    };
    toastFunction(`Distributed ${updates.size} objects ${distributionNames[distributionType]}`, 'success', 1500);
  }, [user?.id, selectedObjectIds, objects, batchUpdateObjectsOptimistic, toastFunction]);

  // Handle align to canvas
  const handleAlignToCanvas = useCallback(async (alignType: 'center' | 'left' | 'right' | 'top' | 'bottom') => {
    if (!user?.id || selectedObjectIds.length === 0) return;

    // Get selected objects
    const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
    
    if (selectedObjects.length === 0) {
      toastFunction('Select objects to align to canvas', 'info', 1500);
      return;
    }

    // Calculate new positions
    const updates = alignToCanvas(selectedObjects, canvasWidth, canvasHeight, alignType);

    // Apply batch update to Firebase (atomic transaction)
    const success = await batchUpdateObjectsOptimistic(updates);
    
    if (!success) {
      toastFunction('Canvas alignment failed', 'error', 1500);
      return;
    }

    // Show feedback
    const alignNames: Record<string, string> = {
      'center': 'to canvas center',
      'left': 'to canvas left',
      'right': 'to canvas right',
      'top': 'to canvas top',
      'bottom': 'to canvas bottom'
    };
    toastFunction(`Aligned ${updates.size} objects ${alignNames[alignType]}`, 'success', 1500);
  }, [user?.id, selectedObjectIds, objects, batchUpdateObjectsOptimistic, toastFunction, canvasWidth, canvasHeight]);

  return {
    handleAlign,
    handleDistribute,
    handleAlignToCanvas
  };
}

