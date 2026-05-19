const BASE_URL = "https://free-wheel-back.vercel.app";

export const GOOGLE_AUTH_URL = `${BASE_URL}/auth/google`;

function getToken() {
  const user = localStorage.getItem("fw_user");
  if (!user) return null;
  try { return JSON.parse(user).accessToken || null; } catch { return null; }
}

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

// Auth
export async function registerUser({ email, password, firstName, lastName, acceptedTerms }) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, firstName, lastName, acceptedTerms }),
  });
}
export async function loginUser({ email, password }) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
export async function verifyEmail({ code }) {
  return apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ code }) });
}
export async function resendVerification() {
  return apiFetch("/auth/resend-verification", { method: "POST" });
}
export async function forgotPassword({ email }) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}
export async function resetPassword({ token, userId, newPassword }) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, userId, newPassword }),
  });
}
export async function requestEmailChange(newEmail) {
  return apiFetch("/auth/request-email-change", {
    method: "POST",
    body: JSON.stringify({ newEmail }),
  });
}
export async function confirmEmailChange(code, newEmail) {
  return apiFetch("/auth/confirm-email-change", {
    method: "POST",
    body: JSON.stringify({ code, newEmail }),
  });
}

// Users
export async function getMe() { return apiFetch("/users/me"); }
export async function updateMe({ firstName, lastName, phone }) {
  return apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ firstName, lastName, phone }) });
}

// Vehicles
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

// Listings
export async function createListing(data) {
  return apiFetch("/listings", { method: "POST", body: JSON.stringify(data) });
}
export async function getListings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ""}`);
}
export async function getMyListings() { return apiFetch("/listings/me"); }
export async function getListingById(id) { return apiFetch(`/listings/${id}`); }
export async function updateListing(id, data) {
  return apiFetch(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteListing(id) {
  return apiFetch(`/listings/${id}`, { method: "DELETE" });
}

// Media
export async function createMediaAsset(data) {
  return apiFetch("/media/assets", { method: "POST", body: JSON.stringify(data) });
}

// Conversations
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

// Admin
export async function adminGetListings() { return apiFetch("/admin/listings"); }
export async function adminDeleteListing(id) {
  return apiFetch(`/admin/listings/${id}`, { method: "DELETE" });
}
export async function adminGetUsers() { return apiFetch("/admin/users"); }
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
export async function adminDeleteUser(id) {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}