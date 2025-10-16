/**
 * Shape utility functions to handle different object types consistently
 */

import type { CanvasObject, RectangleObject, CircleObject, TextObject } from '../types/canvas';

/**
 * Get the width of any shape object
 */
export const getShapeWidth = (shape: CanvasObject): number => {
  switch (shape.type) {
    case 'rectangle':
      return shape.width;
    case 'circle':
      return shape.radius * 2;
    case 'text':
      return shape.width || 100;
    default:
      return 100;
  }
};

/**
 * Get the height of any shape object
 */
export const getShapeHeight = (shape: CanvasObject): number => {
  switch (shape.type) {
    case 'rectangle':
      return shape.height;
    case 'circle':
      return shape.radius * 2;
    case 'text':
      return shape.height || 20;
    default:
      return 100;
  }
};

/**
 * Get both width and height as an object
 */
export const getShapeDimensions = (shape: CanvasObject): { width: number; height: number } => {
  return {
    width: getShapeWidth(shape),
    height: getShapeHeight(shape),
  };
};

/**
 * Get the bounding box of a shape (x, y, width, height)
 * Returns top-left corner coordinates for all shapes
 */
export const getShapeBounds = (shape: CanvasObject): { x: number; y: number; width: number; height: number } => {
  const dimensions = getShapeDimensions(shape);
  
  if (shape.type === 'circle') {
    // Circle stores center position, convert to top-left of bounding box
    return {
      x: shape.x - shape.radius,
      y: shape.y - shape.radius,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
  
  // Rectangles and text store top-left position
  return {
    x: shape.x,
    y: shape.y,
    width: dimensions.width,
    height: dimensions.height,
  };
};

/**
 * Check if a point is inside a shape's bounds
 */
export const isPointInShape = (shape: CanvasObject, x: number, y: number): boolean => {
  const bounds = getShapeBounds(shape);
  
  switch (shape.type) {
    case 'rectangle':
    case 'text':
      // Rectangle hit test
      return x >= bounds.x && x <= bounds.x + bounds.width &&
             y >= bounds.y && y <= bounds.y + bounds.height;
             
    case 'circle':
      // Circle hit test - check distance from center
      // Circle x,y is already the center position
      const distance = Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2));
      return distance <= shape.radius;
      
    default:
      return false;
  }
};

/**
 * Get the center point of any shape
 */
export const getShapeCenter = (shape: CanvasObject): { x: number; y: number } => {
  const dimensions = getShapeDimensions(shape);
  
  switch (shape.type) {
    case 'circle':
      // Circle x,y is already the center position
      return {
        x: shape.x,
        y: shape.y,
      };
    default:
      // Rectangles and text use top-left positioning
      return {
        x: shape.x + dimensions.width / 2,
        y: shape.y + dimensions.height / 2,
      };
  }
};

/**
 * Calculate the area of any shape (useful for sorting/arrangement)
 */
export const getShapeArea = (shape: CanvasObject): number => {
  switch (shape.type) {
    case 'rectangle':
    case 'text':
      const dimensions = getShapeDimensions(shape);
      return dimensions.width * dimensions.height;
    case 'circle':
      return Math.PI * shape.radius * shape.radius;
    default:
      return 0;
  }
};

/**
 * Type guard functions
 */
export const isRectangle = (shape: CanvasObject): shape is RectangleObject => {
  return shape.type === 'rectangle';
};

export const isCircle = (shape: CanvasObject): shape is CircleObject => {
  return shape.type === 'circle';
};

export const isText = (shape: CanvasObject): shape is TextObject => {
  return shape.type === 'text';
};
