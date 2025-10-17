/**
 * AI Query Utilities
 * Handles finding shapes by description, color, type, and position
 */

import type { CanvasObject } from '../../types/canvas';
import { getShapeDimensions } from '../../utils/shapeUtils';
import { CANVAS_BOUNDS } from '../../types/aiTools';
import { colorsMatch, hexToColorName } from './aiColorUtils';
import { getCurrentCanvasObjects } from './aiStateManager';

/**
 * Find shapes by ID or description
 * Supports color, type, position, and superlative queries
 * @param description - Natural language description of shapes to find
 * @returns Array of matching canvas objects (empty if none found)
 */
export const findShapesByDescription = (description: string): CanvasObject[] => {
  const desc = description.toLowerCase().trim();
  const currentCanvasObjects = getCurrentCanvasObjects();
  
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
 * @param description - Natural language description of shape to find
 * @returns First matching canvas object, or null if none found
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

