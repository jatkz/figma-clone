import type { CanvasObject } from '../types/canvas';
import type { FilterCriteria } from '../types/filters';
import { getShapeDimensions } from './shapeUtils';

/**
 * Apply filter criteria to a list of objects
 * 
 * @param objects - Array of canvas objects to filter
 * @param criteria - Filter criteria to apply
 * @param currentUserId - ID of current user (for creator filtering)
 * @returns Filtered array of objects
 */
export function applyFilters(
  objects: CanvasObject[],
  criteria: FilterCriteria,
  currentUserId?: string
): CanvasObject[] {
  return objects.filter(obj => {
    // Type filter
    if (criteria.types && criteria.types.length > 0) {
      if (!criteria.types.includes(obj.type)) {
        return false;
      }
    }
    
    // Color filter
    if (criteria.colors && criteria.colors.length > 0) {
      const objColor = obj.color.toUpperCase();
      const matchesColor = criteria.colors.some(
        color => color.toUpperCase() === objColor
      );
      if (!matchesColor) {
        return false;
      }
    }
    
    // Size filters
    const dimensions = getShapeDimensions(obj);
    
    if (criteria.minWidth !== undefined && dimensions.width < criteria.minWidth) {
      return false;
    }
    
    if (criteria.maxWidth !== undefined && dimensions.width > criteria.maxWidth) {
      return false;
    }
    
    if (criteria.minHeight !== undefined && dimensions.height < criteria.minHeight) {
      return false;
    }
    
    if (criteria.maxHeight !== undefined && dimensions.height > criteria.maxHeight) {
      return false;
    }
    
    // Creator filter
    if (currentUserId) {
      if (criteria.createdByMe && obj.createdBy !== currentUserId) {
        return false;
      }
      
      if (criteria.createdByOthers && obj.createdBy === currentUserId) {
        return false;
      }
    }
    
    // Specific creators filter
    if (criteria.specificCreators && criteria.specificCreators.length > 0) {
      if (!criteria.specificCreators.includes(obj.createdBy)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Check if any filters are active
 * 
 * @param criteria - Filter criteria to check
 * @returns true if any filters are applied
 */
export function hasActiveFilters(criteria: FilterCriteria): boolean {
  return !!(
    (criteria.types && criteria.types.length > 0) ||
    (criteria.colors && criteria.colors.length > 0) ||
    criteria.minWidth !== undefined ||
    criteria.maxWidth !== undefined ||
    criteria.minHeight !== undefined ||
    criteria.maxHeight !== undefined ||
    criteria.createdByMe ||
    criteria.createdByOthers ||
    (criteria.specificCreators && criteria.specificCreators.length > 0)
  );
}

/**
 * Clear all filter criteria
 * 
 * @returns Empty filter criteria
 */
export function clearFilters(): FilterCriteria {
  return {};
}

/**
 * Get count of matching objects
 * 
 * @param objects - Array of canvas objects
 * @param criteria - Filter criteria
 * @param currentUserId - ID of current user
 * @returns Count of matching objects
 */
export function getMatchingCount(
  objects: CanvasObject[],
  criteria: FilterCriteria,
  currentUserId?: string
): number {
  return applyFilters(objects, criteria, currentUserId).length;
}

/**
 * Get unique colors from objects
 * 
 * @param objects - Array of canvas objects
 * @returns Array of unique color hex strings
 */
export function getUniqueColorsFromObjects(objects: CanvasObject[]): string[] {
  const colorSet = new Set<string>();
  objects.forEach(obj => colorSet.add(obj.color.toUpperCase()));
  return Array.from(colorSet).sort();
}

/**
 * Get unique creators from objects
 * 
 * @param objects - Array of canvas objects
 * @returns Array of unique creator IDs
 */
export function getUniqueCreators(objects: CanvasObject[]): string[] {
  const creatorSet = new Set<string>();
  objects.forEach(obj => creatorSet.add(obj.createdBy));
  return Array.from(creatorSet);
}

/**
 * Get size range from objects
 * 
 * @param objects - Array of canvas objects
 * @returns Object with min/max width and height
 */
export function getSizeRange(objects: CanvasObject[]): {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
} {
  if (objects.length === 0) {
    return { minWidth: 0, maxWidth: 1000, minHeight: 0, maxHeight: 1000 };
  }
  
  let minWidth = Infinity;
  let maxWidth = 0;
  let minHeight = Infinity;
  let maxHeight = 0;
  
  objects.forEach(obj => {
    const dims = getShapeDimensions(obj);
    minWidth = Math.min(minWidth, dims.width);
    maxWidth = Math.max(maxWidth, dims.width);
    minHeight = Math.min(minHeight, dims.height);
    maxHeight = Math.max(maxHeight, dims.height);
  });
  
  return {
    minWidth: Math.floor(minWidth),
    maxWidth: Math.ceil(maxWidth),
    minHeight: Math.floor(minHeight),
    maxHeight: Math.ceil(maxHeight)
  };
}

