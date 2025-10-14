/**
 * AI Tools Schema for Canvas Operations
 * Defines the function calling interface for AI canvas manipulation
 */

import type { CanvasObject } from './canvas';

// ============================================================================
// AI Tool Definitions
// ============================================================================

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameter>;
    required: string[];
  };
}

export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
  items?: {
    type: string;
  };
}

// ============================================================================
// Canvas Operation Schemas
// ============================================================================

export const AI_TOOLS: AITool[] = [
  {
    name: 'createShape',
    description: 'Create a new shape on the canvas',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of shape to create',
          enum: ['rectangle', 'circle', 'text']
        },
        x: {
          type: 'number',
          description: 'X coordinate (0-5000, or use "center" for canvas center)'
        },
        y: {
          type: 'number', 
          description: 'Y coordinate (0-5000, or use "center" for canvas center)'
        },
        width: {
          type: 'number',
          description: 'Width of the shape in pixels (default: 100 for shapes)'
        },
        height: {
          type: 'number',
          description: 'Height of the shape in pixels (default: 100 for shapes)'
        },
        color: {
          type: 'string',
          description: 'Color of the shape (hex code, color name, or CSS color)'
        },
        text: {
          type: 'string',
          description: 'Text content (only for text shapes)'
        },
        fontSize: {
          type: 'number',
          description: 'Font size in pixels (only for text shapes, default: 16)'
        }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'moveShape',
    description: 'Move an existing shape to a new position',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to move, or description like "blue rectangle" or "the text"'
        },
        x: {
          type: 'number',
          description: 'New X coordinate (0-5000)'
        },
        y: {
          type: 'number',
          description: 'New Y coordinate (0-5000)'
        }
      },
      required: ['shapeId', 'x', 'y']
    }
  },
  {
    name: 'resizeShape',
    description: 'Resize an existing shape',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to resize, or description like "blue rectangle"'
        },
        width: {
          type: 'number',
          description: 'New width in pixels'
        },
        height: {
          type: 'number',
          description: 'New height in pixels'
        }
      },
      required: ['shapeId', 'width', 'height']
    }
  },
  {
    name: 'rotateShape',
    description: 'Rotate an existing shape',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to rotate, or description like "the text"'
        },
        degrees: {
          type: 'number',
          description: 'Rotation angle in degrees (0-360)'
        }
      },
      required: ['shapeId', 'degrees']
    }
  },
  {
    name: 'deleteShape',
    description: 'Delete a shape from the canvas',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'ID of the shape to delete, or description like "red circle"'
        }
      },
      required: ['shapeId']
    }
  },
  {
    name: 'getCanvasState',
    description: 'Get the current state of all objects on the canvas',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'arrangeShapes',
    description: 'Arrange multiple shapes in a specific layout',
    parameters: {
      type: 'object',
      properties: {
        shapeIds: {
          type: 'array',
          description: 'Array of shape IDs or descriptions to arrange',
          items: {
            type: 'string'
          }
        },
        layout: {
          type: 'string',
          description: 'Layout arrangement type',
          enum: ['horizontal', 'vertical', 'grid', 'circle', 'align-left', 'align-right', 'align-top', 'align-bottom', 'center', 'distribute-horizontal', 'distribute-vertical']
        },
        spacing: {
          type: 'number',
          description: 'Spacing between elements in pixels (default: 20)'
        },
        gridColumns: {
          type: 'number',
          description: 'Number of columns for grid layout (default: 3)'
        }
      },
      required: ['shapeIds', 'layout']
    }
  }
];

// ============================================================================
// Function Call Interfaces
// ============================================================================

export interface CreateShapeParams {
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  text?: string;
  fontSize?: number;
}

export interface MoveShapeParams {
  shapeId: string;
  x: number;
  y: number;
}

export interface ResizeShapeParams {
  shapeId: string;
  width: number;
  height: number;
}

export interface RotateShapeParams {
  shapeId: string;
  degrees: number;
}

export interface DeleteShapeParams {
  shapeId: string;
}

export interface ArrangeShapesParams {
  shapeIds: string[];
  layout: 'horizontal' | 'vertical' | 'grid' | 'circle' | 'align-left' | 'align-right' | 'align-top' | 'align-bottom' | 'center' | 'distribute-horizontal' | 'distribute-vertical';
  spacing?: number;
  gridColumns?: number;
}

// ============================================================================
// AI Operation Results
// ============================================================================

export interface AIOperationResult {
  success: boolean;
  message: string;
  objectIds?: string[];
  error?: string;
}

export interface CanvasStateResult {
  objects: CanvasObject[];
  totalCount: number;
  summary: string;
}

// ============================================================================
// Coordinate System Utilities
// ============================================================================

export const CANVAS_BOUNDS = {
  MIN_X: 0,
  MAX_X: 5000,
  MIN_Y: 0,
  MAX_Y: 5000,
  CENTER_X: 2500,
  CENTER_Y: 2500,
} as const;

/**
 * Convert relative positions to absolute coordinates
 */
export const resolveCoordinates = (
  x: number | string,
  y: number | string
): { x: number; y: number } => {
  let resolvedX: number;
  let resolvedY: number;

  // Handle X coordinate
  if (typeof x === 'string') {
    switch (x.toLowerCase()) {
      case 'center':
        resolvedX = CANVAS_BOUNDS.CENTER_X;
        break;
      case 'left':
        resolvedX = CANVAS_BOUNDS.MIN_X + 100;
        break;
      case 'right':
        resolvedX = CANVAS_BOUNDS.MAX_X - 100;
        break;
      default:
        resolvedX = parseFloat(x) || CANVAS_BOUNDS.CENTER_X;
    }
  } else {
    resolvedX = Math.max(CANVAS_BOUNDS.MIN_X, Math.min(CANVAS_BOUNDS.MAX_X, x));
  }

  // Handle Y coordinate
  if (typeof y === 'string') {
    switch (y.toLowerCase()) {
      case 'center':
        resolvedY = CANVAS_BOUNDS.CENTER_Y;
        break;
      case 'top':
        resolvedY = CANVAS_BOUNDS.MIN_Y + 100;
        break;
      case 'bottom':
        resolvedY = CANVAS_BOUNDS.MAX_Y - 100;
        break;
      default:
        resolvedY = parseFloat(y) || CANVAS_BOUNDS.CENTER_Y;
    }
  } else {
    resolvedY = Math.max(CANVAS_BOUNDS.MIN_Y, Math.min(CANVAS_BOUNDS.MAX_Y, y));
  }

  return { x: resolvedX, y: resolvedY };
};

/**
 * Validate and clamp coordinates to canvas bounds
 */
export const validateCoordinates = (x: number, y: number, width = 100, height = 100) => {
  return {
    x: Math.max(CANVAS_BOUNDS.MIN_X, Math.min(CANVAS_BOUNDS.MAX_X - width, x)),
    y: Math.max(CANVAS_BOUNDS.MIN_Y, Math.min(CANVAS_BOUNDS.MAX_Y - height, y)),
  };
};

/**
 * Parse color string to a valid color value
 */
export const parseColor = (colorInput: string): string => {
  // Handle common color names
  const colorMap: Record<string, string> = {
    red: '#ff0000',
    blue: '#0000ff',
    green: '#00ff00',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    grey: '#808080',
  };

  const color = colorInput.toLowerCase().trim();
  
  // Return mapped color if found
  if (colorMap[color]) {
    return colorMap[color];
  }
  
  // Return as-is if it looks like a hex color
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) {
    return color;
  }
  
  // Return as-is for CSS colors (rgb, rgba, hsl, etc.)
  if (color.includes('rgb') || color.includes('hsl')) {
    return color;
  }
  
  // Default fallback
  return '#000000';
};
