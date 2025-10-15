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
    description: 'Create a new shape on the canvas. Examples: "Create a red rectangle", "Make a blue circle at 100, 200", "Add text that says Hello"',
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
          description: 'X coordinate (0-5000). Canvas center is at 2500. Use 2500 for center positioning.'
        },
        y: {
          type: 'number', 
          description: 'Y coordinate (0-5000). Canvas center is at 2500. Use 2500 for center positioning.'
        },
        width: {
          type: 'number',
          description: 'Width of the shape in pixels (min: 50, max: 1000, default: 100)'
        },
        height: {
          type: 'number',
          description: 'Height of the shape in pixels (min: 50, max: 1000, default: 100)'
        },
        color: {
          type: 'string',
          description: 'Color of the shape (hex code or color name like "red", "blue"). Defaults to random for shapes, black for text.'
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
    description: 'Move an existing shape to a new position. Object finding is AUTOMATIC - you can reference shapes by description (e.g., "black rectangle", "red circle", "the text") and the system will find them. Use this tool directly without checking canvas state first. Examples: "Move the blue rectangle to 100, 200", "Move the black rectangle to the center", "Move the text to 1000, 500"',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'Description of the shape to move (e.g., "blue rectangle", "red circle", "black rectangle", "the text"). The system automatically finds matching objects.'
        },
        x: {
          type: 'number',
          description: 'New X coordinate (0-5000). Canvas center is at 2500. Use "center" for 2500.'
        },
        y: {
          type: 'number',
          description: 'New Y coordinate (0-5000). Canvas center is at 2500. Use "center" for 2500.'
        }
      },
      required: ['shapeId', 'x', 'y']
    }
  },
  {
    name: 'resizeShape',
    description: 'Resize an existing shape. Object finding is AUTOMATIC - reference shapes by description. Use this tool directly without checking canvas state first. Examples: "Make the circle twice as big", "Resize the black rectangle to 300x200", "Make the red circle bigger"',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'Description of the shape to resize (e.g., "blue rectangle", "red circle", "the text"). The system automatically finds matching objects.'
        },
        width: {
          type: 'number',
          description: 'New width in pixels (min: 50, max: 1000)'
        },
        height: {
          type: 'number',
          description: 'New height in pixels (min: 50, max: 1000)'
        }
      },
      required: ['shapeId', 'width', 'height']
    }
  },
  {
    name: 'rotateShape',
    description: 'Rotate an existing shape to a specific angle. Object finding is AUTOMATIC - reference shapes by description. Use this tool directly without checking canvas state first. IMPORTANT: Use 0 degrees to reset rotation to normal. Examples: "Rotate the text 45 degrees", "Turn the black rectangle 90 degrees", "Rotate the red circle 180 degrees", "Rotate the purple rectangle to 0 degrees" (reset to normal), "Set rotation to 0" (reset)',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'Description of the shape to rotate (e.g., "the text", "blue rectangle", "red circle"). The system automatically finds matching objects.'
        },
        degrees: {
          type: 'number',
          description: 'Absolute rotation angle in degrees (0-360). Use 0 to reset to normal orientation, 90 for quarter turn, 180 for upside down, 270 for three-quarter turn.'
        }
      },
      required: ['shapeId', 'degrees']
    }
  },
  {
    name: 'deleteShape',
    description: 'Delete a shape from the canvas. Object finding is AUTOMATIC - reference shapes by description. Use this tool directly without checking canvas state first. Examples: "Delete the red circle", "Remove the black rectangle", "Delete the text"',
    parameters: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'Description of the shape to delete (e.g., "red circle", "black rectangle", "the text"). The system automatically finds matching objects.'
        }
      },
      required: ['shapeId']
    }
  },
  {
    name: 'getCanvasState',
    description: 'Get the current state of all objects on the canvas. ONLY use this when the user explicitly asks to see what\'s on the canvas (e.g., "what shapes are there?", "list all objects", "show me the canvas"). DO NOT use this before manipulation commands like move, resize, or delete - those operations find objects automatically.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'arrangeShapes',
    description: 'Arrange existing shapes in a specific layout. Examples: "Arrange these shapes in a horizontal row", "Align these to the left", "Distribute these evenly"',
    parameters: {
      type: 'object',
      properties: {
        shapeIds: {
          type: 'array',
          description: 'Array of shape IDs or descriptions to arrange (e.g., ["red rectangle", "blue circle"])',
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
  },
  {
    name: 'createGrid',
    description: 'Create a grid of NEW shapes. Examples: "Create a 3x3 grid of squares", "Make a 2x4 grid of circles", "Create a 5x5 grid of red rectangles"',
    parameters: {
      type: 'object',
      properties: {
        shapeType: {
          type: 'string',
          description: 'Type of shape to create in the grid',
          enum: ['rectangle', 'circle', 'text']
        },
        rows: {
          type: 'number',
          description: 'Number of rows in the grid (1-20)'
        },
        columns: {
          type: 'number',
          description: 'Number of columns in the grid (1-20)'
        },
        shapeSize: {
          type: 'number',
          description: 'Size of each shape in pixels (default: 100, min: 50, max: 1000)'
        },
        spacing: {
          type: 'number',
          description: 'Spacing between shapes in pixels (default: 20)'
        },
        color: {
          type: 'string',
          description: 'Color for all shapes in the grid (hex code or color name). Random if not specified.'
        },
        startX: {
          type: 'number',
          description: 'Starting X position (default: centered on canvas)'
        },
        startY: {
          type: 'number',
          description: 'Starting Y position (default: centered on canvas)'
        },
        text: {
          type: 'string',
          description: 'Text content (only for text grids, default: "Text")'
        }
      },
      required: ['shapeType', 'rows', 'columns']
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
