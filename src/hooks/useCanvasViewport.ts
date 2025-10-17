import { useState, useCallback } from 'react';
import type Konva from 'konva';

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

interface UseCanvasViewportParams {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasWidth: number;
  canvasHeight: number;
  canvasCenterX: number;
  canvasCenterY: number;
  toastFunction: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

interface UseCanvasViewportReturn {
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
  constrainViewport: (newViewport: ViewportState) => ViewportState;
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  setZoom: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

/**
 * Custom hook for managing canvas viewport (zoom and pan)
 * Handles zoom in/out, wheel events, and viewport constraints
 */
export function useCanvasViewport({
  stageRef,
  canvasWidth,
  canvasHeight,
  canvasCenterX,
  canvasCenterY,
  toastFunction
}: UseCanvasViewportParams): UseCanvasViewportReturn {

  // Viewport state: centered at canvas center initially
  const [viewport, setViewport] = useState<ViewportState>({
    x: -canvasCenterX, // Negative because we want to center the canvas
    y: -canvasCenterY,
    scale: 1.0, // Back to 100% zoom for clear canvas visibility
  });

  // Constrain viewport to boundaries
  const constrainViewport = useCallback((newViewport: ViewportState): ViewportState => {
    const stage = stageRef.current;
    if (!stage) return newViewport;

    const stageWidth = stage.width();
    const stageHeight = stage.height();

    // Calculate the visible area bounds at current scale
    const minX = -canvasWidth * newViewport.scale;
    const maxX = stageWidth;
    const minY = -canvasHeight * newViewport.scale;
    const maxY = stageHeight;

    return {
      ...newViewport,
      x: Math.max(minX, Math.min(maxX, newViewport.x)),
      y: Math.max(minY, Math.min(maxY, newViewport.y)),
      scale: Math.max(0.1, Math.min(4.0, newViewport.scale)),
    };
  }, [stageRef, canvasWidth, canvasHeight]);

  // Handle wheel for zooming
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Zoom factor
    const scaleBy = 1.05;
    const oldScale = viewport.scale;
    
    // Calculate new scale
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Zoom toward cursor position
    const newViewport = constrainViewport({
      scale: newScale,
      x: pointer.x - ((pointer.x - viewport.x) / oldScale) * newScale,
      y: pointer.y - ((pointer.y - viewport.y) / oldScale) * newScale,
    });

    setViewport(newViewport);
  }, [stageRef, viewport, constrainViewport]);

  // Set zoom to specific scale
  const setZoom = useCallback((scale: number) => {
    setViewport(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, scale)) }));
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }));
    toastFunction(`Zoom: ${Math.round(viewport.scale * 1.2 * 100)}%`, 'info', 1000);
  }, [viewport.scale, toastFunction]);

  // Zoom out
  const zoomOut = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: Math.max(0.1, prev.scale / 1.2) }));
    toastFunction(`Zoom: ${Math.round(viewport.scale / 1.2 * 100)}%`, 'info', 1000);
  }, [viewport.scale, toastFunction]);

  // Reset zoom to 100%
  const resetZoom = useCallback(() => {
    setViewport(prev => ({ ...prev, scale: 1 }));
    toastFunction('Zoom reset to 100%', 'success', 1500);
  }, [toastFunction]);

  return {
    viewport,
    setViewport,
    constrainViewport,
    handleWheel,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom
  };
}

