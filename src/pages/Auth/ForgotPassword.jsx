// ============================================================================
//  ForgotPassword — "Olvidé mi contraseña"
// ----------------------------------------------------------------------------
//  Se pide el email y el backend manda un link para crear una contraseña nueva.
//
//  El mensaje de éxito dice "SI ese email está registrado" a propósito: contestar
//  distinto según exista o no la cuenta le permitiría a cualquiera averiguar qué
//  direcciones están registradas probando una por una.
//
//  Antes esta pantalla era una tarjeta blanca con dos renglones de texto y nada
//  más, la más pelada de toda la app. Ahora usa la misma carcasa que el resto de
//  las pantallas de entrada, y cuando el mail sale muestra una confirmación de
//  verdad: a qué dirección se mandó, qué hacer si no llega, y por cuánto tiempo
//  sirve el link.
//
//  Además ya no dice "enviado" cuando el envío falló: si el servidor no tiene
//  configurado el correo, contesta 503 y antes esta pantalla lo tapaba con el
//  cartel de éxito, así que uno se quedaba esperando un mail que no salió nunca.
// ============================================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { authFields } from "../../styles/authFields";
import AuthShell from "../../components/AuthShell";
import { useI18n } from "../../i18n/core";

const MailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

export default function ForgotPassword() {
  const { t } = useI18n();
  const { forgotPassword } = useAuth();
  const { isMobile } = useIsMobile();
  const f = authFields(isMobile);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const address = email.trim();
    if (!address) { setError("Ingresá tu email."); return; }
    setLoading(true);
    setError("");

    const result = await forgotPassword(address);
    setLoading(false);

    // Solo se muestra la confirmación si el envío realmente salió.
    if (result && result.success === false) {
      setError(result.error || "No pudimos enviar el mail. Probá de nuevo.");
      return;
    }
    setSentTo(address);
  };

  const volver = (
    <div style={{ textAlign: "center" }}>
      <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
        ← {t("auth.backToLogin")}
      </Link>
    </div>
  );

  // ── Ya se mandó: confirmación con los pasos que siguen ──
  if (sentTo) {
    return (
      <AuthShell
        hero={{
          eyebrow: t("auth.recoverEyebrow").toUpperCase(),
          title: t("auth.recoverCheckMail"),
          text: t("auth.recoverHeroText"),
        }}
        title={t("auth.recoverSentTitle")}
        footer={volver}
      >
        <div style={{
          display: "flex", gap: 12, alignItems: "flex-start",
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderLeft: "3px solid #2563eb", borderRadius: 10, padding: "14px 16px",
          marginBottom: 18,
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}><MailIcon /></div>
          <div style={{ fontSize: 13.5, color: "#1e3a8a", lineHeight: 1.6 }}>
            {t("auth.recoverSentText", { email: sentTo })}
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", marginBottom: 8 }}>
          {t("auth.ifYouDontSeeIt").toUpperCase()}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#374151", lineHeight: 1.9 }}>
          <li>{t("auth.checkSpam")}</li>
          <li>{t("auth.mayTake")}</li>
          <li>{t("auth.linkOneHour")}</li>
          <li>{t("auth.checkAddress")}</li>
        </ul>

        <button onClick={() => { setSentTo(""); setError(""); }}
          style={{ ...f.btnGhost, marginTop: 20 }}>
          {t("auth.tryAnotherEmail")}
        </button>
      </AuthShell>
    );
  }

  // ── Formulario ──
  return (
    <AuthShell
      hero={{
        eyebrow: t("auth.recoverEyebrow").toUpperCase(),
        title: t("auth.recoverTitle"),
        text: t("auth.recoverHeroText"),
      }}
      title={t("auth.recoverHeading")}
      subtitle={t("auth.recoverSubtitle")}
      footer={volver}
    >
      {error && <div style={f.error}>{error}</div>}

      <label style={f.label}>{t("auth.email")}</label>
      <input style={{ ...f.input, marginBottom: 18 }} type="email" inputMode="email"
        autoComplete="email" autoCapitalize="none" placeholder="tu@email.com"
        value={email} onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

      <button style={{ ...f.btn, ...(loading ? f.btnDisabled : {}) }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? t("common.sending") : t("auth.sendLink")}
      </button>

      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
        {t("auth.sameAnswerNote")}
      </div>
    </AuthShell>
  );
}
