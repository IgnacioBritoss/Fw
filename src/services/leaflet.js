// ============================================================================
//  leaflet.js — Cargar la librería del mapa UNA sola vez
// ----------------------------------------------------------------------------
//  Leaflet no viene con la app: se baja de unpkg con un <script> y se cuelga de
//  `window.L`. Cuatro pantallas lo necesitan (el inicio, la búsqueda, el
//  selector de ubicación y el mapa suelto), y cada una lo pedía por su cuenta
//  con la misma guarda:
//
//      if (window.L) return;
//      document.head.appendChild(script);
//
//  ESA GUARDA NO ALCANZA, y falla justo cuando importa. Solo sabe si Leaflet YA
//  TERMINÓ de cargar; no sabe si hay una carga EN CAMINO. Dos componentes que se
//  montan en el mismo instante ven los dos `window.L` vacío y agregan los dos su
//  <script>. El navegador pide el archivo una vez —queda en caché— pero lo
//  EJECUTA dos veces, y la segunda pisa `window.L` con una librería nueva.
//
//  A partir de ahí hay dos Leaflet en la misma página, y los objetos de uno no
//  son reconocidos por el otro: adentro de la librería hay comprobaciones de
//  `instanceof`, y un círculo creado con el primero deja de ser un círculo para
//  el segundo. Rompe con un "Cannot read properties of undefined" que no dice
//  nada, y lo que se ve es que tocar un pin del mapa no abre nada.
//
//  Acá la promesa se guarda en el módulo, así que la segunda llamada NO agrega
//  otro <script>: espera a la primera. Un módulo se evalúa una sola vez por
//  página, que es exactamente la garantía que hacía falta.
// ============================================================================

const VERSION = "1.9.4";
const BASE = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet`;

/**
 * DE DÓNDE SALEN LAS BALDOSAS DEL MAPA, ESCRITO UNA SOLA VEZ.
 *
 * Estaba escrito cuatro veces, una en cada pantalla con mapa, y por eso se
 * separaron: tres usaban OpenStreetMap y la búsqueda había quedado con un
 * servidor de CARTO. Ese servidor pasó a pedir una clave, así que el mapa de la
 * búsqueda dejó de cargar y mostraba las baldosas con "API KEY REQUIRED"
 * escrito encima. Los pines aparecían igual —son nuestros— y por eso se veía
 * medio mapa y medio cartel.
 *
 * Acá hay una sola dirección. Si alguna vez hay que cambiar de proveedor, se
 * cambia en un lugar y las cuatro pantallas van juntas.
 */
export const BALDOSAS = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Lo que pide la licencia de OpenStreetMap que se muestre en el mapa. */
export const ATRIBUCION = "© OpenStreetMap";

/**
 * Pone la capa de baldosas en un mapa ya creado.
 *
 * Es una línea, pero existe para que agregar un mapa nuevo no sea otra vez
 * copiar una dirección de otro archivo, que es exactamente como se llegó acá.
 */
export function ponerBaldosas(L, map) {
  return L.tileLayer(BALDOSAS, { attribution: ATRIBUCION }).addTo(map);
}

/** La carga en curso (o terminada). Null hasta que alguien la pide. */
let promesa = null;

/**
 * Deja `window.L` listo y lo devuelve.
 *
 * Se puede llamar todas las veces que haga falta y desde donde sea: la primera
 * baja la librería y las demás esperan a esa misma.
 */
export function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (promesa) return promesa;

  promesa = new Promise((listo, fallo) => {
    // El CSS se agrega una sola vez. Sin él el mapa se dibuja pero los mosaicos
    // quedan apilados en una columna, que es peor que no tener mapa.
    if (!document.querySelector("link[data-fw-leaflet]")) {
      const hoja = document.createElement("link");
      hoja.rel = "stylesheet";
      hoja.href = `${BASE}.css`;
      hoja.dataset.fwLeaflet = "1";
      document.head.appendChild(hoja);
    }

    const script = document.createElement("script");
    script.src = `${BASE}.js`;
    script.async = true;
    script.dataset.fwLeaflet = "1";
    script.onload = () => listo(window.L);
    script.onerror = () => {
      /*
        Se suelta la promesa para que un intento posterior vuelva a probar. Si
        se quedara guardada, un corte de un segundo dejaría la app sin mapa
        hasta recargar la página.
      */
      promesa = null;
      fallo(new Error("No se pudo cargar Leaflet"));
    };
    document.head.appendChild(script);
  });

  return promesa;
}
