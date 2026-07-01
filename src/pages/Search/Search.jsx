import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getListings } from "../../services/api";
import { mockCars } from "../../data/mockData";

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
    location: l.locationText || l.location || "",
    locationText: l.locationText || l.location || "",
    lat: l.latitude ?? l.lat,
    lng: l.longitude ?? l.lng,
    transmission: TRANSMISSION_LABELS[v.transmission] || v.transmission || l.transmission || "",
    fuel: FUEL_LABELS[v.fuelType] || v.fuelType || l.fuel || "",
    photos: l.photos || v.photos || [],
    available: (l.status === "ACTIVE" || l.available !== false) && l.status !== "DELETED",
    is_verified: l.is_verified || false,
    rating: l.rating || 0,
    reviews: l.reviews_count || l.reviewsCount || 0,
    category: l.category || v.category || "",
  };
}

// ── Menú desplegable reutilizable ──
function Dropdown({ label, value, options, onChange, active }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 22, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
          border: (active || open) ? "1.5px solid #2563eb" : "1px solid #e5e7eb", background: active ? "#eff6ff" : "#fff", color: active ? "#2563eb" : "#374151" }}>
        {label}{value ? `: ${value}` : ""} <span style={{ fontSize: 10, opacity: .7, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: 44, left: 0, background: "#fff", borderRadius: 14, minWidth: 180, boxShadow: "0 12px 40px rgba(0,0,0,.14)", border: "1px solid #f0f0f0", zIndex: 400, overflow: "hidden", padding: "6px" }}>
          {options.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }}
              style={{ padding: "9px 12px", borderRadius: 9, fontSize: 13, cursor: "pointer", fontWeight: o === value ? 700 : 500, color: o === value ? "#2563eb" : "#374151", background: o === value ? "#eff6ff" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { if (o !== value) e.currentTarget.style.background = "transparent"; }}>
              {o}{o === value && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();

  // Barra editable
  const [where, setWhere] = useState("Buenos Aires");
  const [dates, setDates] = useState("18 — 22 dic");
  const [drivers, setDrivers] = useState("1 adulto");
  const [editBar, setEditBar] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Precio ↓");
  const [trans, setTrans] = useState("Todas");
  const [fuel, setFuel] = useState("Todos");

  const [showMap, setShowMap] = useState(true);
  const [listings, setListings] = useState(mockCars.map(c => ({ ...c })));
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    getListings()
      .then(data => {
        const items = Array.isArray(data) ? data : (data?.data ?? []);
        if (items.length > 0) {
          const norm = items.map(normalizeListing);
          const ids = new Set(norm.map(c => c.id));
          setListings([...norm, ...myCars.filter(c => !ids.has(c.id))]);
        } else {
          setListings(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...myCars.filter(c => !ids.has(c.id))]; });
        }
      })
      .catch(() => setListings(prev => { const ids = new Set(prev.map(c => c.id)); return [...prev, ...myCars.filter(c => !ids.has(c.id))]; }));
  }, []);

  const price = (c) => c.price_per_day || c.pricePerDay || 0;
  const s = search.toLowerCase().trim();

  const filtered = listings
    .filter(c => c.available !== false)
    .filter(c => !s ||
      (c.location || "").toLowerCase().includes(s) ||
      `${c.brand} ${c.model}`.toLowerCase().includes(s))
    .filter(c => trans === "Todas" || c.transmission === trans)
    .filter(c => fuel === "Todos" || c.fuel === fuel)
    .sort((a, b) => {
      if (sort === "Precio ↓") return price(b) - price(a);
      if (sort === "Precio ↑") return price(a) - price(b);
      if (sort === "Mejor rating") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const selectedCar = filtered.find(c => c.id === selected) || null;

  // ── Leaflet ──
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    const sc = document.createElement("script"); sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; sc.onload = () => setMapLoaded(true); document.head.appendChild(sc);
  }, []);

  const addMarkers = useCallback((map, L) => {
    Object.values(markersRef.current).forEach(m => { try { map.removeLayer(m); } catch {} });
    markersRef.current = {};
    filtered.forEach(car => {
      if (!car.lat || !car.lng) return;
      const on = hovered === car.id || selected === car.id;
      const pill = `background:${on ? "#111827" : "#fff"};color:${on ? "#fff" : "#111827"};font-weight:800;font-size:13px;line-height:1;padding:8px 13px;border-radius:24px;`
        + `box-shadow:${on ? "0 8px 22px rgba(17,24,39,.35)" : "0 2px 10px rgba(0,0,0,.16)"};`
        + `border:1.5px solid ${on ? "#111827" : "rgba(0,0,0,.06)"};white-space:nowrap;display:inline-block;`
        + `transform:scale(${on ? 1.06 : 1});transition:all .18s cubic-bezier(.22,1,.36,1);cursor:pointer`;
      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:translate(-50%,-100%)"><div style="${pill}">$${Number(price(car)).toLocaleString()}</div></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([car.lat, car.lng], { icon, zIndexOffset: on ? 1000 : 0, riseOnHover: true });
      marker.on("click", () => setSelected(car.id));
      marker.addTo(map);
      markersRef.current[car.id] = marker;
    });
  }, [filtered, hovered, selected]);

  useEffect(() => {
    if (!showMap || isMobile) return;
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L; if (!L) return;
      const map = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: 12, zoomControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© OSM" }).addTo(map);
      map.on("click", () => setSelected(null));
      mapInstanceRef.current = map;
      addMarkers(map, L);
    };
    if (window.L) setTimeout(init, 120);
    else { const iv = setInterval(() => { if (window.L) { clearInterval(iv); setTimeout(init, 120); } }, 100); }
  }, [showMap, mapLoaded, isMobile]);

  useEffect(() => {
    if (mapInstanceRef.current && window.L) addMarkers(mapInstanceRef.current, window.L);
  }, [filtered, hovered, selected, addMarkers]);

  useEffect(() => {
    if ((!showMap || isMobile) && mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markersRef.current = {}; }
  }, [showMap, isMobile]);

  const st = {
    barCell: { paddingRight: 22, borderRight: "1px solid #f0f0f0" },
    barLbl: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 3 },
    barVal: { fontSize: 14, fontWeight: 700, color: "#111827" },
    barInput: { fontSize: 14, fontWeight: 700, color: "#111827", border: "none", borderBottom: "1.5px solid #2563eb", outline: "none", background: "transparent", padding: "1px 0", width: 130 },
    card: { display: "flex", gap: 16, background: "#fff", border: "1px solid #ececec", borderRadius: 16, padding: 14, cursor: "pointer", transition: "box-shadow .2s, transform .2s, border-color .2s" },
    ph: { width: 150, height: 118, borderRadius: 12, background: "#ece9e3", flexShrink: 0, overflow: "hidden", position: "relative" },
    tag: { fontSize: 11, color: "#6b7280", border: "1px solid #ececec", borderRadius: 20, padding: "3px 10px" },
    verif: { fontSize: 11, fontWeight: 600, color: "#166534", background: "#dcfce7", borderRadius: 20, padding: "3px 10px" },
    detail: { background: "#111827", color: "#fff", border: "none", borderRadius: 22, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  };

  const Card = ({ car }) => {
    const on = selected === car.id;
    return (
      <div style={{ ...st.card, borderColor: on ? "#2563eb" : "#ececec", boxShadow: on ? "0 8px 26px rgba(37,99,235,.14)" : "none" }}
        onClick={() => navigate(`/cars/${car.id}`)}
        onMouseEnter={e => { setHovered(car.id); e.currentTarget.style.transform = "translateY(-2px)"; if (!on) e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)"; }}
        onMouseLeave={e => { setHovered(null); e.currentTarget.style.transform = "none"; if (!on) e.currentTarget.style.boxShadow = "none"; }}>
        <div style={st.ph}>
          {car.photos?.length > 0 && <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.12)", fontSize: 14, color: "#9ca3af" }}>♡</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-.3px" }}>{car.brand} {car.model} {car.year}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{car.location}{car.rating > 0 ? ` · ${car.rating} ★${car.reviews ? ` (${car.reviews})` : ""}` : ""}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {car.is_verified && <span style={st.verif}>Verificado</span>}
            {car.transmission && <span style={st.tag}>{car.transmission.slice(0, 6)}</span>}
            {car.fuel && <span style={st.tag}>{car.fuel}</span>}
          </div>
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 12 }}>
            <div><span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>${Number(price(car)).toLocaleString()}</span><span style={{ fontSize: 13, color: "#9ca3af" }}>/día</span></div>
            <button style={st.detail} onClick={e => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>Ver detalle →</button>
          </div>
        </div>
      </div>
    );
  };

  const anyFilter = trans !== "Todas" || fuel !== "Todos" || search;

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth: 1360, margin: "0 auto" }}>
      {/* Barra editable */}
      <div style={{ display: "flex", alignItems: "center", gap: 22, background: "#fff", border: "1px solid #ececec", borderRadius: 16, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={st.barCell}>
          <div style={st.barLbl}>Dónde</div>
          {editBar ? <input style={st.barInput} value={where} onChange={e => setWhere(e.target.value)} /> : <div style={st.barVal}>{where}</div>}
        </div>
        <div style={st.barCell}>
          <div style={st.barLbl}>Fechas</div>
          {editBar ? <input style={st.barInput} value={dates} onChange={e => setDates(e.target.value)} /> : <div style={st.barVal}>{dates}</div>}
        </div>
        <div style={{ ...st.barCell, borderRight: "none" }}>
          <div style={st.barLbl}>Conductores</div>
          {editBar
            ? <select style={{ ...st.barInput, width: 110 }} value={drivers} onChange={e => setDrivers(e.target.value)}>
                {["1 adulto", "2 adultos", "3 adultos", "4+ adultos"].map(o => <option key={o}>{o}</option>)}
              </select>
            : <div style={st.barVal}>{drivers}</div>}
        </div>
        <button onClick={() => setEditBar(v => !v)}
          style={{ background: editBar ? "#111827" : "#2563eb", color: "#fff", border: "none", borderRadius: 24, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {editBar ? "✓ Aplicar" : "⟳ Actualizar búsqueda"}
        </button>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{filtered.length} resultados</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>en {where || "Argentina"}</div>
        </div>
      </div>

      {/* Filtros con menús desplegables */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Buscar ciudad o modelo..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: "9px 16px", borderRadius: 22, border: "1px solid #e5e7eb", fontSize: 13, outline: "none", minWidth: 210 }} />
        <Dropdown label="Ordenar" value={sort} active options={["Precio ↓", "Precio ↑", "Mejor rating"]} onChange={setSort} />
        <Dropdown label="Transmisión" value={trans !== "Todas" ? trans : ""} active={trans !== "Todas"} options={["Todas", "Manual", "Automático"]} onChange={setTrans} />
        <Dropdown label="Combustible" value={fuel !== "Todos" ? fuel : ""} active={fuel !== "Todos"} options={["Todos", "Nafta", "Diesel", "Eléctrico", "GNC"]} onChange={setFuel} />
        {anyFilter && <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, cursor: "pointer" }} onClick={() => { setTrans("Todas"); setFuel("Todos"); setSearch(""); }}>Limpiar filtros</div>}
      </div>

      {/* Lista + Mapa */}
      <div style={{ display: (showMap && !isMobile) ? "grid" : "block", gridTemplateColumns: "1fr 42%", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, ...(showMap && !isMobile ? { maxHeight: "calc(100vh - 240px)", overflowY: "auto", paddingRight: 4 } : {}) }}>
          {filtered.length === 0
            ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>No se encontraron autos con esos filtros.</div>
            : filtered.map(car => <Card key={car.id} car={car} />)}
        </div>

        {showMap && !isMobile && (
          <div style={{ position: "sticky", top: 90, height: "calc(100vh - 240px)", borderRadius: 18, overflow: "hidden", border: "1px solid #ececec", background: "#eef0ee" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%", zIndex: 0 }} />

            {/* Tarjeta flotante del auto seleccionado */}
            {selectedCar && (
              <div style={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 500, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ pointerEvents: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 16px 44px rgba(0,0,0,.22)", border: "1px solid #ececec", display: "flex", gap: 12, padding: 12, width: 360, maxWidth: "100%", cursor: "pointer" }}
                  onClick={() => navigate(`/cars/${selectedCar.id}`)}>
                  <div style={{ width: 92, height: 74, borderRadius: 10, background: "#ece9e3", overflow: "hidden", flexShrink: 0 }}>
                    {selectedCar.photos?.length > 0 && <img src={selectedCar.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{selectedCar.brand} {selectedCar.model}</div>
                      <div onClick={e => { e.stopPropagation(); setSelected(null); }} style={{ color: "#9ca3af", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>×</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 8px" }}>{selectedCar.location}{selectedCar.rating > 0 ? ` · ${selectedCar.rating} ★` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${Number(price(selectedCar)).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>/día</span></div>
                      <button style={{ ...st.detail, padding: "7px 14px", fontSize: 12 }} onClick={e => { e.stopPropagation(); navigate(`/cars/${selectedCar.id}`); }}>Ver detalle →</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom */}
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 500, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,.15)" }}>
              <button onClick={() => mapInstanceRef.current?.zoomIn()} style={{ width: 40, height: 40, border: "none", borderBottom: "1px solid #f0f0f0", background: "#fff", fontSize: 18, cursor: "pointer", color: "#374151" }}>+</button>
              <button onClick={() => mapInstanceRef.current?.zoomOut()} style={{ width: 40, height: 40, border: "none", background: "#fff", fontSize: 18, cursor: "pointer", color: "#374151" }}>−</button>
            </div>

            <button onClick={() => setShowMap(false)}
              style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "#111827", color: "#fff", border: "none", borderRadius: 24, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
              ☰ Ver como lista
            </button>
          </div>
        )}
      </div>

      {!showMap && !isMobile && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => setShowMap(true)}
            style={{ background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 24, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🗺 Ver en el mapa
          </button>
        </div>
      )}
    </div>
  );
}
