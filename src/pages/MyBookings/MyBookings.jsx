import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { format, parseISO, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const s = {
  page: { maxWidth:900, margin:"0 auto", padding:"40px 24px" },
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-.5px", marginBottom:6 },
  sub: { color:"#6b7280", fontSize:14, marginBottom:28 },
  tabs: { display:"flex", gap:4, marginBottom:24,
    borderBottom:"2px solid #f3f4f6" },
  tab: { padding:"10px 18px", fontSize:14, fontWeight:500,
    cursor:"pointer", border:"none", background:"transparent",
    color:"#6b7280", borderBottom:"3px solid transparent" },
  tabActive: { color:"#1a4d2e", borderBottom:"3px solid #1a4d2e" },
  card: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    display:"flex", gap:16, border:"1px solid #f3f4f6" },
  carImg: { width:100, height:76, borderRadius:8, background:"#f3f4f6",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:28, flexShrink:0, overflow:"hidden" },
  info: { flex:1 },
  carName: { fontWeight:700, fontSize:15, marginBottom:4, color:"#111827" },
  dates: { fontSize:13, color:"#6b7280", marginBottom:4 },
  renterName: { fontSize:13, color:"#374151", marginBottom:4 },
  total: { fontSize:14, fontWeight:700, color:"#1a4d2e", marginBottom:8 },
  statusBadge: { display:"inline-block", padding:"3px 12px",
    borderRadius:20, fontSize:12, fontWeight:600 },
  pending: { background:"#fef9c3", color:"#854d0e" },
  confirmed: { background:"#dcfce7", color:"#166534" },
  cancelled: { background:"#f3f4f6", color:"#6b7280" },
  completed: { background:"#dbeafe", color:"#1e40af" },
  btnRow: { display:"flex", gap:8, marginTop:10, flexWrap:"wrap" },
  btnConfirm: { padding:"7px 16px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:8, fontSize:12, fontWeight:600,
    cursor:"pointer" },
  btnCancel: { padding:"7px 16px", background:"transparent",
    border:"1.5px solid #fecaca", color:"#dc2626", borderRadius:8,
    fontSize:12, cursor:"pointer" },
  empty: { textAlign:"center", padding:"60px 0", color:"#9ca3af" },
  calCard: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    border:"1px solid #f3f4f6" },
  calHeader: { display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:8 },
  calTitle: { fontWeight:700, fontSize:15, color:"#111827" },
  calMeta: { fontSize:13, color:"#6b7280", marginBottom:14 },
  legend: { display:"flex", gap:16, marginBottom:12, flexWrap:"wrap" },
  legendItem: { display:"flex", alignItems:"center", gap:6,
    fontSize:12, color:"#6b7280" },
  dot: { width:10, height:10, borderRadius:"50%" },
};

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("mis-reservas");
  const [bookings, setBookings] = useState([]);
  const [myCars, setMyCars] = useState([]);

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem("fw_bookings") || "[]");
    setBookings(all);
    const allCars = [
      ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
      ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]"),
    ].filter(c => c.owner_id === user?.id || c.owner_name === user?.name);
    setMyCars(allCars);
  }, []);

  const myRentals = bookings.filter(b => b.renter_id === user?.id);
  const myCarBookings = bookings.filter(b =>
    myCars.some(c => c.id === b.car_id)
  );

  const cancelBooking = (id) => {
    const updated = bookings.map(b =>
      b.id === id ? { ...b, status:"cancelled" } : b
    );
    setBookings(updated);
    localStorage.setItem("fw_bookings", JSON.stringify(updated));
  };

  const confirmBooking = (id) => {
    const updated = bookings.map(b =>
      b.id === id ? { ...b, status:"confirmed" } : b
    );
    setBookings(updated);
    localStorage.setItem("fw_bookings", JSON.stringify(updated));
  };

  const isOccupied = (date, carId) => {
    return bookings.some(b => {
      if (b.car_id !== carId || b.status === "cancelled") return false;
      try {
        return isWithinInterval(date, {
          start: parseISO(b.start_date),
          end: parseISO(b.end_date),
        });
      } catch { return false; }
    });
  };

  const getOccupiedDates = (carId) => {
    const dates = [];
    bookings
      .filter(b => b.car_id === carId && b.status !== "cancelled")
      .forEach(b => {
        try {
          const start = parseISO(b.start_date);
          const end = parseISO(b.end_date);
          const current = new Date(start);
          while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        } catch {}
      });
    return dates;
  };

  const BookingCard = ({ b, isOwner }) => {
    const allCars = [
      ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
      ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]"),
    ];
    const car = allCars.find(c => c.id === b.car_id);

    return (
      <div style={s.card}>
        <div style={s.carImg}>
          {car?.photos?.length > 0
            ? <img src={car.photos[0]} alt=""
                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <div style={{ color:"#9ca3af", fontSize:12 }}>Sin foto</div>}
        </div>
        <div style={s.info}>
          <div style={s.carName}>{b.car_name}</div>
          <div style={s.dates}>
            {format(parseISO(b.start_date), "d MMM yyyy", { locale:es })} —{" "}
            {format(parseISO(b.end_date), "d MMM yyyy", { locale:es })} · {b.days} día{b.days !== 1 ? "s" : ""}
          </div>
          {isOwner && (
            <div style={s.renterName}>
              Conductor: <strong>{b.renter_name}</strong>
            </div>
          )}
          <div style={s.total}>
            ${b.total_final?.toLocaleString()} total
          </div>
          <span style={{ ...s.statusBadge, ...s[b.status] }}>
            {STATUS_LABELS[b.status]}
          </span>
          <div style={s.btnRow}>
            {isOwner && b.status === "pending" && (
              <button style={s.btnConfirm} onClick={() => confirmBooking(b.id)}>
                Confirmar
              </button>
            )}
            {b.status === "pending" && (
              <button style={s.btnCancel} onClick={() => cancelBooking(b.id)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={s.page}>
      <div style={s.title}>Mis reservas</div>
      <div style={s.sub}>Gestioná tus alquileres y calendarios</div>

      <div style={s.tabs}>
        {[
          ["mis-reservas", `Mis alquileres (${myRentals.length})`],
          ["solicitudes", `Solicitudes recibidas (${myCarBookings.length})`],
          ["calendarios", `Calendarios (${myCars.length})`],
        ].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "mis-reservas" && (
        myRentals.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize:13, marginBottom:16 }}>
              Todavía no hiciste ninguna reserva.
            </div>
            <button style={{ padding:"10px 24px", background:"#1a4d2e",
              color:"#fff", border:"none", borderRadius:8,
              cursor:"pointer", fontWeight:600 }}
              onClick={() => navigate("/")}>Explorar autos</button>
          </div>
        ) : myRentals.map(b => (
          <BookingCard key={b.id} b={b} isOwner={false} />
        ))
      )}

      {tab === "solicitudes" && (
        myCarBookings.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize:13 }}>
              No hay solicitudes de reserva para tus autos.
            </div>
          </div>
        ) : myCarBookings.map(b => (
          <BookingCard key={b.id} b={b} isOwner={true} />
        ))
      )}

      {tab === "calendarios" && (
        myCars.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize:13 }}>No tenés autos publicados.</div>
          </div>
        ) : myCars.map(car => (
          <div key={car.id} style={s.calCard}>
            <div style={s.calHeader}>
              <div>
                <div style={s.calTitle}>
                  {car.brand} {car.model} {car.year}
                </div>
                <div style={s.calMeta}>📍 {car.location}</div>
              </div>
              <div style={{ fontSize:13, color:"#6b7280" }}>
                {bookings.filter(b =>
                  b.car_id === car.id && b.status !== "cancelled"
                ).length} reservas
              </div>
            </div>
            <div style={s.legend}>
              <div style={s.legendItem}>
                <div style={{ ...s.dot, background:"#969696" }}/> Ocupado
              </div>
              <div style={s.legendItem}>
                <div style={{ ...s.dot, background:"#000000" }}/> Disponible
              </div>
            </div>
            <DatePicker
              inline
              monthsShown={2}
              locale={es}
              filterDate={(date) => !isOccupied(date, car.id)}
              highlightDates={[{
                "react-datepicker__day--highlighted-custom":
                  getOccupiedDates(car.id),
              }]}
              onChange={() => {}}
            />
          </div>
        ))
      )}
    </div>
  );
}