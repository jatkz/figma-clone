import React, { useState } from 'react';

export type ExportMode = 'viewport' | 'entire' | 'selected';
export type ExportScale = 1 | 2 | 4;

export interface ExportOptions {
  mode: ExportMode;
  scale: ExportScale;
  includeBackground: boolean;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  hasSelection: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  hasSelection 
}) => {
  const [mode, setMode] = useState<ExportMode>('viewport');
  const [scale, setScale] = useState<ExportScale>(2);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    
    try {
      await onExport({ mode, scale, includeBackground });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Export Canvas</h2>
              <button
                onClick={handleClose}
                disabled={isExporting}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Export Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Export Area
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: mode === 'viewport' ? '#3B82F6' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    name="mode"
                    value="viewport"
                    checked={mode === 'viewport'}
                    onChange={(e) => setMode(e.target.value as ExportMode)}
                    disabled={isExporting}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Current Viewport</div>
                    <div className="text-sm text-gray-500">Export what you currently see</div>
                  </div>
                </label>

                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: mode === 'entire' ? '#3B82F6' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    name="mode"
                    value="entire"
                    checked={mode === 'entire'}
                    onChange={(e) => setMode(e.target.value as ExportMode)}
                    disabled={isExporting}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Entire Canvas</div>
                    <div className="text-sm text-gray-500">Export the full 5000×5000 canvas</div>
                  </div>
                </label>

                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${!hasSelection ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ borderColor: mode === 'selected' ? '#3B82F6' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    name="mode"
                    value="selected"
                    checked={mode === 'selected'}
                    onChange={(e) => setMode(e.target.value as ExportMode)}
                    disabled={isExporting || !hasSelection}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Selected Objects Only</div>
                    <div className="text-sm text-gray-500">
                      {hasSelection ? 'Export only selected objects' : 'No objects selected'}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Scale */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Resolution Scale
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s as ExportScale)}
                    disabled={isExporting}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors border-2 ${
                      scale === s
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Higher scales produce larger, higher quality images
              </p>
            </div>

            {/* Background */}
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBackground}
                  onChange={(e) => setIncludeBackground(e.target.checked)}
                  disabled={isExporting}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">
                  Include background grid
                </span>
              </label>
              <p className="mt-1 ml-6 text-xs text-gray-500">
                Uncheck for transparent background
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (mode === 'selected' && !hasSelection)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PNG
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportDialog;

