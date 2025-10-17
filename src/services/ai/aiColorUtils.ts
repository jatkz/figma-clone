/**
 * AI Color Utilities
 * Handles color name mapping, normalization, and matching for AI operations
 */

/**
 * Color name to hex code mapping
 * Maps common color names to their hex codes for better matching
 */
export const COLOR_NAME_MAP: Record<string, string[]> = {
  // Black and white
  'black': ['#000000', '#000'],
  'white': ['#FFFFFF', '#FFF'],
  
  // Primary colors (matching generateRandomColor exactly)
  'red': ['#FF0000', '#F00', '#FF6B6B', '#E74C3C', '#C0392B'],
  'green': ['#00FF00', '#0F0', '#52C78C', '#2ECC71', '#27AE60', '#52B788', '#98D8C8'],
  'blue': ['#0000FF', '#00F', '#45B7D1', '#3498DB', '#2980B9', '#85C1E2'],
  
  // Secondary colors (matching generateRandomColor exactly)
  'yellow': ['#FFFF00', '#FF0', '#F7DC6F', '#F1C40F', '#F39C12', '#F8B739'],
  'orange': ['#FFA500', '#FFA07A', '#E67E22', '#D35400'],
  'purple': ['#800080', '#BB8FCE', '#9B59B6', '#8E44AD'],
  'pink': ['#FFC0CB', '#FF69B4', '#E91E63'],
  
  // Tertiary colors (matching generateRandomColor exactly)
  'cyan': ['#00FFFF', '#0FF', '#4ECDC4', '#1ABC9C', '#16A085'],
  'teal': ['#008080', '#4ECDC4', '#1ABC9C'],
  'turquoise': ['#40E0D0', '#4ECDC4'],
  'magenta': ['#FF00FF', '#F0F'],
  'lime': ['#00FF00', '#0F0'],
  
  // Grays
  'gray': ['#808080', '#GRAY', '#GREY', '#A9A9A9', '#D3D3D3'],
  'grey': ['#808080', '#GRAY', '#GREY', '#A9A9A9', '#D3D3D3'],
  'silver': ['#C0C0C0'],
  
  // Browns
  'brown': ['#A52A2A', '#8B4513', '#D2691E'],
};

/**
 * Normalize a color to lowercase hex format for comparison
 * @param color - Color string to normalize
 * @returns Normalized color string (lowercase, trimmed)
 */
export const normalizeColor = (color: string): string => {
  return color.toLowerCase().trim();
};

/**
 * Convert hex color to human-readable color name (for display purposes)
 * @param hexColor - Hex color code (e.g., "#FF6B6B")
 * @returns Color name (e.g., "red") or the original hex if no match
 */
export const hexToColorName = (hexColor: string): string => {
  const normalized = normalizeColor(hexColor);
  
  for (const [colorName, hexCodes] of Object.entries(COLOR_NAME_MAP)) {
    if (hexCodes.some(hex => normalizeColor(hex) === normalized)) {
      return colorName;
    }
  }
  
  // Return hex if no color name found
  return hexColor;
};

/**
 * Check if a color matches a color name or hex code
 * @param objectColor - The hex color of the object (e.g., "#FF6B6B")
 * @param searchTerm - The search term (e.g., "red" or "#ff0000")
 * @returns true if they match
 */
export const colorsMatch = (objectColor: string, searchTerm: string): boolean => {
  const normalizedObjectColor = normalizeColor(objectColor);
  const normalizedSearch = normalizeColor(searchTerm);
  
  console.log(`  🎨 [colorsMatch] Checking: object="${objectColor}" (normalized: "${normalizedObjectColor}") vs search="${searchTerm}" (normalized: "${normalizedSearch}")`);
  
  // Direct match (e.g., "#ff0000" matches "#ff0000")
  if (normalizedObjectColor === normalizedSearch) {
    console.log(`    ✅ Direct hex match!`);
    return true;
  }
  
  // Check if search term is a color name
  for (const [colorName, hexCodes] of Object.entries(COLOR_NAME_MAP)) {
    if (normalizedSearch.includes(colorName)) {
      console.log(`    🔍 Search includes color name: "${colorName}"`);
      console.log(`    📋 Checking against hex codes:`, hexCodes);
      const matches = hexCodes.some(hex => normalizedObjectColor === normalizeColor(hex));
      if (matches) {
        console.log(`    ✅ COLOR MATCH! "${objectColor}" matches color name "${colorName}"`);
        return true;
      } else {
        console.log(`    ❌ No match for "${colorName}"`);
      }
    }
  }
  
  console.log(`    ❌ No color match found`);
  return false;
};

/**
 * Generate a random color for shapes
 * @returns Random hex color code
 */
export const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B739', // Gold
    '#52C78C', // Green
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

