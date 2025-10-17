import { useState, useCallback, useEffect } from 'react';
import type { CanvasObject } from '../types/canvas';
import type { ToolType } from '../components/ToolPanel';
import { findObjectsByColor } from '../utils/colorUtils';

interface UseCanvasSelectionParams {
  objects: CanvasObject[];
  user: { id: string } | null;
  activeTool: ToolType;
  acquireObjectLock: (objectId: string, lockingUserName?: string) => Promise<boolean>;
  releaseObjectLock: (objectId: string) => Promise<boolean>;
  toastFunction: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  magicWandTolerance?: number;
}

interface UseCanvasSelectionReturn {
  selectedObjectIds: string[];
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  acquireMultipleLocks: (objectIds: string[]) => Promise<string[]>;
  releaseMultipleLocks: (objectIds: string[]) => Promise<void>;
  handleRectangleClick: (objectId: string, shiftKey?: boolean) => Promise<void>;
  handleMagicWandClick: (objectId: string, shiftKey?: boolean) => Promise<void>;
  handleClearSelection: () => Promise<void>;
  handleSelectAll: () => Promise<void>;
  handleSelectNext: () => Promise<void>;
  handleSelectPrevious: () => Promise<void>;
  handleSelectInverse: () => Promise<void>;
  handleSelectByType: (objectType: 'rectangle' | 'circle' | 'text', addToSelection?: boolean) => Promise<void>;
  handleSelectByIds: (objectIds: string[]) => Promise<void>;
}

/**
 * Custom hook for managing canvas object selection
 * Handles single select, multi-select, lasso, magic wand, and advanced selection operations
 */
export function useCanvasSelection({
  objects,
  user,
  activeTool,
  acquireObjectLock,
  releaseObjectLock,
  toastFunction,
  magicWandTolerance = 15
}: UseCanvasSelectionParams): UseCanvasSelectionReturn {
  
  // Selection state (local only, not synced) - Multi-select support
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);

  // Helper: Acquire locks on multiple objects (returns successfully locked IDs)
  const acquireMultipleLocks = useCallback(async (objectIds: string[]): Promise<string[]> => {
    const lockedIds: string[] = [];
    
    for (const objectId of objectIds) {
      const targetObject = objects.find(obj => obj.id === objectId);
      let lockingUserName = 'Unknown User';
      
      if (targetObject?.lockedBy && targetObject.lockedBy !== user?.id) {
        lockingUserName = 'Another User';
      }
      
      const lockAcquired = await acquireObjectLock(objectId, lockingUserName);
      if (lockAcquired) {
        lockedIds.push(objectId);
      }
    }
    
    return lockedIds;
  }, [objects, user?.id, acquireObjectLock]);

  // Helper: Release locks on multiple objects
  const releaseMultipleLocks = useCallback(async (objectIds: string[]): Promise<void> => {
    for (const objectId of objectIds) {
      await releaseObjectLock(objectId);
    }
  }, [releaseObjectLock]);

  // Auto-deselect objects when switching to creation tools
  useEffect(() => {
    const isCreationTool = activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'text';
    
    if (isCreationTool && selectedObjectIds.length > 0) {
      // Release all locks and deselect when switching to creation tools
      const deselectObjects = async () => {
        await releaseMultipleLocks(selectedObjectIds);
        setSelectedObjectIds([]);
      };
      
      deselectObjects();
    }
  }, [activeTool, selectedObjectIds, releaseMultipleLocks]);

  // Handle magic wand click (select all objects with matching color)
  const handleMagicWandClick = useCallback(async (objectId: string, shiftKey: boolean = false) => {
    if (activeTool !== 'magic-wand') return;
    
    // Find the clicked object
    const clickedObject = objects.find(obj => obj.id === objectId);
    if (!clickedObject) return;
    
    // Find all objects with matching color (within tolerance)
    const matchingObjects = findObjectsByColor(objects, clickedObject.color, magicWandTolerance);
    
    if (matchingObjects.length === 0) {
      toastFunction('No objects with matching color found', 'info', 1500);
      return;
    }
    
    const matchingIds = matchingObjects.map(obj => obj.id);
    
    let newSelection: string[];
    
    if (shiftKey) {
      // Shift: Add to current selection
      newSelection = [...new Set([...selectedObjectIds, ...matchingIds])];
    } else {
      // No modifier: Replace selection
      await releaseMultipleLocks(selectedObjectIds);
      newSelection = matchingIds;
    }
    
    // Try to acquire locks on the new selection
    const lockedIds = await acquireMultipleLocks(newSelection);
    setSelectedObjectIds(lockedIds);
    
    // Show feedback
    if (lockedIds.length > 0) {
      const totalCount = newSelection.length;
      if (lockedIds.length === totalCount) {
        toastFunction(`Selected ${lockedIds.length} object${lockedIds.length > 1 ? 's' : ''} with matching color`, 'success', 1500);
      } else {
        const lockedCount = totalCount - lockedIds.length;
        toastFunction(`Selected ${lockedIds.length} of ${totalCount} objects. ${lockedCount} locked by others`, 'warning', 2000);
      }
    }
  }, [activeTool, objects, magicWandTolerance, selectedObjectIds, acquireMultipleLocks, releaseMultipleLocks, toastFunction]);

  // Handle rectangle click with locking and enhanced messaging (now supports Shift+Click multi-select)
  const handleRectangleClick = useCallback(async (objectId: string, shiftKey: boolean = false) => {
    // Magic wand takes precedence
    if (activeTool === 'magic-wand') {
      await handleMagicWandClick(objectId, shiftKey);
      return;
    }
    
    if (activeTool === 'select') {
      // Shift+Click: Add/remove from selection
      if (shiftKey) {
        const isAlreadySelected = selectedObjectIds.includes(objectId);
        
        if (isAlreadySelected) {
          // Remove from selection
          await releaseObjectLock(objectId);
          setSelectedObjectIds(prev => prev.filter(id => id !== objectId));
          toastFunction('Object removed from selection', 'success', 1500);
        } else {
          // Add to selection
          const targetObject = objects.find(obj => obj.id === objectId);
          let lockingUserName = 'Unknown User';
          
          if (targetObject?.lockedBy && targetObject.lockedBy !== user?.id) {
            lockingUserName = 'Another User';
          }
          
          const lockAcquired = await acquireObjectLock(objectId, lockingUserName);
          if (lockAcquired) {
            setSelectedObjectIds(prev => [...prev, objectId]);
            const newCount = selectedObjectIds.length + 1;
            toastFunction(`${newCount} object${newCount > 1 ? 's' : ''} selected`, 'success', 1500);
          }
        }
        return;
      }
      
      // Regular click (no Shift): Single selection
      const isAlreadySelected = selectedObjectIds.includes(objectId);
      
      if (isAlreadySelected && selectedObjectIds.length === 1) {
        // Clicking the only selected object: deselect
        await releaseObjectLock(objectId);
        setSelectedObjectIds([]);
        return;
      }
      
      // Clear previous selections and select this one
      await releaseMultipleLocks(selectedObjectIds);
      
      const targetObject = objects.find(obj => obj.id === objectId);
      let lockingUserName = 'Unknown User';
      
      if (targetObject?.lockedBy && targetObject.lockedBy !== user?.id) {
        lockingUserName = 'Another User';
      }
      
      const lockAcquired = await acquireObjectLock(objectId, lockingUserName);
      if (lockAcquired) {
        setSelectedObjectIds([objectId]);
        toastFunction('Object selected for editing', 'success', 1500);
      } else {
        // Lock not acquired, clear selection
        setSelectedObjectIds([]);
      }
    }
  }, [activeTool, selectedObjectIds, acquireObjectLock, releaseObjectLock, releaseMultipleLocks, objects, user?.id, toastFunction, handleMagicWandClick]);

  // Handle clear selection
  const handleClearSelection = useCallback(async () => {
    if (selectedObjectIds.length > 0) {
      await releaseMultipleLocks(selectedObjectIds);
      setSelectedObjectIds([]);
    }
  }, [selectedObjectIds, releaseMultipleLocks]);

  // Handle select all
  const handleSelectAll = useCallback(async () => {
    if (!user?.id) return;
    
    // Release current locks first
    await releaseMultipleLocks(selectedObjectIds);
    
    // Try to acquire locks on all objects
    const allObjectIds = objects.map(obj => obj.id);
    const lockedIds = await acquireMultipleLocks(allObjectIds);
    
    setSelectedObjectIds(lockedIds);
    
    if (lockedIds.length > 0) {
      toastFunction(`Selected ${lockedIds.length} of ${allObjectIds.length} objects`, 'success', 1500);
    }
  }, [user?.id, objects, selectedObjectIds, acquireMultipleLocks, releaseMultipleLocks, toastFunction]);

  // Handle select next object
  const handleSelectNext = useCallback(async () => {
    if (!user?.id || objects.length === 0) return;
    
    const currentIndex = selectedObjectIds.length === 1 
      ? objects.findIndex(obj => obj.id === selectedObjectIds[0])
      : -1;
    
    const nextIndex = (currentIndex + 1) % objects.length;
    const nextObject = objects[nextIndex];
    
    // Release current locks
    await releaseMultipleLocks(selectedObjectIds);
    
    // Try to acquire lock on next object
    const locked = await acquireMultipleLocks([nextObject.id]);
    setSelectedObjectIds(locked);
  }, [user?.id, objects, selectedObjectIds, acquireMultipleLocks, releaseMultipleLocks]);

  // Handle select previous object
  const handleSelectPrevious = useCallback(async () => {
    if (!user?.id || objects.length === 0) return;
    
    const currentIndex = selectedObjectIds.length === 1 
      ? objects.findIndex(obj => obj.id === selectedObjectIds[0])
      : -1;
    
    const prevIndex = currentIndex <= 0 ? objects.length - 1 : currentIndex - 1;
    const prevObject = objects[prevIndex];
    
    // Release current locks
    await releaseMultipleLocks(selectedObjectIds);
    
    // Try to acquire lock on previous object
    const locked = await acquireMultipleLocks([prevObject.id]);
    setSelectedObjectIds(locked);
  }, [user?.id, objects, selectedObjectIds, acquireMultipleLocks, releaseMultipleLocks]);

  // Handle select inverse (select all except currently selected)
  const handleSelectInverse = useCallback(async () => {
    if (!user?.id) return;
    
    // Get all object IDs
    const allIds = objects.map(obj => obj.id);
    
    // Find objects not currently selected
    const unselectedIds = allIds.filter(id => !selectedObjectIds.includes(id));
    
    if (unselectedIds.length === 0) {
      toastFunction('No objects to select', 'info', 1500);
      return;
    }
    
    // Release current locks
    await releaseMultipleLocks(selectedObjectIds);
    
    // Try to acquire locks on previously unselected objects
    const lockedIds = await acquireMultipleLocks(unselectedIds);
    setSelectedObjectIds(lockedIds);
    
    // Show feedback
    if (lockedIds.length > 0) {
      const totalCount = unselectedIds.length;
      if (lockedIds.length === totalCount) {
        toastFunction(`Selected ${lockedIds.length} object${lockedIds.length > 1 ? 's' : ''}`, 'success', 1500);
      } else {
        const lockedCount = totalCount - lockedIds.length;
        toastFunction(`Selected ${lockedIds.length} of ${totalCount} objects. ${lockedCount} locked by others`, 'warning', 2000);
      }
    }
  }, [user?.id, objects, selectedObjectIds, releaseMultipleLocks, acquireMultipleLocks, toastFunction]);

  // Handle select by type (all rectangles, circles, or text)
  const handleSelectByType = useCallback(async (objectType: 'rectangle' | 'circle' | 'text', addToSelection: boolean = false) => {
    if (!user?.id) return;
    
    // Find all objects of the specified type
    const matchingObjects = objects.filter(obj => obj.type === objectType);
    
    if (matchingObjects.length === 0) {
      toastFunction(`No ${objectType}s found`, 'info', 1500);
      return;
    }
    
    const matchingIds = matchingObjects.map(obj => obj.id);
    
    let newSelection: string[];
    
    if (addToSelection) {
      // Add to current selection (merge with existing)
      newSelection = [...new Set([...selectedObjectIds, ...matchingIds])];
    } else {
      // Replace selection
      await releaseMultipleLocks(selectedObjectIds);
      newSelection = matchingIds;
    }
    
    // Try to acquire locks
    const lockedIds = await acquireMultipleLocks(newSelection);
    setSelectedObjectIds(lockedIds);
    
    // Show feedback
    const typeName = objectType === 'circle' ? 'circle' : objectType;
    if (lockedIds.length > 0) {
      const totalCount = newSelection.length;
      if (lockedIds.length === totalCount) {
        toastFunction(`Selected ${lockedIds.length} ${typeName}${lockedIds.length > 1 ? 's' : ''}`, 'success', 1500);
      } else {
        const lockedCount = totalCount - lockedIds.length;
        toastFunction(`Selected ${lockedIds.length} of ${totalCount} ${typeName}s. ${lockedCount} locked by others`, 'warning', 2000);
      }
    }
  }, [user?.id, objects, selectedObjectIds, releaseMultipleLocks, acquireMultipleLocks, toastFunction]);

  // Handle select by IDs (for filter panel)
  const handleSelectByIds = useCallback(async (objectIds: string[]) => {
    if (!user?.id) return;
    
    if (objectIds.length === 0) {
      toastFunction('No objects to select', 'info', 1500);
      return;
    }
    
    // Release current locks
    await releaseMultipleLocks(selectedObjectIds);
    
    // Try to acquire locks on specified objects
    const lockedIds = await acquireMultipleLocks(objectIds);
    setSelectedObjectIds(lockedIds);
    
    // Show feedback
    if (lockedIds.length > 0) {
      const totalCount = objectIds.length;
      if (lockedIds.length === totalCount) {
        toastFunction(`Selected ${lockedIds.length} object${lockedIds.length > 1 ? 's' : ''}`, 'success', 1500);
      } else {
        const lockedCount = totalCount - lockedIds.length;
        toastFunction(`Selected ${lockedIds.length} of ${totalCount} objects. ${lockedCount} locked by others`, 'warning', 2000);
      }
    }
  }, [user?.id, selectedObjectIds, releaseMultipleLocks, acquireMultipleLocks, toastFunction]);

  return {
    selectedObjectIds,
    setSelectedObjectIds,
    acquireMultipleLocks,
    releaseMultipleLocks,
    handleRectangleClick,
    handleMagicWandClick,
    handleClearSelection,
    handleSelectAll,
    handleSelectNext,
    handleSelectPrevious,
    handleSelectInverse,
    handleSelectByType,
    handleSelectByIds
  };
}

