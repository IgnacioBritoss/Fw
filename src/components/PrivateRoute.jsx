import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import { useI18n } from "../i18n/core";

// ============================================================================
//  PrivateRoute — "Guardia" de las rutas privadas
// ----------------------------------------------------------------------------
//  Envuelve a las páginas que requieren estar logueado. Si el usuario está
//  autenticado, muestra la página (children); si no, lo redirige al /login.
//  Mientras se verifica la sesión, muestra "Cargando...".
// ============================================================================
export function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const { t: tr } = useI18n();
  // El círculo mientras se resuelve la sesión: era un texto quieto.
  if (loading) return <Spinner block label={tr("common.loading")} />;
  return user ? children : <Navigate to="/login" replace />;
}
