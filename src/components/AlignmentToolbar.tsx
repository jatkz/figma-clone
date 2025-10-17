import React from 'react';
import type { AlignmentType, DistributionType } from '../utils/alignmentUtils';

interface AlignmentToolbarProps {
  onAlign: (type: AlignmentType) => void;
  onDistribute: (type: DistributionType) => void;
  onAlignToCanvas: (type: 'center' | 'left' | 'right' | 'top' | 'bottom') => void;
  selectionCount: number;
}

const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  onAlign,
  onDistribute,
  onAlignToCanvas,
  selectionCount
}) => {
  if (selectionCount < 2) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 flex flex-col gap-3">
      <h3 className="text-xs font-medium text-gray-600 px-2">Alignment & Distribution</h3>
      
      {/* Basic Alignment */}
      <div className="px-2">
        <p className="text-xs text-gray-500 mb-1">Align</p>
        <div className="flex gap-1">
          <AlignButton
            onClick={() => onAlign('left')}
            title="Align Left (Ctrl+Shift+L)"
            icon={<AlignLeftIcon />}
          />
          <AlignButton
            onClick={() => onAlign('center-horizontal')}
            title="Center Horizontally (Ctrl+Shift+H)"
            icon={<AlignCenterHIcon />}
          />
          <AlignButton
            onClick={() => onAlign('right')}
            title="Align Right (Ctrl+Shift+R)"
            icon={<AlignRightIcon />}
          />
          <div className="w-px bg-gray-300 mx-1" />
          <AlignButton
            onClick={() => onAlign('top')}
            title="Align Top (Ctrl+Shift+T)"
            icon={<AlignTopIcon />}
          />
          <AlignButton
            onClick={() => onAlign('center-vertical')}
            title="Center Vertically (Ctrl+Shift+M)"
            icon={<AlignCenterVIcon />}
          />
          <AlignButton
            onClick={() => onAlign('bottom')}
            title="Align Bottom (Ctrl+Shift+B)"
            icon={<AlignBottomIcon />}
          />
        </div>
      </div>

      {/* Distribution (only show if 3+ objects) */}
      {selectionCount >= 3 && (
        <div className="px-2">
          <p className="text-xs text-gray-500 mb-1">Distribute</p>
          <div className="flex gap-1">
            <AlignButton
              onClick={() => onDistribute('horizontal-edges')}
              title="Distribute Horizontally"
              icon={<DistributeHIcon />}
            />
            <AlignButton
              onClick={() => onDistribute('vertical-edges')}
              title="Distribute Vertically"
              icon={<DistributeVIcon />}
            />
            <div className="w-px bg-gray-300 mx-1" />
            <AlignButton
              onClick={() => onDistribute('horizontal-centers')}
              title="Distribute Centers Horizontally"
              icon={<DistributeCenterHIcon />}
            />
            <AlignButton
              onClick={() => onDistribute('vertical-centers')}
              title="Distribute Centers Vertically"
              icon={<DistributeCenterVIcon />}
            />
          </div>
        </div>
      )}

      {/* Align to Canvas */}
      <div className="px-2">
        <p className="text-xs text-gray-500 mb-1">Align to Canvas</p>
        <div className="flex gap-1">
          <AlignButton
            onClick={() => onAlignToCanvas('center')}
            title="Center on Canvas"
            icon={<CenterOnCanvasIcon />}
          />
          <AlignButton
            onClick={() => onAlignToCanvas('left')}
            title="Align to Canvas Left"
            icon={<AlignLeftIcon />}
            small
          />
          <AlignButton
            onClick={() => onAlignToCanvas('right')}
            title="Align to Canvas Right"
            icon={<AlignRightIcon />}
            small
          />
          <AlignButton
            onClick={() => onAlignToCanvas('top')}
            title="Align to Canvas Top"
            icon={<AlignTopIcon />}
            small
          />
          <AlignButton
            onClick={() => onAlignToCanvas('bottom')}
            title="Align to Canvas Bottom"
            icon={<AlignBottomIcon />}
            small
          />
        </div>
      </div>
    </div>
  );
};

// Button component
interface AlignButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  small?: boolean;
}

const AlignButton: React.FC<AlignButtonProps> = ({ onClick, title, icon, small = false }) => (
  <button
    onClick={onClick}
    title={title}
    className={`${small ? 'w-7 h-7' : 'w-8 h-8'} flex items-center justify-center rounded hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500`}
  >
    {icon}
  </button>
);

// Text/Unicode Icons (Simple and Clear)
const AlignLeftIcon = () => <span className="text-base font-bold">⫷</span>;
const AlignCenterHIcon = () => <span className="text-base font-bold">⊞</span>;
const AlignRightIcon = () => <span className="text-base font-bold">⫸</span>;
const AlignTopIcon = () => <span className="text-base font-bold">⫴</span>;
const AlignCenterVIcon = () => <span className="text-base font-bold">⊡</span>;
const AlignBottomIcon = () => <span className="text-base font-bold">⫵</span>;

const DistributeHIcon = () => <span className="text-base font-bold">⟺</span>;
const DistributeVIcon = () => <span className="text-base font-bold">⇕</span>;
const DistributeCenterHIcon = () => <span className="text-xs">⋯→⋯</span>;
const DistributeCenterVIcon = () => <span className="text-xs">⋮↕⋮</span>;

const CenterOnCanvasIcon = () => <span className="text-base font-bold">◎</span>;

export default AlignmentToolbar;

