# Freewheel

## Descripción

Esta plataforma permite:
- publicar y alquilar autos entre particulares,
- gestionar reservas con calendario de disponibilidad,
- verificar usuarios con DNI y licencia de conducir,
- moderar publicaciones y reportes desde un panel de administración,
- obtener especificaciones técnicas de vehículos mediante IA.

## Herramientas usadas

- React 18 + Vite
- React Router DOM
- Leaflet + OpenStreetMap
- react-datepicker
- Node.js + Express
- Groq API (llama-3.3-70b-versatile)

## Cómo ejecutarlo

1. Abrir dos terminales en la carpeta del proyecto.
2. Instalar dependencias del frontend:
```bash
   npm install
```
3. Instalar dependencias del backend:
```bash
   cd server
   npm install
```
4. Agregar la API key de Groq en `.env` (raíz) y `server/.env`:
