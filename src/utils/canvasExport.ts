import Konva from 'konva';
import type { CanvasObject } from '../types/canvas';

export interface CanvasExportParams {
  stage: Konva.Stage;
  objects: CanvasObject[];
  viewport: { x: number; y: number; scale: number };
  selectedObjectIds: string[];
}

export interface ExportOptions {
  format: 'png' | 'svg';
  mode: 'viewport' | 'entire' | 'selected';
  scale: 1 | 2 | 4;
  includeBackground: boolean;
}

/**
 * Export canvas to SVG format
 */
export async function exportToSVG(
  params: CanvasExportParams,
  options: ExportOptions
): Promise<void> {
  const { stage, objects, viewport, selectedObjectIds } = params;

  let exportObjects = objects;
  let viewBoxX = 0;
  let viewBoxY = 0;
  let viewBoxWidth = 5000;
  let viewBoxHeight = 5000;

  if (options.mode === 'viewport') {
    // Export current viewport
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    viewBoxX = -viewport.x / viewport.scale;
    viewBoxY = -viewport.y / viewport.scale;
    viewBoxWidth = stageWidth / viewport.scale;
    viewBoxHeight = stageHeight / viewport.scale;
  } else if (options.mode === 'entire') {
    // Export entire canvas
    viewBoxX = 0;
    viewBoxY = 0;
    viewBoxWidth = 5000;
    viewBoxHeight = 5000;
  } else if (options.mode === 'selected') {
    // Export selected objects only
    if (selectedObjectIds.length === 0) {
      throw new Error('No objects selected');
    }
    
    exportObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
    if (exportObjects.length === 0) {
      throw new Error('Selected objects not found');
    }
    
    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    exportObjects.forEach(obj => {
      const width = 'width' in obj && obj.width ? obj.width : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
      const height = 'height' in obj && obj.height ? obj.height : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
      
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + width);
      maxY = Math.max(maxY, obj.y + height);
    });
    
    const padding = 20;
    viewBoxX = minX - padding;
    viewBoxY = minY - padding;
    viewBoxWidth = maxX - minX + padding * 2;
    viewBoxHeight = maxY - minY + padding * 2;
  }

  // Generate SVG
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${viewBoxWidth}" height="${viewBoxHeight}">
  <defs>
    <style>
      .canvas-object { vector-effect: non-scaling-stroke; }
    </style>
  </defs>
`;

  // Add background if requested
  if (options.includeBackground) {
    svgContent += `  <rect x="${viewBoxX}" y="${viewBoxY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#f9fafb"/>\n`;
  }

  // Add objects
  svgContent += '  <g id="canvas-objects">\n';
  
  exportObjects.forEach(obj => {
    const transform = obj.rotation ? ` transform="rotate(${obj.rotation} ${obj.x + (('width' in obj && obj.width) ? obj.width / 2 : 0)} ${obj.y + (('height' in obj && obj.height) ? obj.height / 2 : 0)})"` : '';
    
    if (obj.type === 'rectangle') {
      svgContent += `    <rect id="${obj.id}" x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" fill="${obj.color}" stroke="none" class="canvas-object"${transform}/>\n`;
    } else if (obj.type === 'circle') {
      svgContent += `    <circle id="${obj.id}" cx="${obj.x + obj.radius}" cy="${obj.y + obj.radius}" r="${obj.radius}" fill="${obj.color}" stroke="none" class="canvas-object"${transform}/>\n`;
    } else if (obj.type === 'text') {
      const textColor = obj.textColor || obj.color;
      const fontSize = obj.fontSize || 16;
      const fontFamily = obj.fontFamily || 'Arial, sans-serif';
      const fontWeight = obj.fontWeight || 'normal';
      const fontStyle = obj.fontStyle || 'normal';
      const textDecoration = obj.textDecoration || 'none';
      const textAlign = obj.textAlign || 'left';
      
      // Calculate text anchor based on alignment
      let textAnchor = 'start';
      let xOffset = 0;
      if (textAlign === 'center') {
        textAnchor = 'middle';
        xOffset = (obj.width || 0) / 2;
      } else if (textAlign === 'right') {
        textAnchor = 'end';
        xOffset = obj.width || 0;
      }
      
      svgContent += `    <text id="${obj.id}" x="${obj.x + xOffset}" y="${obj.y + fontSize}" fill="${textColor}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" text-decoration="${textDecoration}" text-anchor="${textAnchor}" class="canvas-object"${transform}>${obj.text}</text>\n`;
    }
  });
  
  svgContent += '  </g>\n';
  svgContent += '</svg>';

  // Download SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.href = url;
  link.download = `canvas-export-${timestamp}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export canvas to PNG format
 */
export async function exportToPNG(
  params: CanvasExportParams,
  options: ExportOptions
): Promise<void> {
  const { stage, objects, selectedObjectIds } = params;

  let dataURL: string;
  
  if (options.mode === 'viewport') {
    // Export current viewport
    dataURL = stage.toDataURL({
      pixelRatio: options.scale,
      mimeType: 'image/png',
    });
  } else if (options.mode === 'entire') {
    // Export entire canvas (5000x5000)
    // Create a temporary clone of the stage to export
    const tempStage = stage.clone();
    tempStage.setAttrs({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      width: 5000,
      height: 5000,
    });
    
    dataURL = tempStage.toDataURL({
      pixelRatio: options.scale,
      mimeType: 'image/png',
    });
    
    tempStage.destroy();
  } else if (options.mode === 'selected') {
    // Export selected objects only
    if (selectedObjectIds.length === 0) {
      throw new Error('No objects selected');
    }
    
    // Find the bounding box of all selected objects
    const selectedObjects = objects.filter(obj => selectedObjectIds.includes(obj.id));
    if (selectedObjects.length === 0) {
      throw new Error('Selected objects not found');
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    selectedObjects.forEach(obj => {
      const width = 'width' in obj && obj.width ? obj.width : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
      const height = 'height' in obj && obj.height ? obj.height : ('radius' in obj && obj.radius ? obj.radius * 2 : 100);
      
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + width);
      maxY = Math.max(maxY, obj.y + height);
    });
    
    const padding = 20;
    const exportWidth = maxX - minX + padding * 2;
    const exportHeight = maxY - minY + padding * 2;
    
    // Clone the stage and filter to only selected objects
    const tempStage = stage.clone();
    const layers = tempStage.getLayers();
    
    layers.forEach(layer => {
      const children = layer.getChildren();
      children.forEach(child => {
        // Remove objects that are not selected
        const id = child.id();
        if (id && !selectedObjectIds.includes(id)) {
          child.destroy();
        }
      });
    });
    
    tempStage.setAttrs({
      x: -(minX - padding),
      y: -(minY - padding),
      scaleX: 1,
      scaleY: 1,
      width: exportWidth,
      height: exportHeight,
    });
    
    dataURL = tempStage.toDataURL({
      pixelRatio: options.scale,
      mimeType: 'image/png',
    });
    
    tempStage.destroy();
  } else {
    throw new Error('Invalid export mode');
  }
  
  // Convert data URL to blob and download
  const response = await fetch(dataURL);
  const blob = await response.blob();
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.href = url;
  link.download = `canvas-export-${timestamp}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

