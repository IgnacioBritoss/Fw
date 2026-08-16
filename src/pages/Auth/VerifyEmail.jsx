// ============================================================================
//  VerifyEmail — Verificación de la cuenta con código de 6 dígitos
// ----------------------------------------------------------------------------
//  Tras registrarse, el usuario recibe un código por email y lo ingresa acá.
//  Si es correcto, la cuenta queda activa y sigue a "completar perfil".
//  También permite reenviar el código si no llegó.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useI18n } from "../../i18n/core";

// Los estilos dependen del ancho de la pantalla, así que se arman adentro del
// componente. En celular: menos aire alrededor y campos de 16px, porque con
// menos de 16 Safari en iPhone hace zoom solo al tocar un campo.
const styles = (isMobile) => ({
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems: isMobile ? "flex-start" : "center", justifyContent:"center", padding: isMobile ? 16 : 24 },
  card: { background:"#fff", borderRadius:16, padding: isMobile ? "28px 22px" : "40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)", textAlign:"center" },
  icon: { fontSize:48, marginBottom:12 },
  title: { fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28, lineHeight:1.6 },
  input: { width:"100%", padding:"14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize: isMobile ? 24 : 28, fontWeight:700, letterSpacing: isMobile ? 8 : 12, textAlign:"center", outline:"none", color:"#111827", marginBottom:20 },
  btn: { width:"100%", padding:13, background:"#0f6ce6", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:12 },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  btnLink: { background:"none", border:"none", color:"#0f6ce6", fontWeight:600, fontSize:13, cursor:"pointer", padding:0 },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  success: { background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"10px 14px", color:"#1e40af", fontSize:13, marginBottom:16 },
});

export default function VerifyEmail() {
  const { isMobile } = useIsMobile();
  const { t } = useI18n();
  const s = styles(isMobile);
  const { verifyEmail, resendVerification, user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Verifica el código de 6 dígitos. Si es válido, avanza a completar el perfil.
  const handleVerify = async () => {
    if (code.length !== 6) { setError(t("reg.errCode")); return; }
    setLoading(true);
    setError("");
    const result = await verifyEmail(code);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    navigate("/complete-profile");
  };

  // Reenvía un código nuevo al email del usuario.
  const handleResend = async () => {
    setResending(true);
    setError("");
    setInfo("");
    const result = await resendVerification();
    setResending(false);
    if (result.success) {
      setInfo(t("verify.resent"));
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}><rect x="2" y="4" width="20" height="16" rx="2" stroke="#0f6ce6" strokeWidth="1.8"/><path d="M2.5 6.5 12 13l9.5-6.5" stroke="#0f6ce6" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <div style={s.title}>{t("verify.title")}</div>
        <div style={s.sub}>
          {t("verify.sentTo")} <strong>{user?.email}</strong>.<br />
          {t("verify.enterIt")}
        </div>

        {error && <div style={s.error}>{error}</div>}
        {info && <div style={s.success}>{info}</div>}

        <input
          style={s.input}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
        />

        <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={handleVerify} disabled={loading}>
          {loading ? t("verify.checking") : t("verify.submit")}
        </button>

        <div style={{ fontSize:13, color:"#6b7280" }}>
          {t("verify.notArrived")}{" "}
          <button style={{ ...s.btnLink, opacity: resending ? 0.5 : 1 }}
            onClick={handleResend} disabled={resending}>
            {resending ? t("common.sending") : t("reg.resendCode")}
          </button>
        </div>
      </div>
    </div>
  );
}