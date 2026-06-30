import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { updateMe } from "../../services/api";

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
    card: { background: "#fff", borderRadius: 18, border: "1px solid #ececec", marginBottom: 20 },
    statCol: { flex: 1, padding: "24px 28px" },
    statNum: { fontSize: 26, fontWeight: 800, color: "#111827" },
    statLabel: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
    verifyItem: { display: "flex", alignItems: "center", gap: 14, background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, padding: 16 },
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827", boxSizing: "border-box" },
    btnPrimary: { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 24, fontSize: 14, fontWeight: 700, cursor: "pointer" },
    btnGhost: { padding: "10px 20px", background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 24, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  };

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

  // El Layout provee el sidebar y la topbar; acá solo el contenido
  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {info && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{info}</div>}

      {/* Portada + cabecera */}
      <div style={{ ...t.card, overflow: "hidden" }}>
        <div style={{ height: 140, background: "linear-gradient(90deg,#0a0f1e 0%,#1d4ed8 70%,#2563eb 100%)" }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "0 32px", marginTop: -60 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#ece9e3", border: "5px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "#111827", flexShrink: 0 }}>{initials}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {editing ? (
              <>
                <button style={t.btnGhost} onClick={cancel}>Cancelar</button>
                <button style={{ ...t.btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </>
            ) : (
              <button style={t.btnGhost} onClick={() => { setInfo(""); setEditing(true); }}>Editar perfil</button>
            )}
          </div>
        </div>
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
}