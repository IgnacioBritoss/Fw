import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockCars } from "../../data/mockData";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb" },
  hero: { background:"linear-gradient(135deg,#1e40af,#3b82f6)", padding:"64px 32px",
    textAlign:"center", color:"#fff" },
  heroTitle: { fontSize:36, fontWeight:700, marginBottom:12 },
  heroSub: { fontSize:18, opacity:.85, marginBottom:32 },
  searchRow: { display:"flex", gap:10, maxWidth:600, margin:"0 auto",
    flexWrap:"wrap", justifyContent:"center" },
  input: { flex:1, minWidth:160, padding:"12px 16px", borderRadius:10,
    border:"none", fontSize:15 },
  searchBtn: { padding:"12px 24px", background:"#f59e0b", color:"#fff",
    border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
    gap:24, padding:"40px 32px", maxWidth:1100, margin:"0 auto" },
  card: { background:"#fff", borderRadius:14, overflow:"hidden",
    boxShadow:"0 2px 12px rgba(0,0,0,.07)", cursor:"pointer",
    transition:"transform .15s,box-shadow .15s" },
  img: { width:"100%", height:180, objectFit:"cover", background:"#e5e7eb",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:40 },
  cardBody: { padding:"14px 16px" },
  cardTitle: { fontWeight:600, fontSize:16, marginBottom:4 },
  cardLoc: { color:"#6b7280", fontSize:13, marginBottom:8 },
  cardRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  price: { fontWeight:700, fontSize:18, color:"#1d4ed8" },
  rating: { fontSize:13, color:"#f59e0b", fontWeight:600 },
  badge: { display:"inline-block", fontSize:11, padding:"2px 8px",
    background:"#dcfce7", color:"#166534", borderRadius:20, marginLeft:6 },
  filters: { padding:"16px 32px", maxWidth:1100, margin:"0 auto",
    display:"flex", gap:10, flexWrap:"wrap" },
  filterBtn: { padding:"6px 16px", borderRadius:20, border:"1px solid #d1d5db",
    background:"#fff", cursor:"pointer", fontSize:13, color:"#374151" },
  filterActive: { background:"#1d4ed8", color:"#fff", borderColor:"#1d4ed8" },
};

const CATEGORIES = ["Todos","Sedan","SUV","Pickup","Eléctrico"];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");

  const allCars = [
  ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
  ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]").filter(c => c.approved && !c.banned),
];

const filtered = allCars.filter(c => {
    const matchSearch = !search ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "Todos" || c.category === cat;
    return matchSearch && matchCat;
  });

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div style={s.heroTitle}>Alquilá el auto perfecto</div>
        <div style={s.heroSub}>Entre particulares, con confianza y sin complicaciones</div>
        <div style={s.searchRow}>
          <input style={s.input} placeholder="¿A dónde vas? Ciudad o zona..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.searchBtn}>Buscar</button>
        </div>
      </div>

      <div style={s.filters}>
        {CATEGORIES.map(c => (
          <button key={c} style={{...s.filterBtn, ...(cat===c ? s.filterActive : {})}}
            onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div style={s.grid}>
        {filtered.map(car => (
          <div key={car.id} style={s.card}
            onClick={() => navigate(`/cars/${car.id}`)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.12)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)";
            }}>
            <div style={s.img}>🚙</div>
            <div style={s.cardBody}>
              <div style={s.cardTitle}>
                {car.brand} {car.model} {car.year}
                {car.is_verified && <span style={s.badge}>✓ Verificado</span>}
              </div>
              <div style={s.cardLoc}>📍 {car.location}</div>
              <div style={s.cardRow}>
                <span style={s.price}>${car.price_per_day.toLocaleString()}/día</span>
                <span style={s.rating}>★ {car.rating} ({car.reviews_count})</span>              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:"#6b7280"}}>
            No se encontraron autos para tu búsqueda.
          </div>
        )}
      </div>
    </div>
  );
}
