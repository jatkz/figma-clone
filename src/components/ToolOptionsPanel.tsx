import React from 'react';
import type { ToolType } from './ToolPanel';

interface ToolOptionsPanelProps {
  activeTool: ToolType;
  tolerance: number;
  onToleranceChange: (value: number) => void;
}

const ToolOptionsPanel: React.FC<ToolOptionsPanelProps> = ({
  activeTool,
  tolerance,
  onToleranceChange
}) => {
  // Only show options for magic wand tool
  if (activeTool !== 'magic-wand') {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 min-w-[200px]">
      <h3 className="text-xs font-medium text-gray-600 mb-3">Magic Wand Options</h3>
      
      <div className="space-y-3">
        {/* Tolerance Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="tolerance" className="text-sm font-medium text-gray-700">
              Tolerance
            </label>
            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {tolerance}
            </span>
          </div>
          
          <input
            id="tolerance"
            type="range"
            min="0"
            max="100"
            step="1"
            value={tolerance}
            onChange={(e) => onToleranceChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            title={`Tolerance: ${tolerance}`}
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Exact</span>
            <span>Loose</span>
          </div>
        </div>
        
        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p className="font-medium mb-1">💡 How to use:</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Click an object to select all with similar colors</li>
            <li>0 = Exact color match only</li>
            <li>Higher values = More color variation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ToolOptionsPanel;

