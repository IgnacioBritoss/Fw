// ============================================================================
//  AuthContext.jsx — Manejo GLOBAL de la SESIÓN del usuario
// ----------------------------------------------------------------------------
//  Un "Context" de React es una caja compartida a la que cualquier componente
//  puede acceder sin pasar datos por props. Acá guardamos QUIÉN está logueado
//  y todas las acciones relacionadas con la cuenta (login, registro, logout,
//  verificación de email, recuperar contraseña, etc.).
//
//  Cualquier pantalla puede usar `const { user, logout } = useAuth();` para
//  saber si hay usuario y actuar en consecuencia.
//
//  La sesión se guarda en localStorage (clave "fw_user") para que siga activa
//  aunque se recargue la página.
// ============================================================================
import { createContext, useContext, useState, useEffect } from "react";
import {
  loginUser, registerUser, getMe,
  verifyEmail as apiVerifyEmail,
  resendVerification as apiResendVerification,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
} from "../services/api";
import { initMockCars } from "../data/mockData";

const AuthContext = createContext(null);

// Provider: envuelve a toda la app (ver App.jsx) y "provee" la sesión.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // usuario logueado (o null)
  const [loading, setLoading] = useState(true); // true mientras verifica sesión al arrancar

  // Al montar: carga los autos de ejemplo y recupera la sesión guardada (si hay).
  useEffect(() => {
    initMockCars();
    const saved = localStorage.getItem("fw_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("fw_user"); }
    }
    setLoading(false);
  }, []);

  // Guarda el usuario en memoria y en localStorage (persistencia de la sesión).
  const saveUser = (userData) => {
    localStorage.setItem("fw_user", JSON.stringify(userData));
    setUser(userData);
  };

  // Cierra la sesión: borra el usuario de memoria y de localStorage.
  const logout = () => {
    localStorage.removeItem("fw_user");
    setUser(null);
  };

  // Inicia sesión con email/contraseña. Arma el nombre completo y guarda al
  // usuario junto con su token. Devuelve { success } (con error si falla).
  const loginWithCredentials = async (email, password) => {
  try {
    const data = await loginUser({ email, password });
    const name = data.user?.name ||
      `${data.user?.firstName || ""} ${data.user?.lastName || ""}`.trim();
    saveUser({ ...data.user, name, accessToken: data.accessToken });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Email o contraseña incorrectos." };
  }
};

 // Registra un usuario nuevo. Separa el nombre completo en firstName/lastName
 // (lo que espera el backend) y, si el registro es exitoso, deja la sesión abierta.
 const register = async (formData) => {
  const payload = {
    email: formData.email,
    password: formData.password,
    firstName: formData.name?.split(" ")[0] || formData.name || "",
    lastName: formData.name?.split(" ").slice(1).join(" ") || "",
    acceptedTerms: formData.acceptedTerms ?? false,
  };
  try {
    const data = await registerUser(payload);
    const name = data.user?.name ||
      `${data.user?.firstName || ""} ${data.user?.lastName || ""}`.trim();
    saveUser({ ...data.user, name, accessToken: data.accessToken });
    return { success: true, emailVerificationRequired: data.emailVerificationRequired };
  } catch (err) {
    return { success: false, error: err.message || "Error al registrarse." };
  }
};

// Inicia sesión con el token que devuelve Google tras el login con OAuth.
// Guarda el token, pide los datos del usuario al backend (getMe) y arma la sesión.
const loginWithGoogleToken = async (token) => {
  try {
    localStorage.setItem("fw_user", JSON.stringify({ accessToken: token }));
    const userData = await getMe();
    const name = userData.displayName ||
      `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
      userData.email;
    saveUser({ ...userData, name, accessToken: token });
    return { success: true };
  } catch (err) {
    localStorage.removeItem("fw_user");
    return { success: false, error: err.message || "Error al iniciar sesión con Google." };
  }
};

  // Confirma el email con el código recibido y refresca los datos del usuario.
  const verifyEmail = async (code) => {
    try {
      await apiVerifyEmail({ code });
      const fresh = await getMe();
      saveUser({ ...fresh, accessToken: user?.accessToken });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Código incorrecto." };
    }
  };

  // Reenvía el email con el código de verificación.
  const resendVerification = async () => {
    try {
      await apiResendVerification();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Dispara el envío del email para recuperar la contraseña olvidada.
  const forgotPassword = async (email) => {
    try {
      await apiForgotPassword({ email });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Establece la contraseña nueva usando el token recibido por email.
  const resetPassword = async ({ token, userId, newPassword }) => {
    try {
      await apiResetPassword({ token, userId, newPassword });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Vuelve a pedir al backend los datos del usuario (por si cambió su perfil,
  // verificación, etc.) y actualiza la sesión. Si falla, cierra sesión.
  const refreshUser = async () => {
  try {
    const fresh = await getMe();
    const name = fresh.displayName ||
      `${fresh.firstName || ""} ${fresh.lastName || ""}`.trim() ||
      fresh.email;
    saveUser({ ...fresh, name, accessToken: user?.accessToken });
    } catch { logout(); }
  };

  return (
    <AuthContext.Provider value={{
      user, login: saveUser, logout, register,
      loginWithCredentials, loginWithGoogleToken,
      verifyEmail, resendVerification,
      forgotPassword, resetPassword,
      refreshUser, loading,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook de atajo: cualquier componente hace `const { user, logout } = useAuth();`
// para acceder a la sesión y a todas las acciones definidas arriba.
export const useAuth = () => useContext(AuthContext);