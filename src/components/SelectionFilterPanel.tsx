import React, { useState, useEffect } from 'react';
import type { CanvasObject } from '../types/canvas';
import type { FilterCriteria } from '../types/filters';
import { 
  applyFilters, 
  hasActiveFilters, 
  clearFilters,
  getUniqueColorsFromObjects,
  getSizeRange
} from '../utils/filterUtils';

interface SelectionFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  objects: CanvasObject[];
  currentUserId?: string;
  onPreview: (matchingIds: string[]) => void;
  onApply: (matchingIds: string[]) => void;
}

const SelectionFilterPanel: React.FC<SelectionFilterPanelProps> = ({
  isOpen,
  onClose,
  objects,
  currentUserId,
  onPreview,
  onApply
}) => {
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [livePreview, setLivePreview] = useState(true);
  
  // Get available options from objects
  const availableColors = getUniqueColorsFromObjects(objects);
  const sizeRange = getSizeRange(objects);
  
  // Calculate matching objects
  const matchingObjects = applyFilters(objects, criteria, currentUserId);
  const matchingIds = matchingObjects.map(obj => obj.id);
  const matchingCount = matchingObjects.length;
  
  // Live preview effect
  useEffect(() => {
    if (livePreview && isOpen) {
      onPreview(matchingIds);
    }
  }, [matchingIds, livePreview, isOpen, onPreview]);
  
  // Clear preview when panel closes
  useEffect(() => {
    if (!isOpen) {
      onPreview([]);
    }
  }, [isOpen, onPreview]);
  
  const handleTypeToggle = (type: 'rectangle' | 'circle' | 'text') => {
    setCriteria(prev => {
      const types = prev.types || [];
      const newTypes = types.includes(type)
        ? types.filter(t => t !== type)
        : [...types, type];
      return { ...prev, types: newTypes.length > 0 ? newTypes : undefined };
    });
  };
  
  const handleColorToggle = (color: string) => {
    setCriteria(prev => {
      const colors = prev.colors || [];
      const newColors = colors.includes(color)
        ? colors.filter(c => c !== color)
        : [...colors, color];
      return { ...prev, colors: newColors.length > 0 ? newColors : undefined };
    });
  };
  
  const handleClearFilters = () => {
    setCriteria(clearFilters());
  };
  
  const handleApply = () => {
    onApply(matchingIds);
    onClose();
  };
  
  if (!isOpen) return null;
  
  const hasFilters = hasActiveFilters(criteria);
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Selection Filters</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Matching count and preview toggle */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{matchingCount}</span> of {objects.length} objects match
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livePreview}
                  onChange={(e) => setLivePreview(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Live Preview
              </label>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Type Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Object Type</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTypeToggle('rectangle')}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      criteria.types?.includes('rectangle')
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ◻️ Rectangle
                  </button>
                  <button
                    onClick={() => handleTypeToggle('circle')}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      criteria.types?.includes('circle')
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ⚪ Circle
                  </button>
                  <button
                    onClick={() => handleTypeToggle('text')}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      criteria.types?.includes('text')
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    🔤 Text
                  </button>
                </div>
              </div>
              
              {/* Color Filter */}
              {availableColors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorToggle(color)}
                        className={`relative w-12 h-12 rounded-lg border-2 transition-all ${
                          criteria.colors?.includes(color)
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {criteria.colors?.includes(color) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Size Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Size Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Width */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Width</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder={`Min (${sizeRange.minWidth})`}
                        value={criteria.minWidth ?? ''}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          minWidth: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder={`Max (${sizeRange.maxWidth})`}
                        value={criteria.maxWidth ?? ''}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          maxWidth: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Height */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Height</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder={`Min (${sizeRange.minHeight})`}
                        value={criteria.minHeight ?? ''}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          minHeight: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        placeholder={`Max (${sizeRange.maxHeight})`}
                        value={criteria.maxHeight ?? ''}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          maxHeight: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Creator Filter */}
              {currentUserId && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Created By</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={criteria.createdByMe || false}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          createdByMe: e.target.checked || undefined,
                          createdByOthers: e.target.checked ? undefined : prev.createdByOthers
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Objects I created
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={criteria.createdByOthers || false}
                        onChange={(e) => setCriteria(prev => ({
                          ...prev,
                          createdByOthers: e.target.checked || undefined,
                          createdByMe: e.target.checked ? undefined : prev.createdByMe
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Objects created by others
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleClearFilters}
                disabled={!hasFilters}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  hasFilters
                    ? 'text-gray-700 hover:bg-gray-200'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                Clear Filters
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={matchingCount === 0}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    matchingCount > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Select {matchingCount} Object{matchingCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectionFilterPanel;

