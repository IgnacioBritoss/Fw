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

// Dirección base del backend (está desplegado en Vercel).
const BASE_URL = "https://free-wheel-back.vercel.app";

// URL a la que se redirige al usuario para iniciar sesión con Google (OAuth).
export const GOOGLE_AUTH_URL = `${BASE_URL}/auth/google`;

// Devuelve el token de sesión (JWT) guardado en el navegador, o null si no hay.
// El token viaja en cada pedido para que el backend sepa quién está pidiendo.
function getToken() {
  const user = localStorage.getItem("fw_user");
  if (!user) return null;
  try { return JSON.parse(user).accessToken || null; } catch { return null; }
}

// Función central: hace un pedido HTTP al backend y devuelve la respuesta en JSON.
// - Agrega automáticamente el token de sesión en la cabecera Authorization.
// - Si el backend responde 401 (sesión vencida/inválida), cierra la sesión y
//   manda al login.
// - Si hay otro error, lanza una excepción con el mensaje del backend para que
//   la pantalla que llamó pueda mostrarlo.
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("fw_user");
      window.location.href = "/login";
      return;
    }
    let errorMessage = `Error ${res.status}`;
    try { const data = await res.json(); errorMessage = data.message || errorMessage; } catch {}
    const err = new Error(errorMessage);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── AUTENTICACIÓN ──────────────────────────────────────────────
// Registro, login, verificación de email y recuperación de contraseña.

// Crea una cuenta nueva. Devuelve el usuario y el token de sesión.
export async function registerUser({ email, password, firstName, lastName, acceptedTerms }) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, firstName, lastName, acceptedTerms }),
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
export async function getListings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ""}`);
}
export async function getMyListings() { return apiFetch("/listings/me"); }
export async function getListingById(id) { return apiFetch(`/listings/${id}`); }
export async function getListingAvailability(listingId, from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch(`/listings/${listingId}/availability${qs ? `?${qs}` : ""}`);
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
export async function cancelBooking(id) {
  return apiFetch(`/bookings/${id}/cancel`, { method: "PATCH" });
}
export async function acceptBooking(id) {
  return apiFetch(`/bookings/${id}/accept`, { method: "PATCH" });
}
export async function rejectBooking(id) {
  return apiFetch(`/bookings/${id}/reject`, { method: "PATCH" });
}

// ── PAGOS (SIMULADOS) ──────────────────────────────────────────
// El pago es "mock" (de mentira, para la demo): se crea una intención de pago,
// y luego se confirma o se falla a mano. No hay tarjeta real involucrada.
export async function createMockPaymentIntent(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/mock-intent`, { method: "POST" });
}
export async function confirmMockPayment(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/mock-confirm`, { method: "POST" });
}
export async function failMockPayment(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/mock-fail`, { method: "POST" });
}
export async function getBookingPaymentStatus(bookingId) {
  return apiFetch(`/payments/bookings/${bookingId}/status`);
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