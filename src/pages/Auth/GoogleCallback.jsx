// ============================================================================
//  GoogleCallback — Pantalla intermedia del login con Google
// ----------------------------------------------------------------------------
//  Google, tras autenticar al usuario, lo redirige a esta ruta con un "token"
//  en la URL. Acá tomamos ese token, iniciamos sesión con él y, si todo va
//  bien, mandamos al inicio. Es una pantalla de paso ("Iniciando sesión...").
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const { loginWithGoogleToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Al cargar: leemos el token de la URL e iniciamos sesión con él.
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("Error al iniciar sesión con Google."); return; }
    loginWithGoogleToken(token).then((result) => {
      if (result.success) navigate("/", { replace: true });
      else setError(result.error);
    });
  }, []);

  if (error) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:12, padding:"24px 32px", color:"#b91c1c" }}>
        {error}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b7280" }}>
      Iniciando sesión con Google...
    </div>
  );
}