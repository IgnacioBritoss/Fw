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
  CATEGORIES, filterCars, priceOf, sortCars, categoryLabel, transmissionLabel, fuelLabel,
} from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";
import Select from "../../components/Select";
import { firstBookableInput } from "../../services/dates";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";
import { useCurrency } from "../../context/CurrencyContext";

// Los filtros guardan el CÓDIGO del backend, no el texto que se ve. Antes el
// estado era la palabra en castellano ("Automático") y se buscaba el código en
// una tabla: con la app en inglés la lista mostraba castellano, y si se hubiese
// traducido el texto el filtro habría dejado de encontrar el código.
const SORT_OPTIONS = [
  { value: "newest", key: "search.sortNewest" },
  { value: "priceAsc", key: "search.sortPriceAsc" },
  { value: "priceDesc", key: "search.sortPriceDesc" },
];
const TRANSMISSION_OPTIONS = [
  { value: "", key: "cat.all" },
  { value: "MANUAL", key: "trans.MANUAL" },
  { value: "AUTOMATIC", key: "trans.AUTOMATIC" },
];
const FUEL_OPTIONS = [
  { value: "", key: "fuel.all" },
  { value: "GASOLINE", key: "fuel.GASOLINE" },
  { value: "DIESEL", key: "fuel.DIESEL" },
  { value: "HYBRID", key: "fuel.HYBRID" },
  { value: "ELECTRIC", key: "fuel.ELECTRIC" },
  { value: "OTHER", key: "fuel.OTHER" },
];

// El mínimo de los selectores de fecha es MAÑANA: no hay alquileres para el
// mismo día (ver services/dates.js).

// ── Menú desplegable reutilizable ──
// Componente genérico de filtro: un botón que abre una lista de opciones y avisa
// la elegida con onChange(). Se cierra solo al hacer clic afuera.
function Dropdown({ label, value, options, onChange, active, celda }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  // El botón muestra el TEXTO de la opción elegida (traducido), no su código.
  // La opción vacía es "todas": ahí el botón no lleva sufijo.
  const chosenLabel = options.find(o => o.value === value && o.value !== "")?.label || "";
  return (
    <div ref={ref} style={{ position: "relative", display: "flex", ...celda }}>
      {/*
        Es un <button> de verdad y no un <div>: así se llega con el tabulador y
        se abre con Enter, y los lectores de pantalla lo anuncian como un control.
        Como <div> no era ninguna de las tres cosas.
      */}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", border: "none", background: "transparent",
          fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", width: "100%",
          color: active ? "var(--fw-blue)" : "var(--fw-text-2)" }}>
        {label}{chosenLabel ? `: ${chosenLabel}` : ""} <span style={{ fontSize: 10, opacity: .7, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>
      {open && (
        <div role="listbox" aria-label={label}
          style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, background: "var(--fw-surface)", borderRadius: 14, minWidth: 180, boxShadow: "0 12px 40px rgba(0,0,0,.14)", border: "1px solid var(--fw-line-soft)", zIndex: 400, overflow: "hidden", padding: "6px" }}>
          {options.map(o => {
            const chosen = o.value === value;
            return (
              /* role="option" no es decorativo: sin él la lista es un montón de
                 divs sueltos para un lector de pantalla, y "Nafta" acá no se
                 distingue del "Nafta" que dice la ficha de un auto. */
              <div key={o.value} role="option" aria-selected={chosen}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ padding: "9px 12px", borderRadius: 9, fontSize: 13, cursor: "pointer", fontWeight: chosen ? 700 : 500, color: chosen ? "var(--fw-blue)" : "var(--fw-text-2)", background: chosen ? "var(--fw-blue-bg)" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => { if (!chosen) e.currentTarget.style.background = "var(--fw-surface-2)"; }}
                onMouseLeave={e => { if (!chosen) e.currentTarget.style.background = "transparent"; }}>
                {o.label}{chosen && <span>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Search() {
  const { t: tr } = useI18n();
  const { precio } = useCurrency();
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
  const [trans, setTrans] = useState("");
  const [fuel, setFuel] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  // Lo que se VE en el campo de precio (con separadores de miles). El filtro que
  // viaja al backend es `maxPrice`, que son solo los dígitos y se actualiza un
  // rato después de dejar de escribir.
  const [precioTexto, setPrecioTexto] = useState("");
  const precioTimer = useRef(null);

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
    if (trans) filters.transmission = trans;
    if (fuel) filters.fuelType = fuel;
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

  /*
    Redibuja los pines del mapa, uno por auto.

    ANTES eran globos blancos con el precio adentro. Con más de dos o tres autos
    en la misma zona el mapa se tapaba de carteles y no se veía el mapa, que es
    justamente para lo que se lo abre. Y era otro diseño distinto del que usa el
    mapa de la portada: dos mapas de la misma app con pines que no se parecen.

    AHORA es el mismo puntito de la portada: un círculo del azul de la marca con
    borde blanco. El auto que está resaltado (con el mouse encima o elegido en la
    lista) se agranda y se pone oscuro, que es lo único que hace falta para saber
    cuál es cuál; el precio ya está en la tarjeta de al lado.
  */
  const addMarkers = useCallback((map, L) => {
    Object.values(markersRef.current).forEach(m => { try { map.removeLayer(m); } catch { /* ya no estaba */ } });
    markersRef.current = {};
    filtered.forEach(car => {
      if (!car.lat || !car.lng) return;
      const on = hovered === car.id || selected === car.id;
      const lado = on ? 20 : 14;
      const punto = `width:${lado}px;height:${lado}px;background:${on ? "#111827" : "#0f6ce6"};`
        + `border:2px solid #fff;border-radius:50%;cursor:pointer;`
        + `box-shadow:${on ? "0 4px 14px rgba(17,24,39,.45)" : "0 2px 6px rgba(0,0,0,.35)"};`
        + `transition:width .18s ease,height .18s ease,background .18s ease`;
      const icon = L.divIcon({
        className: "",
        html: `<div style="${punto}"></div>`,
        iconSize: [lado, lado],
        iconAnchor: [lado / 2, lado / 2],
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
    /*
      La franja de filtros: una sola barra con celdas separadas por una línea, en
      vez de seis píldoras sueltas. En pantalla chica las celdas se acomodan en
      varias filas (flexWrap) porque los seis controles no entran en 390px.
    */
    filtros: {
      display: "flex", alignItems: "stretch", flexWrap: "wrap",
      background: "var(--fw-surface)", border: "1px solid var(--fw-line)", borderRadius: 4,
      marginBottom: 18,
    },
    /*
      Cada celda pide el ancho que necesita en vez de repartirlo en partes
      iguales: los desplegables ocupan lo que mide su texto (`flexShrink: 0`) y
      los dos campos donde se escribe se llevan lo que sobra. Antes el último
      campo se cortaba —"Precio máx. por dí..."— porque todos se apretaban igual.
    */
    filtroCelda: {
      display: "flex", alignItems: "center", padding: "12px 14px",
      borderLeft: "1px solid var(--fw-line-soft)", boxSizing: "border-box", flexShrink: 0,
    },
    barCell: isMobile
      ? { width: "100%", marginBottom: 10, boxSizing: "border-box" }
      : { paddingRight: 22, borderRight: "1px solid var(--fw-line-soft)", minWidth: 130 },
    barLbl: { fontSize: 11, fontWeight: 700, color: "var(--fw-text-4)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: isMobile ? 5 : 3 },
    /*
      EN EL TELÉFONO los campos se ven como campos.

      En escritorio alcanza con una línea abajo: los cuatro están uno al lado del
      otro, separados por líneas verticales, y se entiende que es una barra de
      búsqueda. Apilados en un teléfono esa misma línea fina no dice nada —parecen
      textos sueltos— y la flecha del desplegable quedaba colgada contra el borde
      derecho de la pantalla, lejos del valor que despliega.

      Con una caja gris clara alrededor, cada uno se lee como algo que se toca, y
      la flecha pasa a ser el borde derecho DE SU CAJA en vez de un signo suelto.
    */
    barInput: isMobile
      ? { fontSize: 15, fontWeight: 600, color: "var(--fw-text)", border: "1px solid var(--fw-border)", borderRadius: 4, outline: "none", background: "var(--fw-surface-2)", padding: "10px 12px", width: "100%", boxSizing: "border-box" }
      : { fontSize: 14, fontWeight: 700, color: "var(--fw-text)", border: "none", borderBottom: "1.5px solid var(--fw-border)", outline: "none", background: "transparent", padding: "1px 0", width: 140, boxSizing: "border-box" },
    // La misma caja para el desplegable de categoría, así los cuatro controles de
    // la barra se ven iguales entre sí.
    barSelect: isMobile
      ? { border: "1px solid var(--fw-border)", borderRadius: 4, background: "var(--fw-surface-2)", padding: "10px 12px" }
      : null,
    card: { display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 16, background: "var(--fw-surface)", border: "1px solid var(--fw-line)", borderRadius: 16, padding: isMobile ? 12 : 14, cursor: "pointer", transition: "box-shadow .2s, transform .2s, border-color .2s" },
    ph: { width: isMobile ? "100%" : 150, height: isMobile ? 170 : 118, borderRadius: 12, background: "var(--fw-surface-3)", flexShrink: 0, overflow: "hidden", position: "relative" },
    /*
      LA FICHA TÉCNICA — la misma que la tarjeta del inicio.

      Acá caja, combustible y asientos eran tres píldoras sueltas de 20px de
      redondeo, cada una con su propio borde. La tarjeta del inicio ya resolvió
      lo mismo de otra manera: una sola barra con las celdas separadas por una
      línea, que se lee como una ficha y no como tres etiquetas decorativas. Es
      el mismo dato en las dos pantallas, así que no hay motivo para que se vea
      distinto en cada una.

      La primera celda no lleva línea a la izquierda: quedaría doble contra el
      borde de la barra.
    */
    fichaFila: { display: "flex", border: "1px solid var(--fw-line)", borderRadius: 4, marginTop: 10, overflow: "hidden" },
    fichaCelda: { flex: 1, fontSize: 11.5, color: "var(--fw-text-2)", padding: "7px 10px", textAlign: "center", borderLeft: "1px solid var(--fw-line)" },
    // La categoría del auto. Antes esto se llamaba "verif" y era verde, así que
    // "Sedan" parecía un sello de verificación.
    categoria: { fontSize: 11, fontWeight: 700, color: "var(--fw-text-2)", background: "var(--fw-bg)", border: "1px solid var(--fw-border)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".02em" },

    detail: { background: "var(--fw-chip)", color: "#fff", border: "none", borderRadius: 22, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
    banner: { background: "var(--fw-amber-bg)", border: "1px solid var(--fw-amber-line)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--fw-amber-text)", marginBottom: 16 },
  };

  // Tarjeta de un auto en la lista.
  const Card = ({ car }) => {
    const on = selected === car.id;
    return (
      <div style={{ ...st.card, borderColor: on ? "var(--fw-blue)" : "var(--fw-line)", boxShadow: on ? "0 8px 26px rgba(37,99,235,.14)" : "none" }}
        onClick={() => navigate(`/cars/${car.id}`)}
        onMouseEnter={e => { setHovered(car.id); e.currentTarget.style.transform = "translateY(-2px)"; if (!on) e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,.08)"; }}
        onMouseLeave={e => { setHovered(null); e.currentTarget.style.transform = "none"; if (!on) e.currentTarget.style.boxShadow = "none"; }}>
        <div style={st.ph}>
          {car.photos?.length > 0
            ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fw-text-4)", fontSize: 12 }}>{tr("common.noPhoto")}</div>}
          <FavoriteButton listingId={car.id} size={28} disabled={car.isMock} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.3px" }}>{car.brand} {car.model} {car.year}</div>
          <div style={{ fontSize: 13, color: "var(--fw-text-3)", marginTop: 2 }}>{car.location}{car.rating > 0 ? ` · ${car.rating} ★${car.reviews ? ` (${car.reviews})` : ""}` : ""}</div>
          {car.category && (
            <div style={{ marginTop: 10 }}>
              <span style={st.categoria}>{categoryLabel(tr, car.category)}</span>
            </div>
          )}
          {/* Ficha técnica: una barra con celdas, igual que en el inicio. Se arma
              con los datos que el auto tenga, y si no tiene ninguno no se dibuja
              una barra vacía. */}
          {(() => {
            const celdas = [
              car.transmissionCode && transmissionLabel(tr, car.transmissionCode),
              car.fuelCode && fuelLabel(tr, car.fuelCode),
              car.seats && tr("common.seats", { count: car.seats }),
            ].filter(Boolean);
            if (celdas.length === 0) return null;
            return (
              <div style={st.fichaFila}>
                {celdas.map((texto, i) => (
                  <span key={texto} style={{ ...st.fichaCelda, ...(i === 0 ? { borderLeft: "none" } : {}) }}>
                    {texto}
                  </span>
                ))}
              </div>
            );
          })()}
          <div style={{
            marginTop: "auto", paddingTop: 12, display: "flex", gap: 10,
            ...(isMobile
              ? { flexDirection: "column", alignItems: "stretch" }
              : { justifyContent: "space-between", alignItems: "flex-end" }),
          }}>
            <div><span style={{ fontSize: 22, fontWeight: 800, color: "var(--fw-text)" }}>{precio(priceOf(car))}</span><span style={{ fontSize: 13, color: "var(--fw-text-4)" }}>{tr("common.perDay")}</span></div>
            <button style={{ ...st.detail, ...(isMobile ? { width: "100%" } : {}) }}
              onClick={e => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>{tr("search.viewDetail")}</button>
          </div>
        </div>
      </div>
    );
  };

  /*
    ¿Hay algún filtro puesto? Se mira si el valor está cargado, y nada más.

    Antes comparaba contra los textos "Todas" y "Todos", que son de cuando los
    filtros guardaban la etiqueta en castellano. Hoy guardan el código del backend
    (GASOLINE, HYBRID...), así que esas dos comparaciones daban SIEMPRE verdadero
    y el cartel de "Limpiar filtros" no se iba nunca.
  */
  const anyFilter = Boolean(
    trans || fuel || search || where || category || maxPrice || pickup || dropoff,
  );
  /*
    Limpiar los filtros los deja VACÍOS.

    Antes ponía setTrans("Todas") y setFuel("Todos"): dos textos que no son
    ninguna de las opciones. Eso rompía dos cosas a la vez. El desplegable de
    combustible quedaba trabado, porque su valor no coincidía con ninguna opción y
    seguía pintado como si hubiera un filtro puesto. Y peor: "Todos" se mandaba al
    backend como fuelType, que espera GASOLINE / DIESEL / HYBRID / ELECTRIC /
    OTHER, así que la búsqueda entera fallaba después de limpiar.
  */
  const clearAll = () => {
    setTrans(""); setFuel(""); setSearch(""); setWhere("");
    setCategory(""); setPickup(""); setDropoff("");
    setMaxPrice(""); setPrecioTexto("");
    clearTimeout(precioTimer.current);
  };

  /**
   * Al escribir en el precio: se muestra formateado en el momento y el filtro
   * de verdad se actualiza recién cuando se deja de escribir.
   *
   * La espera no es un adorno: sin ella cada tecla dispara una búsqueda al
   * servidor —cinco para escribir "39000"— y todas compiten entre sí.
   */
  const alEscribirPrecio = (texto) => {
    const digitos = texto.replace(/\D/g, "").slice(0, 9);
    setPrecioTexto(digitos ? Number(digitos).toLocaleString() : "");
    clearTimeout(precioTimer.current);
    precioTimer.current = setTimeout(() => setMaxPrice(digitos), 350);
  };

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth: 1360, margin: "0 auto" }}>
      {/* Barra de búsqueda: ubicación + fechas reales */}
      <div className="fw-compact-fields"
        style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 22, background: "var(--fw-surface)", border: "1px solid var(--fw-line)", borderRadius: 16, padding: isMobile ? "12px 14px" : "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 14, flexWrap: "wrap" }}>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>{tr("home.where")}</div>
          <input style={st.barInput} placeholder={tr("search.allCountry")} value={where} onChange={e => setWhere(e.target.value)} />
        </div>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>{tr("home.pickup")}</div>
          <input type="date" style={st.barInput} min={firstBookableInput()} value={pickup}
            onChange={e => { setPickup(e.target.value); if (dropoff && new Date(dropoff) < new Date(e.target.value)) setDropoff(""); }} />
        </div>
        <div className="fw-plain-field" style={st.barCell}>
          <div style={st.barLbl}>{tr("home.dropoff")}</div>
          <input type="date" style={st.barInput} min={pickup || firstBookableInput()} value={dropoff}
            onChange={e => setDropoff(e.target.value)} />
        </div>
        <div className="fw-plain-field" style={{ ...st.barCell, ...(isMobile ? { borderBottom: "none", marginBottom: 0 } : { borderRight: "none" }) }}>
          <div style={st.barLbl}>{tr("search.category")}</div>
          {/* Desplegable propio: el <select> nativo abre la lista que dibuja el
              sistema operativo, y en Windows eso se veía como un menú cuadrado
              con el celeste del sistema, sin nada del diseño de la página. */}
          <div style={st.barSelect || undefined}>
            <Select
              plain
              value={category}
              onChange={setCategory}
              options={[{ value: "", label: tr("cat.all") }, ...CATEGORIES.map(c => ({ value: c.id, label: tr(c.key) }))]}
            />
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fw-text)" }}>
            {loading ? tr("search.searching") : tr(filtered.length === 1 ? "search.resultOne" : "search.resultMany", { count: filtered.length })}
          </div>
          <div style={{ fontSize: 12, color: "var(--fw-text-4)" }}>
            {tr("search.inPlace", { place: where || "Argentina" })}{total > filtered.length ? ` · ${tr("search.totalCount", { count: total })}` : ""}
          </div>
        </div>
      </div>

      {pickup && dropoff && !datesValid && (
        <div style={{ ...st.banner, background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", color: "var(--fw-red-text-2)" }}>
          {tr("search.badDates")}
        </div>
      )}
      {datesValid && (
        <div style={{ ...st.banner, background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)", color: "var(--fw-blue-text)" }}>
          {tr("search.onlyFree", {
            from: new Date(`${pickup}T10:00:00`).toLocaleDateString(),
            to: new Date(`${dropoff}T10:00:00`).toLocaleDateString(),
          })}
        </div>
      )}
      {showingMocks && (
        <div style={st.banner}>{tr("search.sampleCars")}</div>
      )}
      {error && !showingMocks && (
        <div style={{ ...st.banner, background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", color: "var(--fw-red-text-2)" }}>{error}</div>
      )}

      {/*
        LOS FILTROS, EN UNA FRANJA.

        Antes eran seis controles con forma de píldora sueltos en una fila: dos
        campos de texto redondeados y tres desplegables redondeados, cada uno con
        su propio borde, flotando sobre el fondo. Seis burbujas para una sola
        cosa, que es acotar la búsqueda.

        Ahora es una sola barra, con los controles como celdas separadas por una
        línea —el mismo recurso que el buscador de la portada y que la ficha
        técnica de las tarjetas—. Los desplegables conservan su panel tal cual
        estaba al abrirse; lo que cambia es cómo se ven cerrados.

        La franja NO lleva overflow oculto: recortaría los paneles que se abren
        hacia abajo.
      */}
      <div style={st.filtros}>
        <div style={{ ...st.filtroCelda, flex: "2 1 190px", minWidth: 150, borderLeft: "none" }}>
          <input placeholder={tr("search.byBrand")} value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: "var(--fw-text)" }} />
        </div>
        <Dropdown label={tr("search.sortBy")} active value={sort} celda={st.filtroCelda}
          options={SORT_OPTIONS.map(o => ({ value: o.value, label: tr(o.key) }))}
          onChange={value => setSort(value || "newest")} />
        <Dropdown label={tr("search.transmission")} value={trans} active={Boolean(trans)} celda={st.filtroCelda}
          options={TRANSMISSION_OPTIONS.map(o => ({ value: o.value, label: tr(o.key) }))} onChange={setTrans} />
        <Dropdown label={tr("search.fuel")} value={fuel} active={Boolean(fuel)} celda={st.filtroCelda}
          options={FUEL_OPTIONS.map(o => ({ value: o.value, label: tr(o.key) }))} onChange={setFuel} />
        <div style={{ ...st.filtroCelda, flex: "1 1 150px", minWidth: 130 }}>
          {/*
            El precio máximo NO es type="number".

            Con type="number" el navegador dibuja las dos flechitas de subir y
            bajar, que en un campo de precio no sirven para nada (¿de a cuánto
            sube, de a uno?), se comen ancho y en el teléfono son imposibles de
            acertar. Y además impide mostrar el número con separadores de miles:
            "39000" se lee mal, "39,000" se lee de un vistazo.

            Entonces: campo de texto, teclado numérico en el celular
            (inputMode) y formateo con la MISMA función que muestra los precios
            en las tarjetas, así el campo y los resultados nunca se escriben
            distinto.
          */}
          <input type="text" inputMode="numeric" placeholder={tr("search.maxPrice")}
            value={precioTexto} onChange={e => alEscribirPrecio(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, width: "100%", color: precioTexto ? "var(--fw-blue)" : "var(--fw-text)", fontWeight: precioTexto ? 700 : 400 }} />
        </div>
        {anyFilter && (
          <button type="button" onClick={clearAll}
            style={{ ...st.filtroCelda, padding: "12px 18px", border: "none", borderLeft: "1px solid var(--fw-line-soft)", background: "transparent", fontSize: 13, color: "var(--fw-blue)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {tr("search.clearFilters")}
          </button>
        )}
      </div>

      {/* Lista + Mapa */}
      <div style={{ display: (showMap && !isMobile) ? "grid" : "block", gridTemplateColumns: "1fr 42%", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, ...(showMap && !isMobile ? { maxHeight: "calc(100vh - 240px)", overflowY: "auto", paddingRight: 4 } : {}) }}>
          {loading
            ? <Spinner block label={tr("common.loading")} />
            : filtered.length === 0
              ? <div style={{ textAlign: "center", padding: 60, color: "var(--fw-text-4)" }}>
                  {tr("search.noneWithFilters")}
                  {anyFilter && <div style={{ marginTop: 12 }}><button onClick={clearAll} style={{ padding: "9px 18px", borderRadius: 20, border: "1.5px solid var(--fw-border)", background: "var(--fw-surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{tr("search.clearFilters")}</button></div>}
                </div>
              : filtered.map(car => <Card key={car.id} car={car} />)}
        </div>

        {showMap && !isMobile && (
          <div style={{ position: "sticky", top: 90, height: "calc(100vh - 240px)", borderRadius: 18, overflow: "hidden", border: "1px solid var(--fw-line)", background: "var(--fw-surface-2)" }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%", zIndex: 0 }} />

            {/* Tarjeta flotante del auto seleccionado */}
            {selectedCar && (
              <div style={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 500, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ pointerEvents: "auto", background: "var(--fw-surface)", borderRadius: 16, boxShadow: "0 16px 44px rgba(0,0,0,.22)", border: "1px solid var(--fw-line)", display: "flex", gap: 12, padding: 12, width: 360, maxWidth: "100%", cursor: "pointer" }}
                  onClick={() => navigate(`/cars/${selectedCar.id}`)}>
                  <div style={{ width: 92, height: 74, borderRadius: 10, background: "var(--fw-surface-3)", overflow: "hidden", flexShrink: 0 }}>
                    {selectedCar.photos?.length > 0 && <img src={selectedCar.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fw-text)" }}>{selectedCar.brand} {selectedCar.model}</div>
                      <div onClick={e => { e.stopPropagation(); setSelected(null); }} style={{ color: "var(--fw-text-4)", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>×</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fw-text-3)", margin: "2px 0 8px" }}>{selectedCar.location}{selectedCar.rating > 0 ? ` · ${selectedCar.rating} ★` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><span style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)" }}>{precio(priceOf(selectedCar))}</span><span style={{ fontSize: 12, color: "var(--fw-text-4)" }}>{tr("common.perDay")}</span></div>
                      <button style={{ ...st.detail, padding: "7px 14px", fontSize: 12 }} onClick={e => { e.stopPropagation(); navigate(`/cars/${selectedCar.id}`); }}>{tr("search.viewDetail")}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom */}
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 500, display: "flex", flexDirection: "column", background: "var(--fw-surface)", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,.15)" }}>
              <button onClick={() => mapInstanceRef.current?.zoomIn()} style={{ width: 40, height: 40, border: "none", borderBottom: "1px solid var(--fw-line-soft)", background: "var(--fw-surface)", fontSize: 18, cursor: "pointer", color: "var(--fw-text-2)" }}>+</button>
              <button onClick={() => mapInstanceRef.current?.zoomOut()} style={{ width: 40, height: 40, border: "none", background: "var(--fw-surface)", fontSize: 18, cursor: "pointer", color: "var(--fw-text-2)" }}>−</button>
            </div>

            <button onClick={() => setShowMap(false)}
              style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "var(--fw-chip)", color: "#fff", border: "none", borderRadius: 24, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
              {tr("search.asList")}
            </button>
          </div>
        )}
      </div>

      {!showMap && !isMobile && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => setShowMap(true)}
            style={{ background: "var(--fw-surface)", color: "var(--fw-text)", border: "1px solid var(--fw-border)", borderRadius: 24, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {tr("search.onMap")}
          </button>
        </div>
      )}
    </div>
  );
}
