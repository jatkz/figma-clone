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
 */
export const findShapesByDescription = (description: string): CanvasObject[] => {
  const desc = description.toLowerCase().trim();
  
  // If it looks like an exact ID, try that first
  if (desc.length > 10 && !desc.includes(' ')) {
    const exactMatch = currentCanvasObjects.find(obj => obj.id === description);
    if (exactMatch) return [exactMatch];
  }
  
  const matches: CanvasObject[] = [];
  
  for (const obj of currentCanvasObjects) {
    const objColor = obj.color.toLowerCase();
    const objType = obj.type.toLowerCase();
    
    // Check for color + type matches (e.g., "blue rectangle")
    if (desc.includes(objColor) && desc.includes(objType)) {
      matches.push(obj);
      continue;
    }
    
    // Check for type matches (e.g., "rectangle", "the circle")
    if (desc.includes(objType) || desc.includes(`the ${objType}`)) {
      matches.push(obj);
      continue;
    }
    
    // Check for color matches (e.g., "blue", "the red one")
    if (desc.includes(objColor)) {
      matches.push(obj);
      continue;
    }
    
    // Check for position-based descriptions (e.g., "top", "left")
    if (desc.includes('top') && obj.y < CANVAS_BOUNDS.CENTER_Y) {
      matches.push(obj);
    } else if (desc.includes('bottom') && obj.y > CANVAS_BOUNDS.CENTER_Y) {
      matches.push(obj);
    } else if (desc.includes('left') && obj.x < CANVAS_BOUNDS.CENTER_X) {
      matches.push(obj);
    } else if (desc.includes('right') && obj.x > CANVAS_BOUNDS.CENTER_X) {
      matches.push(obj);
    }
  }
  
  return matches;
};

/**
 * Find a single shape by description (returns the first match)
 */
export const findSingleShape = (description: string): CanvasObject | null => {
  const matches = findShapesByDescription(description);
  return matches.length > 0 ? matches[0] : null;
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
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      return {
        success: false,
        message: `Could not find shape: ${params.shapeId}`,
        error: 'Shape not found'
      };
    }
    
    // Resolve and validate coordinates  
    const coords = resolveCoordinates(params.x, params.y);
    const { width, height } = getShapeDimensions(shape);
    const validCoords = validateCoordinates(coords.x, coords.y, width, height);
    
    const updates: CanvasObjectUpdate = {
      x: validCoords.x,
      y: validCoords.y,
      modifiedBy: userId
    };
    
    await updateObject(shape.id, updates);
    
    return {
      success: true,
      message: `Moved ${shape.type} to position (${validCoords.x}, ${validCoords.y})`,
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
      return {
        success: false,
        message: `Could not find shape: ${params.shapeId}`,
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
      return {
        success: false,
        message: `Could not find shape: ${params.shapeId}`,
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
      return {
        success: false,
        message: `Could not find shape: ${params.shapeId}`,
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
