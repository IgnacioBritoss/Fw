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
import { I18nProvider } from './i18n'

// El idioma envuelve TODA la app, incluidas las pantallas de entrada: alguien que
// entra por primera vez tiene que poder leer el login en su idioma, no recién
// después de crear la cuenta.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)