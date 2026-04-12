import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["Todos", "Sedan", "SUV", "Pickup", "Eléctrico"];

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
    ...JSON.parse(localStorage.getItem("fw_my_cars") || "[]").filter(c => c.approved && !c.banned),
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
  
  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;
    
    const map = L.map(mapRef.current, {
      center: [-38.4161, -63.6167],
      zoom: 5,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapInstanceRef.current = map;
  };

  if (window.L) {
    setTimeout(initMap, 100);
  } else {
    const interval = setInterval(() => {
      if (window.L) {
        clearInterval(interval);
        setTimeout(initMap, 100);
      }
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
    width: 14px;
    height: 14px;
    background: #e00;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,.35);
    cursor: pointer;
  "></div>`,
  iconAnchor: [7, 7],
});

      const marker = L.marker([car.lat, car.lng], { icon });

      marker.bindPopup(L.popup({
        closeButton: false,
        maxWidth: 220,
        className: "fw-popup",
      }).setContent(`
        <div style="cursor:pointer;font-family:sans-serif"
          onclick="window.__fwOpen('${car.id}')">
          <div style="width:100%;height:120px;border-radius:10px;overflow:hidden;
            margin-bottom:10px;background:#e5e7eb;display:flex;align-items:center;
            justify-content:center;">
            ${car.photos?.length > 0
              ? `<img src="${car.photos[0]}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<div style="font-size:40px">🚙</div>`}
          </div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">
            ★ ${car.rating || "Nuevo"} · ${car.category}
          </div>
          <div style="font-weight:600;font-size:14px;margin-bottom:2px;color:#111827">
            ${car.brand} ${car.model} ${car.year}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px">
            ${car.location}
          </div>
          <div style="font-weight:700;font-size:15px;color:#111827">
            $${Number(car.price_per_day).toLocaleString()}
            <span style="font-weight:400;font-size:12px;color:#6b7280">/día</span>
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
      style={{ cursor: "pointer", marginBottom: 24 }}>
      <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 12,
        overflow: "hidden", background: "#e5e7eb", marginBottom: 10,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ fontSize: 48, color: "#9ca3af" }}>🚙</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 2 }}>
            {car.location}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {car.transmission} · {car.fuel}
          </div>
        </div>
        {car.rating > 0 && (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500,
            display: "flex", alignItems: "center", gap: 3 }}>
            ★ {car.rating}
          </div>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#111827" }}>
        <strong>${Number(car.price_per_day).toLocaleString()}</strong>
        <span style={{ fontWeight: 400, color: "#6b7280" }}> /día</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)",
        padding: "48px 32px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>
          Alquilá el auto perfecto
        </div>
        <div style={{ fontSize: 18, opacity: .85, marginBottom: 32 }}>
          Entre particulares, con confianza y sin complicaciones
        </div>
        <div style={{ display: "flex", gap: 10, maxWidth: 600, margin: "0 auto",
          flexWrap: "wrap", justifyContent: "center" }}>
          <input
            style={{ flex: 1, minWidth: 160, padding: "12px 16px",
              borderRadius: 10, border: "none", fontSize: 15 }}
            placeholder="¿A dónde vas? Ciudad, zona o modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)} />
          <button style={{ padding: "12px 24px", background: "#f59e0b",
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            Buscar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c} style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13,
                cursor: "pointer", fontWeight: 500,
                border: cat === c ? "2px solid #111827" : "1px solid #d1d5db",
                background: cat === c ? "#111827" : "#fff",
                color: cat === c ? "#fff" : "#374151",
              }} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["lista", "Lista"], ["mapa", "Mapa"]].map(([k, l]) => (
              <button key={k} style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13,
                cursor: "pointer", border: "1px solid #d1d5db",
                background: view === k ? "#111827" : "#fff",
                color: view === k ? "#fff" : "#374151",
              }} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {view === "lista" ? (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
          <div style={{ display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "0 24px" }}>
            {filtered.map(car => <CarCard key={car.id} car={car} />)}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center",
                padding: 60, color: "#9ca3af" }}>
                No se encontraron autos.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 45%",
          maxWidth: 1280, margin: "0 auto", padding: "24px", gap: 24,
          alignItems: "start" }}>
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)",
            paddingRight: 8 }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
            </div>
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
              gap: "0 20px" }}>
              {filtered.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
          <div style={{ position: "sticky", top: 80 }}>
            <div ref={mapRef}
              style={{ height: "calc(100vh - 140px)", borderRadius: 12,
                overflow: "hidden", zIndex: 0,
                border: "1px solid #e5e7eb" }} />
          </div>
        </div>
      )}
    </div>
  );
}