/**
 * AI Shape Grid Tool
 * Handles creating grids of shapes
 */

import type { AIOperationResult } from '../../../types/aiTools';
import { CANVAS_BOUNDS } from '../../../types/aiTools';
import { aiCreateShape } from './aiShapeCreation';

/**
 * Parameters for creating a grid of shapes
 */
export interface CreateGridParams {
  shapeType: 'rectangle' | 'circle' | 'text';
  rows: number;
  columns: number;
  shapeSize?: number;
  spacing?: number;
  color?: string;
  startX?: number;
  startY?: number;
  text?: string;
}

/**
 * Create a grid of shapes
 * @param params - Grid parameters (shape type, rows, columns, size, spacing, position)
 * @param userId - ID of the user creating the grid
 * @returns Operation result with success status and created object IDs
 */
export const aiCreateGrid = async (
  params: CreateGridParams,
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

