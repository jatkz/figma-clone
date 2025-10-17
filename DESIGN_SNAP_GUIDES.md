# Design Document: Snap-to-Grid & Smart Guides

## Overview
Implement snap-to-grid and smart guides to help users align objects precisely while maintaining a smooth design experience.

---

## Feature Requirements

### Snap-to-Grid
- [ ] Configurable grid size (default: 10px)
- [ ] Snap during object movement
- [ ] Toggle with Cmd/Ctrl key (hold to disable snapping)
- [ ] Visual grid overlay (already exists)
- [ ] Settings to enable/disable globally

### Smart Guides
- [ ] Detect alignment with other objects:
  - Left edges
  - Right edges
  - Top edges
  - Bottom edges
  - Horizontal centers
  - Vertical centers
- [ ] Show temporary guide lines (pink/purple)
- [ ] Snap within threshold (5px default)
- [ ] Multi-object alignment detection
- [ ] Distance indicators (spacing between objects)

---

## Implementation Strategy

### Phase 1: Snap-to-Grid (1-2 hours)
1. Create snap utility functions
2. Integrate with drag handlers
3. Add keyboard modifier support
4. Add settings toggle

### Phase 2: Smart Guides (3-4 hours)
1. Create alignment detection system
2. Add guide line rendering
3. Optimize performance (only check nearby objects)
4. Add distance indicators

---

## File Structure

```
src/
├── utils/
│   ├── snapUtils.ts          # NEW: Snapping logic
│   └── alignmentUtils.ts     # NEW: Smart guide detection
├── components/
│   ├── Canvas.tsx            # MODIFY: Integrate snapping
│   ├── SnapGuides.tsx        # NEW: Render guide lines
│   └── SnapSettings.tsx      # NEW: Snapping settings UI
├── contexts/
│   └── SnapContext.tsx       # NEW: Global snap settings
└── types/
    └── snap.ts               # NEW: Snap types
```

---

## Detailed Implementation

### 1. Snap Utilities (`src/utils/snapUtils.ts`)

```typescript
export interface SnapSettings {
  gridEnabled: boolean;
  gridSize: number;
  smartGuidesEnabled: boolean;
  snapThreshold: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  alignmentType: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
}

/**
 * Snap position to grid
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

/**
 * Snap to other objects (smart guides)
 */
export function snapToObjects(
  x: number,
  y: number,
  width: number,
  height: number,
  objects: CanvasObject[],
  currentObjectId: string,
  threshold: number = 5
): SnapResult {
  let snappedX = x;
  let snappedY = y;
  const guides: SnapGuide[] = [];
  let hasSnappedX = false;
  let hasSnappedY = false;

  // Calculate current object bounds
  const currentLeft = x;
  const currentRight = x + width;
  const currentTop = y;
  const currentBottom = y + height;
  const currentCenterX = x + width / 2;
  const currentCenterY = y + height / 2;

  // Check against all other objects
  for (const obj of objects) {
    if (obj.id === currentObjectId) continue;

    // Calculate target object bounds
    const targetWidth = 'width' in obj ? obj.width : ('radius' in obj ? obj.radius * 2 : 100);
    const targetHeight = 'height' in obj ? obj.height : ('radius' in obj ? obj.radius * 2 : 100);
    const targetLeft = obj.x;
    const targetRight = obj.x + targetWidth;
    const targetTop = obj.y;
    const targetBottom = obj.y + targetHeight;
    const targetCenterX = obj.x + targetWidth / 2;
    const targetCenterY = obj.y + targetHeight / 2;

    // Snap X axis (vertical guides)
    if (!hasSnappedX) {
      // Left to left
      if (Math.abs(currentLeft - targetLeft) < threshold) {
        snappedX = targetLeft;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetLeft,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'left',
        });
      }
      // Right to right
      else if (Math.abs(currentRight - targetRight) < threshold) {
        snappedX = targetRight - width;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetRight,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'right',
        });
      }
      // Left to right
      else if (Math.abs(currentLeft - targetRight) < threshold) {
        snappedX = targetRight;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetRight,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'left',
        });
      }
      // Right to left
      else if (Math.abs(currentRight - targetLeft) < threshold) {
        snappedX = targetLeft - width;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetLeft,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'right',
        });
      }
      // Center to center (X)
      else if (Math.abs(currentCenterX - targetCenterX) < threshold) {
        snappedX = targetCenterX - width / 2;
        hasSnappedX = true;
        guides.push({
          type: 'vertical',
          position: targetCenterX,
          start: Math.min(currentTop, targetTop),
          end: Math.max(currentBottom, targetBottom),
          alignmentType: 'centerX',
        });
      }
    }

    // Snap Y axis (horizontal guides)
    if (!hasSnappedY) {
      // Top to top
      if (Math.abs(currentTop - targetTop) < threshold) {
        snappedY = targetTop;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetTop,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'top',
        });
      }
      // Bottom to bottom
      else if (Math.abs(currentBottom - targetBottom) < threshold) {
        snappedY = targetBottom - height;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetBottom,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'bottom',
        });
      }
      // Top to bottom
      else if (Math.abs(currentTop - targetBottom) < threshold) {
        snappedY = targetBottom;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetBottom,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'top',
        });
      }
      // Bottom to top
      else if (Math.abs(currentBottom - targetTop) < threshold) {
        snappedY = targetTop - height;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetTop,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'bottom',
        });
      }
      // Center to center (Y)
      else if (Math.abs(currentCenterY - targetCenterY) < threshold) {
        snappedY = targetCenterY - height / 2;
        hasSnappedY = true;
        guides.push({
          type: 'horizontal',
          position: targetCenterY,
          start: Math.min(currentLeft, targetLeft),
          end: Math.max(currentRight, targetRight),
          alignmentType: 'centerY',
        });
      }
    }

    // Exit early if both axes snapped
    if (hasSnappedX && hasSnappedY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: hasSnappedX,
    snappedY: hasSnappedY,
    guides,
  };
}

/**
 * Apply snapping based on settings
 */
export function applySnapping(
  x: number,
  y: number,
  width: number,
  height: number,
  objects: CanvasObject[],
  currentObjectId: string,
  settings: SnapSettings,
  modifierKeyPressed: boolean // Cmd/Ctrl to temporarily disable
): SnapResult {
  // Modifier key inverts snapping behavior
  const snapEnabled = modifierKeyPressed ? !settings.gridEnabled : settings.gridEnabled;
  const guidesEnabled = modifierKeyPressed ? !settings.smartGuidesEnabled : settings.smartGuidesEnabled;

  let result: SnapResult = {
    x,
    y,
    snappedX: false,
    snappedY: false,
    guides: [],
  };

  // Try smart guides first (more precise)
  if (guidesEnabled) {
    result = snapToObjects(x, y, width, height, objects, currentObjectId, settings.snapThreshold);
  }

  // Fall back to grid if no smart guide snap
  if (snapEnabled && !result.snappedX && !result.snappedY) {
    const gridSnap = snapToGrid(x, y, settings.gridSize);
    result.x = gridSnap.x;
    result.y = gridSnap.y;
  }

  return result;
}
```

---

### 2. Snap Guide Renderer (`src/components/SnapGuides.tsx`)

```typescript
import React from 'react';
import { Layer, Line } from 'react-konva';
import type { SnapGuide } from '../utils/snapUtils';

interface SnapGuidesProps {
  guides: SnapGuide[];
  scale: number;
}

const SnapGuides: React.FC<SnapGuidesProps> = ({ guides, scale }) => {
  return (
    <Layer listening={false}>
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
    </Layer>
  );
};

export default SnapGuides;
```

---

### 3. Snap Context (`src/contexts/SnapContext.tsx`)

```typescript
import React, { createContext, useContext, useState } from 'react';
import type { SnapSettings } from '../utils/snapUtils';

interface SnapContextType {
  settings: SnapSettings;
  updateSettings: (settings: Partial<SnapSettings>) => void;
}

const SnapContext = createContext<SnapContextType | undefined>(undefined);

export const SnapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SnapSettings>({
    gridEnabled: true,
    gridSize: 10,
    smartGuidesEnabled: true,
    snapThreshold: 5,
  });

  const updateSettings = (newSettings: Partial<SnapSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SnapContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SnapContext.Provider>
  );
};

export const useSnap = () => {
  const context = useContext(SnapContext);
  if (!context) {
    throw new Error('useSnap must be used within SnapProvider');
  }
  return context;
};
```

---

### 4. Integration with Canvas (`src/components/Canvas.tsx`)

```typescript
// Add to Canvas.tsx

import { applySnapping } from '../utils/snapUtils';
import { useSnap } from '../contexts/SnapContext';
import SnapGuides from './SnapGuides';

// Inside Canvas component:
const { settings: snapSettings } = useSnap();
const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
const [isModifierPressed, setIsModifierPressed] = useState(false);

// Track Cmd/Ctrl key for snap override
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setIsModifierPressed(true);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) {
      setIsModifierPressed(false);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

// Modify handleRectangleDragMove:
const handleRectangleDragMove = useCallback((objectId: string, x: number, y: number) => {
  const object = objects.find(obj => obj.id === objectId);
  if (!object || object.lockedBy !== user?.id) {
    return;
  }

  // Get object dimensions
  const dimensions = getShapeDimensions(object);

  // Apply snapping
  const snapResult = applySnapping(
    x,
    y,
    dimensions.width,
    dimensions.height,
    objects,
    objectId,
    snapSettings,
    isModifierPressed
  );

  // Update snap guides
  setSnapGuides(snapResult.guides);

  // Use snapped position
  const constrainedPosition = constrainToBounds(
    snapResult.x,
    snapResult.y,
    dimensions.width,
    dimensions.height
  );

  updateObjectOptimistic(objectId, {
    x: constrainedPosition.x,
    y: constrainedPosition.y,
    modifiedBy: user.id
  });
}, [objects, user?.id, snapSettings, isModifierPressed, updateObjectOptimistic]);

// Clear guides on drag end:
const handleRectangleDragEnd = useCallback(async (objectId: string, x: number, y: number) => {
  // ... existing logic ...
  
  // Clear snap guides
  setSnapGuides([]);
}, [/* deps */]);

// Render snap guides in Stage:
<Stage>
  <Layer>
    {/* Existing canvas content */}
  </Layer>
  
  {/* Snap guides layer */}
  <SnapGuides guides={snapGuides} scale={viewport.scale} />
</Stage>
```

---

### 5. Settings UI (`src/components/SnapSettings.tsx`)

```typescript
import React from 'react';
import { useSnap } from '../contexts/SnapContext';

const SnapSettings: React.FC = () => {
  const { settings, updateSettings } = useSnap();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Snap Settings</h3>
      
      {/* Grid Snapping */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.gridEnabled}
            onChange={(e) => updateSettings({ gridEnabled: e.target.checked })}
            className="mr-2"
          />
          <span className="font-medium">Snap to Grid</span>
        </label>
        {settings.gridEnabled && (
          <div className="ml-6 mt-2">
            <label className="text-sm text-gray-600">
              Grid Size: {settings.gridSize}px
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={settings.gridSize}
              onChange={(e) => updateSettings({ gridSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Smart Guides */}
      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.smartGuidesEnabled}
            onChange={(e) => updateSettings({ smartGuidesEnabled: e.target.checked })}
            className="mr-2"
          />
          <span className="font-medium">Smart Guides</span>
        </label>
        {settings.smartGuidesEnabled && (
          <div className="ml-6 mt-2">
            <label className="text-sm text-gray-600">
              Snap Distance: {settings.snapThreshold}px
            </label>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={settings.snapThreshold}
              onChange={(e) => updateSettings({ snapThreshold: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Hold Cmd/Ctrl while dragging to temporarily disable snapping
      </p>
    </div>
  );
};

export default SnapSettings;
```

---

## Performance Optimizations

### 1. Limit Snap Detection to Nearby Objects
```typescript
function getNearbyObjects(
  x: number,
  y: number,
  width: number,
  height: number,
  objects: CanvasObject[],
  maxDistance: number = 500
): CanvasObject[] {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return objects.filter(obj => {
    const objWidth = 'width' in obj ? obj.width : 100;
    const objHeight = 'height' in obj ? obj.height : 100;
    const objCenterX = obj.x + objWidth / 2;
    const objCenterY = obj.y + objHeight / 2;

    const distance = Math.sqrt(
      Math.pow(centerX - objCenterX, 2) + Math.pow(centerY - objCenterY, 2)
    );

    return distance < maxDistance;
  });
}
```

### 2. Throttle Snap Calculations
```typescript
// Only calculate snaps every N pixels of movement
let lastSnapCheck = { x: 0, y: 0 };
const SNAP_CHECK_THRESHOLD = 2; // pixels

if (
  Math.abs(x - lastSnapCheck.x) > SNAP_CHECK_THRESHOLD ||
  Math.abs(y - lastSnapCheck.y) > SNAP_CHECK_THRESHOLD
) {
  // Perform snap detection
  lastSnapCheck = { x, y };
}
```

### 3. Spatial Indexing (Advanced)
For large canvases with 100+ objects, use a quadtree or grid-based spatial index to quickly find nearby objects.

---

## Keyboard Shortcuts

- **Cmd/Ctrl + Hold**: Temporarily disable snapping
- **Cmd/Ctrl + Shift + ;**: Toggle grid snapping
- **Cmd/Ctrl + '**: Toggle smart guides

---

## Visual Feedback

### Guide Line Colors
- **Pink (#FF00FF)**: Edge alignment
- **Purple (#9945FF)**: Center alignment
- **Blue (#3B82F6)**: Distance indicators (future)

### Haptic Feedback (Optional)
- Subtle "snap" feel when alignment occurs
- Can use CSS animations or canvas effects

---

## Testing Checklist

- [ ] Snap to grid works at different grid sizes
- [ ] Smart guides detect left edge alignment
- [ ] Smart guides detect right edge alignment
- [ ] Smart guides detect top edge alignment
- [ ] Smart guides detect bottom edge alignment
- [ ] Smart guides detect center X alignment
- [ ] Smart guides detect center Y alignment
- [ ] Guide lines render correctly
- [ ] Modifier key toggles snapping
- [ ] Performance good with 50+ objects
- [ ] Snapping works during group move
- [ ] Settings persist across sessions

---

## Future Enhancements

1. **Distance Indicators**: Show spacing between objects (e.g., "24px")
2. **Multiple Guide Detection**: Show multiple guides simultaneously
3. **Snap to Canvas Bounds**: Snap to 0,0 or canvas edges
4. **Distribute Objects**: Evenly space selected objects
5. **Smart Spacing**: Detect and maintain equal spacing
6. **Rotation Snapping**: Snap to 15°, 45°, 90° angles
7. **Size Matching**: Snap to same width/height as other objects

---

## Estimated Implementation Time

- **Phase 1 (Snap-to-Grid)**: 1-2 hours
- **Phase 2 (Smart Guides)**: 3-4 hours
- **Testing & Polish**: 1-2 hours
- **Total**: 5-8 hours

---

## Summary

This design provides:
- ✅ Snap-to-grid for precise positioning
- ✅ Smart guides for object alignment
- ✅ Visual feedback (guide lines)
- ✅ Performance optimizations
- ✅ User control (toggle, modifier keys)
- ✅ Professional Figma-like experience

The implementation is modular and can be added incrementally!

