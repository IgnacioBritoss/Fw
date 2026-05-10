const BASE_URL = "https://freewheel-2pty.onrender.com";

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
    let errorMessage = `Error ${res.status}`;
    try { const data = await res.json(); errorMessage = data.message || errorMessage; } catch { }
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
export async function getListings() { return apiFetch("/listings"); }
export async function getMyListings() { return apiFetch("/listings/me"); }
export async function getListingById(id) { return apiFetch(`/listings/${id}`); }
export async function updateListing(id, data) {
  return apiFetch(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteListing(id) {
  return apiFetch(`/listings/${id}`, { method: "DELETE" });
}