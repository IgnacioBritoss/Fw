import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { updateMe } from "../../services/api";

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

const MENU = [
  { key: "cuenta", label: "Cuenta", icon: I.user },
  { key: "seguridad", label: "Seguridad", icon: I.lock },
  { key: "notificaciones", label: "Notificaciones", icon: I.bell },
  { key: "privacidad", label: "Privacidad", icon: I.shield },
  { key: "pagos", label: "Métodos de pago", icon: I.card },
  { key: "idioma", label: "Idioma y región", icon: I.globe },
  { key: "accesibilidad", label: "Accesibilidad", icon: I.access },
  { key: "ayuda", label: "Ayuda y soporte", icon: I.help },
];

const PREFS_KEY = "fw_prefs";
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
};

export default function Settings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [section, setSection] = useState("cuenta");
  const [prefs, setPrefs] = useState({ emailNotif: true, pushNotif: true, offers: true, twofa: false, dark: false, ...loadPrefs() });

  const setPref = (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
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
              <button style={{ ...t.edit, color: "#9ca3af" }} onClick={() => { setVal(value || ""); setEditing(false); }}>Cancelar</button>
              <button style={t.edit} onClick={commit} disabled={saving}>{saving ? "..." : "Guardar"}</button>
            </div>
          : <button style={t.edit} onClick={() => setEditing(true)}>Editar</button>)}
      </div>
    );
  };

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)}
      style={{ width: 46, height: 27, borderRadius: 20, border: "none", cursor: "pointer", background: on ? "#2563eb" : "#d1d5db", position: "relative", flexShrink: 0, transition: "background .2s", padding: 0 }}>
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#166534", fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 20, flexShrink: 0 }}>Verificado</span>
      ) : (
        <button onClick={onVerify} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 20, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Verificar ahora</button>
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
      <div style={t.sectTitle}>Ajustes</div>
      <div style={t.sectSub}>Gestioná tu cuenta, preferencias y privacidad</div>

      <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "start" }}>
        {/* Menú lateral */}
        <div style={{ ...t.card, padding: 12, marginBottom: isMobile ? 20 : 0 }}>
          {MENU.map(m => (
            <div key={m.key} style={t.menuItem(section === m.key)} onClick={() => setSection(m.key)}>
              <Svg d={m.icon} color={section === m.key ? "#fff" : "#374151"} />
              <span style={{ flex: 1 }}>{m.label}</span>
              {section === m.key && <span style={{ opacity: .6 }}>›</span>}
            </div>
          ))}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 8, paddingTop: 8 }}>
            <div style={{ ...t.menuItem(false), color: "#dc2626" }} onClick={() => { logout(); navigate("/"); }}>
              <Svg d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} color="#dc2626" />
              Cerrar sesión
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div>
          {section === "cuenta" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" }}>Cuenta</div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 20 }}>Tu información personal y preferencias básicas</div>

              {/* Info personal */}
              <div style={{ ...t.card, padding: 26, marginBottom: 20 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Información personal</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Estos datos son visibles solo para vos y los dueños de autos que alquiles</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <Field label="Nombre" value={firstName} fieldKey="firstName" />
                  <Field label="Apellido" value={lastName} fieldKey="lastName" />
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}><Field label="Email" value={user?.email} fieldKey="email" type="email" /></div>
                  <Field label="Teléfono" value={user?.phone} fieldKey="phone" />
                  <Field label="Fecha de nacimiento" value={user?.birthdate} fieldKey="birthdate" />
                </div>
              </div>

              {/* Preferencias */}
              <div style={{ ...t.card, padding: 26 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Preferencias de cuenta</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Controlá cómo Freewheel interactúa con vos</div>
                <SwitchRow title="Notificaciones por email" desc="Recibí actualizaciones de reservas, promociones y mensajes" on={prefs.emailNotif} onChange={v => setPref("emailNotif", v)} />
                <SwitchRow title="Notificaciones push" desc="Alertas en el navegador cuando hay novedades" on={prefs.pushNotif} onChange={v => setPref("pushNotif", v)} />
                <SwitchRow title="Ofertas personalizadas" desc="Te mostramos autos similares a los que te interesan" on={prefs.offers} onChange={v => setPref("offers", v)} />
                <SwitchRow title="Autenticación 2FA" desc="Agregá una capa extra de seguridad al iniciar sesión" on={prefs.twofa} onChange={v => setPref("twofa", v)} />
                <SwitchRow title="Modo oscuro" desc="Usá la interfaz con colores oscuros" on={prefs.dark} onChange={v => setPref("dark", v)} last />
              </div>
            </>
          ) : section === "seguridad" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" }}>Seguridad y verificación</div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 2, marginBottom: 20 }}>Validá tu identidad para poder alquilar y publicar autos</div>

              <div style={{ ...t.card, padding: 26 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Verificación de identidad</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>Subí tu documentación para verificar tu cuenta</div>

                <VerifRow
                  title="Documento (DNI)"
                  desc="Frente, dorso y selfie"
                  verified={user?.dniVerified === true}
                  onVerify={() => navigate("/kyc")}
                />
                <VerifRow
                  title="Licencia de conducir"
                  desc="Licencia vigente, ambos lados"
                  verified={user?.licenseVerified === true}
                  onVerify={() => navigate("/kyc")}
                  last
                />

                {(user?.dniVerified === true && user?.licenseVerified === true) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12 }}>
                    <Svg d={<path d="M20 6L9 17l-5-5" />} color="#16a34a" />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#166534" }}>Tu cuenta está completamente verificada.</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...t.card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{MENU.find(m => m.key === section)?.label}</div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>Esta sección estará disponible próximamente.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
