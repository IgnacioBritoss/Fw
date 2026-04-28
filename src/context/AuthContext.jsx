import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, getMe } from "../services/api";
import { initMockCars } from "../data/mockData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMockCars();
    const saved = localStorage.getItem("fw_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("fw_user");
      }
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

  // Login con la API real
  const loginWithCredentials = async (email, password) => {
    try {
      const data = await loginUser({ email, password });
      // data = { user: {...}, accessToken: "jwt" }
      const userData = { ...data.user, accessToken: data.accessToken };
      saveUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Email o contraseña incorrectos." };
    }
  };

  // Registro con la API real
  const register = async (formData) => {
    // Adaptar campos del form al schema de la API
    const payload = {
      email: formData.email,
      password: formData.password,
      firstName: formData.name?.split(" ")[0] || formData.name || "",
      lastName: formData.name?.split(" ").slice(1).join(" ") || "",
    };

    try {
      const data = await registerUser(payload);
      const userData = { ...data.user, accessToken: data.accessToken };
      saveUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || "Error al registrarse." };
    }
  };

  // Refrescar datos del usuario desde la API
  const refreshUser = async () => {
    try {
      const freshUser = await getMe();
      const token = user?.accessToken;
      saveUser({ ...freshUser, accessToken: token });
    } catch {
      // Si falla (token expirado), hacer logout
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login: saveUser, logout, register, loginWithCredentials, refreshUser, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);