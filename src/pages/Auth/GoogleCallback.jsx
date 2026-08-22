// ============================================================================
//  GoogleCallback — Pantalla intermedia del login con Google
// ----------------------------------------------------------------------------
//  Google, tras autenticar al usuario, lo redirige acá con un token en la URL.
//
//  Ojo: ese token puede ser de DOS tipos, y el backend lo aclara con el
//  parámetro `pending`:
//   - sin `pending`             → sesión completa, se entra a la app.
//   - pending=complete_profile  → token de onboarding: Google no informa la
//                                 fecha de nacimiento, y hasta cargarla (es
//                                 obligatoria, +18) la sesión no está abierta.
//
//  Antes se trataba a los dos igual: con el token de onboarding se pedía
//  /users/me, esa ruta lo rechazaba con 401, y la app cerraba la sesión y volvía
//  al login. Eso es lo que hacía imposible entrar con Google.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";

export default function GoogleCallback() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const { loginWithGoogleToken } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false); // evita procesar el token dos veces

  const token = params.get("token");
  const pending = params.get("pending");
  const oauthError = params.get("error"); // Google puede volver con un error en la URL

  // Errores que se saben antes de llamar a nadie: se calculan en el render.
  const initialError = oauthError
    ? t("auth.googleCancelled")
    : !token
      ? t("auth.googleNoToken")
      : "";
  const [loginError, setLoginError] = useState("");
  const error = initialError || loginError;

  useEffect(() => {
    if (handled.current || initialError) return;
    handled.current = true;

    loginWithGoogleToken(token, pending).then((result) => {
      if (!result.success) { setLoginError(result.error); return; }
      // Falta la fecha de nacimiento: primero completar el perfil.
      navigate(result.pending === "complete_profile" ? "/complete-profile" : "/", { replace: true });
    });
  }, [token, pending, initialError, loginWithGoogleToken, navigate]);

  if (error) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:420, textAlign:"center" }}>
        <div style={{ background:"var(--fw-red-bg)", border:"1.5px solid var(--fw-red-line)", borderRadius:12, padding:"20px 24px", color:"var(--fw-red-text-2)", fontSize:14, marginBottom:20 }}>
          {error}
        </div>
        <Link to="/login" style={{ display:"inline-block", padding:"12px 26px", background:"var(--fw-blue)", color:"#fff", borderRadius:10, fontSize:14, fontWeight:700, textDecoration:"none" }}>
          {t("auth.backToLogin")}
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner block label={t("auth.googleSigningIn")} />
    </div>
  );
}
