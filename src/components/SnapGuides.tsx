import React from 'react';
import { Line } from 'react-konva';
import type { SnapGuide } from '../types/snap';

interface SnapGuidesProps {
  guides: SnapGuide[];
  scale: number;
}

const SnapGuides: React.FC<SnapGuidesProps> = ({ guides, scale }) => {
  return (
    <>
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <Line
              key={`guide-${index}`}
              points={[guide.position, guide.start, guide.position, guide.end]}
              stroke="#FF00FF" // Bright pink like Figma
              strokeWidth={1 / scale} // Keep line width consistent at all zoom levels
              dash={[4 / scale, 4 / scale]}
              listening={false}
              perfectDrawEnabled={false}
            />
          );
        } else {
          return (
            <Line
              key={`guide-${index}`}
              points={[guide.start, guide.position, guide.end, guide.position]}
              stroke="#FF00FF"
              strokeWidth={1 / scale}
              dash={[4 / scale, 4 / scale]}
              listening={false}
              perfectDrawEnabled={false}
            />
          );
        }
      })}
    </>
  );
};

export default SnapGuides;

