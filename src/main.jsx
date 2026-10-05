import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

<<<<<<< HEAD
window.API_BASE_URL = `project-management-production-2612.up.railway.app`;
=======
window.API_BASE_URL = `https://project-management-pv1a.onrender.com`;
>>>>>>> 10f867d4cb1d76a84d443f105020012576e91863

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
