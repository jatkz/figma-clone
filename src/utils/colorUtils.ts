import type { CanvasObject } from '../types/canvas';

/**
 * RGB color representation
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 * 
 * @param hex - Hex color string (e.g., "#FF5733" or "#f57")
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-digit hex codes
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Convert RGB to hex color
 * 
 * @param rgb - RGB object with r, g, b values (0-255)
 * @returns Hex color string (e.g., "#FF5733")
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Calculate the distance between two colors in RGB space
 * Uses Euclidean distance formula
 * 
 * @param color1 - First color (hex string)
 * @param color2 - Second color (hex string)
 * @returns Distance value (0-441.67 for full RGB range)
 */
export function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Euclidean distance in RGB color space
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Check if two colors match within a given tolerance
 * 
 * @param color1 - First color (hex string)
 * @param color2 - Second color (hex string)
 * @param tolerance - Tolerance value (0-100)
 *                    0 = exact match only
 *                    50 = moderate tolerance
 *                    100 = very loose matching
 * @returns true if colors match within tolerance
 */
export function colorsMatch(color1: string, color2: string, tolerance: number = 0): boolean {
  // Tolerance 0 = exact match
  if (tolerance === 0) {
    return color1.toUpperCase() === color2.toUpperCase();
  }
  
  // Calculate distance and compare to threshold
  // Map tolerance (0-100) to RGB distance threshold (0-441.67)
  // At tolerance 100, allow maximum distance
  const maxDistance = 441.67; // sqrt(255^2 + 255^2 + 255^2)
  const threshold = (tolerance / 100) * maxDistance;
  
  const distance = colorDistance(color1, color2);
  return distance <= threshold;
}

/**
 * Find all objects with matching color
 * 
 * @param objects - Array of canvas objects
 * @param targetColor - Color to match (hex string)
 * @param tolerance - Tolerance value (0-100)
 * @returns Array of objects with matching colors
 */
export function findObjectsByColor(
  objects: CanvasObject[],
  targetColor: string,
  tolerance: number = 0
): CanvasObject[] {
  return objects.filter(obj => colorsMatch(obj.color, targetColor, tolerance));
}

/**
 * Get unique colors from an array of objects
 * 
 * @param objects - Array of canvas objects
 * @returns Array of unique hex color strings
 */
export function getUniqueColors(objects: CanvasObject[]): string[] {
  const colorSet = new Set<string>();
  objects.forEach(obj => colorSet.add(obj.color.toUpperCase()));
  return Array.from(colorSet);
}

/**
 * Get color statistics from objects
 * 
 * @param objects - Array of canvas objects
 * @returns Map of color to count
 */
export function getColorStatistics(objects: CanvasObject[]): Map<string, number> {
  const colorMap = new Map<string, number>();
  
  objects.forEach(obj => {
    const color = obj.color.toUpperCase();
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  });
  
  return colorMap;
}

