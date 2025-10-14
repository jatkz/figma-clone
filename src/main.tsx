import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Auth0ProviderWithConfig from './config/auth0.tsx'

// Load dev tools in development mode
if (import.meta.env.DEV) {
  import('./utils/aiTest');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0ProviderWithConfig>
      <App />
    </Auth0ProviderWithConfig>
  </StrictMode>,
)
