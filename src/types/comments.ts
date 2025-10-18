/**
 * Comment Types - Collaborative Annotations Feature
 * 
 * Supports object-level comments with real-time sync
 */

export interface Comment {
  id: string;
  objectId: string;  // ID of the canvas object this comment is attached to
  content: string;
  createdBy: string;  // userId
  createdByName: string;  // Denormalized for display
  createdByColor: string;  // User's cursor color for visual consistency
  createdAt: number;
  modifiedAt?: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  mentions?: string[];  // Array of userIds mentioned in the comment
}

export interface CommentThread {
  objectId: string;
  comments: Comment[];
  unresolvedCount: number;
  totalCount: number;
}

export interface CreateCommentData {
  objectId: string;
  content: string;
  mentions?: string[];
}

export interface UpdateCommentData {
  content?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}

