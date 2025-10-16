import React, { useCallback } from 'react';
import type { TextObject } from '../types/canvas';

interface TextFormattingToolbarProps {
  textObject: TextObject;
  onUpdateFormatting: (updates: Partial<TextObject>) => void;
  canEdit: boolean; // Whether user has lock
}

const FONT_FAMILIES = [
  'Arial, sans-serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Georgia, serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Comic Sans MS, cursive',
  'Impact, fantasy',
];

const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  textObject,
  onUpdateFormatting,
  canEdit,
}) => {
  // Get current values with defaults
  const fontFamily = textObject.fontFamily || 'Arial, sans-serif';
  const fontSize = textObject.fontSize || 16;
  const fontWeight = textObject.fontWeight || 'normal';
  const fontStyle = textObject.fontStyle || 'normal';
  const textDecoration = textObject.textDecoration || 'none';
  const textAlign = textObject.textAlign || 'left';
  const textColor = textObject.textColor || textObject.color;
  const backgroundColor = textObject.backgroundColor || 'transparent';

  const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateFormatting({ fontFamily: e.target.value });
  }, [onUpdateFormatting]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 8 && value <= 72) {
      onUpdateFormatting({ fontSize: value });
    }
  }, [onUpdateFormatting]);

  const toggleBold = useCallback(() => {
    onUpdateFormatting({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' });
  }, [fontWeight, onUpdateFormatting]);

  const toggleItalic = useCallback(() => {
    onUpdateFormatting({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' });
  }, [fontStyle, onUpdateFormatting]);

  const toggleUnderline = useCallback(() => {
    onUpdateFormatting({ textDecoration: textDecoration === 'underline' ? 'none' : 'underline' });
  }, [textDecoration, onUpdateFormatting]);

  const handleTextAlignChange = useCallback((align: 'left' | 'center' | 'right') => {
    onUpdateFormatting({ textAlign: align });
  }, [onUpdateFormatting]);

  const handleTextColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormatting({ textColor: e.target.value });
  }, [onUpdateFormatting]);

  const handleBackgroundColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFormatting({ backgroundColor: e.target.value });
  }, [onUpdateFormatting]);

  const handleTransparentBackground = useCallback(() => {
    onUpdateFormatting({ backgroundColor: 'transparent' });
  }, [onUpdateFormatting]);

  if (!canEdit) {
    return null; // Don't show toolbar if user doesn't have lock
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
        {/* Font Family Dropdown */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600 font-medium">Font:</label>
          <select
            value={fontFamily}
            onChange={handleFontFamilyChange}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Font Family"
          >
            {FONT_FAMILIES.map(font => (
              <option key={font} value={font}>
                {font.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Input */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600 font-medium">Size:</label>
          <input
            type="number"
            value={fontSize}
            onChange={handleFontSizeChange}
            min={8}
            max={72}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Font Size (8-72)"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Text Style Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleBold}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              fontWeight === 'bold' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Bold (Ctrl/Cmd+B)"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            onClick={toggleItalic}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              fontStyle === 'italic' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Italic (Ctrl/Cmd+I)"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            onClick={toggleUnderline}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              textDecoration === 'underline' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Underline (Ctrl/Cmd+U)"
          >
            <span className="underline text-sm">U</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTextAlignChange('left')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              textAlign === 'left' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Align Left"
          >
            <span className="text-lg leading-none">⬅</span>
          </button>
          <button
            onClick={() => handleTextAlignChange('center')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              textAlign === 'center' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Align Center"
          >
            <span className="text-lg leading-none">↔</span>
          </button>
          <button
            onClick={() => handleTextAlignChange('right')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors border ${
              textAlign === 'right' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Align Right"
          >
            <span className="text-lg leading-none">➡</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300"></div>

        {/* Text Color Picker */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600 font-medium">Text:</label>
          <div className="relative">
            <input
              type="color"
              value={textColor}
              onChange={handleTextColorChange}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              title="Text Color"
            />
          </div>
        </div>

        {/* Background Color Picker */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-600 font-medium">BG:</label>
          <div className="relative flex items-center gap-1">
            <input
              type="color"
              value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
              onChange={handleBackgroundColorChange}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              title="Background Color"
            />
            {backgroundColor !== 'transparent' && (
              <button
                onClick={handleTransparentBackground}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-600"
                title="Clear Background"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextFormattingToolbar;

