import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ya no hace falta el proxy de desarrollo hacia la API de IA: los pedidos de IA
// (chat, visión y transcripción) los hace el BACKEND, que es el único que tiene
// la clave. El front solo habla con su propio backend (ver src/services/api.js).
export default defineConfig({
  plugins: [react()],
})
