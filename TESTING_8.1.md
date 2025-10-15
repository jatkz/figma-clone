# Phase 8.1 Testing Guide - AI Creation Commands

## Overview
This guide shows how to test AI creation commands via the browser console for Phase 8.1 implementation.

## Prerequisites
1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Log in with Auth0
4. Open browser developer console (F12 or Cmd+Option+I)

## Setup in Console

First, get your user ID and import the AI service:

```javascript
// Get the current user ID from the auth context
// You can find this by inspecting the Redux/Context state or looking at the network tab
// For now, we'll use a placeholder - replace with your actual user ID
const userId = "your-auth0-user-id"; // Replace with actual ID from Auth0

// Import the AI service function
const { processAICommand } = await import('/src/services/aiService.ts');
```

## Test Commands

### Test 1: Create a Red Circle at Specific Position
```javascript
const result1 = await processAICommand(
  "Create a red circle at position 100, 200",
  userId
);
console.log("Test 1 Result:", result1);
```

**Expected Result:**
- ✅ Success: true
- ✅ Red circle created at coordinates (100, 200)
- ✅ Circle has default size (100x100 → radius 50)
- ✅ Message confirms creation

### Test 2: Add a Blue Rectangle in the Center
```javascript
const result2 = await processAICommand(
  "Add a blue rectangle in the center",
  userId
);
console.log("Test 2 Result:", result2);
```

**Expected Result:**
- ✅ Success: true
- ✅ Blue rectangle created at canvas center (2500, 2500)
- ✅ Rectangle has default size (100x100)
- ✅ Message confirms creation

### Test 3: Make a 200x300 Green Rectangle
```javascript
const result3 = await processAICommand(
  "Make a 200x300 green rectangle",
  userId
);
console.log("Test 3 Result:", result3);
```

**Expected Result:**
- ✅ Success: true
- ✅ Green rectangle with dimensions 200x300
- ✅ Positioned at canvas center (default when not specified)
- ✅ Message includes size information

### Test 4: Add Text that Says "Hello World"
```javascript
const result4 = await processAICommand(
  "Add text that says 'Hello World'",
  userId
);
console.log("Test 4 Result:", result4);
```

**Expected Result:**
- ✅ Success: true
- ✅ Text object created with "Hello World"
- ✅ Text color is black (default)
- ✅ Font size is 16px (default)
- ✅ Positioned at canvas center (default)

### Test 5: Create a Title that Says "Welcome"
```javascript
const result5 = await processAICommand(
  "Create a title that says 'Welcome'",
  userId
);
console.log("Test 5 Result:", result5);
```

**Expected Result:**
- ✅ Success: true
- ✅ Text object created with "Welcome"
- ✅ Text color is black (default)
- ✅ Font size is 16px (default)

### Test 6: Random Colors (Shapes)
```javascript
const result6a = await processAICommand(
  "Create a circle at 500, 500",
  userId
);
const result6b = await processAICommand(
  "Create a rectangle at 700, 500",
  userId
);
console.log("Test 6a (Circle):", result6a);
console.log("Test 6b (Rectangle):", result6b);
```

**Expected Result:**
- ✅ Both shapes created with random colors
- ✅ Colors are different from each other (likely)
- ✅ Colors are from the predefined palette

### Test 7: Size Constraints (Min/Max)
```javascript
// Test minimum size enforcement (should clamp to 50)
const result7a = await processAICommand(
  "Create a 10x10 rectangle at 1000, 1000",
  userId
);

// Test maximum size enforcement (should clamp to 1000)
const result7b = await processAICommand(
  "Create a 2000x2000 rectangle at 1500, 1500",
  userId
);

console.log("Test 7a (Min Size):", result7a);
console.log("Test 7b (Max Size):", result7b);
```

**Expected Result:**
- ✅ First rectangle is 50x50 (minimum enforced)
- ✅ Second rectangle is 1000x1000 (maximum enforced)
- ✅ Both created successfully

### Test 8: Coordinate Clamping
```javascript
// Test coordinates outside canvas bounds (should clamp)
const result8 = await processAICommand(
  "Create a rectangle at 6000, 6000",
  userId
);
console.log("Test 8 (Coordinate Clamping):", result8);
```

**Expected Result:**
- ✅ Rectangle created (clamped to valid coordinates)
- ✅ Final position within bounds (≤ 5000)
- ✅ No error thrown

## Verification

After running tests, verify in the canvas UI:
1. Open the canvas in the browser
2. Pan to the coordinates mentioned in tests
3. Visual check:
   - Shapes exist at correct positions
   - Colors match what was requested
   - Sizes are correct
   - Text content is correct

## AI Response Structure

A successful response looks like:
```javascript
{
  success: true,
  message: "✅ Operations completed:\n• Created rectangle at position (2500, 2500)",
  functionCalls: [{
    name: "createShape",
    arguments: {
      type: "rectangle",
      x: 2500,
      y: 2500,
      color: "blue"
    }
  }],
  executionResults: [{
    success: true,
    message: "Created rectangle at position (2500, 2500)",
    objectIds: ["some-uuid"]
  }],
  metadata: {
    model: "gpt-4",
    tokensUsed: 123,
    responseTime: 1234
  }
}
```

## Debugging Tips

### Can't Find User ID?
Check the auth state in the console:
```javascript
// If using React DevTools, inspect the Auth context
// Or check localStorage
localStorage.getItem('auth0.is.authenticated');
```

### Import Errors?
Make sure the dev server is running and you're using the correct import path:
```javascript
// Alternative import if the first doesn't work
import { processAICommand } from '../src/services/aiService.ts';
```

### API Key Issues?
Verify your `.env.local` file has:
```
VITE_OPENAI_API_KEY=sk-...your-key...
```

### Rate Limiting?
Wait a minute and try again. The service has rate limiting:
- Max 20 requests per minute

### Check AI State Initialization?
Verify in console logs:
```
🤖 Initializing AI Canvas state tracking
🤖 AI Canvas State Updated: N objects
```

## Success Criteria for 8.1

All tests should:
- ✅ Return `success: true`
- ✅ Create shapes visible on canvas
- ✅ Apply correct defaults (random colors, black text, 100x100 size)
- ✅ Enforce size constraints (50-1000)
- ✅ Clamp coordinates to canvas bounds
- ✅ Show success messages
- ✅ Complete in < 2 seconds

## Next Steps

After verifying all tests pass:
1. ✅ Phase 8.1 is complete
2. 🎯 Move to Phase 8.2: Manipulation Commands
3. 🎯 Eventually build chat UI in Phase 9

## Troubleshooting

### No shapes appearing?
- Check browser console for errors
- Verify Firebase connection
- Check canvas objects in Firestore console
- Pan/zoom canvas to find shapes

### AI not responding?
- Verify OpenAI API key is set
- Check network tab for API calls
- Look for rate limit messages
- Verify AI state initialized (check console logs)

### Wrong colors/sizes?
- Check execution results in response object
- Verify parameters passed to createShape
- Check canvas object in Firestore

---

**Happy Testing! 🚀**

