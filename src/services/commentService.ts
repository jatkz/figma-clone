/**
 * Comment Service - Firestore operations for collaborative comments
 * 
 * Handles CRUD operations for comments with real-time sync
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Comment, CreateCommentData, UpdateCommentData } from '../types/comments';

const CANVAS_ID = 'global';

/**
 * Get reference to comments collection
 */
const getCommentsRef = () => {
  return collection(db, 'canvas', CANVAS_ID, 'comments');
};

/**
 * Create a new comment on an object
 */
export const createComment = async (
  commentData: CreateCommentData,
  userId: string,
  userName: string,
  userColor: string
): Promise<string> => {
  try {
    const commentsRef = getCommentsRef();
    const docRef = await addDoc(commentsRef, {
      objectId: commentData.objectId,
      content: commentData.content,
      createdBy: userId,
      createdByName: userName,
      createdByColor: userColor,
      createdAt: serverTimestamp(),
      resolved: false,
      mentions: commentData.mentions || [],
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

/**
 * Update an existing comment
 */
export const updateComment = async (
  commentId: string,
  updates: UpdateCommentData
): Promise<void> => {
  try {
    const commentRef = doc(db, 'canvas', CANVAS_ID, 'comments', commentId);
    await updateDoc(commentRef, {
      ...updates,
      modifiedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    const commentRef = doc(db, 'canvas', CANVAS_ID, 'comments', commentId);
    await deleteDoc(commentRef);
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Mark a comment as resolved
 */
export const resolveComment = async (
  commentId: string,
  userId: string
): Promise<void> => {
  try {
    await updateComment(commentId, {
      resolved: true,
      resolvedBy: userId,
      resolvedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error resolving comment:', error);
    throw error;
  }
};

/**
 * Mark a comment as unresolved
 */
export const unresolveComment = async (commentId: string): Promise<void> => {
  try {
    await updateComment(commentId, {
      resolved: false,
      resolvedBy: undefined,
      resolvedAt: undefined,
    });
  } catch (error) {
    console.error('Error unresolving comment:', error);
    throw error;
  }
};

/**
 * Subscribe to all comments (real-time)
 */
export const subscribeToComments = (
  callback: (comments: Comment[]) => void
): (() => void) => {
  const commentsRef = getCommentsRef();
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        objectId: data.objectId,
        content: data.content,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByColor: data.createdByColor,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : Date.now(),
        modifiedAt: data.modifiedAt instanceof Timestamp 
          ? data.modifiedAt.toMillis() 
          : undefined,
        resolved: data.resolved || false,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt,
        mentions: data.mentions || [],
      });
    });
    callback(comments);
  });
};

/**
 * Subscribe to comments for a specific object (real-time)
 */
export const subscribeToObjectComments = (
  objectId: string,
  callback: (comments: Comment[]) => void
): (() => void) => {
  const commentsRef = getCommentsRef();
  const q = query(
    commentsRef, 
    where('objectId', '==', objectId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        objectId: data.objectId,
        content: data.content,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByColor: data.createdByColor,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : Date.now(),
        modifiedAt: data.modifiedAt instanceof Timestamp 
          ? data.modifiedAt.toMillis() 
          : undefined,
        resolved: data.resolved || false,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt,
        mentions: data.mentions || [],
      });
    });
    callback(comments);
  });
};

/**
 * Get all comments for an object (one-time fetch)
 */
export const getObjectComments = async (objectId: string): Promise<Comment[]> => {
  try {
    const commentsRef = getCommentsRef();
    const q = query(
      commentsRef,
      where('objectId', '==', objectId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        objectId: data.objectId,
        content: data.content,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByColor: data.createdByColor,
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : Date.now(),
        modifiedAt: data.modifiedAt instanceof Timestamp 
          ? data.modifiedAt.toMillis() 
          : undefined,
        resolved: data.resolved || false,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt,
        mentions: data.mentions || [],
      });
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting object comments:', error);
    throw error;
  }
};

/**
 * Parse @mentions from comment text
 * Returns array of mentioned user names
 */
export const parseMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.matchAll(mentionRegex);
  return Array.from(matches, m => m[1]);
};

/**
 * Delete all comments for an object (used when object is deleted)
 */
export const deleteObjectComments = async (objectId: string): Promise<void> => {
  try {
    const comments = await getObjectComments(objectId);
    const deletePromises = comments.map(comment => deleteComment(comment.id));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting object comments:', error);
    throw error;
  }
};

