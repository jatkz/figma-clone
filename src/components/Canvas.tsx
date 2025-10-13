import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  CANVAS_CENTER_X, 
  CANVAS_CENTER_Y 
} from '../types/canvas';

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  
  // Viewport state: centered at canvas center initially
  const [viewport, setViewport] = useState<ViewportState>({
    x: -CANVAS_CENTER_X, // Negative because we want to center the canvas
    y: -CANVAS_CENTER_Y,
    scale: 1,
  });

  // Track if we're currently panning
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

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

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Only start panning if clicking on empty area (the stage itself)
    if (e.target === stage) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      if (pos) {
        setLastPointerPosition(pos);
      }
    }
  }, []);

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
      {/* Canvas info overlay */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-md z-10">
        <div className="text-sm text-gray-700">
          <div>Zoom: {Math.round(viewport.scale * 100)}%</div>
          <div>Position: ({Math.round(-viewport.x)}, {Math.round(-viewport.y)})</div>
        </div>
      </div>

      {/* Canvas boundaries indicator */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-md z-10">
        <div className="text-sm text-gray-700">
          Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}
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
          
          {/* Objects will be rendered here in future tasks */}
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
    />
  );
};

export default Canvas;
