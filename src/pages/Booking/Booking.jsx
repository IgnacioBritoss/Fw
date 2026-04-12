import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BookingCalendar from "../../components/BookingCalendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const s = {
  page: { maxWidth:900, margin:"0 auto", padding:"40px 24px" },
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-.5px", marginBottom:6 },
  sub: { fontSize:14, color:"#6b7280", marginBottom:28 },
  grid: { display:"grid", gridTemplateColumns:"1fr 340px", gap:32 },
  carCard: { background:"#fff", borderRadius:12, overflow:"hidden",
    border:"1px solid #f3f4f6", marginBottom:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  carImg: { width:"100%", height:180, background:"#f3f4f6",
    display:"flex", alignItems:"center", justifyContent:"center",
    overflow:"hidden" },
  carBody: { padding:16 },
  carTitle: { fontWeight:700, fontSize:15, marginBottom:4, color:"#111827" },
  carMeta: { fontSize:13, color:"#6b7280", marginBottom:6 },
  carPrice: { fontWeight:800, fontSize:18, color:"#1a4d2e" },
  infoBox: { background:"#fffbeb", border:"1px solid #fde68a",
    borderRadius:10, padding:14, fontSize:13, color:"#92400e",
    lineHeight:1.6 },
  confirmed: { textAlign:"center", padding:"60px 20px" },
  confirmedIcon: { width:72, height:72, borderRadius:"50%",
    background:"#f0f7f2", display:"flex", alignItems:"center",
    justifyContent:"center", margin:"0 auto 20px" },
  confirmedTitle: { fontSize:22, fontWeight:800, marginBottom:8,
    color:"#111827" },
  confirmedSub: { color:"#6b7280", lineHeight:1.6, marginBottom:24 },
  detailBox: { background:"#f9fafb", border:"1px solid #f3f4f6",
    borderRadius:10, padding:16, marginBottom:20, textAlign:"left" },
  detailRow: { display:"flex", justifyContent:"space-between",
    fontSize:14, color:"#374151", marginBottom:8 },
  btnRow: { display:"flex", gap:10, justifyContent:"center" },
  btn: { padding:"12px 28px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:10, fontSize:14, fontWeight:700,
    cursor:"pointer" },
  btnOutline: { padding:"12px 28px", background:"transparent",
    border:"1.5px solid #e5e7eb", color:"#374151", borderRadius:10,
    fontSize:14, cursor:"pointer" },
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
    <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>
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
          <div style={s.confirmedIcon}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#1a4d2e" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={s.confirmedTitle}>Solicitud enviada</div>
          <div style={s.confirmedSub}>
            Tu solicitud fue enviada al dueño.<br/>
            Te avisaremos cuando la confirme.
          </div>
          <div style={s.detailBox}>
            {[
              ["Vehículo", bookingData.car_name],
              ["Desde", format(start, "d 'de' MMMM yyyy", { locale:es })],
              ["Hasta", format(end, "d 'de' MMMM yyyy", { locale:es })],
              ["Días", bookingData.days],
              ["Total", `$${bookingData.total_final?.toLocaleString()}`],
              ["Estado", "Pendiente de confirmación"],
            ].map(([k, v]) => (
              <div key={k} style={s.detailRow}>
                <span style={{ color:"#6b7280" }}>{k}</span>
                <strong style={k === "Total" ? { color:"#1a4d2e" } : {}}>
                  {v}
                </strong>
              </div>
            ))}
          </div>
          <div style={s.btnRow}>
            <button style={s.btn}
              onClick={() => navigate("/my-bookings")}>
              Ver mis reservas
            </button>
            <button style={s.btnOutline}
              onClick={() => navigate("/")}>
              Volver al inicio
            </button>
          </div>
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
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ color:"#9ca3af", fontSize:13 }}>Sin foto</div>}
            </div>
            <div style={s.carBody}>
              <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
              <div style={s.carMeta}>📍 {car.location}</div>
              <div style={s.carPrice}>
                ${Number(car.price_per_day).toLocaleString()}/día
              </div>
            </div>
          </div>
          <div style={s.infoBox}>
            <strong>Recordá:</strong> El pago se procesa solo cuando el dueño
            confirma la reserva. El depósito de garantía se devuelve
            automáticamente si no hay daños al finalizar.
          </div>
        </div>
      </div>
    </div>
  );
}