import { useEffect, useRef } from "react";

export default function MapView({ cars, onCarClick, height = "500px" }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (instanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom: 12,
      zoomControl: true,
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

  useEffect(() => {
    const L = window.L;
    if (!L || !instanceRef.current) return;

    const map = instanceRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    cars.forEach(car => {
      if (!car.lat || !car.lng) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: #1d4ed8;
          color: #fff;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
          border: 2px solid #fff;
          cursor: pointer;
        ">$${Number(car.price_per_day).toLocaleString()}</div>`,
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
              : "🚙"}
          </div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">
            ${car.brand} ${car.model} ${car.year}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">
            📍 ${car.location}
          </div>
          <div style="font-weight:700;font-size:16px;color:#1d4ed8">
            $${Number(car.price_per_day).toLocaleString()}<span style="font-weight:400;font-size:12px;color:#6b7280">/día</span>
          </div>
          ${car.rating ? `<div style="font-size:12px;color:#f59e0b;margin-top:4px">★ ${car.rating}</div>` : ""}
        </div>
      `);

      marker.bindPopup(popup);
      marker.addTo(map);
    });
  }, [cars]);

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