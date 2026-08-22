// ============================================================================
//  MapView — Mapa interactivo con los autos (usa Leaflet + OpenStreetMap)
// ----------------------------------------------------------------------------
//  Dibuja un mapa y coloca un "pin" con el precio sobre cada auto que tenga
//  coordenadas. Al hacer clic en un pin se abre un globo (popup) con la foto y
//  los datos; al clickearlo, se avisa al padre con onCarClick(id).
//
//  Leaflet no es de React: se maneja "a mano" con useRef y useEffect.
//  Props: cars (lista de autos), onCarClick (callback), height (alto del mapa).
// ============================================================================
import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/core";
import { useCurrency } from "../context/CurrencyContext";

export default function MapView({ cars, onCarClick, height = "500px" }) {
  // El globo del pin se arma con HTML a mano (Leaflet no es de React), así que la
  // traducción se resuelve acá y se interpola.
  const { t: tr } = useI18n();
  const perDayLabel = tr("common.perDay");
  // El precio, en la moneda elegida. Como el globo se arma con texto,
  // se resuelve acá y se interpola ya escrito.
  const { precio } = useCurrency();
  const mapRef = useRef(null);       // el <div> donde se dibuja el mapa
  const instanceRef = useRef(null);  // la instancia de Leaflet ya creada

  // 1) Crea el mapa UNA sola vez (centrado en Buenos Aires) y agrega las
  //    "baldosas" (tiles) de OpenStreetMap. Al desmontar, destruye el mapa.
  useEffect(() => {
    if (instanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 12,
      zoomControl: true,
      // El mapa vive dentro de una página que se scrollea: si la rueda del
      // mouse hace zoom al pasar por encima, para bajar la página hay que
      // esquivarlo (mover el mouse afuera del mapa, típicamente a un costado).
      // Se puede seguir haciendo zoom con los botones +/- o con dos dedos.
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    instanceRef.current = map;

    return () => {
      map.remove();
      instanceRef.current = null;
    };
  }, []);

  // 2) Cada vez que cambia la lista de autos: borra los pines viejos y crea uno
  //    nuevo por cada auto, con su precio visible y un popup con foto y datos.
  useEffect(() => {
    const L = window.L;
    if (!L || !instanceRef.current) return;

    const map = instanceRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    cars.forEach(car => {
      if (!car.lat || !car.lng) return; // sin coordenadas no se puede ubicar

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: #0b55c0;
          color: #fff;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
          border: 2px solid #fff;
          cursor: pointer;
        ">${precio(car.price_per_day)}</div>`,
        iconAnchor: [30, 16],
      });

      const marker = L.marker([car.lat, car.lng], { icon });

      const popup = L.popup({
        closeButton: false,
        className: "fw-popup",
        maxWidth: 240,
      }).setContent(`
        <div style="padding:4px;cursor:pointer" onclick="window.fwOpenCar('${car.id}')">
          <div style="
            width:100%;height:120px;background:#e5e7eb;border-radius:8px;
            overflow:hidden;margin-bottom:10px;display:flex;align-items:center;
            justify-content:center;font-size:40px;
          ">
            ${car.photos?.length > 0
              ? `<img src="${car.photos[0]}" style="width:100%;height:100%;object-fit:cover"/>`
              : "—"}
          </div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">
            ${car.brand} ${car.model} ${car.year}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">
            ${car.location}
          </div>
          <div style="font-weight:700;font-size:16px;color:#0b55c0">
            ${precio(car.price_per_day)}<span style="font-weight:400;font-size:12px;color:#6b7280">${perDayLabel}</span>
          </div>
          ${car.rating ? `<div style="font-size:12px;color:#f59e0b;margin-top:4px">★ ${car.rating}</div>` : ""}
        </div>
      `);

      marker.bindPopup(popup);
      marker.addTo(map);
    });
    // `precio` cambia al elegir otra moneda: los pines llevan el precio
    // escrito adentro, así que hay que volver a dibujarlos.
  }, [cars, perDayLabel, precio]);

  // 3) El popup del mapa es HTML "plano" (no React), así que exponemos una
  //    función global window.fwOpenCar para que su onclick pueda avisar a React.
  useEffect(() => {
    window.fwOpenCar = (id) => {
      if (onCarClick) onCarClick(id);
    };
    return () => { delete window.fwOpenCar; };
  }, [onCarClick]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
      <div ref={mapRef} style={{ height, width: "100%", borderRadius: 12,
        overflow: "hidden", zIndex: 0 }} />
    </>
  );
}