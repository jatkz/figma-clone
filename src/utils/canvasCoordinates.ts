/**
 * Utility functions for coordinate transformations between screen/stage/canvas spaces
 */

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

/**
 * Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param viewport - Current viewport state (position and scale)
 * @returns Canvas coordinates { x, y }
 */
export function screenToCanvasCoords(
  screenX: number,
  screenY: number,
  viewport: ViewportState
): { x: number; y: number } {
  const canvasX = (screenX - viewport.x) / viewport.scale;
  const canvasY = (screenY - viewport.y) / viewport.scale;
  return { x: canvasX, y: canvasY };
}

/**
 * Convert stage coordinates to canvas coordinates for cursor tracking
 * Stage coordinates are already in the viewport space, so we use the same conversion
 * @param stageX - X coordinate in stage space
 * @param stageY - Y coordinate in stage space
 * @param viewport - Current viewport state (position and scale)
 * @returns Canvas coordinates { x, y }
 */
export function stageToCanvasCoords(
  stageX: number,
  stageY: number,
  viewport: ViewportState
): { x: number; y: number } {
  return screenToCanvasCoords(stageX, stageY, viewport);
}

/**
 * Convert canvas coordinates to screen coordinates
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param viewport - Current viewport state (position and scale)
 * @returns Screen coordinates { x, y }
 */
export function canvasToScreenCoords(
  canvasX: number,
  canvasY: number,
  viewport: ViewportState
): { x: number; y: number } {
  const screenX = canvasX * viewport.scale + viewport.x;
  const screenY = canvasY * viewport.scale + viewport.y;
  return { x: screenX, y: screenY };
}

