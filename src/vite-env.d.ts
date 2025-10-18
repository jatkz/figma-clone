/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_DATABASE_URL?: string
  readonly VITE_AUTH0_DOMAIN: string
  readonly VITE_AUTH0_CLIENT_ID: string
  readonly VITE_AUTH0_AUDIENCE?: string
  readonly VITE_USE_FIREBASE_EMULATOR?: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_AI_MODEL?: string
  readonly VITE_AI_MAX_TOKENS?: string
  readonly VITE_AI_TEMPERATURE?: string
  readonly VITE_CURSOR_SYNC_THROTTLE: string
  readonly VITE_OBJECT_SYNC_THROTTLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
