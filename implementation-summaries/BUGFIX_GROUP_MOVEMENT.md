# Bug Fix: Group Movement Delta Calculation

## Issue
When moving multiple selected objects (group drag), only the last selected object moved correctly while other objects moved incorrectly or stayed in place.

## Root Cause
The delta calculation was using the **current** position from the `objects` array:
```typescript
const deltaX = x - object.x;  // ❌ object.x changes during drag!
const deltaY = y - object.y;
```

**The problem:**
1. User drags object A from (100, 100) to (110, 110)
2. Delta calculated: `110 - 100 = 10` ✅
3. All objects updated optimistically
4. Next drag move event: A is now at (110, 110)
5. User drags to (120, 120)
6. Delta calculated: `120 - 110 = 10` (looks correct)
7. But object B uses this delta from ITS position, which is wrong!
8. The delta should always be relative to the **initial** position, not current

## Solution
Store the initial positions of all selected objects when drag starts, then calculate deltas from those **fixed** positions:

### 1. Added state to store initial positions:
```typescript
const groupDragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
```

### 2. Store initial positions on drag start:
```typescript
const handleRectangleDragStart = (objectId: string) => {
  // ...
  if (isInSelection && selectedObjectIds.length > 1) {
    // Store initial positions of ALL selected objects
    const initialPositions = new Map<string, { x: number; y: number }>();
    selectedObjectIds.forEach(id => {
      const obj = objects.find(o => o.id === id);
      if (obj) {
        initialPositions.set(id, { x: obj.x, y: obj.y });
      }
    });
    groupDragStartPositions.current = initialPositions;
  }
};
```

### 3. Use initial positions for delta calculation:
```typescript
const handleRectangleDragMove = (objectId: string, x: number, y: number) => {
  // ...
  if (isInSelection && selectedObjectIds.length > 1) {
    // Calculate delta from INITIAL position (not current!)
    const initialPos = groupDragStartPositions.current.get(objectId);
    const deltaX = x - initialPos.x;  // ✅ Always from initial position
    const deltaY = y - initialPos.y;
    
    // Apply delta to each object from THEIR initial positions
    selectedObjectIds.forEach(selectedId => {
      const selectedInitialPos = groupDragStartPositions.current.get(selectedId);
      const newX = selectedInitialPos.x + deltaX;
      const newY = selectedInitialPos.y + deltaY;
      // Update position...
    });
  }
};
```

### 4. Clear positions on drag end:
```typescript
const handleRectangleDragEnd = async (objectId: string, x: number, y: number) => {
  // ...
  groupDragStartPositions.current.clear();  // Clean up
};
```

## Result
✅ All selected objects now move together correctly, maintaining their relative positions throughout the entire drag operation.

## Files Modified
- `src/components/Canvas.tsx`:
  - Added `groupDragStartPositions` ref
  - Updated `handleRectangleDragStart` to store initial positions
  - Updated `handleRectangleDragMove` to use stored initial positions
  - Updated `handleRectangleDragEnd` to clear stored positions

## Testing
1. ✅ Shift+Click 3 objects
2. ✅ Drag any of them
3. ✅ All 3 move together maintaining relative positions
4. ✅ No "jumping" or incorrect movement

The fix ensures consistent group movement by always calculating deltas from the original starting positions, not from the continuously-updating current positions.

