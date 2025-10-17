/**
 * AI Shape Creation Tool
 * Handles creating new shapes (rectangles, circles, text) on the canvas
 */

import { createObject, type CanvasObjectInput } from '../../canvasService';
import type { RectangleObject, CircleObject, TextObject } from '../../../types/canvas';
import type { CreateShapeParams, AIOperationResult } from '../../../types/aiTools';
import { resolveCoordinates, validateCoordinates, parseColor } from '../../../types/aiTools';
import { generateRandomColor } from '../aiColorUtils';

/**
 * Create a new shape on the canvas
 * @param params - Shape creation parameters (type, position, dimensions, color, text)
 * @param userId - ID of the user creating the shape
 * @returns Operation result with success status and created object ID
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

