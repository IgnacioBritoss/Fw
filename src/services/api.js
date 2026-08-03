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
const BASE_URL = import.meta.env.VITE_API_URL || "https://free-wheel-back.vercel.app";

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
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // Falló la red (sin internet, backend caído): mensaje claro en vez de
    // "Failed to fetch", que no le dice nada al usuario.
    const err = new Error("No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.");
    err.status = 0;
    throw err;
  }

  if (!res.ok) {
    let payload = null;
    try { payload = await res.json(); } catch { /* la respuesta puede no ser JSON */ }
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" · ")            // errores de validación del backend
      : payload?.message || `Error ${res.status}`;

    // Sesión vencida o token inválido en una ruta que requiere estar logueado.
    if (res.status === 401 && !isAuthRoute(path)) {
      localStorage.removeItem("fw_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
    }

    const err = new Error(message);
    err.status = res.status;
    err.code = payload?.code;                  // ej: ACCOUNT_NOT_VERIFIED
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
// Pide cambiar el email de la cuenta (dispara un código de confirmación).
export async function requestEmailChange(newEmail) {
  return apiFetch("/auth/request-email-change", {
    method: "POST",
    body: JSON.stringify({ newEmail }),
  });
}
// Confirma el cambio de email con el código recibido.
export async function confirmEmailChange(code, newEmail) {
  return apiFetch("/auth/confirm-email-change", {
    method: "POST",
    body: JSON.stringify({ code, newEmail }),
  });
}

// ── USUARIOS ───────────────────────────────────────────────────
// getMe(): trae los datos del usuario logueado. updateMe(): edita el perfil.
export async function getMe() { return apiFetch("/users/me"); }
export async function updateMe({ firstName, lastName, phone }) {
  return apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ firstName, lastName, phone }) });
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
export async function getVerificationStatus() { return apiFetch("/verification/me/status"); }
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

// Envía las 4 fotos (ya subidas a Cloudinary) para validar la identidad.
export async function submitIdentity({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl }) {
  return apiFetch("/verification/identity/submit", {
    method: "POST",
    body: JSON.stringify({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl }),
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
 */
export async function aiDocument(image, kind) {
  return apiFetch("/ai/document", { method: "POST", body: JSON.stringify({ image, kind }) });
}
export async function updateListing(id, data) {
  return apiFetch(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteListing(id) {
  return apiFetch(`/listings/${id}`, { method: "DELETE" });
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
// La clave de la IA vive únicamente en el servidor: el navegador le pide al
// backend y el backend habla con el proveedor. Antes el front llamaba a la API
// de IA directo con la clave incluida en el bundle, a la vista de cualquiera.
export async function aiChat(messages, temperature) {
  return apiFetch("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, ...(temperature !== undefined ? { temperature } : {}) }),
  });
}
export async function aiVision(imageDataUrl) {
  return apiFetch("/ai/vision", { method: "POST", body: JSON.stringify({ imageDataUrl }) });
}
export async function aiTranscribe(audioUrl) {
  return apiFetch("/ai/transcribe", { method: "POST", body: JSON.stringify({ audioUrl }) });
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
export async function createReview(bookingId, { rating, comment }) {
  return apiFetch(`/bookings/${bookingId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, ...(comment ? { comment } : {}) }),
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