import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { createRectangle, isWithinCanvasBounds } from '../utils/objectFactory';
import { constrainToBounds } from '../utils/constrainToBounds';
import { useAuth } from '../hooks/useAuth';
import { useCanvas } from '../hooks/useCanvas';
import { useToastContext, createToastFunction } from '../contexts/ToastContext';

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
        const newRectangle = createRectangle(x, y, user.id);

        // Create with optimistic updates and Firestore sync
        const createdObject = await createObjectOptimistic(newRectangle);

        // Auto-select the newly created rectangle if successful
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

    // Constrain to canvas boundaries during drag using the utility
    const constrainedPosition = constrainToBounds(x, y, object.width, object.height);

    // Update object position with optimistic updates and throttled Firestore sync
    // The useCanvas hook already handles throttling at 500ms
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

    // Constrain final position to canvas boundaries
    const constrainedPosition = constrainToBounds(x, y, object.width, object.height);
    
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
          }
        }
      }, [activeTool, handleCreateRectangle, selectedObjectId, releaseObjectLock]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const dx = pos.x - lastPointerPosition.x;
    const dy = pos.y - lastPointerPosition.y;

    const newViewport = constrainViewport({
      ...viewport,
      x: viewport.x + dx,
      y: viewport.y + dy,
    });

    setViewport(newViewport);
    setLastPointerPosition(pos);
  }, [isPanning, lastPointerPosition, viewport, constrainViewport]);

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
      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-md z-10">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-gray-700">
            {isConnected ? 'Connected' : 'Disconnected'} • {objects.length} objects
          </span>
        </div>
      </div>


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
          cursor: activeTool === 'rectangle' ? 'crosshair' : 
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
          
          {/* Render canvas objects */}
          {objects.map(object => (
            <Rectangle
              key={object.id}
              object={object}
              isSelected={selectedObjectId === object.id}
              onClick={handleRectangleClick}
              onDragStart={handleRectangleDragStart}
              onDragMove={handleRectangleDragMove}
              onDragEnd={handleRectangleDragEnd}
              currentUserId={user?.id}
              users={{
                // Simple user mapping - in a real app, this would come from a users context/service
                [user?.id || '']: {
                  displayName: user?.displayName || 'You',
                  cursorColor: user?.cursorColor || '#007AFF'
                }
              }}
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
