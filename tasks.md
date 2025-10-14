# CollabCanvas MVP - Development Task List

**Timeline:** 24 hours to MVP  
**Target:** Tuesday checkpoint with all hard gate requirements met

---

## Phase 1: Project Setup & Infrastructure (Hours 0-2)

### 1.1 Initialize Project
- [x] Create new React + TypeScript project with Vite
  - `npm create vite@latest collabcanvas -- --template react-ts`
- [x] Install core dependencies:
  - `react-konva konva`
  - `firebase`
  - `@auth0/auth0-react`
  - `tailwindcss`
- [x] Setup Tailwind CSS configuration
- [x] Create basic folder structure:
  ```
  src/
  ├── components/
  ├── hooks/
  ├── services/
  ├── types/
  ├── utils/
  └── config/
  ```

### 1.2 Firebase Setup
- [x] Create new Firebase project in console
- [x] Enable Firestore Database
- [x] Create environment variables file (.env)
  ```
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_STORAGE_BUCKET=
  VITE_FIREBASE_MESSAGING_SENDER_ID=
  VITE_FIREBASE_APP_ID=
  ```
- [x] Initialize Firebase in `src/config/firebase.ts`
- [x] Setup Firestore security rules (from PRD Appendix)

### 1.3 Auth0 Setup
- [x] Create Auth0 account and application
- [x] Configure callback URLs (localhost + Vercel)
- [x] Add Auth0 environment variables:
  ```
  VITE_AUTH0_DOMAIN=
  VITE_AUTH0_CLIENT_ID=
  VITE_AUTH0_AUDIENCE=
  ```
- [x] Create Auth0 config file `src/config/auth0.ts`

### 1.4 Vercel Setup
- [x] Create Vercel account
- [x] Connect GitHub repository
- [x] Configure environment variables in Vercel dashboard
- [x] Setup automatic deployments on push

### 1.5 TypeScript Types
- [x] Create `src/types/canvas.ts`:
  ```typescript
  export interface CanvasObject {
    id: string;
    type: 'rectangle';
    x: number; // constrained 0-5000
    y: number; // constrained 0-5000
    width: number;
    height: number;
    color: string; // randomly assigned
    rotation: number;
    createdBy: string;
    modifiedBy: string;
    lockedBy: string | null;
    lockedAt: number | null;
    version: number;
  }

  export interface CursorData {
    x: number;
    y: number;
    name: string;
    color: string;
    lastSeen: number;
  }

  export interface User {
    id: string;
    displayName: string;
    email: string;
    cursorColor: string;
    createdAt: number;
  }

  export const CANVAS_WIDTH = 5000;
  export const CANVAS_HEIGHT = 5000;
  export const CANVAS_CENTER_X = 2500;
  export const CANVAS_CENTER_Y = 2500;
  ```
- [x] Create `.env.example` file with placeholder values (will commit this)
- [x] Create `.env` file with actual values (will NOT commit this)

---

## Phase 2: Authentication (Hours 2-4)

### 2.1 Auth0 Integration
- [x] Wrap app with `Auth0Provider` in `main.tsx`
  - Configure with email/password connection only (no social login for MVP)
- [x] Create `src/components/LoginButton.tsx`
- [x] Create `src/components/LogoutButton.tsx`
- [x] Create landing page with login (`src/pages/Landing.tsx`)
- [x] Setup protected route wrapper component

### 2.2 User Profile Management
- [x] Create `src/services/userService.ts`
- [x] Implement `createUserProfile(userId, email, displayName)`:
  - Generate random cursor color from palette
  - Save to Firestore `/users/{userId}`
- [x] Implement `getUserProfile(userId)`
- [x] Create hook `src/hooks/useAuth.ts`:
  - Get current user from Auth0
  - Load/create user profile from Firestore
  - Return user data and loading state

### 2.3 Color Palette
- [x] Create `src/utils/colors.ts`:
  ```typescript
  export const CURSOR_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788'
  ];

  export const getRandomColor = () => {
    return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  };
  ```

---

## Phase 3: Canvas Core (Hours 4-8)

### 3.1 Canvas Setup
- [x] Create `src/components/Canvas.tsx` with Konva Stage
- [x] Implement viewport state (pan/zoom):
  - Track scale (0.1 to 4.0)
  - Track offset (x, y)
  - Initial position: centered at (2500, 2500)
- [x] Implement pan functionality:
  - Mouse down + drag on empty area
  - Update stage position
- [x] Implement zoom functionality:
  - Wheel event listener
  - Zoom toward cursor position
  - Clamp zoom range
- [x] Add canvas boundary constraints (0-5000 for both x and y)

### 3.2 Tool Panel
- [x] Create `src/components/ToolPanel.tsx`
- [x] Add Rectangle tool button
- [x] Track active tool in local state (not synced)
- [x] Visual indicator for active tool
- [ ] *(Keyboard shortcuts out of scope for MVP)*

### 3.3 Rectangle Rendering
- [x] Create `src/components/Rectangle.tsx` (Konva Rect)
- [x] Render rectangles from objects array
- [x] Apply position, size, color, rotation from object data
- [x] Handle click events on rectangles

### 3.4 Rectangle Creation
- [x] Implement canvas click handler
- [x] When Rectangle tool is active and canvas clicked:
  - Get click position (account for zoom/pan)
  - Check if position is within canvas boundaries (0-5000)
  - Create local object with 100x100 size and random color
  - Generate temporary ID
  - Add to local state optimistically
- [x] Create `src/utils/objectFactory.ts`:
  ```typescript
  import { CURSOR_COLORS } from './colors';
  
  export const createRectangle = (x: number, y: number, userId: string) => {
    // Constrain to boundaries
    const constrainedX = Math.max(0, Math.min(x, 4900)); // leave room for 100px width
    const constrainedY = Math.max(0, Math.min(y, 4900)); // leave room for 100px height
    
    return {
      id: '', // Will be set by Firestore
      type: 'rectangle' as const,
      x: constrainedX,
      y: constrainedY,
      width: 100,
      height: 100,
      color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
      rotation: 0,
      createdBy: userId,
      modifiedBy: userId,
      lockedBy: null,
      lockedAt: null,
      version: 1
    };
  };
  ```

### 3.5 Object Selection (Local Only)
- [x] Track selected object ID in local state
- [x] Click on rectangle to select
- [x] Show selection box (stroke around selected object)
- [x] Click on empty canvas to deselect

---

## Phase 4: Firestore Integration (Hours 8-14)

### 4.1 Firestore Service
- [x] Create `src/services/canvasService.ts`
- [x] Implement `initializeCanvas()`:
  - Check if global canvas document exists at `/canvas/global`
  - Create if not exists with empty structure
- [x] Implement `subscribeToObjects(callback)`:
  - Real-time listener on `/canvas/objects` subcollection
  - Return unsubscribe function
- [x] Implement `createObject(object)`:
  - Add to `/canvas/objects` subcollection
  - Firestore generates auto-ID
  - Return created object with ID
- [x] Implement `updateObject(objectId, updates)`:
  - Update specific fields
  - Increment version number
  - Set modifiedBy
  - Handle rollback on error
- [x] Implement `deleteObject(objectId)`:
  - Permanent deletion from Firestore
  - No soft delete

### 4.2 Real-time Canvas State
- [x] Create `src/hooks/useCanvas.ts`:
  - Subscribe to `/canvas/objects` subcollection on mount
  - Maintain local objects array
  - Sync with Firestore updates
  - Handle optimistic updates
- [x] Handle object creation flow:
  - Create locally (optimistic)
  - Send to Firestore
  - Update local object with returned ID
  - **On error: rollback local state, show error toast**
- [x] Handle object updates:
  - Update locally immediately
  - Throttle Firestore updates (500ms)
  - Batch multiple changes if possible
  - **On error: rollback to last known good state**

### 4.3 Object Locking System
- [x] Implement `acquireLock(objectId, userId)`:
  - Use Firestore transaction
  - Check if object.lockedBy is null
  - If yes, set lockedBy and lockedAt (timestamp)
  - Return success/failure
- [x] Implement `releaseLock(objectId, userId)`:
  - Check if user owns lock
  - Set lockedBy to null
  - Clear lockedAt
- [x] Implement lock timeout checker (client-side):
  - Run every 5 seconds
  - Check all objects for locks > 30 seconds old
  - Optimistically release expired locks using transaction
  - Handle race conditions gracefully
- [x] Add lock status to Rectangle component:
  - Show colored border if locked by another user (red/user's cursor color)
  - Show different color if locked by current user (blue)
  - Display username label near locked object

### 4.4 Selection with Locking
- [x] Modify selection handler:
  - On rectangle click, attempt to acquire lock
  - If lock acquired, set as selected
  - If locked by another, show toast notification
- [x] Create `src/components/Toast.tsx` for notifications
- [x] Show toast: "Being edited by [UserName]"
- [x] On deselect, release lock
- [x] On delete, release lock automatically

### 4.5 Object Movement
- [x] Add drag handlers to Rectangle component
- [x] On drag start:
  - Check if current user has lock
  - If not, prevent drag
- [x] During drag:
  - Update position locally (no lag)
  - **Constrain to canvas boundaries (0-5000)**
  - Throttle Firestore updates to 500ms (optimized from 50ms for better performance)
- [x] On drag end:
  - Send final position to Firestore
  - Keep lock active
- [x] Implement boundary checking utility:
  ```typescript
  export const constrainToBounds = (
    x: number, 
    y: number, 
    width: number, 
    height: number
  ) => ({
    x: Math.max(0, Math.min(x, CANVAS_WIDTH - width)),
    y: Math.max(0, Math.min(y, CANVAS_HEIGHT - height))
  });
  ```

---

## Phase 5: Multiplayer Features (Hours 14-20)

### 5.1 Cursor Tracking
- [x] Add mouse move listener to Stage
- [x] Track cursor position in local state
- [x] Convert screen coordinates to canvas coordinates (account for zoom/pan)
- [x] Throttle cursor updates to 500ms
- [x] Update cursor in Firestore subcollection:
  ```typescript
  // Each user writes to their OWN cursor document to avoid write contention
  setDoc(doc(db, 'canvas/global/cursors', userId), {
    x, 
    y,
    name: user.displayName,
    color: user.cursorColor,
    lastSeen: Date.now()
  });
  ```

### 5.2 Cursor Display
- [x] Create `src/components/Cursor.tsx` (Konva Group):
  - Circle for cursor dot
  - Text label for username
- [x] Subscribe to `/canvas/cursors` subcollection
- [x] Filter out current user's cursor
- [x] Render cursor for each online user
- [x] **Use teleport positioning (instant, no interpolation)**:
  - Directly set cursor position from Firestore data
  - No smooth animation between positions
  - Simpler implementation, acceptable for 500ms update rate

### 5.3 Presence System
- [ ] Create `src/components/PresenceIndicator.tsx`
- [ ] Show online users count: "🟢 3 users"
- [ ] List user avatars (first 5)
- [ ] "+N more" if > 5 users
- [ ] Click to expand full user list
- [ ] Implement cursor cleanup:
  - Remove cursors where lastSeen > 30 seconds
  - Run cleanup every 10 seconds
  - Query subcollection for stale cursors

### 5.4 User List Component
- [ ] Create `src/components/UserList.tsx`
- [ ] Show all online users with:
  - Colored dot (their cursor color)
  - Display name (from Auth0, or email prefix fallback)
  - "You" indicator for current user
- [ ] Update list in real-time from `/canvas/cursors` subcollection

### 5.5 Lock Status Indicators
- [ ] Show lock status on rectangles:
  - No lock: normal appearance
  - Locked by you: blue border (2px)
  - Locked by other: red border (2px) with user's cursor color
- [ ] Add username label near locked objects
- [ ] Update indicators in real-time from Firestore

---

## Phase 6: Polish & Testing (Hours 20-24)

### 6.1 UI Polish
- [ ] Add header with logo "CollabCanvas"
- [ ] Add user menu (top right):
  - Display name
  - Email
  - Logout button
- [ ] Style tool panel with Tailwind
- [ ] Add hover states to buttons
- [ ] Add loading states during auth
- [ ] Add connection status indicator
- [ ] Show zoom percentage display

### 6.2 Error Handling
- [ ] Add error boundary component
- [ ] Handle Firestore errors gracefully:
  - **Rollback optimistic updates on failure**
  - Show error toast with clear message
  - Log errors to console for debugging
- [ ] Show reconnection UI on disconnect
- [ ] Handle Auth0 errors
- [ ] Add loading spinner during operations

### 6.3 Performance Optimization
- [ ] Memoize expensive computations
- [ ] Optimize Konva rendering:
  - Use `perfectDrawEnabled={false}`
  - Batch layer updates
- [ ] *(Skip FPS profiling for MVP - just manual observation)*
- [ ] Test with 50+ objects
- [ ] Ensure 60 FPS maintained during interactions

### 6.4 Testing Checklist

#### Unit Tests
- [ ] Write tests for `src/utils/objectFactory.ts`:
  - `createRectangle()` returns valid object structure
  - Coordinates are constrained to 0-5000 boundaries
  - Color is randomly assigned from palette
- [ ] Write tests for `src/utils/colors.ts`:
  - `getRandomColor()` returns valid hex color from palette
- [ ] Write tests for boundary checking:
  - `constrainToBounds()` correctly clamps positions
  - Objects cannot escape 0-5000 canvas area
- [ ] Write tests for lock timeout logic:
  - Correctly identifies locks older than 30 seconds
  - Handles missing lockedAt timestamps

#### Integration Tests
- [ ] **Object Creation Flow:**
  - Mock Firestore calls
  - Verify object created locally → saved to Firestore → appears with ID
  - Verify rollback on error
- [ ] **Object Locking Flow:**
  - Mock transaction for lock acquisition
  - Verify first user gets lock
  - Verify second user sees "Being edited by X" toast
  - Verify lock release on deselect
- [ ] **Object Movement Flow:**
  - Verify drag updates local position immediately
  - Verify throttled Firestore updates (50ms)
  - Verify final position saved on drag end
  - Verify boundary constraints enforced
- [ ] **Cursor Sync Flow:**
  - Mock cursor subcollection updates
  - Verify throttled writes (50ms)
  - Verify other users see cursor position (teleport, no animation)
- [ ] **Lock Timeout Flow:**
  - Mock timer and Firestore timestamp
  - Verify lock released after 30 seconds
  - Verify other user can then acquire lock

#### Manual Testing
- [ ] **Test 1: Basic Functionality**
  - Create rectangle
  - Move rectangle
  - Delete rectangle (no confirmation, just Delete key)
  - Pan and zoom canvas
  - Verify objects constrained to 0-5000 boundaries
- [ ] **Test 2: Authentication**
  - Login flow works with email/password (no social login)
  - User profile created with random cursor color
  - Display name shows (or email prefix if no name)
  - Logout clears state
- [ ] **Test 3: Real-time Sync (2 windows)**
  - Open app in 2 browser windows
  - Create object in window 1
  - Verify appears in window 2 within 100ms
  - Move object in window 1
  - Verify moves in window 2 smoothly
  - Delete object in window 1
  - Verify disappears in window 2
- [ ] **Test 4: Multiplayer Cursors**
  - See both cursors with names
  - Cursors update with teleport movement (no smooth animation)
  - Cursors have different random colors
  - Cursor updates visible within 100ms
- [ ] **Test 5: Object Locking**
  - User 1 selects object
  - User 2 tries to select same object
  - Verify User 2 sees "Being edited by User 1"
  - User 1 deselects
  - User 2 can now select
- [ ] **Test 6: Lock Timeout**
  - Select object
  - Wait 30 seconds without interaction
  - Verify lock is released
  - Other user can now edit
- [ ] **Test 7: State Persistence**
  - Create 5 objects
  - Refresh page
  - Verify all 5 objects still there
  - Close all browser windows
  - Reopen app
  - Verify objects persisted
- [ ] **Test 8: Rapid Operations**
  - Create 10 objects rapidly with random colors
  - Move multiple objects quickly
  - Verify no lag or conflicts
  - Check Firestore operations count (stay within free tier)
  - Verify boundary constraints during rapid creation
- [ ] **Test 9: Multiple Users (3-5)**
  - Open 3+ browser windows
  - All users create/move objects simultaneously
  - Verify no conflicts
  - Verify smooth performance
- [ ] **Test 10: Network Issues**
  - Disconnect network (DevTools offline mode)
  - Try to create object
  - **Verify error toast shown and state rollback**
  - Reconnect network
  - Verify state syncs correctly from Firestore

### 6.5 Deployment
- [ ] Ensure `.env.example` is committed with placeholders
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Push to GitHub
- [ ] Configure environment variables in Vercel dashboard
- [ ] Verify Vercel auto-deployment triggered
- [ ] Test deployed app at .vercel.app URL
- [ ] Verify environment variables loaded correctly
- [ ] Test with multiple browser windows/incognito on deployed URL
- [ ] Check browser console for errors
- [ ] Verify Firestore security rules active and working

### 6.6 Documentation
- [ ] Update README.md with:
  - Project description
  - Setup instructions
  - Environment variables needed
  - Deployment URL
  - Tech stack
  - Features implemented
- [ ] Add architecture diagram (optional)
- [ ] Document known limitations

---

## MVP Hard Gate Checklist

Before submitting, verify all requirements:

- [ ] ✅ Basic canvas with pan/zoom
- [ ] ✅ At least one shape type (rectangle)
- [ ] ✅ Ability to create and move objects
- [ ] ✅ Real-time sync between 2+ users
- [ ] ✅ Multiplayer cursors with name labels
- [ ] ✅ Presence awareness (who's online)
- [ ] ✅ User authentication (users have accounts/names)
- [ ] ✅ Deployed and publicly accessible

---

## Quick Start Commands

```bash
# Create project
npm create vite@latest collabcanvas -- --template react-ts
cd collabcanvas

# Install dependencies
npm install
npm install react-konva konva
npm install firebase
npm install @auth0/auth0-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

---

## Time Tracking Template

Use this to track progress:

| Phase | Planned | Actual | Status | Notes |
|-------|---------|--------|--------|-------|
| Setup | 2h | | ⏳ | |
| Auth | 2h | | ⏳ | |
| Canvas Core | 4h | | ⏳ | |
| Firestore | 6h | | ⏳ | |
| Multiplayer | 6h | | ⏳ | |
| Polish | 4h | | ⏳ | |

**Total: 24 hours**