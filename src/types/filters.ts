/**
 * Filter criteria for selecting objects
 */
export interface FilterCriteria {
  // Type filters
  types?: ('rectangle' | 'circle' | 'text')[];
  
  // Color filters
  colors?: string[];
  
  // Size filters
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // Creator filter
  createdByMe?: boolean;
  createdByOthers?: boolean;
  specificCreators?: string[];
}

/**
 * Filter preset for saving/loading filter combinations
 */
export interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: number;
}

/**
 * Filter state for managing UI
 */
export interface FilterState {
  isOpen: boolean;
  criteria: FilterCriteria;
  previewMode: boolean;
  matchingObjectIds: string[];
}

