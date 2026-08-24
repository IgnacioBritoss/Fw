// ============================================================================
//  api.js — Capa de comunicación con el BACKEND (la "puerta de salida" de la app)
// ----------------------------------------------------------------------------
//  Todas las pantallas que necesitan datos del servidor (usuarios, autos,
//  reservas, mensajes, pagos, administración) llaman a las funciones de este
//  archivo. Así el resto de la app no sabe de URLs ni de fetch: solo llama,
//  por ejemplo, a getMyBookings() y recibe los datos ya listos.
//
//  Idea central: una única función interna (apiFetch) arma cada pedido HTTP,
//  le agrega el token de sesión y maneja los errores. Todas las demás
//  funciones son "atajos" cortos que usan apiFetch con la ruta y el método
//  correctos.
// ============================================================================

// Dirección base del backend. Por defecto apunta al que está desplegado en
// Vercel; con VITE_API_URL se puede apuntar a un backend local para desarrollo
// (por ejemplo VITE_API_URL=http://localhost:3000 en un archivo .env.local).
import { tSync, idiomaInicial } from "../i18n/core";

const BASE_URL = import.meta.env.VITE_API_URL || "https://free-wheel-back.vercel.app";

/**
 * Dirección del servicio de IA propio (repo freewheel-ia).
 *
 * POR QUÉ HAY DOS SERVIDORES. El asistente, el autocompletado de
 * especificaciones y el precio sugerido dejaron de andar los tres el mismo día,
 * y para arreglarlo había que esperar a que otra persona desplegara el backend.
 * El servicio de IA ahora es un proyecto aparte que se despliega solo, así que
 * probar un modelo, cargar una clave o arreglar algo no depende de nadie.
 *
 * La verificación de identidad NO se mudó: el DNI y la licencia siguen yendo al
 * backend principal, que es el que guarda los documentos y las cuentas.
 *
 * Sin VITE_IA_URL cargada, esto queda vacío y todo sigue yendo al backend de
 * siempre. Así el front nuevo funciona igual antes de que el servicio esté
 * publicado, y no hay un rato en el que la IA quede sin nadie que la atienda.
 */
const IA_URL = (import.meta.env.VITE_IA_URL || "").replace(/\/$/, "");

// URL a la que se redirige al usuario para iniciar sesión con Google (OAuth).
export const GOOGLE_AUTH_URL = `${BASE_URL}/auth/google`;

// Devuelve el token de sesión (JWT) guardado en el navegador, o null si no hay.
// El token viaja en cada pedido para que el backend sepa quién está pidiendo.
// `onboardingToken` es el token corto que da el backend cuando la cuenta todavía
// debe verificar el email o cargar la fecha de nacimiento: solo sirve en las
// rutas de onboarding, pero se manda igual porque son las únicas que se llaman
// mientras la sesión está a medio abrir.
function getToken() {
  const user = localStorage.getItem("fw_user");
  if (!user) return null;
  try {
    const parsed = JSON.parse(user);
    return parsed.accessToken || parsed.onboardingToken || null;
  } catch { return null; }
}

// Rutas donde un 401 es una respuesta esperada ("contraseña incorrecta"), no una
// sesión vencida: acá NO hay que borrar la sesión ni redirigir al login.
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];
const isAuthRoute = (path) => AUTH_ROUTES.some(route => path.startsWith(route));

// Función central: hace un pedido HTTP al backend y devuelve la respuesta en JSON.
// - Agrega automáticamente el token de sesión en la cabecera Authorization.
// - Si el backend responde 401 con una sesión vencida, la cierra y manda al login.
// - En cualquier error lanza una excepción con el mensaje del backend, para que
//   la pantalla que llamó pueda mostrarlo. Nunca devuelve `undefined` en un
//   error: si lo hiciera, quien la llamó reventaría al leer `data.user`.
async function apiFetch(path, { timeoutMs, base, ...options } = {}) {
  const servidor = base || BASE_URL;
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Sin un tope, un pedido que no contesta deja la pantalla girando para
  // siempre. `timeoutMs` lo pone quien llama porque no todos duran lo mismo: el
  // envío de documentos corre la revisión adentro del pedido y tarda hasta 50
  // segundos, mientras que leer el estado tiene que contestar en el acto.
  const abortador = timeoutMs ? new AbortController() : null;
  const reloj = abortador ? setTimeout(() => abortador.abort(), timeoutMs) : null;

  let res;
  try {
    res = await fetch(`${servidor}${path}`, {
      ...options,
      headers,
      ...(abortador ? { signal: abortador.signal } : {}),
    });
  } catch (fallo) {
    // Se acabó el tiempo. Se marca aparte de "no hay internet" porque no
    // significa lo mismo: el pedido PUEDE haber llegado y estar ejecutándose en
    // el servidor, así que quien llama tiene que ir a mirar cómo quedó la cosa
    // en vez de dar el error por bueno y reintentar a ciegas.
    if (fallo?.name === "AbortError") {
      const err = new Error(tSync("net.timeout"));
      err.status = 0;
      err.timedOut = true;
      throw err;
    }
    // Falló la red (sin internet, backend caído): mensaje claro en vez de
    // "Failed to fetch", que no le dice nada al usuario.
    const err = new Error(tSync("net.offline"));
    err.status = 0;
    throw err;
  } finally {
    if (reloj) clearTimeout(reloj);
  }

  if (!res.ok) {
    let payload = null;
    try { payload = await res.json(); } catch { /* la respuesta puede no ser JSON */ }
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" · ")            // errores de validación del backend
      : payload?.message || `Error ${res.status}`;

    // Sesión vencida o token inválido en una ruta que requiere estar logueado.
    //
    // Solo cuenta si el 401 vino del backend principal, que es el único que
    // sabe de sesiones. El servicio de IA no maneja cuentas: un 401 suyo sería
    // por SU clave, y cerrarle la sesión a la persona por eso la echaría de la
    // app por algo que no tiene nada que ver con ella.
    if (res.status === 401 && !isAuthRoute(path) && servidor === BASE_URL) {
      localStorage.removeItem("fw_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
    }

    // La cuenta sin verificar es un 403 que puede aparecer en CUALQUIER acción
    // protegida: publicar, editar, reservar, aceptar, cobrar, ver el contrato. Las
    // pantallas grandes ya lo explican y ofrecen el camino, pero el resto mostraba
    // el texto crudo del servidor —en castellano, con la cuenta puesta en inglés—
    // sin decir qué hacer. Se traduce una vez acá y se marca el error, para que
    // cualquier pantalla pueda ofrecer el botón sin repetir la comprobación.
    const noVerificada = res.status === 403 && payload?.code === "ACCOUNT_NOT_VERIFIED";

    const err = new Error(noVerificada ? tSync("net.notVerified") : message);
    err.status = res.status;
    err.code = payload?.code;                  // ej: ACCOUNT_NOT_VERIFIED
    err.needsVerification = noVerificada;
    err.payload = payload;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── AUTENTICACIÓN ──────────────────────────────────────────────
// El registro tiene DOS pasos en el backend:
//   1) registerStart(email) → manda un código de 6 dígitos al mail. Todavía no
//      existe ninguna cuenta.
//   2) registerComplete(...) → con el código + los datos crea la cuenta, ya con
//      el email verificado, y devuelve el token de sesión.
// Hacerlo así evita cuentas a medio crear con emails que no existen.

// Paso 1: pide el código de verificación para un email sin cuenta.
export async function registerStart({ email }) {
  return apiFetch("/auth/register/start", { method: "POST", body: JSON.stringify({ email }) });
}

// Paso 2: crea la cuenta. Devuelve { user, accessToken }.
export async function registerComplete({ email, code, password, firstName, lastName, phone, dateOfBirth, acceptedTerms }) {
  return apiFetch("/auth/register/complete", {
    method: "POST",
    body: JSON.stringify({
      email, code, password, firstName, lastName, dateOfBirth, acceptedTerms,
      ...(phone ? { phone } : {}),
    }),
  });
}

// Inicia sesión con email y contraseña. Devuelve el usuario y el token.
export async function loginUser({ email, password }) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
// Confirma la cuenta con el código que llegó por email.
export async function verifyEmail({ code }) {
  return apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ code }) });
}
// Carga la fecha de nacimiento que falta (cuentas de Google y cuentas viejas).
// Es obligatoria y debe ser de alguien mayor de 18. Devuelve la sesión completa.
export async function completeProfile({ dateOfBirth }) {
  return apiFetch("/auth/complete-profile", { method: "POST", body: JSON.stringify({ dateOfBirth }) });
}
// Reenvía el código de verificación al email del usuario.
export async function resendVerification() {
  return apiFetch("/auth/resend-verification", { method: "POST" });
}
// Pide el email de "olvidé mi contraseña" (el backend manda un link/código).
export async function forgotPassword({ email }) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}
// Establece una contraseña nueva usando el token recibido por email.
export async function resetPassword({ token, userId, newPassword }) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, userId, newPassword }),
  });
}
/**
 * Cambiar la dirección de email de la cuenta. Son dos pasos y el código llega a
 * la dirección NUEVA: así se comprueba que esa dirección existe y es de quien la
 * está poniendo. Hasta confirmar, el email de la cuenta no se toca.
 *
 * Estas dos funciones ya existían pero ninguna pantalla las llamaba: se podía
 * "editar" el email en Ajustes como un campo cualquiera, la pantalla mostraba el
 * nuevo y el servidor seguía con el viejo.
 */
export async function requestEmailChange(newEmail) {
  return apiFetch("/auth/request-email-change", {
    method: "POST",
    body: JSON.stringify({ newEmail }),
  });
}
/** Confirma el cambio. La dirección la toma el backend del código guardado. */
export async function confirmEmailChange(code) {
  return apiFetch("/auth/confirm-email-change", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// ── USUARIOS ───────────────────────────────────────────────────
// getMe(): trae los datos del usuario logueado. updateMe(): edita el perfil.
export async function getMe() { return apiFetch("/users/me"); }
/**
 * Edita el perfil. Solo se manda lo que se pasó: el backend valida con
 * `forbidNonWhitelisted`, y mandar `phone: undefined` en un cambio de foto
 * hacía que se pisara con vacío lo que no se estaba tocando.
 *
 * `profilePhotoUrl` es la foto de perfil (null la quita) y
 * `profilePhotoVisibility` es quién puede verla ("EVERYONE" | "BOOKED").
 * `dni`, `cuil` y `address` son los datos que la verificación de identidad
 * coteja contra el DNI y la licencia.
 *
 * SOBRE EL BACKEND VIEJO: el front y el backend se publican por separado, así que
 * hay un rato en el que este front le habla a un backend que todavía no conoce
 * un campo nuevo. Ese backend NO lo ignora: valida con `forbidNonWhitelisted` y
 * contesta 400. Sin el reintento de abajo, en ese rato no se podría ni cambiar la
 * foto (ya pasó con otro campo: la revisión de fotos quedó devolviendo 400 y
 * ninguna foto se revisaba). Entonces, si el 400 es porque el campo no existe, se
 * guarda lo demás y se recuerda para no volver a mandarlo en toda la sesión.
 *
 * Quien llama puede darse cuenta de que un campo quedó sin guardar mirando el
 * perfil que se devuelve: es el que respondió el servidor, no el que se mandó.
 */
const CAMPOS_EDITABLES = [
  "firstName", "lastName", "phone",
  "profilePhotoUrl", "profilePhotoVisibility",
  "dni", "cuil", "address",
  // Si querés recibir avisos por mail (reservas, pagos, mensajes sin leer).
  "emailNotifications",
];

// Los que un backend anterior puede no conocer todavía.
const CAMPOS_NUEVOS = [
  "profilePhotoVisibility", "dni", "cuil", "address", "emailNotifications",
];

// Los que ya rebotaron en esta sesión por no existir en el backend.
const desconocidos = new Set();

/**
 * ¿Este 400 es "el backend no conoce ese campo" y no "ese valor está mal"?
 *
 * La diferencia importa: `forbidNonWhitelisted` contesta "property dni should not
 * exist", y ahí reintentar sin el campo es lo correcto. Pero un CUIL con el
 * dígito verificador mal también menciona el campo, y ahí reintentar sin él
 * guardaría el resto y diría que salió bien, ocultando el error de carga. Por eso
 * se exige el "should not exist".
 */
const campoDesconocido = (err, campo) =>
  err?.status === 400 &&
  new RegExp(`${campo}\\b[^·]*should not exist`, "i").test(String(err?.message ?? ""));

export async function updateMe(fields = {}) {
  const body = {};
  for (const key of CAMPOS_EDITABLES) {
    if (fields[key] !== undefined) body[key] = fields[key];
  }

  const enviar = (payload) =>
    apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(payload) });

  // Un intento por campo nuevo como máximo: cada rechazo saca uno del payload,
  // así que la vuelta siguiente manda estrictamente menos.
  for (let intento = 0; intento <= CAMPOS_NUEVOS.length; intento++) {
    const payload = { ...body };
    for (const campo of desconocidos) delete payload[campo];

    // Si lo único que se estaba cambiando era un campo que este backend no
    // tiene, no queda nada que mandar: se devuelve el perfil como está en vez de
    // un PATCH vacío.
    if (Object.keys(payload).length === 0) return getMe();

    try {
      return await enviar(payload);
    } catch (err) {
      const rechazado = CAMPOS_NUEVOS.find(
        (campo) => payload[campo] !== undefined && campoDesconocido(err, campo),
      );
      if (!rechazado) throw err;
      desconocidos.add(rechazado);
    }
  }

  return getMe();
}

// ── VEHÍCULOS ──────────────────────────────────────────────────
// El "vehículo" es el auto en sí (marca, modelo, año). CRUD completo:
// crear, listar los míos, ver uno, editar y borrar.
export async function createVehicle(data) {
  return apiFetch("/vehicles", { method: "POST", body: JSON.stringify(data) });
}
export async function getMyVehicles() { return apiFetch("/vehicles/me"); }
export async function getVehicleById(id) { return apiFetch(`/vehicles/${id}`); }
export async function updateVehicle(id, data) {
  return apiFetch(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteVehicle(id) {
  return apiFetch(`/vehicles/${id}`, { method: "DELETE" });
}

// ── PUBLICACIONES (LISTINGS) ───────────────────────────────────
// El "listing" es el aviso de alquiler: toma un vehículo y le agrega precio,
// ubicación y disponibilidad. Es lo que se ve en la búsqueda.
// getListingAvailability(): consulta qué fechas están ocupadas/libres.
export async function createListing(data) {
  return apiFetch("/listings", { method: "POST", body: JSON.stringify(data) });
}
// Búsqueda pública de publicaciones. Acepta los filtros que entiende el backend:
// locationText, minPrice, maxPrice, brand, model, category, transmission,
// fuelType, minSeats, startDate, endDate, sort, page y limit.
// Los filtros vacíos se descartan: si se mandaran como "undefined", el backend
// los tomaría como un valor real y no devolvería nada.
export async function getListings(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, value instanceof Date ? value.toISOString() : String(value));
  });
  const qs = search.toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ""}`);
}
export async function getMyListings() { return apiFetch("/listings/me"); }
export async function getListingById(id) { return apiFetch(`/listings/${id}`); }

// Disponibilidad de una publicación entre dos fechas. El backend espera
// startDate/endDate (no from/to) y responde, además de las reservas y bloqueos,
// `unavailableDates`: los días ocupados ya listados uno por uno.
export async function getListingAvailability(listingId, startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch(`/listings/${listingId}/availability?${params.toString()}`);
}

// ── DISPONIBILIDAD POR FECHAS (del dueño) ──────────────────────
// El dueño puede bloquear rangos en los que su auto no está disponible (viaje,
// service, uso personal). Esos bloqueos ocultan el auto de las búsquedas con
// fechas y se pintan como no disponibles en el calendario de reserva.
export async function getAvailabilityBlocks(listingId) {
  return apiFetch(`/listings/${listingId}/availability-blocks`);
}
export async function createAvailabilityBlock(listingId, { startDate, endDate, reason }) {
  return apiFetch(`/listings/${listingId}/availability-blocks`, {
    method: "POST",
    body: JSON.stringify({ startDate, endDate, ...(reason ? { reason } : {}) }),
  });
}
export async function deleteAvailabilityBlock(listingId, blockId) {
  return apiFetch(`/listings/${listingId}/availability-blocks/${blockId}`, { method: "DELETE" });
}

// ── FAVORITOS ──────────────────────────────────────────────────
// Se guardan en la base, así que los favoritos siguen estando al entrar desde
// otro dispositivo.
export async function getMyFavorites() { return apiFetch("/favorites/me"); }
export async function getMyFavoriteIds() { return apiFetch("/favorites/me/ids"); }
export async function addFavorite(listingId) {
  return apiFetch("/favorites", { method: "POST", body: JSON.stringify({ listingId }) });
}
export async function removeFavorite(listingId) {
  return apiFetch(`/favorites/${listingId}`, { method: "DELETE" });
}

// ── VERIFICACIÓN DE LA CUENTA (KYC) ────────────────────────────
// Para publicar o reservar, el backend exige la cuenta VERIFICADA: email +
// teléfono + DNI y licencia. getVerificationStatus() devuelve el checklist con
// lo que falta.
// Cuánto se espera cada ruta de verificación antes de cortar. Los números no son
// redondeos de escritorio: leer el estado es una consulta y tiene que ser
// inmediata, mientras que enviar los documentos CORRE LA REVISIÓN ENTERA adentro
// del pedido (lee el código de barras del DNI, el MRZ del dorso, el QR de la
// licencia y cruza todo contra la cuenta), y eso tarda entre 5 y 50 segundos.
// Con el tope de 10 segundos que se usa en el resto de la app, cada envío se
// cortaba solo justo cuando estaba por contestar.
const ESPERA_CONSULTA = 10_000;
export const ESPERA_REVISION = 70_000;

export async function getVerificationStatus() {
  return apiFetch("/verification/me/status", { timeoutMs: ESPERA_CONSULTA });
}
export async function requestPhoneCode() {
  return apiFetch("/verification/phone/request", { method: "POST" });
}
export async function confirmPhoneCode(code) {
  return apiFetch("/verification/phone/confirm", { method: "POST", body: JSON.stringify({ code }) });
}
/**
 * Mis propios envíos de documentación, del más nuevo al más viejo, con las fotos
 * y los datos que la IA leyó de ellas.
 *
 * Solo devuelve lo de la cuenta que hace el pedido: nadie puede ver el DNI de otra
 * persona por esta vía (para eso está el panel admin, y nada más).
 */
export async function getMyIdentity() {
  return apiFetch("/verification/identity/me");
}

/**
 * Envía las 4 fotos (ya subidas a Cloudinary) para validar la identidad.
 *
 * El pedido no "encola" nada: la revisión entera corre acá adentro y la respuesta
 * ya trae el veredicto (VERIFIED / REJECTED / ID_SUBMITTED). Por eso el tope es
 * de 70 segundos y no de 10.
 *
 * Se mandan SOLO las cuatro URLs. El backend valida el cuerpo con lista blanca y
 * rechaza con 400 cualquier propiedad que no esté en el contrato, así que sumar
 * un campo "por las dudas" rompe el envío.
 */
export async function submitIdentity({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl }) {
  return apiFetch("/verification/identity/submit", {
    method: "POST",
    timeoutMs: ESPERA_REVISION,
    body: JSON.stringify({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl }),
  });
}

/**
 * Firma para subir UNA foto de identidad concreta.
 *
 * `document` es "dni" | "license" | "selfie" y `side` es "front" | "back" (la
 * selfie no lleva lado). El servidor decide la carpeta, el nombre del archivo y
 * que el asset quede PRIVADO: el navegador no elige nada de eso.
 *
 * POR QUÉ EXISTE: el backend ya no acepta una URL cualquiera de Cloudinary. Al
 * enviar los documentos comprueba que cada archivo esté en `identity/<tu-id>/` y
 * que el nombre empiece con el slot que le corresponde. Así es imposible mandar
 * el dorso donde va el frente, o un archivo de otra cuenta. Con la firma
 * genérica de antes (carpeta `freewheel`) el envío ahora falla con
 * DOCUMENT_SLOT_MISMATCH.
 */
export async function getIdentityUploadSignature({ document, side }) {
  return apiFetch("/verification/identity/upload-signature", {
    method: "POST",
    timeoutMs: ESPERA_CONSULTA,
    body: JSON.stringify(side ? { document, side } : { document }),
  });
}

/**
 * Vuelve a correr la revisión de la última solicitud pendiente, sin volver a
 * subir las fotos. Sirve cuando la revisión no pudo decidir (un timeout del
 * proveedor) o después de corregir el DNI, el CUIL o el domicilio.
 */
export async function retryIdentityReview() {
  // Vuelve a correr la revisión completa, igual que el envío: mismo tope.
  return apiFetch("/verification/identity/review-retry", {
    method: "POST",
    timeoutMs: ESPERA_REVISION,
  });
}

/**
 * Revisa una foto de documento ANTES de subirla, para avisar en el momento si no
 * corresponde. `kind` es DNI_FRONT, DNI_BACK, LICENSE_FRONT o LICENSE_BACK.
 * Devuelve { matches, reason }: matches en null significa que no se pudo revisar.
 *
 * Las pantallas NO deberían llamar a esto directo, sino a checkDocument() de
 * services/groq.js, que además achica la foto (si no, el backend la rechaza por
 * peso) y tiene el respaldo por si la IA no está configurada en el servidor.
 *
 * ESTA SE QUEDA EN EL BACKEND PRINCIPAL, a diferencia del chat, la foto del auto
 * y las notas de voz, que se mudaron al servicio propio. El DNI y la licencia
 * son datos de identidad: los guarda, los coteja contra lo declarado y los
 * muestra al administrador el backend que tiene las cuentas. Partir eso en dos
 * servidores sería mandar documentos a un lugar que no los necesita.
 */
export async function aiDocument(image, kind) {
  return postConIdioma("/ai/document", { image, kind });
}
export async function updateListing(id, data) {
  return apiFetch(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteListing(id) {
  return apiFetch(`/listings/${id}`, { method: "DELETE" });
}

/**
 * Guarda el orden de las fotos de una publicación, para todo el mundo.
 *
 * Se manda la lista de URLs en el orden nuevo y el backend le pone a cada foto
 * el número de posición que le toca. Va la lista entera y no "moví la 3 a la 1"
 * porque el que mira puede haber reordenado varias veces antes de guardar, y
 * porque una lista completa deja el resultado igual sin importar cuántas veces
 * se reintente.
 *
 * OJO: esta ruta es nueva. Mientras el backend desplegado no la tenga, contesta
 * 404 (o 405), y quien llama TIENE que volver atrás lo que mostró en pantalla:
 * dejar las fotos dadas vuelta y no avisar sería la peor versión de las dos,
 * porque el dueño se va convencido de que el orden quedó guardado.
 */
export async function reorderListingPhotos(id, urls) {
  return apiFetch(`/listings/${id}/photos`, {
    method: "PATCH",
    body: JSON.stringify({ photos: urls }),
  });
}

// ── MEDIA ──────────────────────────────────────────────────────
// Registra en el backend una foto/archivo ya subido (p. ej. a Cloudinary).
export async function createMediaAsset(data) {
  return apiFetch("/media/assets", { method: "POST", body: JSON.stringify(data) });
}

// Pide al backend la firma para subir a Cloudinary. El secreto de Cloudinary vive
// solo en el servidor: el navegador recibe una firma temporal y sube con ella.
export async function getCloudinarySignature(folder = "freewheel") {
  return apiFetch("/media/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify({ folder }),
  });
}

// ── INTELIGENCIA ARTIFICIAL (proxy del backend) ────────────────
/**
 * ¿Este backend entiende el campo `lang`?
 *
 * El motivo por el que una foto no sirve lo escribe la IA y la persona lo LEE,
 * así que se le manda el idioma elegido. Pero el backend valida los pedidos con
 * `forbidNonWhitelisted`: un backend que todavía no conoce `lang` NO lo ignora,
 * responde 400 y la revisión de la foto no se hace.
 *
 * Y el front y el backend se despliegan por separado, así que hay un rato en el
 * que el front nuevo le habla a un backend viejo. Sin esto, en ese rato ninguna
 * foto se revisa (pasó: "0 verificadas, 4 sin revisar" y cinco 400 en la consola).
 *
 * Entonces: se prueba una vez CON idioma; si el backend lo rechaza por ese
 * campo, se recuerda y se reintenta sin él —y no se vuelve a mandar en toda la
 * sesión—. La revisión funciona igual; lo único que se pierde es que el motivo
 * venga traducido, y para eso el front tiene sus propios textos de respaldo.
 */
let backendEntiendeIdioma = true;

/** ¿Este 400 es por el campo `lang` y no por la foto? */
const rechazaElIdioma = (err) =>
  err?.status === 400 && /\blang\b/i.test(String(err?.message ?? ""));

async function postConIdioma(path, payload, base) {
  if (backendEntiendeIdioma) {
    try {
      return await apiFetch(path, {
        base,
        method: "POST",
        body: JSON.stringify({ ...payload, lang: idiomaInicial() }),
      });
    } catch (err) {
      if (!rechazaElIdioma(err)) throw err;
      backendEntiendeIdioma = false;
    }
  }
  return apiFetch(path, { base, method: "POST", body: JSON.stringify(payload) });
}

// ── A QUÉ SERVIDOR LE HABLA CADA COSA ──────────────────────────
/**
 * ¿El servicio de IA propio está publicado y contesta?
 *
 *   null  → todavía no se probó
 *   true  → contesta, se usa siempre
 *   false → no está, se usa el backend de siempre y no se vuelve a intentar
 *
 * Existe para que el front nuevo no se rompa mientras el servicio todavía no
 * está desplegado, y para no pagar el viaje de ida y vuelta en cada llamada una
 * vez que se sabe que no está. Sin esto, subir esta versión antes de publicar el
 * servicio dejaría el asistente mudo hasta que las dos partes estuvieran
 * arriba; con esto, el orden en que se suban no importa.
 */
let servicioPropio = IA_URL ? null : false;

/**
 * ¿Este error significa "el servicio no está ahí" y no "el servicio falló"?
 *
 * Solo con estos se pasa al backend viejo. Un 502 o un 503 del servicio propio
 * son problemas SUYOS —falta la clave, Groq no contesta— y hay que mostrarlos
 * tal cual: taparlos yendo al otro servidor es esconder justamente lo que hay
 * que arreglar, y volveríamos a no saber por qué la IA no anda.
 */
const noEstaPublicado = (err) =>
  err?.status === 0 || err?.status === 403 || err?.status === 404 || err?.status === 405;

/** Llama al servicio propio y, si no está, repite contra el backend de siempre. */
async function conServicioDeIa(llamar) {
  if (servicioPropio !== false) {
    try {
      const data = await llamar(IA_URL);
      servicioPropio = true;
      return data;
    } catch (err) {
      if (servicioPropio === true || !noEstaPublicado(err)) throw err;
      servicioPropio = false;
    }
  }
  return llamar(undefined);
}

// La clave de la IA vive únicamente en el servidor: el navegador le pide al
// backend y el backend habla con el proveedor. Antes el front llamaba a la API
// de IA directo con la clave incluida en el bundle, a la vista de cualquiera.
/**
 * `json: true` obliga al modelo a contestar un objeto JSON y nada más.
 *
 * Lo usan las dos llamadas cuya respuesta no se muestra sino que se LEE: las
 * especificaciones del auto y el precio sugerido. Sin eso, los modelos que
 * razonan antes de contestar escriben el razonamiento primero y del otro lado no
 * se podía interpretar nada. El chat de Wili no lo usa: ahí la respuesta es
 * texto para leer, y obligarlo a JSON sería absurdo.
 */
export async function aiChat(messages, temperature, { json } = {}) {
  return conServicioDeIa((base) => apiFetch("/ai/chat", {
    base,
    method: "POST",
    body: JSON.stringify({
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(json ? { json: true } : {}),
    }),
  }));
}
export async function aiVision(imageDataUrl) {
  return conServicioDeIa((base) => postConIdioma("/ai/vision", { imageDataUrl }, base));
}
export async function aiTranscribe(audioUrl) {
  return conServicioDeIa((base) => apiFetch("/ai/transcribe", {
    base,
    method: "POST",
    body: JSON.stringify({ audioUrl }),
  }));
}

// ── RESEÑAS ────────────────────────────────────────────────────
// Solo se puede reseñar una reserva COMPLETADA y PAGADA: es lo que hace que las
// puntuaciones signifiquen algo. El promedio lo calcula y lo guarda el backend.
export async function getListingReviews(listingId) {
  return apiFetch(`/listings/${listingId}/reviews`);
}
export async function getUserReviews(userId) {
  return apiFetch(`/users/${userId}/reviews`);
}
/**
 * Reputación de una persona separada por rol: cómo la calificaron como conductor
 * y cómo como dueño. Son dos cosas distintas y no conviene mezclarlas.
 */
export async function getUserReputation(userId) {
  return apiFetch(`/users/${userId}/reputation`);
}

/** Perfil público de otra persona (nombre, foto, promedio, antigüedad). */
export async function getPublicProfile(userId) {
  return apiFetch(`/users/${userId}`);
}

/** Qué reservas propias se pueden reseñar y cuáles ya se reseñaron. */
export async function getMyPendingReviews() {
  return apiFetch("/reviews/me/pending");
}
/**
 * Deja la reseña de una reserva terminada.
 *
 * `tags` son las CARACTERÍSTICAS elegidas (RESPONDE_RAPIDO, AUTO_SUCIO…), que
 * es lo que después se puede contar en el perfil: "contesta rápido, 18 veces".
 * Van solo si hay alguna; el campo es opcional del lado del servidor, y mandar
 * una lista vacía a un backend que todavía no lo conozca sería pedirle que
 * valide un campo que no tiene.
 */
export async function createReview(bookingId, { rating, comment, tags }) {
  const elegidas = Array.isArray(tags) ? tags.filter(Boolean) : [];
  return apiFetch(`/bookings/${bookingId}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      rating,
      ...(comment ? { comment } : {}),
      ...(elegidas.length ? { tags: elegidas } : {}),
    }),
  });
}

// ── REPORTES ───────────────────────────────────────────────────
// Antes el botón "Reportar" guardaba el texto en el navegador de quien reportaba
// y nadie lo veía nunca. Ahora va al backend, lo lee la IA para decir si tiene
// relación con la publicación, y le llega a las cuentas administradoras.
// `evidenceUrls` son las fotos que ya se subieron a Cloudinary y que sirven de
// PRUEBA: el backend rechaza el reporte si viene vacío, porque un reporte sin
// evidencia deja al admin sin nada con que decidir.
export async function createReport({
  targetType, listingId, targetUserId, reason, details, evidenceUrls = [],
}) {
  return apiFetch("/reports", {
    method: "POST",
    body: JSON.stringify({
      targetType,
      ...(listingId ? { listingId } : {}),
      ...(targetUserId ? { targetUserId } : {}),
      reason,
      details,
      evidenceUrls,
    }),
  });
}
export async function getMyReports() {
  return apiFetch("/reports/me");
}
export async function getAdminReports(status) {
  return apiFetch(`/admin/reports${status ? `?status=${status}` : ""}`);
}
export async function resolveReport(reportId, action, note) {
  return apiFetch(`/admin/reports/${reportId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ action, ...(note ? { note } : {}) }),
  });
}

// ── CAMBIO DE PRECIO ───────────────────────────────────────────
// El precio es el único dato que mueve plata sin que intervenga nadie más, así
// que no se cambia con un PATCH: hace falta confirmar con el código que llega por
// email, no puede haber reservas en curso y hay una espera entre cambios.
export async function getPriceChangeStatus(listingId) {
  return apiFetch(`/listings/${listingId}/price-change`);
}
export async function requestPriceChange(listingId, pricePerDay) {
  return apiFetch(`/listings/${listingId}/price-change`, {
    method: "POST",
    body: JSON.stringify({ pricePerDay }),
  });
}
export async function confirmPriceChange(listingId, code) {
  return apiFetch(`/listings/${listingId}/price-change/confirm`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
export async function cancelPriceChange(listingId) {
  return apiFetch(`/listings/${listingId}/price-change`, { method: "DELETE" });
}

// ── RESERVAS (BOOKINGS) ────────────────────────────────────────
// Ciclo de vida de una reserva: el inquilino la crea (createBooking) y el
// dueño la acepta/rechaza; cualquiera puede cancelarla.
export async function createBooking({ listingId, startDate, endDate }) {
  return apiFetch("/bookings", {
    method: "POST",
    body: JSON.stringify({ listingId, startDate, endDate }),
  });
}
export async function getMyBookings() { return apiFetch("/bookings/me"); }
export async function getBookingById(id) { return apiFetch(`/bookings/${id}`); }
export async function cancelBooking(id, reason) {
  return apiFetch(`/bookings/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
export async function acceptBooking(id) {
  return apiFetch(`/bookings/${id}/accept`, { method: "PATCH" });
}
export async function rejectBooking(id) {
  return apiFetch(`/bookings/${id}/reject`, { method: "PATCH" });
}

// ── ENTREGA Y DEVOLUCIÓN DEL AUTO ──────────────────────────────
// El circuito completo entre los dos usuarios, después del pago:
//   1) el dueño marca la reserva "lista para retiro" (readyForPickup)
//   2) el inquilino muestra su token/QR de retiro y el DUEÑO lo confirma
//   3) al devolver, el dueño muestra el token de devolución y el INQUILINO lo
//      confirma, con lo que la reserva queda completada.
// getBookingTokens() devuelve, para cada uno, solo el token que le toca ver.
export async function markReadyForPickup(id) {
  return apiFetch(`/bookings/${id}/ready-for-pickup`, { method: "PATCH" });
}
export async function getBookingTokens(id) { return apiFetch(`/bookings/${id}/tokens`); }
export async function confirmPickup(id, token) {
  return apiFetch(`/bookings/${id}/confirm-pickup`, { method: "POST", body: JSON.stringify({ token }) });
}
export async function confirmReturn(id, token) {
  return apiFetch(`/bookings/${id}/confirm-return`, { method: "POST", body: JSON.stringify({ token }) });
}

// ── PAGOS ──────────────────────────────────────────────────────
// El pago está partido en tres tramos, como en cualquier alquiler real:
// la seña, el saldo y el depósito de garantía (que se retiene y se libera).
// mockConfirmPayment() completa los tres de una sola vez: existe para la demo y
// solo funciona con PAYMENTS_PROVIDER=mock en el backend.
export async function createSenaIntent(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/sena-intent`, { method: "POST" });
}
export async function createBalanceIntent(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/balance-intent`, { method: "POST" });
}
export async function createDepositHold(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/deposit-hold`, { method: "POST" });
}
export async function mockConfirmPayment(bookingId, kind) {
  return apiFetch(`/payments/bookings/${bookingId}/mock-confirm`, {
    method: "POST",
    body: JSON.stringify(kind ? { kind } : {}),
  });
}
export async function mockFailPayment(bookingId, kind) {
  return apiFetch(`/payments/bookings/${bookingId}/mock-fail`, {
    method: "POST",
    body: JSON.stringify(kind ? { kind } : {}),
  });
}
export async function getBookingPaymentStatus(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/status`);
}

// ── CONTRATO DIGITAL ───────────────────────────────────────────
// Al aceptarse la reserva queda un contrato con los montos congelados, que
// ambas partes aceptan y se puede descargar en PDF.
export async function getBookingContract(bookingId) {
  return apiFetch(`/contracts/bookings/${bookingId}`);
}
export async function acceptBookingContract(bookingId) {
  return apiFetch(`/contracts/bookings/${bookingId}/accept`, { method: "POST" });
}
export function getBookingContractPdfUrl(bookingId) {
  return `${BASE_URL}/contracts/bookings/${bookingId}/pdf`;
}

// ── CONVERSACIONES / CHAT ──────────────────────────────────────
// Mensajería entre inquilino y dueño sobre una publicación. Se abre una
// conversación por listing, se leen/mandan mensajes y se marca como leída.
export async function startConversation(listingId) {
  return apiFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({ listingId }),
  });
}
export async function getMyConversations() { return apiFetch("/conversations/me"); }
export async function getConversation(id) { return apiFetch(`/conversations/${id}`); }
export async function getConversationMessages(id) {
  return apiFetch(`/conversations/${id}/messages`);
}
export async function sendMessage(id, data) {
  return apiFetch(`/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function markConversationRead(id) {
  return apiFetch(`/conversations/${id}/read`, { method: "PATCH" });
}

// ── ADMINISTRACIÓN ─────────────────────────────────────────────
// Solo para usuarios con rol admin. Permiten moderar la plataforma:
// aprobar/rechazar publicaciones y cambiar estado/rol de los usuarios.
export async function adminGetListings() { return apiFetch("/admin/listings"); }
export async function adminGetUsers() { return apiFetch("/admin/users"); }

/**
 * Qué puede hacer ESTE backend con las cuentas.
 *
 * Devuelve { hardDeleteAccounts, hardDeleteDisabledReason }. Sirve para una
 * sola cosa: saber si el botón de BORRAR DEFINITIVAMENTE tiene que existir.
 *
 * POR QUÉ SE PREGUNTA Y NO SE ADIVINA. La tentación es escribir "si esto es
 * producción, escondelo". Está mal por los dos lados: un backend de
 * demostración puede tener el borrado prendido a propósito, y el front no
 * tiene forma de saber contra qué servidor está hablando (VITE_API_URL lo
 * cambia sin recompilar). El que sabe es el servidor; se le pregunta.
 */
export async function adminGetSettings() { return apiFetch("/admin/settings"); }

/**
 * Borra una cuenta DE VERDAD, y todo lo suyo: autos, publicaciones, reservas,
 * chats, reseñas, documentos y los archivos en Cloudinary.
 *
 * NO ES LO MISMO QUE SUSPENDERLA, y la diferencia no es de intensidad: es qué
 * pasa con el email. Una cuenta suspendida sigue existiendo, así que su email,
 * su teléfono y su documento QUEDAN TOMADOS y esa persona no puede volver a
 * registrarse con ellos. Una cuenta borrada deja de existir y esos datos quedan
 * LIBRES: al día siguiente se registra de nuevo con el mismo DNI.
 *
 * Por eso el castigo es suspender, no borrar. Borrar existe para reciclar las
 * cuentas de prueba, y el backend lo tiene apagado en producción (403 con
 * code ACCOUNT_HARD_DELETE_DISABLED).
 *
 * Devuelve { deleted, user, freed: { email, phone }, removed: { listings,
 * vehicles, bookings, mediaFiles, mediaFilesFailed } }.
 */
export async function adminDeleteUser(id) {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}
export async function adminUpdateListingStatus(id, status) {
  return apiFetch(`/admin/listings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
export async function adminUpdateUserStatus(id, status) {
  return apiFetch(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
export async function adminUpdateUserRole(id, role) {
  return apiFetch(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// Solicitudes de verificación de identidad, con las fotos del DNI y la licencia y
// los datos que la IA leyó de ellas. Son las únicas dos puertas por las que se ven
// esas fotos: acá (cuentas admin) y GET /verification/identity/me (el propio
// dueño). No aparecen en el perfil público de nadie.
export async function adminGetVerifications() { return apiFetch("/admin/verifications"); }

/**
 * Las fotos de UNA solicitud, con URLs firmadas al momento.
 *
 * POR QUÉ HACE FALTA: las fotos de identidad pasaron a ser archivos PRIVADOS en
 * Cloudinary. La URL que viene guardada en la solicitud ya no se puede abrir
 * —Cloudinary contesta 401— así que el visor mostraba las cuatro fotos rotas.
 * Este endpoint devuelve URLs firmadas que caducan, y del lado del servidor deja
 * registrado quién las miró, porque son datos personales sensibles.
 */
export async function adminGetVerificationDocuments(id) {
  return apiFetch(`/admin/verifications/${id}/documents`);
}
export async function adminReviewVerification(id, status, notes) {
  return apiFetch(`/admin/verifications/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
  });
}

// Estado de la revisión por IA: si falta la clave, qué contestó el proveedor la
// última vez y qué modelos hay disponibles. Sirve para saber por qué dejó de
// funcionar la verificación de documentos sin entrar a los logs del deploy.
export async function getAiHealth() { return apiFetch("/ai/health"); }
/**
 * Igual que getAiHealth() pero además PRUEBA cada modelo de visión con una imagen
 * mínima y dice cuál contesta. Sirve para saber qué poner en GROQ_VISION_MODEL:
 * un modelo puede estar en la lista de Groq y contestar 401 o 429 igual.
 * Consume cuota de la clave, así que se pide a mano desde el panel, no solo.
 */
export async function probeAiModels() { return apiFetch("/ai/health?probe=1"); }