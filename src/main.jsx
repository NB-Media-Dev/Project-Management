import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.API_BASE_URL = import.meta.env.DEV
  ? ''
  : 'https://project-management-production-2612.up.railway.app';

// Fixed: Removed '863' and changed 'eRoot' to 'createRoot'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
