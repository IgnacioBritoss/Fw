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
//  Props: value (ubicación inicial), onChange (avisa la ubicación elegida).
// ============================================================================
import { useEffect, useRef, useState } from "react";

const s = {
  wrap: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500,
    color: "#374151", marginBottom: 6 },
  searchRow: { display: "flex", gap: 8, marginBottom: 10 },
  input: { flex: 1, padding: "11px 14px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 14, outline: "none" },
  searchBtn: { padding: "11px 16px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap" },
  suggestions: { background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 8, marginBottom: 10, overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)" },
  suggestion: { padding: "10px 14px", fontSize: 13, cursor: "pointer",
    borderBottom: "1px solid #f3f4f6", color: "#374151" },
  mapWrap: { borderRadius: 10, overflow: "hidden",
    border: "1px solid #e5e7eb", height: 260 },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  selectedBox: { background: "#eff6ff", border: "1px solid #86efac",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: "#1e40af", marginTop: 8, display: "flex",
    alignItems: "center", gap: 6 },
};

export default function LocationPicker({ value, onChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
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
      <label style={s.label}>Ubicación del auto</label>
      <div style={s.searchRow}>
        <input
          style={s.input}
          placeholder="Escribí la dirección, barrio o zona..."
          value={query}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchAddress()}
        />
        <button style={s.searchBtn} onClick={searchAddress}>
          Buscar
        </button>
      </div>

      {suggestions.length > 0 && (
        <div style={s.suggestions}>
          {suggestions.map((s, i) => (
            <div key={i} style={s.suggestion}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              onClick={() => selectSuggestion(s)}>
              📍 {s.display_name.split(",").slice(0, 4).join(", ")}
            </div>
          ))}
        </div>
      )}

      <div style={s.mapWrap} ref={mapRef} />

      {selected ? (
        <div style={s.selectedBox}>
          📍 <strong>Ubicación seleccionada:</strong> {selected.address}
        </div>
      ) : (
        <div style={s.hint}>
          Buscá la dirección arriba o tocá directamente en el mapa para marcar la ubicación exacta.
        </div>
      )}
    </div>
  );
}