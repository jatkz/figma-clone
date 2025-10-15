/**
 * AI Canvas Service
 * Handles AI tool execution and maps function calls to canvas operations
 */

import { 
  createObject, 
  updateObject, 
  deleteObject, 
  subscribeToObjects,
  type CanvasObjectInput,
  type CanvasObjectUpdate 
} from './canvasService';
import type { CanvasObject, RectangleObject, CircleObject, TextObject } from '../types/canvas';
import {
  type CreateShapeParams,
  type MoveShapeParams,
  type ResizeShapeParams,
  type RotateShapeParams,
  type DeleteShapeParams,
  type ArrangeShapesParams,
  type AIOperationResult,
  type CanvasStateResult,
  resolveCoordinates,
  validateCoordinates,
  parseColor,
  CANVAS_BOUNDS
} from '../types/aiTools';
import { getShapeDimensions } from '../utils/shapeUtils';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Color name to hex code mapping
 * Maps common color names to their hex codes for better matching
 */
const COLOR_NAME_MAP: Record<string, string[]> = {
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
 */
const normalizeColor = (color: string): string => {
  return color.toLowerCase().trim();
};

/**
 * Convert hex color to human-readable color name (for display purposes)
 * @param hexColor Hex color code (e.g., "#FF6B6B")
 * @returns Color name (e.g., "red") or the original hex if no match
 */
const hexToColorName = (hexColor: string): string => {
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
 * @param objectColor The hex color of the object (e.g., "#FF6B6B")
 * @param searchTerm The search term (e.g., "red" or "#ff0000")
 * @returns true if they match
 */
const colorsMatch = (objectColor: string, searchTerm: string): boolean => {
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
 */
const generateRandomColor = (): string => {
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

// ============================================================================
// Canvas State Management
// ============================================================================

let currentCanvasObjects: CanvasObject[] = [];
let canvasSubscription: (() => void) | null = null;

/**
 * Initialize canvas state tracking for AI operations
 */
export const initializeAICanvasState = () => {
  if (canvasSubscription) {
    canvasSubscription(); // Cleanup existing subscription
  }
  
  canvasSubscription = subscribeToObjects((objects) => {
    currentCanvasObjects = objects;
    console.log(`🤖 AI Canvas State Updated: ${objects.length} objects`);
  });
};

/**
 * Cleanup canvas state tracking
 */
export const cleanupAICanvasState = () => {
  if (canvasSubscription) {
    canvasSubscription();
    canvasSubscription = null;
  }
};

// ============================================================================
// Shape Finding Utilities
// ============================================================================

/**
 * Find shapes by ID or description
 * Supports color, type, position, and superlative queries
 */
export const findShapesByDescription = (description: string): CanvasObject[] => {
  const desc = description.toLowerCase().trim();
  
  console.log(`🔍 [findShapesByDescription] Searching for: "${description}"`);
  console.log(`📊 [findShapesByDescription] Total objects on canvas: ${currentCanvasObjects.length}`);
  console.log(`📋 [findShapesByDescription] Available objects:`, currentCanvasObjects.map(obj => ({
    id: obj.id.substring(0, 8),
    type: obj.type,
    color: obj.color,
    position: `(${obj.x}, ${obj.y})`
  })));
  
  // If it looks like an exact ID, try that first
  if (desc.length > 10 && !desc.includes(' ')) {
    const exactMatch = currentCanvasObjects.find(obj => obj.id === description);
    if (exactMatch) {
      console.log(`✅ Found by exact ID match`);
      return [exactMatch];
    }
  }
  
  // Priority-based matching system
  let colorAndTypeMatches: CanvasObject[] = [];
  let typeOnlyMatches: CanvasObject[] = [];
  let colorOnlyMatches: CanvasObject[] = [];
  let positionMatches: CanvasObject[] = [];
  
  // First pass: categorize matches by priority
  for (const obj of currentCanvasObjects) {
    const objType = obj.type.toLowerCase();
    
    console.log(`\n🔎 [findShapesByDescription] Checking object:`, {
      id: obj.id.substring(0, 8),
      type: objType,
      color: obj.color
    });
    
    const colorMatches = colorsMatch(obj.color, desc);
    const typeMatches = desc.includes(objType) || desc.includes(`the ${objType}`);
    
    console.log(`  📊 Type matches: ${typeMatches}, Color matches: ${colorMatches}`);
    
    // Priority 1: Color + Type matches (highest priority)
    if (colorMatches && typeMatches) {
      console.log(`  ✅ MATCHED by color+type (PRIORITY 1) ⭐⭐⭐`);
      colorAndTypeMatches.push(obj);
      continue; // Don't check lower priorities
    }
    
    // Priority 2: Type-only matches
    if (typeMatches) {
      console.log(`  ✅ MATCHED by type only (PRIORITY 2) ⭐⭐`);
      typeOnlyMatches.push(obj);
      continue; // Don't check lower priorities
    }
    
    // Priority 3: Color-only matches
    if (colorMatches) {
      console.log(`  ✅ MATCHED by color only (PRIORITY 3) ⭐`);
      colorOnlyMatches.push(obj);
      continue; // Don't check lower priorities
    }
    
    // Priority 4: Position-based matches (lowest priority)
    if (desc.includes('top') && obj.y < CANVAS_BOUNDS.CENTER_Y) {
      console.log(`  ✅ MATCHED by position (top) (PRIORITY 4)`);
      positionMatches.push(obj);
    } else if (desc.includes('bottom') && obj.y > CANVAS_BOUNDS.CENTER_Y) {
      console.log(`  ✅ MATCHED by position (bottom) (PRIORITY 4)`);
      positionMatches.push(obj);
    } else if (desc.includes('left') && obj.x < CANVAS_BOUNDS.CENTER_X) {
      console.log(`  ✅ MATCHED by position (left) (PRIORITY 4)`);
      positionMatches.push(obj);
    } else if (desc.includes('right') && obj.x > CANVAS_BOUNDS.CENTER_X) {
      console.log(`  ✅ MATCHED by position (right) (PRIORITY 4)`);
      positionMatches.push(obj);
    } else {
      console.log(`  ❌ No match`);
    }
  }
  
  // Return matches in priority order (highest priority first)
  let matches: CanvasObject[] = [];
  if (colorAndTypeMatches.length > 0) {
    console.log(`\n🎯 Using ${colorAndTypeMatches.length} color+type match(es) (PRIORITY 1)`);
    matches = colorAndTypeMatches;
  } else if (typeOnlyMatches.length > 0) {
    console.log(`\n🎯 Using ${typeOnlyMatches.length} type-only match(es) (PRIORITY 2)`);
    matches = typeOnlyMatches;
  } else if (colorOnlyMatches.length > 0) {
    console.log(`\n🎯 Using ${colorOnlyMatches.length} color-only match(es) (PRIORITY 3)`);
    matches = colorOnlyMatches;
  } else if (positionMatches.length > 0) {
    console.log(`\n🎯 Using ${positionMatches.length} position match(es) (PRIORITY 4)`);
    matches = positionMatches;
  }
  
  // Second pass: apply superlatives if present
  if (matches.length > 1) {
    if (desc.includes('largest') || desc.includes('biggest')) {
      // Find the largest by area
      matches = [matches.reduce((largest, obj) => {
        const largestDim = getShapeDimensions(largest);
        const objDim = getShapeDimensions(obj);
        const largestArea = largestDim.width * largestDim.height;
        const objArea = objDim.width * objDim.height;
        return objArea > largestArea ? obj : largest;
      })];
    } else if (desc.includes('smallest') || desc.includes('tiniest')) {
      // Find the smallest by area
      matches = [matches.reduce((smallest, obj) => {
        const smallestDim = getShapeDimensions(smallest);
        const objDim = getShapeDimensions(obj);
        const smallestArea = smallestDim.width * smallestDim.height;
        const objArea = objDim.width * objDim.height;
        return objArea < smallestArea ? obj : smallest;
      })];
    } else if (desc.includes('first') || desc.includes('leftmost')) {
      // Find leftmost
      matches = [matches.reduce((leftmost, obj) => 
        obj.x < leftmost.x ? obj : leftmost
      )];
    } else if (desc.includes('last') || desc.includes('rightmost')) {
      // Find rightmost
      matches = [matches.reduce((rightmost, obj) => 
        obj.x > rightmost.x ? obj : rightmost
      )];
    }
  }
  
  console.log(`\n🎯 [findShapesByDescription] Found ${matches.length} match(es):`, matches.map(obj => ({
    id: obj.id.substring(0, 8),
    type: obj.type,
    color: obj.color,
    colorName: hexToColorName(obj.color),
    position: `(${obj.x}, ${obj.y})`
  })));
  
  return matches;
};

/**
 * Find a single shape by description (returns the first match)
 * Logs a warning if multiple matches are found
 */
export const findSingleShape = (description: string): CanvasObject | null => {
  console.log(`🎯 [findSingleShape] Looking for: "${description}"`);
  const matches = findShapesByDescription(description);
  
  if (matches.length === 0) {
    console.log(`❌ [findSingleShape] No matches found`);
    return null;
  }
  
  if (matches.length > 1) {
    console.warn(
      `⚠️ Ambiguous reference: "${description}" matches ${matches.length} objects. Using first match.`,
      matches.map(obj => ({ id: obj.id, type: obj.type, color: obj.color, position: `(${obj.x}, ${obj.y})` }))
    );
  }
  
  console.log(`✅ [findSingleShape] Returning:`, {
    id: matches[0].id.substring(0, 8),
    type: matches[0].type,
    color: matches[0].color,
    colorName: hexToColorName(matches[0].color),
    position: `(${matches[0].x}, ${matches[0].y})`
  });
  
  return matches[0];
};

// ============================================================================
// AI Tool Implementations
// ============================================================================

/**
 * Create a new shape on the canvas
 */
export const aiCreateShape = async (
  params: CreateShapeParams, 
  userId: string
): Promise<AIOperationResult> => {
  try {
    // Resolve coordinates
    const coords = resolveCoordinates(params.x, params.y);
    
    // Set defaults based on shape type
    // Enforce min 50, max 1000 for dimensions
    let width = params.width ? Math.max(50, Math.min(1000, params.width)) : 100;
    let height = params.height ? Math.max(50, Math.min(1000, params.height)) : 100;
    
    // Default color: random for shapes, will be overridden for text
    let color = params.color ? parseColor(params.color) : generateRandomColor();
    
    // Validate coordinates
    const validCoords = validateCoordinates(coords.x, coords.y, width, height);
    
    // Create object based on type
    let objectData: CanvasObjectInput;
    
    switch (params.type) {
      case 'rectangle':
        objectData = {
          type: 'rectangle',
          x: validCoords.x,
          y: validCoords.y,
          width,
          height,
          color,
          rotation: 0,
          createdBy: userId,
          modifiedBy: userId,
          version: 1,
          lockedBy: null,
          lockedAt: null,
        } as RectangleObject;
        break;
        
      case 'circle':
        // Create proper circle objects
        const radius = Math.max(width, height) / 2; // Use larger dimension as diameter, then halve for radius
        objectData = {
          type: 'circle',
          x: validCoords.x,
          y: validCoords.y,
          radius,
          color,
          rotation: 0,
          createdBy: userId,
          modifiedBy: userId,
          version: 1,
          lockedBy: null,
          lockedAt: null,
        } as CircleObject;
        break;
        
      case 'text':
        // Create proper text objects
        const text = params.text || 'Sample Text';
        const fontSize = params.fontSize || 16;
        const textWidth = text.length * fontSize * 0.6;
        const textHeight = fontSize * 1.2;
        
        // Text always defaults to black unless explicitly specified
        const textColor = params.color ? parseColor(params.color) : '#000000';
        
        objectData = {
          type: 'text',
          x: validCoords.x,
          y: validCoords.y,
          text,
          fontSize,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          width: textWidth,
          height: textHeight,
          color: textColor,
          rotation: 0,
          createdBy: userId,
          modifiedBy: userId,
          version: 1,
          lockedBy: null,
          lockedAt: null,
        } as TextObject;
        break;
        
      default:
        return {
          success: false,
          message: `Unsupported shape type: ${params.type}`,
          error: 'Invalid shape type'
        };
    }
    
    const createdObject = await createObject(objectData);
    
    return {
      success: true,
      message: `Created ${params.type} at position (${validCoords.x}, ${validCoords.y})`,
      objectIds: [createdObject.id]
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create shape',
      error: error.message
    };
  }
};

/**
 * Move an existing shape to a new position
 */
export const aiMoveShape = async (
  params: MoveShapeParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    console.log(`🚀 [aiMoveShape] Starting move operation:`, {
      shapeId: params.shapeId,
      targetX: params.x,
      targetY: params.y,
      userId
    });
    
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = currentCanvasObjects.map(obj => 
        `${hexToColorName(obj.color)} ${obj.type}`
      ).join(', ');
      
      console.log(`❌ [aiMoveShape] Shape not found. Available shapes:`, availableShapes);
      
      return {
        success: false,
        message: `Could not find shape matching "${params.shapeId}". Available shapes: ${availableShapes || 'none'}`,
        error: 'Shape not found'
      };
    }
    
    console.log(`📍 [aiMoveShape] Shape found:`, {
      id: shape.id.substring(0, 8),
      type: shape.type,
      color: shape.color,
      colorName: hexToColorName(shape.color),
      currentPosition: `(${shape.x}, ${shape.y})`
    });
    
    // Resolve and validate coordinates  
    const coords = resolveCoordinates(params.x, params.y);
    console.log(`🎯 [aiMoveShape] Resolved coordinates:`, coords);
    
    const { width, height } = getShapeDimensions(shape);
    console.log(`📏 [aiMoveShape] Shape dimensions:`, { width, height });
    
    const validCoords = validateCoordinates(coords.x, coords.y, width, height);
    console.log(`✅ [aiMoveShape] Validated coordinates:`, validCoords);
    
    const updates: CanvasObjectUpdate = {
      x: validCoords.x,
      y: validCoords.y,
      modifiedBy: userId
    };
    
    console.log(`💾 [aiMoveShape] Updating object...`);
    await updateObject(shape.id, updates);
    
    console.log(`✅ [aiMoveShape] Move completed successfully`);
    
    return {
      success: true,
      message: `Moved ${hexToColorName(shape.color)} ${shape.type} to position (${validCoords.x}, ${validCoords.y})`,
      objectIds: [shape.id]
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to move shape',
      error: error.message
    };
  }
};

/**
 * Resize an existing shape
 */
export const aiResizeShape = async (
  params: ResizeShapeParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = currentCanvasObjects.map(obj => 
        `${hexToColorName(obj.color)} ${obj.type}`
      ).join(', ');
      
      return {
        success: false,
        message: `Could not find shape matching "${params.shapeId}". Available shapes: ${availableShapes || 'none'}`,
        error: 'Shape not found'
      };
    }
    
    // Validate size constraints and handle different shape types
    let updates: CanvasObjectUpdate = {
      modifiedBy: userId
    };
    
    if (shape.type === 'rectangle') {
      const width = Math.max(50, Math.min(1000, params.width));
      const height = Math.max(50, Math.min(1000, params.height));
      
      // Ensure shape stays within canvas bounds after resize
      const validCoords = validateCoordinates(shape.x, shape.y, width, height);
      
      updates = {
        x: validCoords.x,
        y: validCoords.y,
        width,
        height,
        modifiedBy: userId
      };
    } else if (shape.type === 'circle') {
      const radius = Math.max(25, Math.min(500, Math.max(params.width, params.height) / 2));
      
      // Ensure circle stays within canvas bounds after resize
      const validCoords = validateCoordinates(shape.x, shape.y, radius * 2, radius * 2);
      
      updates = {
        x: validCoords.x,
        y: validCoords.y,
        radius,
        modifiedBy: userId
      };
    } else if (shape.type === 'text') {
      // For text, width and height affect the text box size
      const width = Math.max(50, Math.min(1000, params.width));
      const height = Math.max(50, Math.min(500, params.height));
      
      // Ensure text stays within canvas bounds after resize
      const validCoords = validateCoordinates(shape.x, shape.y, width, height);
      
      updates = {
        x: validCoords.x,
        y: validCoords.y,
        width,
        height,
        modifiedBy: userId
      };
    }
    
    await updateObject(shape.id, updates);
    
    let message = `Resized ${shape.type}`;
    if (shape.type === 'rectangle' || shape.type === 'text') {
      const width = 'width' in updates ? updates.width : (shape as any).width;
      const height = 'height' in updates ? updates.height : (shape as any).height;
      message += ` to ${width}x${height}`;
    } else if (shape.type === 'circle') {
      const radius = 'radius' in updates ? updates.radius : (shape as any).radius;
      message += ` to radius ${radius}`;
    }
    
    return {
      success: true,
      message,
      objectIds: [shape.id]
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to resize shape',
      error: error.message
    };
  }
};

/**
 * Rotate an existing shape
 */
export const aiRotateShape = async (
  params: RotateShapeParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = currentCanvasObjects.map(obj => 
        `${hexToColorName(obj.color)} ${obj.type}`
      ).join(', ');
      
      return {
        success: false,
        message: `Could not find shape matching "${params.shapeId}". Available shapes: ${availableShapes || 'none'}`,
        error: 'Shape not found'
      };
    }
    
    // Normalize rotation to 0-360 degrees
    const rotation = ((params.degrees % 360) + 360) % 360;
    
    const updates: CanvasObjectUpdate = {
      rotation,
      modifiedBy: userId
    };
    
    await updateObject(shape.id, updates);
    
    return {
      success: true,
      message: `Rotated ${shape.type} to ${rotation} degrees`,
      objectIds: [shape.id]
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to rotate shape',
      error: error.message
    };
  }
};

/**
 * Delete a shape from the canvas
 */
export const aiDeleteShape = async (
  params: DeleteShapeParams,
  _userId: string
): Promise<AIOperationResult> => {
  try {
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = currentCanvasObjects.map(obj => 
        `${hexToColorName(obj.color)} ${obj.type}`
      ).join(', ');
      
      return {
        success: false,
        message: `Could not find shape matching "${params.shapeId}". Available shapes: ${availableShapes || 'none'}`,
        error: 'Shape not found'
      };
    }
    
    await deleteObject(shape.id);
    
    return {
      success: true,
      message: `Deleted ${shape.type}`,
      objectIds: [shape.id]
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete shape',
      error: error.message
    };
  }
};

/**
 * Get current canvas state
 */
export const aiGetCanvasState = async (_userId?: string): Promise<CanvasStateResult> => {
  const objects = [...currentCanvasObjects];
  const totalCount = objects.length;
  
  // Generate summary
  const typeCount: Record<string, number> = {};
  const colorCount: Record<string, number> = {};
  
  objects.forEach(obj => {
    typeCount[obj.type] = (typeCount[obj.type] || 0) + 1;
    colorCount[obj.color] = (colorCount[obj.color] || 0) + 1;
  });
  
  const typeSummary = Object.entries(typeCount)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');
    
  const summary = totalCount === 0 
    ? 'The canvas is empty'
    : `Canvas contains ${totalCount} object${totalCount > 1 ? 's' : ''}: ${typeSummary}`;
  
  return {
    objects,
    totalCount,
    summary
  };
};

/**
 * Arrange multiple shapes in a specific layout
 */
export const aiArrangeShapes = async (
  params: ArrangeShapesParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    // Find all shapes to arrange
    const shapes: CanvasObject[] = [];
    for (const shapeId of params.shapeIds) {
      const matchedShapes = findShapesByDescription(shapeId);
      shapes.push(...matchedShapes);
    }
    
    if (shapes.length === 0) {
      return {
        success: false,
        message: 'No shapes found to arrange',
        error: 'No shapes found'
      };
    }
    
    const spacing = params.spacing || 20;
    const updates: Array<{ id: string; updates: CanvasObjectUpdate }> = [];
    
    switch (params.layout) {
      case 'horizontal':
        let currentX = shapes[0].x;
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          if (i > 0) {
            const prevShape = shapes[i - 1];
            const prevDimensions = getShapeDimensions(prevShape);
            currentX += prevDimensions.width + spacing;
          }
          
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(currentX, shape.y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'vertical':
        let currentY = shapes[0].y;
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          if (i > 0) {
            const prevShape = shapes[i - 1];
            const prevDimensions = getShapeDimensions(prevShape);
            currentY += prevDimensions.height + spacing;
          }
          
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(shape.x, currentY, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'grid':
        const columns = params.gridColumns || 3;
        const startX = Math.min(...shapes.map(s => s.x));
        const startY = Math.min(...shapes.map(s => s.y));
        
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          const row = Math.floor(i / columns);
          const col = i % columns;
          
          const shapeDimensions = getShapeDimensions(shape);
          const x = startX + col * (shapeDimensions.width + spacing);
          const y = startY + row * (shapeDimensions.height + spacing);
          const validCoords = validateCoordinates(x, y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'center':
        const centerX = CANVAS_BOUNDS.CENTER_X;
        const centerY = CANVAS_BOUNDS.CENTER_Y;
        for (const shape of shapes) {
          const shapeDimensions = getShapeDimensions(shape);
          const x = centerX - shapeDimensions.width / 2;
          const y = centerY - shapeDimensions.height / 2;
          const validCoords = validateCoordinates(x, y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
      
      case 'align-left':
        // Align all shapes to the leftmost x position
        const minX = Math.min(...shapes.map(s => s.x));
        for (const shape of shapes) {
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(minX, shape.y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'align-right':
        // Align all shapes to the rightmost x position (accounting for width)
        const maxRight = Math.max(...shapes.map(s => s.x + getShapeDimensions(s).width));
        for (const shape of shapes) {
          const shapeDimensions = getShapeDimensions(shape);
          const x = maxRight - shapeDimensions.width;
          const validCoords = validateCoordinates(x, shape.y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'align-top':
        // Align all shapes to the topmost y position
        const minY = Math.min(...shapes.map(s => s.y));
        for (const shape of shapes) {
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(shape.x, minY, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'align-bottom':
        // Align all shapes to the bottommost y position (accounting for height)
        const maxBottom = Math.max(...shapes.map(s => s.y + getShapeDimensions(s).height));
        for (const shape of shapes) {
          const shapeDimensions = getShapeDimensions(shape);
          const y = maxBottom - shapeDimensions.height;
          const validCoords = validateCoordinates(shape.x, y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'distribute-horizontal':
        // Distribute shapes evenly along x-axis
        if (shapes.length < 2) {
          return {
            success: false,
            message: 'Need at least 2 shapes to distribute',
            error: 'Insufficient shapes'
          };
        }
        
        // Sort by x position
        const sortedByX = [...shapes].sort((a, b) => a.x - b.x);
        const leftmostX = sortedByX[0].x;
        const rightmostX = sortedByX[sortedByX.length - 1].x + getShapeDimensions(sortedByX[sortedByX.length - 1]).width;
        const totalSpaceX = rightmostX - leftmostX;
        const totalWidthX = sortedByX.reduce((sum, s) => sum + getShapeDimensions(s).width, 0);
        const gapX = shapes.length > 1 ? (totalSpaceX - totalWidthX) / (shapes.length - 1) : 0;
        
        let posX = leftmostX;
        for (const shape of sortedByX) {
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(posX, shape.y, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
          posX += shapeDimensions.width + gapX;
        }
        break;
        
      case 'distribute-vertical':
        // Distribute shapes evenly along y-axis
        if (shapes.length < 2) {
          return {
            success: false,
            message: 'Need at least 2 shapes to distribute',
            error: 'Insufficient shapes'
          };
        }
        
        // Sort by y position
        const sortedByY = [...shapes].sort((a, b) => a.y - b.y);
        const topmostY = sortedByY[0].y;
        const bottommostY = sortedByY[sortedByY.length - 1].y + getShapeDimensions(sortedByY[sortedByY.length - 1]).height;
        const totalSpaceY = bottommostY - topmostY;
        const totalHeightY = sortedByY.reduce((sum, s) => sum + getShapeDimensions(s).height, 0);
        const gapY = shapes.length > 1 ? (totalSpaceY - totalHeightY) / (shapes.length - 1) : 0;
        
        let posY = topmostY;
        for (const shape of sortedByY) {
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(shape.x, posY, shapeDimensions.width, shapeDimensions.height);
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
          posY += shapeDimensions.height + gapY;
        }
        break;
        
      default:
        return {
          success: false,
          message: `Unsupported layout type: ${params.layout}`,
          error: 'Invalid layout type'
        };
    }
    
    // Apply all updates
    for (const { id, updates: shapeUpdates } of updates) {
      await updateObject(id, shapeUpdates);
    }
    
    return {
      success: true,
      message: `Arranged ${shapes.length} shapes in ${params.layout} layout`,
      objectIds: shapes.map(s => s.id)
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to arrange shapes',
      error: error.message
    };
  }
};

/**
 * Create a grid of shapes
 */
export const aiCreateGrid = async (
  params: {
    shapeType: 'rectangle' | 'circle' | 'text';
    rows: number;
    columns: number;
    shapeSize?: number;
    spacing?: number;
    color?: string;
    startX?: number;
    startY?: number;
    text?: string;
  },
  userId: string
): Promise<AIOperationResult> => {
  try {
    const {
      shapeType,
      rows,
      columns,
      shapeSize = 100,
      spacing = 20,
      color,
      startX = CANVAS_BOUNDS.CENTER_X - ((columns * shapeSize + (columns - 1) * spacing) / 2),
      startY = CANVAS_BOUNDS.CENTER_Y - ((rows * shapeSize + (rows - 1) * spacing) / 2),
      text = 'Text'
    } = params;
    
    // Validate grid parameters
    if (rows < 1 || rows > 20) {
      return {
        success: false,
        message: 'Grid rows must be between 1 and 20',
        error: 'Invalid grid size'
      };
    }
    
    if (columns < 1 || columns > 20) {
      return {
        success: false,
        message: 'Grid columns must be between 1 and 20',
        error: 'Invalid grid size'
      };
    }
    
    const totalShapes = rows * columns;
    if (totalShapes > 100) {
      return {
        success: false,
        message: 'Grid cannot have more than 100 shapes',
        error: 'Grid too large'
      };
    }
    
    // Enforce size constraints
    const validSize = Math.max(50, Math.min(1000, shapeSize));
    const createdIds: string[] = [];
    
    // Create shapes in grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = startX + col * (validSize + spacing);
        const y = startY + row * (validSize + spacing);
        
        // Create shape using aiCreateShape
        const shapeParams = {
          type: shapeType,
          x,
          y,
          width: validSize,
          height: validSize,
          color,
          text: shapeType === 'text' ? text : undefined,
          fontSize: 16
        };
        
        const result = await aiCreateShape(shapeParams, userId);
        if (result.success && result.objectIds) {
          createdIds.push(...result.objectIds);
        }
      }
    }
    
    return {
      success: true,
      message: `Created ${rows}x${columns} grid of ${shapeType}s (${totalShapes} shapes)`,
      objectIds: createdIds
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create grid',
      error: error.message
    };
  }
};

// ============================================================================
// AI Tool Dispatcher
// ============================================================================

export interface AIToolCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Execute an AI tool function call
 */
export const executeAITool = async (
  toolCall: AIToolCall,
  userId: string
): Promise<AIOperationResult | CanvasStateResult> => {
  console.log(`🤖 Executing AI tool: ${toolCall.name}`, toolCall.arguments);
  
  try {
    switch (toolCall.name) {
      case 'createShape':
        return await aiCreateShape(toolCall.arguments as CreateShapeParams, userId);
        
      case 'moveShape':
        return await aiMoveShape(toolCall.arguments as MoveShapeParams, userId);
        
      case 'resizeShape':
        return await aiResizeShape(toolCall.arguments as ResizeShapeParams, userId);
        
      case 'rotateShape':
        return await aiRotateShape(toolCall.arguments as RotateShapeParams, userId);
        
      case 'deleteShape':
        return await aiDeleteShape(toolCall.arguments as DeleteShapeParams, userId);
        
      case 'getCanvasState':
        return await aiGetCanvasState();
        
      case 'arrangeShapes':
        return await aiArrangeShapes(toolCall.arguments as ArrangeShapesParams, userId);
        
      case 'createGrid':
        return await aiCreateGrid(toolCall.arguments as any, userId);
        
      default:
        return {
          success: false,
          message: `Unknown tool: ${toolCall.name}`,
          error: 'Invalid tool name'
        };
    }
  } catch (error: any) {
    console.error(`❌ AI tool execution failed:`, error);
    return {
      success: false,
      message: `Tool execution failed: ${error.message}`,
      error: error.message
    };
  }
};
