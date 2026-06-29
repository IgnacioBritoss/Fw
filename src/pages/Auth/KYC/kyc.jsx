import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const STEPS = ["Identidad", "Licencia", "Confirmación"];

const CheckIcon = ({ color = "#fff", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

function PhotoSlot({ label, hint, value, onChange, isMobile }) {
  return (
    <div
      onClick={() => document.getElementById(`kyc-${label}`).click()}
      style={{
        flex: 1, minWidth: isMobile ? "100%" : 0,
        aspectRatio: "4/3", borderRadius: 12, cursor: "pointer",
        border: value ? "2px solid #2563eb" : "2px dashed #d1d5db",
        background: value ? "#000" : "#f9fafb",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", transition: "all .15s",
      }}
    >
      <input
        id={`kyc-${label}`}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) onChange(URL.createObjectURL(f)); e.target.value = ""; }}
      />
      {value ? (
        <>
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckIcon size={13} />
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.55)", padding: "6px 10px" }}>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{label}</div>
          </div>
        </>
      ) : (
        <>
          <UploadIcon />
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 8 }}>{label}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, textAlign: "center", padding: "0 8px" }}>{hint}</div>
        </>
      )}
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
  const [licenceFront, setLicenceFront] = useState(null);
  const [licenceBack, setLicenceBack] = useState(null);
  const [error, setError] = useState("");

  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "Usuario";

  const validateStep = () => {
    if (step === 0) {
      if (!dniFront || !dniBack || !selfie) {
        setError("Subí las 3 fotos para continuar.");
        return false;
      }
    }
    if (step === 1) {
      if (!licenceFront) {
        setError("Subí al menos el frente de tu licencia.");
        return false;
      }
    }
    setError("");
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const tips = ["Buena iluminación", "Sin cortes ni reflejos", "JPG o PNG hasta 5MB"];

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>
          <span style={{ color: "#111827" }}>Free</span><span style={{ color: "#2563eb" }}>wheel</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".08em" }}>
          {step < 2 ? "VERIFICACIÓN DE IDENTIDAD" : "VERIFICACIÓN COMPLETA"}
        </div>
        <button style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          ¿Necesitás ayuda?
        </button>
      </div>

      {/* Stepper */}
      <div style={{ background: "#fff", padding: "20px 24px 0", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", paddingBottom: 20 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13, transition: "all .3s",
                  background: i < step ? "#16a34a" : i === step ? "#2563eb" : "#e5e7eb",
                  color: i <= step ? "#fff" : "#9ca3af",
                  boxShadow: i === step ? "0 0 0 4px #dbeafe" : "none",
                }}>
                  {i < step ? <CheckIcon /> : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: i === step ? "#2563eb" : i < step ? "#16a34a" : "#9ca3af" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: "0 8px", marginBottom: 18, background: i < step ? "#16a34a" : "#e5e7eb", borderRadius: 2, transition: "background .3s" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "20px 16px" : "32px 24px" }}>

        {/* PASO 0: IDENTIDAD */}
        {step === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: isMobile ? "24px 16px" : "32px 36px", width: "100%", maxWidth: 560, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Verificá tu identidad</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>Necesitamos confirmar quién sos. Tus datos están encriptados y protegidos.</div>

            {error && <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row", marginBottom: 20 }}>
              <PhotoSlot label="Frente del DNI" hint="Cara visible, sin reflejo" value={dniFront} onChange={setDniFront} isMobile={isMobile} />
              <PhotoSlot label="Dorso del DNI" hint="Número y fecha legibles" value={dniBack} onChange={setDniBack} isMobile={isMobile} />
              <PhotoSlot label="Selfie con DNI" hint="Sostenél el DNI junto a tu cara" value={selfie} onChange={setSelfie} isMobile={isMobile} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Consejos para tus fotos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tips.map(t => (
                  <span key={t} style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>
                    ✦ {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Tus datos están cifrados con AES-256 y solo los usamos para validar tu identidad.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => navigate("/")} style={{ flex: 1, padding: "12px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={next} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 1: LICENCIA */}
        {step === 1 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: isMobile ? "24px 16px" : "32px 36px", width: "100%", maxWidth: 560, boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Licencia de conducir</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>Subí tu licencia de conducir vigente. Necesitamos verificar que estés habilitado para manejar.</div>

            {error && <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row", marginBottom: 20 }}>
              <PhotoSlot label="Frente de la licencia" hint="Datos y foto visibles" value={licenceFront} onChange={setLicenceFront} isMobile={isMobile} />
              <PhotoSlot label="Dorso de la licencia" hint="Categorías y vencimiento" value={licenceBack} onChange={setLicenceBack} isMobile={isMobile} />
            </div>

            <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 24, lineHeight: 1.6 }}>
              Tu licencia debe estar vigente. Si está vencida no podrás alquilar vehículos.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setError(""); setStep(0); }} style={{ flex: 1, padding: "12px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
                ← Atrás
              </button>
              <button onClick={next} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CONFIRMACIÓN */}
        {step === 2 && (
          <div style={{ width: "100%", maxWidth: 500 }}>
            {/* Card hero */}
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.12)", marginBottom: 0 }}>
              <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)", padding: "40px 32px 32px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 16px rgba(0,0,0,.15)" }}>
                  <CheckIcon color="#16a34a" size={36} />
                </div>
                <div style={{ background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".1em", padding: "4px 16px", borderRadius: 20, display: "inline-block", marginBottom: 0 }}>
                  CUENTA VERIFICADA
                </div>
              </div>

              <div style={{ background: "#fff", padding: "28px 32px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
                  ¡Todo listo, {firstName}!
                </div>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.7 }}>
                  Tu identidad fue verificada correctamente. Ya podés empezar a alquilar autos o publicar el tuyo.
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                  {["Identidad verificada", "Conductor habilitado", "Perfil protegido"].map(label => (
                    <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                      <CheckIcon color="#16a34a" size={11} /> {label}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => navigate("/")}
                    style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}
                  >
                    Buscar autos
                  </button>
                  <button
                    onClick={() => navigate("/publish")}
                    style={{ flex: 1, padding: "13px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    Publicar mi auto
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14 }}>
                  Consejo: Completá tu perfil para aumentar tus chances de aceptación.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}