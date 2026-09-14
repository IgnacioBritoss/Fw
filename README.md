# Freewheel

Plataforma de alquiler de autos **entre particulares** para Argentina: una
persona publica su auto y otra lo reserva, sin agencia en el medio.

Este repositorio es el **frontend**. El proyecto son tres piezas separadas, cada
una con su repositorio y su publicación:

| Pieza | Qué es | Publicado en |
| --- | --- | --- |
| **Este repo** | La aplicación (React + Vite) | https://freewheel-5a.vercel.app |
| `emitejadaa/FreeWheel` | El backend y la base de datos (NestJS + Prisma + PostgreSQL) | https://free-wheel-back.vercel.app |
| `IgnacioBritoss/landing-page-freewheel` | La página de presentación | https://landing-page-free-wheel.vercel.app |

Que estén separados importa para entender el resto del archivo: **acá no hay
servidor ni base de datos**. Todo lo que se guarda, se cobra o se verifica pasa
por el backend, y esta aplicación solo le habla por HTTP.

---

## Qué se puede hacer

- **Publicar un auto**: fotos, precio por día, ubicación en el mapa y
  disponibilidad por fechas (bloquear los días en que no se alquila).
- **Buscar y reservar**: por ubicación, fechas, categoría, caja, combustible y
  precio máximo. Las fechas las resuelve el servidor, que es el único que sabe
  qué autos ya están reservados u ocupados.
- **El circuito completo de una reserva**, entre dos personas:
  pedido → el dueño acepta → el conductor paga → el auto queda listo para
  retirar → se confirma la entrega con un **código QR** → se confirma la
  devolución → cada uno califica al otro.
- **Verificar la identidad (KYC)**: se suben DNI (frente y dorso), licencia y
  una selfie. El backend cruza lo que la persona declaró contra lo que dicen los
  documentos, y sin la cuenta verificada no se puede publicar ni reservar.
- **Chat** entre las dos partes, con notas de voz.
- **Panel de administración**: moderar publicaciones, resolver reportes y revisar
  a mano las verificaciones que la IA no pudo aprobar.
- **Cinco idiomas**: español, inglés, portugués, italiano y chino. Están los
  cinco completos y con las mismas claves: más de mil frases en cada uno.
- **Modo oscuro**, y toda la aplicación pensada también para el teléfono.

### Dónde entra la inteligencia artificial

En cuatro lugares, y **siempre a través del backend** (ver la advertencia sobre
las claves más abajo):

1. autocompletar las especificaciones técnicas de un auto a partir de la marca,
   el modelo y el año;
2. comprobar que la foto de una publicación sea realmente un auto y no otra cosa;
3. leer el DNI y la licencia para cotejarlos con los datos declarados;
4. pasar a texto las notas de voz del chat.

---

## Con qué está hecho

- **React 19** + **Vite**
- **React Router** para la navegación
- **Leaflet** + OpenStreetMap para los mapas (sin clave de API)
- **react-datepicker** y **date-fns** para las fechas
- Un sistema de idiomas propio (`src/i18n`), sin librería externa

No hay librería de componentes ni de estilos: los estilos se escriben a mano,
con `src/styles/theme.css` para lo que es común a toda la aplicación.

---

## Cómo levantarlo

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`.

**No hace falta configurar nada para empezar.** Sin variables de entorno, la
aplicación le habla al backend ya publicado
(`https://free-wheel-back.vercel.app`), así que se puede entrar, buscar autos y
navegar la aplicación real desde el primer arranque.

Los otros comandos:

```bash
npm run build     # genera dist/
npm run preview   # sirve dist/ para revisarlo antes de publicar
npm run lint      # ESLint
```

Para probar desde el celular en la misma red WiFi:

```bash
npm run dev -- --host
```

### Variables de entorno (las dos son opcionales)

Se ponen en un archivo `.env.local` en la raíz. Ninguna es necesaria para el uso
normal.

| Variable | Para qué | Si no está |
| --- | --- | --- |
| `VITE_API_URL` | Apuntar a otro backend, por ejemplo uno corriendo en la misma máquina | Usa el backend publicado |
| `VITE_LANDING_URL` | A dónde lleva la propaganda del final del inicio | Usa la landing publicada |

Ejemplo, para trabajar contra un backend local:

```bash
VITE_API_URL=http://localhost:3000
```

### Sobre las claves: acá no va ninguna

**Ninguna clave de ningún servicio va en este repositorio.** No es una
recomendación, es cómo está construido.

El motivo: en Vite, **todo lo que empieza con `VITE_` queda escrito adentro del
JavaScript que se descarga cualquier visitante**. No está oculto ni cifrado:
alcanza con abrir el archivo desde el navegador para leerlo. Una versión anterior
de este archivo pedía poner acá la clave de la IA (`VITE_GROQ_API_KEY`), y eso
significaba regalarle la clave —y la cuenta que la paga— a cualquiera que
abriera la página.

Por eso:

- la **clave de la IA** vive en el backend, que es el único que llama a Groq. La
  aplicación le pide a `/ai/*` y nunca ve la clave;
- el **secreto de Cloudinary** (donde se guardan las fotos) también vive en el
  backend: la aplicación le pide una firma temporal y con esa firma sube el
  archivo directo a Cloudinary. El secreto no sale del servidor;
- las **claves de Stripe** son del backend, siempre.

Lo único que hay acá son direcciones públicas, que no son secretos.

---

## Cómo está organizado

```text
src/
  main.jsx              punto de entrada
  App.jsx               todas las rutas de la aplicación
  components/           lo que se reutiliza entre pantallas
    Layout.jsx            menú lateral + barra de arriba
    Logo.jsx  CarIcon.jsx  la marca y el auto
    ChatBot.jsx           el asistente flotante
    BookingCalendar.jsx  AvailabilityManager.jsx  OccupiedDates.jsx
    IdentityVerification.jsx  IdentityDocuments.jsx   KYC
    AvatarEditor.jsx      encuadre de la foto de perfil
    RankBadge.jsx         los escudos de rango
    LandingBanner.jsx     la propaganda que lleva a la landing
    ...
  pages/                una carpeta por pantalla
    Home/  Search/  CarDetail/  Booking/  Payment/  QRFlow/
    Auth/  KYC/  Profile/  Settings/  Notifications/
    Dashboard/            el panel del dueño ("Mis autos")
    MyBookings/           las reservas, de los dos lados
    Chat/  Favorites/  PublishCar/  Admin/  Terms/
  services/             todo lo que habla con afuera
    api.js                el cliente del backend (un solo lugar)
    cloudinary.js         subida de archivos con firma del servidor
    groq.js               la IA, siempre vía backend
    listings.js  dates.js  identity.js  phone.js  rank.js
    notifications.js  people.js  theme.js
  anim/                 el movimiento de toda la app
    scrollcraft.js        el motor: lee marcas data-sc-* y las mueve
    feedback.js           las animaciones de los eventos (anime.js)
    index.js              los ganchos de React que usan las pantallas
  context/              sesión (AuthContext) y favoritos
  hooks/                useListings, useIsMobile, useDraggableFab...
  i18n/                 los cinco idiomas y las funciones de traducción
  styles/theme.css      estilos comunes y modo oscuro
  styles/motion.css     los estados que enciende el motor de movimiento
  data/mockData.js      autos de ejemplo, solo si la base está vacía
```

Tres decisiones que explican la mayor parte del código:

- **`services/api.js` es el único archivo que conoce al backend.** Ninguna
  pantalla arma una URL ni un `fetch` por su cuenta.
- **El código está comentado en español**, y los comentarios explican *por qué*
  algo está hecho de una manera, no qué hace la línea de abajo. Cuando algo se
  cambió para arreglar un problema concreto, el comentario cuenta cuál era.
- **El movimiento no vive adentro de las pantallas.** Una tarjeta que entra al
  scrollear no lleva ningún efecto, ningún observador ni ningún `useEffect`:
  lleva `data-sc-in`, y un solo motor —`anim/scrollcraft.js`, encendido una vez
  en el Layout— la mueve. Ver más abajo.

Para una recorrida más larga —pantalla por pantalla, con preguntas y respuestas
típicas— está `GUIA_DEFENSA_ORAL.md`.

---

## El movimiento

La aplicación se mueve, y el movimiento está en dos piezas que resuelven dos
problemas distintos.

**Lo que se mueve solo: `src/anim/scrollcraft.js`.** Un motor que lee marcas
escritas en el HTML que ya existe y las anima. No dibuja nada, no envuelve
componentes y no cambia ningún estilo: se le pone `data-sc-in` a una tarjeta y
esa tarjeta ahora entra desde el fondo cuando aparece en pantalla; se le saca la
marca y queda exactamente como estaba. Hay un solo observador, un solo lector
de scroll y un solo cuadro por fotograma para toda la aplicación.

| Marca | Qué hace |
| --- | --- |
| `data-sc-in="up\|depth\|left\|right\|scale"` | Entra una vez, al aparecer en pantalla |
| `data-sc-stagger="55"` | En un contenedor: sus hijos entran uno atrás del otro |
| `data-sc-depth="-0.11"` | Profundidad continua al scrollear (planos a distinta velocidad) |
| `data-sc-tilt="6"` | Se inclina en 3D hacia el puntero |
| `data-sc-spotlight` | Publica la posición del mouse para un brillo que lo sigue |
| `data-sc-count="42"` | El número trepa hasta ese valor |

La gramática viene de la skill [scroll-craft](https://github.com/nateherkai/scroll-craft),
instalada en `.claude/skills/`. Su motor original está pensado para páginas
sueltas de HTML: monta una vez y no se desmonta nunca, así que en una aplicación
de una sola página no ve nada de lo que se dibuja al cambiar de ruta. El de acá
habla la misma gramática y además mira los cambios del documento.

**Lo que se mueve cuando pasa algo: `src/anim/feedback.js`.** Las secuencias de
los momentos que importan, hechas con [anime.js](https://animejs.com/):

- `celebrar` — el círculo se endereza en 3D y el tilde se dibuja de punta a
  punta. Es el final de un pago, de una publicación, de una verificación de
  identidad, de una entrega del auto y de una denuncia.
- `sacudir` — el cartel de error se mueve de lado, cuatro veces, cada una más
  corta. En los formularios va con un contador de intentos, porque el mismo
  error dos veces seguidas no cambia el estado y sin el contador el cartel se
  quedaría quieto justo en el segundo intento.
- `aparecer` / `desplegar` — para lo que no llega scrolleando: un paso de
  formulario que reemplaza al anterior, un panel que se abre.

**Menos movimiento, no cero.** Con `prefers-reduced-motion` activado se apaga
todo lo que se DESPLAZA y se conserva lo que APARECE: la opacidad es lo que
comunica "esto es nuevo" y no es lo que marea. La preferencia se relee en vivo,
sin recargar. Y las celebraciones, que existen solo por el movimiento, se apagan
enteras: lo que dicen está escrito también en palabras.

---

## Publicación

Se publica en Vercel desde la rama `main`. `vercel.json` redirige todas las
direcciones a `index.html`, que es lo que necesita una aplicación de una sola
página: sin eso, entrar directo a `/buscar` o recargar esa pantalla devuelve 404.
