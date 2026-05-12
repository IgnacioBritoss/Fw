import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateMe } from "../../services/api";

export default function CompleteProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName:"", lastName:"", phone:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const s = {
    page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
    card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
    label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
    input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827" },
    btn: { width:"100%", padding:13, background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },
    error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) { setError("Ingresá tu nombre."); return; }
    setLoading(true);
    setError("");
    const name = `${form.firstName} ${form.lastName}`.trim();
    try { await updateMe({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }); } catch {}
    const updated = { ...user, name, firstName: form.firstName, lastName: form.lastName, phone: form.phone };
    localStorage.setItem("fw_user", JSON.stringify(updated));
    login(updated);
    setLoading(false);
    navigate("/");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 }}>Completá tu perfil</div>
        <div style={{ color:"#6b7280", fontSize:14, marginBottom:24, lineHeight:1.6 }}>
          Un último paso antes de empezar a usar Freewheel.
        </div>
        {error && <div style={s.error}>{error}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div>
            <label style={s.label}>Nombre *</label>
            <input style={s.input} placeholder="Juan" value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label style={s.label}>Apellido</label>
            <input style={s.input} placeholder="García" value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={s.label}>Teléfono (opcional)</label>
          <input style={s.input} placeholder="1134567890" value={form.phone} maxLength={11}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,"") }))} />
        </div>
        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Guardando..." : "Entrar a Freewheel"}
        </button>
      </div>
    </div>
  );
}