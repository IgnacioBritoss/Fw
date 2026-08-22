// ============================================================================
//  ChangeEmailCard — Cambiar la dirección de email de la cuenta
// ----------------------------------------------------------------------------
//  Antes el email era un campo editable más: se escribía otra dirección y se
//  guardaba. Eso tiene un problema serio: el email es la llave de la cuenta —por
//  ahí llega el link para recuperar la contraseña—, así que un error de tipeo
//  dejaba la cuenta apuntando a una dirección que no existe y sin forma de
//  recuperarla. Y encima el backend nunca guardaba el cambio, así que la pantalla
//  mostraba el email nuevo y el servidor seguía con el viejo.
//
//  Ahora son dos pasos y EL CÓDIGO LLEGA A LA DIRECCIÓN NUEVA. Recién cuando ese
//  código se confirma, la cuenta cambia de email. Si la dirección está mal escrita
//  el código no llega, no se confirma nada, y la cuenta queda intacta.
// ============================================================================
import { useState } from "react";
import { confirmEmailChange, requestEmailChange } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { authFields } from "../styles/authFields";
import StatusChip from "./StatusChip";
import { useI18n } from "../i18n/core";

/**
 * El tilde de "esta dirección está verificada".
 *
 * Es un dibujo (SVG), no un emoji: los emojis los dibuja el sistema operativo,
 * así que el mismo carácter se ve distinto en Android, en iPhone y en Windows, y
 * ninguna de las tres versiones combina con el resto de la pantalla.
 *
 * VA EN AZUL, no en verde. El verde es el color de "operación exitosa", y esto no
 * es el resultado de nada que la persona acabe de hacer: es un estado de la
 * cuenta. En azul se lee como parte de Freewheel —el mismo azul del logo, de los
 * enlaces y de los tics de mensaje leído del chat— y no como un cartelito de
 * confirmación pegado al costado.
 *
 * `title` y `aria-label` dicen "Verificado" con palabras: un tilde solo no
 * significa nada para quien usa un lector de pantalla.
 */
function TildeVerificado({ titulo }) {
  return (
    <span title={titulo} style={{ display: "inline-flex", flexShrink: 0, alignItems: "center" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" role="img" aria-label={titulo}>
        <path d="M20 6L9 17l-5-5" stroke="#0f6ce6" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ChangeEmailCard({ verified }) {
  const { t: tr } = useI18n();
  const { user, refreshUser } = useAuth();
  const { isMobile } = useIsMobile();
  const f = authFields(isMobile);

  // "idle" → "asking" (escribiendo la dirección) → "confirming" (esperando código)
  const [phase, setPhase] = useState("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPhase("idle"); setNewEmail(""); setCode("");
    setSentTo(""); setError(""); setInfo("");
  };

  const pedirCodigo = async () => {
    const direccion = newEmail.trim().toLowerCase();
    if (!direccion || !direccion.includes("@")) {
      setError(tr("email.errBad")); return;
    }
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await requestEmailChange(direccion);
      setSentTo(res?.sentTo || direccion);
      setPhase("confirming");
      setInfo("");
    } catch (err) {
      setError(err.message || tr("email.errSend"));
    } finally {
      setBusy(false);
    }
  };

  const confirmar = async () => {
    if (code.trim().length !== 6) { setError(tr("reg.errCode")); return; }
    setBusy(true); setError("");
    try {
      await confirmEmailChange(code.trim());
      await refreshUser();
      reset();
      setInfo(tr("email.done"));
    } catch (err) {
      setError(err.message || tr("car.errConfirm"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      border: "1px solid var(--fw-line)", borderRadius: 14, padding: "14px 18px",
    }}>
      {/*
        EN EL TELÉFONO, EL BOTÓN VA ABAJO.

        El bloque vive entre "Teléfono" y "Fecha de nacimiento", que son una sola
        fila: rótulo y valor a la izquierda, el botón a la derecha. Con una
        pantalla ancha el email entra al lado del botón y sigue esa forma.

        En el teléfono no: entre el email largo y el botón no quedan más de dos o
        tres centímetros, así que la dirección se cortaba a la mitad. Entonces la
        dirección se queda con TODO el ancho, y "Cambiar" baja debajo, centrado y
        separado por una línea, como el pie de una tarjeta.

        Y el estado verificado deja de ser un cartel que dice "VERIFICADO": es un
        tilde verde al lado de la dirección. Ocupa 16 píxeles en vez de media
        fila, y el título accesible lo sigue diciendo con palabras para quien usa
        un lector de pantalla.
      */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, ...(isMobile ? { flexDirection: "column", alignItems: "stretch", gap: 0 } : {}),
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--fw-text-4)",
            letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4,
          }}>
            {tr("auth.email")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span style={{
              fontSize: 15, fontWeight: 600, color: "var(--fw-text)",
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {user?.email || "—"}
            </span>
            {verified && (
              isMobile
                ? <TildeVerificado titulo={tr("status.verified")} />
                : <StatusChip tone="ok" style={{ flexShrink: 0 }}>{tr("status.verified")}</StatusChip>
            )}
          </div>
        </div>
        {phase === "idle" && (
          <>
            {/* La misma división que los campos de al lado, pero en el sentido
                que corresponde: una línea VERTICAL cuando el botón está al
                costado, y la horizontal de abajo cuando está apilado. Una
                vertical debajo de un bloque apilado no separaría nada. */}
            {!isMobile && (
              <div style={{
                width: 1, alignSelf: "stretch", background: "var(--fw-surface-3)",
                marginTop: -14, marginBottom: -14, flexShrink: 0,
              }} />
            )}
            <button onClick={() => setPhase("asking")}
              style={{
                fontSize: 14, fontWeight: 600, color: "var(--fw-blue)", cursor: "pointer",
                background: "none", border: "none", flexShrink: 0,
                ...(isMobile
                  ? { width: "100%", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--fw-line)", textAlign: "center" }
                  : {}),
              }}>
              {tr("email.change")}
            </button>
          </>
        )}
      </div>

      {info && phase === "idle" && (
        <div style={{ fontSize: 12.5, color: "var(--fw-green-text-2)", marginTop: 8 }}>{info}</div>
      )}

      {phase !== "idle" && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--fw-line-soft)" }}>
          {error && <div style={f.error}>{error}</div>}

          {phase === "asking" ? (
            <>
              <label style={f.label}>{tr("email.newAddress")}</label>
              <input style={{ ...f.input, marginBottom: 6 }} type="email" inputMode="email"
                autoComplete="email" autoCapitalize="none" placeholder={tr("email.phNew")}
                value={newEmail} autoFocus
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pedirCodigo()} />
              <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginBottom: 14, lineHeight: 1.6 }}>
                {tr("email.codeNote")}
              </div>
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column-reverse" : "row" }}>
                <button onClick={reset} style={{ ...f.btnGhost, flex: 1 }}>{tr("common.cancel")}</button>
                <button onClick={pedirCodigo} disabled={busy}
                  style={{ ...f.btn, flex: 1, ...(busy ? f.btnDisabled : {}) }}>
                  {busy ? tr("common.sending") : tr("email.sendCode")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: "var(--fw-text-2)", marginBottom: 12, lineHeight: 1.6 }}>
                {tr("email.sentTo")} <strong>{sentTo}</strong>. {tr("email.writeItHere")}
              </div>
              {info && (
                <div style={{ ...f.notice, marginBottom: 12 }}>{info}</div>
              )}
              <input style={{
                ...f.input, marginBottom: 14, textAlign: "center",
                fontSize: isMobile ? 22 : 24, fontWeight: 700, letterSpacing: isMobile ? 8 : 10,
              }}
                inputMode="numeric" maxLength={6} placeholder="000000" value={code} autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && confirmar()} />
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column-reverse" : "row" }}>
                <button onClick={reset} style={{ ...f.btnGhost, flex: 1 }}>{tr("common.cancel")}</button>
                <button onClick={confirmar} disabled={busy}
                  style={{ ...f.btn, flex: 1, ...(busy ? f.btnDisabled : {}) }}>
                  {busy ? tr("car.confirming") : tr("email.confirmChange")}
                </button>
              </div>
              <button onClick={() => { setPhase("asking"); setCode(""); setError(""); }}
                style={{ background: "none", border: "none", color: "var(--fw-text-3)", fontSize: 12.5, cursor: "pointer", padding: 0, marginTop: 12, textDecoration: "underline" }}>
                {tr("email.useAnother")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
