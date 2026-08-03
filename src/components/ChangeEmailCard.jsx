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

export default function ChangeEmailCard({ verified }) {
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
      setError("Escribí una dirección de email válida."); return;
    }
    setBusy(true); setError(""); setInfo("");
    try {
      const res = await requestEmailChange(direccion);
      setSentTo(res?.sentTo || direccion);
      setPhase("confirming");
      setInfo("");
    } catch (err) {
      setError(err.message || "No pudimos enviar el código.");
    } finally {
      setBusy(false);
    }
  };

  const confirmar = async () => {
    if (code.trim().length !== 6) { setError("El código tiene 6 dígitos."); return; }
    setBusy(true); setError("");
    try {
      await confirmEmailChange(code.trim());
      await refreshUser();
      reset();
      setInfo("Listo: tu cuenta ya usa la dirección nueva.");
    } catch (err) {
      setError(err.message || "No pudimos confirmar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      border: "1px solid #ececec", borderRadius: 14, padding: "14px 18px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#9ca3af",
        letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4,
      }}>
        Email
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", minWidth: 0, wordBreak: "break-word" }}>
          {user?.email || "—"}
          {verified && (
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#166534",
              background: "#dcfce7", borderRadius: 20, padding: "2px 8px",
            }}>
              verificado
            </span>
          )}
        </div>
        {phase === "idle" && (
          <button onClick={() => setPhase("asking")}
            style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", cursor: "pointer", background: "none", border: "none", flexShrink: 0 }}>
            Cambiar
          </button>
        )}
      </div>

      {info && phase === "idle" && (
        <div style={{ fontSize: 12.5, color: "#166534", marginTop: 8 }}>{info}</div>
      )}

      {phase !== "idle" && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
          {error && <div style={f.error}>{error}</div>}

          {phase === "asking" ? (
            <>
              <label style={f.label}>Dirección nueva</label>
              <input style={{ ...f.input, marginBottom: 6 }} type="email" inputMode="email"
                autoComplete="email" autoCapitalize="none" placeholder="tu.nueva@direccion.com"
                value={newEmail} autoFocus
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pedirCodigo()} />
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, lineHeight: 1.6 }}>
                Te mandamos un código de 6 dígitos <strong>a esa dirección</strong>. Tu
                email actual no cambia hasta que lo confirmes.
              </div>
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column-reverse" : "row" }}>
                <button onClick={reset} style={{ ...f.btnGhost, flex: 1 }}>Cancelar</button>
                <button onClick={pedirCodigo} disabled={busy}
                  style={{ ...f.btn, flex: 1, ...(busy ? f.btnDisabled : {}) }}>
                  {busy ? "Enviando..." : "Enviarme el código"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: "#374151", marginBottom: 12, lineHeight: 1.6 }}>
                Mandamos un código a <strong>{sentTo}</strong>. Escribilo acá para
                terminar el cambio.
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
                <button onClick={reset} style={{ ...f.btnGhost, flex: 1 }}>Cancelar</button>
                <button onClick={confirmar} disabled={busy}
                  style={{ ...f.btn, flex: 1, ...(busy ? f.btnDisabled : {}) }}>
                  {busy ? "Confirmando..." : "Confirmar el cambio"}
                </button>
              </div>
              <button onClick={() => { setPhase("asking"); setCode(""); setError(""); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12.5, cursor: "pointer", padding: 0, marginTop: 12, textDecoration: "underline" }}>
                Usar otra dirección
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
