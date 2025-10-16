import React from 'react';
import { Rect, Group } from 'react-konva';
import type { CanvasObject } from '../types/canvas';

interface ResizeHandlesProps {
  object: CanvasObject;
  onResizeStart: (handle: ResizeHandle) => void;
  onResize: (handle: ResizeHandle, x: number, y: number, shiftKey: boolean) => void;
  onResizeEnd: () => void;
}

export type ResizeHandle = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right';

const HANDLE_SIZE = 8;
const HANDLE_COLOR = '#007AFF';
const HANDLE_STROKE_COLOR = '#FFFFFF';

const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  object,
  onResizeStart,
  onResize,
  onResizeEnd,
}) => {
  // Get object dimensions
  const getObjectDimensions = () => {
    if (object.type === 'rectangle') {
      return { width: object.width, height: object.height };
    } else if (object.type === 'circle') {
      return { width: object.radius * 2, height: object.radius * 2 };
    } else if (object.type === 'text') {
      return { width: object.width || 100, height: object.height || 20 };
    }
    return { width: 100, height: 100 };
  };

  const { width, height } = getObjectDimensions();

  // Handle positions relative to object
  // Stage 2: All 8 handles (4 corners + 4 sides)
  const handles: Array<{ handle: ResizeHandle; x: number; y: number; cursor: string }> = [
    // Corners
    { handle: 'top-left', x: 0, y: 0, cursor: 'nwse-resize' },
    { handle: 'top-right', x: width, y: 0, cursor: 'nesw-resize' },
    { handle: 'bottom-left', x: 0, y: height, cursor: 'nesw-resize' },
    { handle: 'bottom-right', x: width, y: height, cursor: 'nwse-resize' },
    // Sides
    { handle: 'top', x: width / 2, y: 0, cursor: 'ns-resize' },
    { handle: 'bottom', x: width / 2, y: height, cursor: 'ns-resize' },
    { handle: 'left', x: 0, y: height / 2, cursor: 'ew-resize' },
    { handle: 'right', x: width, y: height / 2, cursor: 'ew-resize' },
  ];

  const handleDragMove = (handle: ResizeHandle) => (e: any) => {
    // Get the stage and pointer position
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (!pointerPos) return;

    // Convert from screen coordinates to canvas coordinates
    const scale = stage.scaleX(); // Assuming uniform scale
    const stagePos = stage.position();
    
    const canvasX = (pointerPos.x - stagePos.x) / scale;
    const canvasY = (pointerPos.y - stagePos.y) / scale;
    
    // Check if shift key is pressed (for aspect ratio lock)
    const shiftKey = e.evt?.shiftKey || false;
    
    onResize(handle, canvasX, canvasY, shiftKey);
  };

  return (
    <Group
      x={object.x}
      y={object.y}
      rotation={object.rotation}
    >
      {handles.map(({ handle, x, y, cursor }) => (
        <Rect
          key={handle}
          x={x - HANDLE_SIZE / 2}
          y={y - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HANDLE_COLOR}
          stroke={HANDLE_STROKE_COLOR}
          strokeWidth={1}
          draggable={true}
          dragBoundFunc={(pos) => {
            // Return the same position - we handle position in onDragMove
            return pos;
          }}
          onDragStart={(e) => {
            e.cancelBubble = true;
            onResizeStart(handle);
          }}
          onDragMove={handleDragMove(handle)}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            onResizeEnd();
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = cursor;
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'default';
            }
          }}
        />
      ))}
    </Group>
  );
};

export default ResizeHandles;

