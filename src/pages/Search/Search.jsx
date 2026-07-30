// ============================================================================
//  Search — Pantalla de BÚSQUEDA de autos (lista + mapa lado a lado)
// ----------------------------------------------------------------------------
//  Muestra los autos como tarjetas a la izquierda y un mapa a la derecha (en
//  escritorio). Los dos están sincronizados: pasar el mouse o hacer clic en una
//  tarjeta resalta su pin, y clickear un pin muestra una tarjeta flotante.
//
//  Qué se arregló acá:
//   · "Fechas" era un texto libre ("18 — 22 dic") que no filtraba nada. Ahora son
//     dos selectores de fecha y el backend descarta los autos ocupados.
//   · "Dónde" no se usaba para filtrar: se mostraba y nada más. Ahora se manda al
//     backend como filtro de ubicación.
//   · Los filtros de caja y combustible comparaban textos en castellano contra
//     los códigos del backend, así que no coincidía nada. Ahora se traducen.
//   · Se agregaron precio y categoría, y la búsqueda arranca con lo que venga en
//     la URL (así el botón "Buscar autos" del inicio conserva los filtros).
//   · Los autos de ejemplo solo aparecen si no hay publicaciones reales.
//   · El corazón de favoritos ahora se puede tocar.
// ============================================================================
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useListings } from "../../hooks/useListings";
import {
  CATEGORIES, FUEL_CODES, TRANSMISSION_CODES,
  filterCars, priceOf, sortCars,
} from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";
import Select from "../../components/Select";
import { firstBookableInput } from "../../services/dates";

const SORT_OPTIONS = [
  { id: "newest", label: "Más nuevos" },
  { id: "priceAsc", label: "Precio ↑" },
  { id: "priceDesc", label: "Precio ↓" },
];
const TRANSMISSION_OPTIONS = ["Todas", "Manual", "Automático"];
const FUEL_OPTIONS = ["Todos", "Nafta", "Diesel", "Híbrido", "Eléctrico", "GNC"];

// El mínimo de los selectores de fecha es MAÑANA: no hay alquileres para el
// mismo día (ver services/dates.js).

// ── Menú desplegable reutilizable ──
// Componente genérico de filtro: un botón que abre una lista de opciones y avisa
// la elegida con onChange(). Se cierra solo al hacer clic afuera.
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
  const [urlParams, setUrlParams] = useSearchParams();

  // Estado inicial tomado de la URL: así los filtros elegidos en el inicio
  // llegan intactos y el link de una búsqueda se puede compartir.
  const [where, setWhere] = useState(urlParams.get("where") || "");
  const [search, setSearch] = useState(urlParams.get("q") || "");
  const [category, setCategory] = useState(urlParams.get("category") || "");
  const [pickup, setPickup] = useState(urlParams.get("from") || "");
  const [dropoff, setDropoff] = useState(urlParams.get("to") || "");
  const [sort, setSort] = useState("newest");
  const [trans, setTrans] = useState("Todas");
  const [fuel, setFuel] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState("");

  const [showMap, setShowMap] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // Retiro = devolución es una búsqueda válida: "¿está libre ese día?". Antes se
  // exigía devolución posterior, así que con fechas iguales no se mandaba ninguna
  // y el listado no filtraba por disponibilidad.
  const datesValid = !!(pickup && dropoff && new Date(dropoff) >= new Date(pickup));

  // Filtros que resuelve el BACKEND (los que necesitan mirar la base: ubicación,
  // precio, categoría, caja, combustible y disponibilidad por fechas).
  const serverFilters = useMemo(() => {
    const filters = { limit: 50, sort };
    if (where.trim()) filters.locationText = where.trim();
    if (category) filters.category = category;
    if (trans !== "Todas") filters.transmission = TRANSMISSION_CODES[trans];
    if (fuel !== "Todos") filters.fuelType = FUEL_CODES[fuel];
    if (maxPrice) filters.maxPrice = Number(maxPrice);
    if (datesValid) {
      filters.startDate = new Date(`${pickup}T10:00:00`).toISOString();
      filters.endDate = new Date(`${dropoff}T10:00:00`).toISOString();
    }
    return filters;
  }, [where, category, trans, fuel, maxPrice, sort, pickup, dropoff, datesValid]);

  const { cars, loading, error, showingMocks, total } = useListings(serverFilters);

  // La búsqueda por texto se aplica arriba de lo que trajo el backend.
  const filtered = useMemo(
    () => sortCars(filterCars(cars, { text: search }), sort),
    [cars, search, sort],
  );

  // Mantiene la URL en sintonía con los filtros, para poder compartir el link.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (where) next.set("where", where);
    if (category) next.set("category", category);
    if (pickup) next.set("from", pickup);
    if (dropoff) next.set("to", dropoff);
    setUrlParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, where, category, pickup, dropoff]);

  // Auto actualmente seleccionado en el mapa (para la tarjeta flotante).
  const selectedCar = filtered.find(c => c.id === selected) || null;

  // ── Leaflet ──
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    const sc = document.createElement("script"); sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; sc.onload = () => setMapLoaded(true); document.head.appendChild(sc);
  }, []);

  // Redibuja los pines del mapa (uno por auto) con su precio. El pin resaltado
  // (hover o seleccionado) se agranda y se pone oscuro.
  const addMarkers = useCallback((map, L) => {
    Object.values(markersRef.current).forEach(m => { try { map.removeLayer(m); } catch { /* ya no estaba */ } });
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
        html: `<div style="transform:translate(-50%,-100%)"><div style="${pill}">$${priceOf(car).toLocaleString()}</div></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([car.lat, car.lng], { icon, zIndexOffset: on ? 1000 : 0, riseOnHover: true });
      marker.on("click", () => setSelected(car.id));
      marker.addTo(map);
      markersRef.current[car.id] = marker;
    });
  }, [filtered, hovered, selected]);

  // Crea el mapa cuando corresponde mostrarlo (escritorio + vista mapa activa).
  useEffect(() => {
    if (!showMap || isMobile) return;
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L; if (!L) return;
      // scrollWheelZoom: false — ver la nota en components/MapView.jsx.
      const map = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: 12, zoomControl: false, scrollWheelZoom: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© OSM" }).addTo(map);
      map.on("click", () => setSelected(null));
      mapInstanceRef.current = map;
      addMarkers(map, L);
    };
    if (window.L) { const t = setTimeout(init, 120); return () => clearTimeout(t); }
    const iv = setInterval(() => { if (window.L) { clearInterval(iv); setTimeout(init, 120); } }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, mapLoaded, isMobile]);

  // Redibuja los pines cada vez que cambian los resultados o el resaltado.
  useEffect(() => {
    if (mapInstanceRef.current && window.L) addMarkers(mapInstanceRef.current, window.L);
  }, [filtered, hovered, selected, addMarkers]);

  // Destruye el mapa si se oculta o se pasa a celular (libera memoria).
  useEffect(() => {
    if ((!showMap || isMobile) && mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markersRef.current = {}; }
  }, [showMap, isMobile]);

  const st = {
    barCell: isMobile
      ? { width: "100%", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #f0f0f0", boxSizing: "border-box" }
      : { paddingRight: 22, borderRight: "1px solid #f0f0f0", minWidth: 130 },
    barLbl: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 3 },
    barInput: { fontSize: 14, fontWeight: 700, color: "#111827", border: "none", borderBottom: "1.5px solid #e5e7eb", outline: "none", background: "transparent", padding: "1px 0", width: isMobile ? "100%" : 140, boxSizing: "border-box" },
    card: { display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 16, background: "#fff", border: "1px solid #ececec", borderRadius: 16, padding: isMobile ? 12 : 14, cursor: "pointer", transition: "box-shadow .2s, transform .2s, border-color .2s" },
    ph: { width: isMobile ? "100%" : 150, height: isMobile ? 170 : 118, borderRadius: 12, background: "#ece9e3", flexShrink: 0, overflow: "hidden", position: "relative" },
    tag: { fontSize: 11, color: "#6b7280", border: "1px solid #ececec", borderRadius: 20, padding: "3px 10px" },
    verif: { fontSize: 11, fontWeight: 600, color: "#166534", background: "#dcfce7", borderRadius: 20, padding: "3px 10px" },
    detail: { background: "#111827", color: "#fff", border: "none", borderRadius: 22, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
    banner: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 16 },
  };

  // Tarjeta de un auto en la lista.
  const Card = ({ car }) => {
    const on = selected === car.id;
    return (
      <div style={{ ...st.card, borderColor: on ? "#2563eb" : "#ececec", boxShadow: on ? "0 8px 26px rgba(37,99,235,.14)" : "none" }}
        onClick={() => navigate(`/cars/${car.id}`)}
        onMouseEnter={e => { setHovered(car.id); e.currentTarget.style.transform = "translateY(-2px)"; if (!on) e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)"; }}
        onMouseLeave={e => { setHovered(null); e.currentTarget.style.transform = "none"; if (!on) e.currentTarget.style.boxShadow = "none"; }}>
        <div style={st.ph}>
          {car.photos?.length > 0
            ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12 }}>Sin foto</div>}
          <FavoriteButton listingId={car.id} size={28} disabled={car.isMock} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-.3px" }}>{car.brand} {car.model} {car.year}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{car.location}{car.rating > 0 ? ` · ${car.rating} ★${car.reviews ? ` (${car.reviews})` : ""}` : ""}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {car.categoryLabel && <span style={st.verif}>{car.categoryLabel}</span>}
            {car.transmission && <span style={st.tag}>{car.transmission}</span>}
            {car.fuel && <span style={st.tag}>{car.fuel}</span>}
            {car.seats && <span style={st.tag}>{car.seats} asientos</span>}
          </div>
          <div style={{
            marginTop: "auto", paddingTop: 12, display: "flex", gap: 10,
            ...(isMobile
              ? { flexDirection: "column", alignItems: "stretch" }
              : { justifyContent: "space-between", alignItems: "flex-end" }),
          }}>
            <div><span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>${priceOf(car).toLocaleString()}</span><span style={{ fontSize: 13, color: "#9ca3af" }}>/día</span></div>
            <button style={{ ...st.detail, ...(isMobile ? { width: "100%" } : {}) }}
              onClick={e => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>Ver detalle →</button>
          </div>
        </div>
      </div>
    );
  };

  const anyFilter = trans !== "Todas" || fuel !== "Todos" || search || where || category || maxPrice || pickup || dropoff;
  const clearAll = () => {
    setTrans("Todas"); setFuel("Todos"); setSearch(""); setWhere("");
    setCategory(""); setMaxPrice(""); setPickup(""); setDropoff("");
  };

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth: 1360, margin: "0 auto" }}>
      {/* Barra de búsqueda: ubicación + fechas reales */}
      <div style={{ display: "flex", alignItems: "center", gap: 22, background: "#fff", border: "1px solid #ececec", borderRadius: 16, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 16, flexWrap: "wrap" }}>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>Dónde</div>
          <input style={st.barInput} placeholder="Toda Argentina" value={where} onChange={e => setWhere(e.target.value)} />
        </div>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>Retiro</div>
          <input type="date" style={st.barInput} min={firstBookableInput()} value={pickup}
            onChange={e => { setPickup(e.target.value); if (dropoff && new Date(dropoff) < new Date(e.target.value)) setDropoff(""); }} />
        </div>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>Devolución</div>
          <input type="date" style={st.barInput} min={pickup || firstBookableInput()} value={dropoff}
            onChange={e => setDropoff(e.target.value)} />
        </div>
        <div className="fw-plain-field" style={{ ...st.barCell, ...(isMobile ? { borderBottom: "none", marginBottom: 0 } : { borderRight: "none" }) }}>
          <div style={st.barLbl}>Categoría</div>
          {/* Desplegable propio: el <select> nativo abre la lista que dibuja el
              sistema operativo, y en Windows eso se veía como un menú cuadrado
              con el celeste del sistema, sin nada del diseño de la página. */}
          <Select
            plain
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: "Todas" }, ...CATEGORIES.map(c => ({ value: c.id, label: c.label }))]}
          />
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
            {loading ? "Buscando..." : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            en {where || "Argentina"}{total > filtered.length ? ` · ${total} en total` : ""}
          </div>
        </div>
      </div>

      {pickup && dropoff && !datesValid && (
        <div style={{ ...st.banner, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          La fecha de devolución no puede ser anterior a la de retiro.
        </div>
      )}
      {datesValid && (
        <div style={{ ...st.banner, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af" }}>
          Mostrando solo los autos libres del {new Date(`${pickup}T10:00:00`).toLocaleDateString("es-AR")} al {new Date(`${dropoff}T10:00:00`).toLocaleDateString("es-AR")}.
        </div>
      )}
      {showingMocks && (
        <div style={st.banner}>Todavía no hay autos publicados: estás viendo <strong>autos de ejemplo</strong>.</div>
      )}
      {error && !showingMocks && (
        <div style={{ ...st.banner, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>{error}</div>
      )}

      {/* Filtros con menús desplegables */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Buscar marca o modelo..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: "9px 16px", borderRadius: 22, border: "1px solid #e5e7eb", fontSize: 13, outline: "none", minWidth: 210 }} />
        <Dropdown label="Ordenar" active value={SORT_OPTIONS.find(o => o.id === sort)?.label}
          options={SORT_OPTIONS.map(o => o.label)}
          onChange={(label) => setSort(SORT_OPTIONS.find(o => o.label === label)?.id || "newest")} />
        <Dropdown label="Transmisión" value={trans !== "Todas" ? trans : ""} active={trans !== "Todas"} options={TRANSMISSION_OPTIONS} onChange={setTrans} />
        <Dropdown label="Combustible" value={fuel !== "Todos" ? fuel : ""} active={fuel !== "Todos"} options={FUEL_OPTIONS} onChange={setFuel} />
        <input type="number" min="0" placeholder="Precio máx. por día" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
          style={{ padding: "9px 16px", borderRadius: 22, border: maxPrice ? "1.5px solid #2563eb" : "1px solid #e5e7eb", fontSize: 13, outline: "none", width: 175 }} />
        {anyFilter && <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, cursor: "pointer" }} onClick={clearAll}>Limpiar filtros</div>}
      </div>

      {/* Lista + Mapa */}
      <div style={{ display: (showMap && !isMobile) ? "grid" : "block", gridTemplateColumns: "1fr 42%", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, ...(showMap && !isMobile ? { maxHeight: "calc(100vh - 240px)", overflowY: "auto", paddingRight: 4 } : {}) }}>
          {loading
            ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Buscando autos...</div>
            : filtered.length === 0
              ? <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
                  No se encontraron autos con esos filtros.
                  {anyFilter && <div style={{ marginTop: 12 }}><button onClick={clearAll} style={{ padding: "9px 18px", borderRadius: 20, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Limpiar filtros</button></div>}
                </div>
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
                      <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${priceOf(selectedCar).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>/día</span></div>
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
              Ver como lista
            </button>
          </div>
        )}
      </div>

      {!showMap && !isMobile && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => setShowMap(true)}
            style={{ background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 24, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Ver en el mapa
          </button>
        </div>
      )}
    </div>
  );
}
