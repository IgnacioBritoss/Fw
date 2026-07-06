// ============================================================================
//  Payment — Pantalla de PAGO (simulado)
// ----------------------------------------------------------------------------
//  Muestra el resumen y un botón para "pagar". El pago es una simulación:
//  crea una intención de pago, espera ~1.8s y la confirma (o la falla a pedido).
//  Según el resultado muestra la pantalla de éxito o de error. No hay dinero real.
//  Los datos llegan por el state de la navegación (desde Booking) o, si no,
//  se piden al backend por el id de la reserva.
// ============================================================================
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createMockPaymentIntent, confirmMockPayment, failMockPayment, getBookingById } from "../../services/api";

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
  failBox: { textAlign: "center", padding: "48px 0" },
  failIcon: { width: 72, height: 72, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  secureNote: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12, color: "#9ca3af", marginTop: 16 },
};

// Estados posibles del pago (controlan qué pantalla se muestra).
const STATUS = { idle: "idle", pending: "pending", processing: "processing", paid: "paid", failed: "failed" };

// Fila "etiqueta ─ valor" reutilizable del resumen.
function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const stateData = location.state || {};
  const [booking, setBooking] = useState(stateData.booking || null);
  const [car] = useState(stateData.car || null);
  const [payStatus, setPayStatus] = useState(STATUS.idle);
  const [loading, setLoading] = useState(!stateData.booking);
  const [error, setError] = useState(null);

  // Si no vino la reserva por el state, la pedimos al backend por su id.
  useEffect(() => {
    if (stateData.booking) return;
    getBookingById(bookingId).then(setBooking).catch(() => setError("No se pudo cargar la reserva.")).finally(() => setLoading(false));
  }, [bookingId]);

  // Flujo de pago simulado: intención → procesando (espera) → confirmado.
  const handlePay = async () => {
    setPayStatus(STATUS.pending);
    setError(null);
    try {
      await createMockPaymentIntent(bookingId);
      setPayStatus(STATUS.processing);
      await new Promise((r) => setTimeout(r, 1800)); // simula la demora del pago
      await confirmMockPayment(bookingId);
      setPayStatus(STATUS.paid);
    } catch (err) {
      setError(err.message || "Error al procesar el pago.");
      setPayStatus(STATUS.failed);
    }
  };

  // Botón de demo para forzar un pago fallido (muestra la pantalla de error).
  const handleFail = async () => {
    setPayStatus(STATUS.processing);
    try { await failMockPayment(bookingId); setPayStatus(STATUS.failed); }
    catch { setPayStatus(STATUS.failed); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>;

  // Datos para el resumen: se usa lo que vino por el state y, si falta, lo que
  // trae la reserva. Recalcula días, subtotal, comisión, depósito y total.
  const displayCar = car || (booking?.listing?.vehicle ? { brand: booking.listing.vehicle.brand, model: booking.listing.vehicle.model, year: booking.listing.vehicle.year, price_per_day: booking.listing.pricePerDay || booking.pricePerDaySnapshot } : null);
  const startDate = stateData.startDate || booking?.startDate;
  const endDate = stateData.endDate || booking?.endDate;
  const days = stateData.days || (startDate && endDate ? Math.max(Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000), 1) : 1);
  const pricePerDay = displayCar?.price_per_day || booking?.pricePerDaySnapshot || 0;
  const base = days * Number(pricePerDay);
  const commission = Math.round(base * 0.1);
  const deposit = Number(pricePerDay) * 2;
  const totalFinal = stateData.totalFinal || base + commission + deposit;

  if (payStatus === STATUS.paid) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.successBox}>
          <div style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" }}>Pago confirmado</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Tu reserva está activa. El dueño confirmará la entrega.</div>
          <div style={{ ...s.card, textAlign: "left" }}>
            {displayCar && <Row label="Vehículo" value={`${displayCar.brand} ${displayCar.model} ${displayCar.year}`} />}
            {startDate && <Row label="Desde" value={format(new Date(startDate), "d 'de' MMMM yyyy", { locale: es })} />}
            {endDate && <Row label="Hasta" value={format(new Date(endDate), "d 'de' MMMM yyyy", { locale: es })} />}
            <Row label="Días" value={days} />
            <div style={s.totalRow}><span>Total pagado</span><span>${Number(totalFinal).toLocaleString()}</span></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>Ver mis reservas</button>
            <button style={{ padding: "12px 28px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" }} onClick={() => navigate("/")}>Volver al inicio</button>
          </div>
        </div>
      </div>
    );
  }

  if (payStatus === STATUS.failed) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.failBox}>
          <div style={s.failIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" /></svg></div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" }}>Pago fallido</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>{error || "No se pudo procesar el pago."}</div>
          <button style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginRight: 10 }} onClick={() => { setPayStatus(STATUS.idle); setError(null); }}>Reintentar</button>
          <button style={{ padding: "12px 28px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>Mis reservas</button>
        </div>
      </div>
    );
  }

  const isProcessing = payStatus === STATUS.processing || payStatus === STATUS.pending;

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.title}>Confirmá el pago</div>
      <div style={s.sub}>Revisá el detalle antes de pagar</div>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#111827" }}>Resumen de la reserva</div>
        {displayCar && <Row label="Vehículo" value={`${displayCar.brand} ${displayCar.model} ${displayCar.year}`} />}
        {startDate && <Row label="Desde" value={format(new Date(startDate), "d 'de' MMMM yyyy", { locale: es })} />}
        {endDate && <Row label="Hasta" value={format(new Date(endDate), "d 'de' MMMM yyyy", { locale: es })} />}
        <Row label="Días" value={days} />
        <Row label={`$${Number(pricePerDay).toLocaleString()} x ${days} días`} value={`$${base.toLocaleString()}`} />
        <Row label="Comisión (10%)" value={`$${commission.toLocaleString()}`} />
        <Row label="Depósito de garantía" value={`$${deposit.toLocaleString()}`} />
        <div style={s.totalRow}><span>Total</span><span style={{ color: "#2563eb" }}>${Number(totalFinal).toLocaleString()}</span></div>
      </div>
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#111827" }}>Método de pago (simulación)</div>
        <div style={{ border: "1.5px solid #2563eb", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, background: "#eff6ff" }}>
          <div style={{ width: 36, height: 24, background: "#1e40af", borderRadius: 4 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1e40af" }}>•••• •••• •••• 4242</div>
            <div style={{ fontSize: 12, color: "#3b82f6" }}>Tarjeta de prueba</div>
          </div>
        </div>
      </div>
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>{error}</div>}
      <button style={isProcessing ? s.payBtnDisabled : s.payBtn} disabled={isProcessing} onClick={handlePay}>
        {isProcessing ? "Procesando..." : `Pagar $${Number(totalFinal).toLocaleString()}`}
      </button>
      <button style={s.failBtn} disabled={isProcessing} onClick={handleFail}>Simular pago fallido</button>
      <div style={s.secureNote}>Pago seguro simulado — sin cargos reales</div>
    </div>
  );
}