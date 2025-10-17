import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { CanvasObject } from '../../types/canvas';
import ResizeHandles, { type ResizeHandle } from '../ResizeHandles';
import RotationHandle from '../RotationHandle';

interface SelectionOverlayProps {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  currentUserId?: string;
  resizeDimensions: { x: number; y: number; width: number; height: number } | null;
  onResizeStart: (handle: ResizeHandle) => void;
  onResize: (handle: ResizeHandle, pointerX: number, pointerY: number, shiftKey: boolean) => void;
  onResizeEnd: () => void;
  onRotationStart: () => void;
  onRotation: (angle: number, shiftKey: boolean) => void;
  onRotationEnd: () => void;
}

/**
 * Renders selection-related overlays:
 * - Resize handles (single selection)
 * - Rotation handle (single selection)
 * - Dimension tooltip (during resize)
 * - Selection count badge (multi-select)
 */
const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  objects,
  selectedObjectIds,
  currentUserId,
  resizeDimensions,
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotationStart,
  onRotation,
  onRotationEnd
}) => {
  const selectedObject = React.useMemo(() => {
    if (selectedObjectIds.length === 1) {
      return objects.find(obj => obj.id === selectedObjectIds[0]);
    }
    return null;
  }, [objects, selectedObjectIds]);

  const canEdit = selectedObject && selectedObject.lockedBy === currentUserId;

  return (
    <>
      {/* Resize handles for selected object (only single selection) */}
      {canEdit && (
        <ResizeHandles
          object={selectedObject}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      )}

      {/* Rotation handle for selected object (only single selection) */}
      {canEdit && (
        <RotationHandle
          object={selectedObject}
          onRotationStart={onRotationStart}
          onRotation={onRotation}
          onRotationEnd={onRotationEnd}
        />
      )}

      {/* Dimension tooltip during resize */}
      {resizeDimensions && (
        <Group x={resizeDimensions.x} y={resizeDimensions.y}>
          <Rect
            x={-40}
            y={-15}
            width={80}
            height={30}
            fill="rgba(0, 0, 0, 0.8)"
            cornerRadius={4}
          />
          <Text
            x={-40}
            y={-10}
            width={80}
            height={20}
            text={`${resizeDimensions.width} × ${resizeDimensions.height}`}
            fontSize={12}
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </Group>
      )}

      {/* Selection count badge (multi-select visual feedback) */}
      {selectedObjectIds.length > 1 && (
        <Group x={20} y={20}>
          <Rect
            x={0}
            y={0}
            width={120}
            height={32}
            fill="rgba(123, 97, 255, 0.9)"
            cornerRadius={6}
            shadowColor="black"
            shadowBlur={4}
            shadowOpacity={0.3}
            shadowOffsetY={2}
          />
          <Text
            x={0}
            y={0}
            width={120}
            height={32}
            text={`${selectedObjectIds.length} objects`}
            fontSize={14}
            fontStyle="bold"
            fill="white"
            align="center"
            verticalAlign="middle"
          />
        </Group>
      )}
    </>
  );
};

export default SelectionOverlay;

