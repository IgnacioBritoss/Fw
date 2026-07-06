// ============================================================================
//  BookingCalendar — Calendario para elegir fechas y ver el precio de la reserva
// ----------------------------------------------------------------------------
//  Muestra un calendario doble donde el usuario selecciona un rango de fechas.
//  - Pide al backend qué días están ocupados y los bloquea.
//  - Calcula automáticamente el detalle de precios (días × precio + comisión +
//    depósito) y el total.
//  - Al confirmar, avisa al componente padre (CarDetail) mediante onConfirm().
//
//  Props: listingId (id de la publicación), car (datos del auto), onConfirm.
// ============================================================================
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, differenceInDays, format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { getListingAvailability } from "../services/api";

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
};

export default function BookingCalendar({ listingId, car, onConfirm }) {
  const [range, setRange] = useState([null, null]); // [fechaInicio, fechaFin] elegidas
  const [start, end] = range;
  const [blockedDates, setBlockedDates] = useState([]); // días ocupados (no seleccionables)
  const [loadingAvail, setLoadingAvail] = useState(false);

  // Al cargar (o cambiar de publicación), consulta la disponibilidad de los
  // próximos 3 meses y guarda las fechas ocupadas para bloquearlas en el calendario.
  useEffect(() => {
    if (!listingId) return;
    setLoadingAvail(true);
    const from = new Date();
    const to = addMonths(from, 3);
    getListingAvailability(listingId, format(from, "yyyy-MM-dd"), format(to, "yyyy-MM-dd"))
      .then((data) => {
        if (!data) return;
        const unavailable = data.unavailableDates || data.blockedDates || [];
        setBlockedDates(unavailable.map((d) => new Date(d)));
      })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [listingId]);

  // ¿Esta fecha está ocupada? (compara solo día/mes/año, ignora la hora).
  const isDateBlocked = (date) =>
    blockedDates.some((d) => d.toDateString() === date.toDateString());

  // Cálculo del precio a partir de las fechas elegidas:
  const days = start && end ? Math.max(differenceInDays(end, start), 1) : 0; // cantidad de días
  const pricePerDay = Number(car?.price_per_day || car?.pricePerDay || 0);
  const total = days * pricePerDay;                 // subtotal por los días
  const commission = Math.round(total * 0.1);       // comisión de la plataforma (10%)
  const deposit = pricePerDay * 2;                  // depósito de garantía (2 días)

  return (
    <div style={s.wrap}>
      <div style={s.title}>
        Seleccioná las fechas
        {loadingAvail && (
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8, fontWeight: 400 }}>
            Cargando disponibilidad...
          </span>
        )}
      </div>
      <div style={s.legend}>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#111827" }} /> Disponible</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#d1d5db" }} /> No disponible</div>
        <div style={s.legendItem}><div style={{ ...s.dot, background: "#2563eb" }} /> Seleccionado</div>
      </div>
      <DatePicker
        selectsRange startDate={start} endDate={end}
        onChange={(update) => setRange(update)}
        minDate={addDays(new Date(), 1)}
        filterDate={(date) => !isDateBlocked(date)}
        excludeDates={blockedDates}
        inline locale={es} monthsShown={2}
      />
      {start && end && days > 0 && (
        <div style={s.summary}>
          <div style={s.summaryRow}>
            <span>${pricePerDay.toLocaleString()} x {days} día{days !== 1 ? "s" : ""}</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <div style={s.summaryRow}>
            <span>Comisión Freewheel (10%)</span>
            <span>${commission.toLocaleString()}</span>
          </div>
          <div style={s.summaryRow}>
            <span>Depósito de garantía</span>
            <span>${deposit.toLocaleString()}</span>
          </div>
          <div style={s.summaryTotal}>
            <span>Total</span>
            <span>${(total + commission + deposit).toLocaleString()}</span>
          </div>
          <button
            style={{ width: "100%", marginTop: 14, padding: "13px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            onClick={() => onConfirm({ start, end, days, total, commission, deposit, totalFinal: total + commission + deposit })}>
            Confirmar reserva →
          </button>
        </div>
      )}
    </div>
  );
}