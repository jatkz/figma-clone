/**
 * AI Shape Arrange Tool
 * Handles arranging multiple shapes in various layouts
 */

import { updateObject, type CanvasObjectUpdate } from '../../canvasService';
import type { CanvasObject } from '../../../types/canvas';
import type { ArrangeShapesParams, AIOperationResult } from '../../../types/aiTools';
import { validateCoordinates, CANVAS_BOUNDS } from '../../../types/aiTools';
import { getShapeDimensions } from '../../../utils/shapeUtils';
import { findShapesByDescription } from '../aiQueryUtils';
import { hexToColorName } from '../aiColorUtils';

/**
 * Arrange multiple shapes in a specific layout
 * @param params - Arrange parameters (shapeIds, layout type, spacing, grid columns)
 * @param userId - ID of the user performing the arrangement
 * @returns Operation result with success status and affected object IDs
 */
export const aiArrangeShapes = async (
  params: ArrangeShapesParams,
  userId: string
): Promise<AIOperationResult> => {
  try {
    console.log(`🎨 [aiArrangeShapes] Starting arrangement:`, {
      shapeIds: params.shapeIds,
      layout: params.layout,
      spacing: params.spacing
    });
    
    // Find all shapes to arrange
    const shapes: CanvasObject[] = [];
    for (const shapeId of params.shapeIds) {
      const matchedShapes = findShapesByDescription(shapeId);
      console.log(`  Found ${matchedShapes.length} shapes matching "${shapeId}"`);
      shapes.push(...matchedShapes);
    }
    
    console.log(`📊 [aiArrangeShapes] Total shapes to arrange: ${shapes.length}`);
    console.log(`📋 [aiArrangeShapes] Shapes:`, shapes.map(s => ({
      id: s.id.substring(0, 8),
      type: s.type,
      color: hexToColorName(s.color),
      position: `(${s.x}, ${s.y})`
    })));
    
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
        console.log(`\n➡️ [aiArrangeShapes] Horizontal layout`);
        // For horizontal arrangement, align all shapes on the same Y coordinate
        const baseY = shapes[0].y;
        console.log(`  Base Y coordinate: ${baseY}`);
        
        let currentX = shapes[0].x;
        console.log(`  Starting X: ${currentX}`);
        
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          if (i > 0) {
            const prevShape = shapes[i - 1];
            const prevDimensions = getShapeDimensions(prevShape);
            currentX += prevDimensions.width + spacing;
            console.log(`  Shape ${i}: Moving right by ${prevDimensions.width} + ${spacing} = new X: ${currentX}`);
          }
          
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(currentX, baseY, shapeDimensions.width, shapeDimensions.height);
          console.log(`  Shape ${i} (${hexToColorName(shape.color)} ${shape.type}): (${shape.x}, ${shape.y}) → (${validCoords.x}, ${validCoords.y})`);
          
          updates.push({
            id: shape.id,
            updates: { x: validCoords.x, y: validCoords.y, modifiedBy: userId }
          });
        }
        break;
        
      case 'vertical':
        console.log(`\n⬇️ [aiArrangeShapes] Vertical layout`);
        // For vertical arrangement, align all shapes on the same X coordinate
        const baseX = shapes[0].x;
        console.log(`  Base X coordinate: ${baseX}`);
        
        let currentY = shapes[0].y;
        console.log(`  Starting Y: ${currentY}`);
        
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];
          if (i > 0) {
            const prevShape = shapes[i - 1];
            const prevDimensions = getShapeDimensions(prevShape);
            currentY += prevDimensions.height + spacing;
            console.log(`  Shape ${i}: Moving down by ${prevDimensions.height} + ${spacing} = new Y: ${currentY}`);
          }
          
          const shapeDimensions = getShapeDimensions(shape);
          const validCoords = validateCoordinates(baseX, currentY, shapeDimensions.width, shapeDimensions.height);
          console.log(`  Shape ${i} (${hexToColorName(shape.color)} ${shape.type}): (${shape.x}, ${shape.y}) → (${validCoords.x}, ${validCoords.y})`);
          
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

