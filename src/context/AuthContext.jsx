import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    // Guardar en lista de usuarios registrados (mock)
    const users = JSON.parse(localStorage.getItem("fw_users") || "[]");
    const newUser = { ...userData, id: Date.now().toString() };
    users.push(newUser);
    localStorage.setItem("fw_users", JSON.stringify(users));
    login(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
