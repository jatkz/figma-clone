import React from 'react';
import { Line, Rect } from 'react-konva';
import SnapGuides from '../SnapGuides';
import Cursor from '../Cursor';
import type { SnapGuide } from '../../types/snap';
import type { CursorData } from '../../services/canvasService';

interface CanvasControlsProps {
  snapGuides: SnapGuide[];
  viewportScale: number;
  lassoState: {
    isDrawing: boolean;
    points: number[];
    isClosing: boolean;
  };
  otherCursors: Map<string, CursorData>;
}

/**
 * Renders canvas control overlays and visual feedback:
 * - Snap guides (smart alignment guides)
 * - Lasso path visualization
 * - Other users' cursors
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  snapGuides,
  viewportScale,
  lassoState,
  otherCursors
}) => {
  return (
    <>
      {/* Render other users' cursors (teleport positioning - instant updates) */}
      {Array.from(otherCursors.entries()).map(([userId, cursorData]) => (
        <Cursor
          key={userId}
          userId={userId}
          cursorData={cursorData}
        />
      ))}
      
      {/* Snap guides (smart alignment guides) */}
      <SnapGuides guides={snapGuides} scale={viewportScale} />
      
      {/* Lasso path visualization */}
      {lassoState.isDrawing && lassoState.points.length >= 2 && (
        <React.Fragment>
          <Line
            points={lassoState.points}
            stroke="#7B61FF"
            strokeWidth={2 / viewportScale}
            dash={[10 / viewportScale, 5 / viewportScale]}
            lineCap="round"
            lineJoin="round"
            opacity={0.8}
            closed={false}
            listening={false}
          />
          
          {/* Closing indicator circle at start point */}
          {lassoState.isClosing && (
            <React.Fragment>
              <Rect
                x={lassoState.points[0] - 10 / viewportScale}
                y={lassoState.points[1] - 10 / viewportScale}
                width={20 / viewportScale}
                height={20 / viewportScale}
                stroke="#7B61FF"
                strokeWidth={2 / viewportScale}
                fill="rgba(123, 97, 255, 0.2)"
                cornerRadius={10 / viewportScale}
                listening={false}
              />
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </>
  );
};

export default CanvasControls;

