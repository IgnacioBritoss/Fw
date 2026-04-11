import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex",
    alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px",
    width:"100%", maxWidth:460, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  title: { fontSize:24, fontWeight:700, marginBottom:6, color:"#111827" },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:13, fontWeight:500,
    color:"#374151", marginBottom:6 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8,
    border:"1px solid #d1d5db", fontSize:14, outline:"none" },
  roleRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 },
  roleCard: { padding:"12px 14px", border:"2px solid #e5e7eb",
    borderRadius:10, cursor:"pointer", textAlign:"center", transition:".15s" },
  roleCardActive: { borderColor:"#1d4ed8", background:"#eff6ff" },
  roleIcon: { fontSize:24, marginBottom:4 },
  roleLabel: { fontSize:13, fontWeight:600, color:"#374151" },
  roleSub: { fontSize:11, color:"#6b7280" },
  termsRow: { display:"flex", gap:8, alignItems:"flex-start", marginBottom:20 },
  termsText: { fontSize:13, color:"#6b7280", lineHeight:1.5 },
  termsLink: { color:"#1d4ed8", cursor:"pointer", textDecoration:"underline" },
  btn: { width:"100%", padding:"13px", background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" },
  loginLink: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  error: { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
    padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal: { background:"#fff", borderRadius:14, padding:28, maxWidth:460,
    width:"90%", maxHeight:"80vh", overflow:"auto" },
  modalTitle: { fontSize:18, fontWeight:700, marginBottom:12 },
  modalBody: { fontSize:13, color:"#374151", lineHeight:1.7, marginBottom:20 },
  modalBtn: { padding:"10px 24px", background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:8, cursor:"pointer", fontWeight:600 },
};

function TermsModal({ onClose }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalTitle}>Términos y condiciones de Freewheel</div>
        <div style={s.modalBody}>
          <strong>1. Uso de la plataforma</strong><br/>
          Freewheel actúa como intermediaria entre dueños de vehículos y conductores.
          No somos responsables directos por daños ocurridos durante el alquiler.<br/><br/>
          <strong>2. Verificación de identidad</strong><br/>
          Todos los usuarios deben completar la verificación de identidad (DNI + selfie)
          antes de poder realizar o publicar reservas.<br/><br/>
          <strong>3. Pagos</strong><br/>
          Los pagos se procesan a través de Mercado Pago. Freewheel retiene
          una comisión del 10% sobre cada alquiler.<br/><br/>
          <strong>4. Depósito de garantía</strong><br/>
          Todo alquiler incluye un depósito retenido durante el período de uso.
          Si no hay daños al momento del check-out, el depósito se devuelve automáticamente.<br/><br/>
          <strong>5. Cancelaciones</strong><br/>
          Las cancelaciones con más de 48hs de anticipación son gratuitas.
          Las cancelaciones tardías pueden generar penalidades.<br/><br/>
          <strong>6. Reputación</strong><br/>
          Ambas partes pueden calificarse mutuamente luego de cada alquiler.
          Las calificaciones son permanentes y visibles públicamente.
        </div>
        <button style={s.modalBtn} onClick={onClose}>Entendido, cerrar</button>
      </div>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"renter" });
  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.password) {
      return setError("Completá todos los campos.");
    }
    if (!terms) return setError("Tenés que aceptar los términos y condiciones.");
    if (form.password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    register(form);
    navigate("/");
  };

  return (
    <div style={s.page}>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <div style={s.card}>
        <div style={s.title}>Crear cuenta en Freewheel</div>
        <div style={s.sub}>Empezá a alquilar o a ganar con tu auto</div>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.field}>
          <label style={s.label}>Nombre completo</label>
          <input style={s.input} placeholder="Martina González"
            value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" placeholder="martina@email.com"
            value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Contraseña</label>
          <input style={s.input} type="password" placeholder="Mínimo 8 caracteres"
            value={form.password} onChange={e => set("password", e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>¿Cómo querés usar Freewheel?</label>
          <div style={s.roleRow}>
            <div style={{...s.roleCard,...(form.role==="renter"?s.roleCardActive:{})}}
              onClick={() => set("role","renter")}>
              <div style={s.roleIcon}>🚗</div>
              <div style={s.roleLabel}>Quiero alquilar</div>
              <div style={s.roleSub}>Busco autos disponibles</div>
            </div>
            <div style={{...s.roleCard,...(form.role==="owner"?s.roleCardActive:{})}}
              onClick={() => set("role","owner")}>
              <div style={s.roleIcon}>🔑</div>
              <div style={s.roleLabel}>Tengo un auto</div>
              <div style={s.roleSub}>Quiero publicarlo</div>
            </div>
          </div>
        </div>
        <div style={s.termsRow}>
          <input type="checkbox" checked={terms}
            onChange={e => setTerms(e.target.checked)} style={{marginTop:2}} />
          <span style={s.termsText}>
            Acepto los <span style={s.termsLink}
              onClick={() => setShowTerms(true)}>términos y condiciones</span> de Freewheel,
            incluyendo la política de garantías y cancelaciones.
          </span>
        </div>
        <button style={s.btn} onClick={handleSubmit}>Crear mi cuenta</button>
        <div style={s.loginLink}>
          ¿Ya tenés cuenta? <Link to="/login" style={{color:"#1d4ed8"}}>Iniciá sesión</Link>
        </div>
      </div>
    </div>
  );
}
