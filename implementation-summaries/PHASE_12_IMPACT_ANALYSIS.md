# Phase 12: Multi-Select Impact Analysis

## Overview
This document analyzes the impact of changing from **single selection** (`selectedObjectId: string | null`) to **multi-selection** (`selectedObjectIds: string[]`).

---

## Files Impacted

### 🔴 **HIGH IMPACT** (Major Refactoring Required)
1. `src/components/Canvas.tsx` - **35 references** to `selectedObjectId`
2. `src/hooks/useResize.ts` - Needs to handle multi-object resize (or disable for multi-select)
3. `src/hooks/useRotation.ts` - Needs to handle group rotation

### 🟡 **MEDIUM IMPACT** (Minor Changes)
4. `src/App.tsx` - `hasSelection` boolean still works (just means "has any selection")
5. `src/components/ToolPanel.tsx` - Duplicate button enabled state

### 🟢 **LOW IMPACT** (No Changes Needed)
- Individual shape components (Rectangle, Circle, TextObject) - No changes needed
- Services layer (aiCanvasService, canvasService) - No changes needed
- Other hooks and utilities - No changes needed

---

## Detailed Impact by File

### 1. `src/components/Canvas.tsx` (35 references)

#### **State Definition** (Line 103)
```typescript
// BEFORE
const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

// AFTER
const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
```

#### **Category A: Simple Array Checks** (15 locations)
These are straightforward conversions:

| Current Code | New Code | Purpose |
|-------------|----------|---------|
| `selectedObjectId !== null` | `selectedObjectIds.length > 0` | Check if anything selected |
| `selectedObjectId === objectId` | `selectedObjectIds.includes(objectId)` | Check if specific object selected |
| `setSelectedObjectId(null)` | `setSelectedObjectIds([])` | Clear selection |
| `setSelectedObjectId(objectId)` | `setSelectedObjectIds([objectId])` | Select single object |

**Affected locations:**
- Line 123: `onSelectionChange` callback
- Line 143, 266, 267: Auto-deselect when switching tools
- Line 246: Check if already selected
- Line 788: `isSelected` prop for rendering
- Line 836, 852: Render resize/rotation handles

#### **Category B: Lock Management** (10 locations)
Need to change from single lock to multiple locks:

```typescript
// BEFORE: Single lock
if (selectedObjectId) {
  await releaseObjectLock(selectedObjectId);
}

// AFTER: Multiple locks
for (const id of selectedObjectIds) {
  await releaseObjectLock(id);
}
```

**Affected locations:**
- Line 146-147: Release lock when switching to creation tool
- Line 267: Release lock when clicking empty canvas
- Line 475: Release lock after duplicate
- Line 537: Release lock after delete
- Line 623-624: Release lock when clicking empty canvas
- Line 792-793: Release lock via onDeselect callback

#### **Category C: Single Object Operations** (8 locations)
These operations currently work on ONE object, need to work on MULTIPLE:

| Operation | Current | Change Needed |
|-----------|---------|---------------|
| **Duplicate** | Line 393-485 | Loop through all selected objects |
| **Delete** | Line 532-537 | Loop through all selected objects |
| **Rotate (keyboard)** | Line 505, 515, 524 | Handle group rotation or single only |
| **Find selected object** | Line 398, 837, 853 | Find multiple objects |

#### **Category D: Hook Parameters** (2 locations)
Hooks need to handle multi-select:

```typescript
// Line 106-111: useResize hook
const { ... } = useResize({
  objects,
  selectedObjectId, // ❌ Change to selectedObjectIds
  updateObjectOptimistic,
  userId: user?.id
});

// Line 114-119: useRotation hook
const { ... } = useRotation({
  selectedObjectId, // ❌ Change to selectedObjectIds
  objects,
  updateObjectOptimistic,
  userId: user?.id
});
```

---

### 2. `src/hooks/useResize.ts`

#### **Current Behavior:**
- Resizes ONE selected object
- Assumes `selectedObjectId: string | null`

#### **Multi-Select Decision:**
**Option A: Disable resize for multi-select** ⭐ **RECOMMENDED**
- Only show resize handles when exactly 1 object selected
- Simpler implementation
- Matches Figma behavior (can't resize multiple objects at once)

```typescript
// In Canvas.tsx
{selectedObjectIds.length === 1 && (
  <ResizeHandles ... />
)}
```

**Option B: Group resize (advanced)**
- Resize entire group's bounding box
- Scale all objects proportionally
- More complex, save for later

---

### 3. `src/hooks/useRotation.ts`

#### **Current Behavior:**
- Rotates ONE selected object around its center

#### **Multi-Select Decision:**
**Option A: Disable rotation for multi-select** ⭐ **RECOMMENDED for Stage 1**
- Only show rotation handle when exactly 1 object selected
- Simpler implementation

**Option B: Group rotation (Stage 3 or 4)**
- Rotate entire group around group center
- More complex, implement later

---

### 4. `src/App.tsx`

#### **Current Code:**
```typescript
const [hasSelection, setHasSelection] = useState(false);
// ...
<Canvas onSelectionChange={setHasSelection} />
<ToolPanel hasSelection={hasSelection} />
```

#### **Change Needed:**
✅ **NO CHANGE REQUIRED!**
- `hasSelection` is already a boolean
- Canvas just needs to pass `selectedObjectIds.length > 0`
- ToolPanel already works correctly

---

## Implementation Strategy for Stage 1

### **Phase 1: State & Basic Selection** (Low Risk)
1. Change state definition
2. Update simple array checks (Category A)
3. Update `onSelectionChange` callback
4. Test: Single selection still works

### **Phase 2: Lock Management** (Medium Risk)
1. Create helper functions:
   - `acquireMultipleLocks(ids: string[])` - Returns successfully locked IDs
   - `releaseMultipleLocks(ids: string[])`
2. Update all lock operations (Category B)
3. Show feedback for partial locks: "Selected 3 of 5 objects. 2 are locked."

### **Phase 3: Shift+Click Selection** (Medium Risk)
1. Detect Shift key in click handlers
2. Add/remove from selection array
3. Handle lock acquisition with partial success

### **Phase 4: Multi-Object Operations** (High Risk)
1. Update duplicate to loop through all selected
2. Update delete to loop through all selected
3. Test thoroughly

### **Phase 5: Disable Advanced Features** (Low Risk)
1. Only show resize handles for single selection
2. Only show rotation handle for single selection
3. Keyboard shortcuts work only on single selection

---

## Risk Assessment

### 🟢 **Low Risk Changes** (Safe to do first)
- State definition change
- Simple boolean checks (`!== null` → `.length > 0`)
- `onSelectionChange` callback
- Rendering logic (`isSelected` prop)

### 🟡 **Medium Risk Changes**
- Lock acquisition/release (need to handle arrays)
- Shift+Click logic (new interaction pattern)
- Visual feedback (highlights, selection count)

### 🔴 **High Risk Changes** (Test carefully)
- Duplicate/Delete on multiple objects (data integrity)
- Lock conflict handling (partial selections)
- Group operations (coordinate math for movement)

---

## Recommendations

### **For Stage 1, implement in this order:**
1. ✅ Change state to array + simple checks (1-2 hours)
2. ✅ Lock management helpers (1 hour)
3. ✅ Shift+Click selection (1 hour)
4. ✅ Visual feedback (selection count, highlights) (1 hour)
5. ✅ Multi-delete and multi-duplicate (1-2 hours)
6. ✅ Disable resize/rotate for multi-select (15 minutes)

**Total estimated time: 5-8 hours of development**

### **What to defer to later stages:**
- ❌ Marquee selection (Stage 2)
- ❌ Group movement (Stage 3)
- ❌ Group resize/rotation (Stage 4+)

---

## Testing Strategy

### **After Each Change:**
1. Single selection still works ✅
2. Lock acquisition/release still works ✅
3. Existing features (resize, rotate, delete, duplicate) still work ✅

### **New Features to Test:**
1. Shift+Click adds to selection ✅
2. Multiple objects show highlights ✅
3. Partial lock success shows feedback ✅
4. Multi-delete removes all selected ✅
5. Multi-duplicate creates all duplicates ✅

---

## Summary

**Total Impact:**
- **3 files** with significant changes (Canvas, useResize, useRotation)
- **35 references** to update in Canvas.tsx
- **~500-800 lines** of code changes total
- **Risk level**: Medium (manageable with staged approach)

**Confidence Level:** ✅ **HIGH**
- Clear migration path
- Most changes are straightforward (null checks → array checks)
- Lock management is the trickiest part but well-scoped
- Can disable advanced features (resize/rotate) for multi-select initially

**Ready to proceed with Stage 1?** 🚀

