/**
 * CommentInput - Text input for creating new comments
 * 
 * Features:
 * - Multi-line textarea
 * - @mention detection
 * - Submit on Ctrl+Enter
 * - Character counter
 */

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { parseMentions } from '../services/commentService';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Add a comment... (@mention others)',
  autoFocus = false,
  disabled = false,
}) => {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmedContent = content.trim();
    if (trimmedContent && !disabled) {
      onSubmit(trimmedContent);
      setContent('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const mentions = parseMentions(content);
  const hasContent = content.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className={`relative rounded-lg border ${
        isFocused ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
      }`}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg resize-none focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[80px]"
          style={{ maxHeight: '200px' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {mentions.length > 0 && (
            <span className="text-blue-600">
              Mentioning: {mentions.map(m => `@${m}`).join(', ')}
            </span>
          )}
          {!mentions.length && (
            <span>
              Tip: Use @username to mention others • {' '}
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">
                Ctrl+Enter
              </kbd>{' '}
              to submit
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!hasContent || disabled}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            hasContent && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Comment
        </button>
      </div>
    </div>
  );
};

