// Base interface for all canvas objects
export interface BaseCanvasObject {
  id: string;
  x: number; // For rectangles/text: top-left corner. For circles: center point. (constrained 0-5000)
  y: number; // For rectangles/text: top-left corner. For circles: center point. (constrained 0-5000)
  color: string; // randomly assigned
  rotation: number;
  createdBy: string;
  modifiedBy: string;
  lockedBy: string | null;
  lockedAt: number | null;
  version: number;
}

// Rectangle shape interface
export interface RectangleObject extends BaseCanvasObject {
  type: 'rectangle';
  width: number;
  height: number;
}

// Circle shape interface
export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  radius: number;
}

// Text shape interface
export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string; // Optional custom text color (defaults to base color field)
  backgroundColor?: string; // Optional background color (defaults to 'transparent')
  width?: number; // For text wrapping
  height?: number; // Auto-calculated based on content
}

// Union type for all canvas objects
export type CanvasObject = RectangleObject | CircleObject | TextObject;

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
