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
//  `bars` es cuántas barras se dibujan dentro del escudo, para que el rango se
//  lea también sin color (impresión, daltonismo).
// ============================================================================

export const TIERS = [
  { key: "platinum", bars: 4, minCount: 30, minAverage: 4.8, color: "#1d4ed8", bg: "#f5f8ff" },
  { key: "gold", bars: 3, minCount: 15, minAverage: 4.5, color: "#b7791f", bg: "#fffdf5" },
  { key: "silver", bars: 2, minCount: 5, minAverage: 4.0, color: "#64748b", bg: "#f8fafc" },
  { key: "bronze", bars: 1, minCount: 1, minAverage: 0, color: "#9a6234", bg: "#fdfaf7" },
];

/** Sin ninguna reseña no hay rango: se dice que todavía no hay. */
export const NEW_TIER = { key: "new", bars: 0, color: "#9ca3af", bg: "#fafafa" };

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
