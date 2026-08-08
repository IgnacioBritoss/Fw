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
  title: { fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)" },
  row: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151", marginBottom: 8 },
  totalRow: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "#111827", borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 4 },
  payBtn: { width: "100%", padding: "15px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  payBtnDisabled: { width: "100%", padding: "15px", background: "#93c5fd", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  failBtn: { width: "100%", padding: "12px", background: "transparent", border: "1.5px solid #fecaca", color: "#dc2626", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  successBox: { textAlign: "center", padding: "48px 0" },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  failIcon: { width: 72, height: 72, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  secureNote: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12, color: "#9ca3af", marginTop: 16 },
  error: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginBottom: 16 },
  info: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, fontSize: 13, color: "#1e40af", marginBottom: 16 },
  step: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "9px 12px", borderRadius: 8, marginBottom: 8 },
};

// Fila "etiqueta ─ valor" reutilizable del resumen.
function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const money = (value) => `$${Number(value || 0).toLocaleString()}`;

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
          <div style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" }}>{tr("payment.confirmed")}</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
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
            <button style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
            <button style={{ padding: "12px 28px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" }} onClick={() => navigate("/")}>{tr("common.goHome")}</button>
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
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#111827" }}>{tr("payment.summary")}</div>
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
        <div style={s.totalRow}><span>Total</span><span style={{ color: "#2563eb" }}>{money(total)}</span></div>
      </div>

      {/* Los tres tramos del pago, con lo que ya está cubierto */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#111827" }}>{tr("payment.howToPay")}</div>
        {[
          ["payment.sena", sena, paymentStatus === "DEPOSIT_PAID" || isPaid],
          ["payment.balance", balance, isPaid],
          ["payment.guarantee", deposit, isPaid],
        ].map(([label, amount, done]) => (
          <div key={label} style={{ ...s.step, background: done ? "#f0fdf4" : "#f9fafb", border: `1px solid ${done ? "#bbf7d0" : "#f3f4f6"}` }}>
            <span style={{ color: done ? "#166534" : "#374151" }}>{tr(label)}</span>
            <strong style={{ color: done ? "#166534" : "#111827" }}>
              {amount != null ? money(amount) : "—"}{done ? " ✓" : ""}
            </strong>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
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
