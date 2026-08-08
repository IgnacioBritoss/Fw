// ============================================================================
//  Login — Pantalla de inicio de sesión
// ----------------------------------------------------------------------------
//  Permite entrar con email/contraseña o con Google. La lógica real de login
//  vive en AuthContext (loginWithCredentials); acá solo tomamos los datos del
//  formulario, validamos que estén completos y mostramos el error si falla.
// ============================================================================
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GOOGLE_AUTH_URL } from "../../services/api";
import { useIsMobile } from "../../hooks/useIsMobile";
import { authFields } from "../../styles/authFields";
import AuthShell from "../../components/AuthShell";
import { useI18n } from "../../i18n/core";

// Ícono de Google (SVG) para el botón "Continuar con Google".
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// Íconos de "ojo" para mostrar/ocultar la contraseña.
const EyeOpen = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const { t } = useI18n();
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isMobile } = useIsMobile();
  const f = authFields(isMobile);

  // Si se llegó acá por una sesión vencida, se avisa en vez de dejar la pantalla
  // en blanco sin explicación.
  const expired = searchParams.get("expired") === "1";

  /**
   * Inicia sesión. El backend puede responder tres cosas distintas:
   *  - sesión completa            → entra a la app
   *  - falta verificar el email   → pantalla de código
   *  - falta la fecha de nacimiento (cuentas viejas o de Google) → completar perfil
   * Antes cualquier respuesta que no fuera la primera terminaba en un error de
   * JavaScript ("no se puede leer el nombre"), porque se leía el usuario de una
   * respuesta que no había llegado.
   */
  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError(t("auth.errAllFields")); return; }
    setLoading(true); setError("");
    const result = await loginWithCredentials(form.email.trim(), form.password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    if (result.pending === "verify_email") { navigate("/verify-email"); return; }
    if (result.pending === "complete_profile") { navigate("/complete-profile"); return; }
    navigate("/");
  };

  return (
    <AuthShell
      hero={{
        eyebrow: t("auth.welcome").toUpperCase(),
        title: t("auth.welcomeBack"),
        text: t("auth.heroText"),
      }}
      title={t("auth.login")}
      subtitle={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            {t("auth.registerFree")} →
          </Link>
        </>
      }
    >
      {expired && !error && (
        <div style={f.notice}>{t("auth.sessionExpired")}</div>
      )}
      {error && <div style={f.error}>{error}</div>}

      <button onClick={() => { window.location.href = GOOGLE_AUTH_URL; }}
        style={{ ...f.btnGhost, marginBottom: 20 }}>
        <GoogleIcon /> {t("auth.withGoogle")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{t("auth.orEmail")}</span>
        <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={f.label}>{t("auth.email")}</label>
        <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
          placeholder={t("reg.phEmail")} value={form.email}
          onChange={e => setForm(fm => ({ ...fm, email: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={f.input} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={f.label}>{t("auth.password")}</label>
        <div style={{ position: "relative" }}>
          <input type={showPassword ? "text" : "password"} autoComplete="current-password"
            placeholder="••••••••" value={form.password}
            onChange={e => setForm(fm => ({ ...fm, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ ...f.input, paddingRight: 44 }} />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}>
            {showPassword ? <EyeClosed /> : <EyeOpen />}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "right", marginBottom: 24 }}>
        <Link to="/forgot-password" style={{ fontSize: 12.5, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
          {t("auth.forgot")}
        </Link>
      </div>

      <button onClick={handleSubmit} disabled={loading}
        style={{ ...f.btn, ...(loading ? f.btnDisabled : {}) }}>
        {loading ? t("auth.loggingIn") : `${t("auth.loginBtn")} →`}
      </button>
    </AuthShell>
  );
}
