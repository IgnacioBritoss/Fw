import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", display:"flex",
    alignItems:"center", justifyContent:"center", padding:24 },
  pageMobile: { minHeight:"100vh", background:"#f9fafb", padding:"20px 16px" },
  card: { background:"#fff", borderRadius:16, padding:"40px 36px",
    width:"100%", maxWidth:520, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
  cardMobile: { background:"#fff", borderRadius:16, padding:"24px 20px",
    width:"100%", boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
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
  inputError: { width:"100%", padding:"11px 14px", borderRadius:8,
    border:"1.5px solid #fca5a5", fontSize:14, outline:"none",
    transition:"border .15s", color:"#111827" },
  hint: { fontSize:11, color:"#9ca3af", marginTop:4 },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  grid2Mobile: { display:"grid", gridTemplateColumns:"1fr", gap:0 },
  roleRow: { display:"grid", gridTemplateColumns:"1fr 1fr",
    gap:10, marginBottom:14 },
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

// Validaciones
const VALIDATIONS = {
  name: v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/.test(v.trim()),
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  phone: v => /^[0-9]{10,11}$/.test(v.replace(/\s|-/g, "")),
  password: v => v.length >= 8 && /[0-9]/.test(v) && /[a-zA-Z]/.test(v),
  dni: v => /^[0-9]{7,8}$/.test(v.replace(/\./g, "")),
  licencia: v => /^[a-zA-Z0-9]{6,10}$/.test(v.trim()),
};

const MESSAGES = {
  name: "Solo letras y espacios, mínimo 3 caracteres.",
  email: "Ingresá un email válido (ejemplo@dominio.com).",
  phone: "Ingresá un teléfono válido de 10 u 11 dígitos sin espacios ni guiones.",
  password: "Mínimo 8 caracteres, al menos una letra y un número.",
  dni: "El DNI debe tener 7 u 8 dígitos numéricos.",
  licencia: "La licencia debe tener entre 6 y 10 caracteres alfanuméricos.",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    role: "renter", dni: "", licencia: "",
  });
  const [touched, setTouched] = useState({});
  const [dniFile, setDniFile] = useState(null);
  const [licenciaFile, setLicenciaFile] = useState(null);
  const [terms, setTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const touch = (k) => setTouched(t => ({...t, [k]: true}));

  const isFieldError = (k) => touched[k] && VALIDATIONS[k] && !VALIDATIONS[k](form[k]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === "dni") setDniFile(file);
    else setLicenciaFile(file);
  };

  // Solo permite números en campos numéricos
  const onlyNumbers = (v) => v.replace(/[^0-9]/g, "");

  const handleSubmit = () => {
    setError("");

    if (!VALIDATIONS.name(form.name))
      return setError(MESSAGES.name);
    if (!VALIDATIONS.email(form.email))
      return setError(MESSAGES.email);
    if (!VALIDATIONS.phone(form.phone))
      return setError(MESSAGES.phone);
    if (!VALIDATIONS.password(form.password))
      return setError(MESSAGES.password);
    if (form.password !== form.confirmPassword)
      return setError("Las contraseñas no coinciden.");
    if (!VALIDATIONS.dni(form.dni))
      return setError(MESSAGES.dni);
    if (form.role === "renter" && !VALIDATIONS.licencia(form.licencia))
      return setError(MESSAGES.licencia);
    if (!terms)
      return setError("Tenés que aceptar los términos y condiciones.");

    register({ ...form, dniVerified: false, licenciaVerified: false });
    navigate("/");
  };

  const inputStyle = (k) => isFieldError(k) ? s.inputError : s.input;

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <div style={isMobile ? s.cardMobile : s.card}>
        <div style={s.header}>
          <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>
            Crear cuenta en Freewheel
          </div>
          <div style={s.sub}>Completá tus datos para empezar</div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.section}>Datos personales</div>
        <div style={s.field}>
          <label style={s.label}>Nombre completo *</label>
          <input
            style={inputStyle("name")}
            placeholder="Juan García"
            value={form.name}
            onChange={e => set("name", e.target.value)}
            onBlur={() => touch("name")}
          />
          {isFieldError("name") && <div style={s.hint}>{MESSAGES.name}</div>}
        </div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Email *</label>
            <input
              style={inputStyle("email")}
              type="email"
              placeholder="juan@email.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              onBlur={() => touch("email")}
            />
            {isFieldError("email") && <div style={s.hint}>{MESSAGES.email}</div>}
          </div>
          <div style={s.field}>
            <label style={s.label}>Teléfono * (sin espacios ni guiones)</label>
            <input
              style={inputStyle("phone")}
              placeholder="1134567890"
              value={form.phone}
              maxLength={11}
              onChange={e => set("phone", onlyNumbers(e.target.value))}
              onBlur={() => touch("phone")}
            />
            {isFieldError("phone") && <div style={s.hint}>{MESSAGES.phone}</div>}
          </div>
        </div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Contraseña *</label>
            <input
              style={inputStyle("password")}
              type="password"
              placeholder="Mínimo 8 caracteres, letras y números"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              onBlur={() => touch("password")}
            />
            {isFieldError("password") && <div style={s.hint}>{MESSAGES.password}</div>}
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirmar contraseña *</label>
            <input
              style={touched.confirmPassword && form.password !== form.confirmPassword
                ? s.inputError : s.input}
              type="password"
              placeholder="Repetí la contraseña"
              value={form.confirmPassword}
              onChange={e => set("confirmPassword", e.target.value)}
              onBlur={() => touch("confirmPassword")}
            />
            {touched.confirmPassword && form.password !== form.confirmPassword && (
              <div style={s.hint}>Las contraseñas no coinciden.</div>
            )}
          </div>
        </div>

        <div style={s.section}>Tipo de cuenta</div>
        <div style={s.roleRow}>
          <div style={{...s.roleCard, ...(form.role==="renter" ? s.roleCardActive : {})}}
            onClick={() => set("role","renter")}>
            <div style={s.roleLabel}>Quiero alquilar</div>
            <div style={s.roleSub}>Busco autos disponibles</div>
          </div>
          <div style={{...s.roleCard, ...(form.role==="owner" ? s.roleCardActive : {})}}
            onClick={() => set("role","owner")}>
            <div style={s.roleLabel}>Tengo un auto</div>
            <div style={s.roleSub}>Quiero publicarlo</div>
          </div>
        </div>

        <div style={s.section}>Documentación</div>
        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Número de DNI * (7 u 8 dígitos)</label>
            <input
              style={inputStyle("dni")}
              placeholder="12345678"
              value={form.dni}
              maxLength={8}
              onChange={e => set("dni", onlyNumbers(e.target.value))}
              onBlur={() => touch("dni")}
            />
            {isFieldError("dni") && <div style={s.hint}>{MESSAGES.dni}</div>}
          </div>
          {form.role === "renter" && (
            <div style={s.field}>
              <label style={s.label}>Número de licencia *</label>
              <input
                style={inputStyle("licencia")}
                placeholder="B123456"
                value={form.licencia}
                maxLength={10}
                onChange={e => set("licencia", e.target.value.toUpperCase())}
                onBlur={() => touch("licencia")}
              />
              {isFieldError("licencia") && <div style={s.hint}>{MESSAGES.licencia}</div>}
            </div>
          )}
        </div>

        <div style={s.field}>
          <label style={s.label}>Foto del DNI (frente)</label>
          <div style={s.uploadArea}
            onClick={() => document.getElementById('dni-input').click()}>
            <input id="dni-input" type="file" accept="image/*"
              style={{ display:"none" }}
              onChange={e => handleFileChange(e, "dni")} />
            <div style={s.uploadLabel}>Subir foto del DNI</div>
            <div style={s.uploadSub}>JPG o PNG — frente del documento</div>
            {dniFile && <div style={s.uploadDone}>Cargado: {dniFile.name}</div>}
          </div>
        </div>

        {form.role === "renter" && (
          <div style={s.field}>
            <label style={s.label}>Foto de la licencia de conducir</label>
            <div style={s.uploadArea}
              onClick={() => document.getElementById('lic-input').click()}>
              <input id="lic-input" type="file" accept="image/*"
                style={{ display:"none" }}
                onChange={e => handleFileChange(e, "licencia")} />
              <div style={s.uploadLabel}>Subir foto de la licencia</div>
              <div style={s.uploadSub}>JPG o PNG — frente de la licencia</div>
              {licenciaFile && (
                <div style={s.uploadDone}>Cargado: {licenciaFile.name}</div>
              )}
            </div>
          </div>
        )}

        <div style={s.termsRow}>
          <input type="checkbox" checked={terms}
            onChange={e => setTerms(e.target.checked)}
            style={{ marginTop:2, flexShrink:0 }} />
          <span style={s.termsText}>
            Acepto los{" "}
            <span style={s.termsLink} onClick={() => setShowTerms(true)}>
              términos y condiciones
            </span>{" "}
            de Freewheel, incluyendo la política de verificación de identidad,
            garantías y cancelaciones.
          </span>
        </div>

        <button onClick={() => {
          setForm({
            name:"Ignacio Britos", email:"ignacio@test.com",
            phone:"1134567890", password:"test12345",
            confirmPassword:"test12345", role:"renter",
            dni:"40123456", licencia:"B123456",
          });
          setTouched({});
        }} style={{ width:"100%", padding:"10px", background:"#f0f7f2",
          color:"#1a4d2e", border:"1.5px solid #bbf7d0", borderRadius:8,
          fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10 }}>
          Rellenar datos de prueba
        </button>

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