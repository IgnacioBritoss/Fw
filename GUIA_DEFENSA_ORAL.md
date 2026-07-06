# Guía para la defensa oral — Freewheel 🚗

Esta guía te sirve para **explicar y defender el código** del proyecto delante del profesor.
Está pensada para leerla de arriba a abajo: primero entendés la idea general, después
el flujo de la página pantalla por pantalla, después qué hace cada archivo, y al final
tenés un listado de **preguntas típicas con respuestas** listas para usar.

> Todo el código fuente además ya tiene **comentarios en español** explicando qué hace
> cada función. Esta guía es el "mapa" para no perderte.

---

## 1. ¿Qué es Freewheel? (el pitch de 30 segundos)

Freewheel es una **plataforma de alquiler de autos entre particulares** (tipo "Airbnb de autos")
para Argentina. Una persona puede:

- **Publicar su auto** para alquilarlo y ganar plata.
- **Buscar y reservar** el auto de otra persona.
- **Verificar su identidad** con DNI y licencia (proceso llamado *KYC*).
- **Chatear** con la otra parte, **pagar** la reserva y coordinar el **retiro/devolución** con un QR.
- Hay un **panel de administración** para moderar publicaciones y usuarios.

Además usa **Inteligencia Artificial** (API de Groq) para tres cosas: un chatbot de ayuda,
autocompletar las especificaciones técnicas del auto, y verificar que las fotos subidas
realmente sean de un vehículo.

---

## 2. Tecnologías usadas (y por qué)

| Tecnología | Para qué la usamos |
|---|---|
| **React 19** | Librería para armar la interfaz por **componentes** reutilizables. |
| **Vite** | Herramienta que levanta el proyecto en desarrollo y lo compila para producción. Muy rápida. |
| **React Router DOM** | Maneja la **navegación** entre pantallas (las URLs) sin recargar la página. |
| **Leaflet + OpenStreetMap** | **Mapas** gratuitos para mostrar los autos y elegir ubicación. |
| **react-datepicker + date-fns** | **Calendario** de fechas y formateo de fechas en español. |
| **Groq API** | **IA** (modelos tipo ChatGPT) para el chatbot, specs y verificación de fotos. |
| **Cloudinary** | **Almacenamiento** en la nube de las fotos, audios y archivos. |
| **Backend en Vercel** | Servidor externo que guarda usuarios, autos, reservas, etc. (nosotros hicimos el frontend que lo consume). |

**Concepto clave para la defensa:** este proyecto es el **frontend** (lo que ve y toca el usuario).
Se comunica con un **backend** (el servidor, que guarda los datos) a través de pedidos HTTP.
Toda esa comunicación está centralizada en un solo archivo: `src/services/api.js`.

---

## 3. Arquitectura general (cómo está organizado)

El código está separado por **responsabilidades**. Esto es importante remarcarlo en la defensa
porque muestra orden:

```
src/
├── main.jsx            → Punto de entrada. Arranca React.
├── App.jsx             → Define TODAS las rutas (qué URL muestra qué pantalla).
│
├── pages/              → Una carpeta por PANTALLA (Home, Search, Login, Chat...).
├── components/         → Piezas REUTILIZABLES que usan varias pantallas
│                         (Navbar, ChatBot, mapa, calendario, modales...).
│
├── services/           → La "lógica" que habla con el mundo exterior:
│   ├── api.js          → Todos los pedidos al backend.
│   ├── groq.js         → Los pedidos a la IA.
│   ├── cloudinary.js   → Subida de archivos a la nube.
│   ├── notifications.js→ Arma las notificaciones a partir de datos reales.
│   └── theme.js        → Modo claro/oscuro.
│
├── context/
│   └── AuthContext.jsx → Estado GLOBAL de la sesión (quién está logueado).
│
├── hooks/
│   └── useIsMobile.js  → Detecta si es celular/tablet/escritorio (responsive).
│
└── data/
    └── mockData.js     → Autos de ejemplo para la demo.
```

**La idea central:** las **pantallas** (`pages`) no saben de URLs de servidores ni de fetch.
Solo llaman a funciones de los **servicios** (ej: `getMyBookings()`), que se encargan de la parte técnica.
Esto se llama **separación de responsabilidades** y hace el código más fácil de mantener.

---

## 4. Conceptos de React que conviene tener claros

Si el profe pregunta "¿cómo funciona React acá?", estos son los cuatro conceptos que aparecen todo el tiempo:

- **Componente:** una función que devuelve la interfaz (JSX). Ej: `Home()`, `Navbar()`.
  Se pueden anidar y reutilizar.
- **Props:** los "parámetros" que un componente le pasa a otro. Ej: `<BookingCalendar car={listing} />`.
- **Estado (`useState`):** variables que, cuando cambian, hacen que React **redibuje** la pantalla.
  Ej: `const [open, setOpen] = useState(false)` para saber si un menú está abierto.
- **Efectos (`useEffect`):** código que corre en momentos clave, normalmente para **traer datos**
  cuando la pantalla se abre. Ej: pedir las reservas al backend al entrar a "Mis reservas".

Otros dos que aparecen:
- **Context (`useContext`):** una "caja global" para datos que necesitan muchos componentes.
  Nosotros lo usamos para la **sesión del usuario** (`AuthContext`). Así cualquier pantalla
  hace `const { user } = useAuth()` sin pasar props por todos lados.
- **Hooks personalizados:** funciones propias que empiezan con `use`. Nuestro `useIsMobile`
  devuelve si estamos en celular, para adaptar el diseño (**responsive**).

---

## 5. El flujo de la página, pantalla por pantalla

Este es el recorrido típico de un usuario. Es lo más importante para la defensa oral,
porque probablemente te pidan "mostrame cómo funciona".

### 5.1. Registro e ingreso
1. **`Register.jsx`** — Registro en **4 pasos** (es un "asistente" o *wizard*):
   datos de la cuenta → verificar email con código → subir DNI → subir licencia → confirmación.
2. **`VerifyEmail.jsx`** — Ingresás el código de 6 dígitos que llegó al mail.
3. **`Login.jsx`** — Ingreso con email/contraseña **o con Google**.
4. **`AuthContext.jsx`** es quien realmente hace el login: guarda el usuario y un **token**
   en el navegador (`localStorage`) para mantener la sesión abierta aunque recargues.

### 5.2. Explorar autos
5. **`Home.jsx`** — La portada: buscador, categorías y autos destacados. Se pueden ver en **lista o mapa**.
6. **`Search.jsx`** — Búsqueda avanzada: lista + mapa sincronizados, con filtros (precio, transmisión, combustible).
7. **`CarDetail.jsx`** — El detalle de un auto: fotos, specs, reseñas y precio.
   - Si sos el **dueño**: podés editar o eliminar la publicación.
   - Si no: podés **reservar** o **contactar** por chat.

### 5.3. Publicar un auto (la pantalla estrella)
8. **`PublishCar.jsx`** — Asistente de 4 pasos con las **3 funciones de IA**:
   - **Autocompletar specs**: la IA completa puertas, potencia, baúl, etc. con solo la marca/modelo/año.
   - **Verificación de fotos**: la IA revisa que cada foto sea realmente un auto.
   - **Sugerir precio**: la IA recomienda un precio de alquiler por día según el auto y la zona.

### 5.4. Reservar y pagar
9. **`Booking.jsx`** — Elegís las fechas en el **calendario** (que muestra los días ocupados).
10. **`Payment.jsx`** — **Pago simulado** (no hay plata real): botón "Pagar", se procesa y confirma.
11. **`MyBookings.jsx`** — Tus reservas. Tiene dos pestañas: como **inquilino** (tus alquileres)
    y como **dueño** (solicitudes que recibís, para aceptar/rechazar).
12. **`QrFlow.jsx`** — Con un **QR/token** se confirma el retiro y la devolución del auto.

### 5.5. Comunicación y gestión
13. **`Chat.jsx`** — Mensajería tipo WhatsApp: texto, imágenes, archivos y **notas de voz**.
    Usa *polling* (pide mensajes cada 3 segundos) para simular tiempo real.
14. **`Notifications.jsx`** — Notificaciones armadas a partir de tus reservas y mensajes reales.
15. **`Dashboard.jsx`** — Panel del dueño: sus autos, solicitudes y estadísticas.
16. **`Profile.jsx` / `Settings.jsx`** — Perfil y ajustes (editar datos, modo oscuro, verificaciones).
17. **`Admin.jsx`** — Panel de administración (solo para rol ADMIN): moderar publicaciones y usuarios.

**Envoltura común:** casi todas estas pantallas se muestran dentro de **`Layout.jsx`**,
que aporta el **menú lateral** y la **barra superior**. Y el **`ChatBot.jsx`** (asistente con IA)
flota en todas las pantallas.

---

## 6. Los archivos "clave" que conviene saber explicar

Si tenés que elegir 5 archivos para estudiar a fondo para la defensa, elegí estos:

### `src/services/api.js` — la puerta al backend
- Tiene una función central, **`apiFetch`**, que arma cada pedido HTTP, le pega el **token**
  de sesión y maneja los errores (si el token venció → cierra sesión y va al login).
- Todas las demás funciones (`loginUser`, `getMyBookings`, `createVehicle`...) son atajos cortos
  que usan `apiFetch`. Están **agrupadas por tema** (Auth, Vehículos, Reservas, Chat, Admin...).

### `src/context/AuthContext.jsx` — la sesión
- Guarda **quién está logueado** y las acciones de la cuenta (login, registro, logout, etc.).
- La sesión persiste en `localStorage` con la clave `fw_user`, para que no se cierre al recargar.

### `src/services/groq.js` — la IA
- `groqChat`: manda una conversación al modelo de texto (chatbot y autocompletar specs).
- `groqVision`: le pasa una imagen al modelo y pregunta si es un vehículo.
- La **API key** viaja en una variable de entorno (`VITE_GROQ_API_KEY`) para no dejarla escrita en el código.

### `src/components/Layout.jsx` — el esqueleto visual
- El menú lateral + barra superior que rodea a todas las pantallas.
- Es **responsive**: en celular el menú se abre como un cajón; en escritorio queda fijo.

### `src/pages/PublishCar/PublishCar.jsx` — la pantalla más completa
- Junta formularios en varios pasos, subida de fotos, mapa, y las **3 integraciones de IA**.
- Muestra bien cómo se combinan `useState`, `useEffect`, servicios y validaciones.

---

## 7. Decisiones de diseño que podés defender

Estas son cosas "a propósito" que quedan bien explicar:

- **Separación en `pages` / `components` / `services`:** cada cosa en su lugar. Si mañana cambia
  la URL del backend, se toca **un solo archivo** (`api.js`).
- **Estado global de sesión con Context:** evita "pasar props" por diez componentes.
- **Persistencia en `localStorage`:** la sesión, las preferencias y algunos autos quedan guardados
  en el navegador, así la app se siente rápida y no se pierde todo al recargar.
- **Diseño responsive:** el hook `useIsMobile` permite mostrar layouts distintos en celular y escritorio.
- **Tolerancia a fallos:** en varias pantallas, si el backend no responde, se usan datos de ejemplo
  (`mockData`) o copias locales, así la demo nunca queda vacía.
- **IA con caché:** las respuestas de la IA (specs y precios) se guardan en `localStorage` para no
  volver a pedir lo mismo (más rápido y más barato).
- **Pago y datos simulados:** el pago es "mock" a propósito, porque es un proyecto académico
  (no se cobra plata de verdad, pero el flujo completo está implementado).

---

## 8. Preguntas típicas del profesor (con respuestas)

**P: ¿Qué diferencia hay entre el frontend y el backend en este proyecto?**
R: El frontend es todo lo que está en este repositorio: la interfaz que ve y usa la persona,
hecha con React. El backend es un servidor aparte (desplegado en Vercel) que guarda los datos
(usuarios, autos, reservas). Se comunican con pedidos HTTP centralizados en `services/api.js`.

**P: ¿Cómo se mantiene la sesión iniciada si recargo la página?**
R: Al iniciar sesión, guardamos el usuario y su **token** en `localStorage` (clave `fw_user`).
Al arrancar la app, `AuthContext` lee ese dato y restaura la sesión. El token se envía en cada
pedido al backend para identificar al usuario.

**P: ¿Qué es un componente y qué es una prop?**
R: Un componente es una función que devuelve la interfaz (por ejemplo `Navbar`). Las props son
los datos que un componente le pasa a otro, como parámetros. Ej: al calendario le pasamos el auto
con `<BookingCalendar car={listing} />`.

**P: ¿Para qué sirve `useState` y `useEffect`?**
R: `useState` guarda datos que cambian y hacen que la pantalla se redibuje (ej: si un menú está
abierto). `useEffect` corre código en momentos clave, normalmente para **pedir datos** al backend
cuando la pantalla se abre.

**P: ¿Cómo se maneja la navegación entre pantallas?**
R: Con React Router. En `App.jsx` está el "mapa" de rutas: qué URL muestra qué pantalla. Las rutas
privadas están envueltas en `PrivateRoute`, que redirige al login si no hay sesión.

**P: ¿Dónde y cómo usan Inteligencia Artificial?**
R: En tres lugares, todos a través de `services/groq.js`: (1) el **chatbot** de ayuda, (2) **autocompletar
las specs** del auto al publicarlo, y (3) **verificar que las fotos** sean de un vehículo. Usamos la
API de Groq, que corre modelos de lenguaje.

**P: ¿Cómo protegen las rutas que requieren estar logueado?**
R: Con el componente `PrivateRoute`. Envuelve a las pantallas privadas y, si no hay usuario logueado,
redirige a `/login`. El panel de admin además chequea que el rol sea `ADMIN`.

**P: ¿El pago es real?**
R: No, es una **simulación** (pensada para el proyecto). El flujo completo está: se crea una intención
de pago, se procesa con una demora, y se confirma o falla. Pero no hay dinero real ni tarjetas.

**P: ¿Cómo funciona el chat en "tiempo real"?**
R: Usamos **polling**: mientras una conversación está abierta, cada 3 segundos volvemos a pedir los
mensajes al backend. Es una forma simple de mantenerlo actualizado sin tecnología más compleja como
WebSockets.

**P: ¿Qué es "responsive" y cómo lo lograron?**
R: Que la app se adapte a distintos tamaños de pantalla. Lo logramos con el hook `useIsMobile`, que
detecta el ancho de la ventana, y con eso mostramos layouts distintos (por ejemplo, el menú lateral
se convierte en un cajón desplegable en celular).

**P: ¿Qué pasa si el backend no responde?**
R: En varias pantallas tenemos un plan B: mostramos datos de ejemplo (`mockData`) o copias guardadas
localmente. Así la aplicación sigue siendo usable para la demostración.

**P: ¿Por qué separaron el código en carpetas `pages`, `components` y `services`?**
R: Por **orden y mantenibilidad**. Cada tipo de archivo tiene una responsabilidad clara: las páginas
son las pantallas, los componentes son piezas reutilizables, y los servicios son la lógica que habla
con el exterior (backend, IA, nube). Así es más fácil encontrar y cambiar cosas.

**P: ¿Cómo guardan las fotos de los autos?**
R: No las guardamos en nuestro servidor: las subimos a **Cloudinary** (un servicio en la nube) que nos
devuelve un link, y guardamos solo el link. Está en `services/cloudinary.js`.

---

## 9. Glosario rápido (por si el profe usa un término técnico)

- **Frontend:** la parte visual con la que interactúa el usuario.
- **Backend:** el servidor que guarda y procesa los datos.
- **API:** el conjunto de "puertas" del backend a las que el frontend le pide cosas.
- **HTTP / fetch:** la forma de pedir datos a un servidor por internet.
- **Token (JWT):** una credencial que identifica al usuario en cada pedido.
- **localStorage:** un pequeño almacén dentro del navegador donde guardamos datos que persisten.
- **Componente:** una pieza reutilizable de interfaz en React.
- **Estado (state):** datos que cambian y hacen que la pantalla se actualice.
- **Hook:** función especial de React (empiezan con `use`) que agrega capacidades a un componente.
- **Context:** mecanismo de React para compartir datos globales (nosotros, la sesión).
- **Responsive:** diseño que se adapta a celular, tablet y escritorio.
- **Polling:** pedir datos repetidamente cada cierto tiempo para mantenerlos actualizados.
- **KYC (Know Your Customer):** el proceso de verificar la identidad (DNI + licencia).
- **Mock:** datos o funciones "de mentira" para pruebas o demos (ej: el pago simulado).

---

¡Éxitos en la defensa! Si te preguntan algo puntual de una función, abrí el archivo correspondiente:
todos tienen un comentario arriba explicando qué hacen. 💪
