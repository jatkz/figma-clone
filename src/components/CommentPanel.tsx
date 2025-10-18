/**
 * CommentPanel - Sidebar panel for viewing and managing comments
 * 
 * Features:
 * - Display comments for selected object
 * - Filter resolved/unresolved
 * - Add new comments
 * - Real-time updates
 * - Empty state handling
 */

import React, { useState } from 'react';
import { useObjectComments } from '../hooks/useComments';
import { CommentInput } from './CommentInput';
import CommentThread from './CommentThread';
import type { CanvasObject } from '../types/canvas';

interface CommentPanelProps {
  selectedObject: CanvasObject | null;
  currentUserId?: string;
  currentUserName?: string;
  currentUserColor?: string;
  onClose: () => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  selectedObject,
  currentUserId,
  currentUserName,
  currentUserColor,
  onClose,
}) => {
  const [showResolved, setShowResolved] = useState(false);

  const {
    comments,
    unresolvedCount,
    loading,
    addComment,
    toggleResolved,
    removeComment,
  } = useObjectComments(
    selectedObject?.id || null,
    currentUserId,
    currentUserName,
    currentUserColor
  );

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const getObjectTypeLabel = (obj: CanvasObject): string => {
    switch (obj.type) {
      case 'rectangle':
        return 'Rectangle';
      case 'circle':
        return 'Circle';
      case 'text':
        return 'Text';
      default:
        return 'Object';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-gray-300 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {unresolvedCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Close comments panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Selected Object Info */}
      {selectedObject && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: selectedObject.color }}
            />
            <span className="font-medium text-gray-900">
              {getObjectTypeLabel(selectedObject)}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      {comments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">Show resolved comments</span>
            {comments.filter((c) => c.resolved).length > 0 && (
              <span className="text-gray-500">
                ({comments.filter((c) => c.resolved).length})
              </span>
            )}
          </label>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && !selectedObject && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-600 font-medium mb-1">No object selected</p>
            <p className="text-sm text-gray-500">
              Select an object to view or add comments
            </p>
          </div>
        )}

        {!loading && selectedObject && filteredComments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p className="text-gray-600 font-medium mb-1">
              {showResolved ? 'No comments yet' : 'No unresolved comments'}
            </p>
            <p className="text-sm text-gray-500">
              {showResolved
                ? 'Be the first to add a comment'
                : 'All comments have been resolved'}
            </p>
          </div>
        )}

        {!loading && filteredComments.length > 0 && (
          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onToggleResolved={toggleResolved}
                onDelete={removeComment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input Section */}
      {selectedObject && (
        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
          <CommentInput
            onSubmit={addComment}
            placeholder="Add a comment... (@mention others)"
            disabled={!currentUserId}
          />
          {!currentUserId && (
            <p className="text-xs text-red-600 mt-2">
              Please log in to add comments
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Memoize for performance
export default React.memo(CommentPanel);

