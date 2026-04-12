import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { id: "Todos", label: "Todos" },
  { id: "Sedan", label: "Sedan" },
  { id: "SUV", label: "SUV" },
  { id: "Pickup", label: "Pickup" },
  { id: "Eléctrico", label: "Eléctrico" },
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");
  const [view, setView] = useState("lista");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredCar, setHoveredCar] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const allCars = [
    ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
    ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]")
      .filter(c => c.approved && !c.banned),
  ];

  const filtered = allCars.filter(c => {
    const matchSearch = !search ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.brand?.toLowerCase().includes(search.toLowerCase()) ||
      c.model?.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "Todos" || c.category === cat;
    return matchSearch && matchCat && c.available !== false;
  });

  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (view !== "mapa") return;
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;
      const map = L.map(mapRef.current, {
        center: [-34.6037, -58.3816], zoom: 12,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapInstanceRef.current = map;
    };
    if (window.L) setTimeout(init, 100);
    else {
      const iv = setInterval(() => {
        if (window.L) { clearInterval(iv); setTimeout(init, 100); }
      }, 100);
    }
  }, [view, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    filtered.forEach(car => {
      if (!car.lat || !car.lng) return;
      const isHovered = hoveredCar === car.id;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;
          background:${isHovered ? "#1a4d2e" : "#e00"};
          border:2px solid #fff;border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.35);
          cursor:pointer;transition:all .15s;
        "></div>`,
        iconAnchor: [7, 7],
      });
      const marker = L.marker([car.lat, car.lng], { icon });
      marker.bindPopup(L.popup({ closeButton: false, maxWidth: 220 }).setContent(`
        <div style="cursor:pointer;font-family:sans-serif"
          onclick="window.__fwOpen('${car.id}')">
          <div style="width:100%;height:120px;border-radius:10px;overflow:hidden;
            margin-bottom:10px;background:#e5e7eb;">
            ${car.photos?.length > 0
              ? `<img src="${car.photos[0]}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#9ca3af">—</div>`}
          </div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">
            ${car.category} · ${car.transmission}
          </div>
          <div style="font-weight:600;font-size:14px;margin-bottom:2px;color:#111827">
            ${car.brand} ${car.model} ${car.year}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px">
            ${car.location}
          </div>
          <div style="font-weight:700;font-size:15px;color:#1a4d2e">
            $${Number(car.price_per_day).toLocaleString()}
            <span style="font-weight:400;font-size:12px;color:#6b7280">/día</span>
          </div>
          <div style="margin-top:8px;padding:7px;background:#1a4d2e;color:#fff;
            border-radius:8px;text-align:center;font-size:12px;font-weight:600;">
            Ver auto
          </div>
        </div>
      `));
      marker.addTo(map);
      markersRef.current[car.id] = marker;
    });
    window.__fwOpen = (id) => navigate(`/cars/${id}`);
  }, [filtered, mapLoaded, hoveredCar]);

  const CarCard = ({ car }) => (
    <div
      onClick={() => navigate(`/cars/${car.id}`)}
      onMouseEnter={() => setHoveredCar(car.id)}
      onMouseLeave={() => setHoveredCar(null)}
      style={{ cursor:"pointer", marginBottom:28 }}>
      <div style={{ width:"100%", aspectRatio:"4/3", borderRadius:14,
        overflow:"hidden", background:"#f3f4f6", marginBottom:10,
        position:"relative" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover",
                transition:"transform .3s" }}
              onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"} />
          : <div style={{ width:"100%", height:"100%", display:"flex",
              alignItems:"center", justifyContent:"center",
              color:"#9ca3af", fontSize:14 }}>Sin foto</div>}
        {car.is_verified && (
          <div style={{ position:"absolute", top:10, left:10,
            background:"rgba(26,77,46,.9)", color:"#fff",
            padding:"3px 10px", borderRadius:20, fontSize:11,
            fontWeight:600 }}>Verificado</div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:14, color:"#111827",
            marginBottom:2 }}>{car.location}</div>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:2 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ fontSize:13, color:"#6b7280" }}>
            {car.transmission} · {car.fuel}
          </div>
        </div>
        {car.rating > 0 && (
          <div style={{ fontSize:13, color:"#111827", fontWeight:600,
            display:"flex", alignItems:"center", gap:3 }}>
            ★ {car.rating}
          </div>
        )}
      </div>
      <div style={{ marginTop:6, fontSize:14, color:"#111827" }}>
        <strong style={{ color:"#1a4d2e" }}>
          ${Number(car.price_per_day).toLocaleString()}
        </strong>
        <span style={{ color:"#6b7280" }}> /día</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#fff" }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg, #1a4d2e 0%, #2d6e47 100%)",
        padding:"64px 32px", textAlign:"center", color:"#fff" }}>
        <div style={{ fontSize:42, fontWeight:800, marginBottom:12,
          letterSpacing:"-1px", lineHeight:1.2 }}>
          Alquilá el auto perfecto
        </div>
        <div style={{ fontSize:18, opacity:.85, marginBottom:40,
          fontWeight:400 }}>
          Entre particulares, con confianza y sin complicaciones
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:"8px 8px 8px 20px",
          maxWidth:620, margin:"0 auto", display:"flex", gap:8,
          boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>
          <input
            style={{ flex:1, border:"none", outline:"none", fontSize:15,
              color:"#111827", background:"transparent" }}
            placeholder="Ciudad, zona o modelo de auto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button style={{ padding:"12px 24px", background:"#1a4d2e",
            color:"#fff", border:"none", borderRadius:10, fontSize:15,
            fontWeight:700, cursor:"pointer" }}>
            Buscar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ maxWidth:1280, margin:"0 auto",
        padding:"20px 24px 10px", borderBottom:"1px solid #f3f4f6" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                padding:"8px 18px", borderRadius:20, fontSize:13,
                cursor:"pointer", fontWeight:500, transition:"all .15s",
                border: cat === c.id ? "2px solid #1a4d2e" : "1.5px solid #e5e7eb",
                background: cat === c.id ? "#1a4d2e" : "#fff",
                color: cat === c.id ? "#fff" : "#374151",
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[["lista","Lista"],["mapa","Mapa"]].map(([k,l]) => (
              <button key={k} onClick={() => setView(k)} style={{
                padding:"8px 18px", borderRadius:20, fontSize:13,
                cursor:"pointer", fontWeight:500,
                border: view === k ? "2px solid #1a4d2e" : "1.5px solid #e5e7eb",
                background: view === k ? "#1a4d2e" : "#fff",
                color: view === k ? "#fff" : "#374151",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {view === "lista" ? (
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"32px 24px" }}>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>
            {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
          </div>
          <div style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
            gap:"0 28px" }}>
            {filtered.map(car => <CarCard key={car.id} car={car} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center",
                padding:80, color:"#9ca3af" }}>
                No se encontraron autos para tu búsqueda.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 45%",
          maxWidth:1280, margin:"0 auto", padding:"24px", gap:24 }}>
          <div style={{ overflowY:"auto",
            maxHeight:"calc(100vh - 200px)", paddingRight:8 }}>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>
              {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
              gap:"0 20px" }}>
              {filtered.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
          <div style={{ position:"sticky", top:80 }}>
            <div ref={mapRef} style={{ height:"calc(100vh - 140px)",
              borderRadius:14, overflow:"hidden", zIndex:0,
              border:"1px solid #e5e7eb" }} />
          </div>
        </div>
      )}

      {/* Footer simple */}
      <div style={{ borderTop:"1px solid #f3f4f6", padding:"32px 24px",
        textAlign:"center", color:"#9ca3af", fontSize:13, marginTop:40 }}>
        © 2025 Freewheel · Alquiler de autos entre particulares en Argentina
      </div>
    </div>
  );
}