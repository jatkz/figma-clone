# Phase 8.3 Testing Guide - AI Layout Commands

## Overview
This guide shows how to test AI layout commands (arrange, align, distribute, grid creation) via the browser console for Phase 8.3 implementation.

## Prerequisites
1. Complete Phase 8.1 and 8.2
2. Browser console open (F12)
3. User logged in with Auth0

## Setup in Console

```javascript
// Get your user ID
const userId = "your-auth0-user-id"; // Replace with actual ID

// Import the AI service function
const { processAICommand } = await import('/src/services/aiService.ts');
```

---

## Test Commands

### Setup Test Data

First, create some shapes to arrange:

```javascript
// Create test shapes for arrangement
await processAICommand("Create a red rectangle at 1000, 1000", userId);
await processAICommand("Create a blue rectangle at 1300, 1000", userId);
await processAICommand("Create a green rectangle at 1600, 1000", userId);
await processAICommand("Create a yellow circle at 2000, 1000", userId);
await processAICommand("Create a purple rectangle at 1000, 1300", userId);
```

---

## Part 1: Arrangement Algorithms

### Test 1: Horizontal Row
```javascript
const result1 = await processAICommand(
  "Arrange these shapes in a horizontal row: red rectangle, blue rectangle, green rectangle",
  userId
);
console.log("Test 1 Result:", result1);
```

**Expected Result:**
- ✅ Three rectangles arranged left to right
- ✅ Evenly spaced (20px default)
- ✅ Y positions unchanged
- ✅ X positions sequential

### Test 2: Vertical Stack
```javascript
const result2 = await processAICommand(
  "Create a vertical stack with the circles",
  userId
);
console.log("Test 2 Result:", result2);
```

**Expected Result:**
- ✅ Circles stacked top to bottom
- ✅ Evenly spaced (20px default)
- ✅ X positions unchanged
- ✅ Y positions sequential

### Test 3: Custom Spacing
```javascript
const result3 = await processAICommand(
  "Arrange the rectangles in a horizontal row with 50 pixel spacing",
  userId
);
console.log("Test 3 Result:", result3);
```

**Expected Result:**
- ✅ Rectangles arranged horizontally
- ✅ 50px spacing between shapes
- ✅ Spacing is consistent

---

## Part 2: Alignment Operations

### Test 4: Align Left
```javascript
const result4 = await processAICommand(
  "Align these shapes to the left: red rectangle, blue rectangle, green rectangle",
  userId
);
console.log("Test 4 Result:", result4);
```

**Expected Result:**
- ✅ All shapes aligned to leftmost X position
- ✅ Y positions unchanged
- ✅ Leftmost edge aligned

### Test 5: Align Right
```javascript
const result5 = await processAICommand(
  "Align the rectangles to the right",
  userId
);
console.log("Test 5 Result:", result5);
```

**Expected Result:**
- ✅ All shapes aligned to rightmost position
- ✅ Right edges aligned (accounting for width)
- ✅ Y positions unchanged

### Test 6: Align Top
```javascript
const result6 = await processAICommand(
  "Align these to the top: red rectangle, blue rectangle",
  userId
);
console.log("Test 6 Result:", result6);
```

**Expected Result:**
- ✅ All shapes aligned to topmost Y position
- ✅ X positions unchanged
- ✅ Top edges aligned

### Test 7: Align Bottom
```javascript
const result7 = await processAICommand(
  "Align these shapes to the bottom",
  userId
);
console.log("Test 7 Result:", result7);
```

**Expected Result:**
- ✅ All shapes aligned to bottom
- ✅ Bottom edges aligned (accounting for height)
- ✅ X positions unchanged

### Test 8: Center Alignment
```javascript
const result8 = await processAICommand(
  "Center these objects: red rectangle, blue rectangle, green rectangle",
  userId
);
console.log("Test 8 Result:", result8);
```

**Expected Result:**
- ✅ All shapes moved to canvas center (2500, 2500)
- ✅ Stacked on top of each other at center
- ✅ All centered

---

## Part 3: Distribution

### Test 9: Distribute Horizontally
```javascript
const result9 = await processAICommand(
  "Distribute these shapes evenly horizontally: red rectangle, blue rectangle, green rectangle",
  userId
);
console.log("Test 9 Result:", result9);
```

**Expected Result:**
- ✅ Shapes distributed along X axis
- ✅ Even spacing between shapes
- ✅ First and last positions unchanged
- ✅ Y positions unchanged

### Test 10: Distribute Vertically
```javascript
const result10 = await processAICommand(
  "Space these elements evenly vertically",
  userId
);
console.log("Test 10 Result:", result10);
```

**Expected Result:**
- ✅ Shapes distributed along Y axis
- ✅ Even spacing between shapes
- ✅ First and last positions unchanged
- ✅ X positions unchanged

---

## Part 4: Grid Arrangement (Existing Shapes)

### Test 11: Grid Layout
```javascript
// Create more shapes first
await processAICommand("Create 6 circles at random positions", userId);

const result11 = await processAICommand(
  "Arrange all circles in a grid",
  userId
);
console.log("Test 11 Result:", result11);
```

**Expected Result:**
- ✅ Circles arranged in 3x2 grid (default 3 columns)
- ✅ Even spacing
- ✅ Grid starts at leftmost/topmost position

### Test 12: Custom Grid Columns
```javascript
const result12 = await processAICommand(
  "Arrange the rectangles in a grid with 2 columns",
  userId
);
console.log("Test 12 Result:", result12);
```

**Expected Result:**
- ✅ Rectangles in 2-column grid
- ✅ Rows calculated automatically
- ✅ Even spacing

---

## Part 5: Grid Creation (NEW Feature!)

### Test 13: Create 3x3 Grid of Squares
```javascript
const result13 = await processAICommand(
  "Create a 3x3 grid of squares",
  userId
);
console.log("Test 13 Result:", result13);
```

**Expected Result:**
- ✅ 9 new rectangles created
- ✅ Arranged in 3 rows, 3 columns
- ✅ Centered on canvas
- ✅ Random colors
- ✅ 100x100 size (default)
- ✅ 20px spacing (default)

### Test 14: Create 2x4 Grid of Circles
```javascript
const result14 = await processAICommand(
  "Make a 2x4 grid of circles",
  userId
);
console.log("Test 14 Result:", result14);
```

**Expected Result:**
- ✅ 8 new circles created
- ✅ 2 rows, 4 columns
- ✅ Centered on canvas
- ✅ Random colors

### Test 15: Colored Grid
```javascript
const result15 = await processAICommand(
  "Create a 5x5 grid of red rectangles",
  userId
);
console.log("Test 15 Result:", result15);
```

**Expected Result:**
- ✅ 25 red rectangles created
- ✅ 5x5 grid
- ✅ All same color (red)
- ✅ Evenly spaced

### Test 16: Custom Size Grid
```javascript
const result16 = await processAICommand(
  "Create a 3x3 grid of 150 pixel blue squares",
  userId
);
console.log("Test 16 Result:", result16);
```

**Expected Result:**
- ✅ 9 blue squares created
- ✅ Each square is 150x150
- ✅ Appropriately spaced
- ✅ All blue

### Test 17: Custom Spacing Grid
```javascript
const result17 = await processAICommand(
  "Create a 4x4 grid of circles with 50 pixel spacing",
  userId
);
console.log("Test 17 Result:", result17);
```

**Expected Result:**
- ✅ 16 circles created
- ✅ 4x4 arrangement
- ✅ 50px spacing between shapes
- ✅ Larger overall grid

### Test 18: Small Grid
```javascript
const result18 = await processAICommand(
  "Create a 2x2 grid of small green squares",
  userId
);
console.log("Test 18 Result:", result18);
```

**Expected Result:**
- ✅ 4 green squares
- ✅ 2x2 arrangement
- ✅ AI interprets "small" appropriately

---

## Edge Cases & Validation

### Test 19: Too Large Grid
```javascript
const result19 = await processAICommand(
  "Create a 50x50 grid of rectangles",
  userId
);
console.log("Test 19 Result:", result19);
```

**Expected Result:**
- ❌ Success: false
- ❌ Error: "Grid cannot have more than 100 shapes"
- ✅ Helpful error message
- ✅ No shapes created

### Test 20: Invalid Grid Size
```javascript
const result20 = await processAICommand(
  "Create a 0x0 grid of circles",
  userId
);
console.log("Test 20 Result:", result20);
```

**Expected Result:**
- ❌ Success: false
- ❌ Error about invalid grid dimensions
- ✅ No shapes created

### Test 21: Single Shape Operations
```javascript
const result21 = await processAICommand(
  "Distribute the red rectangle horizontally",
  userId
);
console.log("Test 21 Result:", result21);
```

**Expected Result:**
- ❌ Success: false
- ❌ Error: "Need at least 2 shapes to distribute"
- ✅ Helpful error message

---

## Advanced Scenarios

### Test 22: Complex Arrangement
```javascript
// Create varied shapes
await processAICommand("Create a large red rectangle at 1000, 1000", userId);
await processAICommand("Create a small blue circle at 1200, 1000", userId);
await processAICommand("Create a medium green rectangle at 1400, 1000", userId);

const result22 = await processAICommand(
  "Arrange these shapes in a horizontal row with proper spacing",
  userId
);
console.log("Test 22 Result:", result22);
```

**Expected Result:**
- ✅ Different sized shapes arranged
- ✅ Spacing accounts for varying widths
- ✅ Aligned properly

### Test 23: Multiple Operations
```javascript
const result23a = await processAICommand(
  "Create a 3x3 grid of red squares",
  userId
);
const result23b = await processAICommand(
  "Align all red squares to the left",
  userId
);
console.log("Test 23a (Create):", result23a);
console.log("Test 23b (Align):", result23b);
```

**Expected Result:**
- ✅ Grid created first
- ✅ Then aligned (destroying grid pattern)
- ✅ Both operations succeed

### Test 24: Grid at Specific Position
```javascript
const result24 = await processAICommand(
  "Create a 4x4 grid of circles starting at position 500, 500",
  userId
);
console.log("Test 24 Result:", result24);
```

**Expected Result:**
- ✅ 16 circles created
- ✅ Grid starts at (500, 500)
- ✅ Not centered

---

## Verification Checklist

After running tests, verify:

### Visual Verification
- [ ] Horizontal arrangements look correct
- [ ] Vertical stacks are aligned
- [ ] Alignments work as expected (left, right, top, bottom)
- [ ] Distribution is evenly spaced
- [ ] Grids are properly formed
- [ ] Grid shapes are correctly sized and colored

### Arrangement Quality
- [ ] Spacing is consistent
- [ ] Shapes don't overlap
- [ ] Arrangements stay within canvas bounds
- [ ] Large grids are centered properly

### Performance
- [ ] Single arrangement < 2 seconds
- [ ] Grid creation (9 shapes) < 5 seconds
- [ ] Grid creation (100 shapes) < 20 seconds
- [ ] No lag or freezing

### Error Handling
- [ ] Too large grids rejected
- [ ] Invalid sizes rejected
- [ ] Single shape distribution errors
- [ ] Helpful error messages

---

## New Features in 8.3

### Arrangement Algorithms ✅
- ✅ Horizontal row
- ✅ Vertical stack
- ✅ Grid (existing shapes)

### Alignment Operations ✅
- ✅ Align left (leftmost X)
- ✅ Align right (rightmost X + width)
- ✅ Align top (topmost Y)
- ✅ Align bottom (bottommost Y + height)
- ✅ Center (canvas center)

### Distribution ✅
- ✅ Distribute horizontal (even X spacing)
- ✅ Distribute vertical (even Y spacing)
- ✅ Maintains first/last positions
- ✅ Calculates gaps automatically

### Grid Creation (NEW!) ✅
- ✅ Create NxM grids of new shapes
- ✅ Supports rectangles, circles, text
- ✅ Custom size (50-1000)
- ✅ Custom spacing (default 20)
- ✅ Custom colors or random
- ✅ Custom position or centered
- ✅ Validates grid size (max 100 shapes)
- ✅ Max 20 rows/columns

---

## Command Variations

The AI understands many phrasings:

### Arrangement
- "Arrange these in a row"
- "Put these in a horizontal line"
- "Stack these vertically"
- "Make a vertical column"

### Alignment
- "Align to the left"
- "Left align these"
- "Make these align left"
- "Line up on the left side"

### Distribution
- "Space evenly"
- "Distribute horizontally"
- "Spread these out evenly"
- "Even spacing between these"

### Grid Creation
- "Create a 3x3 grid of squares"
- "Make a grid of circles, 4 by 4"
- "Generate a 5x5 grid of rectangles"
- "Create grid: 3 rows, 3 columns, red squares"

---

## Response Format

Success response (arrangement):
```javascript
{
  success: true,
  message: "✅ Operations completed:\n• Arranged 3 shapes in horizontal layout",
  functionCalls: [{
    name: "arrangeShapes",
    arguments: {
      shapeIds: ["red rectangle", "blue rectangle", "green rectangle"],
      layout: "horizontal"
    }
  }],
  executionResults: [...],
  metadata: { ... }
}
```

Success response (grid creation):
```javascript
{
  success: true,
  message: "✅ Operations completed:\n• Created 3x3 grid of rectangles (9 shapes)",
  functionCalls: [{
    name: "createGrid",
    arguments: {
      shapeType: "rectangle",
      rows: 3,
      columns: 3
    }
  }],
  executionResults: [...],
  metadata: { ... }
}
```

---

## Troubleshooting

### "No shapes found to arrange"
- Create shapes first using Phase 8.1 commands
- Verify shape descriptions match existing shapes
- Use `getCanvasState` to see what's available

### Grid not appearing
- Check size constraints (50-1000)
- Verify total shapes ≤ 100
- Pan canvas to find grid (might be off-screen)

### Arrangement looks wrong
- Check that shapes exist before arranging
- Verify shape descriptions are correct
- Try more specific descriptions

### Distribution not working
- Need at least 2 shapes
- Shapes must be findable by description
- Check error messages for details

---

## Success Criteria for 8.3

All tests should:
- ✅ Arrange shapes correctly (horizontal, vertical, grid)
- ✅ Align shapes properly (left, right, top, bottom, center)
- ✅ Distribute shapes evenly (horizontal, vertical)
- ✅ Create grids of new shapes (any size up to 100 shapes)
- ✅ Handle custom spacing
- ✅ Validate grid parameters
- ✅ Provide helpful error messages
- ✅ Complete in reasonable time
- ✅ Sync changes in real-time

---

## Next Phase

Phase 9 will add AI Chat Interface:
- Floating chat panel UI
- Message history
- Real-time typing indicators
- No more console testing!

**Phase 8.3 Status: ✅ COMPLETE**

