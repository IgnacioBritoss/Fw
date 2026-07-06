// ============================================================================
//  MyBookings — MIS RESERVAS (dos roles en una pantalla)
// ----------------------------------------------------------------------------
//  Tiene dos pestañas:
//   - "Mis alquileres": reservas donde el usuario es el INQUILINO (puede pagar,
//     cancelar o mostrar el QR de retiro/devolución).
//   - "Solicitudes recibidas": reservas de SUS autos, donde es el DUEÑO (puede
//     aceptar o rechazar).
//  Cada reserva tiene un estado (pendiente, aceptada, en curso, etc.) que define
//  qué botones se muestran.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getMyBookings, cancelBooking, acceptBooking, rejectBooking } from "../../services/api";

// Configuración visual (texto y colores) para cada estado posible de una reserva.
const STATUS_CONFIG = {
  REQUESTED:           { label: "Pendiente",           bg: "#fef9c3", color: "#854d0e" },
  ACCEPTED:            { label: "Aceptada",             bg: "#dbeafe", color: "#1e40af" },
  REJECTED:            { label: "Rechazada",            bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED_BY_RENTER: { label: "Cancelada",            bg: "#f3f4f6", color: "#6b7280" },
  CANCELLED_BY_OWNER:  { label: "Cancelada por dueño",  bg: "#f3f4f6", color: "#6b7280" },
  READY_FOR_PICKUP:    { label: "Lista para retiro",    bg: "#fef3c7", color: "#92400e" },
  IN_PROGRESS:         { label: "En curso",             bg: "#dcfce7", color: "#166534" },
  RETURN_PENDING:      { label: "Devolución pendiente", bg: "#fef3c7", color: "#92400e" },
  COMPLETED:           { label: "Completada",           bg: "#dbeafe", color: "#1e40af" },
  DISPUTED:            { label: "En disputa",           bg: "#fef2f2", color: "#b91c1c" },
};

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  titleMobile: { fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 28 },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6", overflowX: "auto" },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent", whiteSpace: "nowrap" },
  tabMobile: { padding: "8px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#2563eb", borderBottom: "3px solid #2563eb" },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, display: "flex", gap: 16, border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 10, border: "1px solid #f3f4f6" },
  carImg: { width: 100, height: 76, borderRadius: 8, background: "#f3f4f6", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  carImgMobile: { width: "100%", height: 140, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  statusBadge: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btnRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  btnAccept: { padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnReject: { padding: "7px 16px", background: "transparent", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  btnCancel: { padding: "7px 16px", background: "transparent", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  btnQR: { padding: "7px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnPay: { padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  empty: { textAlign: "center", padding: "60px 0", color: "#9ca3af" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginBottom: 16 },
};

// Extrae los datos del auto de una reserva (tolerando distintas formas del dato).
function getVehicleInfo(booking) {
  const v = booking?.listing?.vehicle || booking?.vehicle || {};
  const l = booking?.listing || {};
  return {
    brand: v.brand || "",
    model: v.model || "",
    year: v.year || "",
    photos: l.photos || v.photos || [],
    pricePerDay: l.pricePerDay || booking?.pricePerDaySnapshot || 0,
  };
}

// Arma el nombre visible de una persona (dueño o conductor).
function getPersonName(person) {
  if (!person) return "";
  return person.displayName || `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || "";
}

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("mis-reservas");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Trae todas las reservas del usuario desde el backend. Se reutiliza tras
  // cada acción (aceptar/rechazar/cancelar) para refrescar la lista.
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch((err) => setError(err.message || "Error al cargar reservas."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Separa las reservas según el rol del usuario en cada una.
  const myRentals = bookings.filter((b) => b.renterId === user?.id);       // soy inquilino
  const myOwnerBookings = bookings.filter((b) => b.ownerId === user?.id);  // soy dueño

  // Acciones del dueño (aceptar/rechazar) y del inquilino (cancelar). Todas
  // llaman al backend y luego recargan la lista.
  const handleAccept = async (id) => {
    setActionLoading(id + "-accept");
    try { await acceptBooking(id); load(); }
    catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id) => {
    setActionLoading(id + "-reject");
    try { await rejectBooking(id); load(); }
    catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Cancelar esta reserva?")) return;
    setActionLoading(id + "-cancel");
    try { await cancelBooking(id); load(); }
    catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  // Tarjeta de una reserva. Calcula días/total y decide qué botones habilitar
  // según el estado y si el usuario es dueño o inquilino.
  const BookingCard = ({ b, isOwner }) => {
    const vehicle = getVehicleInfo(b);
    const statusCfg = STATUS_CONFIG[b.status] || { label: b.status, bg: "#f3f4f6", color: "#6b7280" };
    const days = Math.max(Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / 86400000), 1);
    const total = b.totalPriceSnapshot || (days * Number(vehicle.pricePerDay));
    const canCancelRenter = !isOwner && ["REQUESTED", "ACCEPTED"].includes(b.status);
    const canAcceptOwner = isOwner && b.status === "REQUESTED";
    const canRejectOwner = isOwner && b.status === "REQUESTED";
    const canPayRenter = !isOwner && b.status === "ACCEPTED" && b.paymentStatus !== "PAID";
    const canShowQR = ["ACCEPTED", "READY_FOR_PICKUP", "IN_PROGRESS"].includes(b.status);

    if (isMobile) {
      return (
        <div style={s.cardMobile}>
          <div style={s.carImgMobile}>
            {vehicle.photos?.length > 0
              ? <img src={vehicle.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ color: "#9ca3af", fontSize: 12 }}>Sin foto</div>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#111827" }}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
            {format(parseISO(b.startDate), "d MMM", { locale: es })} — {format(parseISO(b.endDate), "d MMM yyyy", { locale: es })} · {days} día{days !== 1 ? "s" : ""}
          </div>
          {isOwner && <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Conductor: <strong>{getPersonName(b.renter)}</strong></div>}
          {!isOwner && <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Dueño: <strong>{getPersonName(b.owner)}</strong></div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>${Number(total).toLocaleString()}</div>
            <span style={{ ...s.statusBadge, background: statusCfg.bg, color: statusCfg.color, fontSize: 11 }}>{statusCfg.label}</span>
          </div>
          <div style={s.btnRow}>
            {canAcceptOwner && <button style={s.btnAccept} disabled={!!actionLoading} onClick={() => handleAccept(b.id)}>{actionLoading === b.id + "-accept" ? "..." : "Aceptar"}</button>}
            {canRejectOwner && <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleReject(b.id)}>{actionLoading === b.id + "-reject" ? "..." : "Rechazar"}</button>}
            {canCancelRenter && <button style={s.btnCancel} disabled={!!actionLoading} onClick={() => handleCancel(b.id)}>{actionLoading === b.id + "-cancel" ? "..." : "Cancelar"}</button>}
            {canPayRenter && <button style={s.btnPay} onClick={() => navigate(`/payment/${b.id}`)}>Pagar</button>}
            {canShowQR && <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}`)}>QR Retiro/Dev.</button>}
          </div>
        </div>
      );
    }

    return (
      <div style={s.card}>
        <div style={s.carImg}>
          {vehicle.photos?.length > 0
            ? <img src={vehicle.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ color: "#9ca3af", fontSize: 12 }}>Sin foto</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#111827" }}>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            {format(parseISO(b.startDate), "d MMM yyyy", { locale: es })} — {format(parseISO(b.endDate), "d MMM yyyy", { locale: es })} · {days} día{days !== 1 ? "s" : ""}
          </div>
          {isOwner && <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>Conductor: <strong>{getPersonName(b.renter)}</strong></div>}
          {!isOwner && <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>Dueño: <strong>{getPersonName(b.owner)}</strong></div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2563eb" }}>${Number(total).toLocaleString()} total</div>
            <span style={{ ...s.statusBadge, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
          </div>
          <div style={s.btnRow}>
            {canAcceptOwner && <button style={s.btnAccept} disabled={!!actionLoading} onClick={() => handleAccept(b.id)}>{actionLoading === b.id + "-accept" ? "..." : "Aceptar"}</button>}
            {canRejectOwner && <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleReject(b.id)}>{actionLoading === b.id + "-reject" ? "..." : "Rechazar"}</button>}
            {canCancelRenter && <button style={s.btnCancel} disabled={!!actionLoading} onClick={() => handleCancel(b.id)}>{actionLoading === b.id + "-cancel" ? "..." : "Cancelar"}</button>}
            {canPayRenter && <button style={s.btnPay} onClick={() => navigate(`/payment/${b.id}`)}>Pagar</button>}
            {canShowQR && <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}`)}>QR Retiro / Devolución</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.titleMobile : s.title}>Mis reservas</div>
      <div style={s.sub}>Gestioná tus alquileres y solicitudes</div>
      {error && <div style={s.errorBox}>{error}</div>}
      <div style={s.tabs}>
        {[
          ["mis-reservas", isMobile ? `Alquileres (${myRentals.length})` : `Mis alquileres (${myRentals.length})`],
          ["solicitudes", isMobile ? `Solicitudes (${myOwnerBookings.length})` : `Solicitudes recibidas (${myOwnerBookings.length})`],
        ].map(([k, l]) => (
          <button key={k} style={{ ...(isMobile ? s.tabMobile : s.tab), ...(tab === k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {loading ? (
        <div style={s.empty}><div style={{ color: "#9ca3af", fontSize: 13 }}>Cargando reservas...</div></div>
      ) : tab === "mis-reservas" ? (
        myRentals.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Todavía no hiciste ninguna reserva.</div>
            <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/")}>Explorar autos</button>
          </div>
        ) : myRentals.map((b) => <BookingCard key={b.id} b={b} isOwner={false} />)
      ) : (
        myOwnerBookings.length === 0 ? (
          <div style={s.empty}><div style={{ fontSize: 13 }}>No hay solicitudes para tus autos.</div></div>
        ) : myOwnerBookings.map((b) => <BookingCard key={b.id} b={b} isOwner={true} />)
      )}
    </div>
  );
}