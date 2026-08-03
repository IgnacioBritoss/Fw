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

const MailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

export default function ForgotPassword() {
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
        ← Volver al inicio de sesión
      </Link>
    </div>
  );

  // ── Ya se mandó: confirmación con los pasos que siguen ──
  if (sentTo) {
    return (
      <AuthShell
        hero={{
          eyebrow: "RECUPERAR ACCESO",
          title: <>Revisá tu<br />correo.</>,
          text: "El link te deja crear una contraseña nueva sin tener que acordarte de la anterior.",
        }}
        title="Listo, ya salió"
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
            Si <strong>{sentTo}</strong> está registrado, te mandamos un link para
            crear una contraseña nueva.
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", marginBottom: 8 }}>
          SI NO LO VES
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#374151", lineHeight: 1.9 }}>
          <li>Mirá la carpeta de spam o correo no deseado.</li>
          <li>Puede tardar un par de minutos en llegar.</li>
          <li>El link sirve por una hora; después hay que pedir otro.</li>
          <li>Fijate que la dirección esté bien escrita.</li>
        </ul>

        <button onClick={() => { setSentTo(""); setError(""); }}
          style={{ ...f.btnGhost, marginTop: 20 }}>
          Probar con otro email
        </button>
      </AuthShell>
    );
  }

  // ── Formulario ──
  return (
    <AuthShell
      hero={{
        eyebrow: "RECUPERAR ACCESO",
        title: <>¿Te olvidaste<br />la contraseña?</>,
        text: "Pasa. Te mandamos un link al correo y creás una nueva en un minuto.",
      }}
      title="Recuperar contraseña"
      subtitle="Poné el email con el que te registraste y te mandamos un link para crear una contraseña nueva."
      footer={volver}
    >
      {error && <div style={f.error}>{error}</div>}

      <label style={f.label}>Email</label>
      <input style={{ ...f.input, marginBottom: 18 }} type="email" inputMode="email"
        autoComplete="email" autoCapitalize="none" placeholder="tu@email.com"
        value={email} onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

      <button style={{ ...f.btn, ...(loading ? f.btnDisabled : {}) }}
        onClick={handleSubmit} disabled={loading}>
        {loading ? "Enviando..." : "Enviarme el link"}
      </button>

      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
        Por seguridad, la respuesta es la misma tengas cuenta o no: así nadie puede
        usar esta pantalla para averiguar qué direcciones están registradas.
      </div>
    </AuthShell>
  );
}
