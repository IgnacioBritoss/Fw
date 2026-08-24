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
import {
  getMyBookings, cancelBooking, acceptBooking, rejectBooking, markReadyForPickup,
  getMyPendingReviews, createReview,
} from "../../services/api";
import ReviewForm from "../../components/ReviewForm";
import UserReputation from "../../components/UserReputation";
import StatusChip from "../../components/StatusChip";
import ConfirmarEscribiendo from "../../components/ConfirmarEscribiendo";
import { useI18n } from "../../i18n/core";
import { localeFor } from "../../i18n/dates";
import Spinner from "../../components/Spinner";
import { useCurrency } from "../../context/CurrencyContext";

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
};

/*
  DISEÑO — el mismo criterio que el panel del dueño y la home.

  Cada reserva era una tarjeta con sombra y 12px de redondeo, adentro una foto
  redondeada de 8, adentro botones redondeados de 8 y un cartel redondeado de 8:
  cuatro rectángulos de puntas redondas metidos uno adentro del otro. Ahora la
  tarjeta se apoya en una línea de 1px, la foto y los botones bajan a 4, y las
  pestañas pasan a ser celdas de una franja como en notificaciones.
*/
const LINEA = "#ececec";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px", marginBottom: 6 },
  titleMobile: { fontSize: 20, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "var(--fw-text-3)", fontSize: 14, marginBottom: 20 },
  tabs: { display: "flex", background: "var(--fw-surface)", border: `1px solid ${LINEA}`, borderRadius: 4, marginBottom: 18, overflowX: "auto" },
  tab: { padding: "12px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", border: "none", borderLeft: "1px solid var(--fw-line-soft)", background: "transparent", color: "var(--fw-text-3)", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabMobile: { flex: 1, padding: "11px 8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", borderLeft: "1px solid var(--fw-line-soft)", background: "transparent", color: "var(--fw-text-3)", borderBottom: "2px solid transparent", whiteSpace: "nowrap" },
  tabActive: { color: "var(--fw-blue)", borderBottom: "2px solid var(--fw-blue)" },
  card: { background: "var(--fw-surface)", borderRadius: 6, padding: 16, marginBottom: 12, display: "flex", gap: 16, border: `1px solid ${LINEA}` },
  cardMobile: { background: "var(--fw-surface)", borderRadius: 6, padding: 14, marginBottom: 10, border: `1px solid ${LINEA}` },
  carImg: { width: 100, height: 76, borderRadius: 4, background: "var(--fw-bg)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  carImgMobile: { width: "100%", height: 140, borderRadius: 4, background: "var(--fw-bg)", overflow: "hidden", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  btnRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  btnAccept: { padding: "8px 16px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  btnReject: { padding: "8px 16px", background: "var(--fw-surface)", border: "1px solid var(--fw-red-line)", color: "var(--fw-red-text)", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  btnQR: { padding: "8px 16px", background: "#0a7d5a", color: "#fff", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  btnPay: { padding: "8px 16px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  btnReady: { padding: "8px 16px", background: "var(--fw-chip)", color: "#fff", border: "none", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  empty: { textAlign: "center", padding: "36px 20px", color: "var(--fw-text-4)", fontSize: 13, background: "var(--fw-surface)", border: `1px solid ${LINEA}`, borderRadius: 4 },
  errorBox: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 4, padding: "12px 16px", fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  // El paso siguiente no es un aviso de color: es una nota al pie de la reserva,
  // separada por una línea igual que el precio en la tarjeta del auto.
  nextStep: { borderTop: "1px solid var(--fw-line-soft)", paddingTop: 10, marginTop: 10, fontSize: 12.5, color: "var(--fw-blue-strong)" },
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
    default:
      return "";
  }
}

export default function MyBookings() {
  const { t, lang } = useI18n();
  const { precio } = useCurrency();
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
  // Qué reserva se está por cancelar. Cancelar no se deshace, así que no alcanza
  // con apretar un botón: el cartel pide escribir la frase. Ver
  // components/ConfirmarEscribiendo.jsx.
  const [cancelando, setCancelando] = useState(null);

  // Trae todas las reservas del usuario. Se reutiliza tras cada acción.
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyBookings()
      .then((data) => setBookings(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch((err) => setError(err.message || t("bookings.loadFailed")))
      .finally(() => setLoading(false));
    // En paralelo: qué reservas se pueden reseñar. Si falla, simplemente no se
    // muestra el botón; no es motivo para romper la pantalla.
    getMyPendingReviews()
      .then((data) => setReviewable(Array.isArray(data) ? data : []))
      .catch(() => setReviewable([]));
  }, [t]);

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
  // Antes esto era un `window.confirm`: el cartel gris del navegador, en el
  // idioma del navegador y con "Aceptar" a un centímetro de "Cancelar". Para
  // algo que no se puede deshacer es poco. Ahora abre el cartel de la app, que
  // pide escribir la frase.
  const handleCancel = (id) => setCancelando(id);

  const confirmarCancelacion = async () => {
    const id = cancelando;
    if (!id) return;
    await runAction(`${id}-cancel`, () => cancelBooking(id));
    setCancelando(null);
  };

  // Tarjeta de una reserva: decide qué botones se muestran según el estado y el
  // rol (dueño o conductor).
  const BookingCard = ({ b, isOwner }) => {
    const vehicle = getVehicleInfo(b);
    const statusCfg = STATUS_CONFIG[b.status] || { label: b.status, tone: "neutral" };
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
          </button>
        )}
        {showPickupQR && (
          <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}?mode=pickup`)}>
            {isOwner ? t("bookings.confirmPickup") : t("bookings.myPickupQr")}
          </button>
        )}
        {showReturnQR && (
          <button style={s.btnQR} onClick={() => navigate(`/qr/${b.id}?mode=return`)}>
            {isOwner ? t("bookings.myReturnQr") : t("bookings.confirmReturn")}
          </button>
        )}
        {canCancel && (
          <button style={s.btnReject} disabled={!!actionLoading} onClick={() => handleCancel(b.id)}>
            {actionLoading === `${b.id}-cancel` ? "..." : t("common.cancel")}
          </button>
        )}
        {/* La reseña se habilita solo cuando la reserva terminó y el pago se
            completó: es lo que hace que las puntuaciones signifiquen algo. */}
        {canReview && (
          <button style={s.btnQR} onClick={() => setReviewingId(b.id)}>
            {isOwner ? t("bookings.rateDriver") : t("bookings.leaveReview")}
          </button>
        )}
      </div>
    );

    const details = (
      <>
        <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 15, marginBottom: 4, color: "var(--fw-text)" }}>
          {vehicle.brand} {vehicle.model} {vehicle.year}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: "var(--fw-text-3)", marginBottom: 4 }}>
          {format(parseISO(b.startDate), "d MMM", { locale: dateLocale })} — {format(parseISO(b.endDate), "d MMM yyyy", { locale: dateLocale })} · {days} {t(days === 1 ? "common.day" : "common.days")}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: "var(--fw-text-2)", marginBottom: 4 }}>
          {isOwner ? `${t("bookings.driver")}: ` : `${t("car.owner")}: `}<strong>{getPersonName(isOwner ? b.renter : b.owner)}</strong>
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
        {/* El precio y los estados, separados del resto por una línea: es el mismo
            renglón de cierre que tiene la tarjeta del auto en la home. La palabra
            "total" estaba escrita a mano acá adentro y no se traducía. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--fw-line-soft)", paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: "var(--fw-text)" }}>
            {precio(total)} <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fw-text-4)" }}>{t("common.total")}</span>
          </div>
          {/* Aire entre estado y estado. Antes eran dos cajitas y 6px alcanzaban
              para separarlas; ahora cada estado termina en su propia línea, y
              con 6px las dos líneas se leían como una sola cortada al medio. */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {b.paymentStatus && b.paymentStatus !== "UNPAID" && (
              <StatusChip tone={paid ? "ok" : "neutral"}>
                {PAYMENT_LABELS[b.paymentStatus] ? t(PAYMENT_LABELS[b.paymentStatus]) : b.paymentStatus}
              </StatusChip>
            )}
            <StatusChip tone={statusCfg.tone || "neutral"}>{t(statusCfg.label)}</StatusChip>
          </div>
        </div>
        {/* Guía del paso siguiente para cada rol. Sin flecha delante: el renglón
            ya está separado por una línea y escrito en azul, así que la flechita
            no agregaba nada y quedaba pegada al texto. */}
        {nextStepFor(b, isOwner) && (
          <div style={s.nextStep}>{t(nextStepFor(b, isOwner))}</div>
        )}
        {reviewingId === b.id ? (
          <ReviewForm
            isOwner={isOwner}
            onCancel={() => setReviewingId(null)}
            onSubmit={async ({ rating, comment, tags }) => {
              await createReview(b.id, { rating, comment, tags });
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
              : <div style={{ color: "var(--fw-text-4)", fontSize: 12 }}>{t("common.noPhoto")}</div>}
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
            : <div style={{ color: "var(--fw-text-4)", fontSize: 12 }}>{t("common.noPhoto")}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{details}</div>
      </div>
    );
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.titleMobile : s.title}>{t("bookings.title")}</div>
      <div style={s.sub}>{t("bookings.subtitle")}</div>
      {error && <div style={s.errorBox}>{error}</div>}
      <div style={s.tabs}>
        {[
          ["mis-reservas", `${t(isMobile ? "bookings.tabRentalsShort" : "bookings.tabRentals")} (${myRentals.length})`],
          ["solicitudes", `${t(isMobile ? "bookings.tabRequestsShort" : "bookings.tabRequests")} (${myOwnerBookings.length})`],
        ].map(([k, l], i) => (
          <button key={k}
            style={{ ...(isMobile ? s.tabMobile : s.tab), ...(tab === k ? s.tabActive : {}), ...(i === 0 ? { borderLeft: "none" } : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {loading ? (
        <Spinner block label={t("common.loading")} />
      ) : tab === "mis-reservas" ? (
        myRentals.length === 0 ? (
          <div style={s.empty}>
            <div style={{ marginBottom: 16 }}>{t("bookings.none")}</div>
            <button style={{ padding: "10px 22px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 14 }} onClick={() => navigate("/buscar")}>{t("bookings.explore")}</button>
          </div>
        ) : myRentals.map((b) => <BookingCard key={b.id} b={b} isOwner={false} />)
      ) : (
        myOwnerBookings.length === 0 ? (
          <div style={s.empty}>{t("bookings.noRequests")}</div>
        ) : myOwnerBookings.map((b) => <BookingCard key={b.id} b={b} isOwner={true} />)
      )}

      <ConfirmarEscribiendo
        abierto={Boolean(cancelando)}
        titulo={t("bookings.confirmCancel")}
        cuerpo={t("bookings.cancelBody")}
        frase={t("bookings.cancelPhrase")}
        textoBoton={t("bookings.cancelDo")}
        trabajando={actionLoading === `${cancelando}-cancel`}
        onConfirmar={confirmarCancelacion}
        onCerrar={() => setCancelando(null)}
      />
    </div>
  );
}
