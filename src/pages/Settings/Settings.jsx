// ============================================================================
//  Settings — AJUSTES de la cuenta
// ----------------------------------------------------------------------------
//  Panel con menú lateral. Las secciones principales son:
//   - "Cuenta": editar datos personales y activar preferencias (notificaciones,
//     modo oscuro, 2FA...). Las preferencias se guardan en localStorage.
//   - "Seguridad": estado de la verificación de identidad (DNI/licencia).
//  El resto de secciones son "próximamente". Editar un dato lo guarda en el
//  backend y en la sesión, así se ve al instante en el perfil.
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import ChangeEmailCard from "../../components/ChangeEmailCard";
import { LANGUAGES, useI18n } from "../../i18n/core";
import { updateMe } from "../../services/api";
import { applyDarkMode } from "../../services/theme";

/* ── Íconos SVG (sin emojis) ── */
const I = {
  user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></>,
  access: <><circle cx="12" cy="4" r="2" /><path d="M4 8h16M12 8v6M8 22l4-8 4 8" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.63.65 1.1 1.29 1.29H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};
const Svg = ({ d, color = "currentColor", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

// Solo lo que existe de verdad. Estaban además Notificaciones, Privacidad,
// Accesibilidad y Ayuda y soporte: cuatro secciones que abrían un cartel de
// "próximamente" y nada más. Un menú con la mitad de las puertas cerradas hace
// perder tiempo y da la impresión de que la app está a medio hacer.
const MENU = [
  { key: "cuenta", label: "settings.account", icon: I.user },
  { key: "seguridad", label: "settings.security", icon: I.lock },
  { key: "pagos", label: "settings.payments", icon: I.card },
  { key: "idioma", label: "settings.language", icon: I.globe },
];

// Clave de localStorage y función para leer las preferencias guardadas.
const PREFS_KEY = "fw_prefs";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
};

export default function Settings() {
  const { t: tr, lang, setLang } = useI18n();
  const { user, login, logout, refreshUser, isVerified } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [section, setSection] = useState("cuenta");

  // Estado real de la verificación desde el backend (no marcas del navegador).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUser(); }, []);
  const checklist = user?.verification?.checklist || {};
  const [prefs, setPrefs] = useState({ dark: false, ...loadPrefs() });

  // Cambia una preferencia, la guarda y aplica su efecto real (modo oscuro,
  // permiso de notificaciones, etc.).
  const setPref = (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    if (k === "dark") applyDarkMode(v);
  };

  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const lastName = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";

  // Guarda un campo: actualiza localStorage + login, y backend si aplica
  const saveField = async (key, value) => {
    const updated = { ...user };
    if (key === "firstName") { updated.firstName = value; updated.name = `${value} ${lastName}`.trim(); try { await updateMe({ firstName: value, lastName }); } catch {} }
    else if (key === "lastName") { updated.lastName = value; updated.name = `${firstName} ${value}`.trim(); try { await updateMe({ firstName, lastName: value }); } catch {} }
    else if (key === "phone") { updated.phone = value; try { await updateMe({ phone: value }); } catch {} }
    else updated[key] = value;
    localStorage.setItem("fw_user", JSON.stringify(updated));
    login(updated);
  };

  const t = {
    card: { background: "#fff", border: "1px solid #ececec", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,0,0,.04)" },
    menuItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 2, background: active ? "#111827" : "transparent", color: active ? "#fff" : "#374151", transition: "background .15s" }),
    sectTitle: { fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" },
    sectSub: { fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 22 },
    fieldBox: { border: "1px solid #ececec", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    fieldLbl: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 },
    fieldVal: { fontSize: 15, fontWeight: 600, color: "#111827" },
    edit: { fontSize: 14, fontWeight: 600, color: "#2563eb", cursor: "pointer", background: "none", border: "none", flexShrink: 0 },
    input: { fontSize: 15, fontWeight: 600, color: "#111827", border: "1.5px solid #2563eb", borderRadius: 8, padding: "6px 10px", outline: "none", width: "100%", boxSizing: "border-box" },
    rowSwitch: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0", borderBottom: "1px solid #f3f4f6" },
  };

  // Campo editable "in-line": muestra un dato y, al tocar Editar, permite
  // cambiarlo y guardarlo. Reutilizado para nombre, email, teléfono, etc.
  const Field = ({ label, value, fieldKey, editable = true, type = "text" }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value || "");
    const [saving, setSaving] = useState(false);
    const commit = async () => { setSaving(true); await saveField(fieldKey, val); setSaving(false); setEditing(false); };
    return (
      <div style={t.fieldBox}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={t.fieldLbl}>{label}</div>
          {editing
            ? <input style={t.input} type={type} value={val} autoFocus onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && commit()} />
            : <div style={t.fieldVal}>{value || "—"}</div>}
        </div>
        {editable && (editing
          ? <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...t.edit, color: "#9ca3af" }} onClick={() => { setVal(value || ""); setEditing(false); }}>{tr("common.cancel")}</button>
              <button style={t.edit} onClick={commit} disabled={saving}>{saving ? "..." : tr("common.save")}</button>
            </div>
          : <button style={t.edit} onClick={() => setEditing(true)}>{tr("common.edit")}</button>)}
      </div>
    );
  };

  // Interruptor visual (switch) on/off reutilizable.
  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)}
      style={{ width: 46, height: 27, minHeight: 27, maxHeight: 27, borderRadius: 20, border: "none", cursor: "pointer", background: on ? "#2563eb" : "#d1d5db", position: "relative", flexShrink: 0, transition: "background .2s", padding: 0, boxSizing: "border-box" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .2s cubic-bezier(.22,1,.36,1)" }} />
    </button>
  );

  const VerifRow = ({ title, desc, verified, onVerify, last }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: last ? "none" : "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: verified ? "#f0fdf4" : "#fff7ed", border: `1px solid ${verified ? "#bbf7d0" : "#fed7aa"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Svg d={verified ? <path d="M20 6L9 17l-5-5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>} color={verified ? "#16a34a" : "#ea580c"} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>{desc}</div>
        </div>
      </div>
      {verified ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#166534", fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 20, flexShrink: 0 }}>{tr("status.verified")}</span>
      ) : (
        <button onClick={onVerify} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 20, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{tr("profile.verifyNow")}</button>
      )}
    </div>
  );

  const SwitchRow = ({ title, desc, on, onChange, last }) => (
    <div style={{ ...t.rowSwitch, ...(last ? { borderBottom: "none" } : {}) }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "16px" : "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={t.sectTitle}>{tr("settings.title")}</div>
      <div style={t.sectSub}>{tr("settings.subtitle")}</div>

      <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "start" }}>
        {/* Menú lateral */}
        <div style={{ ...t.card, padding: 12, marginBottom: isMobile ? 20 : 0 }}>
          {MENU.map(m => (
            <div key={m.key} style={t.menuItem(section === m.key)} onClick={() => setSection(m.key)}>
              <Svg d={m.icon} color={section === m.key ? "#fff" : "#374151"} />
              <span style={{ flex: 1 }}>{tr(m.label)}</span>
              {section === m.key && <span style={{ opacity: .6 }}>›</span>}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 8, paddingTop: 8 }}>
            <div style={{ ...t.menuItem(false), color: "#dc2626" }} onClick={() => { logout(); navigate("/"); }}>
              <Svg d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} color="#dc2626" />
              {tr("nav.logout")}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div>
          {section === "cuenta" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" }}>{tr("settings.accountTitle")}</div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 20 }}>{tr("settings.accountSub")}</div>

              {/* Info personal */}
              <div style={{ ...t.card, padding: 26, marginBottom: 20 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{tr("settings.personalInfo")}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>{tr("settings.personalInfoSub")}</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  {/* Nombre y apellido NO se editan: salen del DNI que se revisa al
                      verificar la cuenta. Si se pudieran escribir a mano, el nombre
                      que ve la otra persona en una reserva no tendría nada que ver
                      con el documento, y la verificación de identidad dejaría de
                      querer decir algo. */}
                  <Field label={tr("auth.firstName")} value={firstName} fieldKey="firstName" editable={false} />
                  <Field label={tr("auth.lastName")} value={lastName} fieldKey="lastName" editable={false} />
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <ChangeEmailCard verified={checklist.emailVerified === true} />
                  </div>
                  <Field label={tr("auth.phone")} value={user?.phone} fieldKey="phone" />
                  {/* La fecha de nacimiento la valida el backend al registrarse y
                      no se puede cambiar después (de ahí editable={false}). Antes
                      leía `birthdate`, un campo que la API nunca devuelve, y por
                      eso siempre aparecía vacía. */}
                  <Field label={tr("auth.birthDate")} editable={false} fieldKey="dateOfBirth"
                    value={user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("es-AR") : ""} />
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
                  {tr("settings.fromDni")}
                </div>
              </div>

              {/* Preferencias */}
              <div style={{ ...t.card, padding: 26 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{tr("settings.appearance")}</div>
                {/* Acá había cinco interruptores: notificaciones por email, push,
                    ofertas personalizadas y 2FA, ninguno de los cuales hacía nada
                    del otro lado —solo se guardaban en el navegador—. Un
                    interruptor que se prende y no cambia nada es peor que no
                    tenerlo. Queda el único que sí funciona. */}
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>{tr("settings.appearanceSub")}</div>
                <SwitchRow title={tr("settings.darkMode")} desc={tr("settings.darkModeSub")} on={prefs.dark} onChange={v => setPref("dark", v)} last />
              </div>
            </>
          ) : section === "seguridad" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" }}>{tr("settings.securityTitle")}</div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 20 }}>{tr("settings.securitySub")}</div>

              <div style={{ ...t.card, padding: 26 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{tr("settings.identityTitle")}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>{tr("settings.identitySub")}</div>

                {/* Estado REAL de la verificación (GET /verification/me/status).
                    Antes se leían marcas guardadas en el navegador: acá decía
                    "Verificado" y el servidor igual rechazaba publicar y reservar. */}
                <VerifRow
                  title={tr("auth.email")}
                  desc={tr("settings.emailDesc")}
                  verified={checklist.emailVerified === true}
                  onVerify={() => navigate("/verify-email")}
                />
                <VerifRow
                  title={user?.verification?.phoneRequired ? tr("auth.phone") : `${tr("auth.phone")} (${tr("common.optional")})`}
                  desc={tr("settings.phoneDesc")}
                  verified={checklist.phoneVerified === true}
                  onVerify={() => navigate("/kyc")}
                />
                <VerifRow
                  title={tr("settings.docsTitle")}
                  desc={tr("settings.docsDesc")}
                  verified={checklist.documentsSubmitted === true}
                  onVerify={() => navigate("/kyc")}
                />
                <VerifRow
                  title={tr("profile.birthDate")}
                  desc={tr("settings.birthDesc")}
                  verified={checklist.dateOfBirthProvided === true}
                  onVerify={() => navigate("/complete-profile")}
                  last
                />

                {isVerified ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12 }}>
                    <Svg d={<path d="M20 6L9 17l-5-5" />} color="#16a34a" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#166534" }}>{tr("settings.allVerified")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, padding: "12px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12 }}>
                    <Svg d={<><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>} color="#ea580c" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#9a3412" }}>{tr("settings.pendingSteps")}</span>
                  </div>
                )}
              </div>
            </>
          ) : section === "idioma" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" }}>
                {tr("settings.languageTitle")}
              </div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 20 }}>
                {tr("settings.languageSub")}
              </div>

              <div style={{ ...t.card, padding: isMobile ? 18 : 26 }}>
                {/* Una fila por idioma, cada uno escrito EN SU PROPIO IDIOMA: si
                    alguien abrió la app en un idioma que no entiende, "中文" lo
                    encuentra igual, y "Chino" no le sirve de nada. */}
                {LANGUAGES.map((idioma, i) => {
                  const elegido = lang === idioma.code;
                  return (
                    <button key={idioma.code} onClick={() => setLang(idioma.code)}
                      aria-pressed={elegido}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, width: "100%",
                        padding: "14px 4px", background: "none", border: "none",
                        borderBottom: i === LANGUAGES.length - 1 ? "none" : "1px solid #f3f4f6",
                        cursor: "pointer", textAlign: "left",
                      }}>
                      <span style={{
                        width: 38, height: 28, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                        background: elegido ? "#2563eb" : "#f3f4f6",
                        color: elegido ? "#fff" : "#6b7280",
                      }}>
                        {idioma.flagless}
                      </span>
                      <span style={{ flex: 1, fontSize: 15, fontWeight: elegido ? 700 : 500, color: "#111827" }}>
                        {idioma.label}
                      </span>
                      {elegido && (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
                          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, lineHeight: 1.6 }}>
                  {tr("settings.languageNote")}
                </div>
              </div>
            </>
          ) : (
            <div style={{ ...t.card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{tr(MENU.find(m => m.key === section)?.label)}</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>{tr("settings.comingSoon")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}