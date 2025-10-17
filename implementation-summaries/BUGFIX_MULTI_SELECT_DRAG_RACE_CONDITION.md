# Bug Fix: Multi-Select Drag Race Condition

## Problem

When dragging multiple selected objects together, the objects would sometimes move properly and sometimes snap back to their original positions. This intermittent behavior was caused by a **race condition** between throttled individual updates and the batch update at drag end.

### Root Cause

During group drag in `handleRectangleDragMove`:
1. For each selected object, `updateObjectOptimistic` was called on every mouse move
2. `updateObjectOptimistic` queues **throttled Firebase updates** (250ms delay)
3. At drag end, `batchUpdateObjectsOptimistic` sends final positions
4. **RACE CONDITION**: Throttled updates could fire AFTER the batch update completes
5. These stale throttled updates would overwrite the correct positions, causing snap-back

### Symptoms
- ✅ Sometimes multi-select drag works perfectly
- ❌ Sometimes objects move briefly then snap back to original position
- The bug was more likely with:
  - Faster mouse movements (more throttled updates queued)
  - More selected objects (more potential conflicts)
  - Network latency (wider timing window for race condition)

## Solution

### Part 1: Add Local-Only Update Function

Created `updateObjectLocal` in `useCanvas.ts` that updates **local state only** without triggering any Firebase calls.

**src/hooks/useCanvas.ts:**
```typescript
// Local-only update (no Firebase call) - used for real-time visual feedback during group drag
const updateObjectLocal = useCallback((
  objectId: string,
  updates: Partial<CanvasObject>
): void => {
  setObjects(prev =>
    prev.map(obj =>
      obj.id === objectId ? { ...obj, ...updates } as CanvasObject : obj
    )
  );
}, []);
```

### Part 2: Use Local Updates During Group Drag

Modified `handleRectangleDragMove` in `Canvas.tsx` to use `updateObjectLocal` instead of `updateObjectOptimistic` during group drag.

**Before (causing race condition):**
```typescript
// Update position with throttled updates (for visual feedback during drag)
// The batch update at drag end will ensure final consistency
updateObjectOptimistic(selectedId, {
  x: constrainedPosition.x,
  y: constrainedPosition.y,
  modifiedBy: user.id
});
```

**After (race-free):**
```typescript
// Use LOCAL update only (no Firebase) for instant visual feedback during drag
// This prevents throttled updates from conflicting with the batch update at drag end
updateObjectLocal(selectedId, {
  x: constrainedPosition.x,
  y: constrainedPosition.y
});
```

### Part 3: Batch Update at Drag End (unchanged)

The existing `handleRectangleDragEnd` already uses `batchUpdateObjectsOptimistic` to send all final positions in a single atomic transaction. This part remains unchanged and now works correctly without conflicts.

## Technical Details

### Flow Before Fix
```
Mouse Move → updateObjectOptimistic (throttled, 250ms delay) → Firebase Update (queued)
Mouse Move → updateObjectOptimistic (throttled, 250ms delay) → Firebase Update (queued)
Mouse Move → updateObjectOptimistic (throttled, 250ms delay) → Firebase Update (queued)
Drag End  → batchUpdateObjectsOptimistic → Firebase Batch Update ✅
⏰ 250ms later → Throttled update fires → Overwrites with stale position ❌ SNAP BACK!
```

### Flow After Fix
```
Mouse Move → updateObjectLocal → Local State Update Only (instant visual feedback)
Mouse Move → updateObjectLocal → Local State Update Only (instant visual feedback)
Mouse Move → updateObjectLocal → Local State Update Only (instant visual feedback)
Drag End  → batchUpdateObjectsOptimistic → Firebase Batch Update ✅
✅ No throttled updates to conflict! Final position persists correctly.
```

## Files Modified

### 1. `src/hooks/useCanvas.ts`
- **Added** `updateObjectLocal` function for local-only state updates
- **Added** `updateObjectLocal` to `UseCanvasActions` interface
- **Added** `updateObjectLocal` to hook's return value

### 2. `src/components/Canvas.tsx`
- **Destructured** `updateObjectLocal` from `useCanvas` hook
- **Modified** `handleRectangleDragMove` to use `updateObjectLocal` for group drag
- **Updated** dependency array to include `updateObjectLocal`

## Testing Checklist

- [x] ✅ Multi-select drag works consistently (no snap-back)
- [x] ✅ Single object drag still works with snapping
- [x] ✅ Alignment operations work correctly
- [x] ✅ Distribution operations work correctly
- [x] ✅ No TypeScript errors
- [x] ✅ Project builds successfully

## Performance Benefits

1. **Reduced Firebase Writes**: No throttled updates during group drag (only batch update at end)
2. **Instant Visual Feedback**: Local updates are immediate (no throttle delay)
3. **No Network Conflicts**: Only one Firebase write per drag operation (the batch update)
4. **Consistent Behavior**: 100% reliable, no race conditions

## Related Issues

This fix also ensures consistency for:
- ✅ Multi-object alignment (Phase 18)
- ✅ Multi-object distribution (Phase 18)
- ✅ Any future multi-object batch operations

## Implementation Date
October 17, 2025

## Status
✅ **COMPLETE** - Multi-select drag now works reliably without race conditions.

