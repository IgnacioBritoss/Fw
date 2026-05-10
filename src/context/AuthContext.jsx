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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMockCars();
    const saved = localStorage.getItem("fw_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("fw_user"); }
    }
    setLoading(false);
  }, []);

  const saveUser = (userData) => {
    localStorage.setItem("fw_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("fw_user");
    setUser(null);
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const data = await loginUser({ email, password });
      saveUser({ ...data.user, accessToken: data.accessToken });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Email o contraseña incorrectos." };
    }
  };

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
      saveUser({ ...data.user, accessToken: data.accessToken });
      return { success: true, emailVerificationRequired: data.emailVerificationRequired };
    } catch (err) {
      return { success: false, error: err.message || "Error al registrarse." };
    }
  };

  const loginWithGoogleToken = async (token) => {
    try {
      localStorage.setItem("fw_user", JSON.stringify({ accessToken: token }));
      const userData = await getMe();
      saveUser({ ...userData, accessToken: token });
      return { success: true };
    } catch (err) {
      localStorage.removeItem("fw_user");
      return { success: false, error: err.message || "Error al iniciar sesión con Google." };
    }
  };

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

  const resendVerification = async () => {
    try {
      await apiResendVerification();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await apiForgotPassword({ email });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async ({ token, userId, newPassword }) => {
    try {
      await apiResetPassword({ token, userId, newPassword });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const refreshUser = async () => {
    try {
      const fresh = await getMe();
      saveUser({ ...fresh, accessToken: user?.accessToken });
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

export const useAuth = () => useContext(AuthContext);