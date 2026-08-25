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
//  ─────────────────────────────────────────────────────────────────────────
//  LOS TRES TRAMOS SE PAGAN DE A UNO, Y EN ESTE ORDEN.
//
//  Esta pantalla decía que el pago estaba partido en tres, dibujaba los tres
//  renglones... y abajo tenía UN botón que decía "Pagar $TOTAL" y los cobraba a
//  los tres juntos en una sola llamada. O sea: el alquiler se contaba en etapas
//  y se cobraba de una. La seña no señaba nada, porque en el mismo clic se iba
//  el alquiler entero.
//
//  Ahora cada tramo es su propio paso. El botón cobra SOLO el que sigue y
//  después la pantalla se vuelve a leer del servidor:
//
//    1. Seña      → confirma la reserva. La reserva pasa a "Seña paga".
//    2. Saldo     → el resto del alquiler. Recién acá queda "Pago completo",
//                   que es lo único que habilita el retiro del auto.
//    3. Depósito  → no es un gasto: se AUTORIZA y queda retenido hasta que se
//                   devuelve el auto.
//
//  El orden no es un gusto de esta pantalla: el backend rechaza el saldo si la
//  seña no está paga ("Pay the deposit (seña) before the balance"). Lo que
//  cambió acá es que la interfaz ahora hace lo mismo que dice.
//
//  QUÉ TRAMO ESTÁ CUBIERTO se lee de `records`, la lista de cobros que devuelve
//  el servidor, y no de una cuenta local: si alguien pagó la seña desde otro
//  dispositivo, esta pantalla lo ve al recargar.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getBookingById, getBookingPaymentStatus, mockConfirmPayment, mockFailPayment,
} from "../../services/api";
import { tramosDelPago } from "../../services/pago";
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
    FORZAR EL RECHAZO ES UNA HERRAMIENTA DE DEMOSTRACIÓN, NO UNA OPCIÓN.

    Estuvo primero transparente con borde rosa (parecía deshabilitado) y después
    rojo lleno a todo el ancho. Rojo lleno tampoco estaba bien: ahí abajo, del
    mismo tamaño que el botón de pagar, se leía como si fuera la otra mitad de
    una decisión. Nadie quiere "pagar" o "que le rechacen el pago": lo segundo
    existe nada más que para poder mostrar cómo se ve la pantalla cuando falla.

    Ahora es un renglón chico y centrado, del color de un texto secundario, con
    el rojo puesto solo al pasar el mouse. Está para quien lo va a buscar y no le
    compite al botón de verdad.
  */
  failBtn: {
    display: "block", margin: "0 auto", background: "none", border: "none",
    color: "var(--fw-text-4)", fontFamily: "inherit", fontSize: 12,
    cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
    padding: "6px 10px",
  },
  successBox: { textAlign: "center", padding: "48px 0" },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-blue-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  failIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  secureNote: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12, color: "var(--fw-text-4)", marginTop: 16 },
  error: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  info: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 },
  step: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "9px 12px", borderRadius: 8, marginBottom: 8 },
  // El numerito del paso. Redondo y con borde, como una viñeta numerada: dice
  // "esto es una secuencia" antes de que nadie lea una palabra.
  paso: {
    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
    border: "1px solid", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 11, fontWeight: 800,
  },
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
   * Paga UN tramo: el que sigue, y nada más.
   *
   * Antes esta función llamaba a mockConfirmPayment(bookingId) SIN decir cuál,
   * y el backend entiende eso como "cobrame los tres": seña, saldo y depósito
   * en una sola vuelta. Pasarle el tramo es lo que hace que el pago sea por
   * partes de verdad.
   *
   * El backend solo permite esta simulación con el proveedor de pagos en modo
   * demo; con el proveedor real el cobro lo confirma la pasarela.
   */
  const handlePay = async (kind) => {
    if (!kind) return;
    setPaying(true);
    setError(null);
    try {
      await mockConfirmPayment(bookingId, kind);
      // Se relee todo del servidor en vez de creerle a la respuesta: el estado
      // de la reserva cambia junto con el cobro y hay tramos que dependen de él.
      await load();
    } catch (err) {
      setError(err.message || tr("payment.failed"));
    } finally {
      setPaying(false);
    }
  };

  // Botón de demo para ver la pantalla de pago rechazado. Rechaza el tramo que
  // está en juego, no siempre la seña: rechazar la seña cuando ya está paga y
  // lo que se está pagando es el saldo mostraba un error que no era el de nadie.
  const handleFail = async (kind) => {
    if (!kind) return;
    setPaying(true);
    setError(null);
    try {
      await mockFailPayment(bookingId, kind);
      await load();
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
  const hasFailed = paymentStatus === "FAILED";

  /*
    QUÉ TRAMO YA ESTÁ CUBIERTO.

    La regla vive en services/pago.js y no acá, porque "Mis reservas" necesita
    la misma respuesta y no tiene los mismos datos a mano: esta pantalla pide el
    estado al servidor y recibe `records` —la lista de cobros, uno por tramo, que
    es el dato exacto—, y la otra solo tiene los montos guardados en la reserva.
    Escrita dos veces, las dos pantallas se contradecían.
  */
  const tramos = tramosDelPago({
    paymentStatus, sena, balance, deposit,
    records: payment?.records,
    depositPaymentIntentId: booking?.depositPaymentIntentId,
  });

  // El que sigue: el primero sin cubrir. Es el único que se puede pagar.
  const tramoActual = tramos.find(t => !t.hecho) || null;
  const isPaid = tramos.length > 0 && tramoActual === null;

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

      {/*
        LOS TRES TRAMOS, CON EL TURNO MARCADO.

        Cada renglón dice en qué está: pagado (verde con tilde), EL QUE SIGUE
        (azul, resaltado, el único que el botón de abajo va a cobrar) o todavía
        no le toca (gris apagado). Antes los tres se veían iguales hasta que se
        pagaba todo junto y los tres se ponían verdes a la vez, así que el
        renglón no informaba nada: era una lista de lo que decía la factura.
      */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "var(--fw-text)" }}>{tr("payment.howToPay")}</div>
        <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 14 }}>
          {tr("payment.orderNote")}
        </div>
        {tramos.map((t, i) => {
          const esElTurno = tramoActual?.kind === t.kind;
          const fondo = t.hecho ? "var(--fw-green-bg)" : esElTurno ? "var(--fw-blue-bg)" : "var(--fw-surface-2)";
          const linea = t.hecho ? "var(--fw-green-line)" : esElTurno ? "var(--fw-blue-line)" : "var(--fw-line-soft)";
          const tinta = t.hecho ? "var(--fw-green-text-2)" : esElTurno ? "var(--fw-blue-text)" : "var(--fw-text-4)";
          return (
            <div key={t.kind} style={{ ...s.step, background: fondo, border: `1px solid ${linea}` }}>
              <span style={{ color: tinta, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {/* El número del paso: dice que hay un orden, sin escribirlo. */}
                <span style={{ ...s.paso, borderColor: linea, color: tinta }}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  {tr(t.label)}
                  {esElTurno && <strong style={{ display: "block", fontSize: 11.5 }}>{tr("payment.stepNow")}</strong>}
                  {!t.hecho && !esElTurno && <span style={{ display: "block", fontSize: 11.5 }}>{tr("payment.stepLater")}</span>}
                  {t.rechazado && <span style={{ display: "block", fontSize: 11.5, color: "var(--fw-red-text-2)" }}>{tr("payment.stepRejected")}</span>}
                </span>
              </span>
              <strong style={{ color: tinta, flexShrink: 0 }}>
                {money(t.monto)}{t.hecho ? " ✓" : ""}
              </strong>
            </div>
          );
        })}
        <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 10 }}>
          {tr("payment.depositNote")}
        </div>
      </div>

      <div style={s.info}>
        {tr("payment.demoNote")}
      </div>

      {/*
        UN BOTÓN, UN TRAMO. Dice cuál está por pagar y cuánto, no el total: el
        total es lo que va a costar el alquiler entero, no lo que se debita al
        apretar. El depósito se AUTORIZA, no se cobra, y por eso tiene su propio
        verbo: decir "Pagar el depósito" sería mentir sobre a dónde va la plata.
      */}
      <button data-fw-accion
        style={paying || !tramoActual ? s.payBtnDisabled : s.payBtn}
        disabled={paying || !tramoActual}
        onClick={() => handlePay(tramoActual?.kind)}>
        {paying ? tr("payment.processing") : tramoActual
          ? `${tr(tramoActual.kind === "DEPOSIT_HOLD" ? "payment.holdIt" : "bookings.pay")} ${tr(tramoActual.label)} · ${money(tramoActual.monto)}`
          : tr("payment.nothingDue")}
      </button>
      <div style={s.secureNote}>{tr("payment.serverAmounts")}</div>
      {/* Abajo de todo y chiquito: es para probar la pantalla de pago rechazado,
          no una alternativa a pagar. Ver `failBtn`, más arriba. */}
      <button style={s.failBtn} disabled={paying || !tramoActual}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--fw-red-text-2)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--fw-text-4)"; }}
        onClick={() => handleFail(tramoActual?.kind)}>{tr("payment.simulateReject")}</button>
    </div>
  );
}
