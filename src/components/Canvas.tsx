import React, { useRef, useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  type CanvasObject
} from '../types/canvas';
import type { ToolType } from './ToolPanel';
import Rectangle from './Rectangle';
import CircleComponent from './Circle';
import TextObjectComponent from './TextObject';
import ResizeHandles from './ResizeHandles';
import RotationHandle from './RotationHandle';
import TextFormattingToolbar from './TextFormattingToolbar';
import TextEditorOverlay from './TextEditorOverlay';
import { useResize } from '../hooks/useResize';
import { useRotation } from '../hooks/useRotation';
import { createNewRectangle, createNewCircle, createNewText, isWithinCanvasBounds, generateTempId } from '../utils/shapeFactory';
import { constrainToBounds } from '../utils/constrainToBounds';
import { getShapeDimensions } from '../utils/shapeUtils';
import { useAuth } from '../hooks/useAuth';
import { useCanvas } from '../hooks/useCanvas';
import { useToastContext, createToastFunction } from '../contexts/ToastContext';
import { updateCursor, subscribeToCursors, type CursorData } from '../services/canvasService';
import { initializeAICanvasState, cleanupAICanvasState } from '../services/aiCanvasService';
import { exportToSVG, exportToPNG, generatePreview, type ExportOptions } from '../utils/canvasExport';
import { applySnapping } from '../utils/snapUtils';
import { useSnap } from '../contexts/SnapContext';
import type { SnapGuide } from '../types/snap';
import SnapGuides from './SnapGuides';
import Cursor from './Cursor';

// Throttle utility for cursor updates
const throttle = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let timeoutId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
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
  }) as T;
};

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

interface CanvasProps {
  activeTool: ToolType;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export interface CanvasRef {
  duplicate: () => void;
  deleteSelected: () => Promise<void>;
  clearSelection: () => Promise<void>;
  selectAll: () => Promise<void>;
  selectNext: () => Promise<void>;
  selectPrevious: () => Promise<void>;
  rotateBy: (degrees: number) => void;
  resetRotation: () => void;
  isTextEditing: () => boolean;
  hasSelection: () => boolean;
  getSelectedObjects: () => string[];
  setZoom: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  exportCanvas: (options: ExportOptions) => Promise<void>;
  generatePreview: (mode: 'viewport' | 'entire' | 'selected') => string | null;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ activeTool, onSelectionChange }, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const { user } = useAuth();
  
  // Toast notifications from context
  const toastContext = useToastContext();
  
  // Create toast function for the canvas hook
  const toastFunction = useCallback(
    createToastFunction(toastContext),
    [toastContext]
  );

  // Snap settings from context
  const { settings: snapSettings } = useSnap();
  
  // Snap guides state
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [isModifierPressed, setIsModifierPressed] = useState(false);

  // Real-time canvas state from Firestore
  const {
    objects,
    isLoading,
    error,
    isConnected,
    createObjectOptimistic,
    updateObjectOptimistic,
    deleteObjectOptimistic,
    acquireObjectLock,
    releaseObjectLock
  } = useCanvas(user?.id, toastFunction);

  // Viewport state: centered at canvas center initially
  const [viewport, setViewport] = useState<ViewportState>({
    x: -CANVAS_CENTER_X, // Negative because we want to center the canvas
    y: -CANVAS_CENTER_Y,
    scale: 1.0, // Back to 100% zoom for clear canvas visibility
  });

  // Track if we're currently panning
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Selection state (local only, not synced) - Multi-select support
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  
  // Text editing state (track which text object is being edited)
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Store initial positions for group drag (to calculate accurate deltas)
  const groupDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Resize functionality (extracted to custom hook)
  // Only works on single selection - pass first selected ID or null
  const { resizeDimensions, handleResizeStart, handleResize, handleResizeEnd } = useResize({
    objects,
    selectedObjectId: selectedObjectIds.length === 1 ? selectedObjectIds[0] : null,
    updateObjectOptimistic,
    userId: user?.id
  });

  // Rotation functionality (extracted to custom hook)
  // Only works on single selection - pass first selected ID or null
  const { handleRotationStart, handleRotation, handleRotationEnd, rotateBy, resetRotation } = useRotation({
    selectedObjectId: selectedObjectIds.length === 1 ? selectedObjectIds[0] : null,
    objects,
    updateObjectOptimistic,
    userId: user?.id
  });

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedObjectIds.length > 0);
  }, [selectedObjectIds, onSelectionChange]);

  // Cursor position state for multiplayer cursor tracking
  const [, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  // Sort objects by type to ensure proper layering (text on top)
  // Memoized to avoid re-sorting on every render
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => {
      // Render order: rectangles first, then circles, then text (text on top)
      const typeOrder: Record<string, number> = { rectangle: 0, circle: 1, text: 2 };
      return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
    });
  }, [objects]);

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

  // Other users' cursors from Firestore
  const [otherCursors, setOtherCursors] = useState<Map<string, CursorData>>(new Map());

  // Throttled cursor update function (configurable via environment variable)
  const cursorThrottle = parseInt(import.meta.env.VITE_CURSOR_SYNC_THROTTLE) || 250;
  const throttledCursorUpdate = useCallback(
    throttle(async (x: number, y: number) => {
      if (!user?.id || !user?.displayName || !user?.cursorColor) {
        return;
      }
      
      try {
        await updateCursor(user.id, x, y, user.displayName, user.cursorColor);
      } catch (error) {
        console.warn('Failed to update cursor position:', error);
      }
    }, cursorThrottle),
    [user?.id, user?.displayName, user?.cursorColor, cursorThrottle]
  );

  // Update stage size on window resize
  useEffect(() => {
    const updateSize = () => {
      setStageSize({
        width: window.innerWidth - 64, // Account for padding
        height: window.innerHeight - 200, // Account for header and padding
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Set up cursor subscription for multiplayer cursors
  useEffect(() => {
    if (!user?.id) return;

    const cursorsUnsubscribe = subscribeToCursors((cursors) => {
      // Filter out current user's cursor
      const filteredCursors = new Map();
      cursors.forEach((cursorData, userId) => {
        if (userId !== user.id) {
          filteredCursors.set(userId, cursorData);
        }
      });

      setOtherCursors(filteredCursors);
    });

    return () => {
      cursorsUnsubscribe();
    };
  }, [user?.id]);

  // Initialize AI Canvas state tracking for AI operations
  useEffect(() => {
    console.log('🤖 Initializing AI Canvas state tracking');
    initializeAICanvasState();
    
    return () => {
      console.log('🤖 Cleaning up AI Canvas state tracking');
      cleanupAICanvasState();
    };
  }, []);

  // Constrain viewport to boundaries
  const constrainViewport = useCallback((newViewport: ViewportState): ViewportState => {
    const stage = stageRef.current;
    if (!stage) return newViewport;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    // Calculate the visible area bounds at current scale
    const minX = -CANVAS_WIDTH * newViewport.scale;
    const maxX = stageWidth;
    const minY = -CANVAS_HEIGHT * newViewport.scale;
    const maxY = stageHeight;

    return {
      ...newViewport,
      x: Math.max(minX, Math.min(maxX, newViewport.x)),
      y: Math.max(minY, Math.min(maxY, newViewport.y)),
      scale: Math.max(0.1, Math.min(4.0, newViewport.scale)),
    };
  }, []);

  // Handle rectangle click with locking and enhanced messaging (now supports Shift+Click multi-select)
  const handleRectangleClick = useCallback(async (objectId: string, shiftKey: boolean = false) => {
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
  }, [activeTool, selectedObjectIds, acquireObjectLock, releaseObjectLock, releaseMultipleLocks, objects, user?.id, toastFunction]);

  // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    const canvasX = (screenX - viewport.x) / viewport.scale;
    const canvasY = (screenY - viewport.y) / viewport.scale;
    return { x: canvasX, y: canvasY };
  }, [viewport]);

  // Convert stage coordinates to canvas coordinates for cursor tracking
  const stageToCanvasCoords = useCallback((stageX: number, stageY: number) => {
    // Stage coordinates are already in the viewport space, so we can use the same conversion
    return screenToCanvasCoords(stageX, stageY);
  }, [screenToCanvasCoords]);

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

  // Handle text formatting updates
  const handleTextFormattingUpdate = useCallback((textObjectId: string, updates: Partial<CanvasObject>) => {
    if (!user?.id) {
      return;
    }

    // Update the text object with new formatting
    updateObjectOptimistic(textObjectId, {
      ...updates,
      modifiedBy: user.id
    });
  }, [user?.id, updateObjectOptimistic]);

  // Handle entering text edit mode
  const handleStartTextEdit = useCallback((textObjectId: string) => {
    const textObject = objects.find(obj => obj.id === textObjectId);
    
    // Can only edit if user has lock
    if (!textObject || textObject.lockedBy !== user?.id) {
      console.warn('Cannot edit text: user does not have lock');
      return false;
    }
    
    setEditingTextId(textObjectId);
    return true;
  }, [objects, user?.id]);

  // Handle exiting text edit mode and saving changes
  const handleEndTextEdit = useCallback((textObjectId: string, newText: string, save: boolean = true) => {
    if (save && user?.id) {
      // Update the text content
      updateObjectOptimistic(textObjectId, {
        text: newText,
        modifiedBy: user.id
      });
    }
    
    setEditingTextId(null);
  }, [user?.id, updateObjectOptimistic]);

  // Handle duplicate object(s) (Ctrl/Cmd+D) - Supports multi-select
  const handleDuplicateObject = useCallback(async () => {
    if (!user?.id || selectedObjectIds.length === 0) {
      return;
    }

    // Find all selected objects
    const objectsToDuplicate = objects.filter(obj => selectedObjectIds.includes(obj.id));
    if (objectsToDuplicate.length === 0) {
      toastFunction('No objects selected', 'warning', 2000);
      return;
    }

    // Check if user has locks on all objects
    const unlockedObjects = objectsToDuplicate.filter(obj => obj.lockedBy !== user.id);
    if (unlockedObjects.length > 0) {
      toastFunction(`Cannot duplicate: ${unlockedObjects.length} object(s) are being edited by others`, 'warning', 2000);
      return;
    }

    // Duplicate all objects with group offset (20px, 20px)
    const GROUP_OFFSET_X = 20;
    const GROUP_OFFSET_Y = 20;
    const createdObjects: CanvasObject[] = [];

    for (const objectToDuplicate of objectsToDuplicate) {
      // Calculate position with group offset
      const newX = objectToDuplicate.x + GROUP_OFFSET_X;
      const newY = objectToDuplicate.y + GROUP_OFFSET_Y;

      // Constrain to canvas bounds
      const dimensions = getShapeDimensions(objectToDuplicate);
      const constrainedPos = constrainToBounds(newX, newY, dimensions.width, dimensions.height);

      // Create duplicate object (works for all types)
      const duplicateObject: CanvasObject = {
        ...objectToDuplicate,
        id: generateTempId(), // Temporary ID for optimistic update
        x: constrainedPos.x,
        y: constrainedPos.y,
        createdBy: user.id,
        modifiedBy: user.id,
        lockedBy: null,
        lockedAt: null,
        version: 1,
      };

      // Create the duplicate with optimistic updates
      const createdObject = await createObjectOptimistic(duplicateObject);
      if (createdObject) {
        createdObjects.push(createdObject);
      }
    }

    if (createdObjects.length > 0) {
      // Release locks on original objects
      await releaseMultipleLocks(selectedObjectIds);
      
      // Select and acquire locks on the new duplicates
      const newIds = createdObjects.map(obj => obj.id);
      const lockedIds = await acquireMultipleLocks(newIds);
      setSelectedObjectIds(lockedIds);
      
      const count = createdObjects.length;
      toastFunction(`${count} object${count > 1 ? 's' : ''} duplicated`, 'success', 1500);
    } else {
      toastFunction('Failed to duplicate objects', 'error', 2000);
    }
  }, [user?.id, selectedObjectIds, objects, createObjectOptimistic, releaseMultipleLocks, acquireMultipleLocks, toastFunction]);

  // Handle delete selected objects
  const handleDeleteSelected = useCallback(async () => {
    if (selectedObjectIds.length === 0) {
      return;
    }

    let successCount = 0;
    for (const objectId of selectedObjectIds) {
      const success = await deleteObjectOptimistic(objectId);
      if (success) {
        successCount++;
      }
    }
    
    // Release all locks
    await releaseMultipleLocks(selectedObjectIds);
    setSelectedObjectIds([]);
    
    const count = selectedObjectIds.length;
    toastFunction(`${successCount} of ${count} object${count > 1 ? 's' : ''} deleted`, 'success', 1500);
  }, [selectedObjectIds, deleteObjectOptimistic, releaseMultipleLocks, toastFunction]);

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

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    duplicate: handleDuplicateObject,
    deleteSelected: handleDeleteSelected,
    clearSelection: handleClearSelection,
    selectAll: handleSelectAll,
    selectNext: handleSelectNext,
    selectPrevious: handleSelectPrevious,
    rotateBy: (degrees: number) => {
      if (selectedObjectIds.length === 1) {
        rotateBy(degrees);
      }
    },
    resetRotation: () => {
      if (selectedObjectIds.length === 1) {
        resetRotation();
        toastFunction('Rotation reset to 0°', 'success', 1500);
      }
    },
    isTextEditing: () => editingTextId !== null,
    hasSelection: () => selectedObjectIds.length > 0,
    getSelectedObjects: () => selectedObjectIds,
    setZoom: (scale: number) => {
      setViewport(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, scale)) }));
    },
    zoomIn: () => {
      setViewport(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }));
      toastFunction(`Zoom: ${Math.round(viewport.scale * 1.2 * 100)}%`, 'info', 1000);
    },
    zoomOut: () => {
      setViewport(prev => ({ ...prev, scale: Math.max(0.1, prev.scale / 1.2) }));
      toastFunction(`Zoom: ${Math.round(viewport.scale / 1.2 * 100)}%`, 'info', 1000);
    },
    resetZoom: () => {
      setViewport(prev => ({ ...prev, scale: 1 }));
      toastFunction('Zoom reset to 100%', 'success', 1500);
    },
    exportCanvas: async (options: ExportOptions) => {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error('Canvas not ready for export');
      }

      const params = {
        stage,
        objects,
        viewport,
        selectedObjectIds
      };

      try {
        if (options.format === 'svg') {
          await exportToSVG(params, options);
        } else {
          await exportToPNG(params, options);
        }
        toastFunction('Canvas exported successfully!', 'success', 2000);
      } catch (error) {
        console.error('Export failed:', error);
        throw error;
      }
    },
    generatePreview: (mode: 'viewport' | 'entire' | 'selected') => {
      const stage = stageRef.current;
      if (!stage) {
        return null;
      }
      
      const params = {
        stage,
        objects,
        viewport,
        selectedObjectIds
      };
      
      return generatePreview(params, mode);
    }
  }), [handleDuplicateObject, handleDeleteSelected, handleClearSelection, handleSelectAll, handleSelectNext, handleSelectPrevious, rotateBy, resetRotation, selectedObjectIds, editingTextId, toastFunction, viewport, objects, stageRef]);

  // Track Space key for pan mode (Space+Drag to pan) and Cmd/Ctrl for snap override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Cmd/Ctrl for snap override
      if (e.ctrlKey || e.metaKey) {
        setIsModifierPressed(true);
      }
      
      if (e.code === 'Space' && !isSpacePressed) {
        // Don't activate if typing in input fields
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        
        // Don't activate during text editing
        if (editingTextId) {
          return;
        }
        
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Track Cmd/Ctrl release
      if (!e.ctrlKey && !e.metaKey) {
        setIsModifierPressed(false);
      }
      
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false); // Stop panning when space is released
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, editingTextId]);

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
        
        console.log(`  Processing ${selectedId}: obj=${!!selectedObj}, initialPos=${!!selectedInitialPos}, lock=${selectedObj?.lockedBy}`);
        
        if (selectedObj && selectedObj.lockedBy === user?.id && selectedInitialPos) {
          const newX = selectedInitialPos.x + deltaX;
          const newY = selectedInitialPos.y + deltaY;
          
          // Constrain each object to canvas boundaries
          const dimensions = getShapeDimensions(selectedObj);
          const constrainedPosition = constrainToBounds(newX, newY, dimensions.width, dimensions.height);
          
          console.log(`    ✅ Updating ${selectedId} to (${constrainedPosition.x.toFixed(1)}, ${constrainedPosition.y.toFixed(1)})`);
          
          // Update position with optimistic updates
          updateObjectOptimistic(selectedId, {
            x: constrainedPosition.x,
            y: constrainedPosition.y,
            modifiedBy: user.id
          });
        } else {
          console.log(`    ❌ Skipped ${selectedId}`);
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
  }, [user?.id, updateObjectOptimistic, objects, selectedObjectIds, snapSettings, isModifierPressed]);

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
      // For group drag, dragMove already updated all objects to their final positions
      // Don't send another update here to avoid overwriting with potentially stale Konva coordinates
      console.log(`🏁 Group drag ended for ${selectedObjectIds.length} objects`);
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
  }, [objects, user?.id, updateObjectOptimistic, selectedObjectIds]);

      // Handle mouse down for panning and tool interactions
      const handleMouseDown = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Only handle clicks on empty area (the stage itself)
        if (e.target === stage) {
          const pos = stage.getPointerPosition();
          if (!pos) return;

          // Space+Drag for panning (works with any tool)
          if (isSpacePressed) {
            setIsPanning(true);
            setLastPointerPosition(pos);
            return;
          }

          if (activeTool === 'select') {
            // Release all selected objects' locks when clicking on empty area
            if (selectedObjectIds.length > 0) {
              await releaseMultipleLocks(selectedObjectIds);
              setSelectedObjectIds([]);
              // Don't start panning - deselection consumes the click
            } else {
              // No selection to clear, so start panning
              setIsPanning(true);
              setLastPointerPosition(pos);
            }
          } else if (activeTool === 'rectangle') {
            // Create rectangle at click position
            handleCreateRectangle(pos.x, pos.y);
          } else if (activeTool === 'circle') {
            // Create circle at click position
            handleCreateCircle(pos.x, pos.y);
          } else if (activeTool === 'text') {
            // Create text at click position
            handleCreateText(pos.x, pos.y);
          }
        }
      }, [activeTool, handleCreateRectangle, handleCreateCircle, handleCreateText, selectedObjectIds, releaseMultipleLocks, isSpacePressed]);

  // Handle mouse move for panning and cursor tracking
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Handle panning if active (but not during text editing)
    if (isPanning && !editingTextId) {
      const dx = pos.x - lastPointerPosition.x;
      const dy = pos.y - lastPointerPosition.y;

      const newViewport = constrainViewport({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      });

      setViewport(newViewport);
      setLastPointerPosition(pos);
    }

    // Always track cursor position for multiplayer (convert to canvas coordinates)
    const canvasCoords = stageToCanvasCoords(pos.x, pos.y);
    setCursorPosition(canvasCoords);
    
    // Throttled update to Firestore (only if user is authenticated)
    if (user?.id) {
      throttledCursorUpdate(canvasCoords.x, canvasCoords.y);
    }
  }, [isPanning, lastPointerPosition, viewport, constrainViewport, stageToCanvasCoords, user?.id, throttledCursorUpdate, editingTextId]);

  // Handle mouse up to stop panning
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Zoom factor
    const scaleBy = 1.05;
    const oldScale = viewport.scale;
    
    // Calculate new scale
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Zoom toward cursor position
    const newViewport = constrainViewport({
      scale: newScale,
      x: pointer.x - ((pointer.x - viewport.x) / oldScale) * newScale,
      y: pointer.y - ((pointer.y - viewport.y) / oldScale) * newScale,
    });

    setViewport(newViewport);
  }, [viewport, constrainViewport]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-100 overflow-hidden relative flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to canvas...</p>
        </div>
      </div>
    );
  }

  // Show connection error
  if (error && !isConnected) {
    return (
      <div className="w-full h-full bg-gray-100 overflow-hidden relative flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden relative">
      {/* Text Formatting Toolbar - shows when single text object is selected and NOT editing */}
      {selectedObjectIds.length === 1 && !editingTextId && (() => {
        const selectedObject = objects.find(obj => obj.id === selectedObjectIds[0]);
        if (selectedObject && selectedObject.type === 'text' && selectedObject.lockedBy === user?.id) {
          return (
            <TextFormattingToolbar
              textObject={selectedObject}
              onUpdateFormatting={(updates) => handleTextFormattingUpdate(selectedObject.id, updates)}
              canEdit={true}
            />
          );
        }
        return null;
      })()}

      {/* Text Editor Overlay - shows when editing text */}
      {editingTextId && (() => {
        const textObject = objects.find(obj => obj.id === editingTextId);
        if (textObject && textObject.type === 'text') {
          return (
            <TextEditorOverlay
              textObject={textObject}
              viewport={viewport}
              stageRef={stageRef}
              onSave={(newText) => handleEndTextEdit(editingTextId, newText, true)}
              onCancel={() => handleEndTextEdit(editingTextId, textObject.text, false)}
            />
          );
        }
        return null;
      })()}

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        draggable={false} // We handle dragging manually for better control
        style={{
          cursor: isPanning ? 'grabbing' : 
                  isSpacePressed ? 'grab' :
                  (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'text') ? 'crosshair' : 
                  'grab'
        }}
      >
        <Layer>
          {/* Canvas background grid */}
          <Grid 
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            scale={viewport.scale}
          />
          
          {/* Canvas boundary */}
          <CanvasBoundary 
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />
          
          {/* Render canvas objects - sorted by type to ensure text appears on top */}
          {sortedObjects.map(object => {
            const userMap = new Map();
            if (user?.id) {
              userMap.set(user.id, {
                displayName: user.displayName || 'You',
                cursorColor: user.cursorColor || '#007AFF'
              });
            }
            
            const sharedProps = {
              isSelected: selectedObjectIds.includes(object.id),
              onSelect: handleRectangleClick,
              onDeselect: async () => {
                if (selectedObjectIds.length > 0) {
                  console.log('✅ Deselecting via onDeselect:', selectedObjectIds);
                  await releaseMultipleLocks(selectedObjectIds);
                  setSelectedObjectIds([]);
                }
              },
              onDragStart: handleRectangleDragStart,
              onDragMove: handleRectangleDragMove,
              onDragEnd: handleRectangleDragEnd,
              currentUserId: user?.id,
              users: userMap,
            };

            switch (object.type) {
              case 'rectangle':
                return (
                  <Rectangle
                    key={object.id}
                    {...sharedProps}
                    object={object}
                    onClick={handleRectangleClick}
                  />
                );
              case 'circle':
                return (
                  <CircleComponent
                    key={object.id}
                    {...sharedProps}
                    circle={object}
                  />
                );
              case 'text':
                return (
                  <TextObjectComponent
                    key={object.id}
                    {...sharedProps}
                    textObject={object}
                    isEditing={editingTextId === object.id}
                    onStartEdit={handleStartTextEdit}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Resize handles for selected object (only single selection) */}
          {selectedObjectIds.length === 1 && (() => {
            const selectedObject = objects.find(obj => obj.id === selectedObjectIds[0]);
            if (selectedObject && selectedObject.lockedBy === user?.id) {
              return (
                <ResizeHandles
                  object={selectedObject}
                  onResizeStart={handleResizeStart}
                  onResize={handleResize}
                  onResizeEnd={handleResizeEnd}
                />
              );
            }
            return null;
          })()}

          {/* Rotation handle for selected object (only single selection) */}
          {selectedObjectIds.length === 1 && (() => {
            const selectedObject = objects.find(obj => obj.id === selectedObjectIds[0]);
            if (selectedObject && selectedObject.lockedBy === user?.id) {
              return (
                <RotationHandle
                  object={selectedObject}
                  onRotationStart={handleRotationStart}
                  onRotation={handleRotation}
                  onRotationEnd={handleRotationEnd}
                />
              );
            }
            return null;
          })()}

          {/* Dimension tooltip during resize */}
          {resizeDimensions && (
            <Group x={resizeDimensions.x} y={resizeDimensions.y}>
              <Rect
                x={-40}
                y={-15}
                width={80}
                height={30}
                fill="rgba(0, 0, 0, 0.8)"
                cornerRadius={4}
              />
              <Text
                x={-40}
                y={-10}
                width={80}
                height={20}
                text={`${resizeDimensions.width} × ${resizeDimensions.height}`}
                fontSize={12}
                fill="white"
                align="center"
                verticalAlign="middle"
              />
            </Group>
          )}

          {/* Selection count badge (multi-select visual feedback) */}
          {selectedObjectIds.length > 1 && (
            <Group x={20} y={20}>
              <Rect
                x={0}
                y={0}
                width={120}
                height={32}
                fill="rgba(123, 97, 255, 0.9)"
                cornerRadius={6}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.3}
                shadowOffsetY={2}
              />
              <Text
                x={0}
                y={0}
                width={120}
                height={32}
                text={`${selectedObjectIds.length} objects`}
                fontSize={14}
                fontStyle="bold"
                fill="white"
                align="center"
                verticalAlign="middle"
              />
            </Group>
          )}

          {/* Render other users' cursors (teleport positioning - instant updates) */}
          {Array.from(otherCursors.entries()).map(([userId, cursorData]) => (
            <Cursor
              key={userId}
              userId={userId}
              cursorData={cursorData}
            />
          ))}
          
          {/* Snap guides (smart alignment guides) */}
          <SnapGuides guides={snapGuides} scale={viewport.scale} />
        </Layer>
      </Stage>
    </div>
  );
});

Canvas.displayName = 'Canvas';

// Grid component for visual reference
const Grid: React.FC<{ width: number; height: number; scale: number }> = ({ 
  width, 
  height, 
  scale 
}) => {
  const gridSize = scale > 0.5 ? 50 : scale > 0.25 ? 100 : 200;
  const lines: React.ReactElement[] = [];

  // Only render grid if zoomed in enough
  if (scale > 0.1) {
    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, 0, i, height]}
          stroke="#e5e7eb"
          strokeWidth={1 / scale} // Keep line width consistent at different zoom levels
        />
      );
    }

    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i, width, i]}
          stroke="#e5e7eb"
          strokeWidth={1 / scale}
        />
      );
    }
  }

  return <React.Fragment>{lines}</React.Fragment>;
};

// Canvas boundary component
const CanvasBoundary: React.FC<{ width: number; height: number }> = ({ 
  width, 
  height 
}) => {
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill="#ffffff"
      stroke="#374151"
      strokeWidth={2}
      listening={false} // This prevents the boundary from intercepting clicks
    />
  );
};

export default Canvas;
