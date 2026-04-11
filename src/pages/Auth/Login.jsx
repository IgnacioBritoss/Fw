import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex",
    alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px",
    width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:24, fontWeight:700, marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:13, fontWeight:500,
    color:"#374151", marginBottom:6 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8,
    border:"1px solid #d1d5db", fontSize:14 },
  btn: { width:"100%", padding:13, background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" },
  error: { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
    padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  footer: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const users = JSON.parse(localStorage.getItem("fw_users") || "[]");
    const found = users.find(u => u.email === form.email && u.password === form.password);
    if (!found) return setError("Email o contraseña incorrectos.");
    login(found);
    navigate("/");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Bienvenido de vuelta 👋</div>
        <div style={s.sub}>Iniciá sesión en Freewheel</div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email"
            value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password"
            value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
        </div>
        <button style={s.btn} onClick={handleSubmit}>Iniciar sesión</button>
        <div style={s.footer}>
          ¿No tenés cuenta? <Link to="/register" style={{color:"#1d4ed8"}}>Registrate</Link>
        </div>
      </div>
    </div>
  );
}
