# Bug Fix: Circle Drag Teleporting Issue ✅

## Issue Description
Circles would sometimes "teleport" or jump around the canvas during drag operations, making them difficult to position accurately.

## Root Cause
**Coordinate System Mismatch** between Konva's rendering system and our data model:

- **Data Model**: Stores circle position as **top-left corner** (`x, y = top-left`)
- **Konva Rendering**: Uses **center coordinates** for circles
- **Bug**: During drag, Konva reported center position, but we treated it as top-left

### The Problematic Flow:

```
1. Circle stored at: { x: 100, y: 100, radius: 50 }  // top-left corner
2. Rendered at: x={100 + 50}, y={100 + 50}          // center (150, 150)
3. User drags to: (200, 200)                         // Konva reports center
4. Code updates: { x: 200, y: 200 }                  // ❌ Treated as top-left!
5. Next render at: x={200 + 50}, y={200 + 50}       // center (250, 250)
6. Result: Circle "jumps" 50px further than expected! 💥
```

## The Fix

### Before (Broken):
```typescript
const handleDragMove = (e: any) => {
  const x = e.target.x();  // ❌ This is CENTER position from Konva
  const y = e.target.y();  // ❌ This is CENTER position from Konva
  
  // ... constraint logic ...
  
  onDragMove(circle.id, x, y);  // ❌ Sends CENTER as if it's TOP-LEFT
};
```

### After (Fixed): ✅
```typescript
const handleDragMove = (e: any) => {
  // Konva reports center position, but our data model stores top-left corner
  const centerX = e.target.x();
  const centerY = e.target.y();
  
  // Convert from center to top-left corner
  const topLeftX = centerX - circle.radius;
  const topLeftY = centerY - circle.radius;
  
  // Apply constraints using top-left coordinates
  const constrainedX = Math.max(0, Math.min(5000 - circle.radius * 2, topLeftX));
  const constrainedY = Math.max(0, Math.min(5000 - circle.radius * 2, topLeftY));
  
  // If constrained, update Konva's visual position (convert back to center)
  if (topLeftX !== constrainedX || topLeftY !== constrainedY) {
    e.target.x(constrainedX + circle.radius);
    e.target.y(constrainedY + circle.radius);
  }
  
  // Send top-left coordinates to match our data model ✅
  onDragMove(circle.id, constrainedX, constrainedY);
};
```

## Files Modified

**`src/components/Circle.tsx`**
- Fixed `handleDragMove`: Convert center → top-left before sending to data model
- Fixed `handleDragEnd`: Convert center → top-left before finalizing position
- Added explanatory comments

## Technical Details

### Coordinate Conversion Formulas

**Center → Top-Left:**
```typescript
topLeftX = centerX - radius
topLeftY = centerY - radius
```

**Top-Left → Center:**
```typescript
centerX = topLeftX + radius
centerY = topLeftY + radius
```

### Why This Works

1. **Konva Circle**: Always uses center coordinates for rendering
2. **Data Model**: Always stores top-left coordinates (consistent with rectangles)
3. **Conversion**: Happens at the boundary (in Circle.tsx drag handlers)
4. **Result**: Smooth, predictable drag behavior ✅

## Testing

### Before Fix:
- ❌ Circle jumps/teleports during drag
- ❌ Difficult to position accurately
- ❌ Circle "overshoots" where you drag it
- ❌ Inconsistent behavior

### After Fix: ✅
- ✅ Circle follows cursor smoothly
- ✅ Accurate positioning
- ✅ Predictable drag behavior
- ✅ Consistent with rectangles

### How to Test:
1. Create a circle on canvas
2. Select the circle
3. Drag it around
4. **Expected**: Circle stays under cursor, moves smoothly
5. **Expected**: No jumping or teleporting

## Why Was This Bug Introduced?

The bug existed because:
1. Circles use a different coordinate system than rectangles (center vs top-left)
2. Konva's drag events report position in screen/stage coordinates
3. The conversion between systems was not properly handled
4. The constraint logic was working with the wrong coordinate reference

## Prevention

To prevent similar issues:
- ✅ Document coordinate system for each shape type
- ✅ Always convert at component boundaries
- ✅ Add comments explaining coordinate conversions
- ✅ Test drag behavior for all shape types

## Related Code

### Coordinate Systems by Shape:

**Rectangle:**
- Data model: `x, y` = top-left corner
- Konva rendering: `x, y` = top-left corner
- ✅ No conversion needed

**Circle:**
- Data model: `x, y` = top-left corner (of bounding box)
- Konva rendering: `x, y` = center
- ⚠️ Conversion needed!

**Text:**
- Data model: `x, y` = top-left corner
- Konva rendering: `x, y` = top-left corner
- ✅ No conversion needed

## Status: ✅ FIXED

**Bug Fix Date**: October 16, 2025  
**Time to Fix**: ~15 minutes  
**Files Modified**: 1 (`Circle.tsx`)  
**Lines Changed**: ~20 lines  
**Linter Errors**: 0  
**Impact**: High (affects all circle drag operations)  

---

*Bug Fix Complete: Circle drag now works smoothly without teleporting*

