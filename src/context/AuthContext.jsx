import { createContext, useContext, useState, useEffect } from "react";
import { initMockCars } from "../data/mockData";

const AuthContext = createContext(null);

const ADMIN_USER = {
  id: "admin",
  name: "Admin",
  email: "admin@freewheel.com",
  password: "admin123",
  role: "admin",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMockCars();
    const saved = localStorage.getItem("fw_user");
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem("fw_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("fw_user");
    setUser(null);
  };

  const register = (userData) => {
    const users = JSON.parse(localStorage.getItem("fw_users") || "[]");
    const newUser = { ...userData, id: Date.now().toString(), role: "user" };
    users.push(newUser);
    localStorage.setItem("fw_users", JSON.stringify(users));
    login(newUser);
  };

  const loginWithCredentials = (email, password) => {
    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
      login(ADMIN_USER);
      return { success: true };
    }
    const users = JSON.parse(localStorage.getItem("fw_users") || "[]");
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { success: false, error: "Email o contraseña incorrectos." };
    if (found.suspended) return { success: false, error: "Tu cuenta fue suspendida por violar las normas de Freewheel." };
    login(found);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loginWithCredentials, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);