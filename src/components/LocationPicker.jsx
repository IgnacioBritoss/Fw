// ============================================================================
//  LocationPicker — Selector de ubicación con buscador + mapa
// ----------------------------------------------------------------------------
//  Se usa al publicar un auto para indicar dónde está. El usuario puede:
//   - Escribir una dirección y elegir una sugerencia, o
//   - Tocar directamente un punto en el mapa.
//  En ambos casos obtenemos { lat, lng, address } y se lo pasamos al formulario
//  padre mediante onChange(). Usa Nominatim (OpenStreetMap) para convertir
//  texto ↔ coordenadas (geocodificación) sin necesidad de una API paga.
//
//  EL PUNTO Y EL CÍRCULO
//  El punto marca dónde se ENTREGA y dónde se DEVUELVE el auto. El círculo, que
//  es opcional, dice hasta dónde el dueño está dispuesto a acercárselo a quien
//  alquila. La devolución siempre vuelve al punto: si el círculo valiera para las
//  dos puntas, el auto podría terminar a veinte cuadras de donde vive el dueño y
//  eso nadie lo aceptaría.
//
//  Por defecto no hay círculo: la mayoría entrega en su casa y listo. El que
//  quiere acercarlo lo prende y elige hasta dónde.
//
//  Props:
//   · value        → { lat, lng, address } inicial
//   · onChange     → avisa la ubicación elegida
//   · radioKm      → hasta dónde lo acerca (0 = solo en el punto)
//   · onRadioKm    → avisa el radio elegido
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";

/**
 * Hasta dónde se puede estirar la entrega.
 *
 * 25km es cruzar el Gran Buenos Aires de punta a punta. Más que eso ya no es
 * "te lo acerco": es un viaje, y conviene que lo hablen por chat en vez de
 * dejarlo prometido en la publicación.
 */
const RADIO_MAXIMO_KM = 25;

const s = {
  wrap: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500,
    color: "var(--fw-text-2)", marginBottom: 6 },
  searchRow: { display: "flex", gap: 8, marginBottom: 10 },
  input: { flex: 1, padding: "11px 14px", borderRadius: 8,
    border: "1px solid var(--fw-border-2)", fontSize: 14, outline: "none" },
  searchBtn: { padding: "11px 16px", background: "var(--fw-blue)", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap" },
  suggestions: { background: "var(--fw-surface)", border: "1px solid var(--fw-border)",
    borderRadius: 8, marginBottom: 10, overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)" },
  suggestion: { padding: "10px 14px", fontSize: 13, cursor: "pointer",
    borderBottom: "1px solid var(--fw-line-soft)", color: "var(--fw-text-2)" },
  mapWrap: { borderRadius: 10, overflow: "hidden",
    border: "1px solid var(--fw-border)", height: 260 },
  hint: { fontSize: 12, color: "var(--fw-text-3)", marginTop: 8 },
  selectedBox: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-green-line)",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: "var(--fw-blue-text)", marginTop: 8, display: "flex",
    alignItems: "center", gap: 6 },
  entrega: { marginTop: 12, padding: "14px 16px", borderRadius: 10,
    border: "1px solid var(--fw-border)", background: "var(--fw-surface-2)" },
  entregaFila: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  entregaTexto: { fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginTop: 6 },
  entregaKm: { fontSize: 13, fontWeight: 700, color: "var(--fw-blue)",
    minWidth: 58, textAlign: "right" },
};

export default function LocationPicker({ value, onChange, radioKm = 0, onRadioKm }) {
  const { t: tr } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circuloRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [query, setQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(value || null);
  const debounceRef = useRef(null); // temporizador para no buscar en cada tecla

  // Carga la librería Leaflet (CSS + JS) una sola vez si todavía no está cargada.
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

  // Crea el mapa cuando Leaflet ya está listo. Al hacer clic en el mapa,
  // coloca el marcador y busca la dirección de ese punto (reverse geocoding).
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 12,
      // Ver la nota en MapView.jsx: sin esto, la rueda del mouse sobre el mapa
      // hace zoom en vez de bajar la página.
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng, map);
      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
  }, [mapLoaded]);

  // Coloca (o reubica) el marcador rojo en unas coordenadas y centra el mapa ahí.
  const placeMarker = (lat, lng, map) => {
    const L = window.L;
    const m = map || mapInstanceRef.current;
    if (!m) return;
    if (markerRef.current) m.removeLayer(markerRef.current);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:#e00;
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
      iconAnchor: [7, 7],
    });
    markerRef.current = L.marker([lat, lng], { icon }).addTo(m);
    m.setView([lat, lng], 15);
  };

  /**
   * Dibuja (o borra) el círculo de entrega alrededor del punto.
   *
   * Se redibuja entero en vez de moverlo: es una sola figura y así no hay dos
   * caminos que puedan quedar desincronizados —uno para crearla y otro para
   * actualizarla—, que es de donde salen los círculos fantasma.
   *
   * Cuando hay círculo, el mapa se acomoda para que se vea entero: con 20km de
   * radio y el zoom en 15 se ve un pedazo de borde y nada más, y no se entiende
   * qué zona abarca, que es justamente lo que el círculo viene a contar.
   */
  const dibujarCirculo = (lat, lng, km) => {
    const L = window.L;
    const m = mapInstanceRef.current;
    if (!m || !L) return;
    if (circuloRef.current) { m.removeLayer(circuloRef.current); circuloRef.current = null; }
    if (!km || km <= 0 || lat == null || lng == null) return;

    circuloRef.current = L.circle([lat, lng], {
      radius: km * 1000,
      color: "#0f6ce6", weight: 2, opacity: .8,
      fillColor: "#0f6ce6", fillOpacity: .12,
    }).addTo(m);
    m.fitBounds(circuloRef.current.getBounds(), { padding: [18, 18] });
  };

  // El círculo sigue al punto y al radio. Va en un efecto y no en el manejador
  // del clic porque el radio también cambia desde el control de abajo, y las dos
  // cosas tienen que dar el mismo dibujo.
  useEffect(() => {
    if (!mapLoaded || !selected) return;
    dibujarCirculo(selected.lat, selected.lng, radioKm);
  }, [mapLoaded, selected, radioKm]);

  // Reverse geocoding: dadas unas coordenadas, obtiene la dirección en texto.
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
      );
      const data = await res.json();
      const address = data.display_name?.split(",").slice(0, 3).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const result = { lat, lng, address };
      setSelected(result);
      setQuery(address);
      onChange(result);
    } catch {
      const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const result = { lat, lng, address };
      setSelected(result);
      setQuery(address);
      onChange(result);
    }
  };

  // Geocoding directo: busca direcciones a partir del texto escrito y las
  // ofrece como sugerencias.
  const searchAddress = async () => {
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Argentina")}&format=json&limit=5&accept-language=es`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  };

  // Se ejecuta al escribir. Usa "debounce": espera 600ms sin teclear antes de
  // buscar, para no disparar un pedido por cada letra.
  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => searchAddress(), 600);
  };

  // Cuando el usuario elige una sugerencia, marca esa ubicación y la confirma.
  const selectSuggestion = (s) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const address = s.display_name.split(",").slice(0, 3).join(", ");
    placeMarker(lat, lng);
    const result = { lat, lng, address };
    setSelected(result);
    setQuery(address);
    setSuggestions([]);
    onChange(result);
  };

  return (
    <div style={s.wrap}>
      <label style={s.label}>{tr("loc.title")}</label>
      <div style={s.searchRow}>
        <input
          style={s.input}
          placeholder={tr("loc.phSearch")}
          value={query}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchAddress()}
        />
        <button style={s.searchBtn} onClick={searchAddress}>
          {tr("loc.search")}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div style={s.suggestions}>
          {suggestions.map((s, i) => (
            <div key={i} style={s.suggestion}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              onClick={() => selectSuggestion(s)}>
              {s.display_name.split(",").slice(0, 4).join(", ")}
            </div>
          ))}
        </div>
      )}

      <div style={s.mapWrap} ref={mapRef} />

      {selected ? (
        <div style={s.selectedBox}>
          <strong>{tr("loc.selected")}</strong> {selected.address}
        </div>
      ) : (
        <div style={s.hint}>
          {tr("loc.hint")}
        </div>
      )}

      {/*
        HASTA DÓNDE LO ACERCÁS.

        Solo aparece con el punto ya elegido: sin punto no hay centro, y un
        control que no se puede usar todavía es ruido.

        Arranca apagado a propósito. Lo normal es entregar donde está el auto, y
        el que quiere ofrecer más lo prende; al revés —prendido por defecto— la
        publicación prometería algo que el dueño nunca decidió.
      */}
      {selected && onRadioKm && (
        <div style={s.entrega}>
          <label style={s.entregaFila}>
            <input
              type="checkbox"
              checked={radioKm > 0}
              onChange={(e) => onRadioKm(e.target.checked ? 5 : 0)}
              style={{ width: 16, height: 16, accentColor: "var(--fw-blue)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fw-text)" }}>
              {tr("loc.deliverTitle")}
            </span>
          </label>

          {radioKm > 0 ? (
            <>
              <div style={s.entregaTexto}>{tr("loc.deliverHelp")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <input
                  type="range" min={1} max={RADIO_MAXIMO_KM} step={1}
                  value={radioKm}
                  onChange={(e) => onRadioKm(Number(e.target.value))}
                  aria-label={tr("loc.deliverRadius")}
                  style={{ flex: 1, accentColor: "var(--fw-blue)", cursor: "pointer" }}
                />
                <span style={s.entregaKm}>{tr("loc.km", { n: radioKm })}</span>
              </div>
            </>
          ) : (
            // El que deja el control apagado también merece saber qué está
            // eligiendo: sin esta línea, "no tocar nada" es una decisión a ciegas.
            <div style={s.entregaTexto}>{tr("loc.deliverSamePlace")}</div>
          )}

          <div style={{ ...s.entregaTexto, marginTop: 10, fontWeight: 600, color: "var(--fw-text-2)" }}>
            {tr("loc.returnAlways")}
          </div>
        </div>
      )}
    </div>
  );
}