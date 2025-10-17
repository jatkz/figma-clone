import type { CanvasObject } from '../types/canvas';
import { getShapeDimensions } from './shapeUtils';

/**
 * Alignment types
 */
export type AlignmentType = 
  | 'left' 
  | 'center-horizontal' 
  | 'right' 
  | 'top' 
  | 'center-vertical' 
  | 'bottom';

export type DistributionType = 
  | 'horizontal-edges' 
  | 'horizontal-centers' 
  | 'vertical-edges' 
  | 'vertical-centers';

/**
 * Get bounding box of all selected objects
 */
export function getSelectionBounds(objects: CanvasObject[]): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} {
  if (objects.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  objects.forEach(obj => {
    const dims = getShapeDimensions(obj);
    
    // For circles, x,y is the center
    if (obj.type === 'circle') {
      minX = Math.min(minX, obj.x - dims.width / 2);
      maxX = Math.max(maxX, obj.x + dims.width / 2);
      minY = Math.min(minY, obj.y - dims.height / 2);
      maxY = Math.max(maxY, obj.y + dims.height / 2);
    } else {
      // For rectangles and text, x,y is top-left
      minX = Math.min(minX, obj.x);
      maxX = Math.max(maxX, obj.x + dims.width);
      minY = Math.min(minY, obj.y);
      maxY = Math.max(maxY, obj.y + dims.height);
    }
  });

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2
  };
}

/**
 * Align objects horizontally or vertically
 * Returns updated positions for each object
 */
export function alignObjects(
  objects: CanvasObject[],
  alignmentType: AlignmentType
): Map<string, { x: number; y: number }> {
  if (objects.length < 2) {
    return new Map();
  }

  const bounds = getSelectionBounds(objects);
  const updates = new Map<string, { x: number; y: number }>();

  objects.forEach(obj => {
    const dims = getShapeDimensions(obj);
    let newX = obj.x;
    let newY = obj.y;

    switch (alignmentType) {
      case 'left':
        if (obj.type === 'circle') {
          newX = bounds.left + dims.width / 2;
        } else {
          newX = bounds.left;
        }
        break;

      case 'center-horizontal':
        if (obj.type === 'circle') {
          newX = bounds.centerX;
        } else {
          newX = bounds.centerX - dims.width / 2;
        }
        break;

      case 'right':
        if (obj.type === 'circle') {
          newX = bounds.right - dims.width / 2;
        } else {
          newX = bounds.right - dims.width;
        }
        break;

      case 'top':
        if (obj.type === 'circle') {
          newY = bounds.top + dims.height / 2;
        } else {
          newY = bounds.top;
        }
        break;

      case 'center-vertical':
        if (obj.type === 'circle') {
          newY = bounds.centerY;
        } else {
          newY = bounds.centerY - dims.height / 2;
        }
        break;

      case 'bottom':
        if (obj.type === 'circle') {
          newY = bounds.bottom - dims.height / 2;
        } else {
          newY = bounds.bottom - dims.height;
        }
        break;
    }

    updates.set(obj.id, { x: newX, y: newY });
  });

  return updates;
}

/**
 * Distribute objects with equal spacing
 * Returns updated positions for each object
 */
export function distributeObjects(
  objects: CanvasObject[],
  distributionType: DistributionType
): Map<string, { x: number; y: number }> {
  if (objects.length < 3) {
    return new Map(); // Need at least 3 objects to distribute
  }

  const updates = new Map<string, { x: number; y: number }>();

  // Sort objects by position
  let sortedObjects: CanvasObject[];
  
  if (distributionType.startsWith('horizontal')) {
    sortedObjects = [...objects].sort((a, b) => {
      const aCenterX = a.type === 'circle' ? a.x : a.x + getShapeDimensions(a).width / 2;
      const bCenterX = b.type === 'circle' ? b.x : b.x + getShapeDimensions(b).width / 2;
      return aCenterX - bCenterX;
    });
  } else {
    sortedObjects = [...objects].sort((a, b) => {
      const aCenterY = a.type === 'circle' ? a.y : a.y + getShapeDimensions(a).height / 2;
      const bCenterY = b.type === 'circle' ? b.y : b.y + getShapeDimensions(b).height / 2;
      return aCenterY - bCenterY;
    });
  }

  const first = sortedObjects[0];
  const last = sortedObjects[sortedObjects.length - 1];

  switch (distributionType) {
    case 'horizontal-centers': {
      const firstCenterX = first.type === 'circle' ? first.x : first.x + getShapeDimensions(first).width / 2;
      const lastCenterX = last.type === 'circle' ? last.x : last.x + getShapeDimensions(last).width / 2;
      const totalDistance = lastCenterX - firstCenterX;
      const spacing = totalDistance / (sortedObjects.length - 1);

      sortedObjects.forEach((obj, index) => {
        const dims = getShapeDimensions(obj);
        const targetCenterX = firstCenterX + spacing * index;
        const newX = obj.type === 'circle' ? targetCenterX : targetCenterX - dims.width / 2;
        updates.set(obj.id, { x: newX, y: obj.y });
      });
      break;
    }

    case 'vertical-centers': {
      const firstCenterY = first.type === 'circle' ? first.y : first.y + getShapeDimensions(first).height / 2;
      const lastCenterY = last.type === 'circle' ? last.y : last.y + getShapeDimensions(last).height / 2;
      const totalDistance = lastCenterY - firstCenterY;
      const spacing = totalDistance / (sortedObjects.length - 1);

      sortedObjects.forEach((obj, index) => {
        const dims = getShapeDimensions(obj);
        const targetCenterY = firstCenterY + spacing * index;
        const newY = obj.type === 'circle' ? targetCenterY : targetCenterY - dims.height / 2;
        updates.set(obj.id, { x: obj.x, y: newY });
      });
      break;
    }

    case 'horizontal-edges': {
      // Calculate total width of all objects
      let totalObjectWidth = 0;
      sortedObjects.forEach(obj => {
        totalObjectWidth += getShapeDimensions(obj).width;
      });

      // Get leftmost and rightmost edges
      const firstLeft = first.type === 'circle' 
        ? first.x - getShapeDimensions(first).width / 2 
        : first.x;
      const lastRight = last.type === 'circle'
        ? last.x + getShapeDimensions(last).width / 2
        : last.x + getShapeDimensions(last).width;

      const totalDistance = lastRight - firstLeft;
      const totalGapSpace = totalDistance - totalObjectWidth;
      const gapSpacing = totalGapSpace / (sortedObjects.length - 1);

      let currentX = firstLeft;
      sortedObjects.forEach(obj => {
        const dims = getShapeDimensions(obj);
        const newX = obj.type === 'circle' ? currentX + dims.width / 2 : currentX;
        updates.set(obj.id, { x: newX, y: obj.y });
        currentX += dims.width + gapSpacing;
      });
      break;
    }

    case 'vertical-edges': {
      // Calculate total height of all objects
      let totalObjectHeight = 0;
      sortedObjects.forEach(obj => {
        totalObjectHeight += getShapeDimensions(obj).height;
      });

      // Get topmost and bottommost edges
      const firstTop = first.type === 'circle'
        ? first.y - getShapeDimensions(first).height / 2
        : first.y;
      const lastBottom = last.type === 'circle'
        ? last.y + getShapeDimensions(last).height / 2
        : last.y + getShapeDimensions(last).height;

      const totalDistance = lastBottom - firstTop;
      const totalGapSpace = totalDistance - totalObjectHeight;
      const gapSpacing = totalGapSpace / (sortedObjects.length - 1);

      let currentY = firstTop;
      sortedObjects.forEach(obj => {
        const dims = getShapeDimensions(obj);
        const newY = obj.type === 'circle' ? currentY + dims.height / 2 : currentY;
        updates.set(obj.id, { x: obj.x, y: newY });
        currentY += dims.height + gapSpacing;
      });
      break;
    }
  }

  return updates;
}

/**
 * Align objects to canvas center or edges
 */
export function alignToCanvas(
  objects: CanvasObject[],
  canvasWidth: number,
  canvasHeight: number,
  alignmentType: 'center' | 'left' | 'right' | 'top' | 'bottom'
): Map<string, { x: number; y: number }> {
  if (objects.length === 0) {
    return new Map();
  }

  const bounds = getSelectionBounds(objects);
  const updates = new Map<string, { x: number; y: number }>();

  // Calculate offset needed to move selection to target position
  let offsetX = 0;
  let offsetY = 0;

  switch (alignmentType) {
    case 'center':
      offsetX = canvasWidth / 2 - bounds.centerX;
      offsetY = canvasHeight / 2 - bounds.centerY;
      break;
    case 'left':
      offsetX = 0 - bounds.left;
      break;
    case 'right':
      offsetX = canvasWidth - bounds.right;
      break;
    case 'top':
      offsetY = 0 - bounds.top;
      break;
    case 'bottom':
      offsetY = canvasHeight - bounds.bottom;
      break;
  }

  // Apply offset to all objects
  objects.forEach(obj => {
    updates.set(obj.id, {
      x: obj.x + offsetX,
      y: obj.y + offsetY
    });
  });

  return updates;
}

/**
 * Get human-readable name for alignment type
 */
export function getAlignmentName(type: AlignmentType | DistributionType): string {
  const names: Record<string, string> = {
    'left': 'Align Left',
    'center-horizontal': 'Center Horizontally',
    'right': 'Align Right',
    'top': 'Align Top',
    'center-vertical': 'Center Vertically',
    'bottom': 'Align Bottom',
    'horizontal-edges': 'Distribute Horizontally',
    'horizontal-centers': 'Distribute Centers Horizontally',
    'vertical-edges': 'Distribute Vertically',
    'vertical-centers': 'Distribute Centers Vertically'
  };
  return names[type] || type;
}

