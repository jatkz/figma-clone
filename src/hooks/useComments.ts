/**
 * useComments Hook - React hook for comment management
 * 
 * Provides real-time comment sync and CRUD operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Comment, CommentThread, CreateCommentData } from '../types/comments';
import {
  createComment,
  updateComment,
  deleteComment,
  resolveComment,
  unresolveComment,
  subscribeToComments,
  subscribeToObjectComments,
  parseMentions,
} from '../services/commentService';
import { useToastContext } from '../contexts/ToastContext';

/**
 * Hook for managing all comments with real-time sync
 */
export const useComments = (userId?: string, userName?: string, userColor?: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const toastContext = useToastContext();
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    toastContext.addToast(message, type);
  };

  // Subscribe to all comments
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToComments((updatedComments) => {
      setComments(updatedComments);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Create a new comment
  const addComment = useCallback(
    async (data: CreateCommentData) => {
      if (!userId || !userName || !userColor) {
        showToast('Please log in to add comments', 'error');
        return;
      }

      try {
        const mentions = parseMentions(data.content);
        await createComment(
          { ...data, mentions },
          userId,
          userName,
          userColor
        );
        showToast('Comment added', 'success');
      } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
      }
    },
    [userId, userName, userColor, showToast]
  );

  // Update a comment
  const editComment = useCallback(
    async (commentId: string, content: string) => {
      try {
        await updateComment(commentId, { content });
        showToast('Comment updated', 'success');
      } catch (error) {
        console.error('Error updating comment:', error);
        showToast('Failed to update comment', 'error');
      }
    },
    [showToast]
  );

  // Delete a comment
  const removeComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteComment(commentId);
        showToast('Comment deleted', 'success');
      } catch (error) {
        console.error('Error deleting comment:', error);
        showToast('Failed to delete comment', 'error');
      }
    },
    [showToast]
  );

  // Toggle resolved status
  const toggleResolved = useCallback(
    async (commentId: string, currentlyResolved: boolean) => {
      if (!userId) {
        showToast('Please log in to resolve comments', 'error');
        return;
      }

      try {
        if (currentlyResolved) {
          await unresolveComment(commentId);
          showToast('Comment reopened', 'success');
        } else {
          await resolveComment(commentId, userId);
          showToast('Comment resolved', 'success');
        }
      } catch (error) {
        console.error('Error toggling comment resolution:', error);
        showToast('Failed to update comment', 'error');
      }
    },
    [userId, showToast]
  );

  // Get comments for a specific object
  const getCommentsForObject = useCallback(
    (objectId: string) => {
      return comments.filter((c) => c.objectId === objectId);
    },
    [comments]
  );

  // Get unresolved comment count for an object
  const getUnresolvedCount = useCallback(
    (objectId: string) => {
      return comments.filter((c) => c.objectId === objectId && !c.resolved).length;
    },
    [comments]
  );

  // Get comment threads grouped by object
  const commentThreads = useMemo(() => {
    const threads: Record<string, CommentThread> = {};
    
    comments.forEach((comment) => {
      if (!threads[comment.objectId]) {
        threads[comment.objectId] = {
          objectId: comment.objectId,
          comments: [],
          unresolvedCount: 0,
          totalCount: 0,
        };
      }
      
      threads[comment.objectId].comments.push(comment);
      threads[comment.objectId].totalCount++;
      if (!comment.resolved) {
        threads[comment.objectId].unresolvedCount++;
      }
    });

    return threads;
  }, [comments]);

  return {
    comments,
    commentThreads,
    loading,
    addComment,
    editComment,
    removeComment,
    toggleResolved,
    getCommentsForObject,
    getUnresolvedCount,
  };
};

/**
 * Hook for managing comments on a specific object
 */
export const useObjectComments = (
  objectId: string | null,
  userId?: string,
  userName?: string,
  userColor?: string
) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const toastContext = useToastContext();
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    toastContext.addToast(message, type);
  };

  // Subscribe to object-specific comments
  useEffect(() => {
    if (!objectId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToObjectComments(objectId, (updatedComments) => {
      setComments(updatedComments);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [objectId]);

  // Create a new comment
  const addComment = useCallback(
    async (content: string) => {
      if (!objectId) return;
      if (!userId || !userName || !userColor) {
        showToast('Please log in to add comments', 'error');
        return;
      }

      try {
        const mentions = parseMentions(content);
        await createComment(
          { objectId, content, mentions },
          userId,
          userName,
          userColor
        );
      } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
      }
    },
    [objectId, userId, userName, userColor, showToast]
  );

  // Toggle resolved status
  const toggleResolved = useCallback(
    async (commentId: string, currentlyResolved: boolean) => {
      if (!userId) {
        showToast('Please log in to resolve comments', 'error');
        return;
      }

      try {
        if (currentlyResolved) {
          await unresolveComment(commentId);
        } else {
          await resolveComment(commentId, userId);
        }
      } catch (error) {
        console.error('Error toggling comment resolution:', error);
        showToast('Failed to update comment', 'error');
      }
    },
    [userId, showToast]
  );

  // Delete a comment
  const removeComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteComment(commentId);
      } catch (error) {
        console.error('Error deleting comment:', error);
        showToast('Failed to delete comment', 'error');
      }
    },
    [showToast]
  );

  const unresolvedCount = useMemo(
    () => comments.filter((c) => !c.resolved).length,
    [comments]
  );

  return {
    comments,
    unresolvedCount,
    loading,
    addComment,
    toggleResolved,
    removeComment,
  };
};

