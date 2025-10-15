import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y
} from '../types/canvas';
import type { ToolType } from './ToolPanel';
import Rectangle from './Rectangle';
import CircleComponent from './Circle';
import TextObjectComponent from './TextObject';
import { createNewRectangle, createNewCircle, createNewText, isWithinCanvasBounds } from '../utils/shapeFactory';
import { constrainToBounds } from '../utils/constrainToBounds';
import { getShapeDimensions } from '../utils/shapeUtils';
import { useAuth } from '../hooks/useAuth';
import { useCanvas } from '../hooks/useCanvas';
import { useToastContext, createToastFunction } from '../contexts/ToastContext';
import { updateCursor, subscribeToCursors, type CursorData } from '../services/canvasService';
import { initializeAICanvasState, cleanupAICanvasState } from '../services/aiCanvasService';
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
}


const Canvas: React.FC<CanvasProps> = ({ activeTool }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const { user } = useAuth();
  
  // Toast notifications from context
  const toastContext = useToastContext();
  
  // Create toast function for the canvas hook
  const toastFunction = useCallback(
    createToastFunction(toastContext),
    [toastContext]
  );

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
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Selection state (local only, not synced)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

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

  // Auto-deselect object when switching to creation tools
  useEffect(() => {
    const isCreationTool = activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'text';
    
    if (isCreationTool && selectedObjectId) {
      // Release lock and deselect when switching to creation tools
      const deselectObject = async () => {
        await releaseObjectLock(selectedObjectId);
        setSelectedObjectId(null);
      };
      
      deselectObject();
    }
  }, [activeTool, selectedObjectId, releaseObjectLock]);

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

  // Handle keyboard events (delete selected rectangle)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          // Delete selected rectangle with Firestore sync
          const success = await deleteObjectOptimistic(selectedObjectId);
          if (success) {
            // Release lock automatically on successful deletion
            await releaseObjectLock(selectedObjectId);
            setSelectedObjectId(null);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, deleteObjectOptimistic, releaseObjectLock]);

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

  // Handle rectangle click with locking and enhanced messaging
  const handleRectangleClick = useCallback(async (objectId: string) => {
    if (activeTool === 'select') {
      // If already selected, deselect and release lock
      if (selectedObjectId === objectId) {
        await releaseObjectLock(objectId);
        setSelectedObjectId(null);
        return;
      }

      // Find the object to get user information for better messaging
      const targetObject = objects.find(obj => obj.id === objectId);
      let lockingUserName = 'Unknown User';
      
      // Get the locking user's name if object is locked by someone else
      if (targetObject?.lockedBy && targetObject.lockedBy !== user?.id) {
        // For now, we'll use a simple mapping. In a real app, this would come from user service
        lockingUserName = targetObject.lockedBy === user?.id ? user.displayName : 'Another User';
      }

      // Try to acquire lock on the object
      const lockAcquired = await acquireObjectLock(objectId, lockingUserName);
      if (lockAcquired) {
        // Release previous selection's lock if any
        if (selectedObjectId) {
          await releaseObjectLock(selectedObjectId);
        }
        setSelectedObjectId(objectId);
        toastFunction('Object selected for editing', 'success', 1500);
      }
      // If lock not acquired, selectedObjectId stays the same (don't select)
    }
  }, [activeTool, selectedObjectId, acquireObjectLock, releaseObjectLock, objects, user?.id, user?.displayName, toastFunction]);

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
        const createdObject = await createObjectOptimistic(newRectangle);

        // Auto-select the newly created rectangle if successful
        if (createdObject) {
          setSelectedObjectId(createdObject.id);
        }
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
    const createdObject = await createObjectOptimistic(newCircle);

    // Auto-select the newly created circle if successful
    if (createdObject) {
      setSelectedObjectId(createdObject.id);
    }
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
    const createdObject = await createObjectOptimistic(newText);

    // Auto-select the newly created text if successful
    if (createdObject) {
      setSelectedObjectId(createdObject.id);
    }
  }, [user?.id, screenToCanvasCoords, createObjectOptimistic]);

  // Handle rectangle drag events
  const handleRectangleDragStart = useCallback((objectId: string) => {
    // Verify the user has the lock before allowing drag
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag start blocked: User ${user?.id} doesn't own lock on ${objectId}`);
      return false; // Prevent drag
    }
    
    console.log(`🎯 Drag started for object ${objectId} by user ${user.id}`);
    return true; // Allow drag
  }, [objects, user?.id]);

  const handleRectangleDragMove = useCallback((objectId: string, x: number, y: number) => {
    // Only allow drag moves if user has acquired the lock (safety check)
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag blocked: User ${user?.id} doesn't own lock on ${objectId}`);
      return;
    }

    // Get object dimensions properly for any shape type
    const dimensions = getShapeDimensions(object);
    
    // Constrain to canvas boundaries during drag using the utility
    const constrainedPosition = constrainToBounds(x, y, dimensions.width, dimensions.height);

    // Update object position with optimistic updates and throttled Firestore sync
    // The useCanvas hook already handles throttling at 100ms
    updateObjectOptimistic(objectId, {
      x: constrainedPosition.x,
      y: constrainedPosition.y,
      modifiedBy: user.id
    });
  }, [user?.id, updateObjectOptimistic, objects]);

  const handleRectangleDragEnd = useCallback(async (objectId: string, x: number, y: number) => {
    // Verify the user still has the lock 
    const object = objects.find(obj => obj.id === objectId);
    if (!object || object.lockedBy !== user?.id) {
      console.warn(`Drag end blocked: User ${user?.id} doesn't own lock on ${objectId}`);
      return;
    }

    // Get object dimensions properly for any shape type  
    const dimensions = getShapeDimensions(object);
    
    // Constrain final position to canvas boundaries
    const constrainedPosition = constrainToBounds(x, y, dimensions.width, dimensions.height);
    
    console.log(`🏁 Drag ended for object ${objectId} at position (${constrainedPosition.x}, ${constrainedPosition.y})`);

    // Send final position update to Firestore (this will override any pending throttled updates)
    await updateObjectOptimistic(objectId, {
      x: constrainedPosition.x,
      y: constrainedPosition.y,
      modifiedBy: user.id
    });

    // Keep lock active - user still has the rectangle selected for further editing
    console.log(`🔒 Lock maintained on ${objectId} after drag completion`);
  }, [objects, user?.id, updateObjectOptimistic]);

      // Handle mouse down for panning and tool interactions
      const handleMouseDown = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Only handle clicks on empty area (the stage itself)
        if (e.target === stage) {
          const pos = stage.getPointerPosition();
          if (!pos) return;

          if (activeTool === 'select') {
            // Release any selected object's lock when clicking on empty area
            if (selectedObjectId) {
              await releaseObjectLock(selectedObjectId);
              setSelectedObjectId(null);
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
      }, [activeTool, handleCreateRectangle, handleCreateCircle, handleCreateText, selectedObjectId, releaseObjectLock]);

  // Handle mouse move for panning and cursor tracking
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Handle panning if active
    if (isPanning) {
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
  }, [isPanning, lastPointerPosition, viewport, constrainViewport, stageToCanvasCoords, user?.id, throttledCursorUpdate]);

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
          cursor: (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'text') ? 'crosshair' : 
                  isPanning ? 'grabbing' : 'grab'
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
              isSelected: selectedObjectId === object.id,
              onSelect: handleRectangleClick,
              onDeselect: () => handleRectangleClick(''),
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
                  />
                );
              default:
                return null;
            }
          })}

          {/* Render other users' cursors (teleport positioning - instant updates) */}
          {Array.from(otherCursors.entries()).map(([userId, cursorData]) => (
            <Cursor
              key={userId}
              userId={userId}
              cursorData={cursorData}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

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
