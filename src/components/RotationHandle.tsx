import React, { useState } from 'react';
import { Circle, Line, Group, Text, Rect } from 'react-konva';
import type { CanvasObject } from '../types/canvas';
import { getShapeBounds } from '../utils/shapeUtils';

interface RotationHandleProps {
  object: CanvasObject;
  onRotationStart: () => void;
  onRotation: (angle: number, shiftKey: boolean) => void;
  onRotationEnd: () => void;
}

const HANDLE_RADIUS = 6;
const HANDLE_COLOR = '#007AFF';
const HANDLE_STROKE_COLOR = '#FFFFFF';
const LINE_COLOR = '#007AFF';
const HANDLE_DISTANCE = 30; // Distance above object

const RotationHandle: React.FC<RotationHandleProps> = ({
  object,
  onRotationStart,
  onRotation,
  onRotationEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);

  // Get the bounding box of the object
  const bounds = getShapeBounds(object);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  // Handle is positioned above the top center
  const handleX = centerX;
  const handleY = bounds.y - HANDLE_DISTANCE;

  const handleMouseDown = (e: any) => {
    e.cancelBubble = true;
    setIsDragging(true);
    onRotationStart();

    const stage = e.target.getStage();

    const handleMouseMove = (e: MouseEvent) => {
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Convert to canvas coordinates
      const scale = stage.scaleX();
      const stagePos = stage.position();
      const canvasX = (pointerPos.x - stagePos.x) / scale;
      const canvasY = (pointerPos.y - stagePos.y) / scale;

      // Calculate angle from center to cursor
      const dx = canvasX - centerX;
      const dy = canvasY - centerY;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 to make 0° point up

      // Normalize to 0-360
      if (angle < 0) angle += 360;

      // Check for shift key (snap to 15° increments)
      const shiftKey = (e as any).shiftKey || false;
      if (shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }

      setCurrentAngle(Math.round(angle));
      onRotation(angle, shiftKey);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setCurrentAngle(null);
      onRotationEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Group>
      {/* Line connecting handle to object */}
      <Line
        points={[centerX, bounds.y, handleX, handleY]}
        stroke={LINE_COLOR}
        strokeWidth={1}
        dash={[3, 3]}
      />

      {/* Rotation handle circle */}
      <Circle
        x={handleX}
        y={handleY}
        radius={HANDLE_RADIUS}
        fill={isDragging ? '#0051D5' : HANDLE_COLOR}
        stroke={HANDLE_STROKE_COLOR}
        strokeWidth={2}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            const container = stage.container();
            container.style.cursor = 'grab';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            const container = stage.container();
            container.style.cursor = 'default';
          }
        }}
      />

      {/* Angle tooltip during rotation */}
      {isDragging && currentAngle !== null && (
        <Group x={handleX} y={handleY - 25}>
          <Rect
            x={-25}
            y={-12}
            width={50}
            height={24}
            fill="rgba(0, 0, 0, 0.8)"
            cornerRadius={4}
          />
          <Text
            x={-25}
            y={-8}
            width={50}
            height={16}
            text={`${currentAngle}°`}
            fontSize={12}
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </Group>
      )}
    </Group>
  );
};

export default RotationHandle;

