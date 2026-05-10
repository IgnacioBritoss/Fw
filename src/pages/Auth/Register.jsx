import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { GOOGLE_AUTH_URL } from "../../services/api";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  pageMobile: { minHeight:"100vh", background:"#f9fafb", padding:"20px 16px" },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:520, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  cardMobile: { background:"#fff", borderRadius:16, padding:"24px 20px", width:"100%", boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:24, fontWeight:800, color:"#111827", letterSpacing:"-0.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:20 },
  section: { fontSize:12, fontWeight:700, color:"#1a4d2e", textTransform:"uppercase", letterSpacing:".06em", marginBottom:12, marginTop:20 },
  field: { marginBottom:14 },
  label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  grid2Mobile: { display:"grid", gridTemplateColumns:"1fr", gap:0 },
  btn: { width:"100%", padding:"13px", background:"#1a4d2e", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  btnGoogle: { width:"100%", padding:"11px", background:"#fff", color:"#374151", border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16 },
  loginLink: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  divider: { display:"flex", alignItems:"center", gap:12, margin:"16px 0" },
  dividerLine: { flex:1, height:1, background:"#f3f4f6" },
  dividerText: { fontSize:12, color:"#9ca3af" },
  termsRow: { display:"flex", alignItems:"flex-start", gap:10, marginBottom:20, marginTop:8 },
  termsCheck: { marginTop:3, width:16, height:16, accentColor:"#1a4d2e", cursor:"pointer", flexShrink:0 },
  termsText: { fontSize:13, color:"#374151", lineHeight:1.6 },
  passwordWrapper: { position:"relative" },
  eyeBtn: { position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:0, display:"flex", alignItems:"center" },
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const EyeOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", password:"", confirmPassword:"", acceptedTerms:false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!form.acceptedTerms) {
      setError("Debés aceptar los términos y condiciones para continuar.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await register({
      name: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      password: form.password,
      acceptedTerms: form.acceptedTerms,
    });

    setLoading(false);
    if (!result.success) { setError(result.error); return; }

    if (result.emailVerificationRequired) {
      navigate("/verify-email");
    } else {
      navigate("/");
    }
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.cardMobile : s.card}>
        <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>
          Crear cuenta en Freewheel
        </div>
        <div style={s.sub}>Completá tus datos para empezar</div>

        {error && <div style={s.error}>{error}</div>}

        <button style={s.btnGoogle} onClick={() => window.location.href = GOOGLE_AUTH_URL}>
          <GoogleIcon /> Continuar con Google
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>o registrate con email</span>
          <div style={s.dividerLine} />
        </div>

        <div style={s.section}>Datos personales</div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Nombre *</label>
            <input style={s.input} placeholder="Juan" value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Apellido</label>
            <input style={s.input} placeholder="García" value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Email *</label>
          <input style={s.input} type="email" placeholder="juan@email.com"
            value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Contraseña * (mín. 6 caracteres)</label>
            <div style={s.passwordWrapper}>
              <input
                style={{ ...s.input, paddingRight:40 }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirmar contraseña *</label>
            <div style={s.passwordWrapper}>
              <input
                style={{ ...s.input, paddingRight:40 }}
                type={showConfirm ? "text" : "password"}
                placeholder="••••••"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
              />
              <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>
        </div>

        <div style={s.termsRow}>
          <input type="checkbox" style={s.termsCheck} id="terms"
            checked={form.acceptedTerms}
            onChange={(e) => set("acceptedTerms", e.target.checked)} />
          <label htmlFor="terms" style={s.termsText}>
            Acepto los{" "}
            <Link to="/terms" target="_blank" style={{ color:"#1a4d2e", fontWeight:600 }}>
              términos y condiciones
            </Link>{" "}
            y la política de privacidad de Freewheel *
          </label>
        </div>

        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </button>

        <div style={s.loginLink}>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" style={{ color:"#1a4d2e", fontWeight:600 }}>Iniciá sesión</Link>
        </div>
      </div>
    </div>
  );
}