import React from 'react';
import type { CanvasObject } from '../../types/canvas';
import Rectangle from '../Rectangle';
import CircleComponent from '../Circle';
import TextObjectComponent from '../TextObject';

interface CanvasObjectsProps {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  filterPreviewIds: string[];
  editingTextId: string | null;
  currentUserId?: string;
  onRectangleClick: (objectId: string, shiftKey?: boolean) => Promise<void>;
  onDeselect: () => Promise<void>;
  onDragStart: (objectId: string) => boolean;
  onDragMove: (objectId: string, x: number, y: number) => void;
  onDragEnd: (objectId: string, x: number, y: number) => Promise<void> | void;
  onStartTextEdit: (textObjectId: string) => boolean;
}

/**
 * Renders all canvas objects (rectangles, circles, text)
 * Objects are sorted by type to ensure text appears on top
 */
const CanvasObjects: React.FC<CanvasObjectsProps> = ({
  objects,
  selectedObjectIds,
  filterPreviewIds,
  editingTextId,
  currentUserId,
  onRectangleClick,
  onDeselect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onStartTextEdit
}) => {
  // Sort objects by type: rectangles first, circles second, text last
  // This ensures text appears on top of other objects
  const sortedObjects = React.useMemo(() => {
    return [...objects].sort((a, b) => {
      const typeOrder = { rectangle: 0, circle: 1, text: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }, [objects]);

  // Build user map for displaying user info
  const userMap = React.useMemo(() => {
    const map = new Map();
    if (currentUserId) {
      map.set(currentUserId, {
        displayName: 'You',
        cursorColor: '#007AFF'
      });
    }
    return map;
  }, [currentUserId]);

  return (
    <>
      {sortedObjects.map(object => {
        const sharedProps = {
          isSelected: selectedObjectIds.includes(object.id),
          isFilterPreview: filterPreviewIds.includes(object.id) && !selectedObjectIds.includes(object.id),
          onSelect: onRectangleClick,
          onDeselect,
          onDragStart,
          onDragMove,
          onDragEnd,
          currentUserId,
          users: userMap,
        };

        switch (object.type) {
          case 'rectangle':
            return (
              <Rectangle
                key={object.id}
                {...sharedProps}
                object={object}
                onClick={onRectangleClick}
              />
            );
          case 'circle':
            return (
              <CircleComponent
                key={object.id}
                {...sharedProps}
                circle={object}
              />
            );
          case 'text':
            return (
              <TextObjectComponent
                key={object.id}
                {...sharedProps}
                textObject={object}
                isEditing={editingTextId === object.id}
                onStartEdit={onStartTextEdit}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default CanvasObjects;

