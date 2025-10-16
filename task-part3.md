# CollabCanvas - Part 3: Canvas Functionality & Advanced Features

## Overview
This document outlines the implementation plan for core canvas manipulation features and advanced productivity tools for CollabCanvas.

**Status**: 🚧 Planning Phase

---

## Design Decisions & Clarifications

### Phase 11: Core Object Manipulation

**Duplicate Behavior**
- **Multi-object support**: Duplicate works with all currently selected objects (single or multi-select)
- **Smart offset logic**: Detect edge proximity and offset in available direction
  - Default offset: (20px, 20px)
  - Near right edge (within 20px): Offset left (-20px)
  - Near bottom edge (within 20px): Offset up (-20px)
  - Prevents duplicates from going outside canvas bounds

**Resize Behavior**
- **Text objects**: Resize bounding box only, font size stays constant
  - Only width and height of bounding box change
  - Font size remains unchanged (prevents font size from getting out of sync)
  - User can manually adjust font size via text formatting tools (Phase 13)
- **Resize handles**: Rotate with object (not axis-aligned)
  - More intuitive, matches Figma/Sketch behavior
- **Overlap handling**: Allow overlap with locked objects (no collision detection)

**Rotate Behavior**
- **Group rotation**: When multiple objects selected, rotate group around group center (not individual centers)
- **Rotation handle**: Position 30px above top center of selection bounds

### Phase 12: Multi-Select

**Lock Acquisition Strategy**
- Try to acquire locks one-by-one for each object in selection
- Allow partial selections if some objects are locked by others
- Show feedback: "Selected 3 of 5 objects. 2 are being edited by others"

**Marquee Selection**
- Only select objects that existed when marquee drag started
- Don't auto-select objects created during marquee operation (prevents confusion)

**Selection Persistence**
- Selection remains stable when new objects are created
- New objects do NOT auto-add to current selection
- User maintains explicit control over what's selected

### Phase 13: Text Formatting & Editing

**Schema Migration**
- Add new text properties with defaults (no migration script needed):
  - `fontFamily: 'Arial'`
  - `fontSize: 16` (existing field)
  - `fontWeight: 'normal'`
  - `fontStyle: 'normal'`
  - `textDecoration: 'none'`
  - `textAlign: 'left'`
  - `textColor: '#000000'`
  - `backgroundColor: 'transparent'`
- Objects missing these fields will use defaults

**Font Support**
- Use system fonts only (safe, no loading required):
  - Arial, Times New Roman, Courier New, Georgia, Verdana
- No web fonts (avoids loading issues and compatibility problems)

**Collaborative Text Editing**
- Simple lock-based approach: Lock + "Being edited by [User]"
- No real-time collaborative typing (too complex for MVP)
- Only lock holder can edit text

**AI Text Updates**
- AI directly updates text content property (no edit mode)
- Example: "Change button text to Submit" → Just updates `text` field
- No need to programmatically enter edit mode

### Phase 14: Keyboard Shortcuts

**Shortcut Conflicts**
- Document browser/OS conflicts in shortcuts help panel
- Note which shortcuts can't be overridden (Ctrl/Cmd+W, Ctrl/Cmd+T, etc.)

**Shortcuts During Text Editing**
- Disable all shortcuts when in text edit mode
- Exception: Escape key always exits edit mode
- Prevents conflicts (e.g., Ctrl+A selects text, not canvas objects)

### Phase 15: Export

**Size Limits**
- Maximum export dimension: 8192px (per axis)
- Maximum total pixels: 8192 x 8192 (~67 megapixels)
- Show error toast if export exceeds limits
- Safe for most modern browsers

**Export Content**
- Clean export (UI-free):
  - ❌ No other users' cursors
  - ❌ No selection highlights
  - ❌ No lock indicators
  - ❌ No UI overlays
  - ✅ Only canvas objects themselves

### Phase 16: Copy/Paste

**Clipboard API Strategy**
- Use Clipboard API with graceful fallback
- Try Clipboard API first (enables cross-tab paste)
- Fall back to internal state if permission denied or API unavailable
- Show appropriate error messages for permission issues

**Cross-Canvas Support**
- No cross-canvas paste for MVP (keep it simple)
- Clipboard format designed for current canvas only

**Paste Position**
- Paste at current cursor position
- If cursor not on canvas, paste at viewport center
- Successive pastes offset by (20px, 20px) to prevent stacking

### Phase 17: Selection Tools

**Magic Wand Performance**
- Add loading indicator for selections with >100 objects
- Consider limiting to visible viewport if performance issues arise
- Keep selection operations fast and responsive

### Phase 18: Alignment Tools

**Alignment with Locked Objects**
- Only align objects that are successfully locked
- Show feedback: "Aligned 3 of 5 objects. 2 couldn't be locked"
- Acquire locks before attempting alignment
- Partial success is acceptable

**Undo/Redo System**
- Implement as separate Phase 19 (not part of Phase 18)
- Alignment/distribution operations will support undo once Phase 19 is complete
- Don't build undo/redo into alignment - keep it separate

### General Implementation

**Feature Flags**
- Simple localStorage-based feature flags
- Easy to toggle features during development/testing
- Format: `localStorage.setItem('feature_multiSelect', 'true')`
- Fallback to hardcoded defaults if not set

**Object Schema Versioning**
- Add `version: 1` field to all new objects
- Handle missing fields gracefully with sensible defaults
- No breaking changes - always backward compatible

**AI Integration**
- Extend AI to support new features:
  - "Duplicate the red button" → Use duplicate functionality
  - "Align these circles horizontally" → Use alignment tools
  - "Make the rectangle 200x300" → Already supported (resize)
  - "Rotate the square 45 degrees" → Already supported (rotate)
- AI commands should leverage manual features where possible

---

## Phase 11: Core Object Manipulation

### 11.1 Duplicate Functionality ✅
- [x] Implement duplicate keyboard shortcut (Ctrl/Cmd+D)
- [ ] Add "Duplicate" context menu option (deferred - context menu system not implemented)
- [x] Duplicate logic:
  - Copy all object properties (position, size, color, rotation)
  - Smart offset logic based on edge proximity
  - Generate new unique ID (via Firestore)
  - Auto-select duplicated object
  - Release lock on original, acquire lock on duplicate
- [x] Handle duplicate for all object types:
  - Rectangles
  - Circles
  - Text objects
- [x] Sync duplicate operation to all users (via createObjectOptimistic)
- [x] Toast notification: "Object duplicated"
- [ ] Test: Duplicate while another user is viewing
- [ ] Test: Rapid duplicate operations
- [ ] Test: Duplicate objects near canvas boundary (constrain to bounds)

### 11.2 Resize Functionality ✅ COMPLETE
- [x] Add resize handles to selected rectangles (4 corner handles) - Stage 1
- [x] Side handles: Resize in one dimension only (top, bottom, left, right) - Stage 2
- [x] Shift key: Maintain aspect ratio - Stage 2
- [x] Implement resize constraints:
  - Minimum size: 20x20 pixels ✅
  - Maximum size: 2000x2000 pixels ✅
  - Keep object within canvas bounds during resize ✅
- [x] Visual feedback during resize - Stage 2:
  - Show current dimensions tooltip ✅
  - Update handles in real-time ✅
  - Preview resize before release ✅
- [x] Resize for all object types - Stage 3:
  - Rectangles: Standard resize ✅
  - Circles: Maintain circular shape (uniform scaling) ✅
  - Text: Resize bounding box only (font size stays constant) ✅
- [x] Real-time sync of resize to other users (throttled at 50ms) ✅
- [ ] Lock must be held to resize (same as drag)
- [ ] Toast: Show final dimensions on resize complete
- [ ] Test: Resize from each corner/side
- [ ] Test: Resize with rotation applied
- [ ] Test: Resize constraints work correctly

### 11.3 Rotate Functionality (UI Controls) ✅ **COMPLETE**
- [x] Add rotation handle above selected object
- [x] Rotation handle UI:
  - Small circle connected by line to object
  - Position 30px above top center of object
  - Cursor changes to rotation icon on hover
- [x] Implement rotation interaction:
  - Click and drag rotation handle
  - Calculate angle from object center to cursor
  - Snap to 15° increments when Shift key held
  - Show current rotation angle tooltip during drag
- [x] Visual feedback:
  - Rotate preview in real-time
  - Show angle indicator (e.g., "45°")
- [x] Keyboard shortcuts:
  - Rotate 90° clockwise: ] key
  - Rotate 90° counter-clockwise: [ key
  - Reset rotation to 0°: Ctrl/Cmd+Shift+R
- [x] Rotation for all object types:
  - Rectangles: Rotate around center
  - Circles: Rotate around center (visual only for circular shapes)
  - Text: Rotate text with bounding box
- [x] Real-time sync (throttled 50ms during drag)
- [x] Lock required to rotate
- [x] Test: Rotate from 0° to 360°
- [x] Test: Rotation with resize handles
- [x] Test: Snap rotation with Shift key

---

## Phase 12: Multi-Select & Group Operations

### 12.1 Multi-Select Implementation - **STAGE 1 COMPLETE** ✅
- [x] Selection modes:
  - [x] Click + Shift: Add/remove from selection ✅
  - [ ] Click-drag marquee: Select all objects in rectangle (Stage 2)
  - [ ] Ctrl/Cmd+A: Select all objects on canvas (Stage 2)
- [x] Visual feedback:
  - [x] Show selection highlight on all selected objects ✅
  - [x] Show selection count badge ("3 objects selected") ✅
- [x] Selection state management:
  - [x] Store array of selected object IDs ✅
  - [x] Acquire locks on all selected objects ✅
  - [x] Handle lock conflicts (partial success with feedback) ✅
- [x] Deselection:
  - [x] Click empty canvas: Clear selection ✅
  - [x] Escape key: Clear selection ✅
  - [x] Release all locks on deselect ✅
- [x] Test: Select multiple objects with Shift+Click ✅
- [ ] Test: Marquee selection across multiple objects (Stage 2)
- [ ] Test: Select all (Ctrl/Cmd+A) (Stage 2)
- [x] Test: Lock conflicts with multi-select ✅

### 12.2 Group Operations - **STAGE 1 COMPLETE** ✅
- [x] Move multiple objects together:
  - [x] Drag any selected object moves all selected objects ✅
  - [x] Maintain relative positions between objects ✅
  - [x] Constrain group to canvas bounds ✅
  - [x] Throttled sync (50ms) for all objects ✅
- [x] Delete multiple objects:
  - [x] Delete/Backspace: Delete all selected objects ✅
  - [x] Show count feedback ("3 of 3 objects deleted") ✅
  - [x] Release all locks after delete ✅
- [x] Duplicate multiple objects:
  - [x] Ctrl/Cmd+D: Duplicate all selected objects ✅
  - [x] Maintain relative positions in duplicates ✅
  - [x] Offset entire group by (20px, 20px) ✅
- [ ] Group styling (Optional - Stage 3+):
  - [ ] Show bounding box around all selected objects
  - [ ] Display group dimensions
- [x] Test: Move 5+ objects together ✅
- [x] Test: Delete multiple objects ✅
- [x] Test: Duplicate group of objects ✅
- [x] Test: Group operations with rotation/different sizes ✅

---

## Phase 13: Text Formatting & Editing

### 13.1 Text Formatting Controls ✅ COMPLETE
- [x] Add formatting toolbar when text is selected:
  - Font family dropdown (5-10 common fonts)
  - Font size slider/input (8px - 72px)
  - Bold toggle button
  - Italic toggle button
  - Underline toggle button
  - Text color picker
  - Background color picker (optional)
- [x] Text alignment buttons:
  - Left align
  - Center align
  - Right align
  - Justify (optional for MVP)
- [x] Formatting toolbar UI:
  - Appears above selected text object
  - Stays visible while text is selected
  - Disappears on deselect
  - Tooltips for each button
- [x] Apply formatting to entire text object (no inline formatting for MVP)
- [x] Sync formatting changes to all users
- [x] Update text object schema:
  - Add fontFamily, fontWeight, fontStyle, textDecoration fields
  - Add textAlign, textColor, backgroundColor fields
- [x] Test: Apply each formatting option
- [x] Test: Format AI-generated text objects
- [x] Test: Formatting persists after deselect/reselect

### 13.2 Text Editing ✅ COMPLETE
- [x] Double-click text to enter edit mode:
  - Show text cursor (blinking caret)
  - Enable keyboard input
  - Disable canvas pan/zoom while editing
  - Show edit border around text box
- [x] Text editing features:
  - Type to add text
  - Backspace/Delete to remove text
  - Arrow keys to move cursor
  - Click to position cursor
  - Select text with click-drag or Shift+Arrow
  - Cut/Copy/Paste (Ctrl/Cmd+X/C/V)
- [x] Multi-line text support:
  - Enter key: New line
  - Text wraps at bounding box width
  - Auto-expand height as needed
- [x] Edit mode exit:
  - Click outside text: Save and exit
  - Escape key: Cancel changes
  - Ctrl/Cmd+Enter: Save and exit
- [x] Lock behavior during edit:
  - Must have lock to edit
  - Lock prevents other users from editing
  - Show "Being edited by [User]" to others
- [x] Real-time sync:
  - Throttle text updates (200ms) while typing
  - Send final version on exit
  - Other users see live typing indicator
- [x] Test: Edit text with multiple users viewing
- [x] Test: Multi-line text editing
- [x] Test: Cut/copy/paste text
- [x] Test: Cancel vs save changes

---

## Phase 14: Keyboard Shortcuts (Tier 1)

### 14.1 Tool Shortcuts ✅ COMPLETE
- [x] Implement keyboard shortcuts:
  - `V` or `Esc`: Select tool
  - `R`: Rectangle tool
  - `C`: Circle tool
  - `T`: Text tool
- [x] Show shortcuts in toolbar tooltips
- [x] Disable shortcuts when typing in text fields
- [x] Visual feedback: Highlight active tool on keypress

### 14.2 Object Manipulation Shortcuts ✅ COMPLETE
- [x] Selection shortcuts:
  - `Ctrl/Cmd+A`: Select all
  - `Esc`: Deselect all
  - `Tab`: Select next object
  - `Shift+Tab`: Select previous object
- [x] Edit shortcuts:
  - `Ctrl/Cmd+D`: Duplicate
  - `Ctrl/Cmd+C`: Copy
  - `Ctrl/Cmd+V`: Paste (placeholder for now)
  - `Ctrl/Cmd+X`: Cut
  - `Delete` or `Backspace`: Delete
- [x] Transform shortcuts:
  - `[`: Rotate 90° counter-clockwise
  - `]`: Rotate 90° clockwise
  - `Ctrl/Cmd+Shift+R`: Reset rotation
- [x] Canvas shortcuts:
  - `Ctrl/Cmd+0`: Reset zoom to 100%
  - `Ctrl/Cmd++`: Zoom in
  - `Ctrl/Cmd+-`: Zoom out
  - `Space+Drag`: Pan canvas (even when not in select mode)
  - `Ctrl/Cmd+Shift+E`: Export canvas (placeholder)

### 14.3 Shortcuts Panel
- [ ] Create keyboard shortcuts help panel:
  - Trigger with `?` key or Help button
  - Modal overlay showing all shortcuts
  - Categorized by function (Selection, Tools, Transform, etc.)
  - Search/filter shortcuts
  - Close with Escape or click outside
- [ ] Show shortcuts in context menus
- [ ] Display shortcuts in tooltips throughout app
- [ ] Test: All shortcuts work as expected
- [ ] Test: Shortcuts disabled during text editing

---

## Phase 15: Export Functionality (Tier 1)

### 15.1 PNG Export
- [ ] Add "Export" button to toolbar/menu
- [ ] Export current viewport as PNG:
  - Capture visible canvas area
  - Render at current zoom level
  - Include all visible objects (exclude UI elements)
- [ ] Export options dialog:
  - Export viewport (what you see)
  - Export entire canvas (5000x5000)
  - Export selected objects only
  - Choose scale/resolution (1x, 2x, 4x)
  - Include/exclude background
- [ ] PNG export implementation:
  - Use Konva's `.toDataURL()` method
  - Convert canvas to PNG blob
  - Trigger browser download
  - Filename: `canvas-export-[timestamp].png`
- [ ] Progress indicator for large exports
- [ ] Handle errors gracefully (browser permissions, memory limits)
- [ ] Test: Export viewport at different zoom levels
- [ ] Test: Export entire canvas (check memory usage)
- [ ] Test: Export with complex scenes (50+ objects)

### 15.2 SVG Export
- [ ] SVG export implementation:
  - Convert Konva shapes to SVG elements
  - Map Konva properties to SVG attributes
  - Handle rotations, colors, strokes
- [ ] SVG export options:
  - Same options as PNG (viewport/entire/selected)
  - Option to embed vs external styles
  - Option to optimize file size
- [ ] SVG structure:
  - Proper viewBox for scalability
  - Grouped objects with IDs
  - Clean, readable output
- [ ] Download SVG file:
  - Trigger browser download
  - Filename: `canvas-export-[timestamp].svg`
- [ ] Test: SVG output opens in Illustrator/Figma
- [ ] Test: SVG maintains colors and transformations
- [ ] Test: Text objects export correctly as text (not paths)

### 15.3 Export UI
- [ ] Export button in header toolbar
- [ ] Export modal with options:
  - Format selector (PNG/SVG tabs)
  - Area selector (Viewport/Entire/Selected)
  - Scale selector for PNG (1x/2x/4x)
  - Background toggle
  - Preview thumbnail
  - File size estimate
  - "Export" and "Cancel" buttons
- [ ] Show success toast after export
- [ ] Error handling with helpful messages
- [ ] Test: Complete export flow for both formats

---

## Phase 16: Copy/Paste Functionality (Tier 1)

### 16.1 Copy to Clipboard
- [ ] Implement copy operation (Ctrl/Cmd+C):
  - Serialize selected object(s) properties
  - Store in browser clipboard (Clipboard API)
  - Fallback to internal clipboard state
  - Support copying multiple objects
- [ ] Clipboard data structure:
  - Store object type, position, dimensions, color, rotation
  - Store relative positions for multi-object copy
  - Store text content and formatting
  - Include timestamp and user ID
- [ ] Visual feedback:
  - Toast: "Copied 1 object" or "Copied 3 objects"
  - Brief highlight animation on copied objects
- [ ] Test: Copy single object
- [ ] Test: Copy multiple objects
- [ ] Test: Copy/paste between browser tabs

### 16.2 Cut Operation
- [ ] Implement cut operation (Ctrl/Cmd+X):
  - Copy to clipboard (same as Ctrl+C)
  - Delete original object(s)
  - Require lock to cut
  - Release locks after cut
- [ ] Visual feedback:
  - Toast: "Cut 1 object"
  - Objects disappear immediately
- [ ] Undo support (optional for tier 1):
  - Allow undo of cut operation
  - Restore objects in original position
- [ ] Test: Cut and paste workflow
- [ ] Test: Cut with lock conflicts

### 16.3 Paste from Clipboard
- [ ] Implement paste operation (Ctrl/Cmd+V):
  - Read from clipboard
  - Deserialize object data
  - Create new object(s) with new IDs
  - Paste at current viewport center (or cursor position)
  - Offset by (20px, 20px) if pasting in same location
  - Auto-select pasted objects
- [ ] Handle paste errors:
  - Invalid clipboard data
  - Clipboard permission denied
  - Empty clipboard
- [ ] Cross-tab paste:
  - Support pasting objects copied in different tab
  - Use Clipboard API for cross-tab support
- [ ] Visual feedback:
  - Toast: "Pasted 1 object" or "Pasted 3 objects"
  - Pasted objects appear selected
- [ ] Test: Copy from one area, paste in another
- [ ] Test: Copy in one tab, paste in another
- [ ] Test: Paste multiple times (creates multiple copies)

### 16.4 Advanced Clipboard Features
- [ ] Paste and drag:
  - Hold mouse button during paste
  - Drag pasted object to position
  - Release to place
- [ ] Paste with offset:
  - Each successive paste offsets by (20px, 20px)
  - Prevents objects stacking exactly
- [ ] Clipboard preview:
  - Show preview of clipboard contents on hover over paste button
  - Display count of objects in clipboard
- [ ] Test: Paste multiple times in sequence
- [ ] Test: Clipboard persists across page refresh (optional)

---

## Phase 17: Selection Tools (Tier 2)

### 17.1 Magic Wand Selection
- [ ] Implement color-based selection:
  - Click object with Magic Wand tool
  - Select all objects with same color
  - Option: Tolerance slider (exact color vs similar colors)
- [ ] Magic Wand UI:
  - Add tool to toolbar
  - Tolerance slider in tool options panel
  - Visual feedback: Show matched objects briefly before selecting
- [ ] Selection logic:
  - Compare hex color values
  - Apply tolerance (±RGB value range)
  - Select all matches across canvas
- [ ] Test: Select all red rectangles
- [ ] Test: Tolerance slider affects results
- [ ] Test: Works with AI-generated objects

### 17.2 Select by Type
- [ ] Add "Select Similar" option:
  - Right-click object → "Select Similar"
  - Selects all objects of same type (all rectangles, all circles, all text)
- [ ] Menu options in toolbar:
  - "Select All Rectangles"
  - "Select All Circles"
  - "Select All Text Objects"
- [ ] Combine with existing selection:
  - Shift+Select Similar: Add to selection
  - Alt+Select Similar: Remove from selection
- [ ] Test: Select all rectangles in complex scene
- [ ] Test: Combine type selection with manual selection

### 17.3 Select Inverse
- [ ] Implement inverse selection:
  - Menu option: "Select Inverse" (Ctrl/Cmd+Shift+I)
  - Deselects current selection
  - Selects all previously unselected objects
- [ ] Use case: Select everything except one object
- [ ] Test: Select one object, inverse selection
- [ ] Test: Inverse empty selection (selects all)

### 17.4 Selection Filters
- [ ] Add selection filter panel:
  - Filter by type (rectangles/circles/text)
  - Filter by color (color picker)
  - Filter by size range (min/max width/height)
  - Filter by creator (objects I created / others created)
- [ ] Live filter preview:
  - Matching objects highlight as filters change
  - Apply button to finalize selection
- [ ] Save filter presets (optional)
- [ ] Test: Complex filter combinations
- [ ] Test: Filter with large object counts

---

## Phase 18: Alignment Tools (Tier 2)

### 18.1 Basic Alignment
- [ ] Add alignment toolbar (appears when multiple objects selected):
  - Align Left: Align all objects to leftmost edge
  - Align Center Horizontally: Center all objects on shared vertical axis
  - Align Right: Align all objects to rightmost edge
  - Align Top: Align all objects to topmost edge
  - Align Center Vertically: Center all objects on shared horizontal axis
  - Align Bottom: Align all objects to bottommost edge
- [ ] Alignment logic:
  - Calculate bounding box of all selected objects
  - Move objects to aligned positions
  - Maintain relative spacing or overlap as specified
- [ ] Visual feedback:
  - Preview alignment with guidelines before applying
  - Show alignment axis line during operation
- [ ] Test: Align 5+ objects horizontally
- [ ] Test: Align objects with different sizes
- [ ] Test: Align with rotation applied

### 18.2 Distribution Tools
- [ ] Distribute spacing between objects:
  - Distribute Horizontally: Equal spacing left to right
  - Distribute Vertically: Equal spacing top to bottom
  - Distribute Centers Horizontally: Equal spacing between centers
  - Distribute Centers Vertically: Equal spacing between centers
- [ ] Distribution logic:
  - Sort objects by position
  - Calculate total available space
  - Divide equally between objects
  - Move objects to distributed positions
- [ ] Options:
  - Respect object edges vs centers
  - Set custom spacing amount
- [ ] Visual feedback:
  - Show spacing measurements during distribution
  - Preview before applying
- [ ] Test: Distribute 10 objects evenly
- [ ] Test: Distribute objects of varying sizes
- [ ] Test: Distribute with canvas boundary constraints

### 18.3 Advanced Alignment Features
- [ ] Align to canvas:
  - Align to canvas center
  - Align to canvas edges
- [ ] Align to selection:
  - Align to first selected object
  - Align to last selected object
  - Align to largest object in selection
- [ ] Smart guides during manual drag:
  - Show alignment lines when object aligns with others
  - Snap to alignment (5px threshold)
  - Show distance measurements
- [ ] Alignment history:
  - Undo alignment operations
  - Redo alignment
- [ ] Test: Align to canvas center
- [ ] Test: Smart guides during drag
- [ ] Test: Undo/redo alignment operations

### 18.4 Alignment UI
- [ ] Alignment toolbar design:
  - Icon buttons for each alignment type
  - Tooltips with keyboard shortcuts
  - Appears below main toolbar when 2+ objects selected
  - Grouping: [Align] [Distribute] [Advanced]
- [ ] Keyboard shortcuts:
  - Ctrl/Cmd+Shift+L: Align left
  - Ctrl/Cmd+Shift+H: Center horizontally
  - Ctrl/Cmd+Shift+R: Align right
  - Ctrl/Cmd+Shift+T: Align top
  - Ctrl/Cmd+Shift+M: Center vertically
  - Ctrl/Cmd+Shift+B: Align bottom
- [ ] Context menu option: Right-click selection → Align submenu
- [ ] Test: All alignment shortcuts work
- [ ] Test: Alignment toolbar appears/disappears correctly

---

## Implementation Strategy

### Phase Order Recommendation
1. **Start with Phase 11** (Core Object Manipulation) - Foundation for other features
2. **Then Phase 12** (Multi-Select) - Enables group operations
3. **Then Phase 14** (Keyboard Shortcuts) - Improves UX for all features
4. **Then Phase 16** (Copy/Paste) - High-value productivity feature
5. **Then Phase 15** (Export) - Allows users to share work
6. **Then Phase 13** (Text Formatting) - Enhances text capabilities
7. **Finally Phases 17-18** (Advanced Selection/Alignment) - Power user features

### Testing Strategy
- Unit tests for each feature (alignment calculations, clipboard serialization, etc.)
- Integration tests for workflows (copy → paste → align)
- Manual testing with multiple users for sync behavior
- Performance testing with 50+ objects
- Browser compatibility (Chrome, Firefox, Safari, Edge)

### Success Criteria
- All basic shortcuts work without conflicts
- Copy/paste works reliably across tabs
- Alignment is pixel-perfect
- Export produces high-quality output
- Multi-select can handle 50+ objects smoothly
- Text editing is responsive with no lag

---

## Notes
- All features must maintain real-time sync with other users
- All operations require object lock (except read-only operations)
- Maintain 60 FPS during all interactions
- Follow existing patterns for toast notifications and error handling
- Use existing lock/unlock mechanisms for object manipulation

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Status**: 🚧 Ready for implementation planning

