# AI Canvas Commands - Quick Reference

## Console Testing Setup

```javascript
// Get your user ID (check Auth0 state or network tab)
const userId = "your-user-id-here";

// Import AI service
const { processAICommand } = await import('/src/services/aiService.ts');

// Test a command
const result = await processAICommand("Create a red circle at 100, 200", userId);
console.log(result);
```

## Command Examples (Phase 8.1 - Creation)

### Shapes
```javascript
// Specific position and color
"Create a red circle at position 100, 200"
"Make a blue rectangle at 500, 500"
"Add a green circle at 1000, 1000"

// Center positioning
"Add a blue rectangle in the center"
"Create a red circle in the center"

// With dimensions
"Make a 200x300 green rectangle"
"Create a 150x150 blue square at 1000, 1000"
"Add a 400x200 rectangle in the center"

// Random colors (don't specify color)
"Create a circle at 500, 500"
"Make a rectangle at 1000, 1000"
```

### Text
```javascript
// Basic text
"Add text that says 'Hello World'"
"Create text that says 'Welcome to CollabCanvas'"

// Titles
"Create a title that says 'Welcome'"
"Add a title that says 'Dashboard'"

// With positioning
"Add text that says 'Click Here' at 2500, 2500"
"Create text that says 'Footer' at position 100, 4800"
```

## Default Values

| What | Shape | Text |
|------|-------|------|
| **Size** | 100x100 | Auto-calculated |
| **Color** | Random | Black |
| **Position** | Center (2500, 2500) | Center (2500, 2500) |
| **Font** | N/A | Arial, 16px |

## Constraints

- **Min Size**: 50x50 pixels
- **Max Size**: 1000x1000 pixels
- **Coordinates**: 0-5000 (clamped if outside)
- **Center**: 2500, 2500

## Response Format

```javascript
{
  success: true,
  message: "✅ Operations completed:\n• Created rectangle at position (2500, 2500)",
  functionCalls: [...],      // What AI decided to do
  executionResults: [...],   // What actually happened
  metadata: {
    model: "gpt-4",
    tokensUsed: 123,
    responseTime: 1234
  }
}
```

## Common Issues

### "Rate limit exceeded"
Wait 60 seconds. Max 20 requests/minute.

### "Invalid API key"
Check `.env.local` has `VITE_OPENAI_API_KEY=sk-...`

### "Could not find shape"
- Create shapes first using Phase 8.1 commands
- Check error message for list of available shapes
- Try more specific descriptions ("blue rectangle" vs "rectangle")
- Use superlatives to disambiguate ("largest blue rectangle")

### Shapes not visible
Pan the canvas or check coordinates. Canvas is 5000x5000, viewport may be elsewhere.

## Command Examples (Phase 8.2 - Manipulation) ✅

### Move Commands
```javascript
// Absolute positioning
"Move the blue rectangle to 1000, 2000"
"Move the red circle to the center"

// Relative movement (AI calculates)
"Move the text to the right"
"Move the shape down a bit"
```

### Resize Commands
```javascript
// Absolute sizing
"Resize the rectangle to 300x200"
"Make the circle 400x400"

// Relative sizing (AI calculates)
"Make the circle twice as big"
"Make the rectangle 50% larger"
```

### Rotate Commands
```javascript
"Rotate the text 45 degrees"
"Turn the rectangle 90 degrees"
"Rotate the shape 180 degrees"
```

### Delete Commands
```javascript
"Delete the red circle"
"Remove the text"
"Delete the largest rectangle"
```

### Advanced Finding
```javascript
// By superlatives
"Move the largest rectangle to the center"
"Delete the smallest circle"
"Rotate the leftmost text 45 degrees"

// By position
"Move the shape on the left to 2000, 2000"
"Delete the rectangle at the top"

// Color + type (most specific)
"Resize the blue rectangle to 500x300"
```

## Command Examples (Phase 8.3 - Layout) ✅

### Arrangement
```javascript
// Horizontal row
"Arrange these shapes in a horizontal row: red rectangle, blue rectangle"

// Vertical stack
"Create a vertical stack with the circles"

// Grid (existing shapes)
"Arrange all rectangles in a grid"
```

### Alignment
```javascript
// Left align
"Align these shapes to the left"

// Right align
"Align these to the right"

// Top/Bottom align
"Align to the top"
"Align to the bottom"

// Center
"Center these objects"
```

### Distribution
```javascript
// Horizontal distribution
"Distribute these shapes evenly horizontally"

// Vertical distribution
"Space these evenly vertically"
```

### Grid Creation (NEW!)
```javascript
// Basic grid
"Create a 3x3 grid of squares"

// Colored grid
"Make a 5x5 grid of red rectangles"

// Custom size
"Create a 4x4 grid of 150 pixel circles"

// Custom spacing
"Make a 2x2 grid with 50 pixel spacing"
```

## Next Phase Features (Not Yet Available)

Phase 9.2 will add:
- AI Chat toggle button in header
- Integrated chat panel
- No more console testing!

---

**Phase 8.1 Status: ✅ Complete**  
**Phase 8.2 Status: ✅ Complete**  
**Phase 8.3 Status: ✅ Complete**  
**Phase 9.1 Status: ✅ Complete (UI component ready)**

