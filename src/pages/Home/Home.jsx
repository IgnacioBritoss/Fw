// ============================================================================
//  Home — Pantalla de INICIO
// ----------------------------------------------------------------------------
//  Es la portada de la app. Muestra:
//   - Un "hero" con buscador por ubicación Y FECHAS (retiro / devolución).
//   - Categorías de autos (Sedan, SUV, etc.), que ahora filtran de verdad.
//   - La grilla de autos, en Lista o en Mapa, con el corazón de favoritos.
//
//  Qué se arregló acá:
//   · Las fechas del buscador eran texto fijo ("18 dic · 10:00"): no filtraban
//     nada. Ahora son dos selectores reales y el backend descarta los autos ya
//     reservados u ocupados en ese rango.
//   · Las categorías comparaban contra un campo que el backend no devolvía, así
//     que las tarjetas quedaban sin precio ("Ver autos →") y al tocarlas no
//     aparecía ningún auto. Ahora la categoría se guarda en el vehículo.
//   · Los autos de ejemplo se mezclaban siempre con los publicados. Ahora solo
//     aparecen si todavía no hay ninguna publicación.
//   · El corazón de favoritos no se podía tocar: el clic abría la publicación.
// ============================================================================
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth } from "../../context/AuthContext";
import { useListings } from "../../hooks/useListings";
import { CATEGORIES, filterCars, priceOf } from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";
import { firstBookableInput } from "../../services/dates";
import { useI18n } from "../../i18n/core";

// El mínimo de los selectores de fecha es MAÑANA: no hay alquileres para el
// mismo día (ver services/dates.js).

export default function Home() {
  const { t: tr } = useI18n();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");            // "" = todas las categorías
  const [pickup, setPickup] = useState("");      // fecha de retiro (YYYY-MM-DD)
  const [dropoff, setDropoff] = useState("");    // fecha de devolución
  const [view, setView] = useState("lista");
  const [dateError, setDateError] = useState("");

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);

  /**
   * Filtros que se envían al backend: SOLO las fechas, porque son las únicas que
   * necesitan mirar la base (reservas y bloqueos) para saber qué auto está libre.
   *
   * La categoría y el texto se filtran en el navegador. Así las tarjetas de
   * categoría pueden seguir mostrando el precio de TODAS las categorías (si se
   * filtrara en el servidor, al elegir "Sedan" el resto quedaría en "Sin autos")
   * y el filtro también funciona sobre los autos de ejemplo.
   */
  const serverFilters = useMemo(() => {
    const filters = { limit: 50 };
    // Un solo día (retiro = devolución) es una búsqueda válida: se pregunta si el
    // auto está libre ESE día. Antes se exigía devolución posterior al retiro y
    // con fechas iguales no se mandaba ninguna, así que no se filtraba nada y
    // aparecían autos que estaban ocupados justo ese día.
    if (pickup && dropoff && new Date(dropoff) >= new Date(pickup)) {
      filters.startDate = new Date(`${pickup}T10:00:00`).toISOString();
      filters.endDate = new Date(`${dropoff}T10:00:00`).toISOString();
    }
    return filters;
  }, [pickup, dropoff]);

  const { cars, loading, error, showingMocks } = useListings(serverFilters);

  // Sobre lo que trajo el backend se aplican la categoría y la búsqueda por
  // texto, que responden sin esperar otra vuelta al servidor.
  const filtered = useMemo(
    () => filterCars(cars, { text: search, category: cat }),
    [cars, search, cat],
  );

  // Avisa si el rango de fechas está al revés o incompleto.
  useEffect(() => {
    if (pickup && dropoff && new Date(dropoff) < new Date(pickup)) {
      setDateError("La devolución no puede ser antes del retiro.");
    } else if ((pickup && !dropoff) || (!pickup && dropoff)) {
      setDateError("Completá las dos fechas para filtrar por disponibilidad.");
    } else {
      setDateError("");
    }
  }, [pickup, dropoff]);

  // Carga la librería del mapa (Leaflet) una sola vez.
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

  // Si el usuario vuelve a la vista de Lista, destruye el mapa para liberar memoria.
  useEffect(() => {
    if (view === "lista" && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    }
  }, [view]);

  // Dibuja en el mapa un pin + un círculo de "zona aproximada" por cada auto
  // filtrado, con un popup que lleva al detalle. Borra los pines anteriores.
  const addMarkers = useCallback((map, L) => {
    if (!map || !L) return;
    Object.values(markersRef.current).forEach(m => {
      try {
        map.removeLayer(m.marker || m);
        if (m.circle) map.removeLayer(m.circle);
      } catch { /* la capa ya no estaba en el mapa */ }
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
        radius: 600, color: "#2563eb", fillColor: "#bfdbfe",
        fillOpacity: 0.18, weight: 1.5, interactive: false,
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
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${car.location} <span style="color:#9ca3af;font-size:10px">(zona aprox.)</span></div>
          <div style="font-weight:700;font-size:15px;color:#2563eb">
            $${priceOf(car).toLocaleString()}
            <span style="font-weight:400;font-size:12px;color:#6b7280">${tr("common.perDay")}</span>
          </div>
          <div style="margin-top:8px;padding:7px;background:#2563eb;color:#fff;border-radius:8px;text-align:center;font-size:12px;font-weight:600;">${tr("car.bookNow")}</div>
        </div>
      `));
      marker.addTo(map);
      markersRef.current[car.id] = { marker, circle };
    });
    window.__fwOpen = (id) => navigate(`/cars/${id}`);
  }, [filtered, navigate, tr]);

  // Cuando se activa la vista de Mapa, crea el mapa y coloca los marcadores.
  useEffect(() => {
    if (view !== "mapa") return;
    const init = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;
      // scrollWheelZoom: false — ver la nota en components/MapView.jsx.
      const map = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: isMobile ? 11 : 12, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      mapInstanceRef.current = map;
      addMarkers(map, L);
    };
    if (window.L) { const t = setTimeout(init, 150); return () => clearTimeout(t); }
    const iv = setInterval(() => { if (window.L) { clearInterval(iv); setTimeout(init, 150); } }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mapLoaded, isMobile]);

  useEffect(() => {
    if (view !== "mapa" || !mapInstanceRef.current || !window.L) return;
    addMarkers(mapInstanceRef.current, window.L);
  }, [filtered, addMarkers, view]);

  /**
   * Precio más barato de cada categoría, calculado con los autos que hay. Es lo
   * que llena el "Desde $X" de las tarjetas de categoría, que antes quedaban
   * siempre vacías porque el dato de categoría no llegaba.
   */
  const priceByCategory = useMemo(() => {
    const result = {};
    cars.forEach(car => {
      if (!car.category || car.available === false) return;
      const price = priceOf(car);
      if (!price) return;
      result[car.category] = result[car.category] ? Math.min(result[car.category], price) : price;
    });
    return result;
  }, [cars]);

  const countByCategory = useMemo(() => {
    const result = {};
    cars.forEach(car => {
      if (!car.category || car.available === false) return;
      result[car.category] = (result[car.category] || 0) + 1;
    });
    return result;
  }, [cars]);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Invitado";

  // Manda al buscador con los filtros ya puestos, para no perderlos al cambiar
  // de pantalla.
  const goToSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (cat) params.set("category", cat);
    if (pickup) params.set("from", pickup);
    if (dropoff) params.set("to", dropoff);
    navigate(`/buscar${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // ─────────────────────────────────────────── Estilos
  const t = {
    content: { padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1320, margin: "0 auto" },
    hero: { borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px 14px" : 32, background: "linear-gradient(120deg,#0a1f44 0%,#1d4ed8 60%,#2563eb 100%)", color: "#fff", position: "relative", overflow: "hidden", marginBottom: isMobile ? 24 : 32 },
    searchRow: isMobile
      ? { display: "flex", flexDirection: "column", gap: 2, background: "#fff", borderRadius: 14, padding: 8, marginTop: 20 }
      : { display: "flex", alignItems: "center", background: "#fff", borderRadius: 16, padding: "8px 8px 8px 4px", marginTop: 28, flexWrap: "wrap" },
    // En celular cada campo ocupa todo el ancho y se separa con una línea abajo
    // en vez de a la derecha, que es lo que se lee bien apilado.
    // El renglón de cada campo estaba altísimo (etiqueta + campo de 14px con
    // padding generoso), así que las tres filas del buscador se comían media
    // pantalla del teléfono y había que scrolear para ver los autos.
    searchCell: isMobile
      ? { width: "100%", padding: "7px 12px", borderBottom: "1px solid #f1f1f1", boxSizing: "border-box" }
      : { flex: 1, minWidth: 140, padding: "8px 20px", borderRight: "1px solid #eee" },
    searchLabel: { fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 2 },
    searchInput: { border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent", width: "100%" },
    sectionTitle: { fontSize: 19, fontWeight: 800, color: "#111827", letterSpacing: "-.3px" },
    carCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" },
    tag: { fontSize: 11, color: "#6b7280", border: "1px solid #ececec", borderRadius: 20, padding: "3px 10px" },
    reservar: { background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    stepCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 14, padding: 20 },
    banner: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 20 },
  };

  // ─────────────────────────────────────────── Subcomponentes
  // Tarjeta individual de un auto en la grilla (foto, datos, precio y botón).
  const CarCard = ({ car }) => (
    <div style={t.carCard} onClick={() => navigate(`/cars/${car.id}`)}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", background: "#e5e7eb" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>}
        {car.categoryLabel && (
          <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(17,24,39,.85)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{car.categoryLabel}</div>
        )}
        {/* Corazón: es un botón que corta el clic, así no abre la publicación. */}
        <FavoriteButton listingId={car.id} disabled={car.isMock} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{car.brand} {car.model} {car.year}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          {car.location && `${car.location} · `}
          {car.rating > 0 && `${car.rating} ★ · `}{car.transmission}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {car.fuel && <span style={t.tag}>{car.fuel}</span>}
          {car.seats && <span style={t.tag}>{tr("common.seats", { count: car.seats })}</span>}
        </div>
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${priceOf(car).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{tr("common.perDay")}</span></div>
          <button style={t.reservar} onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>{tr("home.book")}</button>
        </div>
      </div>
    </div>
  );

  // Grilla de categorías: cada tarjeta filtra por ese tipo de auto al clickearla.
  const CategoriesSection = () => (
    <>
      <div style={{ ...t.sectionTitle, marginBottom: 16 }}>{tr("home.categories")}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6,1fr)", gap: 14, marginBottom: 32 }}>
        {CATEGORIES.map((c) => {
          const min = priceByCategory[c.id];
          const count = countByCategory[c.id] || 0;
          const active = cat === c.id;
          return (
            <div key={c.id}
              onClick={() => setCat(active ? "" : c.id)}
              style={{
                background: "#fff",
                border: active ? "1.5px solid #2563eb" : "1px solid #ececec",
                borderRadius: 14, padding: "20px 18px", cursor: "pointer",
                transition: "transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1), border-color .35s ease",
                boxShadow: active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)"; if (!active) e.currentTarget.style.borderColor = "#c7d2fe"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)"; if (!active) e.currentTarget.style.borderColor = "#ececec"; }}
            >
              <div style={{ width: 28, height: 3, borderRadius: 2, background: active ? "#2563eb" : "#e5e7eb", marginBottom: 16, transition: "background .35s ease" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-.2px" }}>{c.label}</div>
              {/* Ahora sí hay dato: precio mínimo real y cantidad de autos. */}
              <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#2563eb" : "#9ca3af", marginTop: 4 }}>
                {min ? tr("home.from", { price: `$${min.toLocaleString()}` }) : count > 0 ? `${count}` : tr("home.noneYet")}
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
          ["02", "Reservá", "El dueño acepta y pagás online."],
          ["03", "Retirá", "Coordinás la entrega y confirman con el QR."],
          ["04", "Devolvé", "Al devolver se cierra la reserva y se libera el depósito."],
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

  return (
    <div style={t.content}>
      {/* Hero */}
      {/*
        data-no-invert: en modo oscuro la página entera se invierte, y este bloque
        YA es oscuro (azul noche con letras blancas), así que la inversión lo dejaba
        celeste con letras negras — justo al revés de lo que tiene que ser. Con esta
        marca se lo vuelve a invertir y conserva sus colores reales.
        La tarjeta blanca del buscador que va adentro se oscurece por CSS
        (.fw-hero-search en theme.css), porque acá el filtro ya no la alcanza.
      */}
      <div style={t.hero} data-no-invert>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.12),transparent 60%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.14)", padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>● {tr("home.greeting", { name: firstName || tr("home.guest") }).toUpperCase()}</div>
          <div style={{ fontSize: isMobile ? 25 : 40, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>{tr("home.title")}</div>
          <div style={{ fontSize: 14, opacity: .8, marginTop: 14 }}>{tr("home.subtitle")}</div>

          <div className="fw-hero-search" style={t.searchRow}>
            <div className="fw-plain-field" style={t.searchCell}>
              <div style={t.searchLabel}>{tr("home.where")}</div>
              <input style={t.searchInput} placeholder={tr("home.wherePlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Fechas reales: antes eran texto fijo y no filtraban nada. */}
            <div className="fw-plain-field" style={t.searchCell}>
              <div style={t.searchLabel}>{tr("home.pickup")}</div>
              <input type="date" style={t.searchInput} min={firstBookableInput()} value={pickup}
                onChange={e => { setPickup(e.target.value); if (dropoff && new Date(dropoff) < new Date(e.target.value)) setDropoff(""); }} />
            </div>
            <div className="fw-plain-field" style={{ ...t.searchCell, ...(isMobile ? { borderBottom: "none" } : { borderRight: "none" }) }}>
              <div style={t.searchLabel}>{tr("home.dropoff")}</div>
              <input type="date" style={t.searchInput} min={pickup || firstBookableInput()} value={dropoff}
                onChange={e => setDropoff(e.target.value)} />
            </div>
            {/* Acá había un select "Tipo" con el diseño por defecto del
                navegador. Se quitó: justo abajo está "Explorá por categoría",
                que hace exactamente lo mismo y se ve mucho mejor. */}
            <button
              style={{
                background: "#2563eb", color: "#fff", border: "none", borderRadius: 12,
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                ...(isMobile
                  ? { width: "100%", padding: "14px", marginTop: 8 }
                  : { padding: "14px 24px", margin: 4 }),
              }}
              onClick={goToSearch}>{tr("home.searchCars")} →</button>
          </div>
          {dateError && (
            <div style={{ marginTop: 12, fontSize: 13, background: "rgba(255,255,255,.16)", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>{dateError}</div>
          )}
        </div>
      </div>

      {/* Avisos de estado: datos de ejemplo o backend caído */}
      {showingMocks && (
        <div style={t.banner}>
          Todavía no hay autos publicados, así que estás viendo <strong>autos de ejemplo</strong>.
          {" "}En cuanto alguien publique un auto, aparecen los reales.
        </div>
      )}
      {error && !showingMocks && (
        <div style={{ ...t.banner, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>{error}</div>
      )}

      <CategoriesSection />

      {/* Encabezado de la grilla */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={t.sectionTitle}>
            {cat ? `${tr("home.available")} · ${CATEGORIES.find(c => c.id === cat)?.label}` : tr("home.available")}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {loading ? tr("common.loading") : tr("home.availableCount", { count: filtered.length })}
            {pickup && dropoff && !dateError && " en las fechas elegidas"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(cat || search || pickup || dropoff) && (
            <button onClick={() => { setCat(""); setSearch(""); setPickup(""); setDropoff(""); }}
              style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151" }}>
              Limpiar filtros
            </button>
          )}
          {[["lista", tr("home.list")], ["mapa", tr("home.map")]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600,
              border: view === k ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
              background: view === k ? "#2563eb" : "#fff", color: view === k ? "#fff" : "#374151",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Cargando autos...</div>
      ) : view === "lista" ? (
        // Una sola columna en el teléfono. Con dos, cada tarjeta quedaba en 170px:
        // el nombre del auto se partía en dos renglones y el precio con el botón
        // "Reservar" no entraban en la misma fila, así que el botón aparecía
        // cortado contra el borde de la tarjeta.
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(250px,1fr))", gap: isMobile ? 12 : 16 }}>
          {filtered.map(car => <CarCard key={car.id} car={car} />)}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#9ca3af" }}>
              {tr("home.noResults")}
              {(cat || pickup) && <div style={{ fontSize: 13, marginTop: 8 }}>Probá con otras fechas o con otra categoría.</div>}
            </div>
          )}
        </div>
      ) : (
        <div ref={mapRef} style={{ height: isMobile ? "60vh" : "calc(100vh - 240px)", borderRadius: 16, overflow: "hidden", zIndex: 0, border: "1px solid #e5e7eb" }} />
      )}

      <div style={{ height: 28 }} />
      <StepsSection />
    </div>
  );
}
