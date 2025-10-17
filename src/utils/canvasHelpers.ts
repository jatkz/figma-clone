/**
 * Helper utilities for canvas operations
 */

import type { ToolType } from '../components/ToolPanel';

/**
 * Get the appropriate cursor style based on the active tool
 * @param activeTool - The currently active tool
 * @param isPanning - Whether the canvas is currently in pan mode
 * @param isSpacePressed - Whether the space key is pressed (pan modifier)
 * @returns CSS cursor value
 */
export function getCanvasCursor(
  activeTool: ToolType,
  isPanning: boolean,
  isSpacePressed: boolean
): string {
  // Pan mode takes precedence
  if (isSpacePressed || isPanning) {
    return isPanning ? 'grabbing' : 'grab';
  }

  // Tool-specific cursors
  switch (activeTool) {
    case 'select':
      return 'default';
    case 'rectangle':
    case 'circle':
    case 'text':
      return 'crosshair';
    case 'lasso':
      return 'crosshair';
    case 'magic-wand':
      return 'pointer';
    default:
      return 'default';
  }
}

/**
 * Check if a keyboard event should be ignored (e.g., during text editing)
 * @param isTextEditing - Whether text is currently being edited
 * @param targetTagName - The tag name of the event target element
 * @returns Whether the keyboard event should be ignored
 */
export function shouldIgnoreKeyboardEvent(
  isTextEditing: boolean,
  targetTagName: string
): boolean {
  return isTextEditing || targetTagName === 'INPUT' || targetTagName === 'TEXTAREA';
}

/**
 * Calculate the distance between two points
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @returns Distance between the two points
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Check if a point is within canvas bounds
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @returns Whether the point is within bounds
 */
export function isWithinBounds(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  return x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight;
}

