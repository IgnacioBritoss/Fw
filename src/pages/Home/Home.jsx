import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth } from "../../context/AuthContext";
import { getListings } from "../../services/api";
import { mockCars } from "../../data/mockData";

const CATEGORIES = [
  { id: "Todos", label: "Todos" },
  { id: "Sedan", label: "Sedan" },
  { id: "SUV", label: "SUV" },
  { id: "Pickup", label: "Pickup" },
  { id: "Eléctrico", label: "Eléctrico" },
];

const CATEGORY_CARDS = [
  { id: "Sedan", label: "Sedan" },
  { id: "SUV", label: "SUV" },
  { id: "Berlina", label: "Berlinas" },
  { id: "Pickup", label: "Pickup" },
  { id: "Eléctrico", label: "Eléctricos" },
  { id: "Premium", label: "Premium" },
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
    doors: v.doors || l.doors,
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
  const { user } = useAuth();
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

  const minPriceFor = (catId) => {
    const inCat = listings.filter(c => c.category === catId && c.available !== false);
    if (!inCat.length) return null;
    return Math.min(...inCat.map(c => Number(price(c)) || Infinity));
  };

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Invitado";

  // ─────────────────────────────────────────── Estilos
  const t = {
    content: { padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1320, margin: "0 auto" },
    hero: { borderRadius: 20, padding: isMobile ? 24 : 32, background: "linear-gradient(120deg,#0a1f44 0%,#1d4ed8 60%,#2563eb 100%)", color: "#fff", position: "relative", overflow: "hidden", marginBottom: 32 },
    searchRow: { display: "flex", alignItems: "center", background: "#fff", borderRadius: 16, padding: "8px 8px 8px 4px", marginTop: 28, flexWrap: "wrap" },
    searchCell: { flex: 1, minWidth: 130, padding: "8px 20px", borderRight: "1px solid #eee" },
    searchLabel: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 },
    searchInput: { border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent", width: "100%" },
    sectionTitle: { fontSize: 19, fontWeight: 800, color: "#111827", letterSpacing: "-.3px" },
    carCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" },
    tag: { fontSize: 11, color: "#6b7280", border: "1px solid #ececec", borderRadius: 20, padding: "3px 10px" },
    reservar: { background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    stepCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 14, padding: 20 },
  };

  // ─────────────────────────────────────────── Subcomponentes
  const CarCard = ({ car }) => (
    <div style={t.carCard} onClick={() => navigate(`/cars/${car.id}`)}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", background: "#e5e7eb" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>}
        {car.is_verified && (
          <div style={{ position: "absolute", top: 12, left: 12, background: "#111827", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✓ Verificado</div>
        )}
        <div style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.12)", fontSize: 14 }}>♡</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{car.brand} {car.model} {car.year}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          {(car.location || car.locationText) && `${car.location || car.locationText} · `}
          {car.rating > 0 && `${car.rating} ★ · `}{car.transmission}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {car.fuel && <span style={t.tag}>{car.fuel}</span>}
          {car.doors && <span style={t.tag}>{car.doors} puertas</span>}
        </div>
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${Number(price(car)).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>/día</span></div>
          <button style={t.reservar} onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>Reservar</button>
        </div>
      </div>
    </div>
  );

  const CategoriesSection = () => (
    <>
      <div style={{ ...t.sectionTitle, marginBottom: 16 }}>Explorá por categoría</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 14, marginBottom: 32 }}>
        {CATEGORY_CARDS.map((c, i) => {
          const min = minPriceFor(c.id);
          const active = cat === c.id;
          return (
            <div key={i}
              onClick={() => setCat(active ? "Todos" : c.id)}
              style={{
                background: "#fff",
                border: active ? "1.5px solid #2563eb" : "1px solid #ececec",
                borderRadius: 14, padding: "20px 18px", cursor: "pointer",
                transition: "transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1), border-color .35s ease",
                boxShadow: active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)",
                willChange: "transform",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)"; if (!active) e.currentTarget.style.borderColor = "#c7d2fe"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)"; if (!active) e.currentTarget.style.borderColor = "#ececec"; }}
            >
              <div style={{ width: 28, height: 3, borderRadius: 2, background: active ? "#2563eb" : "#e5e7eb", marginBottom: 16, transition: "background .35s ease" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-.2px" }}>{c.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#2563eb" : "#9ca3af", marginTop: 4 }}>
                {min ? `Desde $${Number(min).toLocaleString()}` : "Ver autos →"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const StepsSection = () => (
    <>
      <div style={{ ...t.sectionTitle, marginBottom: 4 }}>¿Primera vez?</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>Alquilar con Freewheel es así de simple</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
        {[
          ["01", "Buscá", "Elegí ubicación y fechas, aplicá filtros."],
          ["02", "Reservá", "Pagá online con Mercado Pago."],
          ["03", "Retirá", "Coordiná con el dueño y firmá digital."],
          ["04", "Disfrutá", "Manejá tranquilo: seguro incluido."],
        ].map(([n, ti, d]) => (
          <div key={n} style={t.stepCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#2563eb", marginBottom: 8 }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{ti}</div>
            <div style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>
    </>
  );

  const CarsHeader = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <div style={t.sectionTitle}>Autos destacados en tu zona</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{filtered.length} auto{filtered.length !== 1 ? "s" : ""} disponibles</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["lista", "Lista"], ["mapa", "Mapa"]].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            padding: "7px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600,
            border: view === k ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
            background: view === k ? "#2563eb" : "#fff", color: view === k ? "#fff" : "#374151",
          }}>{l}</button>
        ))}
      </div>
    </div>
  );

  const CarsGrid = () => (
    loadingListings ? (
      <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Cargando...</div>
    ) : view === "lista" ? (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(250px,1fr))", gap: 16 }}>
        {filtered.map(car => <CarCard key={car.id} car={car} />)}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#9ca3af" }}>No se encontraron autos.</div>
        )}
      </div>
    ) : (
      <div ref={mapRef} style={{ height: isMobile ? "60vh" : "calc(100vh - 240px)", borderRadius: 16, overflow: "hidden", zIndex: 0, border: "1px solid #e5e7eb" }} />
    )
  );

  // ─────────────────────────────────────────── Contenido (el Layout provee el sidebar y la topbar)
  return (
    <div style={t.content}>
      {/* Hero */}
      <div style={t.hero}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.12),transparent 60%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.14)", padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>● BUEN DÍA, {firstName.toUpperCase()}</div>
          <div style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>¿A dónde vas hoy?</div>
          <div style={{ fontSize: 14, opacity: .8, marginTop: 14 }}>+12.000 autos verificados en toda Argentina</div>

          <div style={t.searchRow}>
            <div style={t.searchCell}>
              <div style={t.searchLabel}>Dónde</div>
              <input style={t.searchInput} placeholder="Buenos Aires" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={t.searchCell}>
              <div style={t.searchLabel}>Retiro</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>18 dic · 10:00</div>
            </div>
            <div style={t.searchCell}>
              <div style={t.searchLabel}>Devolución</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>22 dic · 10:00</div>
            </div>
            <div style={{ ...t.searchCell, borderRight: "none" }}>
              <div style={t.searchLabel}>Tipo</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Todos los autos</div>
            </div>
            <button style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", margin: 4 }} onClick={() => setView("lista")}>Buscar autos →</button>
          </div>
        </div>
      </div>

      <CategoriesSection />
      <CarsHeader />
      <CarsGrid />
      <div style={{ height: 28 }} />
      <StepsSection />
    </div>
  );
}