import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:24 },
  label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827", marginBottom:14 },
  btn: { width:"100%", padding:13, background:"#1a4d2e", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:16 },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  success: { background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:8, padding:"12px 16px", color:"#166534", fontSize:14, marginBottom:16 },
  back: { textAlign:"center", fontSize:13 },
};

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const userId = params.get("uid") ?? "";

  const [form, setForm] = useState({ password:"", confirm:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || !userId) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.error}>Link inválido o expirado.</div>
          <Link to="/forgot-password" style={{ color:"#1a4d2e", fontWeight:600, fontSize:14 }}>
            Solicitá un nuevo link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.password) { setError("Ingresá una nueva contraseña."); return; }
    if (form.password.length < 6) { setError("Mínimo 6 caracteres."); return; }
    if (form.password !== form.confirm) { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    setError("");
    const result = await resetPassword({ token, userId, newPassword: form.password });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setDone(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Nueva contraseña</div>
        <div style={s.sub}>Elegí una contraseña segura para tu cuenta.</div>

        {error && <div style={s.error}>{error}</div>}

        {done ? (
          <div style={s.success}>✅ Contraseña actualizada. Redirigiendo al login...</div>
        ) : (
          <>
            <label style={s.label}>Nueva contraseña</label>
            <input style={s.input} type="password" placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <label style={s.label}>Confirmar contraseña</label>
            <input style={s.input} type="password" placeholder="Repetí la contraseña"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onClick={handleSubmit} disabled={loading}>
              {loading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </>
        )}

        <div style={s.back}>
          <Link to="/login" style={{ color:"#1a4d2e", fontWeight:600 }}>← Volver al login</Link>
        </div>
      </div>
    </div>
  );
}