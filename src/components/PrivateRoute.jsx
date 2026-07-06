import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ============================================================================
//  PrivateRoute — "Guardia" de las rutas privadas
// ----------------------------------------------------------------------------
//  Envuelve a las páginas que requieren estar logueado. Si el usuario está
//  autenticado, muestra la página (children); si no, lo redirige al /login.
//  Mientras se verifica la sesión, muestra "Cargando...".
// ============================================================================
export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:40,textAlign:"center"}}>Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}
