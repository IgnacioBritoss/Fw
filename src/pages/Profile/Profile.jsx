// ============================================================================
//  Profile — Pantalla de PERFIL público del usuario
// ----------------------------------------------------------------------------
//  Muestra los datos del usuario logueado: nombre, foto (inicial), estadísticas
//  y el estado de sus verificaciones (DNI, licencia, email, teléfono). Todo se
//  deriva del objeto `user`, así que lo que se edita en Ajustes se refleja acá.
// ============================================================================
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

// Círculo verde (tilde) o naranja (signo) según algo esté verificado o pendiente.
const StatusBadge = ({ ok }) => (
  <div title={ok ? "Verificado" : "Pendiente"} style={{ width: 24, height: 24, borderRadius: "50%", background: ok ? "#16a34a" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {ok
      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 8v5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="16.5" r="1.2" fill="#fff" /></svg>}
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();

  // Todo se deriva directamente del usuario: lo que se edita en Ajustes se ve acá al instante
  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const lastName = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";
  const phone = user?.phone || "";
  const location = user?.location || "Buenos Aires, Argentina";

  const fullName = `${firstName} ${lastName}`.trim() || "Usuario";
  const initials = `${firstName[0] || "U"}${lastName[0] || ""}`.toUpperCase();
  const email = user?.email || "—";
  const dniVerified = user?.dniVerified === true;
  const licenseVerified = user?.licenseVerified === true;
  const fullyVerified = dniVerified && licenseVerified;
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

  // Bloque de verificaciones: una tarjeta por documento con su estado, y un
  // aviso con botón "Verificar ahora" si falta completar el DNI o la licencia.
  const Verifications = () => (
    <div style={{ ...t.card, padding: 28, flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Identidad y verificaciones</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Documentos validados por Freewheel</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {[
          ["Documento (DNI)", dniVerified ? "DNI argentino validado" : "Pendiente de verificación", dniVerified],
          ["Licencia de conducir", licenseVerified ? "Licencia vigente validada" : "Pendiente de verificación", licenseVerified],
          ["Email verificado", email, true],
          ["Teléfono verificado", phone ? `+54 ${phone.slice(0, 2)} ···· ····` : "No cargado", !!phone],
        ].map(([ti, sub, ok]) => (
          <div key={ti} style={t.verifyItem}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{ti}</div>
              <div style={{ fontSize: 12, color: ok ? "#9ca3af" : "#ea580c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
            </div>
            <StatusBadge ok={ok} />
          </div>
        ))}
      </div>
      {!fullyVerified && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 18, padding: "14px 16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#9a3412" }}>Te falta verificar {(!dniVerified && !licenseVerified) ? "tu DNI y tu licencia" : !dniVerified ? "tu DNI" : "tu licencia"}.</div>
          <button onClick={() => navigate("/kyc")} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 20, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Verificar ahora</button>
        </div>
      )}
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
            {fullyVerified ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>Verificado
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#c2410c" strokeWidth="2" /><path d="M12 8v4M12 16h.01" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" /></svg>Verificación pendiente
              </span>
            )}
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