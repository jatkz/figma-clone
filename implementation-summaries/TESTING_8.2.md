# Phase 8.2 Testing Guide - AI Manipulation Commands

## Overview
This guide shows how to test AI manipulation commands (move, resize, rotate, delete) via the browser console for Phase 8.2 implementation.

## Prerequisites
1. Complete Phase 8.1 (creation commands working)
2. Have some shapes on the canvas to manipulate
3. Browser console open (F12)
4. User logged in with Auth0

## Setup in Console

```javascript
// Get your user ID
const userId = "your-auth0-user-id"; // Replace with actual ID

// Import the AI service function
const { processAICommand } = await import('/src/services/aiService.ts');
```

## Setup Test Data

First, create some shapes to manipulate:

```javascript
// Create test shapes
await processAICommand("Create a red rectangle at 1000, 1000", userId);
await processAICommand("Create a blue circle at 1500, 1000", userId);
await processAICommand("Create a green rectangle at 2000, 1000", userId);
await processAICommand("Add text that says 'Hello' at 2500, 1000", userId);
await processAICommand("Create a 300x200 rectangle at 1000, 1500", userId);
await processAICommand("Create a 100x100 circle at 2000, 1500", userId);
```

---

## Test Commands

### Test 1: Move Shape by Description
```javascript
const result1 = await processAICommand(
  "Move the blue rectangle to the center",
  userId
);
console.log("Test 1 Result:", result1);
```

**Expected Result:**
- ✅ Success: true
- ✅ Blue rectangle moves to center (2500, 2500)
- ✅ Message confirms which shape was moved
- ✅ Other shapes stay in place

### Test 2: Move with Color + Type Description
```javascript
const result2 = await processAICommand(
  "Move the red rectangle to position 500, 500",
  userId
);
console.log("Test 2 Result:", result2);
```

**Expected Result:**
- ✅ Red rectangle moves to (500, 500)
- ✅ Correct shape identified by color + type

### Test 3: Resize with Absolute Dimensions
```javascript
const result3 = await processAICommand(
  "Resize the blue rectangle to 300x200",
  userId
);
console.log("Test 3 Result:", result3);
```

**Expected Result:**
- ✅ Blue rectangle resized to 300x200
- ✅ Position unchanged
- ✅ Size constraints enforced (50-1000)

### Test 4: Resize with Relative Description
```javascript
const result4 = await processAICommand(
  "Make the circle twice as big",
  userId
);
console.log("Test 4 Result:", result4);
```

**Expected Result:**
- ✅ AI calls getCanvasState to get current size
- ✅ Calculates new size (current * 2)
- ✅ Circle is resized to 2x original dimensions
- ✅ May take slightly longer (2 function calls)

### Test 5: Rotate Shape
```javascript
const result5 = await processAICommand(
  "Rotate the text 45 degrees",
  userId
);
console.log("Test 5 Result:", result5);
```

**Expected Result:**
- ✅ Text rotated 45 degrees
- ✅ Rotation value normalized to 0-360

### Test 6: Rotate with Alternative Phrasing
```javascript
const result6 = await processAICommand(
  "Turn the rectangle 90 degrees",
  userId
);
console.log("Test 6 Result:", result6);
```

**Expected Result:**
- ✅ Rectangle rotated 90 degrees
- ✅ AI understands "turn" as "rotate"

### Test 7: Delete Shape
```javascript
const result7 = await processAICommand(
  "Delete the red circle",
  userId
);
console.log("Test 7 Result:", result7);
```

**Expected Result:**
- ✅ Red circle removed from canvas
- ✅ Success message confirms deletion
- ✅ Shape disappears from Firestore

### Test 8: Find by Position
```javascript
const result8 = await processAICommand(
  "Move the shape on the left to 3000, 3000",
  userId
);
console.log("Test 8 Result:", result8);
```

**Expected Result:**
- ✅ Finds shape with x < 2500
- ✅ Moves it to specified position
- ✅ Position-based finding works

### Test 9: Superlative Queries (NEW!)
```javascript
// Find largest shape
const result9a = await processAICommand(
  "Move the largest rectangle to the center",
  userId
);

// Find smallest shape
const result9b = await processAICommand(
  "Delete the smallest circle",
  userId
);

console.log("Test 9a (Largest):", result9a);
console.log("Test 9b (Smallest):", result9b);
```

**Expected Result:**
- ✅ Correctly identifies largest/smallest by area
- ✅ Operates on the right shape
- ✅ Superlative logic works

### Test 10: Ambiguous References
```javascript
// Create multiple blue rectangles
await processAICommand("Create a blue rectangle at 1000, 2000", userId);
await processAICommand("Create a blue rectangle at 1500, 2000", userId);

// Try to move "the blue rectangle" (ambiguous)
const result10 = await processAICommand(
  "Move the blue rectangle to 2000, 2000",
  userId
);
console.log("Test 10 Result:", result10);
```

**Expected Result:**
- ✅ Console warning shows ambiguity
- ⚠️ Warning: "Ambiguous reference: matches 2 objects"
- ✅ Uses first match (leftmost)
- ✅ Operation still succeeds

### Test 11: Shape Not Found
```javascript
const result11 = await processAICommand(
  "Move the purple triangle to 1000, 1000",
  userId
);
console.log("Test 11 Result:", result11);
```

**Expected Result:**
- ❌ Success: false
- ❌ Error message: "Could not find shape matching..."
- ✅ Lists available shapes for reference
- ✅ Helpful error message

### Test 12: Relative Movement (AI Calculates)
```javascript
const result12 = await processAICommand(
  "Move the red rectangle to the right",
  userId
);
console.log("Test 12 Result:", result12);
```

**Expected Result:**
- ✅ AI gets current position via getCanvasState
- ✅ Calculates offset (+100 or similar)
- ✅ Calls moveShape with new absolute coordinates
- ✅ Shape moves to the right

---

## Advanced Test Scenarios

### Complex Descriptions
```javascript
// Color + type + position
await processAICommand("Move the blue rectangle on the left to 1000, 1000", userId);

// Superlative + type
await processAICommand("Resize the largest circle to 400x400", userId);

// Multiple operations
await processAICommand("Rotate the text 45 degrees and move it to the center", userId);
```

### Edge Cases
```javascript
// Very small/large sizes (should clamp)
await processAICommand("Resize the rectangle to 10x10", userId); // → 50x50
await processAICommand("Resize the rectangle to 2000x2000", userId); // → 1000x1000

// Out of bounds coordinates (should clamp)
await processAICommand("Move the circle to 6000, 6000", userId); // → clamped

// Non-existent shapes
await processAICommand("Delete the yellow triangle", userId); // → helpful error
```

---

## Verification Checklist

After running tests, verify:

### Visual Verification
- [ ] Shapes moved to correct positions
- [ ] Sizes changed as expected
- [ ] Rotations visible on canvas
- [ ] Deleted shapes disappeared
- [ ] Other shapes unaffected

### Console Logs
- [ ] Success messages clear and descriptive
- [ ] Ambiguity warnings appear when expected
- [ ] Error messages are helpful
- [ ] Available shapes listed in errors

### Performance
- [ ] Single operations < 2 seconds
- [ ] Relative operations (2 function calls) < 4 seconds
- [ ] No lag or freezing

### Error Handling
- [ ] Shape not found → helpful error with list
- [ ] Ambiguous reference → warning + uses first
- [ ] Invalid sizes → clamped to min/max
- [ ] Invalid coordinates → clamped to bounds

---

## New Features in 8.2

### Enhanced Object Finding
- ✅ Color matching (e.g., "red", "blue")
- ✅ Type matching (e.g., "rectangle", "circle", "text")
- ✅ Position matching (e.g., "on the left", "at the top")
- ✅ Color + type (e.g., "blue rectangle")
- ✅ **NEW: Superlatives** (e.g., "largest", "smallest", "leftmost", "rightmost")

### Ambiguity Handling
- ⚠️ Console warnings when multiple matches
- 📋 Lists matching objects with details
- ✓ Uses first match consistently

### Better Error Messages
- ❌ Shape not found → lists available shapes
- ❌ Clear, actionable error messages
- ❌ Helps user understand what went wrong

---

## Response Format

Success response:
```javascript
{
  success: true,
  message: "✅ Operations completed:\n• Moved rectangle to position (2500, 2500)",
  functionCalls: [{
    name: "moveShape",
    arguments: { shapeId: "blue rectangle", x: 2500, y: 2500 }
  }],
  executionResults: [{ success: true, message: "...", objectIds: [...] }],
  metadata: { model: "gpt-4", tokensUsed: 150, responseTime: 1500 }
}
```

Error response:
```javascript
{
  success: false,
  message: "❌ Operations failed:\n• Could not find shape matching 'purple triangle'. Available shapes: red rectangle, blue circle, green rectangle",
  functionCalls: [...],
  executionResults: [{ success: false, message: "...", error: "Shape not found" }],
  metadata: { ... }
}
```

---

## Troubleshooting

### "Could not find shape"
- Create shapes first using Phase 8.1 commands
- Check shape colors match (use available shapes list)
- Try more specific descriptions ("blue rectangle" vs "rectangle")

### Ambiguity warnings but wrong shape selected
- Use more specific descriptions
- Add position hints ("blue rectangle on the left")
- Use superlatives ("largest blue rectangle")

### Relative sizing not working
- AI needs to call getCanvasState first (may take longer)
- Check that shape exists before attempting relative operation
- Try absolute sizing as fallback

---

## Success Criteria for 8.2

All tests should:
- ✅ Identify shapes correctly by description
- ✅ Perform operations (move, resize, rotate, delete)
- ✅ Handle ambiguous references gracefully
- ✅ Provide helpful error messages
- ✅ Support superlative queries
- ✅ Complete in reasonable time (< 2-4 seconds)
- ✅ Sync changes across all users in real-time

---

## Next Phase

Phase 8.3 will add layout commands:
- "Arrange these shapes in a horizontal row"
- "Create a vertical stack"
- "Create a 3x3 grid of squares"
- "Align these shapes to the left"

**Phase 8.2 Status: ✅ COMPLETE**

