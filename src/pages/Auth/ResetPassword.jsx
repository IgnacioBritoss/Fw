// ============================================================================
//  ResetPassword — Crear una contraseña nueva desde el link de recuperación
// ----------------------------------------------------------------------------
//  Se llega acá desde el link del email, que trae en la URL un "token" y el
//  id del usuario ("uid"). Si faltan, el link es inválido. El usuario escribe
//  y confirma la nueva contraseña, y al guardarla vuelve al login.
// ============================================================================
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useI18n } from "../../i18n/core";

const EyeOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// Los estilos dependen del ancho de la pantalla, así que se arman adentro del
// componente. En celular: menos aire alrededor y campos de 16px, porque con
// menos de 16 Safari en iPhone hace zoom solo al tocar un campo.
const styles = (isMobile) => ({
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems: isMobile ? "flex-start" : "center", justifyContent:"center", padding: isMobile ? 16 : 24 },
  card: { background:"#fff", borderRadius:16, padding: isMobile ? "28px 22px" : "40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:24 },
  label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
  input: { width:"100%", padding: isMobile ? "13px 14px" : "11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize: isMobile ? 16 : 14, outline:"none", color:"#111827" },
  btn: { width:"100%", padding:13, background:"#0f6ce6", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:16 },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  success: { background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"12px 16px", color:"#1e40af", fontSize:14, marginBottom:16 },
  back: { textAlign:"center", fontSize:13 },
  wrapper: { position:"relative", marginBottom:14 },
  eyeBtn: { position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:0, display:"flex", alignItems:"center" },
});

export default function ResetPassword() {
  const { isMobile } = useIsMobile();
  const { t } = useI18n();
  const s = styles(isMobile);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  // Leemos el token y el id de usuario que vienen en la URL del email.
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const userId = params.get("uid") ?? "";

  const [form, setForm] = useState({ password:"", confirm:"" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || !userId) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.error}>{t("reset.badLink")}</div>
          <Link to="/forgot-password" style={{ color:"#0f6ce6", fontWeight:600, fontSize:14 }}>
            {t("reset.askNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  // Valida (largo mínimo y que ambas coincidan) y guarda la nueva contraseña.
  const handleSubmit = async () => {
    if (!form.password) { setError(t("reset.errEmpty")); return; }
    if (form.password.length < 6) { setError(t("reset.errShort")); return; }
    if (form.password !== form.confirm) { setError(t("reg.errPassMatch")); return; }
    setLoading(true);
    setError("");
    const result = await resetPassword({ token, userId, newPassword: form.password });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setDone(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>{t("reset.title")}</div>
        <div style={s.sub}>{t("reset.sub")}</div>

        {error && <div style={s.error}>{error}</div>}

        {done ? (
          <div style={s.success}>{t("reset.done")}</div>
        ) : (
          <>
            <label style={s.label}>{t("reset.title")}</label>
            <div style={s.wrapper}>
              <input style={{ ...s.input, paddingRight:40 }}
                type={showPassword ? "text" : "password"}
                placeholder={t("reset.phMin")}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>

            <label style={s.label}>{t("auth.confirmPassword")}</label>
            <div style={s.wrapper}>
              <input style={{ ...s.input, paddingRight:40 }}
                type={showConfirm ? "text" : "password"}
                placeholder={t("reset.phRepeat")}
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>

            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onClick={handleSubmit} disabled={loading}>
              {loading ? t("common.saving") : t("reset.submit")}
            </button>
          </>
        )}

        <div style={s.back}>
          <Link to="/login" style={{ color:"#0f6ce6", fontWeight:600 }}>{t("auth.backToLogin")}</Link>
        </div>
      </div>
    </div>
  );
}