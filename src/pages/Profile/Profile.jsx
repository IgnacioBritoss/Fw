import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { updateMe } from "../../services/api";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px" }}>
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="#2563eb" strokeWidth="2" />
      <circle cx="16" cy="16" r="4" fill="#2563eb" />
    </svg>
    <span style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>Freewheel</span>
  </div>
);

const Check = () => (
  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexShrink: 0 }}>✓</div>
);

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");

  const initialFirst = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const initialLast = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "Buenos Aires, Argentina");

  const fullName = `${firstName} ${lastName}`.trim() || "Usuario";
  const initials = `${initialFirst[0] || "U"}${initialLast[0] || ""}`.toUpperCase();
  const email = user?.email || "—";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : "2025";

  const save = async () => {
    setSaving(true); setInfo("");
    try { await updateMe({ firstName, lastName, phone }); } catch { /* opcional, no bloquea */ }
    const updated = { ...user, firstName, lastName, name: fullName, phone, location };
    localStorage.setItem("fw_user", JSON.stringify(updated));
    login(updated);
    setSaving(false);
    setEditing(false);
    setInfo("Perfil actualizado.");
  };

  const cancel = () => {
    setFirstName(initialFirst); setLastName(initialLast);
    setPhone(user?.phone || ""); setLocation(user?.location || "Buenos Aires, Argentina");
    setEditing(false);
  };

  const t = {
    shell: { minHeight: "100vh", background: "#f3f4f6", display: "flex" },
    sidebar: { width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #ececec", padding: "24px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
    navGroup: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 12px 8px" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 2, background: active ? "#111827" : "transparent", color: active ? "#fff" : "#374151" }),
    navDot: (active) => ({ width: 18, height: 18, borderRadius: 5, background: active ? "#fff" : "#d1d5db", flexShrink: 0 }),
    topbar: { display: "flex", alignItems: "center", gap: 16, padding: "16px 32px", background: "#fff", borderBottom: "1px solid #ececec" },
    card: { background: "#fff", borderRadius: 18, border: "1px solid #ececec", marginBottom: 20 },
    statCol: { flex: 1, padding: "24px 28px" },
    statNum: { fontSize: 26, fontWeight: 800, color: "#111827" },
    statLabel: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
    verifyItem: { display: "flex", alignItems: "center", gap: 14, background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, padding: 16 },
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827", boxSizing: "border-box" },
    btnPrimary: { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 24, fontSize: 14, fontWeight: 700, cursor: "pointer" },
    btnGhost: { padding: "10px 20px", background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 24, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  };

  const NAV = [
    { group: "Navegación", items: [
      { label: "Inicio", onClick: () => navigate("/") },
      { label: "Buscar autos", onClick: () => navigate("/") },
      { label: "Mis reservas", onClick: () => navigate("/my-bookings") },
      { label: "Favoritos", onClick: () => navigate("/") },
      { label: "Mensajes", onClick: () => navigate("/chat") },
    ]},
    { group: "Para dueños", items: [
      { label: "Mis autos", onClick: () => navigate("/dashboard") },
      { label: "Publicar auto", onClick: () => navigate("/publish") },
      { label: "Panel dueño", onClick: () => navigate("/dashboard") },
    ]},
  ];

  const Verifications = () => (
    <div style={{ ...t.card, padding: 28, flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Identidad y verificaciones</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Documentos validados por Freewheel</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {[
          ["Identidad verificada", "DNI argentino"],
          ["Licencia de conducir", "Vigente"],
          ["Email verificado", email],
          ["Teléfono verificado", phone ? `+54 ${phone.slice(0, 2)} ···· ····` : "No cargado"],
        ].map(([ti, sub]) => (
          <div key={ti} style={t.verifyItem}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{ti}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
            </div>
            <Check />
          </div>
        ))}
      </div>
    </div>
  );

  const content = (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {info && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{info}</div>}

      {/* Portada + cabecera */}
      <div style={{ ...t.card, overflow: "hidden" }}>
        <div style={{ height: 140, background: "linear-gradient(90deg,#0a0f1e 0%,#1d4ed8 70%,#2563eb 100%)" }} />
        {/* Avatar + botones, sobre la línea de la portada */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "0 32px", marginTop: -60 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#ece9e3", border: "5px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "#111827", flexShrink: 0 }}>{initials}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {editing ? (
              <>
                <button style={t.btnGhost} onClick={cancel}>Cancelar</button>
                <button style={{ ...t.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </>
            ) : (
              <>
                <button style={t.btnGhost} onClick={() => { setInfo(""); setEditing(true); }}>Editar perfil</button>
                <button style={t.btnPrimary} onClick={() => navigate("/chat")}>✉ Enviar mensaje</button>
              </>
            )}
          </div>
        </div>
        {/* Nombre + datos, debajo, sobre el blanco */}
        <div style={{ padding: "16px 32px 28px" }}>
          {editing ? (
            <div style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={t.input} placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input style={t.input} placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={t.input} placeholder="Ubicación" value={location} onChange={e => setLocation(e.target.value)} />
                <input style={t.input} placeholder="Teléfono" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" }}>{fullName}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>✓ Verificado</span>
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 3 }}>Miembro desde {memberSince} · {location}</div>
              <div style={{ fontSize: 14, color: "#374151" }}>Responde en menos de 1 hora · 98% de aceptación</div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ ...t.card, display: "flex", flexWrap: "wrap" }}>
        {[
          ["4.9 ★", "Rating promedio"],
          ["3", "Autos publicados"],
          ["< 1h", "Tiempo de respuesta"],
        ].map(([n, l], i) => (
          <div key={l} style={{ ...t.statCol, borderLeft: i === 0 ? "none" : "1px solid #f0f0f0" }}>
            <div style={t.statNum}>{n}</div>
            <div style={t.statLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* Verificaciones */}
      <Verifications />
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
        <div style={{ ...t.topbar, padding: "14px 16px" }}><Logo /></div>
        {content}
      </div>
    );
  }

  return (
    <div style={t.shell}>
      <aside style={t.sidebar}>
        <Logo />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {NAV.map((g, gi) => (
            <div key={gi}>
              <div style={t.navGroup}>{g.group}</div>
              {g.items.map((it, ii) => (
                <div key={ii} style={t.navItem(false)} onClick={it.onClick}>
                  <span style={t.navDot(false)} />{it.label}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ece9e3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#111827" }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{firstName}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Conductor verificado</div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={t.topbar}>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Comunidad</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Perfil de {fullName}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{firstName}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Ver perfil</div>
            </div>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}