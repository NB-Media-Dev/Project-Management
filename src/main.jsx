import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.API_BASE_URL = `project-management-production-2612.up.railway.app`;
863
eRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
