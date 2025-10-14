import React, { useState } from 'react';

// Define available tools
export type ToolType = 'select' | 'rectangle' | 'circle' | 'text';

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ activeTool, onToolChange }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 flex flex-col gap-2">
      <h3 className="text-xs font-medium text-gray-600 px-2 mb-1">Tools</h3>
      
      {/* Select Tool */}
      <ToolButton
        icon={<SelectIcon />}
        label="Select"
        isActive={activeTool === 'select'}
        onClick={() => onToolChange('select')}
        shortcut="V"
      />
      
      {/* Rectangle Tool */}
      <ToolButton
        icon={<RectangleIcon />}
        label="Rectangle"
        isActive={activeTool === 'rectangle'}
        onClick={() => onToolChange('rectangle')}
        shortcut="R"
      />
      
      {/* Circle Tool */}
      <ToolButton
        icon={<CircleIcon />}
        label="Circle"
        isActive={activeTool === 'circle'}
        onClick={() => onToolChange('circle')}
        shortcut="C"
      />
      
      {/* Text Tool */}
      <ToolButton
        icon={<TextIcon />}
        label="Text"
        isActive={activeTool === 'text'}
        onClick={() => onToolChange('text')}
        shortcut="T"
      />
    </div>
  );
};

// Individual tool button component
interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  shortcut?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ 
  icon, 
  label, 
  isActive, 
  onClick, 
  shortcut 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
        ${isActive 
          ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' 
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
      title={`${label} ${shortcut ? `(${shortcut})` : ''}`}
    >
      <div className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className={`
          px-1.5 py-0.5 text-xs rounded border
          ${isActive 
            ? 'bg-blue-50 text-blue-600 border-blue-200' 
            : 'bg-gray-100 text-gray-500 border-gray-200'
          }
        `}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
};

// Tool icons using SVG
const SelectIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

const RectangleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const CircleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const TextIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4,7 4,4 20,4 20,7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

// Hook for managing tool state
export const useToolState = (initialTool: ToolType = 'select') => {
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool);

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
  };

  return {
    activeTool,
    setActiveTool: handleToolChange,
  };
};

export default ToolPanel;
