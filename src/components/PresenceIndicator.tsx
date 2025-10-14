import React, { useState, useEffect } from 'react';
import { subscribeToCursors, cleanupStaleCursors, type CursorData } from '../services/canvasService';
import { useAuth } from '../hooks/useAuth';

interface PresenceIndicatorProps {}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, CursorData>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to cursors for presence data
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToCursors((cursors) => {
      // Include all users (including current user for presence count)
      setOnlineUsers(cursors);
    });

    return unsubscribe;
  }, [user?.id]);

  // Cleanup stale cursors every 10 seconds
  useEffect(() => {
    if (!user?.id) return;

    const cleanup = async () => {
      try {
        await cleanupStaleCursors(user.id);
      } catch (error) {
        console.warn('Failed to cleanup stale cursors:', error);
      }
    };

    // Initial cleanup after 10 seconds
    const initialTimeout = setTimeout(cleanup, 10000);

    // Then cleanup every 10 seconds
    const interval = setInterval(cleanup, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user?.id]);

  const totalUsers = onlineUsers.size;
  const otherUsers = Array.from(onlineUsers.entries()).filter(([userId]) => userId !== user?.id);
  const displayUsers = isExpanded ? otherUsers : otherUsers.slice(0, 5);
  const hiddenCount = Math.max(0, otherUsers.length - 5);

  if (totalUsers === 0) {
    return null; // Don't show anything if no users online
  }

  return (
    <div 
      className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5 min-w-fit"
      style={{ gap: '6px' }}
    >
      {/* Online indicator and count */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {totalUsers} user{totalUsers !== 1 ? 's' : ''}
        </span>
      </div>

      {/* User avatars */}
      {(displayUsers.length > 0 || user) && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {displayUsers.map(([userId, cursorData]) => (
            <div
              key={userId}
              className="relative"
              title={`${cursorData.name} (${userId === user?.id ? 'You' : 'Online'})`}
            >
              {/* User avatar circle */}
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-semibold text-white hover:scale-110 transition-transform"
                style={{ backgroundColor: cursorData.color }}
              >
                {cursorData.name.charAt(0).toUpperCase()}
              </div>
            </div>
          ))}

          {/* Current user avatar (always shown) */}
          {user && (
            <div
              className="relative ml-1"
              title={`${user.displayName} (You)`}
            >
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-semibold text-white ring-2 ring-blue-400 hover:scale-110 transition-transform"
                style={{ backgroundColor: user.cursorColor }}
              >
                {user.displayName?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* "+N more" indicator */}
      {!isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
        >
          +{hiddenCount} more
        </button>
      )}

      {/* Collapse button when expanded */}
      {isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
        >
          Show less
        </button>
      )}
    </div>
  );
};

export default PresenceIndicator;
