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
import { useIsMobile } from "../../hooks/useIsMobile";
import PhoneInput from "../../components/PhoneInput";
import { buscarPais, isValidPhone, normalizePhone } from "../../services/phone";
import { updateMe } from "../../services/api";
import { useI18n } from "../../i18n/core";

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
  const { isMobile } = useIsMobile();
  const { t } = useI18n();
  const { user, completeProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [dateOfBirth, setDateOfBirth] = useState("");
  // Solo los dígitos posteriores al código de país, que viaja aparte.
  const [phone, setPhone] = useState(() => String(user?.phone || "").replace(/\D/g, "").replace(/^54/, ""));
  const [phoneCountry, setPhoneCountry] = useState("AR");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";

  const s = {
    page: { minHeight:"100vh", background:"var(--fw-surface-2)", display:"flex", alignItems: isMobile ? "flex-start" : "center", justifyContent:"center", padding: isMobile ? 16 : 24 },
    card: { background:"var(--fw-surface)", borderRadius:16, padding: isMobile ? "28px 22px" : "40px 36px", width:"100%", maxWidth:440, boxShadow:"0 4px 24px rgba(0,0,0,.08)" },
    label: { display:"block", fontSize:13, fontWeight:500, color:"var(--fw-text-2)", marginBottom:5 },
    input: { width:"100%", padding: isMobile ? "13px 14px" : "11px 14px", borderRadius:8, border:"1.5px solid var(--fw-border)", fontSize: isMobile ? 16 : 14, outline:"none", color:"var(--fw-text)", boxSizing:"border-box" },
    btn: { width:"100%", padding:13, background:"var(--fw-blue)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" },
    error: { background:"var(--fw-red-bg)", border:"1.5px solid var(--fw-red-line)", borderRadius:8, padding:"10px 14px", color:"var(--fw-red-text-2)", fontSize:13, marginBottom:16 },
    hint: { fontSize:12, color:"var(--fw-text-4)", marginTop:6 },
  };

  // Guarda la fecha de nacimiento (obligatoria) y, si se cargó, el teléfono.
  const finish = async () => {
    if (!dateOfBirth) { setError(t("reg.errBirth")); return; }
    const age = ageFrom(dateOfBirth);
    if (age === null) { setError(t("reg.errBirthBad")); return; }
    if (age < 18) { setError(t("reg.err18")); return; }
    // El teléfono es opcional acá, pero si lo cargan tiene que estar completo:
    // guardar un número a medias no le sirve a nadie.
    if (phone && !isValidPhone(buscarPais(phoneCountry).dial, phone)) {
      setPhoneTouched(true);
      setError(t("complete.errPhone"));
      return;
    }

    setLoading(true);
    setError("");
    const result = await completeProfile(dateOfBirth);
    if (!result.success) { setLoading(false); setError(result.error); return; }

    /*
      Con la sesión ya completa se puede guardar el teléfono.

      SIGUE SIENDO OPCIONAL: si el servidor no está o algo falla, no tiene
      sentido dejar a alguien afuera de la app por un número que además podía
      no cargar. Eso no cambió.

      LO QUE SÍ CAMBIÓ: el backend ahora exige que el teléfono sea único —antes
      dos cuentas podían tener el mismo número— y contesta 409 diciendo que ya
      está en otra cuenta. Ese caso NO es "algo falló": es un dato que hay que
      corregir, y el único que lo puede corregir es quien está mirando esta
      pantalla. Escondido adentro de un catch vacío, la persona entraba creyendo
      que cargó el teléfono, y después no podía verificarse ni publicar sin que
      nada en ninguna pantalla le dijera por qué.
    */
    const fullPhone = normalizePhone(buscarPais(phoneCountry).dial, phone);
    if (fullPhone) {
      try {
        await updateMe({ phone: fullPhone });
      } catch (err) {
        if (err?.code === "PHONE_ALREADY_REGISTERED" || err?.status === 409) {
          setPhoneTouched(true);
          setError(err.message || t("complete.errPhoneTaken"));
          setLoading(false);
          await refreshUser();
          return;
        }
        /* cualquier otra falla: el teléfono se puede cargar después */
      }
    }
    await refreshUser();
    setLoading(false);
    navigate("/");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize:22, fontWeight:800, color:"var(--fw-text)", marginBottom:8 }}>
          {firstName ? t("complete.helloName", { name: firstName }) : t("complete.almost")}
        </div>
        <div style={{ color:"var(--fw-text-3)", fontSize:14, marginBottom:24, lineHeight:1.6 }}>
          {t("complete.sub")}
        </div>
        {error && <div style={s.error}>{error}</div>}

        <div style={{ marginBottom:20 }}>
          <label style={s.label}>{t("profile.birthDate")} *</label>
          <input style={s.input} type="date" max={maxBirthDate()} value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)} />
          <div style={s.hint}>{t("complete.birthHint")}</div>
        </div>

        <div style={{ marginBottom:24 }}>
          <PhoneInput label={`${t("auth.phone")} (${t("common.optional")})`} value={phone} showError={phoneTouched}
            pais={phoneCountry} onPaisChange={setPhoneCountry}
            onChange={setPhone} />
        </div>

        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={finish} disabled={loading}>
          {loading ? t("common.saving") : t("complete.enter")}
        </button>
      </div>
    </div>
  );
}
