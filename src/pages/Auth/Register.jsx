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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", phone:"", password:"", confirmPassword:"", acceptedTerms:false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    navigate("/complete-profile");
  };

  const inputStyle = {
    width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb",
    fontSize:14, outline:"none", color:"#111827", boxSizing:"border-box",
  };
  const labelStyle = { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:6 };

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      {/* Left — form */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 64px", background:"#fff", overflowY:"auto" }}>
        <div style={{ width:"100%", maxWidth:480 }}>
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none", marginBottom:32 }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="#2563eb" strokeWidth="2"/>
              <circle cx="16" cy="16" r="4" fill="#2563eb"/>
              {[0,60,120,180,240,300].map((a,i) => { const r=a*Math.PI/180; return <line key={i} x1={16+5*Math.cos(r)} y1={16+5*Math.sin(r)} x2={16+11*Math.cos(r)} y2={16+11*Math.sin(r)} stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>; })}
            </svg>
            <span style={{ fontWeight:800, fontSize:18, color:"#111827" }}>Free<span style={{ color:"#2563eb" }}>wheel</span></span>
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
                  onChange={e => set("password", e.target.value)}
                  style={{ ...inputStyle, paddingRight:40 }} />
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
                  onChange={e => set("confirmPassword", e.target.value)}
                  style={{ ...inputStyle, paddingRight:40 }} />
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
            width:"100%", padding:13, background:"#2563eb", color:"#fff",
            border:"none", borderRadius:10, fontSize:15, fontWeight:700,
            cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1,
          }}>
            {loading ? "Creando cuenta..." : "Crear mi cuenta →"}
          </button>
        </div>
      </div>

      {/* Right — dark hero */}
      <div style={{
        flex:"0 0 42%", background:"linear-gradient(160deg,#0a0f1e 0%,#0d1525 60%,#0f1e3d 100%)",
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"48px 52px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse at 70% 40%,rgba(37,99,235,.18) 0%,transparent 60%)" }} />
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:36, fontWeight:800, color:"#fff", lineHeight:1.15, letterSpacing:"-1px", marginBottom:16 }}>
            La plataforma para<br/>alquilar autos entre<br/>personas, verificada,<br/>segura y sin multas.
          </h2>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.55)", lineHeight:1.7, marginBottom:40 }}>
            Conectamos conductores con dueños de autos. Todo verificado, todo seguro.
          </p>
          <div style={{ display:"flex", gap:40 }}>
            {[["45.000+","Conductores"],["4.9 ★","Calificación"],["24/7","Soporte"]].map(([v,l]) => (
              <div key={l}><div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{v}</div><div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginTop:2 }}>{l}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}