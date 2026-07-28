// ============================================================================
//  AuthContext.jsx — Manejo GLOBAL de la SESIÓN del usuario
// ----------------------------------------------------------------------------
//  Un "Context" de React es una caja compartida a la que cualquier componente
//  puede acceder sin pasar datos por props. Acá guardamos QUIÉN está logueado
//  y todas las acciones relacionadas con la cuenta (login, registro, logout,
//  verificación, recuperar contraseña, etc.).
//
//  Cualquier pantalla puede usar `const { user, logout } = useAuth();`.
//
//  DOS TIPOS DE TOKEN
//  El backend puede devolver dos cosas distintas al iniciar sesión:
//   - accessToken:     sesión completa, sirve para toda la app.
//   - onboardingToken: sesión a medias, solo válida para terminar el alta
//                      (verificar el email o cargar la fecha de nacimiento).
//  Guardar el segundo como si fuera el primero era lo que rompía el login con
//  Google: la app pedía /users/me con un token que esa ruta rechaza, recibía 401
//  y se cerraba la sesión sola.
//
//  La sesión se guarda en localStorage (clave "fw_user") para que siga activa
//  aunque se recargue la página.
// ============================================================================
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import {
  loginUser, registerStart, registerComplete, getMe,
  verifyEmail as apiVerifyEmail,
  resendVerification as apiResendVerification,
  completeProfile as apiCompleteProfile,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  getVerificationStatus,
} from "../services/api";
import { initMockCars } from "../data/mockData";

const AuthContext = createContext(null);
const STORAGE_KEY = "fw_user";

// Nombre visible: el que eligió el usuario, o nombre + apellido, o el email.
function displayNameOf(user = {}) {
  return user.displayName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "";
}

/** Sesión guardada en el navegador, o null si no hay (o está corrupta). */
function loadStoredUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// Provider: envuelve a toda la app (ver App.jsx) y "provee" la sesión.
export function AuthProvider({ children }) {
  // La sesión se lee del navegador en el primer render (no en un efecto), así la
  // app nunca aparece "deslogueada" por un instante al recargar la página.
  const [user, setUser] = useState(loadStoredUser);
  const [loading] = useState(false);

  // Deja los autos de ejemplo disponibles para las pantallas que los usan.
  useEffect(() => { initMockCars(); }, []);

  // Guarda el usuario en memoria y en localStorage (persistencia de la sesión).
  const saveUser = useCallback((userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  // Cierra la sesión: borra el usuario de memoria y de localStorage.
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  /**
   * Traduce la respuesta del backend a un resultado que las pantallas entienden.
   * Puede ser una sesión completa, o un alta a medio terminar que necesita un
   * paso más (verificar email / cargar fecha de nacimiento).
   */
  const applyAuthResponse = useCallback((data) => {
    if (!data) return { success: false, error: "El servidor no devolvió una respuesta válida." };

    // Alta incompleta: se guarda el token de onboarding aparte, nunca como
    // accessToken, y se le dice a la pantalla a dónde tiene que ir.
    if (data.onboardingToken) {
      saveUser({
        ...data.user,
        name: displayNameOf(data.user || {}),
        onboardingToken: data.onboardingToken,
        accessToken: null,
      });
      return {
        success: true,
        pending: data.emailVerificationRequired ? "verify_email" : "complete_profile",
        emailVerificationRequired: !!data.emailVerificationRequired,
        profileCompletionRequired: !!data.profileCompletionRequired,
      };
    }

    if (!data.accessToken) {
      return { success: false, error: "No pudimos abrir la sesión. Intentá de nuevo." };
    }

    saveUser({
      ...data.user,
      name: displayNameOf(data.user || {}),
      accessToken: data.accessToken,
      onboardingToken: null,
    });
    return { success: true, pending: null };
  }, [saveUser]);

  // ── Inicio de sesión ────────────────────────────────────────────────────
  const loginWithCredentials = useCallback(async (email, password) => {
    try {
      return applyAuthResponse(await loginUser({ email, password }));
    } catch (err) {
      return { success: false, error: err.message || "Email o contraseña incorrectos." };
    }
  }, [applyAuthResponse]);

  // ── Registro: paso 1 (pedir el código al email) ─────────────────────────
  const startRegistration = useCallback(async (email) => {
    try {
      await registerStart({ email });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "No pudimos enviar el código." };
    }
  }, []);

  // ── Registro: paso 2 (crear la cuenta con el código) ────────────────────
  // La cuenta nace con el email ya verificado, así que acá queda la sesión abierta.
  const completeRegistration = useCallback(async (form) => {
    try {
      return applyAuthResponse(await registerComplete(form));
    } catch (err) {
      return { success: false, error: err.message || "No pudimos crear la cuenta." };
    }
  }, [applyAuthResponse]);

  // ── Login con Google ────────────────────────────────────────────────────
  // Google no da la fecha de nacimiento, así que muchas veces el backend
  // devuelve solo un token de onboarding: en ese caso hay que completar el
  // perfil antes de tener sesión completa (por eso `pending`).
  const loginWithGoogleToken = useCallback(async (token, pending) => {
    if (pending === "complete_profile") {
      saveUser({ onboardingToken: token, accessToken: null, name: "" });
      return { success: true, pending: "complete_profile" };
    }
    try {
      saveUser({ accessToken: token });
      const fresh = await getMe();
      saveUser({ ...fresh, name: displayNameOf(fresh), accessToken: token, onboardingToken: null });
      return { success: true, pending: null };
    } catch (err) {
      logout();
      return { success: false, error: err.message || "Error al iniciar sesión con Google." };
    }
  }, [saveUser, logout]);

  // ── Verificación del email (cuentas viejas y de Google) ─────────────────
  const verifyEmail = useCallback(async (code) => {
    try {
      return applyAuthResponse(await apiVerifyEmail({ code }));
    } catch (err) {
      return { success: false, error: err.message || "Código incorrecto." };
    }
  }, [applyAuthResponse]);

  const resendVerification = useCallback(async () => {
    try {
      await apiResendVerification();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // ── Fecha de nacimiento faltante (obligatoria, +18) ─────────────────────
  const completeProfile = useCallback(async (dateOfBirth) => {
    try {
      return applyAuthResponse(await apiCompleteProfile({ dateOfBirth }));
    } catch (err) {
      return { success: false, error: err.message || "No pudimos guardar tus datos." };
    }
  }, [applyAuthResponse]);

  // ── Contraseña olvidada ─────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    try {
      await apiForgotPassword({ email });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const resetPassword = useCallback(async ({ token, userId, newPassword }) => {
    try {
      await apiResetPassword({ token, userId, newPassword });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Vuelve a pedir al backend los datos del usuario y el estado real de la
   * verificación (email / teléfono / documentos / fecha de nacimiento), y los
   * deja en la sesión. `verification` es la fuente de verdad para saber si la
   * cuenta puede publicar o reservar.
   */
  const refreshUser = useCallback(async () => {
    if (!user?.accessToken) return null;
    try {
      const fresh = await getMe();
      const verification = await getVerificationStatus().catch(() => null);
      return saveUser({
        ...user, ...fresh,
        name: displayNameOf(fresh),
        accessToken: user.accessToken,
        onboardingToken: null,
        ...(verification ? { verification } : {}),
      });
    } catch {
      return null;
    }
  }, [user, saveUser]);

  // ¿La cuenta puede publicar autos o reservar? El backend lo exige.
  const isVerified = user?.verification?.fullyVerified === true ||
    user?.verificationStatus === "VERIFIED";

  return (
    <AuthContext.Provider value={{
      user, login: saveUser, logout,
      loginWithCredentials, loginWithGoogleToken,
      startRegistration, completeRegistration,
      verifyEmail, resendVerification, completeProfile,
      forgotPassword, resetPassword,
      refreshUser, isVerified, loading,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook de atajo: cualquier componente hace `const { user, logout } = useAuth();`
// para acceder a la sesión y a todas las acciones definidas arriba.
export const useAuth = () => useContext(AuthContext);
