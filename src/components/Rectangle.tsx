import React from 'react';
import { Rect, Text } from 'react-konva';
import type { CanvasObject } from '../types/canvas';

interface RectangleProps {
  object: CanvasObject;
  isSelected?: boolean;
  onClick?: (objectId: string) => void;
  onDragStart?: (objectId: string) => void;
  onDragMove?: (objectId: string, x: number, y: number) => void;
  onDragEnd?: (objectId: string, x: number, y: number) => void;
  currentUserId?: string;
  users?: { [userId: string]: { displayName: string; cursorColor: string } };
}

const Rectangle: React.FC<RectangleProps> = ({
  object,
  isSelected = false,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  currentUserId,
  users = {},
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

  // Determine lock status and colors
  const isLockedByCurrentUser = object.lockedBy === currentUserId;
  const isLockedByOther = object.lockedBy && !isLockedByCurrentUser;
  const lockingUser = object.lockedBy ? users[object.lockedBy] : null;
  
  // Get lock border color
  const getLockBorderColor = () => {
    if (isLockedByCurrentUser) return '#007AFF'; // Blue for current user
    if (isLockedByOther && lockingUser) return lockingUser.cursorColor || '#FF3B30'; // User's cursor color or red fallback
    return '#FF3B30'; // Default red for unknown users
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
        draggable={isLockedByCurrentUser} // Only allow dragging if current user has acquired the lock
        onClick={handleClick}
        onTap={handleClick} // For touch devices
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        // Visual feedback on hover
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = isLockedByOther ? 'not-allowed' : 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'default';
          }
        }}
        // Visual feedback for locked objects
        opacity={isLockedByOther ? 0.7 : 1.0}
      />

      {/* Selection border (only show if selected and current user has lock) */}
      {isSelected && isLockedByCurrentUser && (
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

      {/* Lock indicator border */}
      {object.lockedBy && (
        <Rect
          x={object.x - 3}
          y={object.y - 3}
          width={object.width + 6}
          height={object.height + 6}
          fill="transparent"
          stroke={getLockBorderColor()}
          strokeWidth={3}
          rotation={object.rotation}
          dash={isLockedByCurrentUser ? [8, 4] : [4, 4]} // Different dash pattern for own vs others
          listening={false}
        />
      )}

      {/* User label for locked objects */}
      {object.lockedBy && lockingUser && (
        <React.Fragment>
          {/* Background for username label */}
          <Rect
            x={object.x}
            y={object.y - 25}
            width={lockingUser.displayName.length * 8 + 12} // Approximate text width
            height={20}
            fill={getLockBorderColor()}
            cornerRadius={4}
            listening={false}
          />
          
          {/* Username label */}
          <Text
            x={object.x + 6}
            y={object.y - 20}
            text={isLockedByCurrentUser ? 'You' : lockingUser.displayName}
            fontSize={12}
            fontFamily="Arial, sans-serif"
            fill="white"
            fontStyle="bold"
            listening={false}
          />
        </React.Fragment>
      )}
    </>
  );
};

export default Rectangle;
