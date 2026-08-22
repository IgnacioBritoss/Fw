// ============================================================================
//  Register — Registro en VARIOS PASOS (asistente / wizard)
// ----------------------------------------------------------------------------
//  El registro del backend tiene DOS pasos y en ese orden:
//    1) se manda un código al email  → todavía NO existe ninguna cuenta
//    2) con el código + los datos    → se crea la cuenta, ya con el email
//                                       verificado, y queda la sesión abierta
//  Antes esta pantalla llamaba a POST /auth/register, una ruta que no existe:
//  de ahí el error "Cannot POST /auth/register". Y creaba la cuenta primero para
//  verificar el email después, al revés de como funciona el servidor.
//
//  Pasos de la pantalla (`step`):
//    0 → datos de la cuenta (incluye fecha de nacimiento: es obligatoria, +18)
//    1 → código de 6 dígitos que llegó al mail → se crea la cuenta
//    2 → verificación de identidad (DNI, licencia y teléfono), se puede omitir
// ============================================================================
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import PhoneInput from "../../components/PhoneInput";
import { buscarPais, isValidPhone, normalizePhone } from "../../services/phone";
import { GOOGLE_AUTH_URL } from "../../services/api";
import IdentityVerification from "../../components/IdentityVerification";
import BrandLogo from "../../components/Logo";
import AuthAside from "../../components/AuthAside";
import LangPicker from "../../components/LangPicker";
import { useI18n } from "../../i18n/core";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const EyeOpen = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Logo = () => <BrandLogo size={17} />;

/** Cuánto ocupa el panel de la foto. Va en dos lados —el panel, que está fijo, y
 *  el margen que le reserva la columna del formulario—, así que se escribe una
 *  sola vez. */
const PANEL = "42%";

// Edad exacta en años a partir de la fecha de nacimiento (YYYY-MM-DD).
function ageFrom(dateString) {
  const birth = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Fecha máxima elegible: hoy menos 18 años (para el selector del navegador).
function maxBirthDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export default function Register() {
  const { t } = useI18n();
  const { isMobile } = useIsMobile();
  const { startRegistration, completeRegistration, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = datos, 1 = código del email, 2 = verificación de identidad

  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", phone:"", phoneCountry:"AR", dateOfBirth:"",
    password:"", confirmPassword:"", acceptedTerms:false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  // Se marca al intentar continuar: recién ahí se muestra el error del teléfono,
  // para no retar a la persona mientras todavía está escribiendo.
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Atajo para actualizar un campo del formulario por su nombre.
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  // Valida los datos del paso 0. Devuelve el mensaje de error, o null si está ok.
  const validateForm = () => {
    if (!form.firstName.trim()) return t("reg.errFirstName");
    if (!form.lastName.trim()) return t("reg.errLastName");
    if (!form.email.trim()) return t("reg.errEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t("reg.errEmailBad");
    if (!isValidPhone(buscarPais(form.phoneCountry).dial, form.phone)) {
      return form.phoneCountry === "AR" ? t("reg.errPhoneAr") : t("reg.errPhone");
    }
    if (!form.dateOfBirth) return t("reg.errBirth");
    const age = ageFrom(form.dateOfBirth);
    if (age === null) return t("reg.errBirthBad");
    if (age < 18) return t("reg.err18");
    if (age > 100) return t("reg.errBirthCheck");
    if (form.password.length < 6) return t("reg.errPassShort");
    if (form.password !== form.confirmPassword) return t("reg.errPassMatch");
    if (!form.acceptedTerms) return t("reg.errTerms");
    return null;
  };

  // Paso 0 → 1: pide el código al email. Todavía no se crea ninguna cuenta.
  const handleRequestCode = async () => {
    setPhoneTouched(true);
    const invalid = validateForm();
    if (invalid) { setError(invalid); return; }
    setLoading(true); setError(""); setInfo("");
    const result = await startRegistration(form.email.trim());
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setInfo("");
    setStep(1);
  };

  // Paso 1 → 2: con el código, crea la cuenta y deja la sesión abierta.
  const handleCreateAccount = async () => {
    if (code.length !== 6) { setError(t("reg.errCode")); return; }
    setLoading(true); setError(""); setInfo("");
    const result = await completeRegistration({
      email: form.email.trim(),
      code,
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizePhone(buscarPais(form.phoneCountry).dial, form.phone) || undefined,
      dateOfBirth: form.dateOfBirth,
      acceptedTerms: form.acceptedTerms,
    });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setStep(2);
  };

  // Reenvía el código: volver a llamar al paso 1 rota el código anterior.
  const handleResend = async () => {
    setResending(true); setError(""); setInfo("");
    const result = await startRegistration(form.email.trim());
    setResending(false);
    if (result.success) setInfo(t("reg.codeResent"));
    else setError(result.error);
  };

  // En celular los campos van a 16px: con menos, Safari en iPhone hace zoom solo
  // al tocarlos y la pantalla queda corrida a lo ancho.
  const inputStyle = { width:"100%", padding: isMobile ? "13px 14px" : "11px 14px", borderRadius:8, border:"1.5px solid var(--fw-border)", fontSize: isMobile ? 16 : 14, outline:"none", color:"var(--fw-text)", boxSizing:"border-box" };
  // Los pares de campos (nombre/apellido, teléfono/fecha) se apilan en celular:
  // en 390px de ancho, dos columnas dejan cada campo en 170px y el selector de
  // fecha no entra, que es lo que hacía que el registro se viera amontonado.
  const twoCols = { display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12, marginBottom:16 };
  const labelStyle = { display:"block", fontSize:13, fontWeight:500, color:"var(--fw-text-2)", marginBottom:6 };
  const errorBox = { background:"var(--fw-red-bg)", border:"1.5px solid var(--fw-red-line)", borderRadius:8, padding:"10px 14px", color:"var(--fw-red-text-2)", fontSize:13, marginBottom:20 };
  const infoBox = { background:"var(--fw-blue-bg)", border:"1.5px solid var(--fw-blue-line)", borderRadius:8, padding:"10px 14px", color:"var(--fw-blue-text)", fontSize:13, marginBottom:16 };

  // ─────────────── PASO 0: DATOS DE LA CUENTA ───────────────
  if (step === 0) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--fw-surface)" }}>
        {/*
          EL PANEL DE LA DERECHA TIENE QUE LLEGAR HASTA ABAJO.

          Antes esta columna llevaba `overflowY:"auto"`, y eso era lo que cortaba
          el panel: el formulario del registro mide unos 890px y la ventana 800,
          así que el contenido sobraba. Con `overflow:auto` ese sobrante se
          resuelve DENTRO de la columna en vez de hacer crecer la fila, así que
          el contenedor se quedaba clavado en los 800px del `minHeight:100vh` y
          el panel oscuro —que se estira hasta el alto de la fila y no más— se
          terminaba ahí, con noventa píxeles de blanco abajo.

          Sacándolo, la fila crece con el formulario y el panel la acompaña. La
          página scrolea sola, que es lo que corresponde: el scroll de una
          columna interna en una pantalla de registro no lo espera nadie.
        */}
        <div style={{ marginRight: isMobile ? 0 : PANEL, minHeight:"100vh", display:"flex", flexDirection:"column", background:"var(--fw-surface)" }}>
          {!isMobile && (
            <div style={{ display:"flex", justifyContent:"flex-end", padding:"22px 28px 0" }}>
              <LangPicker />
            </div>
          )}
          <div style={{ flex:1, display:"flex", alignItems:isMobile?"flex-start":"center", justifyContent:"center", padding: isMobile ? "26px 20px 40px" : "24px 64px 48px" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:32 }}>
              <Link to="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
                <Logo />
              </Link>
              {isMobile && <LangPicker />}
            </div>

            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:26, fontWeight:800, color:"var(--fw-text)", letterSpacing:"-0.5px", marginBottom:6 }}>{t("auth.createAccount")}</h2>
              <p style={{ fontSize:14, color:"var(--fw-text-3)" }}>
                {t("auth.haveAccount")}{" "}
                <Link to="/login" style={{ color:"var(--fw-blue)", fontWeight:600, textDecoration:"none" }}>{t("auth.loginLink")}</Link>
              </p>
            </div>

            {error && <div style={errorBox}>{error}</div>}

            <button onClick={() => window.location.href = GOOGLE_AUTH_URL} style={{
              width:"100%", padding: isMobile ? "14px 16px" : "11px 16px", background:"var(--fw-surface)", border:"1.5px solid var(--fw-border)",
              borderRadius:10, fontSize: isMobile ? 15 : 14, fontWeight:600, color:"var(--fw-text-2)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:20,
            }}>
              <GoogleIcon /> {t("auth.withGoogle")}
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:"var(--fw-bg)" }}/><span style={{ fontSize:12, color:"var(--fw-text-4)" }}>{t("auth.orRegisterEmail")}</span><div style={{ flex:1, height:1, background:"var(--fw-bg)" }}/>
            </div>

            <div style={twoCols}>
              <div>
                <label style={labelStyle}>{t("auth.firstName")} *</label>
                <input style={inputStyle} placeholder="Martin" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t("auth.lastName")} *</label>
                <input style={inputStyle} placeholder={t("reg.phLastName")} value={form.lastName} onChange={e => set("lastName", e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>{t("auth.email")} *</label>
              <input style={inputStyle} type="email" placeholder={t("reg.phEmail")} value={form.email} onChange={e => set("email", e.target.value)} />
            </div>

            <div style={twoCols}>
              <div>
                {/* El código de país se elige: alguien que llega de afuera
                    tiene que poder dejar su propio teléfono. Argentina viene
                    puesta, y no se puede continuar con un número a medias
                    (antes "123" pasaba). */}
                <PhoneInput label={`${t("auth.phone")} *`} value={form.phone} showError={phoneTouched}
                  pais={form.phoneCountry} onPaisChange={v => set("phoneCountry", v)}
                  onChange={v => set("phone", v)} />
              </div>
              <div>
                {/* La fecha de nacimiento es obligatoria: la plataforma es solo
                    para mayores de 18 y el backend rechaza el registro sin ella. */}
                <label style={labelStyle}>{t("auth.birthDate")} *</label>
                <input style={inputStyle} type="date" max={maxBirthDate()} value={form.dateOfBirth}
                  onChange={e => set("dateOfBirth", e.target.value)} />
              </div>
            </div>

            <div style={twoCols}>
              <div>
                <label style={labelStyle}>{t("auth.password")} *</label>
                <div style={{ position:"relative" }}>
                  <input type={showPassword?"text":"password"} placeholder="••••••" value={form.password}
                    onChange={e => set("password", e.target.value)} style={{ ...inputStyle, paddingRight:40 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--fw-text-4)", padding:0 }}>
                    {showPassword ? <EyeClosed/> : <EyeOpen/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t("auth.confirmPassword")} *</label>
                <div style={{ position:"relative" }}>
                  <input type={showConfirm?"text":"password"} placeholder="••••••" value={form.confirmPassword}
                    onChange={e => set("confirmPassword", e.target.value)} style={{ ...inputStyle, paddingRight:40 }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--fw-text-4)", padding:0 }}>
                    {showConfirm ? <EyeClosed/> : <EyeOpen/>}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:24 }}>
              <input type="checkbox" id="terms" checked={form.acceptedTerms} onChange={e => set("acceptedTerms", e.target.checked)}
                style={{ marginTop:3, width:16, height:16, accentColor:"var(--fw-blue)", cursor:"pointer", flexShrink:0 }} />
              <label htmlFor="terms" style={{ fontSize:13, color:"var(--fw-text-2)", lineHeight:1.6, cursor:"pointer" }}>
                {t("reg.termsBefore")}{" "}
                <Link to="/terms" target="_blank" style={{ color:"var(--fw-blue)", fontWeight:600, textDecoration:"none" }}>{t("reg.termsLink")}</Link>
                {" "}{t("reg.termsAfter")} *
              </label>
            </div>

            <button onClick={handleRequestCode} disabled={loading} style={{
              width:"100%", padding: isMobile ? 15 : 13, background:"var(--fw-blue)", color:"#fff", border:"none", borderRadius:10,
              fontSize: isMobile ? 16 : 15, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1,
            }}>
              {loading ? t("auth.sendingCode") : t("common.continue")}
            </button>
            <div style={{ fontSize:12, color:"var(--fw-text-4)", textAlign:"center", marginTop:10 }}>
              {t("auth.codeWillArrive")}
            </div>
          </div>
          </div>
        </div>

        {!isMobile && (
          // La foto vive en `public/`. Si falta, el panel vuelve solo al
          // degradado de antes.
          <AuthAside
            foto="/auth-registro.jpg"
            titulo={t("reg.tagline")}
            texto={t("reg.heroText")}
            ancho={PANEL}
            lado="derecha"
            // El texto va ARRIBA. En esta foto el auto está en la mitad de
            // abajo, así que el texto apoyado ahí le quedaba encima; arriba
            // está la fachada del edificio, que es fondo y no estorba.
            posicion="arriba"
          />
        )}
      </div>
    );
  }

  // ─────────────── PASO 1: CÓDIGO DEL EMAIL → CREA LA CUENTA ───────────────
  if (step === 1) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--fw-surface-3)", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", background:"var(--fw-surface)", borderBottom:"1px solid var(--fw-line)" }}>
          <Logo />
          <div style={{ fontSize:12, fontWeight:700, color:"var(--fw-text-4)", letterSpacing:".08em" }}>{t("reg.verifyEyebrow")}</div>
          <div style={{ fontSize:13, color:"var(--fw-blue)", fontWeight:600, cursor:"pointer" }} onClick={() => setStep(0)}>{t("reg.changeEmail")}</div>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:420, background:"var(--fw-surface)", borderRadius:18, padding:32, boxShadow:"0 4px 24px rgba(0,0,0,.06)", textAlign:"center", border:"1px solid var(--fw-line-soft)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}><rect x="2" y="4" width="20" height="16" rx="2" stroke="#0f6ce6" strokeWidth="1.8"/><path d="M2.5 6.5 12 13l9.5-6.5" stroke="#0f6ce6" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <h2 style={{ fontSize:22, fontWeight:800, color:"var(--fw-text)", marginBottom:8 }}>{t("reg.confirmEmail")}</h2>
            <p style={{ fontSize:14, color:"var(--fw-text-3)", marginBottom:24, lineHeight:1.6 }}>
              {t("reg.codeSentTo")} <strong>{form.email}</strong>.<br/>{t("reg.codeEnterIt")}
            </p>

            {error && <div style={{ ...errorBox, marginBottom:16 }}>{error}</div>}
            {info && <div style={infoBox}>{info}</div>}

            <input
              style={{ width:"100%", padding:"14px", borderRadius:8, border:"1.5px solid var(--fw-border)", fontSize:28, fontWeight:700, letterSpacing:12, textAlign:"center", outline:"none", color:"var(--fw-text)", marginBottom:20, boxSizing:"border-box" }}
              type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
            />

            <button onClick={handleCreateAccount} disabled={loading}
              style={{ width:"100%", padding:13, background:"var(--fw-blue)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1, marginBottom:12 }}>
              {loading ? t("reg.creating") : t("reg.createMyAccount")}
            </button>

            <div style={{ fontSize:13, color:"var(--fw-text-3)" }}>
              {t("reg.notArrived")}{" "}
              <button onClick={handleResend} disabled={resending}
                style={{ background:"none", border:"none", color:"var(--fw-blue)", fontWeight:600, fontSize:13, cursor:"pointer", padding:0, opacity:resending?0.5:1 }}>
                {resending ? t("common.sending") : t("reg.resendCode")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────── PASO 2: VERIFICACIÓN DE IDENTIDAD (real) ───────────────
  return (
    <div style={{ minHeight:"100vh", background:"var(--fw-surface-3)", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 32px", background:"var(--fw-surface)", borderBottom:"1px solid var(--fw-line)" }}>
        <Logo />
        <div style={{ fontSize:12, fontWeight:700, color:"var(--fw-text-4)", letterSpacing:".08em" }}>{t("reg.accountEyebrow")}</div>
        <div style={{ fontSize:13, color:"var(--fw-blue)", fontWeight:600, cursor:"pointer" }} onClick={() => navigate("/")}>{t("reg.goHome")}</div>
      </div>

      <div style={{ flex:1, padding:"40px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto 24px", background:"var(--fw-green-bg)", border:"1px solid var(--fw-green-line)", borderRadius:12, padding:"14px 18px", fontSize:13.5, color:"var(--fw-green-text-2)" }}>
          <strong>{t("reg.accountCreated", { name: form.firstName ? `, ${form.firstName}` : "" })}</strong> {t("reg.verifyToStart")}
        </div>
        <IdentityVerification
          onDone={() => navigate(user?.verification?.fullyVerified ? "/publish" : "/")}
          onCancel={() => navigate("/")}
        />
      </div>
    </div>
  );
}
