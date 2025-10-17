/**
 * AI Shape Transform Tool
 * Handles moving, resizing, and rotating shapes
 */

import { updateObject, type CanvasObjectUpdate } from '../../canvasService';
import type { MoveShapeParams, ResizeShapeParams, RotateShapeParams, AIOperationResult } from '../../../types/aiTools';
import { resolveCoordinates, validateCoordinates } from '../../../types/aiTools';
import { getShapeDimensions } from '../../../utils/shapeUtils';
import { findSingleShape } from '../aiQueryUtils';
import { hexToColorName } from '../aiColorUtils';
import { getCurrentCanvasObjects } from '../aiStateManager';

/**
 * Move an existing shape to a new position
 * @param params - Move parameters (shapeId, target position)
 * @param userId - ID of the user performing the move
 * @returns Operation result with success status
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
      const availableShapes = getCurrentCanvasObjects().map(obj => 
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
 * @param params - Resize parameters (shapeId, new width/height)
 * @param userId - ID of the user performing the resize
 * @returns Operation result with success status
 */
export const aiResizeShape = async (
  params: ResizeShapeParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = getCurrentCanvasObjects().map(obj => 
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
 * @param params - Rotate parameters (shapeId, rotation degrees)
 * @param userId - ID of the user performing the rotation
 * @returns Operation result with success status
 */
export const aiRotateShape = async (
  params: RotateShapeParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    const shape = findSingleShape(params.shapeId);
    
    if (!shape) {
      // Provide helpful error with available shapes (using color names)
      const availableShapes = getCurrentCanvasObjects().map(obj => 
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

