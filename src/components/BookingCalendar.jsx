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
import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, addMonths, differenceInCalendarDays, format, isSameMonth, startOfMonth } from "date-fns";
import { getListingAvailability } from "../services/api";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";
import { localeFor } from "../i18n/dates";
import { useCurrency } from "../context/CurrencyContext";

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
  wrap: { background: "var(--fw-surface)", borderRadius: 12, padding: 20, border: "1px solid var(--fw-border)" },
  title: { fontSize: 15, fontWeight: 600, color: "var(--fw-text)", marginBottom: 16 },
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fw-text-3)" },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  summary: { background: "var(--fw-surface-2)", borderRadius: 10, padding: 16, marginTop: 16 },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--fw-text-2)", marginBottom: 8 },
  summaryTotal: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "var(--fw-text)", borderTop: "1px solid var(--fw-border)", paddingTop: 10, marginTop: 4 },
  warn: { background: "var(--fw-amber-bg)", border: "1px solid var(--fw-amber-line)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "var(--fw-amber-text)", marginTop: 12 },
  // La tira de meses. Se desliza de costado en el teléfono, donde los siete no
  // entran de una: `overflowX` con los botones sin encoger.
  tira: {
    display: "flex", gap: 6, marginBottom: 12,
    overflowX: "auto", paddingBottom: 4,
    scrollbarWidth: "thin",
  },
  mes: {
    flexShrink: 0, padding: "6px 12px", borderRadius: 999,
    border: "1px solid var(--fw-border)", background: "var(--fw-surface)",
    color: "var(--fw-text-2)", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap",
  },
  mesElegido: {
    background: "var(--fw-blue-bg)", borderColor: "var(--fw-blue)",
    color: "var(--fw-blue-text)",
  },
};

// Un día como "YYYY-MM-DD" en horario local, para comparar contra la lista de
// días ocupados que devuelve el backend.
const dayKey = (date) => format(date, "yyyy-MM-dd");

export default function BookingCalendar({ listingId, car, onConfirm }) {
  const { t: tr, lang } = useI18n();
  const { precio } = useCurrency();
  const [range, setRange] = useState([null, null]); // [fechaInicio, fechaFin] elegidas
  const [start, end] = range;
  // Qué mes está a la vista, solo para marcar el botón correspondiente en la
  // tira. Lo mueven tanto la tira como las flechas del calendario.
  const [mesALaVista, setMesALaVista] = useState(() => startOfMonth(new Date()));
  // Adónde saltar y cuántas veces se saltó. El contador va en la `key` del
  // calendario: al cambiar, el calendario se vuelve a montar mirando el mes
  // pedido. Hace falta el contador y no alcanza con la fecha porque apretar dos
  // veces el mismo mes da la misma fecha, y entonces no pasaría nada —que es
  // justo lo que uno espera que pase si se fue con las flechas y quiere volver.
  const [salto, setSalto] = useState({ fecha: startOfMonth(new Date()), n: 0 });

  /**
   * ¿Entran DOS meses uno al lado del otro?
   *
   * Se mide el ancho real de la caja en vez de mirar si es un teléfono. El ancho
   * de pantalla no alcanza para saberlo: el calendario vive en una columna que
   * comparte lugar con la ficha del auto y con la barra lateral, así que una
   * computadora con la barra abierta puede tener menos lugar acá que una tablet
   * con la barra cerrada. Preguntando por la caja, la respuesta es siempre la
   * correcta, y además se acomoda sola al abrir y cerrar la barra.
   *
   * Un mes necesita 240px. Con menos de 500 va uno solo: dos apretados dejan los
   * números pisándose, que es como estaba y era peor que mostrar uno.
   */
  const cajaRef = useRef(null);
  const [anchoCaja, setAnchoCaja] = useState(0);

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    if (typeof ResizeObserver === "undefined") {
      setAnchoCaja(caja.getBoundingClientRect().width);
      return;
    }
    const observador = new ResizeObserver(([entrada]) => {
      setAnchoCaja(entrada.contentRect.width);
    });
    observador.observe(caja);
    return () => observador.disconnect();
  }, []);

  const dosMeses = anchoCaja >= 500;
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

  /**
   * Los meses a los que se puede saltar: el actual y los seis siguientes.
   *
   * Existe porque llegar al sexto mes eran cinco toques de flecha, uno atrás del
   * otro, sin ver adónde se estaba yendo. Con la tira, cualquier mes del rango
   * es un toque. Y además se ve de una cuánto para adelante se puede reservar,
   * que antes había que descubrir apretando.
   */
  const meses = useMemo(() => {
    const hoy = startOfMonth(new Date());
    const locale = localeFor(lang);
    return Array.from({ length: MESES_DE_ANTICIPACION + 1 }, (_, i) => {
      const fecha = addMonths(hoy, i);
      return {
        fecha,
        // El año solo cuando cambia: repetirlo en los siete es ruido, pero sin
        // él, al cruzar diciembre, "enero" no dice de qué año habla.
        etiqueta: format(fecha, fecha.getFullYear() === hoy.getFullYear() ? "LLLL" : "LLLL yyyy", { locale }),
      };
    });
  }, [lang]);

  const irAlMes = (fecha) => {
    setMesALaVista(fecha);
    setSalto((antes) => ({ fecha, n: antes.n + 1 }));
  };

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
    <div style={s.wrap} ref={cajaRef}>
      <div style={{ ...s.title, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {tr("cal.pickDates")}
        {/* El círculo mientras se consulta la disponibilidad: un texto quieto no
            dice si está pasando algo o si se colgó. */}
        {loadingAvail && <Spinner size={14} label={tr("cal.loadingAvail")} />}
      </div>
      <div style={s.legend}>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "var(--fw-chip)" }} /> {tr("cal.free")}</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "var(--fw-surface-3)" }} /> {tr("cal.taken")}</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "var(--fw-blue)" }} /> {tr("cal.chosen")}</div>
      </div>

      {availError && <div style={s.warn}>{availError}</div>}
      {!loadingAvail && !availError && unavailable.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginBottom: 12 }}>
          {tr("cal.greyNote")}
        </div>
      )}

      {/* La tira de meses. Ver `meses`, más arriba: es lo que hace que los seis
          meses se puedan usar de verdad y no a fuerza de flechas. */}
      <div style={s.tira} role="group" aria-label={tr("cal.goToMonth")}>
        {meses.map(({ fecha, etiqueta }) => {
          const elegido = isSameMonth(fecha, mesALaVista);
          return (
            <button
              key={fecha.toISOString()}
              type="button"
              aria-pressed={elegido}
              onClick={() => irAlMes(fecha)}
              style={{ ...s.mes, ...(elegido ? s.mesElegido : {}) }}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <DatePicker
        // Al cambiar la `key` el calendario se vuelve a montar mirando el mes
        // pedido. Es la manera segura de moverlo: `openToDate` solo se mira al
        // arrancar, así que sin esto la tira no haría nada después del primero.
        key={salto.n}
        openToDate={salto.fecha}
        onMonthChange={(fecha) => setMesALaVista(startOfMonth(fecha))}
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
          pantalla, y la tira de arriba lleva a cualquiera de los siete.
        */
        maxDate={addMonths(new Date(), MESES_DE_ANTICIPACION)}
        filterDate={(date) => !isDayBlocked(date)}
        excludeDates={excludeDates}
        inline locale={localeFor(lang)}
        /* Dos meses si entran, uno si no. Ver `dosMeses`, más arriba. */
        monthsShown={dosMeses ? 2 : 1}
      />

      {rangeHasBlockedDay && (
        <div style={s.warn}>
          {tr("cal.rangeBlocked")}
        </div>
      )}

      {start && end && days > 0 && (
        <div style={s.summary}>
          <div style={s.summaryRow}>
            <span>{precio(pricePerDay)} x {days} {tr(days === 1 ? "common.day" : "common.days")}</span>
            <span>{precio(total)}</span>
          </div>
          <div style={s.summaryRow}>
            <span>{tr("cal.fee")}</span>
            <span>{precio(commission)}</span>
          </div>
          <div style={s.summaryRow}>
            <span>{tr("payment.guarantee")}</span>
            <span>{precio(deposit)}</span>
          </div>
          <div style={s.summaryTotal}>
            <span>Total</span>
            <span>{precio(total + commission + deposit)}</span>
          </div>
          <button
            disabled={!canConfirm}
            style={{ width: "100%", marginTop: 14, padding: "13px", background: canConfirm ? "var(--fw-blue)" : "var(--fw-blue-line)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed" }}
            onClick={() => canConfirm && onConfirm({ start, end, days, total, commission, deposit, totalFinal: total + commission + deposit })}>
            {tr("cal.confirmBooking")}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", textAlign: "center", marginTop: 8 }}>
            {tr("cal.ownerFirst")}
          </div>
        </div>
      )}
    </div>
  );
}
