import type { CanvasObject } from '../types/canvas';
import type { SnapSettings, SnapResult, SnapGuide } from '../types/snap';

/**
 * Snap position to grid
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

/**
 * Snap to other objects (smart guides)
 */
export function snapToObjects(
  x: number,
  y: number,
  width: number,
  height: number,
  objects: CanvasObject[],
  currentObjectId: string,
  threshold: number = 5
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const guides: SnapGuide[] = [];
  let hasSnappedX = false;
  let hasSnappedY = false;

  // Calculate current object bounds
  const currentLeft = x;
  const currentRight = x + width;
  const currentTop = y;
  const currentBottom = y + height;
  const currentCenterX = x + width / 2;
  const currentCenterY = y + height / 2;

  // Filter to nearby objects for performance
  const nearbyObjects = objects.filter(obj => {
    if (obj.id === currentObjectId) return false;
    
    // Simple distance check (within 500px)
    const objWidth = 'width' in obj && obj.width ? obj.width : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
    const objHeight = 'height' in obj && obj.height ? obj.height : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
    const objCenterX = obj.x + objWidth / 2;
    const objCenterY = obj.y + objHeight / 2;
    
    const distance = Math.sqrt(
      Math.pow(currentCenterX - objCenterX, 2) + Math.pow(currentCenterY - objCenterY, 2)
    );
    
    return distance < 500;
  });

  // Check against nearby objects
  for (const obj of nearbyObjects) {
    // Calculate target object bounds
    const targetWidth = 'width' in obj && obj.width ? obj.width : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
    const targetHeight = 'height' in obj && obj.height ? obj.height : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
    const targetLeft = obj.x;
    const targetRight = obj.x + targetWidth;
    const targetTop = obj.y;
    const targetBottom = obj.y + targetHeight;
    const targetCenterX = obj.x + targetWidth / 2;
    const targetCenterY = obj.y + targetHeight / 2;

    // Snap X axis (vertical guides)
    if (!hasSnappedX) {
      // Left to left
      if (Math.abs(currentLeft - targetLeft) < threshold) {
        snappedX = targetLeft;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetLeft,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'left',
        });
      }
      // Right to right
      else if (Math.abs(currentRight - targetRight) < threshold) {
        snappedX = targetRight - width;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetRight,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'right',
        });
      }
      // Left to right
      else if (Math.abs(currentLeft - targetRight) < threshold) {
        snappedX = targetRight;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetRight,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'left',
        });
      }
      // Right to left
      else if (Math.abs(currentRight - targetLeft) < threshold) {
        snappedX = targetLeft - width;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetLeft,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'right',
        });
      }
      // Center to center (X)
      else if (Math.abs(currentCenterX - targetCenterX) < threshold) {
        snappedX = targetCenterX - width / 2;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetCenterX,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'centerX',
        });
      }
    }

    // Snap Y axis (horizontal guides)
    if (!hasSnappedY) {
      // Top to top
      if (Math.abs(currentTop - targetTop) < threshold) {
        snappedY = targetTop;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetTop,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'top',
        });
      }
      // Bottom to bottom
      else if (Math.abs(currentBottom - targetBottom) < threshold) {
        snappedY = targetBottom - height;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetBottom,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'bottom',
        });
      }
      // Top to bottom
      else if (Math.abs(currentTop - targetBottom) < threshold) {
        snappedY = targetBottom;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetBottom,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'top',
        });
      }
      // Bottom to top
      else if (Math.abs(currentBottom - targetTop) < threshold) {
        snappedY = targetTop - height;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetTop,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'bottom',
        });
      }
      // Center to center (Y)
      else if (Math.abs(currentCenterY - targetCenterY) < threshold) {
        snappedY = targetCenterY - height / 2;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetCenterY,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'centerY',
        });
      }
    }

    // Exit early if both axes snapped
    if (hasSnappedX && hasSnappedY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
    guides,
  };
}

/**
 * Apply snapping based on settings
 */
export function applySnapping(
  x: number,
  y: number,
  width: number,
  height: number,
  objects: CanvasObject[],
  currentObjectId: string,
  settings: SnapSettings,
  modifierKeyPressed: boolean // Cmd/Ctrl to temporarily disable
): SnapResult {
  // Modifier key inverts snapping behavior
  const snapEnabled = modifierKeyPressed ? !settings.gridEnabled : settings.gridEnabled;
  const guidesEnabled = modifierKeyPressed ? !settings.smartGuidesEnabled : settings.smartGuidesEnabled;

  let result: SnapResult = {
    x,
    y,
    snappedX: false,
    snappedY: false,
    guides: [],
  };

  // Try smart guides first (more precise)
  if (guidesEnabled) {
    result = snapToObjects(x, y, width, height, objects, currentObjectId, settings.snapThreshold);
  }

  // Fall back to grid if no smart guide snap
  if (snapEnabled && !result.snappedX && !result.snappedY) {
    const gridSnap = snapToGrid(x, y, settings.gridSize);
    result.x = gridSnap.x;
    result.y = gridSnap.y;
  }

  return result;
}

