# 🤖 AI Canvas Agent - Usage Guide

The AI Canvas Agent allows you to manipulate the collaborative canvas using natural language commands through OpenAI's GPT-4 with function calling.

## 🚀 Quick Start

### 1. Environment Setup

Add your OpenAI API key to your `.env` file:

```env
VITE_OPENAI_API_KEY=sk-your_openai_api_key_here
VITE_AI_MODEL=gpt-4                    # optional, defaults to gpt-4
VITE_AI_MAX_TOKENS=1000                # optional, defaults to 1000  
VITE_AI_TEMPERATURE=0.1                # optional, defaults to 0.1
```

### 2. Testing in Browser Console

Open your browser console and try these commands:

```javascript
// Quick connectivity test
await window.aiTest.quick()

// Send a command to the AI
await window.aiTest.command("Create a blue rectangle in the center")

// See all available examples
window.aiTest.showExamples()

// Try a random example
await window.aiTest.command(window.aiTest.randomExample("create"))
```

## 🎨 Supported Commands

### CREATE SHAPES
```
"Create a blue rectangle in the center"
"Make a red square at position 100, 200"
"Add a green rectangle that is 200x150 pixels"
```

### MOVE OBJECTS
```
"Move the blue rectangle to the top left"
"Put the red shape in the center"
"Move the rectangle to position 1000, 1500"
```

### RESIZE OBJECTS
```
"Make the blue rectangle twice as big"
"Resize the red shape to 300x200"
"Make the rectangle smaller - 50x50"
```

### ROTATE OBJECTS
```
"Rotate the blue rectangle 45 degrees"
"Turn the red shape 90 degrees"
"Spin the circle 30 degrees clockwise"
```

### DELETE OBJECTS
```
"Delete the blue rectangle"
"Remove the red shape"
"Delete the circle"
```

### ARRANGE LAYOUTS
```
"Arrange all shapes in a horizontal row"
"Put the rectangles in a vertical line"  
"Create a 3x3 grid with all the shapes"
"Center all the objects"
"Align the shapes to the left"
```

### CANVAS ANALYSIS
```
"What's on the canvas?"
"Show me the current canvas state"
"How many objects are there?"
```

### COMPLEX OPERATIONS
```
"Create a login form with username and password fields"
"Make a navigation bar with 4 menu items"
"Build a card layout with title and description"
```

## 🔧 Technical Details

### Function Calling Schema

The AI agent uses these tools to manipulate the canvas:

- **`createShape`** - Create rectangles, circles (coming), text (coming)
- **`moveShape`** - Move objects to new positions
- **`resizeShape`** - Change object dimensions
- **`rotateShape`** - Rotate objects by degrees
- **`deleteShape`** - Remove objects from canvas
- **`getCanvasState`** - Analyze current canvas contents
- **`arrangeShapes`** - Organize multiple objects in layouts

### Coordinate System

- Canvas bounds: 0-5000 x 0-5000 pixels
- Use "center" for canvas center (2500, 2500)
- Coordinates are automatically validated and constrained

### Shape Finding

The AI can find shapes using natural descriptions:
- By color: "the blue rectangle", "red shape"
- By type: "the circle", "rectangle"  
- By position: "top rectangle", "left shape"
- By ID: exact Firestore document ID

### Color Support

Supports color names and hex codes:
- Names: red, blue, green, yellow, orange, purple, pink, black, white, gray
- Hex: #ff0000, #0066cc, etc.
- CSS: rgb(255,0,0), rgba(0,100,200,0.5)

## 🚨 Rate Limiting

- **Limit**: 20 requests per minute per user
- **Automatic**: Enforced by client-side rate limiting
- **Check status**: `window.aiTest.rateLimit()`

## 🧪 Testing & Development

### Full Test Suite
```javascript
await window.aiTest.runTests()
```

### Manual Testing
```javascript
// Initialize canvas state tracking
window.aiTest.initCanvas()

// Test a command
await window.aiTest.command("Create 3 blue rectangles in a row")

// Check rate limits
window.aiTest.rateLimit()

// Cleanup
window.aiTest.cleanupCanvas()
```

### Available Examples
```javascript
window.aiTest.examples        // All command examples by category
window.aiTest.randomExample("create")  // Random example from category
window.aiTest.showExamples()  // Print all examples to console
```

## 🎯 Performance Targets

- **Latency**: < 2 seconds for single-step commands
- **Reliability**: Consistent execution with error handling
- **Multiplayer**: All users see AI-generated results in real-time
- **Conflict Resolution**: Multiple users can use AI simultaneously

## 🔄 Real-time Sync

All AI operations are automatically synced to:
- Firestore database for persistence
- All connected users via real-time subscriptions
- Canvas state with optimistic updates
- Conflict resolution through object locking

## 🐛 Troubleshooting

### Common Issues

1. **No API Key**: Add `VITE_OPENAI_API_KEY` to `.env`
2. **Rate Limited**: Wait 1 minute or check `window.aiTest.rateLimit()`
3. **Shape Not Found**: Use more specific descriptions like "blue rectangle"
4. **Canvas Empty**: Create some shapes first with create commands

### Debug Tools

```javascript
// Check AI connectivity
await window.aiTest.connectivity()

// Initialize canvas tracking
window.aiTest.initCanvas()

// Check current objects
await window.aiTest.command("What's on the canvas?")
```

## 📈 Coming Soon (Phase 7.3+)

- **Circle shapes** - True circle rendering
- **Text objects** - Rich text with fonts and sizing
- **Advanced layouts** - More sophisticated arrangements
- **Chat interface** - Dedicated AI chat panel
- **Conversation history** - Multi-turn conversations
- **Complex operations** - Multi-step form generation

---

**Ready to try it?** Start with: `await window.aiTest.command("Create a blue rectangle in the center")`
