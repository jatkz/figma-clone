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
Shape selection commands are in Phase 8.2 (not yet implemented).

### Shapes not visible
Pan the canvas or check coordinates. Canvas is 5000x5000, viewport may be elsewhere.

## Next Phase Features (Not Yet Available)

Phase 8.2 will add:
- "Move the blue rectangle to 100, 200"
- "Resize the circle to 200x200"
- "Rotate the text 45 degrees"
- "Delete the red circle"

Phase 8.3 will add:
- "Arrange these shapes in a row"
- "Create a 3x3 grid"
- "Center these objects"

---

**Phase 8.1 Status: ✅ Complete**

