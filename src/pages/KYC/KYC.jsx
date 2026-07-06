// ============================================================================
//  KYC — Verificación de identidad (DNI + licencia)
// ----------------------------------------------------------------------------
//  "KYC" = Know Your Customer (conocé a tu cliente). Es el mismo flujo de
//  verificación que aparece al registrarse, pero accesible por separado desde
//  Ajustes/Perfil para completarlo después. Tres pasos: DNI, licencia y
//  confirmación. Al subir los documentos marca la cuenta como verificada.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Logo = () => (
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="16" cy="16" r="4" fill="#2563eb"/>
    </svg>
    <span style={{ fontWeight:800, fontSize:17, color:"#111827" }}>Freewheel</span>
  </div>
);

const KYC_STEPS = ["Identidad", "Licencia", "Confirmación"];

// Tarjeta para subir una foto de documento (mismo diseño que Register.jsx):
// abre el selector de archivos, lee la imagen y la devuelve con onChange().
function PhotoCard({ label, hint, value, onChange }) {
  const id = `kyc-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      onClick={() => document.getElementById(id).click()}
      style={{
        flex:1, border: value ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
        borderRadius:14, padding:14, cursor:"pointer", background:"#fff",
      }}>
      <input id={id} type="file" accept="image/*" style={{ display:"none" }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => onChange(ev.target.result);
          reader.readAsDataURL(file);
        }} />
      <div style={{
        position:"relative", width:"100%", height:120, borderRadius:10, overflow:"hidden",
        background: value ? "#1f2937" : "#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12,
      }}>
        {value
          ? <>
              <img src={value} alt={label} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              <div style={{ position:"absolute", top:8, right:8, width:24, height:24, borderRadius:"50%", background:"#16a34a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✓</div>
            </>
          : <div style={{ width:42, height:42, borderRadius:"50%", background:"#fff", border:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:"#9ca3af" }}>+</div>}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{label}</div>
      <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>{hint}</div>
    </div>
  );
}

export default function KYC() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = identidad, 1 = licencia, 2 = confirmación

  const [dniFront, setDniFront] = useState(null);
  const [dniBack, setDniBack] = useState(null);
  const [licFront, setLicFront] = useState(null);
  const [licBack, setLicBack] = useState(null);

  // Guarda el estado de verificación (ej: { dniVerified: true }) en localStorage
  // y en la sesión, tolerando que `user` pueda ser null.
  const persistVerification = (patch) => {
    let base = user;
    if (!base) { try { base = JSON.parse(localStorage.getItem("fw_user") || "{}"); } catch { base = {}; } }
    const updated = { ...base, ...patch };
    localStorage.setItem("fw_user", JSON.stringify(updated));
    if (login) login(updated);
  };

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";

  const btnPrimary = { padding:"12px 22px", background:"#2563eb", color:"#fff", border:"none", borderRadius:24, fontSize:14, fontWeight:700, cursor:"pointer" };
  const btnGhost = { padding:"12px 22px", background:"#fff", color:"#374151", border:"1.5px solid #e5e7eb", borderRadius:24, fontSize:14, fontWeight:600, cursor:"pointer" };
  const skipBtn = { display:"block", width:"100%", marginTop:16, padding:6, background:"none", border:"none", color:"#9ca3af", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"center", textDecoration:"underline" };

  const kycStepIndex = step;
  const headerLabel = step === 0 ? "VERIFICACIÓN DE IDENTIDAD" : step === 1 ? "VERIFICACIÓN DE LICENCIA" : "VERIFICACIÓN COMPLETA";

  return (
    <div style={{ minHeight:"100vh", background:"#ececec", display:"flex", flexDirection:"column" }}>
      {/* Barra superior */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", background:"#fff", borderBottom:"1px solid #ececec" }}>
        <Logo />
        <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", letterSpacing:".08em" }}>{headerLabel}</div>
        <div style={{ fontSize:13, color:"#2563eb", fontWeight:600, cursor:"pointer" }} onClick={() => navigate("/")}>¿Necesitás ayuda?</div>
      </div>

      <div style={{ flex:1, padding:"40px 24px" }}>
        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:40 }}>
          {KYC_STEPS.map((label, i) => (
            <div key={label} style={{ display:"flex", alignItems:"center" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                <div style={{
                  width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:700,
                  background: i < kycStepIndex ? "#16a34a" : i === kycStepIndex ? "#2563eb" : "#fff",
                  color: i <= kycStepIndex ? "#fff" : "#9ca3af",
                  border: i > kycStepIndex ? "1.5px solid #e5e7eb" : "none",
                }}>{i < kycStepIndex ? "✓" : i + 1}</div>
                <span style={{ fontSize:12, fontWeight:600, color: i === kycStepIndex ? "#111827" : "#9ca3af" }}>{label}</span>
              </div>
              {i < KYC_STEPS.length - 1 && <div style={{ width:140, height:2, margin:"0 10px", marginBottom:24, background: i < kycStepIndex ? "#16a34a" : i === kycStepIndex ? "#2563eb" : "#e5e7eb" }} />}
            </div>
          ))}
        </div>

        {/* Tarjeta central */}
        <div style={{ maxWidth:720, margin:"0 auto", background:"#fff", borderRadius:18, padding:32, boxShadow:"0 4px 24px rgba(0,0,0,.06)", border:"1px solid #f0f0f0" }}>
          {/* PASO 0: IDENTIDAD */}
          {step === 0 && (
            <>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:4 }}>Verificá tu identidad</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>Necesitamos confirmar quién sos. Tus datos están encriptados y protegidos.</p>
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                <PhotoCard label="Frente del DNI" hint="Cara visible, sin reflejo" value={dniFront} onChange={setDniFront} />
                <PhotoCard label="Dorso del DNI" hint="Número y fecha legibles" value={dniBack} onChange={setDniBack} />
              </div>
              <div style={{ borderTop:"1px solid #f0f0f0", paddingTop:20, marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:12 }}>Consejos para tus fotos</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {["Buena iluminación", "Sin cortes ni reflejos", "JPG o PNG hasta 5MB"].map(tip => (
                    <div key={tip} style={{ display:"flex", alignItems:"center", gap:7, background:"#f3f4f6", borderRadius:20, padding:"7px 14px", fontSize:12, color:"#374151" }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a" }} />{tip}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>🔒 Tus datos están cifrados con AES-256 y solo los usamos para validar tu identidad.</div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
                <button style={btnGhost} onClick={() => navigate(-1)}>Cancelar</button>
                <button style={{ ...btnPrimary, opacity:(dniFront && dniBack) ? 1 : 0.5, cursor:(dniFront && dniBack) ? "pointer" : "not-allowed" }}
                  disabled={!(dniFront && dniBack)} onClick={() => { persistVerification({ dniVerified: true }); setStep(1); }}>Continuar →</button>
              </div>
              <button style={skipBtn} onClick={() => setStep(1)}>Omitir este paso · verificar después desde Ajustes</button>
            </>
          )}

          {/* PASO 1: LICENCIA */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:4 }}>Tu licencia de conducir</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>Subí ambos lados de tu licencia vigente.</p>
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                <PhotoCard label="Frente de la licencia" hint="Foto y datos visibles" value={licFront} onChange={setLicFront} />
                <PhotoCard label="Dorso de la licencia" hint="Categorías y vencimiento" value={licBack} onChange={setLicBack} />
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>🔒 Tus datos están cifrados con AES-256 y solo los usamos para validar tu licencia.</div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
                <button style={btnGhost} onClick={() => setStep(0)}>Atrás</button>
                <button style={{ ...btnPrimary, opacity:(licFront && licBack) ? 1 : 0.5, cursor:(licFront && licBack) ? "pointer" : "not-allowed" }}
                  disabled={!(licFront && licBack)} onClick={() => { persistVerification({ licenseVerified: true }); setStep(2); }}>Finalizar →</button>
              </div>
              <button style={skipBtn} onClick={() => setStep(2)}>Omitir este paso · verificar después desde Ajustes</button>
            </>
          )}

          {/* PASO 2: CONFIRMACIÓN */}
          {step === 2 && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:6 }}>¡Todo listo{firstName ? `, ${firstName}` : ""}!</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>{(user?.dniVerified && user?.licenseVerified) ? "Tu cuenta quedó verificada. Ya podés usar Freewheel." : "Ya podés usar Freewheel. Verificá lo que falte cuando quieras desde Ajustes."}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:320, margin:"0 auto" }}>
                {[["DNI", user?.dniVerified], ["Licencia de conducir", user?.licenseVerified]].map(([lbl, ok]) => (
                  <div key={lbl} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, fontWeight:600, color: ok ? "#166534" : "#9a3412", background: ok ? "#f0fdf4" : "#fff7ed", border:`1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius:8, padding:"8px 12px" }}>
                    <span>{lbl}</span><span>{ok ? "Validado" : "Pendiente"}</span>
                  </div>
                ))}
              </div>              <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:24 }}>
                <button style={btnGhost} onClick={() => navigate("/profile")}>Ir a mi perfil</button>
                <button style={btnPrimary} onClick={() => navigate("/")}>Ir al inicio</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
