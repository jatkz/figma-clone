import React, { useState, useEffect } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: 'Tools' | 'Selection' | 'Editing' | 'Transform' | 'Canvas' | 'General';
}

const shortcuts: Shortcut[] = [
  // Tools
  { keys: ['V'], description: 'Select tool', category: 'Tools' },
  { keys: ['R'], description: 'Rectangle tool', category: 'Tools' },
  { keys: ['C'], description: 'Circle tool', category: 'Tools' },
  { keys: ['T'], description: 'Text tool', category: 'Tools' },
  { keys: ['Esc'], description: 'Switch to Select tool', category: 'Tools' },
  
  // Selection
  { keys: ['Ctrl', 'A'], description: 'Select all objects', category: 'Selection' },
  { keys: ['Tab'], description: 'Select next object', category: 'Selection' },
  { keys: ['Shift', 'Tab'], description: 'Select previous object', category: 'Selection' },
  { keys: ['Esc'], description: 'Deselect all', category: 'Selection' },
  
  // Editing
  { keys: ['Ctrl', 'C'], description: 'Copy selected objects', category: 'Editing' },
  { keys: ['Ctrl', 'X'], description: 'Cut selected objects', category: 'Editing' },
  { keys: ['Ctrl', 'V'], description: 'Paste objects (coming soon)', category: 'Editing' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate selected objects', category: 'Editing' },
  { keys: ['Delete'], description: 'Delete selected objects', category: 'Editing' },
  { keys: ['Backspace'], description: 'Delete selected objects', category: 'Editing' },
  
  // Transform
  { keys: ['['], description: 'Rotate 90° counter-clockwise', category: 'Transform' },
  { keys: [']'], description: 'Rotate 90° clockwise', category: 'Transform' },
  { keys: ['Ctrl', 'Shift', 'R'], description: 'Reset rotation to 0°', category: 'Transform' },
  
  // Canvas
  { keys: ['Ctrl', '0'], description: 'Reset zoom to 100%', category: 'Canvas' },
  { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'Canvas' },
  { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'Canvas' },
  { keys: ['Space', 'Drag'], description: 'Pan canvas', category: 'Canvas' },
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Export canvas (coming soon)', category: 'Canvas' },
  
  // General
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'General' },
  { keys: ['Esc'], description: 'Close dialogs', category: 'General' },
];

interface ShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);

  // Filter shortcuts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredShortcuts(shortcuts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredShortcuts(
        shortcuts.filter(
          (shortcut) =>
            shortcut.description.toLowerCase().includes(query) ||
            shortcut.keys.some((key) => key.toLowerCase().includes(query)) ||
            shortcut.category.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const categories: Array<'Tools' | 'Selection' | 'Editing' | 'Transform' | 'Canvas' | 'General'> = [
    'Tools',
    'Selection',
    'Editing',
    'Transform',
    'Canvas',
    'General',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-180px)]">
            {filteredShortcuts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No shortcuts found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryShortcuts = groupedShortcuts[category];
                  if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

                  return (
                    <div key={category}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>
                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut, index) => (
                          <div
                            key={`${category}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-gray-700">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <React.Fragment key={keyIndex}>
                                  {keyIndex > 0 && (
                                    <span className="text-gray-400 text-sm mx-1">+</span>
                                  )}
                                  <kbd className="px-2.5 py-1.5 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                                    {key === 'Ctrl' && navigator.platform.includes('Mac') ? '⌘' : key}
                                  </kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShortcutsPanel;

