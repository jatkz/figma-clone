# CollabCanvas AI Agent - Part 2 Development Tasks

## Overview
Build an AI Canvas Agent that manipulates the collaborative canvas through natural language using OpenAI GPT-4 function calling. Users can say "Create a blue rectangle in the center" and the AI executes canvas operations that sync in real-time to all users.

**Prerequisites**: Part 1 must be complete (multiplayer canvas with real-time sync, object locking, cursor tracking)

---

## Phase 7: Foundation & AI Integration (Hours 25-32)

### 7.1 AI Service Setup
- [x] Install OpenAI SDK: `npm install openai`
- [x] Create `src/services/aiService.ts`
- [x] Set up OpenAI API client with GPT-4
- [x] Add environment variables for OpenAI API key
- [x] Create basic chat completion function
- [x] Add error handling and rate limiting
- [x] Test basic AI connectivity

### 7.2 Function Calling Schema
- [x] Define AI tool schema in `src/types/aiTools.ts`:
  - `createShape(type, x, y, width, height, color)`
  - `moveShape(shapeId, x, y)`
  - `resizeShape(shapeId, width, height)`  
  - `rotateShape(shapeId, degrees)`
  - `createText(text, x, y, fontSize, color)`
  - `deleteShape(shapeId)`
  - `getCanvasState()`
  - `arrangeShapes(shapeIds, layout)`
- [x] Map AI tools to existing canvas service functions
- [x] Add or modify service functions that are missing
- [x] Add input validation and sanitization
- [x] Handle coordinate system conversions

### 7.3 Extended Canvas Objects
- [x] Add `Circle` shape type to `types/canvas.ts`
- [x] Add `Text` shape type to `types/canvas.ts`
- [x] Update Firestore schema for new object types
- [x] Create `Circle.tsx` component with Konva
- [x] Create `TextObject.tsx` component with Konva
- [x] Update `Canvas.tsx` to render new object types
- [x] Add creation tools for circles and text
- [x] Fix TypeScript union type issues (follow-up task)

---

## Phase 8: Core AI Commands (Hours 33-40)

### 8.1 Creation Commands
- [x] Implement shape creation via AI:
  - "Create a red circle at position 100, 200"
  - "Add a blue rectangle in the center"
  - "Make a 200x300 green rectangle"
- [x] Implement text creation via AI:
  - "Add text that says 'Hello World'"
  - "Create a title that says 'Welcome'"
- [x] Handle coordinate parsing and validation
- [x] Add default size/color fallbacks
- [x] Test creation command accuracy

### 8.2 Manipulation Commands  
- [x] Implement object selection by description:
  - "Move the blue rectangle to the center"
  - "Select the red circle"
- [x] Implement resize operations:
  - "Make the circle twice as big"
  - "Resize the rectangle to 300x200"
- [x] Implement rotation operations:
  - "Rotate the text 45 degrees"
  - "Turn the rectangle 90 degrees"
- [x] Add object finding algorithms (by color, type, position)
- [x] Handle ambiguous object references

### 8.3 Layout Commands
- [x] Implement arrangement algorithms:
  - "Arrange these shapes in a horizontal row"
  - "Create a vertical stack"
  - "Space these elements evenly"
- [x] Implement grid creation:
  - "Create a 3x3 grid of squares"
  - "Make a 2x4 grid of circles"
- [x] Add alignment operations:
  - "Align these shapes to the left"
  - "Center these objects vertically"
- [x] Calculate proper spacing and positioning

---

## Phase 9: AI Chat Interface (Hours 41-48)

### 9.1 Chat UI Components
- [x] Create `src/components/AIChat.tsx`
- [x] Design floating chat panel (similar to UserList)
- [x] Add message history display
- [x] Create message input with send button
- [x] Add typing indicators and loading states
- [x] Style with Tailwind for consistency
- [x] Add keyboard shortcuts (Enter to send)

### 9.2 Chat Integration
- [x] Add AI chat toggle button to header
- [x] Integrate chat panel with App.tsx layout
- [x] Implement message state management
- [x] Add chat history persistence (localStorage)
- [x] Handle concurrent AI requests
- [x] Add error message display
- [x] Implement message timestamps

### 9.3 AI Response Processing
- [x] Parse AI function calls from responses
- [x] Execute canvas operations sequentially
- [x] Provide feedback on operation success/failure
- [x] Handle partial failures in multi-step operations
- [x] Add operation progress indicators
- [x] Show AI "thinking" and "executing" states

---

## Phase 10: Complex Multi-Step Operations (Hours 49-56)

### 10.1 Form Generation
- [x] Implement "Create a login form" command:
  - Username input field (text object + rectangle background)
  - Password input field (text object + rectangle background)  
  - Submit button (rectangle + text)
  - Proper alignment and spacing
- [x] Implement "Create a contact form":
  - Name, email, message fields
  - Submit and reset buttons
  - Label text for each field
- [x] Add form layout algorithms
- [x] Handle complex multi-object creation

### 10.2 Navigation & UI Elements
7- [x] Implement "Create a navigation bar":
  - Background rectangle
  - 4 menu item buttons (Home, About, Services, Contact)
  - Proper spacing and alignment
- [x] Implement "Create a card layout":
  - Card background rectangle
  - Title text at top
  - Image placeholder rectangle
  - Description text below
  - Action button at bottom
- [x] Add component templating system (pattern library in system prompt)

### 10.3 Advanced Layout Operations
- [ ] Implement smart object grouping
- [ ] Add relative positioning (beside, above, below)
- [ ] Implement responsive spacing calculations
- [ ] Add object duplication for patterns
- [ ] Handle complex spatial relationships
- [ ] Add layout validation and correction

---

## Phase 11: Shared AI State & Collaboration (Hours 57-64)

### 11.1 AI Operation Sync
- [ ] Extend Firestore schema for AI operations
- [ ] Create `ai_operations` collection
- [ ] Sync AI commands across all users
- [ ] Show AI activity indicators to all users
- [ ] Handle concurrent AI requests from multiple users
- [ ] Add AI operation history/log

### 11.2 Multi-User AI Coordination
- [ ] Implement operation queuing system
- [ ] Add conflict resolution for overlapping AI commands
- [ ] Show "AI is working" status to all users
- [ ] Handle user interruptions of AI operations
- [ ] Add AI operation cancellation
- [ ] Prevent conflicting simultaneous AI requests

### 11.3 AI Context Management
- [ ] Maintain canvas context for AI (current objects, layout)
- [ ] Add conversation history for better context
- [ ] Implement context-aware suggestions
- [ ] Handle references to previously created objects
- [ ] Add smart object naming and referencing
- [ ] Clear outdated context appropriately

---

## Phase 12: Advanced AI Features (Hours 65-72)

### 12.1 Natural Language Understanding
- [ ] Improve object recognition ("the big blue circle")
- [ ] Handle relative positioning ("to the right of the text")
- [ ] Add measurement understanding (pixels, percentages)
- [ ] Implement color name recognition
- [ ] Handle sequential operations ("first create X, then Y")
- [ ] Add undo/redo for AI operations

### 12.2 Smart Defaults & Context
- [ ] Use canvas center as default position
- [ ] Implement smart sizing based on existing objects
- [ ] Add color palette suggestions
- [ ] Use existing object styles as templates
- [ ] Implement "similar to" operations
- [ ] Add pattern recognition and continuation

### 12.3 AI Performance Optimization
- [ ] Implement response caching for common commands
- [ ] Add operation batching for complex commands
- [ ] Optimize function calling payload size
- [ ] Add command prediction and pre-processing
- [ ] Implement streaming responses for long operations
- [ ] Add performance monitoring and analytics

---

## Phase 13: Testing & Polish (Hours 73-80)

### 13.1 AI Command Testing
- [ ] Test all 6+ command categories comprehensively
- [ ] Verify sub-2 second response times
- [ ] Test complex multi-step operations
- [ ] Validate real-time sync across users
- [ ] Test error handling and edge cases
- [ ] Performance test with multiple concurrent users

### 13.2 User Experience Polish
- [ ] Add helpful command suggestions
- [ ] Implement command history and favorites
- [ ] Add AI command examples/help
- [ ] Improve error messages and guidance
- [ ] Add success animations and feedback
- [ ] Polish chat interface design

### 13.3 Production Readiness
- [ ] Add comprehensive error boundaries
- [ ] Implement proper API rate limiting
- [ ] Add usage analytics and monitoring
- [ ] Create user documentation
- [ ] Add AI safety guardrails
- [ ] Prepare deployment configuration

---

## Technical Architecture

### AI Service Stack
```typescript
// Core AI service structure
interface AIService {
  processCommand(message: string, canvasContext: CanvasContext): Promise<AIResponse>
  executeOperations(operations: CanvasOperation[]): Promise<ExecutionResult>
  getCanvasContext(): CanvasContext
}

// Function calling schema
interface CanvasTool {
  name: string
  description: string
  parameters: ToolParameters
  handler: (params: any) => Promise<CanvasOperation>
}
```

### Integration Points
- **Canvas Service**: Extend existing operations for AI use
- **Real-time Sync**: All AI operations sync via existing Firestore system  
- **User Interface**: Integrate chat panel with existing layout
- **Error Handling**: Extend existing toast system for AI feedback

### Performance Targets
- **Latency**: <2s for single-step commands
- **Throughput**: Handle 10+ concurrent AI requests  
- **Accuracy**: 95%+ command interpretation success
- **Reliability**: <1% operation failures
- **User Experience**: Immediate visual feedback, smooth interactions

### Security Considerations
- Input sanitization for all AI-generated parameters
- Rate limiting per user and globally
- Validation of all canvas operations
- Safe handling of user-provided text content
- API key security and rotation

---

## Deployment Notes

### Environment Variables
```
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_AI_MODEL=gpt-4
VITE_AI_MAX_TOKENS=1000
VITE_AI_TEMPERATURE=0.1
```

### Additional Dependencies
```json
{
  "openai": "^4.20.0",
  "zod": "^3.22.0",
  "lodash": "^4.17.21"
}
```

This comprehensive task breakdown transforms your collaborative canvas into an AI-powered design tool that responds to natural language commands while maintaining real-time collaboration across all users.
