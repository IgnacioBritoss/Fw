// ============================================================================
//  Payment — Pantalla de PAGO de una reserva
// ----------------------------------------------------------------------------
//  El pago está partido en tres tramos, como en un alquiler real:
//    · Seña      → confirma la reserva.
//    · Saldo     → el resto del alquiler.
//    · Depósito  → se retiene como garantía y se devuelve al entregar el auto.
//
//  El detalle de montos lo calcula el BACKEND al aceptarse la reserva (comisión,
//  seguro, seña y depósito), así que acá se muestra ese detalle y no una cuenta
//  hecha en el navegador.
//
//  Qué se arregló acá: se llamaba a rutas que ya no existen
//  (mock-intent / mock-confirm sin tramos), así que el pago fallaba con un 404 y
//  la reserva se quedaba sin pagar para siempre. Con la reserva sin pagar, el
//  dueño nunca podía marcar el auto listo para retiro: el circuito entre los dos
//  usuarios quedaba cortado ahí.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getBookingById, getBookingPaymentStatus, mockConfirmPayment, mockFailPayment,
} from "../../services/api";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import { longDate } from "../../i18n/dates";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { maxWidth: 600, margin: "0 auto", padding: "20px 16px" },
  title: { fontSize: 22, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { fontSize: 14, color: "var(--fw-text-3)", marginBottom: 28 },
  card: { background: "var(--fw-surface)", border: "1px solid var(--fw-border)", borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)" },
  row: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--fw-text-2)", marginBottom: 8 },
  totalRow: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "var(--fw-text)", borderTop: "1px solid var(--fw-border)", paddingTop: 12, marginTop: 4 },
  payBtn: { width: "100%", padding: "15px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  payBtnDisabled: { width: "100%", padding: "15px", background: "var(--fw-blue-line)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  /*
    El botón de forzar el rechazo: rojo lleno, letra blanca, SIEMPRE.

    Era transparente con el borde rosa. Dos problemas: al lado del botón azul
    lleno de arriba parecía deshabilitado, y "transparent" toma el fondo de
    atrás, así que en modo oscuro quedaba letra roja sobre gris oscuro, que se
    lee mal. Con el fondo escrito acá el botón se ve igual en los dos modos.
  */
  failBtn: { width: "100%", padding: "12px", background: "var(--fw-red)", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  successBox: { textAlign: "center", padding: "48px 0" },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-blue-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  failIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  secureNote: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12, color: "var(--fw-text-4)", marginTop: 16 },
  error: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  info: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 },
  step: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "9px 12px", borderRadius: 8, marginBottom: 8 },
};

// Fila "etiqueta ─ valor" reutilizable del resumen.
function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={{ color: "var(--fw-text-3)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/*
  ACÁ NO SE CONVIERTE LA MONEDA, A PROPÓSITO.

  En el resto de la app el precio se muestra en la moneda que eligió cada uno,
  para poder dimensionarlo. Pero esta es la pantalla del cobro: lo que se debita
  son pesos argentinos, y escribir "US$ 26" al lado del botón de pagar sería
  decir que se cobra en dólares. Los números de acá son los de la operación.
*/
const money = (value) => `$${Number(value || 0).toLocaleString("es-AR")} ARS`;

export default function Payment() {
  const { t: tr, lang } = useI18n();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const stateData = location.state || {};

  const [booking, setBooking] = useState(stateData.booking || null);
  const [payment, setPayment] = useState(null);   // detalle de montos del backend
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  // Trae la reserva y el estado del pago (montos ya calculados por el backend).
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingData, paymentData] = await Promise.all([
        getBookingById(bookingId),
        getBookingPaymentStatus(bookingId).catch(() => null),
      ]);
      setBooking(bookingData);
      setPayment(paymentData);
    } catch (err) {
      setError(err.message || tr("payment.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, tr]);

  useEffect(() => { load(); }, [load]);

  /**
   * Paga la reserva completa: seña + saldo + depósito retenido.
   * El backend solo lo permite con el proveedor de pagos en modo simulación
   * (el que se usa para la demo); con el proveedor real el cobro lo confirma
   * la pasarela.
   */
  const handlePay = async () => {
    setPaying(true);
    setError(null);
    try {
      const result = await mockConfirmPayment(bookingId);
      setPayment(result);
      await load();
    } catch (err) {
      setError(err.message || tr("payment.failed"));
    } finally {
      setPaying(false);
    }
  };

  // Botón de demo para ver la pantalla de pago rechazado.
  const handleFail = async () => {
    setPaying(true);
    setError(null);
    try {
      const result = await mockFailPayment(bookingId, "SENA");
      setPayment(result);
    } catch (err) {
      setError(err.message || tr("payment.simFailed"));
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Spinner block label={tr("common.loading")} />;

  const vehicle = booking?.listing?.vehicle || booking?.vehicle || {};
  const vehicleLabel = `${vehicle.brand || ""} ${vehicle.model || ""} ${vehicle.year || ""}`.trim();
  const startDate = booking?.startDate;
  const endDate = booking?.endDate;
  const days = startDate && endDate
    ? Math.max(Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000), 1)
    : 1;

  // Montos: los del backend si están; si no, los del snapshot de la reserva.
  const total = payment?.total ?? booking?.totalPriceSnapshot ?? 0;
  const sena = payment?.sena ?? booking?.senaAmountSnapshot;
  const balance = payment?.balance ?? booking?.balanceAmountSnapshot;
  const deposit = payment?.deposit ?? booking?.depositSnapshot;
  const commission = payment?.commission ?? booking?.platformFeeSnapshot;
  const insurance = payment?.insurance ?? booking?.insuranceSnapshot;
  const paymentStatus = payment?.paymentStatus ?? booking?.paymentStatus;
  const isPaid = paymentStatus === "FULLY_PAID";
  const hasFailed = paymentStatus === "FAILED";

  // La reserva se paga recién cuando el dueño la aceptó.
  if (booking && booking.status !== "ACCEPTED" && !isPaid) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.title}>{tr("payment.notYet")}</div>
        <div style={s.sub}>
          {booking.status === "REQUESTED"
            ? tr("payment.notAcceptedYet")
            : tr("payment.notPayable")}
        </div>
        <button style={s.payBtn} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.successBox}>
          <div style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#0f6ce6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--fw-text)" }}>{tr("payment.confirmed")}</div>
          <div style={{ color: "var(--fw-text-3)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            {tr("payment.confirmedNote")}
          </div>
          <div style={{ ...s.card, textAlign: "left" }}>
            {vehicleLabel && <Row label={tr("payment.vehicle")} value={vehicleLabel} />}
            {startDate && <Row label={tr("payment.from")} value={longDate(startDate, lang)} />}
            {endDate && <Row label={tr("payment.to")} value={longDate(endDate, lang)} />}
            <Row label={tr("payment.days")} value={days} />
            {deposit != null && <Row label={tr("payment.heldDeposit")} value={money(deposit)} />}
            <div style={s.totalRow}><span>{tr("payment.totalPaid")}</span><span>{money(total)}</span></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ padding: "12px 28px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
            <button style={{ padding: "12px 28px", background: "transparent", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)", borderRadius: 10, fontSize: 14, cursor: "pointer" }} onClick={() => navigate("/")}>{tr("common.goHome")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.title}>{tr("payment.title")}</div>
      <div style={s.sub}>{tr("payment.sub")}</div>

      {hasFailed && (
        <div style={s.error}>{tr("payment.lastRejected")}</div>
      )}
      {error && <div style={s.error}>{error}</div>}

      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "var(--fw-text)" }}>{tr("payment.summary")}</div>
        {vehicleLabel && <Row label={tr("payment.vehicle")} value={vehicleLabel} />}
        {startDate && <Row label={tr("payment.from")} value={longDate(startDate, lang)} />}
        {endDate && <Row label={tr("payment.to")} value={longDate(endDate, lang)} />}
        <Row label={tr("payment.days")} value={days} />
        {booking?.pricePerDaySnapshot != null && (
          <Row label={`${money(booking.pricePerDaySnapshot)} x ${days} ${tr(days === 1 ? "common.day" : "common.days")}`}
            value={money(booking.rentalSubtotalSnapshot ?? booking.pricePerDaySnapshot * days)} />
        )}
        {commission != null && <Row label={tr("car.fee")} value={money(commission)} />}
        {insurance != null && <Row label={tr("payment.insurance")} value={money(insurance)} />}
        <div style={s.totalRow}><span>Total</span><span style={{ color: "var(--fw-blue)" }}>{money(total)}</span></div>
      </div>

      {/* Los tres tramos del pago, con lo que ya está cubierto */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "var(--fw-text)" }}>{tr("payment.howToPay")}</div>
        {[
          ["payment.sena", sena, paymentStatus === "DEPOSIT_PAID" || isPaid],
          ["payment.balance", balance, isPaid],
          ["payment.guarantee", deposit, isPaid],
        ].map(([label, amount, done]) => (
          <div key={label} style={{ ...s.step, background: done ? "var(--fw-green-bg)" : "var(--fw-surface-2)", border: `1px solid ${done ? "var(--fw-green-line)" : "var(--fw-line-soft)"}` }}>
            <span style={{ color: done ? "var(--fw-green-text-2)" : "var(--fw-text-2)" }}>{tr(label)}</span>
            <strong style={{ color: done ? "var(--fw-green-text-2)" : "var(--fw-text)" }}>
              {amount != null ? money(amount) : "—"}{done ? " ✓" : ""}
            </strong>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 10 }}>
          {tr("payment.depositNote")}
        </div>
      </div>

      <div style={s.info}>
        {tr("payment.demoNote")}
      </div>

      <button style={paying ? s.payBtnDisabled : s.payBtn} disabled={paying} onClick={handlePay}>
        {paying ? tr("payment.processing") : `${tr("bookings.pay")} ${money(total)}`}
      </button>
      <button style={s.failBtn} disabled={paying} onClick={handleFail}>{tr("payment.simulateReject")}</button>
      <div style={s.secureNote}>{tr("payment.serverAmounts")}</div>
    </div>
  );
}
