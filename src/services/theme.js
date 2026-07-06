// Modo oscuro global. Como la app usa estilos inline con colores fijos,
// aplicamos un filtro de inversión a nivel documento (invert + hue-rotate para
// mantener los azules como azules) y re-invertimos imágenes, videos y el mapa
// para que se vean normales. Es liviano y cubre toda la UI sin tocar cada estilo.

const STYLE_ID = "fw-dark-style";

// Inserta una sola vez en el <head> la etiqueta <style> con las reglas del modo
// oscuro. Si ya existe, no hace nada (evita duplicados).
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    html.fw-dark { background: #0f1420 !important; }
    html.fw-dark, html.fw-dark body { background-color: #0f1420; }
    html.fw-dark { filter: invert(1) hue-rotate(180deg); }
    html.fw-dark img,
    html.fw-dark video,
    html.fw-dark canvas,
    html.fw-dark [data-no-invert],
    html.fw-dark .leaflet-container,
    html.fw-dark .leaflet-tile { filter: invert(1) hue-rotate(180deg); }
  `;
  document.head.appendChild(el);
}

// Activa (on=true) o desactiva el modo oscuro agregando/quitando la clase
// "fw-dark" en el <html>, que es la que dispara el filtro de inversión.
export function applyDarkMode(on) {
  ensureStyle();
  const root = document.documentElement;
  if (on) root.classList.add("fw-dark");
  else root.classList.remove("fw-dark");
}

// Lee la preferencia guardada y la aplica (para el arranque de la app).
export function initTheme() {
  let dark = false;
  try { dark = !!(JSON.parse(localStorage.getItem("fw_prefs") || "{}").dark); } catch { dark = false; }
  applyDarkMode(dark);
}