import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyAppearance, subscribe } from './services/settings.js'

// Apply saved appearance before first paint (no theme flash),
// then keep <html data-*> in sync for the lifetime of the app.
applyAppearance();
subscribe(() => applyAppearance());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
