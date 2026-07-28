// ============================================================================
//  CompleteProfile — Último paso del alta para cuentas de Google (y viejas)
// ----------------------------------------------------------------------------
//  El backend exige la FECHA DE NACIMIENTO de todos los usuarios (la plataforma
//  es solo para mayores de 18) y Google no la informa. Hasta cargarla, la cuenta
//  tiene un token de onboarding y NO una sesión completa.
//
//  Antes esta pantalla solo pedía el teléfono y guardaba la sesión a mano en el
//  navegador: la fecha de nacimiento nunca llegaba al servidor, así que el
//  usuario quedaba trabado en un alta a medio terminar.
//
//  Ahora: fecha de nacimiento (obligatoria) → POST /auth/complete-profile, que
//  devuelve la sesión completa. El teléfono es opcional y se guarda después.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateMe } from "../../services/api";

// Edad exacta a partir de la fecha (YYYY-MM-DD).
function ageFrom(dateString) {
  const birth = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export default function CompleteProfile() {
  const { user, completeProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";

  const s = {
    page: { minHeight:"100vh", background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", padding:24 },
    card: { background:"#fff", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:440, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
    label: { display:"block", fontSize:13, fontWeight:500, color:"#374151", marginBottom:5 },
    input: { width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", color:"#111827", boxSizing:"border-box" },
    btn: { width:"100%", padding:13, background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },
    error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
    hint: { fontSize:12, color:"#9ca3af", marginTop:6 },
  };

  // Guarda la fecha de nacimiento (obligatoria) y, si se cargó, el teléfono.
  const finish = async () => {
    if (!dateOfBirth) { setError("Ingresá tu fecha de nacimiento."); return; }
    const age = ageFrom(dateOfBirth);
    if (age === null) { setError("La fecha no es válida."); return; }
    if (age < 18) { setError("Tenés que ser mayor de 18 años para usar Freewheel."); return; }

    setLoading(true);
    setError("");
    const result = await completeProfile(dateOfBirth);
    if (!result.success) { setLoading(false); setError(result.error); return; }

    // Con la sesión ya completa se puede guardar el teléfono (es opcional: si
    // falla, no bloquea el ingreso).
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone) {
      try { await updateMe({ phone: cleanPhone }); } catch { /* opcional */ }
    }
    await refreshUser();
    setLoading(false);
    navigate("/");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 }}>
          {firstName ? `¡Hola, ${firstName}!` : "Ya casi estás"}
        </div>
        <div style={{ color:"#6b7280", fontSize:14, marginBottom:24, lineHeight:1.6 }}>
          Nos falta un dato para terminar tu cuenta. Freewheel es solo para mayores de 18 años.
        </div>
        {error && <div style={s.error}>{error}</div>}

        <div style={{ marginBottom:20 }}>
          <label style={s.label}>Fecha de nacimiento *</label>
          <input style={s.input} type="date" max={maxBirthDate()} value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)} />
          <div style={s.hint}>Se usa para validar tu edad y no se muestra a otros usuarios.</div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={s.label}>Teléfono (opcional)</label>
          <input style={s.input} placeholder="1134567890" value={phone} maxLength={15}
            onChange={e => setPhone(e.target.value.replace(/\D/g,""))} />
          <div style={s.hint}>Lo vas a necesitar para verificar tu cuenta y poder reservar.</div>
        </div>

        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={finish} disabled={loading}>
          {loading ? "Guardando..." : "Entrar a Freewheel"}
        </button>
      </div>
    </div>
  );
}
