// ============================================================================
//  rank.js — En qué rango cae una persona según sus reseñas reales
// ----------------------------------------------------------------------------
//  El cálculo vive acá, separado del badge que lo dibuja (components/RankBadge),
//  por dos razones: se puede usar sin dibujar nada —por ejemplo para ordenar una
//  lista— y un archivo que exporta un componente de React no debe exportar
//  también funciones sueltas (rompe la recarga en caliente de Vite).
//
//  LOS UMBRALES piden cantidad Y promedio: veinte reseñas de 3 estrellas no son
//  un rango alto. Y el rango nunca baja de "bronce" mientras haya al menos una
//  reseña: no se castiga a alguien por tener pocas.
//
//  `metal` son los tres tonos con los que se dibuja el escudo: la cara clara, la
//  oscura y el borde. Tres tonos planos del mismo color alcanzan para que una
//  figura plana se lea como una pieza de metal, sin usar un solo degradado.
//  El nombre del rango va SIEMPRE escrito al lado del escudo, así que la
//  información no depende del color (impresión, daltonismo).
// ============================================================================

export const TIERS = [
  {
    key: "platinum", minCount: 30, minAverage: 4.8, color: "#0b55c0", bg: "#f5f8ff",
    // Más claro y más frío que la plata, y el único con destello: son los dos
    // grises del juego y sin eso se confunden.
    metal: { light: "#dce7f5", dark: "#9db4d2", rim: "#7d95b6", shine: true },
  },
  {
    key: "gold", minCount: 15, minAverage: 4.5, color: "#b7791f", bg: "#fffdf5",
    metal: { light: "#e8bd48", dark: "#c1901a", rim: "#9a7210" },
  },
  {
    key: "silver", minCount: 5, minAverage: 4.0, color: "#64748b", bg: "#f8fafc",
    metal: { light: "#b4bfcb", dark: "#8b97a5", rim: "#6d7986" },
  },
  {
    key: "bronze", minCount: 1, minAverage: 0, color: "#9a6234", bg: "#fdfaf7",
    metal: { light: "#c98a52", dark: "#a05f2b", rim: "#7d4a20" },
  },
];

/**
 * Sin ninguna reseña no hay rango.
 *
 * Sin `metal`: el escudo se dibuja hueco y con un signo de pregunta adentro. Es
 * a propósito. Una pieza sin material todavía no se ganó, y el "?" dice que el
 * rango está por verse en vez de dejar un escudo vacío que se lee como un error
 * de dibujo. El gris es oscuro y no claro: tiene que verse, no esconderse.
 */
export const NEW_TIER = { key: "new", color: "#6b7280", bg: "#fafafa", metal: null };

/** En qué rango cae alguien con `count` reseñas y `average` de promedio. */
export function rankOf(count = 0, average = null) {
  const reviews = Number(count) || 0;
  if (reviews < 1) return NEW_TIER;
  const avg = average === null || average === undefined ? 0 : Number(average);
  return TIERS.find(t => reviews >= t.minCount && avg >= t.minAverage) ?? TIERS[TIERS.length - 1];
}

/** El próximo rango y cuántas reseñas pide, o null si ya está en el más alto. */
export function nextRank(count = 0, average = null) {
  const current = rankOf(count, average);
  if (current.key === "platinum") return null;
  const index = TIERS.findIndex(t => t.key === current.key);
  // El siguiente hacia arriba en la lista (TIERS va de mayor a menor).
  const target = index === -1 ? TIERS[TIERS.length - 1] : TIERS[index - 1];
  return target ? { key: target.key, target: target.minCount } : null;
}
