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
   VITE_GROQ_API_KEY=tu_api_key
   GROQ_API_KEY=tu_api_key
5. Levantar el frontend:
```bash
   npm run dev
```
6. Levantar el backend en la segunda terminal:
```bash
   cd server
   node index.js
```
7. Abrir `http://localhost:5173` en el navegador.

## Estructura

```text
src/
  components/
    Navbar.jsx
    ChatBot.jsx
    BookingCalendar.jsx
    LocationPicker.jsx
    ReportModal.jsx
  context/
    AuthContext.jsx
  hooks/
    useIsMobile.js
  pages/
    Home/
    Auth/
    CarDetail/
    PublishCar/
    Dashboard/
    Booking/
    MyBookings/
    Chat/
    Admin/
  data/
    mockData.js
  styles/
    theme.css
server/
  index.js
index.html
```
