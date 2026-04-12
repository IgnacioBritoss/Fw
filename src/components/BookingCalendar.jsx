import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, differenceInDays, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const s = {
  wrap: { background: "#fff", borderRadius: 12, padding: 20,
    border: "1px solid #e5e7eb" },
  title: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 },
  legend: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, color: "#6b7280" },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  summary: { background: "#f9fafb", borderRadius: 10, padding: 16, marginTop: 16 },
  summaryRow: { display: "flex", justifyContent: "space-between",
    fontSize: 14, color: "#374151", marginBottom: 8 },
  summaryTotal: { display: "flex", justifyContent: "space-between",
    fontWeight: 700, fontSize: 16, color: "#111827",
    borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 4 },
};

export default function BookingCalendar({ car, onConfirm }) {
  const [range, setRange] = useState([null, null]);
  const [start, end] = range;

  const bookings = JSON.parse(localStorage.getItem("fw_bookings") || "[]")
    .filter(b => b.car_id === car.id && b.status !== "cancelled");

  const isDateOccupied = (date) => {
    return bookings.some(b => {
      try {
        const s = parseISO(b.start_date);
        const e = parseISO(b.end_date);
        return isWithinInterval(date, { start: s, end: e });
      } catch { return false; }
    });
  };

  const days = start && end ? Math.max(differenceInDays(end, start), 1) : 0;
  const total = days * Number(car.price_per_day);
  const commission = Math.round(total * 0.1);
  const deposit = Number(car.price_per_day) * 2;

  return (
    <div style={s.wrap}>
      <div style={s.title}>Seleccioná las fechas</div>
      <div style={s.legend}>
        <div style={s.legendItem}>
          <div style={{ ...s.dot, background: "#1d4ed8" }} />
          Disponible
        </div>
        <div style={s.legendItem}>
          <div style={{ ...s.dot, background: "#fca5a5" }} />
          Ocupado
        </div>
        <div style={s.legendItem}>
          <div style={{ ...s.dot, background: "#bfdbfe" }} />
          Seleccionado
        </div>
      </div>

      <DatePicker
        selectsRange
        startDate={start}
        endDate={end}
        onChange={(update) => setRange(update)}
        minDate={addDays(new Date(), 1)}
        filterDate={(date) => !isDateOccupied(date)}
        inline
        locale={es}
        monthsShown={2}
      />

      {start && end && days > 0 && (
        <div style={s.summary}>
          <div style={s.summaryRow}>
            <span>${Number(car.price_per_day).toLocaleString()} x {days} día{days !== 1 ? "s" : ""}</span>
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
            style={{ width: "100%", marginTop: 14, padding: "13px",
              background: "#1d4ed8", color: "#fff", border: "none",
              borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            onClick={() => onConfirm({
              start, end, days, total, commission, deposit,
              totalFinal: total + commission + deposit
            })}>
            Confirmar reserva →
          </button>
        </div>
      )}
    </div>
  );
}