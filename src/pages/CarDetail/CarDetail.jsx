import { useParams, useNavigate } from "react-router-dom";
import { mockCars, mockReviews, mockOwners } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { maxWidth:860, margin:"0 auto", padding:"32px 24px" },
  img: { width:"100%", height:320, background:"#e5e7eb", borderRadius:14,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:80, marginBottom:28 },
  grid: { display:"grid", gridTemplateColumns:"1fr 340px", gap:32 },
  title: { fontSize:26, fontWeight:700, marginBottom:6 },
  location: { color:"#6b7280", fontSize:14, marginBottom:16 },
  badge: { display:"inline-block", padding:"3px 12px", background:"#dcfce7",
    color:"#166534", borderRadius:20, fontSize:12, fontWeight:600, marginRight:8 },
  section: { marginTop:24 },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:12, color:"#111827" },
  specGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  spec: { background:"#f9fafb", borderRadius:8, padding:"10px 14px",
    fontSize:13, color:"#374151" },
  specLabel: { color:"#6b7280", fontSize:11, marginBottom:2 },
  review: { borderBottom:"1px solid #f3f4f6", paddingBottom:14, marginBottom:14 },
  reviewAuthor: { fontWeight:600, fontSize:14, marginBottom:2 },
  reviewText: { fontSize:13, color:"#4b5563" },
  stars: { color:"#f59e0b", fontSize:13 },
  priceCard: { background:"#fff", border:"1px solid #e5e7eb", borderRadius:14,
    padding:24, position:"sticky", top:80 },
  price: { fontSize:28, fontWeight:700, color:"#1d4ed8", marginBottom:4 },
  priceSub: { fontSize:13, color:"#6b7280", marginBottom:20 },
  ownerBox: { display:"flex", alignItems:"center", gap:12,
    padding:"14px 0", borderTop:"1px solid #f3f4f6", marginTop:14 },
  ownerAvatar: { width:44, height:44, borderRadius:"50%", background:"#dbeafe",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, fontSize:18, color:"#1d4ed8" },
  ownerName: { fontWeight:600, fontSize:14 },
  ownerMeta: { fontSize:12, color:"#6b7280" },
  btn: { width:"100%", padding:"14px", background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:10, fontSize:16, fontWeight:700,
    cursor:"pointer", marginBottom:10 },
  chatBtn: { width:"100%", padding:"11px", background:"transparent",
    border:"2px solid #1d4ed8", color:"#1d4ed8", borderRadius:10,
    fontSize:14, fontWeight:600, cursor:"pointer" },
  row: { display:"flex", justifyContent:"space-between", fontSize:13,
    color:"#6b7280", marginBottom:6 },
  total: { display:"flex", justifyContent:"space-between", fontWeight:700,
    fontSize:15, color:"#111827", borderTop:"1px solid #e5e7eb",
    paddingTop:10, marginTop:6 },
};

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const car = mockCars.find(c => c.id === id);
  const reviews = mockReviews[id] || [];
  const owner = mockOwners[car?.owner_id];
  if (!car) return <div style={{padding:40,textAlign:"center"}}>Auto no encontrado.</div>;

  const handleReservar = () => {
    if (!user) { navigate("/login"); return; }
    alert("✅ Reserva iniciada (en el MVP real se procesaría el pago con Mercado Pago)");
  };

  return (
    <div style={s.page}>
      <div style={s.img}>🚙</div>
      <div style={s.grid}>
        <div>
          <div style={s.title}>{car.brand} {car.model} {car.year}</div>
          <div style={s.location}>📍 {car.location}</div>
          {car.is_verified && <span style={s.badge}>✓ Vehículo verificado</span>}
          <span style={{...s.badge, background:"#fef9c3",color:"#854d0e"}}>
            ★ {car.rating} ({car.reviews_count} reseñas)
          </span>

          <div style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <p style={{fontSize:14,color:"#4b5563",lineHeight:1.7}}>{car.description}</p>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Especificaciones</div>
            <div style={s.specGrid}>
              {[
                ["Categoría", car.category],
                ["Transmisión", car.transmission],
                ["Combustible", car.fuel],
                ["Asientos", car.seats],
              ].map(([label, val]) => (
                <div key={label} style={s.spec}>
                  <div style={s.specLabel}>{label}</div>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Reseñas ({reviews.length})</div>
            {reviews.length === 0 ? (
              <p style={{color:"#9ca3af",fontSize:13}}>Aún sin reseñas.</p>
            ) : reviews.map(r => (
              <div key={r.id} style={s.review}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={s.reviewAuthor}>{r.author}</span>
                  <span style={s.stars}>{"★".repeat(r.rating)}</span>
                </div>
                <div style={s.reviewText}>{r.comment}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={s.priceCard}>
            <div style={s.price}>${car.price_per_day.toLocaleString()}</div>
            <div style={s.priceSub}>por día</div>
            <div style={s.row}><span>Precio base (3 días)</span>
              <span>${(car.price_per_day*3).toLocaleString()}</span></div>
            <div style={s.row}><span>Comisión Freewheel</span>
              <span>${Math.round(car.price_per_day*3*.1).toLocaleString()}</span></div>
            <div style={s.row}><span>Depósito garantía</span>
              <span>${(car.price_per_day*2).toLocaleString()}</span></div>
            <div style={s.total}><span>Total estimado</span>
              <span>${Math.round(car.price_per_day*3*1.1+car.price_per_day*2).toLocaleString()}</span></div>
            <br/>
            <button style={s.btn} onClick={handleReservar}>
              {user ? "Reservar ahora" : "Iniciá sesión para reservar"}
            </button>
            <button style={s.chatBtn} onClick={() => user ? navigate("/chat") : navigate("/login")}>
              💬 Contactar al dueño
            </button>

            {owner && (
              <div style={s.ownerBox}>
                <div style={s.ownerAvatar}>{owner.name[0]}</div>
                <div>
                  <div style={s.ownerName}>{owner.name}</div>
                  <div style={s.ownerMeta}>★ {owner.rating} · {owner.rentals} alquileres · desde {owner.since}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
