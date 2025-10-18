import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  type CanvasObject
} from '../types/canvas';
import type { ToolType } from './ToolPanel';
import TextFormattingToolbar from './TextFormattingToolbar';
import TextEditorOverlay from './TextEditorOverlay';
import { useResize } from '../hooks/useResize';
import { useRotation } from '../hooks/useRotation';
import { useCanvasSelection } from '../hooks/useCanvasSelection';
import { useCanvasDrag } from '../hooks/useCanvasDrag';
import { useLassoSelection } from '../hooks/useLassoSelection';
import { useCanvasAlignment } from '../hooks/useCanvasAlignment';
import { useCanvasObjectCreation } from '../hooks/useCanvasObjectCreation';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { generateTempId } from '../utils/shapeFactory';
import { constrainToBounds } from '../utils/constrainToBounds';
import { getShapeDimensions } from '../utils/shapeUtils';
import { useAuth } from '../hooks/useAuth';
import { useCanvas } from '../hooks/useCanvas';
import { useToastContext, createToastFunction } from '../contexts/ToastContext';
import { updateCursor, subscribeToCursors, type CursorData } from '../services/canvasService';
import { initializeAICanvasState, cleanupAICanvasState } from '../services/aiCanvasService';
import { exportToSVG, exportToPNG, generatePreview, type ExportOptions } from '../utils/canvasExport';
import { useSnap } from '../contexts/SnapContext';
import type { SnapGuide } from '../types/snap';
import type { AlignmentType, DistributionType } from '../utils/alignmentUtils';
import { screenToCanvasCoords, stageToCanvasCoords } from '../utils/canvasCoordinates';
import { getCanvasCursor } from '../utils/canvasHelpers';
import CanvasObjects from './canvas/CanvasObjects';
import SelectionOverlay from './canvas/SelectionOverlay';
import CanvasControls from './canvas/CanvasControls';
import CommentPanel from './CommentPanel';

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

interface CanvasProps {
  activeTool: ToolType;
  onSelectionChange?: (hasSelection: boolean) => void;
  magicWandTolerance?: number;
  filterPreviewIds?: string[];
}

export interface CanvasRef {
  duplicate: () => void;
  deleteSelected: () => Promise<void>;
  clearSelection: () => Promise<void>;
  selectAll: () => Promise<void>;
  selectNext: () => Promise<void>;
  selectPrevious: () => Promise<void>;
  selectInverse: () => Promise<void>;
  selectByType: (objectType: 'rectangle' | 'circle' | 'text', addToSelection?: boolean) => Promise<void>;
  selectByIds: (objectIds: string[]) => Promise<void>;
  align: (type: AlignmentType) => Promise<void>;
  distribute: (type: DistributionType) => Promise<void>;
  alignToCanvasCenter: (type: 'center' | 'left' | 'right' | 'top' | 'bottom') => Promise<void>;
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
  toggleComments: () => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ activeTool, onSelectionChange, magicWandTolerance = 15, filterPreviewIds = [] }, ref) => {
  const stageRef = useRef<Konva.Stage | null>(null);
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
    updateObjectLocal,
    batchUpdateObjectsOptimistic,
    deleteObjectOptimistic,
    acquireObjectLock,
    releaseObjectLock
  } = useCanvas(user?.id, toastFunction);

  // Viewport state (extracted to custom hook)
  const {
    viewport,
    setViewport,
    constrainViewport,
    handleWheel,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom
  } = useCanvasViewport({
    stageRef,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    canvasCenterX: CANVAS_CENTER_X,
    canvasCenterY: CANVAS_CENTER_Y,
    toastFunction
  });

  // Track if we're currently panning
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Selection state and handlers (extracted to custom hook)
  const {
    selectedObjectIds,
    setSelectedObjectIds,
    acquireMultipleLocks,
    releaseMultipleLocks,
    handleRectangleClick,
    handleClearSelection,
    handleSelectAll,
    handleSelectNext,
    handleSelectPrevious,
    handleSelectInverse,
    handleSelectByType,
    handleSelectByIds
  } = useCanvasSelection({
    objects,
    user,
    activeTool,
    acquireObjectLock,
    releaseObjectLock,
    toastFunction,
    magicWandTolerance
  });
  
  // Text editing state (track which text object is being edited)
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Comments panel state
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  
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
  
  // Drag handlers (extracted to custom hook)
  const {
    handleRectangleDragStart,
    handleRectangleDragMove,
    handleRectangleDragEnd
  } = useCanvasDrag({
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
  });

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

  // Wrapper for coordinate transformation utilities (memoized with viewport)
  const screenToCanvasCoordsCallback = useCallback((screenX: number, screenY: number) => {
    return screenToCanvasCoords(screenX, screenY, viewport);
  }, [viewport]);

  // Lasso selection (extracted to custom hook)
  const {
    lassoState,
    setLassoState,
    handleLassoStart,
    handleLassoMove,
    handleLassoComplete
  } = useLassoSelection({
    activeTool,
    objects,
    selectedObjectIds,
    setSelectedObjectIds,
    acquireMultipleLocks,
    releaseMultipleLocks,
    screenToCanvasCoords: screenToCanvasCoordsCallback,
    viewport,
    toastFunction
  });

  // Alignment and distribution (extracted to custom hook)
  const {
    handleAlign,
    handleDistribute,
    handleAlignToCanvas
  } = useCanvasAlignment({
    objects,
    selectedObjectIds,
    user,
    batchUpdateObjectsOptimistic,
    toastFunction,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT
  });

  // Object creation (extracted to custom hook)
  const {
    handleCreateRectangle,
    handleCreateCircle,
    handleCreateText
  } = useCanvasObjectCreation({
    user,
    screenToCanvasCoords: screenToCanvasCoordsCallback,
    createObjectOptimistic
  });

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedObjectIds.length > 0);
  }, [selectedObjectIds, onSelectionChange]);

  // Track if we've already cleaned up stale locks
  const hasCleanedLocksRef = useRef(false);

  // Clean up stale locks on component mount (fixes visual "selection" bug after page refresh)
  useEffect(() => {
    if (!user?.id || !isConnected || objects.length === 0 || hasCleanedLocksRef.current) return;
    
    // Find any objects that are locked by current user
    const staleLocks = objects.filter(obj => obj.lockedBy === user.id);
    
    if (staleLocks.length > 0) {
      console.log(`🧹 Cleaning up ${staleLocks.length} stale lock(s) from previous session`);
      
      // Release all stale locks
      staleLocks.forEach(obj => {
        releaseObjectLock(obj.id);
      });
      
      toastFunction(`Cleared ${staleLocks.length} stale lock(s)`, 'info', 2000);
      hasCleanedLocksRef.current = true;
    }
  }, [user?.id, isConnected, objects, releaseObjectLock, toastFunction]);

  // Cursor position state for multiplayer cursor tracking
  const [, setCursorPosition] = useState<{ x: number; y: number } | null>(null);


  // Clear lasso state when switching away from lasso tool
  useEffect(() => {
    if (activeTool !== 'lasso' && lassoState.isDrawing) {
      setLassoState({
        isDrawing: false,
        points: [],
        isClosing: false
      });
    }
  }, [activeTool, lassoState.isDrawing]);

  // Other users' cursors from Firestore
  const [otherCursors, setOtherCursors] = useState<Map<string, CursorData>>(new Map());

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

  // Convert stage coordinates to canvas coordinates for cursor tracking
  const stageToCanvasCoordsCallback = useCallback((stageX: number, stageY: number) => {
    return stageToCanvasCoords(stageX, stageY, viewport);
  }, [viewport]);

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

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    duplicate: handleDuplicateObject,
    deleteSelected: handleDeleteSelected,
    clearSelection: handleClearSelection,
    selectAll: handleSelectAll,
    selectNext: handleSelectNext,
    selectPrevious: handleSelectPrevious,
    selectInverse: handleSelectInverse,
    selectByType: handleSelectByType,
    selectByIds: handleSelectByIds,
    align: handleAlign,
    distribute: handleDistribute,
    alignToCanvasCenter: handleAlignToCanvas,
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
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
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
    },
    toggleComments: () => {
      setShowCommentsPanel(prev => !prev);
    }
  }), [handleDuplicateObject, handleDeleteSelected, handleClearSelection, handleSelectAll, handleSelectNext, handleSelectPrevious, handleSelectInverse, handleSelectByType, handleSelectByIds, handleAlign, handleDistribute, handleAlignToCanvas, rotateBy, resetRotation, setZoom, zoomIn, zoomOut, resetZoom, selectedObjectIds, editingTextId, toastFunction, viewport, objects, stageRef]);

  // Track Space key for pan mode (Space+Drag to pan) and Cmd/Ctrl for snap override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Cmd/Ctrl for snap override
      if (e.ctrlKey || e.metaKey) {
        setIsModifierPressed(true);
      }
      
      // Escape key: Cancel lasso drawing
      if (e.key === 'Escape' && lassoState.isDrawing) {
        e.preventDefault();
        setLassoState({
          isDrawing: false,
          points: [],
          isClosing: false
        });
        toastFunction('Lasso cancelled', 'info', 1000);
        return;
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
  }, [isSpacePressed, editingTextId, lassoState.isDrawing, toastFunction]);

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
          } else if (activeTool === 'lasso') {
            // Start lasso selection
            handleLassoStart(pos.x, pos.y);
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
      }, [activeTool, handleCreateRectangle, handleCreateCircle, handleCreateText, handleLassoStart, selectedObjectIds, releaseMultipleLocks, isSpacePressed]);

  // Handle mouse move for panning and cursor tracking
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Handle lasso drawing
    if (lassoState.isDrawing) {
      handleLassoMove(pos.x, pos.y);
    }

    // Handle panning if active (but not during text editing or lasso drawing)
    if (isPanning && !editingTextId && !lassoState.isDrawing) {
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
    const canvasCoords = stageToCanvasCoordsCallback(pos.x, pos.y);
    setCursorPosition(canvasCoords);
    
    // Throttled update to Firestore (only if user is authenticated)
    if (user?.id) {
      throttledCursorUpdate(canvasCoords.x, canvasCoords.y);
    }
  }, [isPanning, lastPointerPosition, viewport, constrainViewport, stageToCanvasCoordsCallback, user?.id, throttledCursorUpdate, editingTextId, lassoState.isDrawing, handleLassoMove]);

  // Handle mouse up to stop panning and complete lasso
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsPanning(false);
    
    // Complete lasso selection if active
    if (lassoState.isDrawing) {
      const shiftKey = e.evt.shiftKey;
      const altKey = e.evt.altKey;
      handleLassoComplete(shiftKey, altKey);
    }
  }, [lassoState.isDrawing, handleLassoComplete]);

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

  // Get selected object for comments panel
  const selectedObject = selectedObjectIds.length === 1 
    ? objects.find(obj => obj.id === selectedObjectIds[0]) || null
    : null;

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

      {/* Comments Panel - shows when toggled */}
      {showCommentsPanel && (
        <CommentPanel
          selectedObject={selectedObject}
          currentUserId={user?.id}
          currentUserName={user?.displayName}
          currentUserColor={user?.cursorColor}
          onClose={() => setShowCommentsPanel(false)}
        />
      )}

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
          cursor: getCanvasCursor(activeTool, isPanning, isSpacePressed)
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
          
          {/* Render canvas objects */}
          <CanvasObjects
            objects={objects}
            selectedObjectIds={selectedObjectIds}
            filterPreviewIds={filterPreviewIds}
            editingTextId={editingTextId}
            currentUserId={user?.id}
            onRectangleClick={handleRectangleClick}
            onDeselect={async () => {
              if (selectedObjectIds.length > 0) {
                console.log('✅ Deselecting via onDeselect:', selectedObjectIds);
                await releaseMultipleLocks(selectedObjectIds);
                setSelectedObjectIds([]);
              }
            }}
            onDragStart={handleRectangleDragStart}
            onDragMove={handleRectangleDragMove}
            onDragEnd={handleRectangleDragEnd}
            onStartTextEdit={handleStartTextEdit}
          />

          {/* Selection overlay (resize handles, rotation handle, tooltips) */}
          <SelectionOverlay
            objects={objects}
            selectedObjectIds={selectedObjectIds}
            currentUserId={user?.id}
            resizeDimensions={resizeDimensions}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            onRotationStart={handleRotationStart}
            onRotation={handleRotation}
            onRotationEnd={handleRotationEnd}
          />

          {/* Canvas controls (snap guides, lasso, cursors) */}
          <CanvasControls
            snapGuides={snapGuides}
            viewportScale={viewport.scale}
            lassoState={lassoState}
            otherCursors={otherCursors}
          />
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
