// ============================================================================
//  BookingCalendar — Calendario para elegir fechas y ver el precio de la reserva
// ----------------------------------------------------------------------------
//  Muestra un calendario doble donde el usuario selecciona un rango de fechas.
//  - Pide al backend qué días están ocupados y los bloquea (reservas aceptadas
//    del auto + los rangos que el dueño marcó como no disponibles).
//  - Calcula el detalle de precios y el total.
//  - Al confirmar, avisa al componente padre mediante onConfirm().
//
//  Qué se arregló acá:
//   · Se pedía la disponibilidad con los parámetros `from`/`to`, pero el backend
//     espera `startDate`/`endDate`: el pedido fallaba y NUNCA se bloqueaba
//     ningún día, así que se podían elegir fechas ya reservadas y la reserva
//     recién fallaba al confirmar.
//   · Se leía `unavailableDates` de la respuesta, un campo que antes no existía.
//     Ahora el backend lo devuelve con los días ya expandidos uno por uno.
//   · Faltaba impedir que el rango elegido pase por encima de un día ocupado
//     (el calendario dejaba seleccionar "saltando" fechas bloqueadas).
//
//  Props: listingId (id de la publicación), car (datos del auto), onConfirm.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns";
import { getListingAvailability } from "../services/api";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";
import { localeFor } from "../i18n/dates";

/**
 * Hasta cuántos meses adelante se puede reservar.
 *
 * El mismo número manda en dos lugares —hasta dónde se consulta la
 * disponibilidad y hasta dónde deja elegir el calendario—, y tienen que ser el
 * mismo: si el calendario dejara elegir más allá de lo consultado, mostraría
 * como libres días que no lo están.
 */
const MESES_DE_ANTICIPACION = 6;

// Estilos en línea del componente (agrupados acá para no ensuciar el JSX).
const s = {
  wrap: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" },
  title: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 },
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  summary: { background: "#f9fafb", borderRadius: 10, padding: 16, marginTop: 16 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151", marginBottom: 8 },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "#111827", borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 4 },
  warn: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#92400e", marginTop: 12 },
};

// Un día como "YYYY-MM-DD" en horario local, para comparar contra la lista de
// días ocupados que devuelve el backend.
const dayKey = (date) => format(date, "yyyy-MM-dd");

export default function BookingCalendar({ listingId, car, onConfirm }) {
  const { t: tr, lang } = useI18n();
  const [range, setRange] = useState([null, null]); // [fechaInicio, fechaFin] elegidas
  const [start, end] = range;
  const [unavailable, setUnavailable] = useState([]); // días ocupados (YYYY-MM-DD)
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState("");

  // Al cargar (o cambiar de publicación), consulta la disponibilidad de todo el
  // período que se puede reservar y guarda los días ocupados para bloquearlos.
  useEffect(() => {
    if (!listingId) return;
    let active = true;
    setLoadingAvail(true);
    setAvailError("");

    const from = new Date();
    const to = addMonths(from, MESES_DE_ANTICIPACION);

    getListingAvailability(listingId, from.toISOString(), to.toISOString())
      .then((data) => {
        if (!active || !data) return;
        setUnavailable(Array.isArray(data.unavailableDates) ? data.unavailableDates : []);
      })
      .catch((err) => {
        if (!active) return;
        // Si no se pudo consultar, se avisa: es mejor que dejar elegir a ciegas.
        setAvailError(err.message || tr("cal.availFailed"));
      })
      .finally(() => { if (active) setLoadingAvail(false); });

    return () => { active = false; };
  }, [listingId, tr]);

  const unavailableSet = useMemo(() => new Set(unavailable), [unavailable]);

  // ¿Este día está ocupado?
  const isDayBlocked = (date) => unavailableSet.has(dayKey(date));

  // Días ocupados como objetos Date, para que el calendario los pinte tachados.
  const excludeDates = useMemo(
    () => unavailable.map(day => new Date(`${day}T12:00:00`)),
    [unavailable],
  );

  /**
   * ¿El rango elegido pisa algún día ocupado? Hace falta chequearlo aparte:
   * bloquear los días sueltos no impide que alguien elija un inicio y un fin
   * libres con días ocupados en el medio.
   */
  const rangeHasBlockedDay = useMemo(() => {
    if (!start || !end) return false;
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      if (isDayBlocked(cursor)) return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, unavailableSet]);

  // Cálculo del precio a partir de las fechas elegidas:
  const days = start && end ? Math.max(differenceInCalendarDays(end, start), 1) : 0;
  const pricePerDay = Number(car?.price_per_day || car?.pricePerDay || 0);
  const total = days * pricePerDay;               // subtotal por los días
  const commission = Math.round(total * 0.1);     // comisión de la plataforma (10%)
  const deposit = pricePerDay * 2;                // depósito de garantía (2 días)
  const canConfirm = start && end && days > 0 && !rangeHasBlockedDay;

  return (
    <div style={s.wrap}>
      <div style={{ ...s.title, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {tr("cal.pickDates")}
        {/* El círculo mientras se consulta la disponibilidad: un texto quieto no
            dice si está pasando algo o si se colgó. */}
        {loadingAvail && <Spinner size={14} label={tr("cal.loadingAvail")} />}
      </div>
      <div style={s.legend}>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#111827" }} /> {tr("cal.free")}</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#d1d5db" }} /> {tr("cal.taken")}</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#0f6ce6" }} /> {tr("cal.chosen")}</div>
      </div>

      {availError && <div style={s.warn}>{availError}</div>}
      {!loadingAvail && !availError && unavailable.length > 0 && (
        <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 12 }}>
          {tr("cal.greyNote")}
        </div>
      )}

      <DatePicker
        selectsRange startDate={start} endDate={end}
        onChange={(update) => setRange(update)}
        minDate={addDays(new Date(), 1)}
        /*
          HASTA SEIS MESES.

          Antes no había tope, y eso no era "más libertad": la disponibilidad se
          consulta para los próximos 6 meses, así que más allá de eso el
          calendario no sabe qué días están ocupados y los muestra TODOS libres.
          Alguien podía elegir una fecha a un año, verla en blanco, y que la
          reserva se rechazara al confirmar.

          Con el tope puesto en los mismos 6 meses que se consultan, todo lo que
          se puede elegir tiene disponibilidad de verdad detrás. Y son seis meses
          de navegación, no dos: los dos que se ven son los que entran en
          pantalla, y las flechas llegan hasta el final del sexto.
        */
        maxDate={addMonths(new Date(), MESES_DE_ANTICIPACION)}
        filterDate={(date) => !isDayBlocked(date)}
        excludeDates={excludeDates}
        inline locale={localeFor(lang)} monthsShown={2}
      />

      {rangeHasBlockedDay && (
        <div style={s.warn}>
          {tr("cal.rangeBlocked")}
        </div>
      )}

      {start && end && days > 0 && (
        <div style={s.summary}>
          <div style={s.summaryRow}>
            <span>${pricePerDay.toLocaleString()} x {days} {tr(days === 1 ? "common.day" : "common.days")}</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <div style={s.summaryRow}>
            <span>{tr("cal.fee")}</span>
            <span>${commission.toLocaleString()}</span>
          </div>
          <div style={s.summaryRow}>
            <span>{tr("payment.guarantee")}</span>
            <span>${deposit.toLocaleString()}</span>
          </div>
          <div style={s.summaryTotal}>
            <span>Total</span>
            <span>${(total + commission + deposit).toLocaleString()}</span>
          </div>
          <button
            disabled={!canConfirm}
            style={{ width: "100%", marginTop: 14, padding: "13px", background: canConfirm ? "#0f6ce6" : "#93c5fd", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed" }}
            onClick={() => canConfirm && onConfirm({ start, end, days, total, commission, deposit, totalFinal: total + commission + deposit })}>
            {tr("cal.confirmBooking")}
          </button>
          <div style={{ fontSize: 11.5, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
            {tr("cal.ownerFirst")}
          </div>
        </div>
      )}
    </div>
  );
}
