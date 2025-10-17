# Figma Clone - Collaborative Design Tool

A real-time collaborative canvas application built with React, TypeScript, and Konva, featuring multiplayer editing, AI-powered tools, and professional design features.

![Project Status](https://img.shields.io/badge/status-active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)

---

## 🎨 Features

### Core Canvas Features
- **Real-time Collaboration** - Multiple users can edit simultaneously with live cursor tracking
- **Shape Tools** - Create rectangles, circles, and text objects
- **Object Manipulation** - Move, resize, rotate, and delete objects
- **Multi-Select** - Select and manipulate multiple objects at once
- **Lasso Selection** - Draw freeform selection paths to select objects naturally
- **Magic Wand** - Select all objects with matching colors (with adjustable tolerance)
- **Advanced Selection Tools** - Select by type (all rectangles/circles/text), select inverse
- **Selection Filters** - Filter and select objects by type, color, size, and creator with live preview
- **Alignment Tools** - Align multiple objects (left, right, center, top, bottom), align to canvas
- **Distribution Tools** - Distribute objects with equal spacing horizontally or vertically
- **Smart Guides** - Alignment guides with automatic snapping
- **Snap-to-Grid** - Toggle-able grid snapping (10px grid)
- **Zoom & Pan** - Navigate large canvases with mouse wheel zoom and space+drag panning

### Text Formatting
- **Font Customization** - Choose from multiple font families
- **Text Styling** - Bold, italic, underline, and strikethrough
- **Text Alignment** - Left, center, and right alignment
- **Colors** - Text and background color customization
- **Font Sizes** - Adjustable text sizes (12px - 72px)
- **Inline Editing** - Double-click to edit text with live preview

### Export Capabilities
- **PNG Export** - Raster image export at 1x, 2x, or 4x scale
- **SVG Export** - Vector format for scalable graphics
- **Export Modes** - Export current viewport, entire canvas, or selected objects only
- **Preview & Estimates** - See preview and file size before exporting

### AI Integration
- **AI Canvas Agent** - Natural language commands to create and modify objects
- **Smart Commands** - Create shapes, change colors, arrange objects with AI
- **Context-Aware** - AI understands canvas state and selected objects

### Keyboard Shortcuts
- **Tool Selection** - V (select), L (lasso), W (magic wand), R (rectangle), C (circle), T (text)
- **Object Operations** - Ctrl+C/X/V (copy/cut/paste), Ctrl+D (duplicate), Delete
- **Selection** - Ctrl+A (select all), Ctrl+Shift+I (select inverse), Tab/Shift+Tab (cycle selection), Shift+Lasso (add to selection), Alt+Lasso (remove from selection), 🎯 Select Menu (advanced filters)
- **Alignment** - Ctrl+Shift+L/H/R/T/M/B (align left/center H/right/top/center V/bottom)
- **Transform** - [ / ] (rotate), Ctrl+Shift+R (reset rotation)
- **Canvas** - Ctrl+0 (reset zoom), Ctrl++/- (zoom), Space+Drag (pan)
- **Snapping** - Ctrl+' (toggle grid), Hold Ctrl (disable snapping)
- **Help** - ? (show all shortcuts)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd figma-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration (Required)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Auth0 Configuration (Required)
   VITE_AUTH0_DOMAIN=your_auth0_domain.auth0.com
   VITE_AUTH0_CLIENT_ID=your_auth0_client_id
   VITE_AUTH0_AUDIENCE=your_api_identifier

   # OpenAI Configuration (Required for AI features)
   VITE_OPENAI_API_KEY=your_openai_api_key

   # Performance Tuning (Required)
   VITE_CURSOR_SYNC_THROTTLE=50
   VITE_OBJECT_SYNC_THROTTLE=100

   # Optional: Firebase Emulator (for local development)
   # VITE_USE_FIREBASE_EMULATOR=true

   # Optional: AI Model Configuration
   # VITE_AI_MODEL=gpt-4
   # VITE_AI_MAX_TOKENS=2000
   # VITE_AI_TEMPERATURE=0.7
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

---

## 📦 Dependencies

### Core Framework
- **React 18.3** - UI framework
- **TypeScript 5.5** - Type safety
- **Vite 6.0** - Build tool and dev server

### Canvas & Graphics
- **Konva 9.3** - HTML5 canvas library
- **react-konva 18.2** - React wrapper for Konva

### Backend & Authentication
- **Firebase 11.1** - Real-time database and hosting
- **Auth0** - User authentication and authorization

### AI Integration
- **OpenAI SDK** - AI-powered canvas commands

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - CSS processing

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite Plugin React** - Fast Refresh support

---

## 🏗️ Architecture

### Tech Stack

```
┌─────────────────────────────────────────────────┐
│                  Frontend                        │
├─────────────────────────────────────────────────┤
│  React + TypeScript + Vite                      │
│  Konva (Canvas Rendering)                       │
│  Tailwind CSS (Styling)                         │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│              Real-time Backend                   │
├─────────────────────────────────────────────────┤
│  Firebase Firestore (Database)                  │
│  Firebase Realtime (Live Updates)               │
│  Auth0 (Authentication)                         │
└─────────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────────┐
│                 AI Services                      │
├─────────────────────────────────────────────────┤
│  OpenAI GPT-4 (AI Canvas Agent)                │
└─────────────────────────────────────────────────┘
```

### Project Structure

```
figma-clone/
├── src/
│   ├── components/          # React components
│   │   ├── Canvas.tsx       # Main canvas component
│   │   ├── Rectangle.tsx    # Rectangle shape component
│   │   ├── Circle.tsx       # Circle shape component
│   │   ├── TextObject.tsx   # Text object component
│   │   ├── ToolPanel.tsx    # Tool selection panel
│   │   ├── AIChat.tsx       # AI assistant interface
│   │   ├── ExportDialog.tsx # Export options dialog
│   │   └── ...
│   │
│   ├── contexts/            # React contexts
│   │   ├── ToastContext.tsx # Toast notifications
│   │   └── SnapContext.tsx  # Snapping settings
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useCanvas.ts     # Canvas state management
│   │   ├── useAuth.ts       # Authentication
│   │   ├── useResize.ts     # Object resizing
│   │   └── useRotation.ts   # Object rotation
│   │
│   ├── services/            # External services
│   │   ├── canvasService.ts # Firebase canvas operations
│   │   ├── userService.ts   # User management
│   │   └── aiService.ts     # OpenAI integration
│   │
│   ├── utils/               # Utility functions
│   │   ├── snapUtils.ts     # Snapping algorithms
│   │   ├── canvasExport.ts  # PNG/SVG export
│   │   ├── shapeFactory.ts  # Shape creation
│   │   └── ...
│   │
│   ├── types/               # TypeScript types
│   │   ├── canvas.ts        # Canvas object types
│   │   ├── snap.ts          # Snapping types
│   │   └── aiTools.ts       # AI tool definitions
│   │
│   ├── config/              # Configuration
│   │   ├── firebase.ts      # Firebase config
│   │   └── auth0.tsx        # Auth0 config
│   │
│   ├── App.tsx              # Root component
│   └── main.tsx             # Application entry point
│
├── public/                  # Static assets
├── dist/                    # Production build output
├── .env                     # Environment variables
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── tailwind.config.js       # Tailwind config
```

---

## 🎯 Core Concepts

### Real-time Synchronization

The application uses Firebase Firestore for real-time data synchronization:

1. **Optimistic Updates** - UI updates immediately, then syncs with server
2. **Conflict Resolution** - Last-write-wins with version tracking
3. **Object Locking** - Users acquire locks on objects they're editing
4. **Cursor Tracking** - Live cursor positions for all connected users

### Canvas State Management

```typescript
// Canvas object structure
interface CanvasObject {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  rotation?: number;
  lockedBy?: string;
  createdBy: string;
  modifiedBy: string;
  version: number;
}
```

### Snapping System

- **Grid Snapping**: Objects snap to 10px grid intervals
- **Smart Guides**: Detects alignment with nearby objects (left/right/top/bottom/center)
- **Visual Feedback**: Pink guide lines show alignment points
- **Performance**: Only checks objects within 500px radius

### Export System

Both PNG and SVG exports support three modes:
1. **Viewport** - Export visible area
2. **Entire Canvas** - Export full 5000×5000 canvas
3. **Selected Objects** - Export only selected objects with automatic cropping

---

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type checking
npm run type-check
```

### Development Workflow

1. **Feature branches** - Create a new branch for each feature
2. **TypeScript** - All code should be properly typed
3. **Linting** - Code must pass ESLint checks
4. **Testing** - Test features manually before committing

### Code Style

- **TypeScript** - Strict mode enabled
- **React** - Functional components with hooks
- **Naming** - PascalCase for components, camelCase for functions/variables
- **File structure** - One component per file

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (first time only)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Environment Variables for Production

Ensure all environment variables are set in your hosting platform:
- Firebase configuration
- Auth0 credentials
- OpenAI API key (if using AI features)

---

## 🎮 Usage Guide

### Basic Workflow

1. **Create Objects**
   - Press `R` for rectangle, `C` for circle, or `T` for text
   - Click on canvas to create

2. **Select & Edit**
   - Press `V` for select tool (click objects)
   - Press `L` for lasso tool (draw around objects)
   - Drag to move, use handles to resize/rotate

3. **Format Text**
   - Double-click text to edit
   - Use formatting toolbar for styling

4. **Export**
   - Press `Ctrl+Shift+E` or click Export button
   - Choose format (PNG/SVG) and options
   - Click Export to download

### AI Commands

Open AI chat (button in top-right) and try:
- "Create a red rectangle at position 100, 100"
- "Change the selected object to blue"
- "Create 5 circles in a row"
- "Make all rectangles 200px wide"

---

## 📝 Configuration Files

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Set up Firestore rules (see `firestore.rules`)
4. Copy configuration to `.env`

### Auth0 Setup

1. Create an Auth0 application at [Auth0 Dashboard](https://manage.auth0.com/)
2. Configure callback URLs:
   - Development: `http://localhost:5173`
   - Production: Your deployed URL
3. Copy credentials to `.env`

### OpenAI Setup (Optional)

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env` as `VITE_OPENAI_API_KEY`
3. AI features will work without this, but with limited functionality

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Firebase not initialized"**
- Ensure all Firebase environment variables are set correctly
- Check that `.env` file exists in root directory

**Issue: "Auth0 authentication fails"**
- Verify Auth0 domain and client ID
- Check callback URLs are configured correctly
- Ensure Auth0 application is enabled

**Issue: "Canvas is blank"**
- Check browser console for errors
- Verify Firestore rules allow read/write
- Try clearing browser cache

**Issue: "AI features not working"**
- Verify OpenAI API key is set
- Check API key has sufficient credits
- Review browser console for API errors

### Performance Tips

- **Reduce cursor sync frequency**: Increase `VITE_CURSOR_SYNC_THROTTLE` value (default: 50ms)
- **Limit object count**: Performance may degrade with 100+ objects
- **Use Chrome/Edge**: Best Konva canvas performance

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- **Konva.js** - Powerful HTML5 canvas library
- **Firebase** - Real-time database and hosting
- **Auth0** - Authentication platform
- **OpenAI** - AI-powered features
- **Figma** - Design inspiration

---

## 📞 Support

For issues, questions, or suggestions:
- Create an issue in the repository
- Check existing documentation
- Review implementation summaries in `implementation-summaries/`

---

**Built with ❤️ using React, TypeScript, and Konva**
