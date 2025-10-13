# CollabCanvas MVP - Product Requirements Document

## Project Overview

**Project Name:** CollabCanvas MVP  
**Timeline:** 24 hours to MVP checkpoint  
**Tech Stack:** React + Firestore + Auth0  
**Deployment Target:** Vercel

## 1. Executive Summary

Build a real-time collaborative canvas application where multiple users can simultaneously create, move, and manipulate shapes while seeing each other's cursors and changes in real-time. This MVP focuses exclusively on proving the collaborative infrastructure works flawlessly.

## 2. Success Criteria

### MVP Hard Gate Requirements
- ✅ Basic canvas with pan/zoom functionality
- ✅ At least one shape type (rectangle, circle, or text)
- ✅ Ability to create and move objects
- ✅ Real-time sync between 2+ users
- ✅ Multiplayer cursors with name labels
- ✅ Presence awareness (who's online)
- ✅ User authentication (users have accounts/names)
- ✅ Deployed and publicly accessible

### Performance Targets
- 60 FPS during all interactions
- <100ms sync latency for object changes
- <50ms sync latency for cursor positions

## 3. Technical Architecture

### 3.1 Frontend (React)
**Framework:** React 18+ with TypeScript  
**Canvas Library:** Konva.js (React-Konva wrapper)  
**State Management:** React Context + useReducer  
**Styling:** Tailwind CSS

### 3.2 Backend (Firebase)
**Database:** Firestore
- Real-time subscriptions for canvas state
- Optimistic updates with rollback on conflict
- **Single shared canvas** - All users collaborate on one global canvas

**Collections Structure:**
```
/canvas (single document: "global")
  - metadata: { createdAt, lastModified }
  - cursors: {} (empty - cursors stored in subcollection)

/canvas/objects/{objectId} (subcollection for scalability)
  - type: 'rectangle' | 'circle' | 'text'
  - x, y, width, height
  - color, rotation
  - createdBy, modifiedBy
  - lockedBy: userId | null
  - lockedAt: timestamp | null
  - version: number

/canvas/cursors/{userId} (subcollection to avoid write contention)
  - x, y
  - name: string
  - color: string
  - lastSeen: timestamp

/users/{userId}
  - displayName: string
  - email: string
  - cursorColor: string (randomly assigned)
  - createdAt: timestamp
  - lastSeen: timestamp
```

**Note:** Objects and cursors use subcollections instead of maps to avoid Firestore's 1 write/second per document limit. This allows multiple users to update simultaneously without contention.

### 3.3 Authentication
**Provider:** Auth0  
**Features:**
- Email/password authentication
- Social login (Google)
- User profile with display name
- Persistent sessions

### 3.4 Deployment
**Hosting:** Vercel  
**Environment Variables:**
- Firebase config
- Auth0 credentials

## 4. Feature Specifications

### 4.1 Canvas Core

#### Pan & Zoom
- **Pan:** Click and drag on empty canvas area
- **Zoom:** Mouse wheel or pinch gesture
- **Zoom Range:** 10% to 400%
- **Canvas Size:** 5000x5000px virtual space

#### Viewport Management
- Initial viewport centered at (0, 0)
- Viewport position persisted per user (local state)
- Smooth animations for zoom transitions

### 4.2 Shape Management

#### Rectangle Shape (MVP Priority)
**Properties:**
- Position: x, y (constrained to 0-5000 canvas boundaries)
- Dimensions: width, height (default: 100x100)
- Color: fill color (randomly assigned on creation)
- Rotation: degrees

**Creation:**
- Click "Rectangle" tool button
- Click on canvas to place rectangle at 100x100 default size
- Rectangle appears at click position with random color
- Objects cannot be placed outside 0-5000 canvas boundaries

**Interactions:**
- Click to select (shows selection highlight to all users)
- First user to select locks the object for editing
- Locked objects cannot be selected/moved by other users
- Drag to move (only if you have the lock)
- Objects cannot be dragged outside canvas boundaries
- Show selection box when selected
- Delete with Delete/Backspace key (no confirmation, removes lock)
- Lock released on deselect or after 30 seconds of inactivity

### 4.3 Real-Time Collaboration

#### Multiplayer Cursors
**Display:**
- Show cursor position for all online users via subcollection
- Cursor styled with user's randomly assigned color
- Name label appears above cursor
- Cursor position updates use teleport (instant position change, no interpolation)

**Update Frequency:**
- Throttle cursor updates to 50ms (20Hz)
- Each user writes to their own document: `/canvas/cursors/{userId}`
- Avoids write contention on single document
- Cursor positions update instantly (no smooth interpolation for MVP simplicity)

#### Object Synchronization
**Conflict Resolution Strategy:** Object Locking
- First user to select an object obtains an exclusive lock
- Lock stored in object document: `lockedBy` field with userId
- Other users see visual indicator that object is locked
- Lock automatically released after 30 seconds of inactivity (client-side check)
- Lock released when user deselects or deletes object

**Lock Timeout Mechanism:**
- Each client runs local timeout checker every 5 seconds
- Checks their own locked objects for expiry (> 30s since lockedAt)
- Client optimistically releases expired locks they see
- Race conditions handled by Firestore transactions on lock acquisition

**Edit Lock Behavior:**
- Only lock holder can move/modify locked object
- Other users can view but cannot interact
- Visual indicator shows who has the lock (colored border)
- Attempting to select locked object shows toast: "Being edited by [UserName]"

**Sync Events:**
- Object created → immediate broadcast
- Object moved → throttled to 50ms during drag
- Object deleted → immediate broadcast + permanent removal
- Object locked/unlocked → immediate broadcast

**Error Handling:**
- Failed operations trigger rollback of optimistic local changes
- Show error toast notification to user
- Reload object state from Firestore on conflict

#### Presence System
**Online Status:**
- Show list of active users
- Display user avatar/initials + name
- Show count of online users
- Highlight current user

**Connection Management:**
- Detect disconnections via Firestore onDisconnect
- Clean up stale presence data after 30 seconds
- Reconnect handling with state reconciliation

### 4.4 State Persistence

#### Canvas State
- Auto-save on every change to single global canvas
- No explicit "Save" button needed
- Firestore handles persistence automatically
- **Initial State:** Empty canvas on first load
- **Initial Viewport:** Centered at (2500, 2500) - middle of 5000x5000 canvas
- **Persistence:** All objects persist across sessions
- When any user creates/modifies objects, changes persist for all future sessions

#### Recovery Scenarios
- Page refresh: Load latest state from Firestore
- Network disconnect/reconnect: Resync on reconnection
- All users leave: State persists in Firestore
- Return later: Load complete canvas state

### 4.5 Authentication & User Management

#### Auth Flow
1. Landing page with "Sign In" button
2. Auth0 hosted login page
3. Redirect back to canvas with token
4. Store user profile in Firestore `/users/{userId}`

#### User Profile
- userId (from Auth0)
- displayName (from Auth0, fallback to email prefix)
- email
- cursorColor (randomly assigned on first join from predefined palette)
- createdAt

**Color Palette for Cursors:**
```javascript
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788'
];
// Randomly assigned on user creation
```

#### Session Management
- Token refresh handled by Auth0 SDK
- Logout clears local state and Auth0 session

## 5. User Interface

### 5.1 Layout
```
+--------------------------------------------------+
|  [Logo] CollabCanvas    [User List]  [User Menu] |
+--------------------------------------------------+
|  [Tools]                                          |
|  [ ▭ ]  Rectangle                                 |
|  [ ○ ]  Circle                                    |
|  [ T ]  Text                                      |
|                                                   |
|                     CANVAS                        |
|                                                   |
|                                                   |
+--------------------------------------------------+
|  Zoom: [120%]  Connected: [●] 3 users            |
+--------------------------------------------------+
```

### 5.2 Tool Panel
- Vertical toolbar on left side
- Rectangle, Circle, Text tools
- Active tool highlighted
- Keyboard shortcuts (R, C, T)

### 5.3 User Presence Indicator
- Top-right corner
- Show avatars of online users
- Max 5 avatars, then "+N more"
- Click to see full list

### 5.4 Canvas Controls
- Zoom percentage display
- Reset zoom button
- Connection status indicator

## 6. Data Flow

### 6.1 Object Creation Flow
```
1. User clicks Rectangle tool (tool state is local, not synced)
2. User clicks on canvas at position (x, y)
3. Generate unique objectId using Firestore auto-ID
4. Create object locally at (x, y) with 100x100 size (optimistic update)
5. Send to Firestore with createdBy userId
6. Firestore broadcasts to all clients
7. Other clients receive and render at exact position
```

### 6.2 Object Selection & Locking Flow
```
1. User clicks on object
2. Check if object is locked by another user
3. If locked, show toast notification and abort
4. If unlocked, acquire lock:
   - Set object.lockedBy = currentUserId
   - Set object.lockedAt = timestamp
   - Update Firestore
5. Firestore broadcasts lock to all clients
6. Other clients show visual indicator (colored border)
7. Lock holder can now move/modify object
8. On deselect or 30s timeout, release lock:
   - Set object.lockedBy = null
   - Update Firestore
```
```
1. User drags object
2. Update local position (no lag)
3. Throttle Firestore updates (every 50ms)
4. Send position delta to Firestore
5. Other clients interpolate movement
```

### 6.3 Object Movement Flow
```
1. User drags locked object (must have lock)
2. Update local position immediately (no lag)
3. Throttle Firestore updates (every 50ms during drag)
4. Send position delta to Firestore
5. Other clients receive updates and interpolate movement smoothly
6. On mouse up, send final position
7. Lock remains active until deselected
```

### 6.4 Cursor Movement Flow
```
1. Track mouse position on canvas
2. Throttle updates to 33ms
3. Update Firestore presence document
4. Other clients subscribe to presence changes
5. Render cursors with smooth interpolation
```

## 7. Error Handling

### Network Errors
- Show toast notification on disconnect
- Queue local changes
- Retry failed operations
- Resync on reconnection

### Conflict Resolution
- Object locking prevents most conflicts
- If lock expires (30s timeout) while user still editing:
  - Attempt to re-acquire lock
  - If another user acquired it, show notification
  - Discard local changes
- Network race conditions handled by Firestore transaction

### Authentication Errors
- Redirect to login on token expiration
- Show error message for failed login
- Handle Auth0 errors gracefully

## 8. Testing Strategy

### Unit Tests
Test individual functions and components in isolation:
- `objectFactory.createRectangle()` - validates object creation with boundaries
- `colors.getRandomColor()` - returns valid hex color
- Lock timeout logic - correctly identifies expired locks
- Coordinate transformation - canvas to screen space conversion
- Boundary checking - prevents objects outside 0-5000 range

### Integration Tests  
Test feature workflows end-to-end:
- **Object Creation Flow:**
  - Click canvas → object created locally → saved to Firestore → appears for other users
- **Object Locking Flow:**
  - User 1 selects → lock acquired → User 2 attempts select → rejected with toast
- **Object Movement Flow:**
  - Drag object → position updates locally → throttled save → other users see movement
- **Cursor Sync Flow:**
  - Mouse move → throttled update → other users see cursor position
- **Lock Timeout Flow:**
  - Select object → wait 30s → lock auto-released → other user can select

### Manual Testing Checklist
- [ ] Open canvas in 2 browser windows
- [ ] Create rectangle in window 1, verify appears in window 2
- [ ] Move object in window 1, verify moves in window 2
- [ ] See both cursors with correct names
- [ ] Refresh window 2, verify state persists
- [ ] Create/move objects rapidly, check for conflicts
- [ ] Disconnect network, verify reconnection handling
- [ ] Test with 3+ users simultaneously

### Performance Testing
- [ ] 60 FPS maintained during pan/zoom
- [ ] No lag when moving objects
- [ ] Cursor movement smooth and responsive
- [ ] Canvas handles 50+ objects without slowdown

## 9. Development Phases

### Phase 1: Setup (Hours 0-2)
- Initialize React + TypeScript project with Vite
- Setup single Firebase project (dev/prod combined)
- Configure Auth0 with email/password authentication
- Setup Vercel deployment
- Basic app shell with routing

### Phase 2: Authentication (Hours 2-4)
- Implement Auth0 integration (email/password)
- Login/logout flow
- Protected routes
- User profile creation with random cursor color assignment

### Phase 3: Canvas Core (Hours 4-8)
- Setup Konva canvas with pan/zoom
- Implement rectangle rendering (100x100 default size)
- Click-to-place creation (no click-drag)
- Local tool selection state
- Basic object selection visual feedback

### Phase 4: Firestore Integration (Hours 8-14)
- Setup single global canvas document structure
- Object CRUD operations with Firestore auto-ID generation
- Real-time subscriptions to canvas document
- State persistence (empty initial state, persists all changes)
- Implement object locking mechanism

### Phase 5: Multiplayer Features (Hours 14-20)
- Cursor tracking with 50ms throttling
- Store cursors in main canvas document
- Cursor display with user names and random colors
- Presence system showing online users
- Visual indicators for locked objects
- Toast notifications for lock conflicts

### Phase 6: Polish & Testing (Hours 20-24)
- Bug fixes
- Performance optimization
- Multi-browser/window testing with manual approach
- Lock timeout implementation (30s)
- Deployment to Vercel with .vercel.app domain
- Final verification on deployed URL

## 10. Out of Scope (Post-MVP)

The following features are explicitly NOT part of the MVP:
- Multiple canvases (single global canvas only)
- Circle and text shapes (rectangle only)
- Click-drag to size shapes (click-to-place only)
- Resize handles on selection
- Shape styling beyond solid fill color (no borders, opacity, gradients)
- Undo/redo functionality
- Copy/paste
- Grouping objects
- Align/distribute tools
- Export functionality
- AI agent features
- Rotation handles (objects can rotate but no UI for it)
- Advanced text editing
- Image support
- Layers panel
- Private/invite-only canvases
- Read-only viewers
- Canvas templates

## 11. Success Metrics

### Functional Metrics
- 2+ users can collaborate simultaneously
- All CRUD operations sync within 100ms
- Zero data loss on refresh
- Presence updates within 50ms

### Technical Metrics
- Lighthouse Performance Score > 90
- Time to Interactive < 3 seconds
- Firestore read/write operations optimized
- Zero console errors in production

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Firestore free tier limits | High | 50ms throttling for cursors/movement, monitor usage closely |
| Object locking race conditions | Medium | Use Firestore transactions for lock acquisition |
| Lock timeout edge cases | Medium | Implement heartbeat for active locks, clear UI feedback |
| Auth0 complexity | Low | Use Auth0 React SDK, follow docs |
| Performance with many objects | Medium | Start without virtualization, test incrementally |
| Network latency | Medium | Optimistic updates, clear loading states |
| Simultaneous lock attempts | High | Firestore transactions ensure atomic lock acquisition |

## 13. Decisions Made

Based on project requirements discussion, the following architectural decisions have been finalized:

### Canvas Architecture
- **Q1: Canvas Management** → Single shared global canvas for all users
- **Q4: Cursor Storage** → Subcollection `/canvas/cursors/{userId}` to avoid write contention
- **Objects Storage** → Subcollection `/canvas/objects/{objectId}` for scalability

### User Experience
- **Q2: Selection Visibility** → All users see selection highlights
- **Q5: Shape Creation** → Click-to-place with 100x100 default size only
- **Q6: Initial State** → Empty canvas centered at (2500, 2500), persists all changes
- **Q7: User Display Names** → Use Auth0 email/password, display email prefix if no name
- **Q8: Cursor Colors** → Randomly assigned from predefined 10-color palette
- **Q9: Tool Selection** → Local only, not synced between users
- **Object Colors** → Randomly assigned on creation
- **Delete Confirmation** → No confirmation (fast delete with Delete/Backspace key)
- **Canvas Boundaries** → Objects constrained to 0-5000 range, cannot be placed/moved outside

### Performance & Technical
- **Q3: Movement Throttling** → 50ms throttle (20Hz) for cursor and object updates
- **Q5: Cursor Movement** → Teleport (instant position change) instead of interpolation for simplicity
- **Q10: Firestore Tier** → Stay on free tier, optimize with throttling and subcollections
- **Q11: Object Limits** → No virtualization initially, handle reasonable amounts
- **Q12: Conflict Resolution** → First-to-select object locking with 30s timeout
- **Q3: Lock Timeout** → Client-side checking every 5 seconds with optimistic cleanup
- **Q15: Object IDs** → Firestore auto-ID generation
- **Q16: Environments** → Single Firebase project for dev/prod
- **Q17: Domain** → Vercel's .vercel.app domain
- **Q13: Indexes** → Wait for Firestore to prompt, then create as needed

### Data Management & Error Handling
- **Q13: Permissions** → Public canvas, no access controls (MVP)
- **Q14: Deletions** → Permanent hard deletes (no soft delete)
- **Q4: Error Handling** → Rollback optimistic updates on failure, show error toast
- **Q11: Environment Variables** → Commit `.env.example`, configure secrets in Vercel UI

### Testing
- **Q12: Testing Approach** → Unit tests + integration tests for core features + manual testing
- **Q18: Test Devices** → Multiple browser windows/incognito sessions

## 14. Open Questions & Clarifications Needed

### Technical Architecture Questions

**Q1: Canvas ID Management**
- How will users create/join a canvas? 
  - Option A: Single shared canvas for all users (simplest for MVP)
  - Option B: Generate unique canvas ID per session
  - Option C: Allow users to create named canvases
- **Recommendation:** Option A for MVP - one global canvas everyone joins

**Q2: Shape Selection Implementation**
- When a user selects a shape, should other users see:
  - Option A: Selection highlight on their canvas too
  - Option B: Only the user who selected it sees the highlight
  - Option C: Show who has what selected (like Figma's colored outlines)
- **Recommendation:** Option B for MVP (simpler), Option C for post-MVP

**Q3: Firestore Throttling Strategy**
- Object movement generates many updates. Should we:
  - Option A: Send every position change (could hit rate limits)
  - Option B: Throttle to every 50ms during drag (20 updates/sec)
  - Option C: Only send final position on mouse up (laggy for others)
- **Current Plan:** Option B, but need to verify Firestore free tier limits

**Q4: Cursor Position Storage**
- Should cursor positions be:
  - Option A: In the main canvas document (simpler queries)
  - Option B: Separate subcollection per user (better scalability)
- **Current Plan:** Option B (subcollection), as shown in the PRD

**Q5: Object Creation - Default Size vs Click-Drag**
- The PRD mentions two creation modes:
  - Click to place with default size (100x100)
  - Click-drag to define size
- Should MVP support both, or just one? Click-drag is more complex.
- **Recommendation:** Just click-to-place for MVP

### User Experience Questions

**Q6: Initial Canvas State**
- When a new user joins, what should they see?
  - Option A: Empty canvas (everyone starts fresh)
  - Option B: Pre-populated with a welcome message/shapes
  - Option C: Load existing shapes from previous sessions
- **Current Plan:** Option C (state persists), but clarify expected behavior

**Q7: User Identification**
- Auth0 provides email/name. For display:
  - Use full name from Auth0 profile?
  - Let users set a custom display name?
  - Generate random names like "User_1234" if no name?
- **Recommendation:** Use Auth0 name, fallback to email prefix

**Q8: Color Assignment for Cursors**
- How to assign colors to users?
  - Random color per user (stored in profile)
  - Predefined palette rotation
  - Let users choose their color
- **Recommendation:** Predefined palette (8-10 colors) assigned on first join

**Q9: Tool Selection State**
- Is the active tool (Rectangle/Circle/Text) synced between users?
  - No - each user has independent tool selection (more intuitive)
  - Yes - everyone sees what tool others are using
- **Recommendation:** No sync, keep tool selection local

### Performance & Scaling Questions

**Q10: Firestore Free Tier Limits**
- Free tier: 50K reads, 20K writes per day
- With 5 users moving cursors at 30Hz for 1 hour:
  - 5 users × 30 updates/sec × 3600 sec = 540K writes
  - This exceeds daily limit in 1 hour!
- **Action Needed:** 
  - Use Firebase Realtime Database for cursors instead? (cheaper for frequent small updates)
  - Or reduce cursor update frequency to 10Hz?
  - Or upgrade to paid plan?

**Q11: Object Limit**
- The original doc mentions "500+ simple objects without FPS drops"
- Should we implement pagination/virtualization, or assume Konva can handle this?
- **Recommendation:** Start without virtualization, add if performance issues

**Q12: Simultaneous Editing of Same Object**
- If two users drag the same object simultaneously:
  - Current plan: Last write wins
  - Should we lock objects being edited? (like Figma)
  - Or show conflict warning?
- **Recommendation:** Keep "last write wins" for MVP, no locking

### Security & Data Questions

**Q13: Canvas Permissions**
- Current security rules allow any authenticated user to read/write any canvas
- Should we add:
  - Private canvases (only creator can access)?
  - Invite-only access?
  - Read-only viewers?
- **Recommendation:** Public canvas for MVP, add permissions post-MVP

**Q14: Data Cleanup**
- Should we auto-delete:
  - Old canvases (after X days of inactivity)?
  - Stale presence data?
  - Deleted objects (soft delete vs hard delete)?
- **Current Plan:** Keep all data, manual cleanup

**Q15: Object ID Generation**
- How to generate unique object IDs?
  - UUID v4 (guaranteed unique)
  - Firestore auto-ID (doc.id)
  - Timestamp + user ID
- **Recommendation:** Firestore auto-ID (simplest)

### Deployment Questions

**Q16: Environment Strategy**
- Should we set up:
  - Separate Firebase projects for dev/prod?
  - Just one project with different Firestore databases?
  - One project, test in production (fastest for MVP)?
- **Recommendation:** One project for MVP, add staging post-MVP

**Q17: Custom Domain**
- Vercel provides free .vercel.app domain
- Do we need custom domain for MVP?
- **Recommendation:** No, use Vercel domain

### Testing Questions

**Q18: Testing with Multiple Users**
- Manual testing approach:
  - Open multiple browsers/incognito windows
  - Use ngrok/local network with multiple devices
  - Deploy early and test on staging URL
- **Recommendation:** Deploy early to Vercel preview, test with real URLs

**Q19: Performance Profiling**
- How to measure 60 FPS target?
  - Browser DevTools Performance tab
  - React DevTools Profiler
  - Add FPS counter overlay in app
- **Recommendation:** Use DevTools + add visual FPS counter for easy monitoring

## 14. Open Questions & Clarifications Needed

### ~~Resolved Questions~~
All major architectural questions have been answered. The PRD is ready for implementation.

### Remaining Implementation Details (Can be decided during development)
1. **Lock heartbeat frequency** - How often to refresh 30s lock timer during active editing?
2. **Cursor interpolation algorithm** - Linear vs ease-out for smooth cursor movement?
3. **Selection highlight style** - Border thickness, color intensity for locked objects?
4. **Error toast duration** - How long to show "Being edited by X" messages?
5. **Initial canvas zoom level** - 100% or fit-to-screen?

These are minor UX decisions that can be refined during implementation and testing.

## 15. Appendix

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Single global canvas document
    match /canvas {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Objects subcollection
    match /canvas/objects/{objectId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        // Can update if unlocked, or if you hold the lock
        !resource.data.keys().hasAny(['lockedBy']) ||
        resource.data.lockedBy == null ||
        resource.data.lockedBy == request.auth.uid
      );
      allow delete: if request.auth != null && (
        // Can delete if you created it or hold the lock
        resource.data.createdBy == request.auth.uid ||
        resource.data.lockedBy == request.auth.uid
      );
    }
    
    // Cursors subcollection - users can only write their own cursor
    match /canvas/cursors/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

**Note:** Composite indexes may be required for queries. Firestore will prompt to create them when needed during development.

### Environment Variables
```bash
# .env.example (commit this to repo)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

VITE_AUTH0_DOMAIN=your_auth0_domain_here
VITE_AUTH0_CLIENT_ID=your_client_id_here
VITE_AUTH0_AUDIENCE=your_audience_here
```

**Security Note:** 
- Never commit `.env` file with actual secrets
- Configure actual values in Vercel environment variables UI
- Copy `.env.example` to `.env` for local development