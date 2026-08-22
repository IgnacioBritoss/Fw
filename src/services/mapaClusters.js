// ============================================================================
//  mapaClusters — Juntar los puntos que quedan encima al alejar el mapa
// ----------------------------------------------------------------------------
//  POR QUÉ: con pocos autos publicados el mapa se ve bien, pero apenas hay
//  varios en la misma zona los pines se pisan entre sí: alejando un poco,
//  Palermo entero es una mancha azul y no se puede tocar ninguno. Es el problema
//  que resuelven todas las apps con mapa —Airbnb, Booking, Mercado Libre— de la
//  misma forma: los que están cerca se muestran como UNO con el número adentro,
//  y al acercarse se vuelven a abrir.
//
//  CÓMO SE DECIDE QUÉ ESTÁ "CERCA": en píxeles de la pantalla, no en kilómetros.
//  Dos autos a 500 metros están encima a zoom de ciudad y bien separados a zoom
//  de barrio: lo que molesta no es la distancia real sino que los círculos se
//  toquen en pantalla. Por eso se proyecta cada punto a la posición que ocupa en
//  el zoom actual y se agrupa por esa distancia. Y por eso hay que volver a
//  agrupar cada vez que cambia el zoom.
//
//  NO USA NINGUNA LIBRERÍA. Existe leaflet.markercluster, pero es un archivo más
//  para descargar y una dependencia más para mantener, y lo que hace falta acá
//  entra en treinta líneas.
// ============================================================================

/** A qué distancia en pantalla dos puntos se consideran el mismo montón. */
const RADIO_PX = 64;

/**
 * Agrupa los autos según cómo caen en pantalla con el zoom que tiene el mapa
 * puesto en este momento.
 *
 * Devuelve una lista de grupos. Un grupo de uno es un auto suelto; uno de varios
 * es el montón que se dibuja con el número.
 *
 * Es un recorrido simple: se toma el primero sin agrupar, se le pegan todos los
 * que le caen cerca, y se sigue con el que quedó. No busca el agrupamiento
 * óptimo —eso es un problema bastante más caro— y para esto no hace falta: lo
 * que importa es que no queden dos círculos pisándose, y esto lo garantiza.
 */
export function agruparPorPantalla(map, autos, radioPx = RADIO_PX) {
  const conLugar = autos.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  if (!map || conLugar.length === 0) return [];

  const puntos = conLugar.map((auto) => ({
    auto,
    xy: map.latLngToLayerPoint([auto.lat, auto.lng]),
  }));

  const grupos = [];
  const yaEstan = new Set();

  for (let i = 0; i < puntos.length; i++) {
    if (yaEstan.has(i)) continue;
    yaEstan.add(i);
    const grupo = [puntos[i].auto];

    for (let j = i + 1; j < puntos.length; j++) {
      if (yaEstan.has(j)) continue;
      if (puntos[i].xy.distanceTo(puntos[j].xy) <= radioPx) {
        yaEstan.add(j);
        grupo.push(puntos[j].auto);
      }
    }
    grupos.push(grupo);
  }
  return grupos;
}

/**
 * El centro de un grupo, que es donde se dibuja el montón.
 *
 * Promedio simple de las coordenadas. Con puntos que están todos a menos de
 * cien metros —que es lo que significa estar en el mismo montón— alcanza y
 * sobra; las fórmulas que tienen en cuenta la curvatura de la Tierra son para
 * distancias de otro orden.
 */
export function centroDe(grupo) {
  const n = grupo.length;
  return [
    grupo.reduce((s, c) => s + c.lat, 0) / n,
    grupo.reduce((s, c) => s + c.lng, 0) / n,
  ];
}

/**
 * El dibujo del montón: un círculo azul con la cantidad adentro.
 *
 * Crece con lo que contiene, pero poco y con tope: si el tamaño fuera
 * proporcional, un montón de cincuenta autos taparía media pantalla. Lo que
 * tiene que comunicar es "acá hay varios", y el número exacto ya está escrito.
 */
export function htmlDelMonton(cantidad) {
  const lado = Math.min(52, 34 + String(cantidad).length * 6);
  return `<div style="
    width:${lado}px;height:${lado}px;border-radius:50%;
    background:#0f6ce6;border:3px solid #fff;
    box-shadow:0 3px 10px rgba(0,0,0,.32);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:800;font-size:13px;font-family:sans-serif;
    cursor:pointer;">${cantidad}</div>`;
}
