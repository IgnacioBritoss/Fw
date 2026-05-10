import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { GOOGLE_AUTH_URL } from "../../services/api";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  pageMobile: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px" },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  cardMobile: { background:"#fff", borderRadius:16, padding:"28px 20px", width:"100%", boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:24, fontWeight:800, color:"#111827", letterSpacing:"-0.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:24 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827" },
  btn: { width:"100%", padding:13, background:"#1a4d2e", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  btnGoogle: { width:"100%", padding:"11px", background:"#fff", color:"#374151", border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16 },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  footer: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  forgotLink: { display:"block", textAlign:"right", fontSize:12, color:"#1a4d2e", marginTop:4, marginBottom:4, textDecoration:"none" },
  divider: { display:"flex", alignItems:"center", gap:12, margin:"16px 0" },
  dividerLine: { flex:1, height:1, background:"#f3f4f6" },
  dividerText: { fontSize:12, color:"#9ca3af" },
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function Login() {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Completá todos los campos."); return; }
    setLoading(true);
    setError("");
    const result = await loginWithCredentials(form.email, form.password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    navigate("/");
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.cardMobile : s.card}>
        <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>
          Bienvenido de vuelta
        </div>
        <div style={s.sub}>Iniciá sesión en Freewheel</div>

        {error && <div style={s.error}>{error}</div>}

        <button style={s.btnGoogle} onClick={() => window.location.href = GOOGLE_AUTH_URL}>
          <GoogleIcon /> Continuar con Google
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>o con email y contraseña</span>
          <div style={s.dividerLine} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="tu@email.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" placeholder="Tu contraseña"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          <Link to="/forgot-password" style={s.forgotLink}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={handleSubmit} disabled={loading}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <div style={s.footer}>
          ¿No tenés cuenta?{" "}
          <Link to="/register" style={{ color:"#1a4d2e", fontWeight:600 }}>
            Registrate gratis
          </Link>
        </div>
      </div>
    </div>
  );
}