import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GOOGLE_AUTH_URL } from "../../services/api";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const EyeOpen = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

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

// Tarjeta de foto horizontal (estilo del diseño)
function PhotoCard({ label, hint, value, onChange }) {
  const id = `reg-${label.replace(/\s+/g, "-").toLowerCase()}`;
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

export default function Register() {
  const { register, verifyEmail, resendVerification, user, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = datos, 1 = verificar email, 2 = identidad, 3 = licencia, 4 = confirmación

  // Guarda el estado de verificación (localStorage + contexto), tolerante a user null
  const persistVerification = (patch) => {
    let base = user;
    if (!base) { try { base = JSON.parse(localStorage.getItem("fw_user") || "{}"); } catch { base = {}; } }
    const updated = { ...base, ...patch };
    localStorage.setItem("fw_user", JSON.stringify(updated));
    if (login) login(updated);
  };
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", phone:"", password:"", confirmPassword:"", acceptedTerms:false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verificación de email
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [dniFront, setDniFront] = useState(null);
  const [dniBack, setDniBack] = useState(null);
  const [licFront, setLicFront] = useState(null);
  const [licBack, setLicBack] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) { setError("Completá todos los campos obligatorios."); return; }
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (form.password !== form.confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    if (!form.acceptedTerms) { setError("Debés aceptar los términos y condiciones."); return; }
    setLoading(true); setError("");
    const result = await register({ name:`${form.firstName} ${form.lastName}`.trim(), email:form.email, password:form.password, acceptedTerms:form.acceptedTerms });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setStep(1); // ← primero verificar el email (código que llega al mail)
  };

  // Paso 1: verificar el código que llegó al email
  const handleVerifyEmail = async () => {
    if (code.length !== 6) { setError("El código tiene 6 dígitos."); return; }
    setVerifying(true); setError(""); setInfo("");
    const result = await verifyEmail(code);
    setVerifying(false);
    if (!result.success) { setError(result.error || "Código incorrecto."); return; }
    setStep(2); // ← email verificado, sigue el KYC (DNI / licencia)
  };

  const handleResend = async () => {
    setResending(true); setError(""); setInfo("");
    const result = await resendVerification();
    setResending(false);
    if (result.success) setInfo("Te enviamos un nuevo código. Revisá tu bandeja (y el spam).");
    else setError(result.error || "No se pudo reenviar el código.");
  };

  const inputStyle = { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827", boxSizing:"border-box" };
  const labelStyle = { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:6 };
  const btnPrimary = { padding:"12px 22px", background:"#2563eb", color:"#fff", border:"none", borderRadius:24, fontSize:14, fontWeight:700, cursor:"pointer" };
  const btnGhost = { padding:"12px 22px", background:"#fff", color:"#374151", border:"1.5px solid #e5e7eb", borderRadius:24, fontSize:14, fontWeight:600, cursor:"pointer" };

  // ─────────────── PASO 0: REGISTRO (diseño original) ───────────────
  if (step === 0) {
    return (
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 64px", background:"#fff", overflowY:"auto" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            <Link to="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none", marginBottom:32 }}>
              <Logo />
            </Link>

            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:26, fontWeight:800, color:"#111827", letterSpacing:"-0.5px", marginBottom:6 }}>Creá tu cuenta<br/>en un minuto.</h2>
              <p style={{ fontSize:14, color:"#6b7280" }}>
                ¿Ya tenés cuenta?{" "}
                <Link to="/login" style={{ color:"#2563eb", fontWeight:600, textDecoration:"none" }}>Iniciá sesión →</Link>
              </p>
            </div>

            {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:20 }}>{error}</div>}

            <button onClick={() => window.location.href = GOOGLE_AUTH_URL} style={{
              width:"100%", padding:"11px 16px", background:"#fff", border:"1.5px solid #e5e7eb",
              borderRadius:10, fontSize:14, fontWeight:600, color:"#374151", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:20,
            }}>
              <GoogleIcon /> Continuar con Google
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:"#f3f4f6" }}/><span style={{ fontSize:12, color:"#9ca3af" }}>o registrate con email</span><div style={{ flex:1, height:1, background:"#f3f4f6" }}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input style={inputStyle} placeholder="Martin" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Apellido</label>
                <input style={inputStyle} placeholder="García" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" placeholder="martin@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} placeholder="+54 9 11 2345 6789" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Contraseña *</label>
                <div style={{ position:"relative" }}>
                  <input type={showPassword?"text":"password"} placeholder="••••••" value={form.password}
                    onChange={e => set("password", e.target.value)} style={{ ...inputStyle, paddingRight:40 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:0 }}>
                    {showPassword ? <EyeClosed/> : <EyeOpen/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirmar contraseña *</label>
                <div style={{ position:"relative" }}>
                  <input type={showConfirm?"text":"password"} placeholder="••••••" value={form.confirmPassword}
                    onChange={e => set("confirmPassword", e.target.value)} style={{ ...inputStyle, paddingRight:40 }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:0 }}>
                    {showConfirm ? <EyeClosed/> : <EyeOpen/>}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:24 }}>
              <input type="checkbox" id="terms" checked={form.acceptedTerms} onChange={e => set("acceptedTerms", e.target.checked)}
                style={{ marginTop:3, width:16, height:16, accentColor:"#2563eb", cursor:"pointer", flexShrink:0 }} />
              <label htmlFor="terms" style={{ fontSize:13, color:"#374151", lineHeight:1.6, cursor:"pointer" }}>
                Acepto los{" "}
                <Link to="/terms" target="_blank" style={{ color:"#2563eb", fontWeight:600, textDecoration:"none" }}>términos y condiciones</Link>
                {" "}y la política de privacidad de Freewheel *
              </label>
            </div>

            <button onClick={handleSubmit} disabled={loading} style={{
              width:"100%", padding:13, background:"#2563eb", color:"#fff", border:"none", borderRadius:10,
              fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1,
            }}>
              {loading ? "Creando cuenta..." : "Continuar →"}
            </button>
          </div>
        </div>

        <div style={{
          flex:"0 0 42%", background:"linear-gradient(160deg,#0a0f1e 0%,#0d1525 60%,#0f1e3d 100%)",
          display:"flex", flexDirection:"column", justifyContent:"center", padding:"48px 52px", position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse at 70% 40%,rgba(37,99,235,.18) 0%,transparent 60%)" }} />
          <div style={{ position:"relative" }}>
            <h2 style={{ fontSize:36, fontWeight:800, color:"#fff", lineHeight:1.15, letterSpacing:"-1px", marginBottom:16 }}>
              La plataforma para<br/>alquilar autos entre<br/>personas, verificada,<br/>segura y sin multas.
            </h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,.55)", lineHeight:1.7 }}>
              Conectamos conductores con dueños de autos. Todo verificado, todo seguro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────── PASO 1: VERIFICAR EMAIL ───────────────
  if (step === 1) {
    return (
      <div style={{ minHeight:"100vh", background:"#ececec", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", background:"#fff", borderBottom:"1px solid #ececec" }}>
          <Logo />
          <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", letterSpacing:".08em" }}>VERIFICÁ TU EMAIL</div>
          <div style={{ fontSize:13, color:"#2563eb", fontWeight:600, cursor:"pointer" }}>¿Necesitás ayuda?</div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:420, background:"#fff", borderRadius:18, padding:32, boxShadow:"0 4px 24px rgba(0,0,0,.06)", textAlign:"center", border:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:46, marginBottom:8 }}>📧</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 }}>Verificá tu email</h2>
            <p style={{ fontSize:14, color:"#6b7280", marginBottom:24, lineHeight:1.6 }}>
              Te enviamos un código de 6 dígitos a <strong>{form.email}</strong>.<br/>Ingresalo para activar tu cuenta.
            </p>

            {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 }}>{error}</div>}
            {info && <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"10px 14px", color:"#1e40af", fontSize:13, marginBottom:16 }}>{info}</div>}

            <input
              style={{ width:"100%", padding:"14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:28, fontWeight:700, letterSpacing:12, textAlign:"center", outline:"none", color:"#111827", marginBottom:20, boxSizing:"border-box" }}
              type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyEmail()}
            />

            <button onClick={handleVerifyEmail} disabled={verifying}
              style={{ width:"100%", padding:13, background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:verifying?"not-allowed":"pointer", opacity:verifying?0.6:1, marginBottom:12 }}>
              {verifying ? "Verificando..." : "Verificar código"}
            </button>

            <div style={{ fontSize:13, color:"#6b7280" }}>
              ¿No te llegó?{" "}
              <button onClick={handleResend} disabled={resending}
                style={{ background:"none", border:"none", color:"#2563eb", fontWeight:600, fontSize:13, cursor:"pointer", padding:0, opacity:resending?0.5:1 }}>
                {resending ? "Enviando..." : "Reenviar código"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────── PASOS 2-4: VERIFICACIÓN KYC (diseño del Figma) ───────────────
  const kycStepIndex = step - 2; // 0=Identidad, 1=Licencia, 2=Confirmación
  const headerLabel = step === 2 ? "VERIFICACIÓN DE IDENTIDAD" : step === 3 ? "VERIFICACIÓN DE LICENCIA" : "VERIFICACIÓN COMPLETA";

  return (
    <div style={{ minHeight:"100vh", background:"#ececec", display:"flex", flexDirection:"column" }}>
      {/* Barra superior */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", background:"#fff", borderBottom:"1px solid #ececec" }}>
        <Logo />
        <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", letterSpacing:".08em" }}>{headerLabel}</div>
        <div style={{ fontSize:13, color:"#2563eb", fontWeight:600, cursor:"pointer" }}>¿Necesitás ayuda?</div>
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
          {/* PASO 2: IDENTIDAD */}
          {step === 2 && (
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
                <button style={btnGhost} onClick={() => navigate("/")}>Cancelar</button>
                <button style={{ ...btnPrimary, opacity:(dniFront && dniBack) ? 1 : 0.5, cursor:(dniFront && dniBack) ? "pointer" : "not-allowed" }}
                  disabled={!(dniFront && dniBack)} onClick={() => { persistVerification({ dniVerified: true }); setStep(3); }}>Continuar →</button>
              </div>
              <button style={{ display:"block", width:"100%", marginTop:16, padding:6, background:"none", border:"none", color:"#9ca3af", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"center", textDecoration:"underline" }}
                onClick={() => setStep(3)}>Omitir este paso · verificar después desde Ajustes</button>
            </>
          )}

          {/* PASO 3: LICENCIA */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:4 }}>Tu licencia de conducir</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>Subí ambos lados de tu licencia vigente.</p>
              <div style={{ display:"flex", gap:16, marginBottom:24 }}>
                <PhotoCard label="Frente de la licencia" hint="Foto y datos visibles" value={licFront} onChange={setLicFront} />
                <PhotoCard label="Dorso de la licencia" hint="Categorías y vencimiento" value={licBack} onChange={setLicBack} />
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>🔒 Tus datos están cifrados con AES-256 y solo los usamos para validar tu licencia.</div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
                <button style={btnGhost} onClick={() => setStep(2)}>Atrás</button>
                <button style={{ ...btnPrimary, opacity:(licFront && licBack) ? 1 : 0.5, cursor:(licFront && licBack) ? "pointer" : "not-allowed" }}
                  disabled={!(licFront && licBack)} onClick={() => { persistVerification({ licenseVerified: true }); setStep(4); }}>Finalizar →</button>
              </div>
              <button style={{ display:"block", width:"100%", marginTop:16, padding:6, background:"none", border:"none", color:"#9ca3af", fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"center", textDecoration:"underline" }}
                onClick={() => setStep(4)}>Omitir este paso · verificar después desde Ajustes</button>
            </>
          )}

          {/* PASO 4: CONFIRMACIÓN */}
          {step === 4 && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:6 }}>¡Todo listo{form.firstName ? `, ${form.firstName}` : ""}!</h2>
              <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>{(user?.dniVerified && user?.licenseVerified) ? "Tu cuenta quedó verificada. Ya podés usar Freewheel." : "Ya podés usar Freewheel. Verificá lo que falte cuando quieras desde Ajustes."}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:320, margin:"0 auto" }}>
                {[["DNI", user?.dniVerified], ["Licencia de conducir", user?.licenseVerified]].map(([lbl, ok]) => (
                  <div key={lbl} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, fontWeight:600, color: ok ? "#166534" : "#9a3412", background: ok ? "#f0fdf4" : "#fff7ed", border:`1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`, borderRadius:8, padding:"8px 12px" }}>
                    <span>{lbl}</span><span>{ok ? "Validado" : "Pendiente"}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:24 }}>
                <button style={btnGhost} onClick={() => navigate("/")}>Buscar autos</button>
                <button style={btnPrimary} onClick={() => navigate("/publish")}>Publicar mi auto</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
