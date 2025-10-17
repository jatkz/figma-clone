import type { CanvasObject } from '../types/canvas';
import { getShapeDimensions } from './shapeUtils';

/**
 * Point-in-Polygon detection using Ray Casting Algorithm
 * 
 * Determines if a point is inside a polygon defined by an array of coordinates.
 * Uses the ray casting algorithm: casts a ray from the point to infinity and counts
 * how many times it intersects the polygon boundary.
 * 
 * @param point - The point to test { x, y }
 * @param polygonPoints - Flat array of polygon coordinates [x1, y1, x2, y2, ...]
 * @returns true if point is inside polygon, false otherwise
 */
export function isPointInPolygon(
  point: { x: number; y: number },
  polygonPoints: number[]
): boolean {
  // Need at least 3 points to form a polygon (6 coordinates)
  if (polygonPoints.length < 6) {
    return false;
  }

  // Convert flat array to point pairs for easier processing
  const polygon: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < polygonPoints.length; i += 2) {
    polygon.push({ 
      x: polygonPoints[i], 
      y: polygonPoints[i + 1] 
    });
  }

  // Ray casting algorithm
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Check if ray from point intersects this edge
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Get the center point of a canvas object
 * 
 * @param object - The canvas object
 * @returns The center point { x, y }
 */
export function getObjectCenter(object: CanvasObject): { x: number; y: number } {
  if (object.type === 'circle') {
    // For circles, x and y are already the center
    return { x: object.x, y: object.y };
  } else {
    // For rectangles and text, x and y are top-left corner
    const dimensions = getShapeDimensions(object);
    return {
      x: object.x + dimensions.width / 2,
      y: object.y + dimensions.height / 2
    };
  }
}

/**
 * Check if a canvas object is inside a lasso polygon
 * Uses center point detection for simplicity and performance
 * 
 * @param object - The canvas object to test
 * @param lassoPoints - Flat array of lasso path coordinates [x1, y1, x2, y2, ...]
 * @returns true if object's center is inside the lasso
 */
export function isObjectInLasso(
  object: CanvasObject,
  lassoPoints: number[]
): boolean {
  const center = getObjectCenter(object);
  return isPointInPolygon(center, lassoPoints);
}

/**
 * Calculate the distance between two points
 * 
 * @param p1 - First point { x, y }
 * @param p2 - Second point { x, y }
 * @returns The Euclidean distance between the points
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if the lasso path is close enough to the starting point to close
 * 
 * @param lassoPoints - Flat array of lasso path coordinates [x1, y1, x2, y2, ...]
 * @param currentPoint - Current cursor position { x, y }
 * @param threshold - Distance threshold for closing (default: 20 pixels)
 * @returns true if current point is close enough to starting point
 */
export function shouldCloseLasso(
  lassoPoints: number[],
  currentPoint: { x: number; y: number },
  threshold: number = 20
): boolean {
  if (lassoPoints.length < 4) {
    return false; // Need at least 2 points
  }

  const startPoint = {
    x: lassoPoints[0],
    y: lassoPoints[1]
  };

  return distance(startPoint, currentPoint) <= threshold;
}

/**
 * Simplify a path by removing points that are too close together
 * Helps with performance by reducing the number of points to process
 * 
 * @param points - Flat array of path coordinates [x1, y1, x2, y2, ...]
 * @param minDistance - Minimum distance between points (default: 5 pixels)
 * @returns Simplified array of coordinates
 */
export function simplifyPath(
  points: number[],
  minDistance: number = 5
): number[] {
  if (points.length <= 2) {
    return points;
  }

  const simplified: number[] = [points[0], points[1]]; // Always keep first point

  for (let i = 2; i < points.length; i += 2) {
    const lastX = simplified[simplified.length - 2];
    const lastY = simplified[simplified.length - 1];
    const currentX = points[i];
    const currentY = points[i + 1];

    const dist = distance(
      { x: lastX, y: lastY },
      { x: currentX, y: currentY }
    );

    // Only add point if it's far enough from the last point
    if (dist >= minDistance) {
      simplified.push(currentX, currentY);
    }
  }

  return simplified;
}

