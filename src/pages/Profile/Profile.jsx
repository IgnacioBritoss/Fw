import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const Check = () => (
  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexShrink: 0 }}>✓</div>
);

export default function Profile() {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();

  // Todo se deriva directamente del usuario: lo que se edita en Ajustes se ve acá al instante
  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const lastName = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";
  const phone = user?.phone || "";
  const location = user?.location || "Buenos Aires, Argentina";

  const fullName = `${firstName} ${lastName}`.trim() || "Usuario";
  const initials = `${firstName[0] || "U"}${lastName[0] || ""}`.toUpperCase();
  const email = user?.email || "—";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : "2025";

  const t = {
    card: { background: "#fff", borderRadius: 18, border: "1px solid #ececec", marginBottom: 20 },
    statCol: { flex: 1, padding: "24px 28px" },
    statNum: { fontSize: 26, fontWeight: 800, color: "#111827" },
    statLabel: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
    verifyItem: { display: "flex", alignItems: "center", gap: 14, background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, padding: 16 },
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
      {/* Portada + cabecera */}
      <div style={{ ...t.card, overflow: "hidden" }}>
        <div style={{ height: 140, background: "linear-gradient(90deg,#0a0f1e 0%,#1d4ed8 70%,#2563eb 100%)" }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, padding: "0 32px", marginTop: -60 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#ece9e3", border: "5px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "#111827", flexShrink: 0 }}>{initials}</div>
        </div>
        <div style={{ padding: "16px 32px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" }}>{fullName}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>✓ Verificado</span>
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 3 }}>Miembro desde {memberSince} · {location}</div>
          <div style={{ fontSize: 14, color: "#374151" }}>Responde en menos de 1 hora · 98% de aceptación</div>
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
