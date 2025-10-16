# Bug Fix: Keyboard Shortcuts Conflicting with Input Fields

## Issue
Canvas keyboard shortcuts (Delete, Backspace, Ctrl+D, etc.) were triggering even when the user was typing in:
1. **Text editing mode** - Pressing Backspace would delete the entire text object instead of deleting a character
2. **AI chat input** - Typing in the AI chat could trigger unwanted canvas actions

## Root Cause
The Canvas component's keyboard event listener was attached to the entire `window`:
```typescript
window.addEventListener('keydown', handleKeyDown);
```

This meant ALL keyboard events on the page were captured, including those intended for input fields.

## Solution
Added two layers of protection in the keyboard handler:

### 1. Check for Text Editing Mode
```typescript
// Disable all canvas shortcuts during text editing
if (editingTextId) {
  return;
}
```

When a text object is being edited (`editingTextId` is set), all canvas shortcuts are disabled.

### 2. Check for Input Field Focus
```typescript
// Disable canvas shortcuts when typing in input fields (AI chat, etc.)
const target = e.target as HTMLElement;
if (
  target.tagName === 'INPUT' ||
  target.tagName === 'TEXTAREA' ||
  target.isContentEditable
) {
  return;
}
```

This prevents canvas shortcuts from triggering when the user is typing in:
- `<input>` elements (AI chat input, any future search boxes, etc.)
- `<textarea>` elements (text editor overlay, any future text areas)
- `contentEditable` elements (any rich text editors)

## Files Modified
- `src/components/Canvas.tsx`: Added two-layer protection to keyboard event handler (text editing check, input field focus check)

## Testing

### Text Editing
1. Create a text object
2. Double-click to edit
3. Press **Backspace** → Should delete a character, NOT the object ✅
4. Press **Delete** → Should delete a character, NOT the object ✅
5. Press **Escape** → Cancels edit (handled by TextEditorOverlay) ✅

### AI Chat
1. Open AI chat panel
2. Click in the input field
3. Type a message
4. Press **Backspace** → Should delete a character in the input ✅
5. Press **Delete** → Should delete a character in the input ✅
6. Object shortcuts should NOT trigger ✅

### Normal Canvas Operation
1. Select an object (without editing)
2. Press **Delete** or **Backspace** → Object is deleted ✅
3. Press **Ctrl+D** → Object is duplicated ✅
4. All shortcuts work normally when NOT in an input field ✅

## Best Practice
This is a standard pattern in web applications: Always check if keyboard events originate from input fields before processing global shortcuts.

**Pattern to follow:**
```typescript
window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  
  // Skip if user is typing in an input
  if (target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable) {
    return;
  }
  
  // Process global shortcuts here
});
```

## Impact
- ✅ Text editing now works correctly (Backspace/Delete work as expected)
- ✅ AI chat input works without interference
- ✅ Any future input fields will automatically be protected
- ✅ Canvas shortcuts still work normally when appropriate

## Related
- Phase 13.2: Text Editing implementation
- AIChat component (`src/components/AIChat.tsx`)
- TextEditorOverlay component (`src/components/TextEditorOverlay.tsx`)

