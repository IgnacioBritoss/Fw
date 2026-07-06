// ============================================================================
//  main.jsx — PUNTO DE ENTRADA de la aplicación
// ----------------------------------------------------------------------------
//  Es lo primero que ejecuta el navegador. Toma el <div id="root"> del
//  index.html y "monta" ahí adentro todo React, empezando por <App/>.
//  StrictMode es una ayuda de React en desarrollo para detectar problemas.
// ============================================================================
import "./styles/theme.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)