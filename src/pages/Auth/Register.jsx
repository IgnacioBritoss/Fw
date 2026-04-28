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
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-0.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28 },
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
  grid2Mobile: { display:"grid", gridTemplateColumns:"1fr", gap:0 },
  btn: { width:"100%", padding:"13px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:700,
    cursor:"pointer", letterSpacing:"-.2px" },
  btnDisabled: { opacity:0.6, cursor:"not-allowed" },
  btnFill: { width:"100%", padding:"10px", background:"#f0f7f2",
    color:"#1a4d2e", border:"1.5px solid #bbf7d0", borderRadius:8,
    fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10 },
  loginLink: { textAlign:"center", marginTop:18, fontSize:13, color:"#6b7280" },
  error: { background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8,
    padding:"10px 14px", color:"#b91c1c", fontSize:13, marginBottom:16 },
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", password:"", confirmPassword:"",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await register({
      name: `${form.firstName} ${form.lastName}`.trim(),
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    navigate("/");
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.cardMobile : s.card}>
        <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>
          Crear cuenta en Freewheel
        </div>
        <div style={s.sub}>Completá tus datos para empezar</div>

        {error && <div style={s.error}>{error}</div>}

        <button
          onClick={() => setForm({
            firstName:"Juan", lastName:"García",
            email:"juan@test.com", password:"test123",
            confirmPassword:"test123",
          })}
          style={s.btnFill}
        >
          Rellenar datos de prueba
        </button>

        <div style={s.section}>Datos personales</div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Nombre *</label>
            <input style={s.input} placeholder="Juan"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Apellido</label>
            <input style={s.input} placeholder="García"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Email *</label>
          <input style={s.input} type="email" placeholder="juan@email.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)} />
        </div>

        <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
            <label style={s.label}>Contraseña * (mín. 6 caracteres)</label>
            <input style={s.input} type="password" placeholder="••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirmar contraseña *</label>
            <input style={s.input} type="password" placeholder="••••••"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)} />
          </div>
        </div>

        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </button>

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