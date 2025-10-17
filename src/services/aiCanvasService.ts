/**
 * AI Canvas Service
 * Main dispatcher for AI tool execution and canvas operations
 * 
 * This service has been refactored into focused modules:
 * - ai/aiColorUtils.ts - Color handling and matching
 * - ai/aiStateManager.ts - Canvas state tracking
 * - ai/aiQueryUtils.ts - Shape finding and querying
 * - ai/tools/* - Individual AI tool implementations
 */

// ============================================================================
// Re-export Utilities
// ============================================================================

export * from './ai/aiColorUtils';
export * from './ai/aiStateManager';
export * from './ai/aiQueryUtils';

// ============================================================================
// Re-export AI Tools
// ============================================================================

export * from './ai/tools/aiShapeCreation';
export * from './ai/tools/aiShapeTransform';
export * from './ai/tools/aiShapeManagement';
export * from './ai/tools/aiShapeArrange';
export * from './ai/tools/aiShapeGrid';

// ============================================================================
// Import AI Tools for Dispatcher
// ============================================================================

import { aiCreateShape } from './ai/tools/aiShapeCreation';
import { aiMoveShape, aiResizeShape, aiRotateShape } from './ai/tools/aiShapeTransform';
import { aiDeleteShape, aiGetCanvasState } from './ai/tools/aiShapeManagement';
import { aiArrangeShapes } from './ai/tools/aiShapeArrange';
import { aiCreateGrid } from './ai/tools/aiShapeGrid';

import type {
  CreateShapeParams,
  MoveShapeParams,
  ResizeShapeParams,
  RotateShapeParams,
  DeleteShapeParams,
  ArrangeShapesParams,
  AIOperationResult,
  CanvasStateResult
} from '../types/aiTools';

// ============================================================================
// AI Tool Dispatcher
// ============================================================================

export interface AIToolCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Execute an AI tool function call
 * Central dispatcher that routes tool calls to their respective implementations
 * @param toolCall - Tool call with name and arguments
 * @param userId - ID of the user executing the tool
 * @returns Operation result or canvas state
 */
export const executeAITool = async (
  toolCall: AIToolCall,
  userId: string
): Promise<AIOperationResult | CanvasStateResult> => {
  console.log(`🤖 Executing AI tool: ${toolCall.name}`, toolCall.arguments);
  
  try {
    switch (toolCall.name) {
      case 'createShape':
        return await aiCreateShape(toolCall.arguments as CreateShapeParams, userId);
        
      case 'moveShape':
        return await aiMoveShape(toolCall.arguments as MoveShapeParams, userId);
        
      case 'resizeShape':
        return await aiResizeShape(toolCall.arguments as ResizeShapeParams, userId);
        
      case 'rotateShape':
        return await aiRotateShape(toolCall.arguments as RotateShapeParams, userId);
        
      case 'deleteShape':
        return await aiDeleteShape(toolCall.arguments as DeleteShapeParams, userId);
        
      case 'getCanvasState':
        return await aiGetCanvasState();
        
      case 'arrangeShapes':
        return await aiArrangeShapes(toolCall.arguments as ArrangeShapesParams, userId);
        
      case 'createGrid':
        return await aiCreateGrid(toolCall.arguments as any, userId);
        
      default:
        return {
          success: false,
          message: `Unknown tool: ${toolCall.name}`,
          error: 'Invalid tool name'
        };
    }
  } catch (error: any) {
    console.error(`❌ AI tool execution failed:`, error);
    return {
      success: false,
      message: `Tool execution failed: ${error.message}`,
      error: error.message
    };
  }
};
