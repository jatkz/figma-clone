graph TB
    subgraph "Client Browser 1"
        U1[User 1]
        C1[Canvas Component]
        K1[Konva Stage]
        H1[useCanvas Hook]
        A1[useAuth Hook]
        S1[canvasService]
        
        U1 --> C1
        C1 --> K1
        C1 --> H1
        C1 --> A1
        H1 --> S1
    end
    
    subgraph "Client Browser 2"
        U2[User 2]
        C2[Canvas Component]
        K2[Konva Stage]
        H2[useCanvas Hook]
        A2[useAuth Hook]
        S2[canvasService]
        
        U2 --> C2
        C2 --> K2
        C2 --> H2
        C2 --> A2
        H2 --> S2
    end
    
    subgraph "Auth0"
        AUTH[Authentication Service]
        AUTH_DB[(User Credentials)]
        
        AUTH --> AUTH_DB
    end
    
    subgraph "Firebase/Firestore"
        FS[(Firestore Database)]
        
        subgraph "Canvas Collection"
            GLOBAL["canvas-global: metadata"]
            
            subgraph "Objects Subcollection"
                OBJ1["object-1: x, y, w, h, color, lockedBy"]
                OBJ2[object-2]
                OBJ3[object-N]
            end
            
            subgraph "Cursors Subcollection"
                CUR1["cursor-userId-1: x, y, name, color, lastSeen"]
                CUR2[cursor-userId-2]
                CUR3[cursor-userId-N]
            end
        end
        
        subgraph "Users Collection"
            USER1["user-1: email, displayName, cursorColor"]
            USER2[user-2]
        end
        
        GLOBAL -.-> OBJ1
        GLOBAL -.-> OBJ2
        GLOBAL -.-> OBJ3
        GLOBAL -.-> CUR1
        GLOBAL -.-> CUR2
        GLOBAL -.-> CUR3
    end
    
    subgraph "Vercel Hosting"
        DEPLOY["Deployed App: vercel.app"]
        ENV["Environment Variables: Firebase + Auth0 Config"]
        
        DEPLOY --> ENV
    end
    
    %% Authentication Flow
    A1 -->|Login/Logout| AUTH
    A2 -->|Login/Logout| AUTH
    AUTH -->|JWT Token| A1
    AUTH -->|JWT Token| A2
    
    %% User Profile Management
    A1 -->|Create/Read Profile| USER1
    A2 -->|Create/Read Profile| USER2
    
    %% Real-time Object Sync
    S1 -->|"Create (50ms throttle)"| OBJ1
    S1 -->|Update Lock/Unlock| OBJ1
    S1 -->|Delete Object| OBJ1
    S1 <-.->|Real-time Subscribe| OBJ1
    S1 <-.->|Real-time Subscribe| OBJ2
    S1 <-.->|Real-time Subscribe| OBJ3
    
    S2 -->|"Create (50ms throttle)"| OBJ2
    S2 -->|Update Lock/Unlock| OBJ2
    S2 <-.->|Real-time Subscribe| OBJ1
    S2 <-.->|Real-time Subscribe| OBJ2
    S2 <-.->|Real-time Subscribe| OBJ3
    
    %% Cursor Sync - No Contention
    S1 -->|"Update Own (50ms throttle)"| CUR1
    S1 <-.->|Subscribe Others| CUR2
    S1 <-.->|Subscribe Others| CUR3
    
    S2 -->|"Update Own (50ms throttle)"| CUR2
    S2 <-.->|Subscribe Others| CUR1
    S2 <-.->|Subscribe Others| CUR3
    
    %% Deployment
    C1 -.->|Hosted on| DEPLOY
    C2 -.->|Hosted on| DEPLOY
    
    %% Key Interactions
    K1 -->|"Pan/Zoom, Create, Move"| C1
    K2 -->|"Pan/Zoom, Create, Move"| C2
    
    style U1 fill:#4ECDC4
    style U2 fill:#FF6B6B
    style AUTH fill:#FFA07A
    style FS fill:#98D8C8
    style DEPLOY fill:#F7DC6F
    style OBJ1 fill:#E8F4F8
    style OBJ2 fill:#E8F4F8
    style CUR1 fill:#FFF4E8
    style CUR2 fill:#FFF4E8
    style GLOBAL fill:#E8F8E8