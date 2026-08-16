// ============================================================================
//  Dashboard — Panel del DUEÑO ("Mis autos")
// ----------------------------------------------------------------------------
//  Es el centro de control de quien publica autos. Muestra estadísticas reales y
//  tres pestañas:
//   - "Mis autos": las publicaciones propias, con DISPONIBILIDAD POR FECHAS
//     (bloquear períodos), pausar/activar el aviso y ver el detalle.
//   - "Solicitudes": reservas pendientes de sus autos, para aceptar o rechazar.
//   - "Historial": todas las reservas de sus autos con su estado y lo cobrado.
//
//  Qué se agregó acá:
//   · El panel de disponibilidad por fechas, que antes no existía en ninguna
//     pantalla (y es lo que hace que el filtro por fechas tenga datos).
//   · Poder pausar y volver a activar una publicación.
//   · Las ganancias, que estaban fijas en "$0", se calculan con las reservas
//     completadas.
//   · El aviso de cuenta sin verificar, que es el motivo por el que publicar
//     puede fallar con un error del servidor.
//
//  DISEÑO — la pantalla era una pila de globos
//  Tres tarjetas flotando con sombra para tres números, pestañas sueltas, las
//  publicaciones en tarjetas de 12px de redondeo y los estados en píldoras de
//  20px: seis formas redondeadas distintas para una pantalla que es una lista.
//  Ahora los números son una franja de celdas separadas por líneas —igual que la
//  ficha técnica de la tarjeta del auto—, las pestañas son celdas de otra franja
//  —igual que en notificaciones y en el buscador—, y el historial es UNA caja con
//  renglones. Nada de sombras: una línea de 1px alcanza para separar.
// ============================================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getMyListings, getMyBookings, acceptBooking, rejectBooking, updateListing,
} from "../../services/api";
import { itemsOf, normalizeListing, priceOf, categoryLabel } from "../../services/listings";
import AvailabilityManager from "../../components/AvailabilityManager";
import { format, parseISO } from "date-fns";
import Spinner from "../../components/Spinner";
import { localeFor, shortDate } from "../../i18n/dates";
import { useI18n } from "../../i18n/core";

// Etiquetas de los estados de una reserva (mismas que en "Mis reservas").
// Claves de traducción: son las mismas etiquetas que usa "Mis reservas".
const STATUS_KEYS = {
  REQUESTED: "status.REQUESTED", ACCEPTED: "status.ACCEPTED", REJECTED: "status.REJECTED",
  CANCELLED_BY_RENTER: "status.CANCELLED", CANCELLED_BY_OWNER: "dash.cancelledByYou",
  READY_FOR_PICKUP: "status.READY_FOR_PICKUP", IN_PROGRESS: "status.IN_PROGRESS",
  RETURN_PENDING: "status.RETURN_PENDING", COMPLETED: "status.COMPLETED", DISPUTED: "status.DISPUTED",
};

// El gris de todas las líneas y bordes de la pantalla: el mismo que usan la home,
// el buscador y las notificaciones. Un solo tono para no tener tres grises casi
// iguales conviviendo.
const LINEA = "#ececec";

const s = {
  page: { maxWidth: 960, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  titleMobile: { fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  btn: { padding: "10px 18px", background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },

  /*
    LOS TRES NÚMEROS, EN UNA FRANJA.

    Eran tres tarjetas con sombra separadas por 14px de aire. Tres cosas que se
    leen juntas —autos, solicitudes, ganancias— no necesitan tres cajas: son las
    celdas de una misma barra, separadas por una línea. Es exactamente el mismo
    recurso que la ficha técnica de la tarjeta del auto.
  */
  franja: { display: "flex", background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 4, overflow: "hidden", marginBottom: 18 },
  franjaCelda: { flex: 1, minWidth: 0, padding: "14px 16px", borderLeft: `1px solid ${LINEA}`, textAlign: "center" },
  statNum: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.4px" },
  statLabel: { fontSize: 11, color: "#9ca3af", marginTop: 3, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" },

  // Las pestañas, otra franja de celdas. La activa se marca con una barra abajo.
  tabs: { display: "flex", background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 4, marginBottom: 18, overflowX: "auto" },
  tab: { padding: "12px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "none", borderLeft: `1px solid #f1f2f4`, background: "transparent", color: "#6b7280", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "#0f6ce6", borderBottom: "2px solid #0f6ce6" },

  card: { background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 6, padding: 16, marginBottom: 12 },
  // El estado de la publicación: un rectángulo con una línea, no una píldora de
  // 20px de redondeo con fondo de color.
  badge: { display: "inline-block", padding: "4px 9px", borderRadius: 3, fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", border: "1px solid" },
  active: { background: "#f0f6ff", color: "#0b55c0", borderColor: "#cfe0fb" },
  paused: { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" },
  linkBtn: { background: "#fff", border: `1px solid ${LINEA}`, color: "#374151", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "8px 14px" },
  accept: { padding: "8px 18px", background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  reject: { padding: "8px 18px", background: "#fff", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  empty: { textAlign: "center", padding: "36px 20px", color: "#9ca3af", background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 4, fontSize: 13 },
  warn: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "13px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, padding: "12px 16px", fontSize: 13, color: "#b91c1c", marginBottom: 16 },

  // El historial es una lista, así que va como UNA caja con renglones separados
  // por una línea, igual que la bandeja de notificaciones.
  lista: { background: "#fff", border: `1px solid ${LINEA}`, borderRadius: 4, overflow: "hidden" },
  fila: (primera) => ({
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    padding: "14px 16px", borderTop: primera ? "none" : "1px solid #f1f2f4", flexWrap: "wrap",
  }),
};

export default function Dashboard() {
  const { t: tr, lang } = useI18n();
  const { user, isVerified, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("autos");
  const [myCars, setMyCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [openAvailability, setOpenAvailability] = useState(null); // id del auto con el panel abierto
  const [error, setError] = useState("");

  // Estado real de verificación: es lo que decide si publicar va a funcionar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUser(); }, []);

  const loadCars = useCallback(() => {
    setLoadingCars(true);
    getMyListings()
      .then(data => setMyCars(itemsOf(data).map(normalizeListing)))
      .catch(err => setError(err.message || tr("dash.errCars")))
      .finally(() => setLoadingCars(false));
  }, [tr]);

  const loadBookings = useCallback(() => {
    setLoadingBookings(true);
    getMyBookings()
      .then(data => setBookings(itemsOf(data)))
      .catch(() => { /* sin reservas todavía */ })
      .finally(() => setLoadingBookings(false));
  }, []);

  useEffect(() => { loadCars(); loadBookings(); }, [loadCars, loadBookings]);

  // Reservas donde soy el DUEÑO (las de mis autos).
  const ownerBookings = useMemo(
    () => bookings.filter(b => b.ownerId === user?.id),
    [bookings, user?.id],
  );
  const requests = useMemo(
    () => ownerBookings.filter(b => b.status === "REQUESTED"),
    [ownerBookings],
  );

  // Ganancias reales: lo que dejaron las reservas ya completadas (lo que cobra
  // el dueño después de la comisión, si el backend lo informó).
  const earnings = useMemo(
    () => ownerBookings
      .filter(b => b.status === "COMPLETED")
      .reduce((sum, b) => sum + Number(b.ownerPayoutSnapshot || b.totalPriceSnapshot || 0), 0),
    [ownerBookings],
  );

  // Acepta o rechaza una solicitud y refresca las listas.
  const respond = async (id, action) => {
    setActionLoading(id);
    setError("");
    try {
      if (action === "accept") await acceptBooking(id);
      else await rejectBooking(id);
      loadBookings();
    } catch (err) {
      setError(err.message || tr("dash.errRequest"));
    } finally {
      setActionLoading(null);
    }
  };

  // Pausa o reactiva una publicación. Pausada deja de aparecer en las búsquedas
  // pero no se borra.
  const toggleListingStatus = async (car) => {
    setActionLoading(car.id);
    setError("");
    try {
      await updateListing(car.id, { status: car.status === "ACTIVE" ? "PAUSED" : "ACTIVE" });
      loadCars();
    } catch (err) {
      setError(err.message || tr("dash.errStatus"));
    } finally {
      setActionLoading(null);
    }
  };

  const vehicleLabel = (b) => {
    const v = b?.listing?.vehicle || b?.vehicle || {};
    return `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim();
  };
  const personName = (p) => p?.displayName || `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || p?.email || "";
  const dateRange = (b) => {
    try {
      return `${format(parseISO(b.startDate), "d MMM", { locale: localeFor(lang) })} - ${shortDate(b.endDate, lang)}`;
    } catch { return ""; }
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.header}>
        <div>
          <div style={isMobile ? s.titleMobile : s.title}>
            {tr("dash.hello", { name: user?.firstName || user?.name?.split(" ")[0] || "" })}
          </div>
          <div style={s.sub}>{tr("dash.subtitle")}</div>
        </div>
        {/* El texto del botón estaba escrito en castellano acá adentro: con la
            app en inglés o en chino seguía diciendo "Publicar". */}
        <button style={s.btn} onClick={() => navigate("/publish")}>+ {tr("dash.publishBtn")}</button>
      </div>

      {/* Sin cuenta verificada el backend rechaza publicar: se avisa antes. */}
      {!isVerified && (
        <div style={s.warn}>
          <div style={{ fontSize: 13, color: "#92400e", flex: 1, minWidth: 200 }}>
            {tr("dash.notVerified")}
          </div>
          <button style={{ ...s.btn, background: "#111827" }} onClick={() => navigate("/kyc")}>
            {tr("profile.verifyNow")}
          </button>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {/* Los tres números, en celdas de una misma franja. La primera no lleva
          línea a la izquierda: quedaría doble contra el borde de la caja. */}
      <div style={s.franja}>
        {[
          [loadingCars ? "..." : myCars.length, tr("dash.publishedCars")],
          [loadingBookings ? "..." : requests.length, tr("dash.requests")],
          [loadingBookings ? "..." : `$${earnings.toLocaleString()}`, tr("dash.earnings")],
        ].map(([num, label], i) => (
          <div key={label} style={{ ...s.franjaCelda, ...(i === 0 ? { borderLeft: "none" } : {}) }}>
            <div style={{ ...s.statNum, fontSize: isMobile ? 18 : 24 }}>{num}</div>
            <div style={{ ...s.statLabel, fontSize: isMobile ? 10 : 11 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.tabs}>
        {[
          ["autos", `${tr("dash.myCars")} (${myCars.length})`],
          ["solicitudes", `${tr("dash.requests")} (${requests.length})`],
          ["historial", tr("dash.history")],
        ].map(([k, l], i) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}), ...(i === 0 ? { borderLeft: "none" } : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── MIS AUTOS ── */}
      {tab === "autos" && (
        loadingCars ? (
          <Spinner block label={tr("common.loading")} />
        ) : myCars.length === 0 ? (
          <div style={s.empty}>
            <div style={{ marginBottom: 16 }}>{tr("dash.noCars")}</div>
            <button style={s.btn} onClick={() => navigate("/publish")}>{tr("dash.publishFirst")}</button>
          </div>
        ) : myCars.map(car => (
          <div key={car.id} style={s.card}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 74, height: 56, borderRadius: 4, overflow: "hidden", background: "#f3f4f6", flexShrink: 0 }}>
                {car.photos?.length > 0
                  ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 10 }}>{tr("common.noPhoto")}</div>}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{car.brand} {car.model} {car.year}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  {car.location} · ${priceOf(car).toLocaleString()}{tr("common.perDay")}
                  {car.category ? ` · ${categoryLabel(tr, car.category)}` : ""}
                </div>
              </div>
              <span style={{ ...s.badge, ...(car.status === "ACTIVE" ? s.active : s.paused) }}>
                {car.status === "ACTIVE" ? tr("dash.active") : car.status === "PAUSED" ? tr("dash.paused") : tr("dash.draft")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {/* El panel de disponibilidad por fechas: lo que le faltaba al
                  filtro de fechas para tener datos que consultar. */}
              <button style={{ ...s.linkBtn, ...(openAvailability === car.id ? { borderColor: "#0f6ce6", color: "#0f6ce6" } : {}) }}
                onClick={() => setOpenAvailability(openAvailability === car.id ? null : car.id)}>
                {openAvailability === car.id ? tr("common.close") : tr("dash.dateAvailability")}
              </button>
              <button style={s.linkBtn} onClick={() => navigate(`/cars/${car.id}`)}>{tr("dash.viewListing")}</button>
              <button style={s.linkBtn} disabled={actionLoading === car.id} onClick={() => toggleListingStatus(car)}>
                {actionLoading === car.id ? "..." : car.status === "ACTIVE" ? tr("dash.pause") : tr("dash.activate")}
              </button>
            </div>

            {openAvailability === car.id && <AvailabilityManager listingId={car.id} />}
          </div>
        ))
      )}

      {/* ── SOLICITUDES ── */}
      {tab === "solicitudes" && (
        loadingBookings ? (
          <Spinner block label={tr("common.loading")} />
        ) : requests.length === 0 ? (
          <div style={s.empty}>{tr("dash.noRequests")}</div>
        ) : requests.map(r => (
          <div key={r.id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{personName(r.renter)}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{vehicleLabel(r)} · {dateRange(r)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f6ce6" }}>
                ${Number(r.totalPriceSnapshot || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button style={s.accept} disabled={actionLoading === r.id} onClick={() => respond(r.id, "accept")}>
                {actionLoading === r.id ? "..." : tr("bookings.accept")}
              </button>
              <button style={s.reject} disabled={actionLoading === r.id} onClick={() => respond(r.id, "reject")}>{tr("bookings.reject")}</button>
              <button style={s.linkBtn} onClick={() => navigate("/my-bookings")}>{tr("dash.seeInBookings")}</button>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
              {tr("dash.acceptNote")}
            </div>
          </div>
        ))
      )}

      {/* ── HISTORIAL ── */}
      {tab === "historial" && (
        loadingBookings ? (
          <Spinner block label={tr("common.loading")} />
        ) : ownerBookings.length === 0 ? (
          <div style={s.empty}>{tr("dash.noHistory")}</div>
        ) : (
          // Una sola caja con renglones: el historial es una lista, no una pila
          // de tarjetas separadas por aire.
          <div style={s.lista}>
            {ownerBookings.map((b, i) => (
              <div key={b.id} style={s.fila(i === 0)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#111827" }}>{vehicleLabel(b)}</div>
                  <div style={{ fontSize: 12.5, color: "#6b7280" }}>
                    {personName(b.renter)} · {dateRange(b)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                    ${Number(b.ownerPayoutSnapshot || b.totalPriceSnapshot || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{STATUS_KEYS[b.status] ? tr(STATUS_KEYS[b.status]) : b.status}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
