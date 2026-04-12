import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex",
    alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px",
    width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-0.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:13, fontWeight:500,
    color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8,
    border:"1.5px solid #e5e7eb", fontSize:14, outline:"none",
    color:"#111827", transition:"border .15s" },
  btn: { width:"100%", padding:13, background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:700,
    cursor:"pointer", letterSpacing:"-.2px" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8,
    padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  adminHint: { background:"#f0f7f2", border:"1.5px solid #bbf7d0",
    borderRadius:8, padding:"10px 14px", fontSize:12,
    color:"#1a4d2e", marginBottom:16 },
  footer: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  divider: { display:"flex", alignItems:"center", gap:12, margin:"20px 0" },
  dividerLine: { flex:1, height:1, background:"#f3f4f6" },
  dividerText: { fontSize:12, color:"#9ca3af" },
};

export default function Login() {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!form.email || !form.password) {
      setError("Completá todos los campos.");
      return;
    }
    const result = loginWithCredentials(form.email, form.password);
    if (!result.success) { setError(result.error); return; }
    const savedUser = JSON.parse(localStorage.getItem("fw_user"));
    if (savedUser?.role === "admin") navigate("/admin");
    else navigate("/");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Bienvenido de vuelta</div>
        <div style={s.sub}>Iniciá sesión en Freewheel</div>

        <div style={s.adminHint}>
          Acceso admin: <strong>admin@freewheel.com</strong> / <strong>admin123</strong>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="tu@email.com"
            value={form.email}
            onChange={e => setForm(f => ({...f, email:e.target.value}))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" placeholder="Tu contraseña"
            value={form.password}
            onChange={e => setForm(f => ({...f, password:e.target.value}))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <button style={s.btn} onClick={handleSubmit}>Iniciar sesión</button>

        <div style={s.divider}>
          <div style={s.dividerLine}/>
          <span style={s.dividerText}>o</span>
          <div style={s.dividerLine}/>
        </div>

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