import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:40,textAlign:"center"}}>Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}
