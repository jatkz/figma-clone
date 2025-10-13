import React from 'react';
import { Rect } from 'react-konva';
import type { CanvasObject } from '../types/canvas';

interface RectangleProps {
  object: CanvasObject;
  isSelected?: boolean;
  onClick?: (objectId: string) => void;
  onDragStart?: (objectId: string) => void;
  onDragMove?: (objectId: string, x: number, y: number) => void;
  onDragEnd?: (objectId: string, x: number, y: number) => void;
}

const Rectangle: React.FC<RectangleProps> = ({
  object,
  isSelected = false,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const handleClick = () => {
    onClick?.(object.id);
  };

  const handleDragStart = () => {
    onDragStart?.(object.id);
  };

  const handleDragMove = (e: any) => {
    const { x, y } = e.target.attrs;
    onDragMove?.(object.id, x, y);
  };

  const handleDragEnd = (e: any) => {
    const { x, y } = e.target.attrs;
    onDragEnd?.(object.id, x, y);
  };

  return (
    <>
      {/* Main rectangle */}
      <Rect
        id={object.id}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={object.color}
        rotation={object.rotation}
        draggable={true}
        onClick={handleClick}
        onTap={handleClick} // For touch devices
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        // Visual feedback on hover
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'default';
          }
        }}
      />

      {/* Selection border */}
      {isSelected && (
        <Rect
          x={object.x - 2}
          y={object.y - 2}
          width={object.width + 4}
          height={object.height + 4}
          fill="transparent"
          stroke="#007AFF"
          strokeWidth={2}
          rotation={object.rotation}
          dash={[4, 4]}
          listening={false} // This rect shouldn't capture events
        />
      )}

      {/* Lock indicator */}
      {object.lockedBy && (
        <Rect
          x={object.x - 1}
          y={object.y - 1}
          width={object.width + 2}
          height={object.height + 2}
          fill="transparent"
          stroke={object.lockedBy === 'current-user' ? '#007AFF' : '#FF3B30'} // Blue for current user, red for others
          strokeWidth={2}
          rotation={object.rotation}
          listening={false}
        />
      )}
    </>
  );
};

export default Rectangle;
