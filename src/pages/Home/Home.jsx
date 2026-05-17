import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getListings } from "../../services/api";
import { mockCars } from "../../data/mockData";

const CATEGORIES = [
  { id: "Todos", label: "Todos" },
  { id: "Sedan", label: "Sedan" },
  { id: "SUV", label: "SUV" },
  { id: "Pickup", label: "Pickup" },
  { id: "Eléctrico", label: "Eléctrico" },
];

const TRANSMISSION_LABELS = { MANUAL: "Manual", AUTOMATIC: "Automático" };
const FUEL_LABELS = { GASOLINE: "Nafta", DIESEL: "Diesel", ELECTRIC: "Eléctrico", OTHER: "GNC" };

function normalizeListing(l) {
  const v = l.vehicle || {};
  return {
    id: l.id,
    brand: v.brand || l.brand || "",
    model: v.model || l.model || "",
    year: v.year || l.year || "",
    price_per_day: l.pricePerDay || l.price_per_day || 0,
    locationText: l.locationText || l.location || "",
    location: l.locationText || l.location || "",
    lat: l.latitude ?? l.lat,
    lng: l.longitude ?? l.lng,
    transmission: TRANSMISSION_LABELS[v.transmission] || v.transmission || l.transmission || "",
    fuel: FUEL_LABELS[v.fuelType] || v.fuelType || l.fuel || "",
    seats: v.seats || l.seats,
    photos: l.photos || v.photos || [],
    available: l.status === "ACTIVE" || l.available !== false,
    is_verified: l.is_verified || false,
    rating: l.rating || 0,
    category: l.category || v.category || "",
    description: l.description || "",
    owner_id: l.ownerId || l.owner_id,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");
  const [view, setView] = useState("lista");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [listings, setListings] = useState(mockCars);
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");

    getListings()
  .then((data) => {
    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (items.length > 0) {
      const normalized = items.map(normalizeListing);
      const apiIds = new Set(normalized.map(c => c.id));
      const extra = myCars.filter(c => !apiIds.has(c.id));
      setListings([...normalized, ...extra]);
    } else {
      setListings(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        return [...prev, ...myCars.filter(c => !existingIds.has(c.id))];
      });
    }
  })
      .catch(() => {
        setListings(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          return [...prev, ...myCars.filter(c => !existingIds.has(c.id))];
        });
      });
  }, []);

  const filtered = listings.filter(c => {
    const matchSearch = !search ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.locationText?.toLowerCase().includes(search.toLowerCase()) ||
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
    if (view === "lista" && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    }
  }, [view]);

  useEffect(() => {
    if (view !== "mapa") return;
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;
      const map = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: isMobile ? 11 : 12 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      mapInstanceRef.current = map;
      addMarkers(map, L);
    };
    if (window.L) setTimeout(init, 150);
    else {
      const iv = setInterval(() => { if (window.L) { clearInterval(iv); setTimeout(init, 150); } }, 100);
    }
  }, [view, mapLoaded]);

  const addMarkers = useCallback((map, L) => {
    if (!map || !L) return;
    Object.values(markersRef.current).forEach(m => {
      try {
        map.removeLayer(m.marker || m);
        if (m.circle) map.removeLayer(m.circle);
      } catch {}
    });
    markersRef.current = {};

    filtered.forEach(car => {
      if (!car.lat || !car.lng) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:#2563eb;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;"></div>`,
        iconAnchor: [7, 7],
      });
      const circle = L.circle([car.lat, car.lng], {
        radius: 600,
        color: "#2563eb",
        fillColor: "#bfdbfe",
        fillOpacity: 0.18,
        weight: 1.5,
        interactive: false,
      }).addTo(map);
      const marker = L.marker([car.lat, car.lng], { icon });
      marker.bindPopup(L.popup({ closeButton: false, maxWidth: 220 }).setContent(`
        <div style="cursor:pointer;font-family:sans-serif" onclick="window.__fwOpen('${car.id}')">
          <div style="width:100%;height:120px;border-radius:10px;overflow:hidden;margin-bottom:10px;background:#e5e7eb;">
            ${car.photos?.length > 0
              ? `<img src="${car.photos[0]}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;color:#9ca3af">—</div>`}
          </div>
          <div style="font-weight:600;font-size:14px;margin-bottom:2px;color:#111827">${car.brand} ${car.model} ${car.year}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${car.location || car.locationText} <span style="color:#9ca3af;font-size:10px">(zona aprox.)</span></div>
          <div style="font-weight:700;font-size:15px;color:#2563eb">
            $${Number(car.price_per_day || car.pricePerDay).toLocaleString()}
            <span style="font-weight:400;font-size:12px;color:#6b7280">/día</span>
          </div>
          <div style="margin-top:8px;padding:7px;background:#2563eb;color:#fff;border-radius:8px;text-align:center;font-size:12px;font-weight:600;">Ver auto</div>
        </div>
      `));
      marker.addTo(map);
      markersRef.current[car.id] = { marker, circle };
    });
    window.__fwOpen = (id) => navigate(`/cars/${id}`);
  }, [filtered, navigate]);

  useEffect(() => {
    if (view !== "mapa" || !mapInstanceRef.current || !window.L) return;
    addMarkers(mapInstanceRef.current, window.L);
  }, [filtered, addMarkers, view]);

  const price = (car) => car.price_per_day || car.pricePerDay || 0;

  const CarCard = ({ car }) => (
    <div onClick={() => navigate(`/cars/${car.id}`)} style={{ cursor: "pointer", marginBottom: 28 }}>
      <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden",
        background: "#f3f4f6", marginBottom: 10, position: "relative" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }}
              onMouseEnter={e => !isMobile && (e.target.style.transform = "scale(1.03)")}
              onMouseLeave={e => !isMobile && (e.target.style.transform = "scale(1)")} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>Sin foto</div>}
        {car.is_verified && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(37,99,235,.9)",
            color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            Verificado
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 2 }}>
            {car.location || car.locationText}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {car.transmission} · {car.fuel || car.fuelType}
          </div>
        </div>
        {car.rating > 0 && (
          <div style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>★ {car.rating}</div>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#111827" }}>
        <strong style={{ color: "#2563eb" }}>${Number(price(car)).toLocaleString()}</strong>
        <span style={{ color: "#6b7280" }}> /día</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div style={{ background: "linear-gradient(160deg, #0d0f14 0%, #111827 55%, #0f1a2e 100%)",
        padding: isMobile ? "40px 20px" : "64px 32px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: isMobile ? 28 : 42, fontWeight: 800,
          marginBottom: 12, letterSpacing: "-1px", lineHeight: 1.2 }}>
          Alquilá el auto perfecto
        </div>
        <div style={{ fontSize: isMobile ? 15 : 18, opacity: .85,
          marginBottom: isMobile ? 24 : 40, fontWeight: 400 }}>
          Entre particulares, con confianza y sin complicaciones
        </div>
        <div style={{ background: "#fff", borderRadius: 16,
          padding: isMobile ? "8px 8px 8px 16px" : "8px 8px 8px 20px",
          maxWidth: 620, margin: "0 auto", display: "flex", gap: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
          <input
            style={{ flex: 1, border: "none", outline: "none",
              fontSize: isMobile ? 14 : 15, color: "#111827", background: "transparent" }}
            placeholder="Ciudad, zona o modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button style={{ padding: isMobile ? "10px 16px" : "12px 24px",
            background: "#2563eb", color: "#fff", border: "none", borderRadius: 10,
            fontSize: isMobile ? 14 : 15, fontWeight: 700, cursor: "pointer" }}>
            Buscar
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto",
        padding: isMobile ? "14px 16px 10px" : "20px 24px 10px",
        borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                padding: isMobile ? "5px 12px" : "8px 18px",
                borderRadius: 20, fontSize: isMobile ? 11 : 13, cursor: "pointer",
                fontWeight: 500, transition: "all .15s",
                border: cat === c.id ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                background: cat === c.id ? "#2563eb" : "#fff",
                color: cat === c.id ? "#fff" : "#374151",
              }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["lista", "Lista"], ["mapa", "Mapa"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} style={{
                padding: isMobile ? "5px 12px" : "8px 18px",
                borderRadius: 20, fontSize: isMobile ? 11 : 13, cursor: "pointer",
                fontWeight: 500,
                border: view === k ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                background: view === k ? "#2563eb" : "#fff",
                color: view === k ? "#fff" : "#374151",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: view === "lista" ? "block" : "none",
        maxWidth: 1280, margin: "0 auto",
        padding: isMobile ? "20px 16px" : "32px 24px" }}>
        {loadingListings ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Cargando...</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
            </div>
            <div style={{ display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(240px,1fr))",
              gap: isMobile ? "0 12px" : "0 28px" }}>
              {filtered.map(car => <CarCard key={car.id} car={car} />)}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center",
                  padding: isMobile ? 40 : 80, color: "#9ca3af" }}>
                  No se encontraron autos.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ display: view === "mapa" ? "block" : "none" }}>
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
            <div style={{ fontSize: 13, color: "#6b7280", padding: "10px 16px" }}>
              {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
            </div>
            <div ref={mapRef} style={{ flex: 1, zIndex: 0 }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 45%",
            maxWidth: 1280, margin: "0 auto", padding: "24px", gap: 24 }}>
            <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)", paddingRight: 8 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                {filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0 20px" }}>
                {filtered.map(car => <CarCard key={car.id} car={car} />)}
              </div>
            </div>
            <div style={{ position: "sticky", top: 80 }}>
              <div ref={mapRef} style={{ height: "calc(100vh - 140px)", borderRadius: 14,
                overflow: "hidden", zIndex: 0, border: "1px solid #e5e7eb" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6",
        padding: isMobile ? "24px 16px" : "32px 24px",
        textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 40,
        display: view === "mapa" ? "none" : "block" }}>
        © 2025 Freewheel · Alquiler de autos entre particulares en Argentina
      </div>
    </div>
  );
}