import { useState } from "react";
import ReportModal from "../../components/ReportModal";
import { useParams, useNavigate } from "react-router-dom";
import { mockReviews, mockOwners } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { maxWidth:860, margin:"0 auto", padding:"32px 24px" },
  imgContainer: { width:"100%", height:320, background:"#e5e7eb", borderRadius:14,
    overflow:"hidden", marginBottom:28, display:"flex",
    alignItems:"center", justifyContent:"center", fontSize:80 },
  img: { width:"100%", height:"100%", objectFit:"cover" },
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
  pendingBadge: { display:"inline-block", padding:"3px 12px", background:"#fef9c3",
    color:"#854d0e", borderRadius:20, fontSize:12, fontWeight:600, marginRight:8 },
  specBadge: { display:"inline-block", fontSize:10, padding:"2px 8px",
    background:"#dcfce7", color:"#166534", borderRadius:20,
    fontWeight:600, marginLeft:6 },
};

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [showReportUser, setShowReportUser] = useState(false);
  const navigate = useNavigate();

  const allCars = [
    ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
    ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]"),
  ];
  const car = allCars.find(c => c.id === id);
  const reviews = mockReviews[id] || [];
  const owner = car?.owner_id ? mockOwners[car.owner_id] : null;

  if (!car) return (
    <div style={{ padding:40, textAlign:"center", color:"#6b7280" }}>
      Auto no encontrado.
    </div>
  );

  const handleReservar = () => {
    if (!user) { navigate("/login"); return; }
    alert("✅ Reserva iniciada (en el MVP real se procesaría el pago con Mercado Pago)");
  };

  const ownerName = owner?.name || car.owner_name || "Dueño";
  const ownerRating = owner?.rating || "—";
  const ownerRentals = owner?.rentals || 0;
  const ownerSince = owner?.since || "2024";

  return (
    <div style={s.page}>
      <div style={s.imgContainer}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt={`${car.brand} ${car.model}`} style={s.img} />
          : "🚙"}
      </div>

      <div style={s.grid}>
        <div>
          <div style={s.title}>{car.brand} {car.model} {car.year}</div>
          <div style={s.location}>📍 {car.location}</div>

          {car.is_verified
            ? <span style={s.badge}>✓ Vehículo verificado</span>
            : <span style={s.pendingBadge}>⏳ Pendiente de verificación</span>}

          <span style={{...s.badge, background:"#fef9c3", color:"#854d0e"}}>
            ★ {car.rating || "Nuevo"} ({car.reviews_count || 0} reseñas)
          </span>

          <div style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <p style={{fontSize:14, color:"#4b5563", lineHeight:1.7}}>
              {car.description || "Sin descripción."}
            </p>
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

          {car.specs && Object.keys(car.specs).length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>
                Especificaciones técnicas
                <span style={s.specBadge}>IA</span>
              </div>
              <div style={s.specGrid}>
                {Object.entries(car.specs).map(([key, val]) => (
                  <div key={key} style={s.spec}>
                    <div style={s.specLabel}>{key.replace(/_/g, " ")}</div>
                    <strong>{String(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {car.photos?.length > 1 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Fotos</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {car.photos.map((p, i) => (
                  <img key={i} src={p} alt={`foto ${i+1}`}
                    style={{ width:"100%", aspectRatio:"4/3",
                      objectFit:"cover", borderRadius:8 }} />
                ))}
              </div>
            </div>
          )}

          <div style={s.section}>
            <div style={s.sectionTitle}>Reseñas ({reviews.length})</div>
            {reviews.length === 0
              ? <p style={{color:"#9ca3af", fontSize:13}}>Aún sin reseñas.</p>
              : reviews.map(r => (
                <div key={r.id} style={s.review}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
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
            <div style={s.price}>${Number(car.price_per_day).toLocaleString()}</div>
            <div style={s.priceSub}>por día</div>
            <div style={s.row}>
              <span>Precio base (3 días)</span>
              <span>${(car.price_per_day*3).toLocaleString()}</span>
            </div>
            <div style={s.row}>
              <span>Comisión Freewheel</span>
              <span>${Math.round(car.price_per_day*3*.1).toLocaleString()}</span>
            </div>
            <div style={s.row}>
              <span>Depósito garantía</span>
              <span>${(car.price_per_day*2).toLocaleString()}</span>
            </div>
            <div style={s.total}>
              <span>Total estimado</span>
              <span>${Math.round(car.price_per_day*3*1.1+car.price_per_day*2).toLocaleString()}</span>
            </div>
            <br/>
            <button style={s.btn} onClick={() => user ? navigate(`/booking/${car.id}`) : navigate("/login")}>
              {user ? "Reservar ahora" : "Iniciá sesión para reservar"}
            </button>
            <button style={s.chatBtn}
              onClick={() => user ? navigate("/chat") : navigate("/login")}>
              💬 Contactar al dueño
            </button>

            <div style={s.ownerBox}>
              <div style={s.ownerAvatar}>{ownerName[0]}</div>
              <div style={{ flex:1 }}>
                <div style={s.ownerName}>{ownerName}</div>
                <div style={s.ownerMeta}>
                  ★ {ownerRating} · {ownerRentals} alquileres · desde {ownerSince}
                </div>
              </div>
              <button
                onClick={() => user ? setShowReportUser(true) : navigate("/login")}
                style={{ background:"none", border:"1px solid #fecaca",
                  borderRadius:8, color:"#dc2626", fontSize:11,
                  cursor:"pointer", padding:"4px 10px" }}>
                Reportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign:"center", marginTop:32 }}>
        <button
          onClick={() => user ? setShowReport(true) : navigate("/login")}
          style={{ background:"none", border:"none", color:"#9ca3af",
            fontSize:13, cursor:"pointer", textDecoration:"underline" }}>
          Reportar esta publicación
        </button>
      </div>

      {showReport && (
        <ReportModal
          target={`${car.brand} ${car.model} ${car.year}`}
          targetType="car"
          onClose={() => setShowReport(false)}
        />
      )}

      {showReportUser && (
        <ReportModal
          target={ownerName}
          targetType="user"
          onClose={() => setShowReportUser(false)}
        />
      )}
    </div>
  );
}