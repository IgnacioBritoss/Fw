import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:24, lineHeight:1.6 },
  label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827", marginBottom:16 },
  btn: { width:"100%", padding:13, background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:16 },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  success: { background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"12px 16px", color:"#1e40af", fontSize:14, marginBottom:16, lineHeight:1.6 },
  back: { textAlign:"center", fontSize:13 },
};

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) { setError("Ingresá tu email."); return; }
    setLoading(true);
    setError("");
    await forgotPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Recuperar contraseña</div>
        <div style={s.sub}>
          Ingresá tu email y te enviamos un link para crear una nueva contraseña.
        </div>

        {error && <div style={s.error}>{error}</div>}

        {sent ? (
          <div style={s.success}>
            ✅ Si ese email está registrado, te enviamos un link de recuperación.<br />
            Revisá tu bandeja de entrada (y el spam).
          </div>
        ) : (
          <>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="tu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onClick={handleSubmit} disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperación"}
            </button>
          </>
        )}

        <div style={s.back}>
          <Link to="/login" style={{ color:"#2563eb", fontWeight:600, fontSize:13 }}>
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}