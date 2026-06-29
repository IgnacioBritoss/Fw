import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const STEPS = ["Identidad", "Licencia", "Confirmación"];

const s = {
  page: { minHeight: "100vh", background: "#f9fafb", padding: "40px 24px" },
  pageMobile: { minHeight: "100vh", background: "#f9fafb", padding: "20px 16px" },
  container: { maxWidth: 560, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 28 },
  kicker: { fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14 },
  stepper: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 },
  card: { background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 },
  sectionSub: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  slot: { border: "2px dashed #d1d5db", borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: ".15s", marginBottom: 14 },
  slotDone: { border: "2px solid #16a34a", background: "#f0fdf4" },
  slotLabel: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 },
  slotHint: { fontSize: 12, color: "#9ca3af" },
  preview: { width: "100%", height: 150, objectFit: "cover", borderRadius: 10, marginBottom: 8 },
  btnRow: { display: "flex", gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: "13px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnBack: { flex: 1, padding: "13px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  hero: { textAlign: "center", padding: "20px 8px" },
  heroCircle: { width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" },
  badge: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 13, color: "#166534", fontWeight: 600, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 8 },
};

function PhotoSlot({ label, hint, value, onChange }) {
  const id = `kyc-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div style={{ ...s.slot, ...(value ? s.slotDone : {}) }} onClick={() => document.getElementById(id).click()}>
      <input id={id} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => onChange(ev.target.result);
          reader.readAsDataURL(file);
        }} />
      {value
        ? <img src={value} alt={label} style={s.preview} />
        : <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>}
      <div style={s.slotLabel}>{value ? `✓ ${label}` : label}</div>
      <div style={s.slotHint}>{value ? "Tocá para cambiar" : hint}</div>
    </div>
  );
}

export default function KYC() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [step, setStep] = useState(0);
  const [dniFront, setDniFront] = useState(null);
  const [dniBack, setDniBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [licFront, setLicFront] = useState(null);
  const [licBack, setLicBack] = useState(null);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";

  const step0Ready = dniFront && dniBack && selfie;
  const step1Ready = licFront && licBack;

  const Stepper = () => (
    <div style={s.stepper}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: i < step ? "#16a34a" : i === step ? "#2563eb" : "#e5e7eb",
              color: i <= step ? "#fff" : "#9ca3af",
              boxShadow: i === step ? "0 0 0 4px #dbeafe" : "none",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: i === step ? "#2563eb" : i < step ? "#16a34a" : "#9ca3af" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ width: isMobile ? 40 : 70, height: 2, margin: "0 8px", marginBottom: 18, background: i < step ? "#16a34a" : "#e5e7eb" }} />}
        </div>
      ))}
    </div>
  );

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.kicker}>{step === 2 ? "Verificación completa" : "Verificación de identidad"}</div>
          <div style={s.title}>
            {step === 0 && "Verificá tu identidad"}
            {step === 1 && "Tu licencia de conducir"}
            {step === 2 && `¡Todo listo${firstName ? `, ${firstName}` : ""}!`}
          </div>
          <div style={s.sub}>
            {step === 0 && "Necesitamos validar tu DNI para tu seguridad y la de la comunidad."}
            {step === 1 && "Subí tu licencia vigente para poder alquilar autos."}
            {step === 2 && "Tu cuenta quedó verificada. Ya podés usar Freewheel."}
          </div>
        </div>

        <Stepper />

        <div style={isMobile ? s.cardMobile : s.card}>
          {/* PASO 0 — IDENTIDAD / DNI */}
          {step === 0 && (
            <>
              <div style={s.sectionTitle}>Documento de identidad</div>
              <div style={s.sectionSub}>Subí ambos lados de tu DNI y una selfie.</div>
              <PhotoSlot label="DNI - Frente" hint="JPG o PNG, foto clara" value={dniFront} onChange={setDniFront} />
              <PhotoSlot label="DNI - Dorso" hint="JPG o PNG, foto clara" value={dniBack} onChange={setDniBack} />
              <PhotoSlot label="Selfie" hint="Mirando a cámara, sin lentes" value={selfie} onChange={setSelfie} />
              <div style={s.btnRow}>
                <button style={{ ...s.btn, ...(step0Ready ? {} : s.btnDisabled) }} disabled={!step0Ready} onClick={() => setStep(1)}>Continuar</button>
              </div>
            </>
          )}

          {/* PASO 1 — LICENCIA */}
          {step === 1 && (
            <>
              <div style={s.sectionTitle}>Licencia de conducir</div>
              <div style={s.sectionSub}>Subí ambos lados de tu licencia vigente.</div>
              <PhotoSlot label="Licencia - Frente" hint="JPG o PNG, foto clara" value={licFront} onChange={setLicFront} />
              <PhotoSlot label="Licencia - Dorso" hint="JPG o PNG, foto clara" value={licBack} onChange={setLicBack} />
              <div style={s.btnRow}>
                <button style={s.btnBack} onClick={() => setStep(0)}>Atrás</button>
                <button style={{ ...s.btn, ...(step1Ready ? {} : s.btnDisabled) }} disabled={!step1Ready} onClick={() => setStep(2)}>Finalizar</button>
              </div>
            </>
          )}

          {/* PASO 2 — CONFIRMACIÓN */}
          {step === 2 && (
            <div style={s.hero}>
              <div style={s.heroCircle}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ ...s.sectionTitle, fontSize: 18, marginBottom: 16 }}>Identidad verificada</div>
              <div style={s.badge}>✓ DNI validado</div>
              <div style={s.badge}>✓ Licencia de conducir validada</div>
              <div style={{ ...s.btnRow, marginTop: 20, flexDirection: isMobile ? "column" : "row" }}>
                <button style={s.btnBack} onClick={() => navigate("/")}>Buscar autos</button>
                <button style={s.btn} onClick={() => navigate("/publish")}>Publicar mi auto</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
