// ============================================================================
//  MyBookings — MIS RESERVAS (dos roles en una pantalla)
// ----------------------------------------------------------------------------
//  Dos pestañas:
//   - "Mis alquileres": donde el usuario es el INQUILINO (paga, cancela, muestra
//     el QR de retiro y confirma la devolución).
//   - "Solicitudes recibidas": donde es el DUEÑO (acepta, rechaza, marca el auto
//     listo para retiro y confirma la entrega con el QR del conductor).
//
//  EL CIRCUITO COMPLETO ENTRE LOS DOS USUARIOS
//   1. El conductor pide la reserva                → Pendiente
//   2. El dueño la acepta                          → Aceptada
//   3. El conductor paga (seña + saldo + depósito) → Paga
//   4. El dueño marca "listo para retiro"          → Lista para retiro
//   5. El conductor muestra su QR y el dueño lo confirma → En curso
//   6. Al devolver, el dueño muestra su QR y el conductor lo confirma → Completada
//
//  Antes esta pantalla se detenía en el paso 3: no existía el botón para marcar
//  el auto listo, el botón de QR llevaba a una ruta que no estaba en la app, y
//  el estado del pago se comparaba con un valor ("PAID") que el backend nunca
//  usa. Por eso la gestión entre dos usuarios no se podía terminar.
// ============================================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { format, parseISO } from "date-fns";
<<<<<<< HEAD
import { es } from "date-fns/locale";
=======
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
import {
  getMyBookings, cancelBooking, acceptBooking, rejectBooking, markReadyForPickup,
  getMyPendingReviews, createReview,
} from "../../services/api";
import ReviewForm from "../../components/ReviewForm";
import UserReputation from "../../components/UserReputation";
<<<<<<< HEAD

// Configuración visual (texto y colores) de cada estado de una reserva.
const STATUS_CONFIG = {
  REQUESTED:           { label: "Pendiente",             bg: "#fef9c3", color: "#854d0e" },
  ACCEPTED:            { label: "Aceptada",              bg: "#dbeafe", color: "#1e40af" },
  REJECTED:            { label: "Rechazada",             bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED_BY_RENTER: { label: "Cancelada",             bg: "#f3f4f6", color: "#6b7280" },
  CANCELLED_BY_OWNER:  { label: "Cancelada por dueño",   bg: "#f3f4f6", color: "#6b7280" },
  READY_FOR_PICKUP:    { label: "Lista para retiro",     bg: "#fef3c7", color: "#92400e" },
  IN_PROGRESS:         { label: "En curso",              bg: "#dcfce7", color: "#166534" },
  RETURN_PENDING:      { label: "Devolución pendiente",  bg: "#fef3c7", color: "#92400e" },
  COMPLETED:           { label: "Completada",            bg: "#dbeafe", color: "#1e40af" },
  DISPUTED:            { label: "En disputa",            bg: "#fef2f2", color: "#b91c1c" },
};

// Estados de pago que usa el backend (PENDING → DEPOSIT_PAID → FULLY_PAID).
const PAYMENT_LABELS = {
  UNPAID: "Sin pagar", PENDING: "Pago pendiente", DEPOSIT_PAID: "Seña paga",
  FULLY_PAID: "Pago completo", REFUNDED: "Reintegrado",
  PARTIALLY_REFUNDED: "Reintegro parcial", FAILED: "Pago fallido",
=======
import StatusChip from "../../components/StatusChip";
import { useI18n } from "../../i18n/core";
import { localeFor } from "../../i18n/dates";
import Spinner from "../../components/Spinner";

// Configuración visual (texto y colores) de cada estado de una reserva.
const STATUS_CONFIG = {
  REQUESTED: { label: "status.REQUESTED", tone: "warn" },
  ACCEPTED: { label: "status.ACCEPTED", tone: "info" },
  REJECTED: { label: "status.REJECTED", tone: "danger" },
  CANCELLED_BY_RENTER: { label: "status.CANCELLED_BY_RENTER", tone: "neutral" },
  CANCELLED_BY_OWNER: { label: "status.CANCELLED_BY_OWNER", tone: "neutral" },
  READY_FOR_PICKUP: { label: "status.READY_FOR_PICKUP", tone: "warn" },
  // "live" es el único con el punto lleno: es lo que está pasando ahora.
  IN_PROGRESS: { label: "status.IN_PROGRESS", tone: "live" },
  RETURN_PENDING: { label: "status.RETURN_PENDING", tone: "warn" },
  COMPLETED: { label: "status.COMPLETED", tone: "info" },
  DISPUTED: { label: "status.DISPUTED", tone: "danger" },
};

// Estados de pago que usa el backend (PENDING → DEPOSIT_PAID → FULLY_PAID).
// Claves de traducción, no textos: el idioma se resuelve al dibujar.
const PAYMENT_LABELS = {
  UNPAID: "payment.UNPAID", PENDING: "payment.PENDING", DEPOSIT_PAID: "payment.DEPOSIT_PAID",
  FULLY_PAID: "payment.FULLY_PAID", REFUNDED: "payment.REFUNDED",
  PARTIALLY_REFUNDED: "payment.PARTIALLY_REFUNDED", FAILED: "payment.FAILED",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
  statusBadge: { display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
=======
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  btnRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  btnAccept: { padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnReject: { padding: "7px 16px", background: "transparent", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  btnQR: { padding: "7px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnPay: { padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnReady: { padding: "7px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  empty: { textAlign: "center", padding: "60px 0", color: "#9ca3af" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginBottom: 16 },
  nextStep: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#1e40af", marginTop: 10 },
};

// Datos del auto de una reserva (tolerando las distintas formas del dato).
function getVehicleInfo(booking) {
  const v = booking?.listing?.vehicle || booking?.vehicle || {};
  const l = booking?.listing || {};
  return {
    brand: v.brand || "", model: v.model || "", year: v.year || "",
    photos: booking?.photos || l.photos || [],
    pricePerDay: l.pricePerDay || booking?.pricePerDaySnapshot || 0,
  };
}

function getPersonName(person) {
  if (!person) return "";
  return person.displayName || `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || "";
}

/**
 * Qué le toca hacer a cada uno según el estado. Es lo que evita que la reserva
 * quede trabada porque ninguno sabe cuál es el paso siguiente.
 */
function nextStepFor(booking, isOwner) {
  const paid = booking.paymentStatus === "FULLY_PAID";
  switch (booking.status) {
    case "REQUESTED":
<<<<<<< HEAD
      return isOwner ? "Aceptá o rechazá la solicitud." : "Esperando que el dueño acepte.";
    case "ACCEPTED":
      if (!paid) return isOwner ? "Esperando que el conductor pague." : "Pagá para confirmar la reserva.";
      return isOwner ? "Ya está pago: marcá el auto listo para retiro." : "Pago confirmado. El dueño va a preparar el auto.";
    case "READY_FOR_PICKUP":
      return isOwner ? "Al entregar el auto, pedile el QR de retiro y confirmalo." : "Mostrale tu QR de retiro al dueño cuando retires el auto.";
    case "IN_PROGRESS":
      return isOwner ? "Al recibir el auto, mostrale tu QR de devolución al conductor." : "Al devolver el auto, escaneá el QR del dueño para cerrar la reserva.";
    case "COMPLETED":
      return "Reserva completada.";
=======
      return isOwner ? "step.ownerDecide" : "step.waitOwner";
    case "ACCEPTED":
      if (!paid) return isOwner ? "step.waitPay" : "step.payNow";
      return isOwner ? "step.markReady" : "step.paidWaitOwner";
    case "READY_FOR_PICKUP":
      return isOwner ? "step.ownerScanPickup" : "step.renterShowPickup";
    case "IN_PROGRESS":
      return isOwner ? "step.ownerShowReturn" : "step.renterScanReturn";
    case "COMPLETED":
      return "step.done";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    default:
      return "";
  }
}

export default function MyBookings() {
  const { t, lang } = useI18n();
  const dateLocale = localeFor(lang);
  const { user } = useAuth();
  // Qué reservas se pueden reseñar y cuáles ya se reseñaron. Lo decide el
  // backend (reserva completada y pago cerrado), así la pantalla no adivina.
  const [reviewable, setReviewable] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);

  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("mis-reservas");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Trae todas las reservas del usuario. Se reutiliza tras cada acción.
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : (data?.data ?? [])))
<<<<<<< HEAD
      .catch((err) => setError(err.message || "Error al cargar reservas."))
=======
      .catch((err) => setError(err.message || t("bookings.loadFailed")))
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      .finally(() => setLoading(false));
    // En paralelo: qué reservas se pueden reseñar. Si falla, simplemente no se
    // muestra el botón; no es motivo para romper la pantalla.
    getMyPendingReviews()
      .then((data) => setReviewable(Array.isArray(data) ? data : []))
      .catch(() => setReviewable([]));
<<<<<<< HEAD
  }, []);
=======
  }, [t]);
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

  useEffect(() => { load(); }, [load]);

  const myRentals = useMemo(() => bookings.filter((b) => b.renterId === user?.id), [bookings, user?.id]);
  const myOwnerBookings = useMemo(() => bookings.filter((b) => b.ownerId === user?.id), [bookings, user?.id]);

  // Acción genérica: ejecuta, muestra el error si falla y recarga la lista.
  const runAction = async (key, fn) => {
    setActionLoading(key);
    setError(null);
    try { await fn(); load(); }
    catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  const handleAccept = (id) => runAction(`${id}-accept`, () => acceptBooking(id));
  const handleReject = (id) => runAction(`${id}-reject`, () => rejectBooking(id));
  const handleReady = (id) => runAction(`${id}-ready`, () => markReadyForPickup(id));
  const handleCancel = (id) => {
<<<<<<< HEAD
    if (!window.confirm("¿Cancelar esta reserva?")) return;
=======
    if (!window.confirm(t("bookings.confirmCancel"))) return;
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    runAction(`${id}-cancel`, () => cancelBooking(id));
  };

  // Tarjeta de una reserva: decide qué botones se muestran según el estado y el
  // rol (dueño o conductor).
  const BookingCard = ({ b, isOwner }) => {
    const vehicle = getVehicleInfo(b);
<<<<<<< HEAD
    const statusCfg = STATUS_CONFIG[b.status] || { label: b.status, bg: "#f3f4f6", color: "#6b7280" };
=======
    const statusCfg = STATUS_CONFIG[b.status] || { label: b.status, tone: "neutral" };
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    const days = Math.max(Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / 86400000), 1);
    const total = b.totalPriceSnapshot || (days * Number(vehicle.pricePerDay));
    const paid = b.paymentStatus === "FULLY_PAID";

    const canCancel = ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"].includes(b.status);
    // El backend ya dijo qué reservas se pueden reseñar y cuáles no.
    const reviewInfo = reviewable.find(r => r.bookingId === b.id);
    const canReview = Boolean(reviewInfo) && !reviewInfo.alreadyReviewed;
    const canAcceptOwner = isOwner && b.status === "REQUESTED";
    // El pago lo hace el conductor una vez aceptada la reserva.
    const canPayRenter = !isOwner && b.status === "ACCEPTED" && !paid;
    // El dueño marca el auto listo recién cuando está todo pago.
    const canMarkReady = isOwner && b.status === "ACCEPTED" && paid;
    // El QR aparece en los momentos en que hace falta: retiro y devolución.
    const showPickupQR = b.status === "READY_FOR_PICKUP";
    const showReturnQR = ["IN_PROGRESS", "RETURN_PENDING"].includes(b.status);

    const buttons = (
      <div style={s.btnRow}>
        {canAcceptOwner && (
          <>
            <button style={s.btnAccept} disabled={!!actionLoading} onClick={() => handleAccept(b.id)}>
<<<<<<< HEAD
              {actionLoading === `${b.id}-accept` ? "..." : "Aceptar"}
            </button>
            <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleReject(b.id)}>
              {actionLoading === `${b.id}-reject` ? "..." : "Rechazar"}
            </button>
          </>
        )}
        {canPayRenter && <button style={s.btnPay} onClick={() => navigate(`/payment/${b.id}`)}>Pagar</button>}
        {canMarkReady && (
          <button style={s.btnReady} disabled={!!actionLoading} onClick={() => handleReady(b.id)}>
            {actionLoading === `${b.id}-ready` ? "..." : "Marcar listo para retiro"}
=======
              {actionLoading === `${b.id}-accept` ? "..." : t("bookings.accept")}
            </button>
            <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleReject(b.id)}>
              {actionLoading === `${b.id}-reject` ? "..." : t("bookings.reject")}
            </button>
          </>
        )}
        {canPayRenter && <button style={s.btnPay} onClick={() => navigate(`/payment/${b.id}`)}>{t("bookings.pay")}</button>}
        {canMarkReady && (
          <button style={s.btnReady} disabled={!!actionLoading} onClick={() => handleReady(b.id)}>
            {actionLoading === `${b.id}-ready` ? "..." : t("bookings.markReady")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        )}
        {showPickupQR && (
          <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}?mode=pickup`)}>
<<<<<<< HEAD
            {isOwner ? "Confirmar retiro" : "Mi QR de retiro"}
=======
            {isOwner ? t("bookings.confirmPickup") : t("bookings.myPickupQr")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        )}
        {showReturnQR && (
          <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}?mode=return`)}>
<<<<<<< HEAD
            {isOwner ? "Mi QR de devolución" : "Confirmar devolución"}
=======
            {isOwner ? t("bookings.myReturnQr") : t("bookings.confirmReturn")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        )}
        {canCancel && (
          <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleCancel(b.id)}>
<<<<<<< HEAD
            {actionLoading === `${b.id}-cancel` ? "..." : "Cancelar"}
=======
            {actionLoading === `${b.id}-cancel` ? "..." : t("common.cancel")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        )}
        {/* La reseña se habilita solo cuando la reserva terminó y el pago se
            completó: es lo que hace que las puntuaciones signifiquen algo. */}
        {canReview && (
          <button style={s.btnQR} onClick={() => setReviewingId(b.id)}>
<<<<<<< HEAD
            {isOwner ? "Calificar al conductor" : "Dejar reseña"}
=======
            {isOwner ? t("bookings.rateDriver") : t("bookings.leaveReview")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        )}
      </div>
    );

    const details = (
      <>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15, marginBottom: 4, color: "#111827" }}>
          {vehicle.brand} {vehicle.model} {vehicle.year}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: "#6b7280", marginBottom: 4 }}>
<<<<<<< HEAD
          {format(parseISO(b.startDate), "d MMM", { locale: es })} — {format(parseISO(b.endDate), "d MMM yyyy", { locale: es })} · {days} día{days !== 1 ? "s" : ""}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: "#374151", marginBottom: 4 }}>
          {isOwner ? "Conductor: " : "Dueño: "}<strong>{getPersonName(isOwner ? b.renter : b.owner)}</strong>
=======
          {format(parseISO(b.startDate), "d MMM", { locale: dateLocale })} — {format(parseISO(b.endDate), "d MMM yyyy", { locale: dateLocale })} · {days} {t(days === 1 ? "common.day" : "common.days")}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: "#374151", marginBottom: 4 }}>
          {isOwner ? `${t("bookings.driver")}: ` : `${t("car.owner")}: `}<strong>{getPersonName(isOwner ? b.renter : b.owner)}</strong>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
        {/* La calificación de la otra persona, en el momento en que hace falta:
            el dueño la ve al decidir si acepta la solicitud, y quien alquila la
            ve del dueño del auto. Se muestra solo el rol que corresponde. */}
        <UserReputation
          userId={isOwner ? b.renterId : b.ownerId}
          role={isOwner ? "driver" : "owner"}
          compact
          style={{ marginBottom: 6 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "#2563eb" }}>
            ${Number(total).toLocaleString()} total
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {b.paymentStatus && b.paymentStatus !== "UNPAID" && (
<<<<<<< HEAD
              <span style={{ ...s.statusBadge, background: paid ? "#dcfce7" : "#f3f4f6", color: paid ? "#166534" : "#6b7280", fontSize: 11 }}>
                {PAYMENT_LABELS[b.paymentStatus] || b.paymentStatus}
              </span>
            )}
            <span style={{ ...s.statusBadge, background: statusCfg.bg, color: statusCfg.color, fontSize: isMobile ? 11 : 12 }}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        {/* Guía del paso siguiente para cada rol. */}
        {nextStepFor(b, isOwner) && <div style={s.nextStep}>{nextStepFor(b, isOwner)}</div>}
=======
              <StatusChip tone={paid ? "ok" : "neutral"}>
                {PAYMENT_LABELS[b.paymentStatus] ? t(PAYMENT_LABELS[b.paymentStatus]) : b.paymentStatus}
              </StatusChip>
            )}
            <StatusChip tone={statusCfg.tone || "neutral"}>{t(statusCfg.label)}</StatusChip>
          </div>
        </div>
        {/* Guía del paso siguiente para cada rol. */}
        {nextStepFor(b, isOwner) && <div style={s.nextStep}>{t(nextStepFor(b, isOwner))}</div>}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        {reviewingId === b.id ? (
          <ReviewForm
            isOwner={isOwner}
            onCancel={() => setReviewingId(null)}
            onSubmit={async ({ rating, comment }) => {
              await createReview(b.id, { rating, comment });
              setReviewingId(null);
              load();
            }}
          />
        ) : buttons}
      </>
    );

    if (isMobile) {
      return (
        <div style={s.cardMobile}>
          <div style={s.carImgMobile}>
            {vehicle.photos?.length > 0
              ? <img src={vehicle.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<<<<<<< HEAD
              : <div style={{ color: "#9ca3af", fontSize: 12 }}>Sin foto</div>}
=======
              : <div style={{ color: "#9ca3af", fontSize: 12 }}>{t("common.noPhoto")}</div>}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
          {details}
        </div>
      );
    }

    return (
      <div style={s.card}>
        <div style={s.carImg}>
          {vehicle.photos?.length > 0
            ? <img src={vehicle.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<<<<<<< HEAD
            : <div style={{ color: "#9ca3af", fontSize: 12 }}>Sin foto</div>}
=======
            : <div style={{ color: "#9ca3af", fontSize: 12 }}>{t("common.noPhoto")}</div>}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{details}</div>
      </div>
    );
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
<<<<<<< HEAD
      <div style={isMobile ? s.titleMobile : s.title}>Mis reservas</div>
      <div style={s.sub}>Gestioná tus alquileres y las solicitudes de tus autos</div>
      {error && <div style={s.errorBox}>{error}</div>}
      <div style={s.tabs}>
        {[
          ["mis-reservas", isMobile ? `Alquileres (${myRentals.length})` : `Mis alquileres (${myRentals.length})`],
          ["solicitudes", isMobile ? `Solicitudes (${myOwnerBookings.length})` : `Solicitudes recibidas (${myOwnerBookings.length})`],
=======
      <div style={isMobile ? s.titleMobile : s.title}>{t("bookings.title")}</div>
      <div style={s.sub}>{t("bookings.subtitle")}</div>
      {error && <div style={s.errorBox}>{error}</div>}
      <div style={s.tabs}>
        {[
          ["mis-reservas", `${t(isMobile ? "bookings.tabRentalsShort" : "bookings.tabRentals")} (${myRentals.length})`],
          ["solicitudes", `${t(isMobile ? "bookings.tabRequestsShort" : "bookings.tabRequests")} (${myOwnerBookings.length})`],
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        ].map(([k, l]) => (
          <button key={k} style={{ ...(isMobile ? s.tabMobile : s.tab), ...(tab === k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {loading ? (
<<<<<<< HEAD
        <div style={s.empty}>Cargando reservas...</div>
      ) : tab === "mis-reservas" ? (
        myRentals.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>Todavía no hiciste ninguna reserva.</div>
            <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/buscar")}>Explorar autos</button>
=======
        <Spinner block label={t("common.loading")} />
      ) : tab === "mis-reservas" ? (
        myRentals.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>{t("bookings.none")}</div>
            <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/buscar")}>{t("bookings.explore")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        ) : myRentals.map((b) => <BookingCard key={b.id} b={b} isOwner={false} />)
      ) : (
        myOwnerBookings.length === 0 ? (
<<<<<<< HEAD
          <div style={s.empty}>No hay solicitudes para tus autos.</div>
=======
          <div style={s.empty}>{t("bookings.noRequests")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        ) : myOwnerBookings.map((b) => <BookingCard key={b.id} b={b} isOwner={true} />)
      )}
    </div>
  );
}
