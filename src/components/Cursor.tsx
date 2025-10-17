import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { CursorData } from '../services/canvasService';

interface CursorProps {
  cursorData: CursorData;
  userId: string;
}

const Cursor: React.FC<CursorProps> = ({ cursorData }) => {
  const { x, y, name, color } = cursorData;

  return (
    <Group
      x={x}
      y={y}
      listening={false} // Cursors shouldn't intercept events
    >
      {/* Cursor dot/circle */}
      <Circle
        x={0}
        y={0}
        radius={6}
        fill={color}
        stroke="white"
        strokeWidth={2}
        shadowBlur={4}
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowOffsetY={2}
        listening={false}
      />

      {/* Username label */}
      <Group x={12} y={-8}>
        {/* Label background */}
        <Text
          text={name}
          fontSize={12}
          fontFamily="Inter, -apple-system, sans-serif"
          fontStyle="600"
          fill="white"
          padding={6}
          cornerRadius={4}
          listening={false}
          // Create background effect by rendering text twice
          stroke={color}
          strokeWidth={16}
          lineJoin="round"
        />
        
        {/* Foreground text */}
        <Text
          text={name}
          fontSize={12}
          fontFamily="Inter, -apple-system, sans-serif"
          fontStyle="600"
          fill="white"
          padding={6}
          listening={false}
        />
      </Group>

      {/* Small triangle pointer connecting cursor to label */}
      <Group x={8} y={-2}>
        <Text
          text="▶"
          fontSize={8}
          fill={color}
          listening={false}
          rotation={-45}
        />
      </Group>
    </Group>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
// Only re-render if cursor position, name, or color changes
export default React.memo(Cursor, (prevProps, nextProps) => {
  return (
    prevProps.cursorData.x === nextProps.cursorData.x &&
    prevProps.cursorData.y === nextProps.cursorData.y &&
    prevProps.cursorData.name === nextProps.cursorData.name &&
    prevProps.cursorData.color === nextProps.cursorData.color
  );
});
