import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getMyListings, getMyBookings, acceptBooking, rejectBooking } from "../../services/api";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const TRANSMISSION_LABELS = { MANUAL: "Manual", AUTOMATIC: "Automático" };
const FUEL_LABELS = { GASOLINE: "Nafta", DIESEL: "Diesel", ELECTRIC: "Eléctrico", OTHER: "GNC" };

function normalizeListing(l) {
  const v = l.vehicle || {};
  return {
    id: l.id,
    brand: v.brand || l.brand || "",
    model: v.model || l.model || "",
    year: v.year || l.year || "",
    price_per_day: l.pricePerDay || l.price_per_day || 0,
    location: l.locationText || l.location || "",
    transmission: TRANSMISSION_LABELS[v.transmission] || v.transmission || "",
    fuel: FUEL_LABELS[v.fuelType] || v.fuelType || "",
    seats: v.seats || l.seats,
    color: v.color || l.color,
    photos: l.photos || v.photos || [],
    available: l.status === "ACTIVE" || l.available !== false,
    approved: l.status === "ACTIVE",
    description: l.description || "",
    owner_id: l.ownerId || l.owner_id,
  };
}

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  headerMobile: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  titleMobile: { fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  btn: { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  btnMobile: { padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6", overflowX: "auto" },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent", whiteSpace: "nowrap" },
  tabMobile: { padding: "8px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#2563eb", borderBottom: "3px solid #2563eb" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 },
  statsRowMobile: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 },
  stat: { background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center", border: "1px solid #f3f4f6" },
  statMobile: { background: "#fff", borderRadius: 10, padding: "12px 8px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", textAlign: "center", border: "1px solid #f3f4f6" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#2563eb" },
  statNumMobile: { fontSize: 20, fontWeight: 800, color: "#2563eb" },
  statLabel: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  statLabelMobile: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 10, border: "1px solid #f3f4f6" },
  carInfo: { flex: 1 },
  carName: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  carMeta: { color: "#6b7280", fontSize: 13, marginBottom: 6 },
  statusBadge: { display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusBadgeMobile: { display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  verified: { background: "#dbeafe", color: "#1e40af" },
  pending: { background: "#fef9c3", color: "#854d0e" },
  solicitud: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, border: "1px solid #f3f4f6" },
  solicitudMobile: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 10, border: "1px solid #f3f4f6" },
  solHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  solName: { fontWeight: 600, fontSize: 15 },
  solDates: { fontSize: 13, color: "#6b7280" },
  btnRow: { display: "flex", gap: 8, marginTop: 12 },
  btnAccept: { padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnReject: { padding: "8px 18px", background: "transparent", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  empty: { textAlign: "center", padding: "40px 0", color: "#9ca3af" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("autos");
  const [requests, setRequests] = useState([]);
  const [myCars, setMyCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    getMyListings()
      .then(data => setMyCars((Array.isArray(data) ? data : (data?.data ?? [])).map(normalizeListing)))
      .catch(() => {})
      .finally(() => setLoadingCars(false));
  }, [user?.id]);

  const loadRequests = useCallback(() => {
    setLoadingRequests(true);
    getMyBookings()
      .then(data => {
        const all = Array.isArray(data) ? data : (data?.data ?? []);
        setRequests(all.filter(b => b.ownerId === user?.id && b.status === "REQUESTED"));
      })
      .catch(() => {})
      .finally(() => setLoadingRequests(false));
  }, [user?.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const respond = async (id, action) => {
    setActionLoading(id);
    try {
      if (action === "accepted") await acceptBooking(id);
      else await rejectBooking(id);
      loadRequests();
    } catch {}
    finally { setActionLoading(null); }
  };

  function getVehicleLabel(b) {
    const v = b?.listing?.vehicle || {};
    return `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim();
  }
  function getRenterName(b) {
    const r = b?.renter || {};
    return r.displayName || `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.email || "";
  }
  function getDateRange(b) {
    try {
      return `${format(parseISO(b.startDate), "d MMM", { locale: es })} - ${format(parseISO(b.endDate), "d MMM yyyy", { locale: es })}`;
    } catch { return ""; }
  }

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.headerMobile : s.header}>
        <div>
          <div style={isMobile ? s.titleMobile : s.title}>
            Hola, {user?.name?.split(" ")[0] || user?.firstName}
          </div>
          <div style={s.sub}>Panel de control</div>
        </div>
        <button style={isMobile ? s.btnMobile : s.btn} onClick={() => navigate("/publish")}>+ Publicar</button>
      </div>

      <div style={isMobile ? s.statsRowMobile : s.statsRow}>
        {[
          [loadingCars ? "..." : myCars.length, "Autos publicados"],
          [loadingRequests ? "..." : requests.length, "Solicitudes"],
          ["$0", "Ganancias"],
        ].map(([num, label]) => (
          <div key={label} style={isMobile ? s.statMobile : s.stat}>
            <div style={isMobile ? s.statNumMobile : s.statNum}>{num}</div>
            <div style={isMobile ? s.statLabelMobile : s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.tabs}>
        {[["autos", "Mis autos"], ["solicitudes", "Solicitudes"], ["historial", "Historial"]].map(([k, l]) => (
          <button key={k} style={{ ...(isMobile ? s.tabMobile : s.tab), ...(tab === k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "autos" && (
        loadingCars ? (
          <div style={s.empty}><div style={{ fontSize: 13, color: "#9ca3af" }}>Cargando tus autos...</div></div>
        ) : myCars.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 13, marginBottom: 16, color: "#9ca3af" }}>Todavía no publicaste ningún auto.</div>
            <button style={s.btn} onClick={() => navigate("/publish")}>Publicar mi primer auto</button>
          </div>
        ) : myCars.map(car => (
          isMobile ? (
            <div key={car.id} style={s.cardMobile} onClick={() => navigate(`/cars/${car.id}`)}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 56, height: 42, borderRadius: 8, overflow: "hidden", background: "#f3f4f6", flexShrink: 0 }}>
                  {car.photos?.length > 0
                    ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 10 }}>Sin foto</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{car.brand} {car.model} {car.year}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{car.location}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>${Number(car.price_per_day).toLocaleString()}/día</div>
                <span style={{ ...s.statusBadgeMobile, ...(car.approved ? s.verified : s.pending) }}>{car.approved ? "Activo" : "Pendiente"}</span>
              </div>
            </div>
          ) : (
            <div key={car.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => navigate(`/cars/${car.id}`)}>
              <div style={{ width: 60, height: 44, borderRadius: 8, overflow: "hidden", background: "#f3f4f6", marginRight: 16, flexShrink: 0 }}>
                {car.photos?.length > 0
                  ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 11 }}>Sin foto</div>}
              </div>
              <div style={s.carInfo}>
                <div style={s.carName}>{car.brand} {car.model} {car.year}</div>
                <div style={s.carMeta}>{car.location} · ${Number(car.price_per_day).toLocaleString()}/día</div>
              </div>
              <span style={{ ...s.statusBadge, ...(car.approved ? s.verified : s.pending) }}>{car.approved ? "Activo" : "Pendiente verificación"}</span>
            </div>
          )
        ))
      )}

      {tab === "solicitudes" && (
        loadingRequests ? (
          <div style={s.empty}><div style={{ fontSize: 13, color: "#9ca3af" }}>Cargando solicitudes...</div></div>
        ) : requests.length === 0 ? (
          <div style={s.empty}><div style={{ fontSize: 13, color: "#9ca3af" }}>No hay solicitudes pendientes.</div></div>
        ) : requests.map(r => (
          <div key={r.id} style={isMobile ? s.solicitudMobile : s.solicitud}>
            <div style={s.solHeader}>
              <div>
                <div style={{ ...s.solName, fontSize: isMobile ? 14 : 15 }}>{getRenterName(r)}</div>
                <div style={{ ...s.solDates, fontSize: isMobile ? 12 : 13 }}>{getVehicleLabel(r)} · {getDateRange(r)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, color: "#2563eb" }}>${Number(r.totalPriceSnapshot || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style={s.btnRow}>
              <button style={{ ...s.btnAccept, padding: isMobile ? "7px 14px" : "8px 18px", fontSize: isMobile ? 12 : 13 }} disabled={actionLoading === r.id} onClick={() => respond(r.id, "accepted")}>{actionLoading === r.id ? "..." : "Aceptar"}</button>
              <button style={{ ...s.btnReject, padding: isMobile ? "7px 14px" : "8px 18px", fontSize: isMobile ? 12 : 13 }} disabled={actionLoading === r.id} onClick={() => respond(r.id, "rejected")}>Rechazar</button>
            </div>
          </div>
        ))
      )}

      {tab === "historial" && (
        <div style={s.empty}><div style={{ fontSize: 13, color: "#9ca3af" }}>El historial aparecerá acá.</div></div>
      )}
    </div>
  );
}