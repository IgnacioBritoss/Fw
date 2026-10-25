# Glosario del código — Freewheel

Qué contiene y qué hace **cada archivo** del proyecto. Está ordenado por el
recorrido de la aplicación y no alfabéticamente: si te preguntan "¿dónde está
el pago?", vas a la sección del pago y ahí están todos los archivos que
intervienen, en orden.

- La explicación general del proyecto está en `GUIA_DEFENSA_ORAL.md`.
- Cómo levantarlo y qué variables de entorno necesita, en `README.md`.
- Este archivo es el índice detallado: **un renglón por archivo**.

Cada archivo del código, además, arranca con un comentario que dice lo mismo
pero más largo, y cada función tiene arriba una o dos líneas explicando qué
hace. Si abrís el archivo, no hace falta esta guía.

---

## 0. El mapa en una pantalla

| Carpeta | Qué hay adentro |
|---|---|
| `src/pages/` | Una carpeta por pantalla. Son las que tienen una URL propia. |
| `src/components/` | Piezas que se usan en varias pantallas (botones, tarjetas, modales). |
| `src/services/` | Las reglas: cuentas, validaciones y la comunicación con el servidor. **No dibujan nada.** |
| `src/context/` | Estado compartido por toda la aplicación (sesión, idioma, moneda, favoritos). |
| `src/hooks/` | Trozos de comportamiento reutilizable (medir la pantalla, grabar audio, arrastrar). |
| `src/i18n/` | Los cinco diccionarios de idioma y el mecanismo para traducir. |
| `src/data/` | Datos fijos que no vienen del servidor (tabla de autos, barrios, preguntas de Wili). |
| `src/anim/` | El movimiento: las animaciones de entrada y las del scroll. |
| `src/styles/` | Estilos compartidos entre formularios. |

**La regla que ordena todo:** una pantalla no habla nunca con el servidor por
su cuenta ni hace cuentas de plata. Pide los datos a `services/api.js` y las
cuentas a un servicio. Por eso casi todas las reglas se pueden probar sin abrir
el navegador (ver la sección 15).

---

## 1. Arranque y estructura

| Archivo | Qué hace |
|---|---|
| `src/main.jsx` | El punto de entrada. Monta React en el `<div id="root">` y envuelve la aplicación con los proveedores (idioma, sesión, moneda, favoritos). |
| `src/App.jsx` | El mapa de rutas: qué URL muestra qué pantalla, y cuáles exigen estar logueado. |
| `src/components/PrivateRoute.jsx` | El guardia de las rutas privadas. Si no hay sesión, redirige a `/login`; mientras se resuelve, muestra el círculo de carga. |
| `src/components/Layout.jsx` | El esqueleto visual común: barra lateral, barra superior, los puntitos de mensajes y notificaciones sin leer. Todas las pantallas de adentro se dibujan dentro de él. |
| `src/components/Navbar.jsx` | La barra de arriba con el botón "Volver" y el menú de la cuenta. |
| `index.html` | La página que sirve el navegador. Tiene el ícono de la pestaña dibujado a mano (el mismo auto del logo). |

---

## 2. Sesión y estado compartido

| Archivo | Qué hace |
|---|---|
| `src/context/AuthContext.jsx` | **La sesión.** Guarda quién entró, el token, si está verificado, y expone `login`, `logout` y `refreshUser`. Todo lo que pregunta "¿quién soy?" pasa por acá. |
| `src/context/CurrencyContext.jsx` | La moneda elegida y las cotizaciones. Los precios se guardan siempre en una sola moneda; esto decide en cuál se muestran. |
| `src/context/FavoritesContext.jsx` | Los ids de los autos marcados con el corazón. Se bajan una vez al entrar: sin esto, cada tarjeta preguntaría por su cuenta si es favorita. |
| `src/context/AssistantContext.jsx` | Si la ventanita de Wili está abierta. Está acá arriba porque hay botones en otras pantallas que la abren. |

---

## 3. Idiomas

| Archivo | Qué hace |
|---|---|
| `src/i18n/index.jsx` | El proveedor: guarda el idioma elegido, lo recuerda y le da a todas las pantallas la función `t("clave")`. |
| `src/i18n/core.js` | El mecanismo de traducción, la lista de idiomas y el `tSync` que usan los servicios (que no son componentes). |
| `src/i18n/es.js` | **Castellano: el diccionario de referencia.** 1623 claves. Los otros cuatro tienen exactamente las mismas. |
| `src/i18n/en.js`, `pt.js`, `it.js`, `zh.js` | Inglés, portugués, italiano y chino. |
| `src/i18n/dates.js` | Fechas escritas en el idioma elegido ("25 de octubre de 2026", "25 oct", "14:30"). |

---

## 4. La puerta al backend

| Archivo | Qué hace |
|---|---|
| `src/services/api.js` | **El archivo más importante del repo.** Una sola función interna (`apiFetch`) arma cada pedido HTTP, le pega el token y traduce los errores; todo lo demás son atajos cortos: `getListings()`, `createBooking()`, `confirmPickup()`. Ninguna pantalla sabe de URLs. |
| `src/services/cloudinary.js` | Sube fotos y audios. El navegador le pide una **firma** al backend y sube directo a Cloudinary: el secreto nunca sale del servidor. |
| `src/services/groq.js` | Las tres llamadas de IA (chat, visión, transcripción). Van al backend, nunca directo al proveedor: la clave no viaja al navegador. |
| `src/services/stripe.js` | Carga la pasarela de pago una sola vez y le pasa los colores del tema actual. |
| `src/services/notifications.js` | Arma la lista de notificaciones a partir de las reservas y los mensajes. |

---

## 5. El recorrido de quien alquila

| Archivo | Qué hace |
|---|---|
| `src/pages/Home/Home.jsx` | El inicio: el buscador (dónde, qué auto, qué fechas), las categorías, los autos disponibles en lista o en mapa, y los cuatro pasos de cómo se alquila. |
| `src/pages/Search/Search.jsx` | El buscador completo: filtros a la izquierda, resultados y mapa lado a lado. Pasar el mouse por una tarjeta resalta su punto en el mapa, y al revés. |
| `src/components/TarjetaDeBusqueda.jsx` | Un auto en la lista de resultados. Está en su propio archivo y con `memo` a propósito: ver la sección 17. |
| `src/components/TarjetaDeAutoHome.jsx` | Un auto en la grilla del inicio, por el mismo motivo. |
| `src/components/MapView.jsx` | El mapa con los autos (Leaflet + OpenStreetMap, sin cuenta ni clave). |
| `src/components/MapCarPopup.jsx` | La tarjetita que se abre al tocar un punto del mapa. |
| `src/pages/CarDetail/CarDetail.jsx` | La publicación: galería, ficha técnica, ubicación, reseñas, el dueño, y el botón de reservar. Si sos el dueño, además se edita desde acá. |
| `src/pages/Booking/Booking.jsx` | Elegir las fechas y ver el total antes de confirmar. Avisa si falta verificar la cuenta o si la licencia está vencida. |
| `src/components/BookingCalendar.jsx` | El calendario: días ocupados, mínimo de días y el precio del rango elegido. |
| `src/components/OccupiedDates.jsx` | La lista de días ya tomados, para no tener que probar fecha por fecha. |
| `src/pages/Payment/Payment.jsx` | **El pago**, en tres tramos: seña, saldo y depósito de garantía (que se retiene, no se cobra). |
| `src/components/TarjetaVirtual.jsx` | El formulario de la tarjeta, con la forma de una tarjeta de verdad. |
| `src/components/Billetera.jsx` | Las tarjetas guardadas para no volver a escribirlas en cada tramo. |
| `src/components/Comprobante.jsx` | El ticket del alquiler, con el borde dentado. |
| `src/components/MovimientosDelPago.jsx` | Todo lo que le pasó a la plata de una reserva, línea por línea. |
| `src/pages/MyBookings/MyBookings.jsx` | **Mis reservas, en los dos papeles a la vez**: las que pedí y las que recibí como dueño. Acá se acepta, se paga, se marca listo, se retira, se devuelve, se reseña y se cancela. |
| `src/pages/QRFlow/QrFlow.jsx` | El retiro y la devolución: uno muestra el código y el otro lo escanea. |
| `src/components/CodigoQR.jsx` | El QR dibujado en el navegador, sin pedírselo a ningún servicio. |
| `src/components/EscanerQR.jsx` | La cámara leyendo el código. |
| `src/components/ReviewForm.jsx` | Dejar la reseña: estrellas, comentario, características y hasta dos fotos. |
| `src/components/ListaDeReseñas.jsx` | Las reseñas recibidas, para leerlas. |
| `src/pages/Favorites/Favorites.jsx` | Los autos guardados con el corazón. |
| `src/components/FavoriteButton.jsx` | El corazón. El clic muere ahí y no abre la publicación de abajo. |

---

## 6. El recorrido del dueño

| Archivo | Qué hace |
|---|---|
| `src/pages/PublishCar/PublishCar.jsx` | **Publicar un auto, en cuatro pasos**: vehículo, fotos, aviso y confirmación. Guarda un borrador por si se cierra la pantalla, completa la ficha técnica sola y manda cada foto a revisar. Es la pantalla más larga del proyecto. |
| `src/pages/Dashboard/Dashboard.jsx` | "Mis autos": los avisos publicados, las reservas que llegan y cuánto se ganó. |
| `src/components/AvailabilityManager.jsx` | Bloquear fechas en las que el auto no está disponible (viaje, service, uso personal). |
| `src/components/RevisarElAuto.jsx` | Cuando el auto vuelve: el dueño lo mira y decide si está todo bien o si hace un reclamo con fotos. |
| `src/components/CobrosDelDueno.jsx` | Si el dueño puede recibir su plata, y el alta de cobro si todavía no la hizo. |
| `src/pages/Connect/VueltaDeStripe.jsx` | A dónde cae el dueño cuando termina el alta de cobro en Stripe. |
| `src/components/LocationPicker.jsx` | Elegir dónde se entrega el auto, con buscador y mapa. |
| `src/components/AutocompleteInput.jsx` | El campo que completa solo mientras se escribe (barrios, marcas). |

---

## 7. Verificación de identidad (KYC)

| Archivo | Qué hace |
|---|---|
| `src/pages/KYC/KYC.jsx` | La pantalla que envuelve el trámite. |
| `src/components/IdentityVerification.jsx` | El trámite completo: datos, fotos del DNI y de la licencia, y el resultado de la lectura automática. |
| `src/components/IdentityDocuments.jsx` | Las fotos de una solicitud y lo que la IA leyó de ellas. |
| `src/components/PhoneInput.jsx` | Teléfono con código de país, validado antes de mandarlo. |
| `src/components/PhotoVisibilityChoice.jsx` | Quién ve tu foto de perfil: cualquiera, o solo con quien tengas una reserva. |
| `src/components/AvisoDeConducir.jsx` | "Hoy no podés alquilar", dicho **antes** de que lo intente: la licencia vencida no es un error que deba aparecer al final. |

---

## 8. Mensajería y asistente

| Archivo | Qué hace |
|---|---|
| `src/pages/Chat/Chat.jsx` | La mensajería entre las dos personas de una reserva: texto, fotos, archivos y notas de voz que se pueden transcribir. |
| `src/components/UserProfileModal.jsx` | La ficha de la otra persona, que se abre desde el chat o desde una publicación. |
| `src/components/ChatBot.jsx` | **Wili**, el asistente flotante. Primero busca entre las respuestas ya escritas y solo si ninguna sirve le pregunta a la IA. |
| `src/components/RobotIcon.jsx` | La cara de Wili. |
| `src/hooks/useGrabadora.js` | Grabar una nota de voz con el micrófono. |
| `src/hooks/useDraggableWindow.js` | La ventana del asistente se puede arrastrar por la pantalla. |
| `src/pages/Notifications/Notifications.jsx` | El centro de notificaciones, por categorías. |

---

## 9. Administración

| Archivo | Qué hace |
|---|---|
| `src/pages/Admin/Admin.jsx` | El panel: publicaciones, usuarios, verificaciones, reportes, reservas y reclamos. |
| `src/components/AlertasDeFraude.jsx` | Las cuentas que podrían estar inflando su reputación, con lo que detectó cada regla. |
| `src/components/ReclamosAdmin.jsx` | Los reclamos por daño sin resolver, y la decisión sobre el depósito. |
| `src/components/ReservasAdmin.jsx` | Las reservas de toda la plataforma y el cobro de una garantía. |
| `src/components/ReportModal.jsx` | Reportar una publicación o una persona, con evidencia. |
| `src/components/ReportIssueCard.jsx` | Reportar un error de la página, desde Ajustes. |

---

## 10. Pantallas de cuenta

| Archivo | Qué hace |
|---|---|
| `src/pages/Auth/Login.jsx` | Entrar con email o con Google. |
| `src/pages/Auth/Register.jsx` | El alta, en varios pasos. |
| `src/pages/Auth/VerifyEmail.jsx` | El código de seis dígitos que llega por mail. |
| `src/pages/Auth/ForgotPassword.jsx` | Pedir el mail de recuperación. Conteste lo que conteste el servidor, dice lo mismo: decir "esa cuenta no existe" sería una forma de averiguar quién tiene cuenta. |
| `src/pages/Auth/ResetPassword.jsx` | Crear la contraseña nueva desde el link del mail. |
| `src/pages/Auth/CompleteProfile.jsx` | El último dato que falta en las cuentas de Google. |
| `src/pages/Auth/GoogleCallback.jsx` | La pantalla intermedia a la que vuelve Google. |
| `src/pages/Profile/Profile.jsx` | El perfil: foto, portada, datos, verificación y reseñas recibidas. |
| `src/pages/Settings/Settings.jsx` | Ajustes: idioma, moneda, tema, avisos por mail, cambiar el email y borrar la cuenta. |
| `src/pages/Terms/Terms.jsx` | Términos y condiciones. |
| `src/components/AuthShell.jsx` | La carcasa de todas las pantallas de entrada (foto a un lado, formulario al otro). |
| `src/components/AuthAside.jsx` | El panel con la foto de esas pantallas. |
| `src/components/ChangeEmailCard.jsx` | Cambiar el email: el código llega a la dirección **nueva**, que es lo que prueba que existe y es tuya. |
| `src/styles/authFields.js` | Los estilos compartidos por esos formularios. |

---

## 11. Componentes de uso general

| Archivo | Qué hace |
|---|---|
| `src/components/Avatar.jsx` | La foto de perfil, o las iniciales si no hay. |
| `src/components/AvatarEditor.jsx` | Encuadrar la foto de perfil con zoom y arrastre. Recorta siempre sobre la original, no sobre el recorte anterior. |
| `src/components/PortadaDelPerfil.jsx` | La franja de arriba del perfil y su encuadre arrastrable. |
| `src/components/EditorDePortada.jsx` | Elegir diseño, color o foto para esa franja. |
| `src/components/Spinner.jsx` | "Esto está cargando". |
| `src/components/Aviso.jsx` | El cartelito que aparece abajo cuando algo salió mal. |
| `src/components/StatusChip.jsx` | Cómo se muestra un estado en todo el sitio. |
| `src/components/Select.jsx` | Desplegable propio, con teclado. |
| `src/components/ConfirmarEscribiendo.jsx` | Para lo que no se puede deshacer: hay que **escribir una frase** para confirmar. |
| `src/components/CurrencyPicker.jsx` / `LangPicker.jsx` | Los selectores de moneda y de idioma. |
| `src/components/Logo.jsx` | La marca, en un solo lugar: el auto y la palabra. |
| `src/components/CarIcon.jsx`, `FlechaFoto.jsx` | Íconos dibujados a mano. |
| `src/components/RankBadge.jsx`, `EscudoDeRango.jsx` | El rango de una persona según sus reseñas reales. |
| `src/components/UserReputation.jsx`, `PanelDeReputacion.jsx` | La calificación según el papel (dueño o conductor) y el cuadro completo de quién es esa persona. |
| `src/components/LandingBanner.jsx` | La propaganda del final del inicio. |

---

## 12. Servicios: las reglas del negocio

Ninguno dibuja nada. Todos se pueden probar sin navegador.

| Archivo | Qué resuelve |
|---|---|
| `listings.js` | El formato **único** de un auto para toda la aplicación, venga como venga del servidor. |
| `pago.js` | Qué tramo del pago sigue (seña, saldo o depósito), decidido en un solo lugar. |
| `movimientos.js` | El historial de plata de una reserva y el cobro de la garantía. |
| `comprobante.js` | Qué dice el ticket del alquiler. |
| `cancelacion.js` | Qué pasa si se cancela, **dicho antes** de cancelar: el servidor decide después de apretar, y para entonces ya no hay nada que decidir. |
| `noShow.js` | El retiro que no pasó: cuándo se puede dejar constancia y qué pasa con cada combinación. |
| `reclamo.js` | El reclamo de un daño, revisado antes de mandarlo. |
| `cobros.js` | Si el dueño puede recibir la plata (y si los cobros están simulados). |
| `billetera.js` | Las tarjetas vinculadas, guardadas en **su** navegador. |
| `tarjeta.js` | Reconocer y revisar una tarjeta antes de mandarla a cobrar. |
| `moneda.js` | Mostrar los precios en la moneda de quien mira. |
| `precio.js` | Sacarle un precio usable a lo que contestó la IA. |
| `comparables.js` | Cuánto se cobra acá por un auto parecido al que se está publicando. |
| `especificaciones.js` | Buscar el auto en la tabla local **antes** de gastarle una pregunta a la IA. |
| `mismoAuto.js` | **¿Todas las fotos son del mismo auto?** Compara lo que la IA vio en cada foto contra las otras y contra lo que la persona cargó en el formulario, incluida la patente. |
| `identity.js` | DNI y CUIL, validados antes de mandarlos. |
| `phone.js` | Las reglas del teléfono por país. |
| `conducir.js` | Estar verificado no es lo mismo que poder manejar: la licencia vence. |
| `revisionDocumentos.js` | En qué quedó la lectura del DNI y de la licencia. |
| `documentPhoto.js` | Dejar una foto de documento en condiciones de ser leída. |
| `escaner.js` | Leer el código de entrega con la cámara. |
| `rank.js` | En qué rango cae una persona según sus reseñas reales. |
| `atributos.js` | Las características que se eligen al dejar una reseña. |
| `asistente.js` | Qué le contesta Wili por su cuenta y qué le deja a la IA. |
| `people.js` | Cómo se nombra a una persona en la interfaz. |
| `texto.js` | Dejar un texto escrito por una persona en algo comparable. |
| `dates.js` | Desde cuándo se puede alquilar. |
| `portada.js` | La foto que rota detrás del bloque principal del inicio. |
| `portadaDePerfil.js` | El dibujo, el color, la foto y el encuadre de la portada del perfil. **No confundir con el anterior.** |
| `leaflet.js` | Cargar la librería del mapa una sola vez. |
| `mapaClusters.js` | Juntar los puntos que quedan encima al alejar el mapa. |
| `mapaGlobo.js` | Cuánto puede medir la tarjeta que se abre sobre el mapa. |
| `theme.js` | El modo oscuro y **todas** las variables de color del sitio. |

---

## 13. Hooks

| Archivo | Qué hace |
|---|---|
| `useIsMobile.js` | Si la pantalla es de celular, tablet o computadora. |
| `useListings.js` | Baja la lista de autos con filtros; si el servidor no contesta, muestra los de ejemplo y lo avisa. |
| `useVerificationStatus.js` | El estado real de la verificación, siempre al día. |
| `useRevisionDeDocumentos.js` | Espera a que terminen de leer el DNI y la licencia. |
| `useModoOscuro.js` | Avisa cuándo cambia el tema, para lo que no se pinta con CSS (mapas, canvas). |
| `useThemeColor.js` | El color de la barra del navegador en el celular. |
| `useOrdenArrastrando.js` | Reordenar una fila de cosas arrastrándolas. |
| `useDraggableWindow.js` | Mover la ventana del asistente. |
| `useGrabadora.js` | Grabar una nota de voz. |

---

## 14. Datos fijos, diseño y movimiento

| Archivo | Qué hace |
|---|---|
| `src/data/autosArgentina.js` | Las especificaciones de los autos que de verdad se alquilan acá. Es lo que evita preguntarle a la IA. |
| `src/data/sugerencias.js` | Los 105 barrios, localidades y destinos que ofrece el buscador. |
| `src/data/preguntasWili.js` | Las preguntas que contestamos nosotros, no la IA. |
| `src/data/mockData.js` | Autos de ejemplo, para que la pantalla no quede vacía si el servidor no contesta. |
| `src/anim/index.js` | La puerta de entrada del movimiento (entre ellas la sacudida de los carteles de error). |
| `src/anim/feedback.js` | Las animaciones de los momentos que importan (un pago que sale, un código aceptado). |
| `src/anim/scrollcraft.js` | El motor del scroll: las cosas que aparecen al bajar, los números que trepan y las tarjetas que se inclinan hacia el mouse. Respeta "menos movimiento" del sistema. |

---

## 15. Las pruebas

Cada servicio tiene su archivo `.test.js` al lado. Son **510 pruebas** que
corren con `npm test`, sin navegador y sin servidor: por eso las reglas viven
en `services/` y no adentro de las pantallas.

Lo que se prueba no es que un degradado quede lindo, sino que **nada rompa la
pantalla**: que un dato raro de la base caiga en un valor por omisión, que una
cuenta de plata dé el número correcto, que una validación no deje pasar lo que
no corresponde y, sobre todo, que no frene a quien no hizo nada malo.

---

## 16. El backend, en una tabla

Está en el otro repositorio (`emitejadaa/FreeWheel`, NestJS + Prisma +
PostgreSQL). Los módulos que más se nombran:

| Módulo | Qué resuelve |
|---|---|
| `auth/` | Entrar, el token, Google. |
| `users/` | La cuenta y el perfil público. |
| `vehicles/` + `listings/` | El auto y su aviso. |
| `availability/` | Qué días está libre. |
| `bookings/` | El ciclo de la reserva: pedida, aceptada, entregada, devuelta. |
| `payments/` + `ledger/` | Los tres tramos del cobro y el registro del dinero. |
| `claims/` | Los reclamos por daño y el depósito. |
| `reviews/` | Las reseñas y la reputación. |
| `antifraude/` | Los límites para que la reputación no se pueda fabricar. |
| `verification/` | DNI y licencia: lectura automática y revisión. |
| `ai/` | El proxy a Groq. La clave vive acá y nunca en el navegador. |
| `media/` | Las firmas para subir a Cloudinary. |
| `conversations/` | El chat. |
| `admin/` | Todo lo del panel. |
| `common/rate-limit/` | Los topes de pedidos, guardados en la base para que valgan en todas las instancias. |

---

## 17. Dónde está la respuesta a...

| Si preguntan... | Abrí |
|---|---|
| "¿Cómo se comunica el front con el back?" | `services/api.js`, la función `apiFetch` |
| "¿Dónde está la sesión?" | `context/AuthContext.jsx` |
| "¿Cómo evitás que se publique una foto que no es del auto?" | `services/mismoAuto.js` |
| "¿Por qué las tarjetas están en archivos aparte?" | el encabezado de `components/TarjetaDeBusqueda.jsx`: un componente declarado adentro de otro es un **tipo nuevo en cada dibujo**, y React desmonta y vuelve a montar todas las tarjetas. Era el motivo por el que se recargaban al pasar el mouse. |
| "¿Cómo manejás los errores del servidor?" | `apiFetch` en `services/api.js`: nunca devuelve `undefined`, siempre lanza con el mensaje del backend |
| "¿Y si el backend es viejo y no conoce un campo?" | `updateMe` en `services/api.js`: lo saca y reintenta |
| "¿Dónde se decide cuánto se devuelve si cancelo?" | `services/cancelacion.js` |
| "¿Cómo se sube una foto sin exponer la clave?" | `services/cloudinary.js`: el backend firma, el navegador sube |
| "¿Qué pasa si no hay internet o el servidor no contesta?" | `hooks/useListings.js`: muestra los autos de ejemplo y lo dice |
| "¿Cómo está hecho el modo oscuro?" | `services/theme.js`: variables de CSS, y una clase en el `<html>` |
| "¿Cómo agregarías un idioma?" | copiar `i18n/es.js`, traducir las claves y sumarlo a `LANGUAGES` en `i18n/core.js` |
| "¿Dónde está el límite de reseñas o de publicaciones?" | en el **backend**, `src/antifraude/limites.ts`. Del lado del navegador un límite es una sugerencia. |
| "¿Y si alguien satura la IA o sube mil fotos?" | ver la sección 18: los cupos están en el servidor, no en la página. |

---

## 18. Los cupos: por qué están en el servidor y no en la página

Hay tres cosas que a Freewheel le **cuestan plata de verdad**: cada pregunta a
Wili y cada foto que se revisa gastan cuota de nuestra clave de Groq, y cada
foto subida ocupa lugar en nuestra cuenta de Cloudinary. Sin un tope, una sola
persona —o un guion suelto— las agota para todos los demás.

**Un tope en el navegador no es un tope.** Cualquiera abre las herramientas de
desarrollo con F12 y llama al endpoint a mano, o lo llama con `curl` sin
abrir la página siquiera. Todo lo que se cuente del lado del cliente se puede
borrar. Por eso los cupos viven en el backend, y el contador está **en la base
de datos** y no en memoria: en Vercel cada instancia nueva arranca en cero, así
que un contador en memoria se reinicia solo con esperar un rato.

| Qué | Cuánto | Dónde |
|---|---|---|
| Preguntas a Wili | 80 por día, por cuenta y por IP | `ai/ai.controller.ts` |
| Revisiones de fotos con IA | 120 por día | `ai/ai.controller.ts` |
| Notas de voz transcriptas | 40 por día | `ai/ai.controller.ts` |
| Fotos subidas | 100 por día | `media/media.controller.ts` |
| Autos publicados | 6 por día, 15 por semana | `antifraude/limites.ts` |
| Reseñas escritas | 3 por día, 6 por semana | `antifraude/limites.ts` |

Los números están puestos **bastante por encima** de lo que hace una persona de
verdad, a propósito: un tope apretado molesta a quien no hizo nada y al que
quiere abusar igual le deja todo el día. Seis avisos de seis fotos son treinta
y seis fotos y treinta y seis revisiones; los cupos son el doble de eso.

**El detalle que hace que el cupo de fotos funcione:** antes el servidor
firmaba una carpeta, y esa firma servía para subir *cualquier cantidad* de
archivos. Pedir una sola desde la consola alcanzaba para llenar la cuenta sin
volver a pasar por el servidor, así que limitar los pedidos de firma no limitaba
nada. Ahora el servidor firma el **nombre del archivo**: una firma sirve para
una foto, y repetir la subida sobrescribe esa misma foto en vez de agregar otra.
Recién con eso contar firmas es contar fotos (`media/media.service.ts`).

**Lo que ve el usuario.** El servidor contesta 429 con cuántos segundos faltan,
y el front separa dos casos que no son lo mismo (`services/api.js`): si falta
poco es una ráfaga —"esperá un momento"— y si falta mucho es el cupo del día
—"mañana podés seguir"—. Decirle "probá en un minuto" a alguien que agotó el
cupo del día es mandarlo a esperar al pedo.

**Lo que NO se pide:** la cédula verde del auto. Para que sirviera habría que
poder cotejarla contra un registro del Estado, y eso no lo tenemos; pedir una
foto que nadie puede verificar da una sensación de seguridad que no existe y le
agrega un paso a todo el mundo. Contra el que quiere llenar el catálogo de
avisos falsos, lo que sirve de verdad es el tope por día más las alertas de
`antifraude/`.
