import React, { useCallback } from 'react';
import { Text as KonvaText, Group, Rect } from 'react-konva';
import type { TextObject, User } from '../types/canvas';

interface TextObjectProps {
  textObject: TextObject;
  isSelected: boolean;
  isEditing: boolean;
  isFilterPreview?: boolean;
  onSelect: (id: string, shiftKey?: boolean) => Promise<void> | boolean;
  onDeselect: () => Promise<void> | void;
  onDragStart: (objectId: string) => boolean;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => Promise<void> | void;
  onStartEdit: (id: string) => boolean;
  currentUserId?: string;
  users: Map<string, User>;
}

const TextObjectComponent: React.FC<TextObjectProps> = ({
  textObject,
  isSelected,
  isEditing,
  isFilterPreview = false,
  onSelect,
  onDeselect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStartEdit,
  currentUserId,
  users,
}) => {
  // Lock status logic
  const isLockedByCurrentUser = textObject.lockedBy === currentUserId;
  const isLockedByOther = textObject.lockedBy && textObject.lockedBy !== currentUserId;
  const lockingUser = textObject.lockedBy ? users.get(textObject.lockedBy) : null;

  // Calculate text dimensions
  const textWidth = textObject.width || textObject.text.length * textObject.fontSize * 0.6;
  const textHeight = textObject.height || textObject.fontSize * 1.2;

  // Handle double-click to enter edit mode
  const handleDoubleClick = useCallback((e: any) => {
    e.cancelBubble = true;
    
    if (isLockedByOther) {
      return; // Can't edit text locked by others
    }
    
    // Try to enter edit mode
    onStartEdit(textObject.id);
  }, [isLockedByOther, onStartEdit, textObject.id]);

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    
    if (isLockedByOther) {
      return; // Can't select shapes locked by others
    }
    
    const shiftKey = e.evt?.shiftKey || false;
    
    if (isSelected) {
      onDeselect();
    } else {
      onSelect(textObject.id, shiftKey);
    }
  };

  const handleDragStart = () => {
    if (!isLockedByCurrentUser) {
      return false; // Prevent dragging if not locked by current user
    }
    return onDragStart(textObject.id);
  };

  const handleDragMove = (e: any) => {
    if (!isLockedByCurrentUser) return;
    
    const x = e.target.x();
    const y = e.target.y();
    
    // Apply real-time visual correction for bounds
    const constrainedX = Math.max(0, Math.min(5000 - textWidth, x));
    const constrainedY = Math.max(0, Math.min(5000 - textHeight, y));
    
    if (x !== constrainedX || y !== constrainedY) {
      e.target.x(constrainedX);
      e.target.y(constrainedY);
    }
    
    onDragMove(textObject.id, constrainedX, constrainedY);
  };

  const handleDragEnd = (e: any) => {
    if (!isLockedByCurrentUser) return;
    
    const x = e.target.x();
    const y = e.target.y();
    onDragEnd(textObject.id, x, y);
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

  // Determine text appearance based on state
  let strokeColor = 'transparent';
  let strokeWidth = 0;
  let dash: number[] = [];
  let opacity = 1;
  let showBackground = false;

  if (isSelected && isLockedByCurrentUser) {
    strokeColor = '#0066cc';
    strokeWidth = 2;
    showBackground = true;
  } else if (isLockedByOther) {
    strokeColor = '#ff6b6b';
    strokeWidth = 2;
    dash = [5, 5];
    opacity = 0.7;
    showBackground = true;
  } else if (isLockedByCurrentUser && !isSelected) {
    strokeColor = '#00cc66';
    strokeWidth = 2;
    dash = [3, 3];
    showBackground = true;
  }

  return (
    <Group>
      {/* Background color rectangle (behind text) */}
      {textObject.backgroundColor && textObject.backgroundColor !== 'transparent' && (
        <Rect
          x={textObject.x}
          y={textObject.y}
          width={textWidth}
          height={textHeight}
          fill={textObject.backgroundColor}
          rotation={textObject.rotation}
          listening={false}
        />
      )}

      {/* Background rectangle for selection/lock indication */}
      {showBackground && (
        <Rect
          x={textObject.x - 4}
          y={textObject.y - 4}
          width={textWidth + 8}
          height={textHeight + 8}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          opacity={opacity}
          rotation={textObject.rotation}
          draggable={isLockedByCurrentUser}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Main text */}
      <KonvaText
        x={textObject.x}
        y={textObject.y}
        text={textObject.text}
        fontSize={textObject.fontSize}
        fontFamily={textObject.fontFamily || 'Arial, sans-serif'}
        fontStyle={textObject.fontStyle || 'normal'}
        fontVariant={textObject.fontWeight || 'normal'}
        textDecoration={textObject.textDecoration || 'none'}
        fill={textObject.textColor || textObject.color}
        align={textObject.textAlign || 'left'}
        width={textObject.width}
        height={textObject.height}
        rotation={textObject.rotation}
        opacity={isEditing ? 0.3 : opacity}
        draggable={isLockedByCurrentUser && !isEditing}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Filter preview highlight (only show when object matches filter and not selected) */}
      {isFilterPreview && (
        <Rect
          x={textObject.x - 4}
          y={textObject.y - 4}
          width={textWidth + 8}
          height={textHeight + 8}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[6, 3]}
          rotation={textObject.rotation}
          listening={false}
        />
      )}

      {/* Lock indicator for objects locked by others */}
      {isLockedByOther && lockingUser && (
        <Group>
          {/* Username label */}
          <KonvaText
            x={textObject.x}
            y={textObject.y - 25}
            text={lockingUser.displayName}
            fontSize={12}
            fill="#fff"
            align="center"
            width={Math.max(textWidth, 60)}
            padding={4}
            backgroundColor="#ff6b6b"
          />
        </Group>
      )}

      {/* Lock indicator for objects locked by current user */}
      {isLockedByCurrentUser && !isSelected && !isEditing && (
        <Group>
          {/* Editing indicator */}
          <KonvaText
            x={textObject.x + textWidth + 5}
            y={textObject.y - 5}
            text="✏️"
            fontSize={12}
            fill="#00cc66"
          />
        </Group>
      )}
    </Group>
  );
};

export default React.memo(TextObjectComponent);
