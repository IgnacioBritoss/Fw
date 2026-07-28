// ============================================================================
//  IdentityVerification — Verificación de la cuenta DE VERDAD (KYC)
// ----------------------------------------------------------------------------
//  Para publicar un auto o reservar, el backend exige la cuenta VERIFICADA, y
//  para eso hacen falta cuatro cosas: email confirmado, teléfono confirmado,
//  fecha de nacimiento y las fotos del DNI + licencia.
//
//  Antes esta pantalla solo escribía `dniVerified: true` en el navegador: se
//  veía "Verificado" pero el servidor seguía viendo la cuenta sin verificar, y
//  al publicar o reservar respondía 403. Ahora:
//    1) sube cada foto a Cloudinary,
//    2) las manda a POST /verification/identity/submit,
//    3) confirma el teléfono con un código (SMS),
//    4) relee el estado real desde GET /verification/me/status.
//
//  Se usa en el registro (últimos pasos) y en la pantalla /kyc.
//  Props: onDone() al terminar, compact para ocultar el encabezado.
// ============================================================================
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { uploadImageToCloudinary } from "../services/cloudinary";
import {
  confirmPhoneCode, getVerificationStatus, requestPhoneCode,
  submitIdentity, updateMe,
} from "../services/api";

const STEPS = ["Identidad", "Licencia", "Teléfono", "Confirmación"];

const st = {
  card: { maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 18, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,.06)", border: "1px solid #f0f0f0" },
  title: { fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  btnPrimary: { padding: "12px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 24, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnGhost: { padding: "12px 22px", background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 24, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  skip: { display: "block", width: "100%", marginTop: 16, padding: 6, background: "none", border: "none", color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center", textDecoration: "underline" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 },
  info: { background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", color: "#1e40af", fontSize: 13, marginBottom: 16 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827", boxSizing: "border-box" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  codeInput: { width: "100%", padding: 14, borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 26, fontWeight: 700, letterSpacing: 10, textAlign: "center", outline: "none", color: "#111827", boxSizing: "border-box", marginBottom: 12 },
};

// Tarjeta para subir una foto de documento: abre el selector de archivos, lee la
// imagen y avisa al padre. Muestra una tilde verde cuando ya hay una cargada.
function PhotoCard({ id, label, hint, value, onChange }) {
  return (
    <div onClick={() => document.getElementById(id)?.click()}
      style={{ flex: 1, border: value ? "1.5px solid #16a34a" : "1px solid #e5e7eb", borderRadius: 14, padding: 14, cursor: "pointer", background: "#fff" }}>
      <input id={id} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { onChange(null, "La foto no puede pesar más de 5MB."); return; }
          const reader = new FileReader();
          reader.onload = (ev) => onChange(ev.target.result, null);
          reader.readAsDataURL(file);
        }} />
      <div style={{ position: "relative", width: "100%", height: 120, borderRadius: 10, overflow: "hidden", background: value ? "#1f2937" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {value ? (
          <>
            <img src={value} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>
          </>
        ) : (
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#9ca3af" }}>+</div>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

// Barra de pasos de arriba.
function Stepper({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              background: i < current ? "#16a34a" : i === current ? "#2563eb" : "#fff",
              color: i <= current ? "#fff" : "#9ca3af",
              border: i > current ? "1.5px solid #e5e7eb" : "none",
            }}>{i < current ? "✓" : i + 1}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: i === current ? "#111827" : "#9ca3af" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 90, height: 2, margin: "0 10px", marginBottom: 24, background: i < current ? "#16a34a" : i === current ? "#2563eb" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function IdentityVerification({ onDone, onCancel }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);       // 0=DNI, 1=licencia, 2=teléfono, 3=confirmación
  const [docs, setDocs] = useState({ dniFront: null, dniBack: null, licFront: null, licBack: null });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // checklist real del backend
  const [phone, setPhone] = useState(user?.phone || "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const setDoc = (key) => (value, err) => {
    if (err) { setError(err); return; }
    setError("");
    setDocs(d => ({ ...d, [key]: value }));
  };

  // Estado real de la verificación al abrir la pantalla.
  const loadStatus = async () => {
    const fresh = await getVerificationStatus().catch(() => null);
    if (fresh) setStatus(fresh);
    return fresh;
  };
  useEffect(() => { loadStatus(); }, []);

  const checklist = status?.checklist || {};

  /**
   * Sube las cuatro fotos y las manda al backend. Recién con las cuatro cargadas
   * el servidor puede resolver la verificación, así que se envían juntas.
   */
  const submitDocuments = async () => {
    setBusy(true); setError(""); setInfo("");
    try {
      const [dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl] = await Promise.all([
        uploadImageToCloudinary(docs.dniFront),
        uploadImageToCloudinary(docs.dniBack),
        uploadImageToCloudinary(docs.licFront),
        uploadImageToCloudinary(docs.licBack),
      ]);
      await submitIdentity({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl });
      await loadStatus();
      setInfo("Documentación enviada correctamente.");
      setStep(2);
    } catch (err) {
      setError(err.message || "No pudimos enviar la documentación. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  // Guarda el teléfono (si cambió) y pide el código de verificación.
  const sendPhoneCode = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 8) { setError("Ingresá un teléfono válido (solo números)."); return; }
    setBusy(true); setError(""); setInfo("");
    try {
      if (clean !== user?.phone) await updateMe({ phone: clean });
      await requestPhoneCode();
      setCodeSent(true);
      setInfo("Te enviamos un código a tu teléfono.");
    } catch (err) {
      setError(err.message || "No pudimos enviar el código.");
    } finally {
      setBusy(false);
    }
  };

  // Confirma el código del teléfono. Si con esto se completa el checklist, el
  // backend deja la cuenta verificada.
  const verifyPhone = async () => {
    if (code.length !== 6) { setError("El código tiene 6 dígitos."); return; }
    setBusy(true); setError(""); setInfo("");
    try {
      await confirmPhoneCode(code);
      await loadStatus();
      await refreshUser();
      setStep(3);
    } catch (err) {
      setError(err.message || "Código incorrecto.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await refreshUser();
    onDone?.();
  };

  const docsReady = docs.dniFront && docs.dniBack;
  const licenseReady = docs.licFront && docs.licBack;

  return (
    <div>
      <Stepper current={step} />
      <div style={st.card}>
        {error && <div style={st.error}>{error}</div>}
        {info && <div style={st.info}>{info}</div>}

        {/* PASO 0: DNI */}
        {step === 0 && (
          <>
            <h2 style={st.title}>Verificá tu identidad</h2>
            <p style={st.sub}>Necesitamos confirmar quién sos. Tus datos están encriptados y protegidos.</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-dni-front" label="Frente del DNI" hint="Cara visible, sin reflejo" value={docs.dniFront} onChange={setDoc("dniFront")} />
              <PhotoCard id="iv-dni-back" label="Dorso del DNI" hint="Número y fecha legibles" value={docs.dniBack} onChange={setDoc("dniBack")} />
            </div>
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Consejos para tus fotos</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Buena iluminación", "Sin cortes ni reflejos", "JPG o PNG hasta 5MB"].map(tip => (
                  <div key={tip} style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f4f6", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#374151" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a" }} />{tip}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              {onCancel && <button style={st.btnGhost} onClick={onCancel}>Cancelar</button>}
              <button style={{ ...st.btnPrimary, opacity: docsReady ? 1 : 0.5, cursor: docsReady ? "pointer" : "not-allowed" }}
                disabled={!docsReady} onClick={() => { setError(""); setStep(1); }}>Continuar →</button>
            </div>
          </>
        )}

        {/* PASO 1: LICENCIA */}
        {step === 1 && (
          <>
            <h2 style={st.title}>Tu licencia de conducir</h2>
            <p style={st.sub}>Subí ambos lados de tu licencia vigente. Al continuar enviamos los cuatro documentos a validar.</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-lic-front" label="Frente de la licencia" hint="Foto y datos visibles" value={docs.licFront} onChange={setDoc("licFront")} />
              <PhotoCard id="iv-lic-back" label="Dorso de la licencia" hint="Categorías y vencimiento" value={docs.licBack} onChange={setDoc("licBack")} />
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>🔒 Tus datos se usan únicamente para validar tu identidad.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button style={st.btnGhost} onClick={() => setStep(0)}>Atrás</button>
              <button style={{ ...st.btnPrimary, opacity: licenseReady && !busy ? 1 : 0.5, cursor: licenseReady && !busy ? "pointer" : "not-allowed" }}
                disabled={!licenseReady || busy} onClick={submitDocuments}>
                {busy ? "Enviando documentación..." : "Enviar y continuar →"}
              </button>
            </div>
          </>
        )}

        {/* PASO 2: TELÉFONO */}
        {step === 2 && (
          <>
            <h2 style={st.title}>Verificá tu teléfono</h2>
            <p style={st.sub}>
              Es el último dato que falta para que tu cuenta quede habilitada a publicar y reservar autos.
            </p>
            {checklist.phoneVerified ? (
              <div style={{ ...st.info, marginBottom: 20 }}>Tu teléfono ya está verificado.</div>
            ) : !codeSent ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={st.label}>Teléfono</label>
                  <input style={st.input} placeholder="1134567890" value={phone} maxLength={15}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button style={st.btnGhost} onClick={() => setStep(1)}>Atrás</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={sendPhoneCode}>
                    {busy ? "Enviando..." : "Enviarme el código"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <input style={st.codeInput} type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyPhone()} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
                    onClick={sendPhoneCode} disabled={busy}>Reenviar código</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={verifyPhone}>
                    {busy ? "Verificando..." : "Verificar teléfono"}
                  </button>
                </div>
              </>
            )}
            <button style={st.skip} onClick={() => setStep(3)}>
              Omitir por ahora · lo completo después desde Ajustes
            </button>
          </>
        )}

        {/* PASO 3: CONFIRMACIÓN — con el estado REAL del backend */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: status?.fullyVerified ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={st.title}>
              {status?.fullyVerified ? "¡Cuenta verificada!" : "Verificación en curso"}
            </h2>
            <p style={st.sub}>
              {status?.fullyVerified
                ? "Ya podés publicar tu auto y reservar en Freewheel."
                : "Te falta completar algún paso. Podés terminarlo cuando quieras desde Ajustes."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
              {[
                ["Email confirmado", checklist.emailVerified],
                ["Teléfono confirmado", checklist.phoneVerified],
                ["DNI y licencia enviados", checklist.documentsSubmitted],
                ["Fecha de nacimiento", checklist.dateOfBirthProvided],
              ].map(([label, ok]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: ok ? "#166534" : "#9a3412", background: ok ? "#f0fdf4" : "#fff7ed", border: `1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius: 8, padding: "8px 12px" }}>
                  <span>{label}</span><span>{ok ? "Listo" : "Pendiente"}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button style={st.btnGhost} onClick={() => { setCode(""); setCodeSent(false); setStep(2); }}>Completar lo que falta</button>
              <button style={st.btnPrimary} onClick={finish}>Continuar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
