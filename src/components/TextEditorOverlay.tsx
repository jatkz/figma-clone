import React, { useRef, useEffect, useState, useCallback } from 'react';
import type Konva from 'konva';
import type { TextObject } from '../types/canvas';

interface TextEditorOverlayProps {
  textObject: TextObject;
  viewport: { x: number; y: number; scale: number };
  stageRef: React.RefObject<Konva.Stage | null>;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  textObject,
  viewport,
  stageRef,
  onSave,
  onCancel,
}) => {
  const [editedText, setEditedText] = useState(textObject.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const throttleTimerRef = useRef<number | null>(null);

  // Calculate text dimensions
  const textWidth = textObject.width || textObject.text.length * textObject.fontSize * 0.6;
  const textHeight = textObject.height || textObject.fontSize * 1.2;

  // Calculate textarea position in screen coordinates
  const getTextareaPosition = useCallback(() => {
    if (!stageRef.current) return { left: 0, top: 0, width: 100, minHeight: 20 };
    
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    
    // Convert canvas coordinates to screen coordinates
    const screenX = textObject.x * viewport.scale + viewport.x + stageBox.left;
    const screenY = textObject.y * viewport.scale + viewport.y + stageBox.top;
    
    return {
      left: screenX,
      top: screenY,
      width: textWidth * viewport.scale,
      minHeight: textHeight * viewport.scale,
    };
  }, [textObject.x, textObject.y, textWidth, textHeight, viewport, stageRef]);

  // Focus textarea when mounting
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Handle text change with throttled updates
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedText(newText);

    // Throttle updates to 200ms
    if (throttleTimerRef.current) {
      window.clearTimeout(throttleTimerRef.current);
    }
    
    throttleTimerRef.current = window.setTimeout(() => {
      // Send throttled update (for live preview to other users)
      onSave(newText);
    }, 200);
  }, [onSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      // Cancel editing
      e.preventDefault();
      if (throttleTimerRef.current) {
        window.clearTimeout(throttleTimerRef.current);
      }
      onCancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      // Save and exit
      e.preventDefault();
      if (throttleTimerRef.current) {
        window.clearTimeout(throttleTimerRef.current);
      }
      onSave(editedText);
    }
  }, [editedText, onSave, onCancel]);

  // Handle click outside to save
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        // Clear any pending throttled updates
        if (throttleTimerRef.current) {
          window.clearTimeout(throttleTimerRef.current);
        }
        // Save and exit
        onSave(editedText);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clean up throttle timer on unmount
      if (throttleTimerRef.current) {
        window.clearTimeout(throttleTimerRef.current);
      }
    };
  }, [editedText, onSave]);

  const pos = getTextareaPosition();

  return (
    <textarea
      ref={textareaRef}
      value={editedText}
      onChange={handleTextChange}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        width: `${pos.width}px`,
        minHeight: `${pos.minHeight}px`,
        fontSize: `${textObject.fontSize * viewport.scale}px`,
        fontFamily: textObject.fontFamily || 'Arial, sans-serif',
        fontWeight: textObject.fontWeight || 'normal',
        fontStyle: textObject.fontStyle || 'normal',
        textDecoration: textObject.textDecoration || 'none',
        textAlign: textObject.textAlign || 'left',
        color: textObject.textColor || textObject.color,
        backgroundColor: textObject.backgroundColor || 'transparent',
        border: '2px solid #007AFF',
        borderRadius: '2px',
        padding: '2px 4px',
        resize: 'none',
        overflow: 'hidden',
        lineHeight: '1.2',
        zIndex: 1000,
        outline: 'none',
      }}
    />
  );
};

export default TextEditorOverlay;

