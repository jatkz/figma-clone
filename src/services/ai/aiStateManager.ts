/**
 * AI Canvas State Manager
 * Handles canvas state tracking for AI operations
 */

import { subscribeToObjects } from '../canvasRTDBService';
import type { CanvasObject } from '../../types/canvas';

// Current canvas state
let currentCanvasObjects: CanvasObject[] = [];
let canvasSubscription: (() => void) | null = null;

/**
 * Get current canvas objects (for AI query operations)
 * @returns Array of current canvas objects
 */
export const getCurrentCanvasObjects = (): CanvasObject[] => {
  return currentCanvasObjects;
};

/**
 * Initialize canvas state tracking for AI operations
 * Subscribes to real-time updates of canvas objects
 */
export const initializeAICanvasState = () => {
  if (canvasSubscription) {
    canvasSubscription(); // Cleanup existing subscription
  }
  
  canvasSubscription = subscribeToObjects((objects) => {
    currentCanvasObjects = objects;
  });
};

/**
 * Cleanup canvas state tracking
 * Unsubscribes from real-time updates
 */
export const cleanupAICanvasState = () => {
  if (canvasSubscription) {
    canvasSubscription();
    canvasSubscription = null;
  }
};

