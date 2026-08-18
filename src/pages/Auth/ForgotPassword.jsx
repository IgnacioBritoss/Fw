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
<<<<<<< HEAD
=======
import { useI18n } from "../../i18n/core";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

const MailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

export default function ForgotPassword() {
<<<<<<< HEAD
=======
  const { t } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const { forgotPassword } = useAuth();
  const { isMobile } = useIsMobile();
  const f = authFields(isMobile);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const address = email.trim();
<<<<<<< HEAD
    if (!address) { setError("Ingresá tu email."); return; }
=======
    if (!address) { setError(t("reg.errEmail")); return; }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    setLoading(true);
    setError("");

    const result = await forgotPassword(address);
    setLoading(false);

    // Solo se muestra la confirmación si el envío realmente salió.
    if (result && result.success === false) {
<<<<<<< HEAD
      setError(result.error || "No pudimos enviar el mail. Probá de nuevo.");
=======
      setError(result.error || t("auth.mailFailed"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      return;
    }
    setSentTo(address);
  };

  const volver = (
    <div style={{ textAlign: "center" }}>
      <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
<<<<<<< HEAD
        ← Volver al inicio de sesión
=======
        {t("auth.backToLogin")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </Link>
    </div>
  );

  // ── Ya se mandó: confirmación con los pasos que siguen ──
  if (sentTo) {
    return (
      <AuthShell
        hero={{
<<<<<<< HEAD
          eyebrow: "RECUPERAR ACCESO",
          title: <>Revisá tu<br />correo.</>,
          text: "El link te deja crear una contraseña nueva sin tener que acordarte de la anterior.",
        }}
        title="Listo, ya salió"
=======
          eyebrow: t("auth.recoverEyebrow").toUpperCase(),
          title: t("auth.recoverCheckMail"),
          text: t("auth.recoverHeroText"),
        }}
        title={t("auth.recoverSentTitle")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
            Si <strong>{sentTo}</strong> está registrado, te mandamos un link para
            crear una contraseña nueva.
=======
            {t("auth.recoverSentText", { email: sentTo })}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", marginBottom: 8 }}>
<<<<<<< HEAD
          SI NO LO VES
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#374151", lineHeight: 1.9 }}>
          <li>Mirá la carpeta de spam o correo no deseado.</li>
          <li>Puede tardar un par de minutos en llegar.</li>
          <li>El link sirve por una hora; después hay que pedir otro.</li>
          <li>Fijate que la dirección esté bien escrita.</li>
=======
          {t("auth.ifYouDontSeeIt").toUpperCase()}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#374151", lineHeight: 1.9 }}>
          <li>{t("auth.checkSpam")}</li>
          <li>{t("auth.mayTake")}</li>
          <li>{t("auth.linkOneHour")}</li>
          <li>{t("auth.checkAddress")}</li>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </ul>

        <button onClick={() => { setSentTo(""); setError(""); }}
          style={{ ...f.btnGhost, marginTop: 20 }}>
<<<<<<< HEAD
          Probar con otro email
=======
          {t("auth.tryAnotherEmail")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </button>
      </AuthShell>
    );
  }

  // ── Formulario ──
  return (
    <AuthShell
      hero={{
<<<<<<< HEAD
        eyebrow: "RECUPERAR ACCESO",
        title: <>¿Te olvidaste<br />la contraseña?</>,
        text: "Pasa. Te mandamos un link al correo y creás una nueva en un minuto.",
      }}
      title="Recuperar contraseña"
      subtitle="Poné el email con el que te registraste y te mandamos un link para crear una contraseña nueva."
=======
        eyebrow: t("auth.recoverEyebrow").toUpperCase(),
        title: t("auth.recoverTitle"),
        text: t("auth.recoverHeroText"),
      }}
      title={t("auth.recoverHeading")}
      subtitle={t("auth.recoverSubtitle")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      footer={volver}
    >
      {error && <div style={f.error}>{error}</div>}

<<<<<<< HEAD
      <label style={f.label}>Email</label>
      <input style={{ ...f.input, marginBottom: 18 }} type="email" inputMode="email"
        autoComplete="email" autoCapitalize="none" placeholder="tu@email.com"
=======
      <label style={f.label}>{t("auth.email")}</label>
      <input style={{ ...f.input, marginBottom: 18 }} type="email" inputMode="email"
        autoComplete="email" autoCapitalize="none" placeholder={t("auth.phYourEmail")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        value={email} onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

      <button style={{ ...f.btn, ...(loading ? f.btnDisabled : {}) }}
        onClick={handleSubmit} disabled={loading}>
<<<<<<< HEAD
        {loading ? "Enviando..." : "Enviarme el link"}
      </button>

      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
        Por seguridad, la respuesta es la misma tengas cuenta o no: así nadie puede
        usar esta pantalla para averiguar qué direcciones están registradas.
=======
        {loading ? t("common.sending") : t("auth.sendLink")}
      </button>

      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
        {t("auth.sameAnswerNote")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </div>
    </AuthShell>
  );
}
