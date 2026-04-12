import { useState } from "react";
import ReportModal from "../../components/ReportModal";
import { useParams, useNavigate } from "react-router-dom";
import { mockReviews, mockOwners } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const s = {
  page: { maxWidth:860, margin:"0 auto", padding:"32px 24px" },
  pageMobile: { padding:"16px" },
  badge: { display:"inline-block", padding:"3px 12px", background:"#dcfce7",
    color:"#166534", borderRadius:20, fontSize:12, fontWeight:600, marginRight:8 },
  pendingBadge: { display:"inline-block", padding:"3px 12px",
    background:"#fef9c3", color:"#854d0e", borderRadius:20,
    fontSize:12, fontWeight:600, marginRight:8 },
  section: { marginTop:24 },
  sectionTitle: { fontSize:15, fontWeight:700, marginBottom:12, color:"#111827" },
  specGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  spec: { background:"#f9fafb", borderRadius:8, padding:"10px 14px",
    fontSize:13, color:"#374151", border:"1px solid #f3f4f6" },
  specLabel: { color:"#9ca3af", fontSize:11, marginBottom:2 },
  review: { borderBottom:"1px solid #f3f4f6", paddingBottom:14, marginBottom:14 },
  reviewAuthor: { fontWeight:600, fontSize:14, marginBottom:2, color:"#111827" },
  reviewText: { fontSize:13, color:"#4b5563" },
  stars: { color:"#f59e0b", fontSize:13 },
  priceCard: { background:"#fff", border:"1px solid #e5e7eb",
    borderRadius:14, padding:24, position:"sticky", top:80 },
  priceCardMobile: { background:"#fff", border:"1px solid #e5e7eb",
    borderRadius:14, padding:20, marginTop:24 },
  price: { fontSize:28, fontWeight:800, color:"#1a4d2e", marginBottom:4 },
  priceSub: { fontSize:13, color:"#6b7280", marginBottom:20 },
  ownerBox: { display:"flex", alignItems:"center", gap:12,
    padding:"14px 0", borderTop:"1px solid #f3f4f6", marginTop:14 },
  ownerAvatar: { width:44, height:44, borderRadius:"50%",
    background:"#f0f7f2", display:"flex", alignItems:"center",
    justifyContent:"center", fontWeight:700, fontSize:18, color:"#1a4d2e" },
  ownerName: { fontWeight:700, fontSize:14, color:"#111827" },
  ownerMeta: { fontSize:12, color:"#6b7280" },
  btn: { width:"100%", padding:"14px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:700,
    cursor:"pointer", marginBottom:10 },
  chatBtn: { width:"100%", padding:"11px", background:"transparent",
    border:"2px solid #1a4d2e", color:"#1a4d2e", borderRadius:10,
    fontSize:14, fontWeight:600, cursor:"pointer" },
  row: { display:"flex", justifyContent:"space-between", fontSize:13,
    color:"#6b7280", marginBottom:6 },
  total: { display:"flex", justifyContent:"space-between", fontWeight:700,
    fontSize:15, color:"#111827", borderTop:"1px solid #e5e7eb",
    paddingTop:10, marginTop:6 },
  arrowBtn: { position:"absolute", top:"50%", transform:"translateY(-50%)",
    width:44, height:44, borderRadius:"50%",
    background:"rgba(255,255,255,.92)", border:"none", cursor:"pointer",
    fontSize:22, fontWeight:700, display:"flex", alignItems:"center",
    justifyContent:"center", boxShadow:"0 2px 10px rgba(0,0,0,.15)" },
  dot: { height:8, borderRadius:4, cursor:"pointer",
    transition:"all .2s", background:"rgba(255,255,255,.5)" },
  dotActive: { background:"#fff" },
  thumbnail: { width:88, height:60, objectFit:"cover", borderRadius:8,
    cursor:"pointer", flexShrink:0, transition:"all .15s" },
};

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [showReport, setShowReport] = useState(false);
  const [showReportUser, setShowReportUser] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
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

  const photos = car.photos || [];
  const ownerName = owner?.name || car.owner_name || "Dueño";
  const ownerRating = owner?.rating || "—";
  const ownerRentals = owner?.rentals || 0;
  const ownerSince = owner?.since || "2024";

  const prevPhoto = () =>
    setCurrentPhoto(p => p === 0 ? photos.length - 1 : p - 1);
  const nextPhoto = () =>
    setCurrentPhoto(p => p === photos.length - 1 ? 0 : p + 1);

  const PriceCard = () => (
    <div style={isMobile ? s.priceCardMobile : s.priceCard}>
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
      <button style={s.btn}
        onClick={() => user ? navigate(`/booking/${car.id}`) : navigate("/login")}>
        {user ? "Reservar ahora" : "Iniciá sesión para reservar"}
      </button>
      <button style={s.chatBtn}
        onClick={() => user ? navigate("/chat") : navigate("/login")}>
        Contactar al dueño
      </button>
      <div style={s.ownerBox}>
        <div style={s.ownerAvatar}>{ownerName[0]}</div>
        <div style={{ flex:1 }}>
          <div style={s.ownerName}>{ownerName}</div>
          <div style={s.ownerMeta}>
            {ownerRating} · {ownerRentals} alquileres · desde {ownerSince}
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
  );

  return (
    <div style={{ ...s.page, ...(isMobile ? s.pageMobile : {}) }}>

      {/* Galería */}
      <div style={{ position:"relative", marginBottom:28 }}>
        <div style={{
          width:"100%", height: isMobile ? 240 : 380,
          borderRadius: isMobile ? 10 : 14,
          overflow:"hidden", position:"relative", background:"#f3f4f6",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {photos.length > 0
            ? <img src={photos[currentPhoto]} alt=""
                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ color:"#9ca3af", fontSize:14 }}>Sin fotos</span>}

          {photos.length > 1 && (
            <>
              <button style={{ ...s.arrowBtn, left: isMobile ? 8 : 16,
                width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={prevPhoto}>‹</button>
              <button style={{ ...s.arrowBtn, right: isMobile ? 8 : 16,
                width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={nextPhoto}>›</button>
              <div style={{ position:"absolute", bottom:14, left:"50%",
                transform:"translateX(-50%)", display:"flex", gap:6 }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)}
                    style={{ ...s.dot, width: i === currentPhoto ? 22 : 8,
                      ...(i === currentPhoto ? s.dotActive : {}) }} />
                ))}
              </div>
              <div style={{ position:"absolute", top:14, right:14,
                background:"rgba(0,0,0,.55)", color:"#fff",
                borderRadius:20, padding:"4px 12px", fontSize:12 }}>
                {currentPhoto + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div style={{ display:"flex", gap:8, marginTop:10,
            overflowX:"auto", paddingBottom:4 }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt=""
                onClick={() => setCurrentPhoto(i)}
                style={{ ...s.thumbnail,
                  border: i === currentPhoto
                    ? "2px solid #1a4d2e" : "2px solid transparent",
                  opacity: i === currentPhoto ? 1 : 0.6 }} />
            ))}
          </div>
        )}
      </div>

      {/* En mobile el priceCard va arriba del contenido */}
      {isMobile && <PriceCard />}

      {/* Grid — 2 columnas en desktop, 1 en mobile */}
      <div style={{
        display: isMobile ? "block" : "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 32,
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight:800,
            marginBottom:6, color:"#111827", letterSpacing:"-.5px",
            marginTop: isMobile ? 20 : 0 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ color:"#6b7280", fontSize:14, marginBottom:16 }}>
            {car.location}
          </div>

          {car.is_verified
            ? <span style={s.badge}>Vehículo verificado</span>
            : <span style={s.pendingBadge}>Pendiente de verificación</span>}
          {car.rating > 0 && (
            <span style={{...s.badge, background:"#fef9c3", color:"#854d0e"}}>
              {car.rating} ({car.reviews_count || 0} reseñas)
            </span>
          )}

          <div style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <p style={{ fontSize:14, color:"#4b5563", lineHeight:1.7 }}>
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
              <div style={s.sectionTitle}>Especificaciones técnicas</div>
              <div style={s.specGrid}>
                {Object.entries(car.specs).map(([key, val]) => (
                  <div key={key} style={s.spec}>
                    <div style={s.specLabel}>{key.replace(/_/g," ")}</div>
                    <strong>{String(val)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={s.section}>
            <div style={s.sectionTitle}>Reseñas ({reviews.length})</div>
            {reviews.length === 0
              ? <p style={{ color:"#9ca3af", fontSize:13 }}>Aún sin reseñas.</p>
              : reviews.map(r => (
                <div key={r.id} style={s.review}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={s.reviewAuthor}>{r.author}</span>
                    <span style={s.stars}>{"★".repeat(r.rating)}</span>
                  </div>
                  <div style={s.reviewText}>{r.comment}</div>
                </div>
              ))}
          </div>
        </div>

        {/* En desktop el priceCard va a la derecha */}
        {!isMobile && (
          <div><PriceCard /></div>
        )}
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