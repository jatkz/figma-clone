import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToCursors, type CursorData } from '../services/canvasService';

interface UserListProps {
  className?: string;
}

const UserList: React.FC<UserListProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [allCursors, setAllCursors] = useState<Map<string, CursorData>>(new Map());

  // Subscribe to cursors for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToCursors((cursors) => {
      setAllCursors(cursors);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Convert cursors map to sorted array for display
  const users = Array.from(allCursors.entries())
    .map(([userId, cursorData]) => ({ userId, cursorData }))
    .sort((a, b) => {
      // Current user first, then alphabetical by name
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      return a.cursorData.name.localeCompare(b.cursorData.name);
    });

  if (users.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-4 ${className}`}>
        <p className="text-sm">No users online</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Online Users ({users.length})
      </h3>
      
      {users.map(({ userId, cursorData }) => {
        const isCurrentUser = userId === user?.id;
        
        return (
          <div
            key={userId}
            className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {/* Status dot with user's cursor color */}
            <div
              className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: cursorData.color }}
              title={`${cursorData.name}'s cursor color`}
            />
            
            {/* User name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {cursorData.name}
                {isCurrentUser && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    You
                  </span>
                )}
              </p>
              {/* Last seen indicator */}
              <p className="text-xs text-gray-500">
                {isCurrentUser ? 'Online now' : formatLastSeen(cursorData.lastSeen)}
              </p>
            </div>

            {/* Online status indicator */}
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Format last seen timestamp into a human-readable string
 */
const formatLastSeen = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  
  if (diffSeconds < 10) {
    return 'Just now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else {
    return 'More than 1h ago';
  }
};

export default UserList;
