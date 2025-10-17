import React from 'react';
import { Circle as KonvaCircle, Group, Text } from 'react-konva';
import type { CircleObject, User } from '../types/canvas';

interface CircleProps {
  circle: CircleObject;
  isSelected: boolean;
  isFilterPreview?: boolean;
  onSelect: (id: string, shiftKey?: boolean) => Promise<void> | boolean;
  onDeselect: () => Promise<void> | void;
  onDragStart: (objectId: string) => boolean;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => Promise<void> | void;
  currentUserId?: string;
  users: Map<string, User>;
}

const Circle: React.FC<CircleProps> = ({
  circle,
  isSelected,
  isFilterPreview = false,
  onSelect,
  onDeselect,
  onDragStart,
  onDragMove,
  onDragEnd,
  currentUserId,
  users,
}) => {
  // Lock status logic
  const isLockedByCurrentUser = circle.lockedBy === currentUserId;
  const isLockedByOther = circle.lockedBy && circle.lockedBy !== currentUserId;
  const lockingUser = circle.lockedBy ? users.get(circle.lockedBy) : null;

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    
    if (isLockedByOther) {
      return; // Can't select shapes locked by others
    }
    
    const shiftKey = e.evt?.shiftKey || false;
    
    if (isSelected) {
      onDeselect();
    } else {
      onSelect(circle.id, shiftKey);
    }
  };

  const handleDragStart = () => {
    if (!isLockedByCurrentUser) {
      return false; // Prevent dragging if not locked by current user
    }
    return onDragStart(circle.id);
  };

  const handleDragMove = (e: any) => {
    if (!isLockedByCurrentUser) return;
    
    // Konva reports center position, which matches our data model for circles
    const centerX = e.target.x();
    const centerY = e.target.y();
    
    // Apply real-time visual correction for bounds (keep circle fully within canvas)
    const constrainedX = Math.max(circle.radius, Math.min(5000 - circle.radius, centerX));
    const constrainedY = Math.max(circle.radius, Math.min(5000 - circle.radius, centerY));
    
    // If position was constrained, update Konva's visual position
    if (centerX !== constrainedX || centerY !== constrainedY) {
      e.target.x(constrainedX);
      e.target.y(constrainedY);
    }
    
    // Send center coordinates (matches our data model)
    onDragMove(circle.id, constrainedX, constrainedY);
  };

  const handleDragEnd = (e: any) => {
    if (!isLockedByCurrentUser) return;
    
    // Konva reports center position, which matches our data model for circles
    const centerX = e.target.x();
    const centerY = e.target.y();
    
    onDragEnd(circle.id, centerX, centerY);
  };

  const handleMouseEnter = (e: any) => {
    const container = e.target.getStage().container();
    if (isLockedByOther) {
      container.style.cursor = 'not-allowed';
    } else {
      container.style.cursor = 'pointer';
    }
  };

  const handleMouseLeave = (e: any) => {
    const container = e.target.getStage().container();
    container.style.cursor = 'default';
  };

  // Determine circle appearance based on state
  let strokeColor = 'transparent';
  let strokeWidth = 0;
  let dash: number[] = [];
  let opacity = 1;

  if (isSelected && isLockedByCurrentUser) {
    strokeColor = '#0066cc';
    strokeWidth = 2;
  } else if (isLockedByOther) {
    strokeColor = '#ff6b6b';
    strokeWidth = 2;
    dash = [5, 5];
    opacity = 0.7;
  } else if (isLockedByCurrentUser && !isSelected) {
    strokeColor = '#00cc66';
    strokeWidth = 2;
    dash = [3, 3];
  }

  return (
    <Group>
      {/* Main circle */}
      <KonvaCircle
        x={circle.x} // Circle x,y now stores center position
        y={circle.y}
        radius={circle.radius}
        fill={circle.color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        dash={dash}
        opacity={opacity}
        rotation={circle.rotation}
        draggable={isLockedByCurrentUser}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Filter preview highlight (only show when object matches filter and not selected) */}
      {isFilterPreview && (
        <KonvaCircle
          x={circle.x}
          y={circle.y}
          radius={circle.radius + 2}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[6, 3]}
          listening={false}
        />
      )}

      {/* Lock indicator for objects locked by others */}
      {isLockedByOther && lockingUser && (
        <Group>
          {/* Username label */}
          <Text
            x={circle.x - 30}
            y={circle.y - circle.radius - 20}
            text={lockingUser.displayName}
            fontSize={12}
            fill="#fff"
            align="center"
            width={60}
            padding={4}
            backgroundColor="#ff6b6b"
            cornerRadius={4}
          />
        </Group>
      )}

      {/* Lock indicator for objects locked by current user */}
      {isLockedByCurrentUser && !isSelected && (
        <Group>
          {/* Editing indicator */}
          <Text
            x={circle.x - 15}
            y={circle.y - circle.radius - 20}
            text="✏️"
            fontSize={12}
            fill="#00cc66"
          />
        </Group>
      )}
    </Group>
  );
};

export default React.memo(Circle);
