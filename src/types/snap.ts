export interface SnapSettings {
  gridEnabled: boolean;
  gridSize: number;
  smartGuidesEnabled: boolean;
  snapThreshold: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  alignmentType: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
}

