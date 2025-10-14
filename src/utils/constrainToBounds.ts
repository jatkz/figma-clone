/**
 * Utility function to constrain object positions to canvas boundaries
 * Ensures objects stay within the canvas bounds (0, 0) to (CANVAS_WIDTH, CANVAS_HEIGHT)
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types/canvas';

/**
 * Constrains an object's position to canvas boundaries
 * @param x - Current x position
 * @param y - Current y position  
 * @param width - Object width
 * @param height - Object height
 * @returns Constrained position that keeps object fully within canvas bounds
 */
export const constrainToBounds = (
  x: number, 
  y: number, 
  width: number, 
  height: number
) => ({
  x: Math.max(0, Math.min(x, CANVAS_WIDTH - width)),
  y: Math.max(0, Math.min(y, CANVAS_HEIGHT - height))
});

/**
 * Checks if an object position is within canvas boundaries
 * @param x - X position
 * @param y - Y position
 * @param width - Object width  
 * @param height - Object height
 * @returns True if object is fully within bounds
 */
export const isWithinBounds = (
  x: number,
  y: number, 
  width: number,
  height: number
): boolean => {
  return x >= 0 && y >= 0 && 
         x + width <= CANVAS_WIDTH && 
         y + height <= CANVAS_HEIGHT;
};
