export interface CanvasObject {
  id: string;
  type: 'rectangle';
  x: number; // constrained 0-5000
  y: number; // constrained 0-5000
  width: number;
  height: number;
  color: string; // randomly assigned
  rotation: number;
  createdBy: string;
  modifiedBy: string;
  lockedBy: string | null;
  lockedAt: number | null;
  version: number;
}

export interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
  lastSeen: number;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  cursorColor: string;
  createdAt: number;
}

export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
export const CANVAS_CENTER_X = 2500;
export const CANVAS_CENTER_Y = 2500;
