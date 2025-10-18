/**
 * CommentThread - Display a single comment with actions
 * 
 * Features:
 * - Comment content with author info
 * - Resolve/unresolve toggle
 * - Delete option (for comment author)
 * - Timestamp display
 * - Visual indicators for resolved state
 */

import React, { useState } from 'react';
import type { Comment } from '../types/comments';
import { formatDistanceToNow } from 'date-fns';

interface CommentThreadProps {
  comment: Comment;
  currentUserId?: string;
  onToggleResolved: (commentId: string, currentlyResolved: boolean) => void;
  onDelete: (commentId: string) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  currentUserId,
  onToggleResolved,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);
  const isAuthor = currentUserId === comment.createdBy;

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
    }
  };

  return (
    <div
      className={`group relative p-3 rounded-lg border transition-colors ${
        comment.resolved
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300 hover:border-gray-400'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Author Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Author Avatar */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: comment.createdByColor }}
            title={comment.createdByName}
          >
            {comment.createdByName.charAt(0).toUpperCase()}
          </div>

          {/* Author Name & Time */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {comment.createdByName}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(comment.createdAt)}
            </span>
          </div>
        </div>

        {/* Resolved Badge */}
        {comment.resolved && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Resolved
          </div>
        )}
      </div>

      {/* Comment Content */}
      <div className={`text-sm mb-2 whitespace-pre-wrap ${
        comment.resolved ? 'text-gray-600 line-through' : 'text-gray-900'
      }`}>
        {comment.content}
      </div>

      {/* Mentions */}
      {comment.mentions && comment.mentions.length > 0 && (
        <div className="text-xs text-blue-600 mb-2">
          {comment.mentions.map((mention, idx) => (
            <span key={idx} className="mr-2">
              @{mention}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          {/* Resolve/Unresolve Button */}
          <button
            onClick={() => onToggleResolved(comment.id, comment.resolved)}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
              comment.resolved
                ? 'text-gray-600 hover:bg-gray-200'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {comment.resolved ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reopen
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Resolve
              </span>
            )}
          </button>

          {/* Delete Button (only for author) */}
          {isAuthor && (
            <button
              onClick={handleDelete}
              className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </span>
            </button>
          )}
        </div>
      )}

      {/* Resolved By Info */}
      {comment.resolved && comment.resolvedBy && comment.resolvedAt && (
        <div className="text-xs text-gray-500 mt-2 italic">
          Resolved {formatTime(comment.resolvedAt)}
        </div>
      )}
    </div>
  );
};

// Memoize for performance
export default React.memo(CommentThread);

