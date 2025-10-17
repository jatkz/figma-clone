/**
 * AI Shape Management Tool
 * Handles deleting shapes and getting canvas state
 */

import { deleteObject } from '../../canvasService';
import type { DeleteShapeParams, AIOperationResult, CanvasStateResult } from '../../../types/aiTools';
import { findSingleShape } from '../aiQueryUtils';
import { hexToColorName } from '../aiColorUtils';
import { getCurrentCanvasObjects } from '../aiStateManager';

/**
 * Delete a shape from the canvas
 * @param params - Delete parameters (shapeId)
 * @param _userId - ID of the user performing the deletion (unused)
 * @returns Operation result with success status
 */
export const aiDeleteShape = async (
  params: DeleteShapeParams,
  _userId: string
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
 * Returns information about all objects on the canvas
 * @param _userId - ID of the user requesting state (unused)
 * @returns Canvas state with objects, counts, and summary
 */
export const aiGetCanvasState = async (_userId?: string): Promise<CanvasStateResult> => {
  const objects = [...getCurrentCanvasObjects()];
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

