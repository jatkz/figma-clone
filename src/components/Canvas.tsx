import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  CANVAS_CENTER_X, 
  CANVAS_CENTER_Y 
} from '../types/canvas';
import type { CanvasObject } from '../types/canvas';
import type { ToolType } from './ToolPanel';
import Rectangle from './Rectangle';
import { createRectangle, generateTempId, isWithinCanvasBounds } from '../utils/objectFactory';
import { useAuth } from '../hooks/useAuth';

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

  // Canvas objects and selection state
  const [objects, setObjects] = useState<CanvasObject[]>([
    // Empty array - objects will come from Firestore in Phase 4
  ]);
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
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedObjectId) {
              // Delete selected rectangle
              setObjects(prev => prev.filter(obj => obj.id !== selectedObjectId));
              setSelectedObjectId(null);
              // TODO: Send delete to Firestore in Phase 4
            }
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [selectedObjectId]);

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

  // Handle rectangle click
  const handleRectangleClick = useCallback((objectId: string) => {
    if (activeTool === 'select') {
      setSelectedObjectId(prev => prev === objectId ? null : objectId);
    }
  }, [activeTool]);

  // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    const canvasX = (screenX - viewport.x) / viewport.scale;
    const canvasY = (screenY - viewport.y) / viewport.scale;
    return { x: canvasX, y: canvasY };
  }, [viewport]);

      // Handle rectangle creation
      const handleCreateRectangle = useCallback((screenX: number, screenY: number) => {
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
        const tempId = generateTempId();

        // Add to local state optimistically
        const rectangleWithId: CanvasObject = {
          id: tempId,
          ...newRectangle,
        };

        setObjects(prev => [...prev, rectangleWithId]);

        // Auto-select the newly created rectangle
        setSelectedObjectId(tempId);

        // TODO: Send to Firestore in Phase 4
      }, [user?.id, screenToCanvasCoords]);

      // Handle rectangle drag events
      const handleRectangleDragStart = useCallback((_objectId: string) => {
        // TODO: Add drag start logic if needed
      }, []);

  const handleRectangleDragMove = useCallback((objectId: string, x: number, y: number) => {
    // Constrain to canvas boundaries during drag
    const constrainedX = Math.max(0, Math.min(x, CANVAS_WIDTH - 100)); // Assume 100px width
    const constrainedY = Math.max(0, Math.min(y, CANVAS_HEIGHT - 100)); // Assume 100px height

    // Update object position locally (optimistic update)
    setObjects(prev => prev.map(obj => 
      obj.id === objectId ? { ...obj, x: constrainedX, y: constrainedY } : obj
    ));
  }, []);

      const handleRectangleDragEnd = useCallback((_objectId: string, _x: number, _y: number) => {
        // TODO: Send position update to Firestore in Phase 4
      }, []);

      // Handle mouse down for panning and tool interactions
      const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        // Only handle clicks on empty area (the stage itself)
        if (e.target === stage) {
          const pos = stage.getPointerPosition();
          if (!pos) return;

          if (activeTool === 'select') {
            // Deselect any selected object when clicking on empty area
            setSelectedObjectId(null);

            // Start panning
            setIsPanning(true);
            setLastPointerPosition(pos);
          } else if (activeTool === 'rectangle') {
            // Create rectangle at click position
            handleCreateRectangle(pos.x, pos.y);
          }
        }
      }, [activeTool, handleCreateRectangle]);

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
