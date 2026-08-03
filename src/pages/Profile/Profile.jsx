// ============================================================================
//  Profile — Pantalla de PERFIL público del usuario
// ----------------------------------------------------------------------------
//  Muestra los datos del usuario logueado: nombre, foto (inicial), estadísticas
//  y el estado de sus verificaciones (DNI, licencia, email, teléfono). Todo se
//  deriva del objeto `user`, así que lo que se edita en Ajustes se refleja acá.
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getMyIdentity } from "../../services/api";
import IdentityDocuments from "../../components/IdentityDocuments";

// Círculo verde (tilde) o naranja (signo) según algo esté verificado o pendiente.
const StatusBadge = ({ ok }) => (
  <div title={ok ? "Verificado" : "Pendiente"} style={{ width: 24, height: 24, borderRadius: "50%", background: ok ? "#16a34a" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {ok
      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 8v5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="16.5" r="1.2" fill="#fff" /></svg>}
  </div>
);

export default function Profile() {
  const { user, refreshUser, isVerified } = useAuth();
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();

  // Al abrir el perfil se relee el estado real de la cuenta desde el backend,
  // así lo que se muestra acá es lo mismo que el servidor va a exigir al
  // publicar o reservar (y no una marca guardada en el navegador).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUser(); }, []);

  // Mis propios documentos. Cada uno puede ver las fotos que mandó y los datos
  // que se leyeron de ellas; las de los demás no las ve nadie más que el admin.
  const [myDocs, setMyDocs] = useState([]);
  useEffect(() => {
    getMyIdentity()
      .then(list => setMyDocs(Array.isArray(list) ? list : []))
      .catch(() => setMyDocs([]));
  }, []);
  const lastSubmission = myDocs[0] || null;

  // Todo se deriva directamente del usuario: lo que se edita en Ajustes se ve acá al instante
  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const lastName = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";
  const phone = user?.phone || "";
  const location = user?.location || "Buenos Aires, Argentina";

  const fullName = `${firstName} ${lastName}`.trim() || "Usuario";
  const initials = `${firstName[0] || "U"}${lastName[0] || ""}`.toUpperCase();
  const email = user?.email || "—";

  // Checklist REAL de verificación que devuelve el backend.
  const checklist = user?.verification?.checklist || {};
  const emailVerified = checklist.emailVerified ?? !!user?.emailVerifiedAt;
  const phoneVerified = checklist.phoneVerified ?? !!user?.phoneVerifiedAt;
  const documentsSubmitted = checklist.documentsSubmitted === true;
  const fullyVerified = isVerified;
  // El teléfono es opcional salvo que el backend diga lo contrario.
  const phoneRequired = user?.verification?.phoneRequired === true;
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
  const verifications = () => (
    <div style={{ ...t.card, padding: 28, flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Identidad y verificaciones</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Documentos validados por Freewheel</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {[
          ["DNI y licencia", documentsSubmitted ? (fullyVerified ? "Documentación validada" : "Documentación en revisión") : "Pendiente de envío", documentsSubmitted],
          ["Email verificado", emailVerified ? email : "Pendiente de confirmación", emailVerified],
          [`Teléfono verificado${phoneRequired ? "" : " (opcional)"}`, phoneVerified ? `+54 ${phone.slice(0, 2)} ···· ····` : (phone ? "Falta confirmar el código" : "No cargado"), phoneVerified],
          ["Fecha de nacimiento", checklist.dateOfBirthProvided ? "Edad validada (+18)" : "Pendiente", checklist.dateOfBirthProvided === true],
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
      {/* Las fotos que mandé y lo que se leyó de ellas. Solo las ve el dueño de
          la cuenta (y el panel admin): en el perfil de otra persona nunca
          aparecen, porque un DNI a la vista de cualquiera es material para
          suplantar una identidad. */}
      {lastSubmission && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 3 }}>
            Mis documentos
          </div>
          <div style={{ fontSize: 12.5, color: "#9ca3af", marginBottom: 12 }}>
            Solo los ves vos y el equipo de administración
          </div>
          <IdentityDocuments submission={lastSubmission} />
        </div>
      )}

      {!fullyVerified && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 18, padding: "14px 16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#9a3412" }}>
            Sin la cuenta verificada no podés publicar autos ni reservar.
            {" "}Te falta: {[
              !emailVerified && "confirmar el email",
              !documentsSubmitted && "enviar DNI y licencia",
              !checklist.dateOfBirthProvided && "tu fecha de nacimiento",
              // El teléfono no bloquea: solo se sugiere si además falta.
              phoneRequired && !phoneVerified && "confirmar el teléfono",
            ].filter(Boolean).join(", ") || "que terminemos de revisar tu documentación"}.
          </div>
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
      {verifications()}
    </div>
  );
}