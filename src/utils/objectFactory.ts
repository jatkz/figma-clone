import { CURSOR_COLORS } from './colors';
import type { CanvasObject } from '../types/canvas';

export const createRectangle = (x: number, y: number, userId: string): Omit<CanvasObject, 'id'> => {
  // Constrain to boundaries - leave room for 100px width/height
  const constrainedX = Math.max(0, Math.min(x, 4900)); 
  const constrainedY = Math.max(0, Math.min(y, 4900)); 
  
  return {
    type: 'rectangle' as const,
    x: constrainedX,
    y: constrainedY,
    width: 100,
    height: 100,
    color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
    rotation: 0,
    createdBy: userId,
    modifiedBy: userId,
    lockedBy: null,
    lockedAt: null,
    version: 1
  };
};

// Generate temporary ID for optimistic updates
export const generateTempId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Check if position is within canvas boundaries
export const isWithinCanvasBounds = (x: number, y: number, width = 100, height = 100): boolean => {
  return x >= 0 && y >= 0 && (x + width) <= 5000 && (y + height) <= 5000;
};
