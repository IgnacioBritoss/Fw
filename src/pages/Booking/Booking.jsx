import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingCalendar from "../../components/BookingCalendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 32 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#111827" },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  carCard: { background: "#fff", borderRadius: 12, overflow: "hidden",
    border: "1px solid #e5e7eb", marginBottom: 20 },
  carImg: { width: "100%", height: 180, background: "#e5e7eb",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 48, overflow: "hidden" },
  carBody: { padding: 16 },
  carTitle: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  carMeta: { fontSize: 13, color: "#6b7280" },
  confirmed: { textAlign: "center", padding: "60px 20px" },
  confirmedIcon: { fontSize: 64, marginBottom: 16 },
  confirmedTitle: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  confirmedSub: { color: "#6b7280", lineHeight: 1.6, marginBottom: 24 },
  detailBox: { background: "#f0fdf4", border: "1px solid #86efac",
    borderRadius: 10, padding: 16, marginBottom: 20, textAlign: "left" },
  detailRow: { display: "flex", justifyContent: "space-between",
    fontSize: 14, color: "#374151", marginBottom: 8 },
  btn: { padding: "12px 28px", background: "#1d4ed8", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", marginRight: 10 },
  btnOutline: { padding: "12px 28px", background: "transparent",
    border: "1px solid #d1d5db", color: "#374151", borderRadius: 10,
    fontSize: 14, cursor: "pointer" },
};

export default function Booking() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const allCars = [
    ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
    ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]"),
  ];
  const car = allCars.find(c => c.id === id);

  if (!car) return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
      Auto no encontrado.
    </div>
  );

  const handleConfirm = (data) => {
    const booking = {
      id: Date.now().toString(),
      car_id: car.id,
      car_name: `${car.brand} ${car.model} ${car.year}`,
      car_owner_id: car.owner_id || car.id,
      renter_id: user.id,
      renter_name: user.name,
      start_date: data.start.toISOString(),
      end_date: data.end.toISOString(),
      days: data.days,
      price_per_day: car.price_per_day,
      total: data.total,
      commission: data.commission,
      deposit: data.deposit,
      total_final: data.totalFinal,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const bookings = JSON.parse(localStorage.getItem("fw_bookings") || "[]");
    bookings.push(booking);
    localStorage.setItem("fw_bookings", JSON.stringify(bookings));
    setBookingData(booking);
    setConfirmed(true);
  };

  if (confirmed && bookingData) {
    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);
    return (
      <div style={s.page}>
        <div style={s.confirmed}>
          <div style={s.confirmedIcon}>🎉</div>
          <div style={s.confirmedTitle}>¡Reserva enviada!</div>
          <div style={s.confirmedSub}>
            Tu solicitud fue enviada al dueño. Te avisaremos cuando la confirme.
          </div>
          <div style={s.detailBox}>
            <div style={s.detailRow}>
              <span>Vehículo</span>
              <strong>{bookingData.car_name}</strong>
            </div>
            <div style={s.detailRow}>
              <span>Desde</span>
              <strong>{format(start, "d 'de' MMMM yyyy", { locale: es })}</strong>
            </div>
            <div style={s.detailRow}>
              <span>Hasta</span>
              <strong>{format(end, "d 'de' MMMM yyyy", { locale: es })}</strong>
            </div>
            <div style={s.detailRow}>
              <span>Días</span>
              <strong>{bookingData.days}</strong>
            </div>
            <div style={s.detailRow}>
              <span>Total a pagar</span>
              <strong style={{ color: "#1d4ed8" }}>
                ${bookingData.total_final.toLocaleString()}
              </strong>
            </div>
            <div style={s.detailRow}>
              <span>Estado</span>
              <strong style={{ color: "#854d0e" }}>⏳ Pendiente de confirmación</strong>
            </div>
          </div>
          <button style={s.btn} onClick={() => navigate("/my-bookings")}>
            Ver mis reservas
          </button>
          <button style={s.btnOutline} onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Reservar auto</div>
      <div style={s.sub}>Elegí las fechas y confirmá tu reserva</div>
      <div style={s.grid}>
        <div>
          <BookingCalendar car={car} onConfirm={handleConfirm} />
        </div>
        <div>
          <div style={s.carCard}>
            <div style={s.carImg}>
              {car.photos?.length > 0
                ? <img src={car.photos[0]} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "🚙"}
            </div>
            <div style={s.carBody}>
              <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
              <div style={s.carMeta}>📍 {car.location}</div>
              <div style={{ marginTop: 8, fontWeight: 700, fontSize: 16,
                color: "#1d4ed8" }}>
                ${Number(car.price_per_day).toLocaleString()}/día
              </div>
            </div>
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: 14, fontSize: 13, color: "#92400e",
            lineHeight: 1.6 }}>
            <strong>Recordá:</strong> El pago se procesa solo cuando el dueño
            confirma la reserva. El depósito de garantía se devuelve automáticamente
            si no hay daños al finalizar.
          </div>
        </div>
      </div>
    </div>
  );
}