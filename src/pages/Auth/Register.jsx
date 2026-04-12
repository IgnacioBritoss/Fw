import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex",
    alignItems:"center", justifyContent:"center", padding:24 },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px",
    width:"100%", maxWidth:520, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  header: { marginBottom:28 },
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-0.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14 },
  section: { fontSize:12, fontWeight:700, color:"#1a4d2e",
    textTransform:"uppercase", letterSpacing:".06em",
    marginBottom:12, marginTop:24 },
  field: { marginBottom:14 },
  label: { display:"block", fontSize:13, fontWeight:500,
    color:"#374151", marginBottom:5 },
  input: { width:"100%", padding:"11px 14px", borderRadius:8,
    border:"1.5px solid #e5e7eb", fontSize:14, outline:"none",
    transition:"border .15s", color:"#111827" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  roleRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 },
  roleCard: { padding:"14px", border:"1.5px solid #e5e7eb",
    borderRadius:10, cursor:"pointer", textAlign:"center", transition:".15s" },
  roleCardActive: { borderColor:"#1a4d2e", background:"#f0f7f2" },
  roleLabel: { fontSize:13, fontWeight:700, color:"#111827", marginBottom:2 },
  roleSub: { fontSize:11, color:"#6b7280" },
  uploadArea: { border:"1.5px dashed #d1d5db", borderRadius:8,
    padding:"14px 16px", cursor:"pointer", textAlign:"center",
    background:"#f9fafb", transition:".15s" },
  uploadLabel: { fontSize:13, fontWeight:500, color:"#374151", marginBottom:2 },
  uploadSub: { fontSize:11, color:"#9ca3af" },
  uploadDone: { fontSize:12, color:"#1a4d2e", fontWeight:600, marginTop:4 },
  termsRow: { display:"flex", gap:8, alignItems:"flex-start", marginBottom:20 },
  termsText: { fontSize:12, color:"#6b7280", lineHeight:1.6 },
  termsLink: { color:"#1a4d2e", cursor:"pointer", textDecoration:"underline" },
  btn: { width:"100%", padding:"13px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:700,
    cursor:"pointer", letterSpacing:"-.2px" },
  loginLink: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8,
    padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.5)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal: { background:"#fff", borderRadius:14, padding:28, maxWidth:460,
    width:"90%", maxHeight:"80vh", overflow:"auto" },
  modalTitle: { fontSize:18, fontWeight:700, marginBottom:12 },
  modalBody: { fontSize:13, color:"#374151", lineHeight:1.7, marginBottom:20 },
  modalBtn: { padding:"10px 24px", background:"#1a4d2e", color:"#fff",
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
          No somos responsables directos por daños durante el alquiler.<br/><br/>
          <strong>2. Verificación de identidad</strong><br/>
          Todos los usuarios deben completar la verificación de identidad con DNI
          y licencia de conducir antes de realizar o publicar reservas.<br/><br/>
          <strong>3. Pagos y garantías</strong><br/>
          Los pagos se procesan a través de Mercado Pago. Freewheel retiene una
          comisión del 10% sobre cada alquiler. El depósito de garantía se devuelve
          automáticamente si no hay daños.<br/><br/>
          <strong>4. Cancelaciones</strong><br/>
          Las cancelaciones con más de 48hs de anticipación son gratuitas.
          Las cancelaciones tardías pueden generar penalidades.<br/><br/>
          <strong>5. Reputación</strong><br/>
          Ambas partes pueden calificarse mutuamente luego de cada alquiler.
          Las calificaciones son permanentes y visibles públicamente.<br/><br/>
          <strong>6. Privacidad</strong><br/>
          Tus datos personales y documentación son tratados con confidencialidad
          y solo se usan para verificar tu identidad dentro de la plataforma.
        </div>
        <button style={s.modalBtn} onClick={onClose}>Entendido, cerrar</button>
      </div>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    role: "renter", dni: "", licencia: "",
  });
  const [dniFile, setDniFile] = useState(null);
  const [licenciaFile, setLicenciaFile] = useState(null);
  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "dni") setDniFile(file);
    else setLicenciaFile(file);
  };

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.password || !form.phone) {
      return setError("Completá todos los campos obligatorios.");
    }
    if (!form.dni) return setError("Ingresá tu número de DNI.");
    if (form.role === "renter" && !form.licencia) {
      return setError("Ingresá tu número de licencia de conducir.");
    }
    if (form.password.length < 8) {
      return setError("La contraseña debe tener al menos 8 caracteres.");
    }
    if (form.password !== form.confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }
    if (!terms) return setError("Tenés que aceptar los términos y condiciones.");
    register({
      ...form,
      dniVerified: false,
      licenciaVerified: false,
    });
    navigate("/");
  };

  return (
    <div style={s.page}>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.title}>Crear cuenta en Freewheel</div>
          <div style={s.sub}>Completá tus datos para empezar</div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.section}>Datos personales</div>
        <div style={s.field}>
          <label style={s.label}>Nombre completo *</label>
          <input style={s.input} placeholder="Juan García"
            value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Email *</label>
            <input style={s.input} type="email" placeholder="juan@email.com"
              value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Teléfono *</label>
            <input style={s.input} placeholder="11 1234-5678"
              value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
        </div>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Contraseña *</label>
            <input style={s.input} type="password" placeholder="Mínimo 8 caracteres"
              value={form.password} onChange={e => set("password", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirmar contraseña *</label>
            <input style={s.input} type="password" placeholder="Repetí la contraseña"
              value={form.confirmPassword}
              onChange={e => set("confirmPassword", e.target.value)} />
          </div>
        </div>

        <div style={s.section}>Tipo de cuenta</div>
        <div style={s.roleRow}>
          <div style={{...s.roleCard,...(form.role==="renter"?s.roleCardActive:{})}}
            onClick={() => set("role","renter")}>
            <div style={s.roleLabel}>Quiero alquilar</div>
            <div style={s.roleSub}>Busco autos disponibles</div>
          </div>
          <div style={{...s.roleCard,...(form.role==="owner"?s.roleCardActive:{})}}
            onClick={() => set("role","owner")}>
            <div style={s.roleLabel}>Tengo un auto</div>
            <div style={s.roleSub}>Quiero publicarlo</div>
          </div>
        </div>

        <div style={s.section}>Documentación</div>
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Número de DNI *</label>
            <input style={s.input} placeholder="12.345.678"
              value={form.dni} onChange={e => set("dni", e.target.value)} />
          </div>
          {form.role === "renter" && (
            <div style={s.field}>
              <label style={s.label}>Número de licencia *</label>
              <input style={s.input} placeholder="Nro. de licencia"
                value={form.licencia}
                onChange={e => set("licencia", e.target.value)} />
            </div>
          )}
        </div>

        <div style={s.field}>
  <label style={s.label}>Foto del DNI (frente)</label>
  <div style={s.uploadArea} onClick={() => document.getElementById('dni-input').click()}>
    <input id="dni-input" type="file" accept="image/*" style={{ display:"none" }}
      onChange={e => handleFileChange(e, "dni")} />
    <div style={s.uploadLabel}>Subir foto del DNI</div>
    <div style={s.uploadSub}>JPG o PNG — frente del documento</div>
    {dniFile && <div style={s.uploadDone}>Cargado: {dniFile.name}</div>}
  </div>
</div>

{form.role === "renter" && (
  <div style={s.field}>
    <label style={s.label}>Foto de la licencia de conducir</label>
    <div style={s.uploadArea} onClick={() => document.getElementById('lic-input').click()}>
      <input id="lic-input" type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => handleFileChange(e, "licencia")} />
      <div style={s.uploadLabel}>Subir foto de la licencia</div>
      <div style={s.uploadSub}>JPG o PNG — frente de la licencia</div>
      {licenciaFile && <div style={s.uploadDone}>Cargado: {licenciaFile.name}</div>}
    </div>
  </div>
)}

        <div style={s.termsRow}>
          <input type="checkbox" checked={terms}
            onChange={e => setTerms(e.target.checked)} style={{ marginTop:2 }} />
          <span style={s.termsText}>
            Acepto los{" "}
            <span style={s.termsLink} onClick={() => setShowTerms(true)}>
              términos y condiciones
            </span>{" "}
            de Freewheel, incluyendo la política de verificación de identidad,
            garantías y cancelaciones.
          </span>
        </div>

        <button style={s.btn} onClick={handleSubmit}>Crear mi cuenta</button>
        <div style={s.loginLink}>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" style={{ color:"#1a4d2e", fontWeight:600 }}>
            Iniciá sesión
          </Link>
        </div>
      </div>
    </div>
  );
}