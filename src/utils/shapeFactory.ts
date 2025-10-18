import type { RectangleObject, CircleObject, TextObject } from '../types/canvas';
import { getRandomColor } from './colors';

/**
 * Generate a temporary ID for new objects (before RTDB assigns real ID)
 * Note: This is only used for object duplication. New objects get RTDB keys directly.
 */
export const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new rectangle object
 */
export const createNewRectangle = (x: number, y: number, userId: string): RectangleObject => {
  return {
    id: generateTempId(),
    type: 'rectangle',
    x: Math.max(0, Math.min(4900, x)),
    y: Math.max(0, Math.min(4900, y)),
    width: 100,
    height: 100,
    color: getRandomColor(),
    rotation: 0,
    createdBy: userId,
    modifiedBy: userId,
    lockedBy: null,
    lockedAt: null,
    version: 1,
  };
};

/**
 * Create a new circle object
 * Note: x, y represent the CENTER of the circle
 */
export const createNewCircle = (x: number, y: number, userId: string, radius = 50): CircleObject => {
  return {
    id: generateTempId(),
    type: 'circle',
    // Circle x,y is center position - constrain so circle stays within canvas
    x: Math.max(radius, Math.min(5000 - radius, x)),
    y: Math.max(radius, Math.min(5000 - radius, y)),
    radius,
    color: getRandomColor(),
    rotation: 0,
    createdBy: userId,
    modifiedBy: userId,
    lockedBy: null,
    lockedAt: null,
    version: 1,
  };
};

/**
 * Create a new text object
 */
export const createNewText = (
  x: number, 
  y: number, 
  userId: string, 
  text = 'Sample Text',
  fontSize = 16
): Omit<TextObject, 'id'> => {
  const textWidth = text.length * fontSize * 0.6;
  const textHeight = fontSize * 1.2;
  const color = getRandomColor();
  
  return {
    type: 'text',
    x: Math.max(0, Math.min(5000 - textWidth, x)),
    y: Math.max(0, Math.min(5000 - textHeight, y)),
    text,
    fontSize,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    textColor: color, // Use same color as base color
    backgroundColor: 'transparent',
    width: textWidth,
    height: textHeight,
    color,
    rotation: 0,
    createdBy: userId,
    modifiedBy: userId,
    lockedBy: null,
    lockedAt: null,
    version: 1,
  };
};

/**
 * Check if coordinates are within canvas bounds
 */
export const isWithinCanvasBounds = (
  x: number, 
  y: number, 
  width = 0, 
  height = 0
): boolean => {
  return x >= 0 && y >= 0 && 
         (x + width) <= 5000 && 
         (y + height) <= 5000;
};
