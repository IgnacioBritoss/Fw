// ============================================================================
//  texto.js — Dejar un texto escrito por una persona en algo comparable
// ----------------------------------------------------------------------------
//  Vive solo porque ahora lo necesitan dos cosas que no se parecen en nada:
//
//   · el autocompletado de especificaciones, para que "Citroën C4 Cactus" y
//     "citroen c4 cactus" sean el mismo auto (services/especificaciones.js);
//   · el asistente, para reconocer una pregunta que ya tenemos contestada
//     (services/asistente.js).
//
//  Estaba adentro de especificaciones.js. El problema de dejarlo ahí es que
//  especificaciones.js importa la tabla de los ciento cuarenta autos, y el
//  asistente está montado en TODAS las pantallas: importarlo desde ahí metía la
//  tabla entera en el paquete que se descarga de entrada, para usar nueve
//  líneas. Acá no arrastra nada.
// ============================================================================

/**
 * El texto con el que se compara: sin acentos, sin mayúsculas, sin espacios de
 * más y sin los signos que la gente mete al escribir ("HR-V", "Up!", "¿cómo?").
 *
 * Los guiones se vuelven espacios en vez de desaparecer: sin eso "hr-v" y
 * "hrv" terminan igual que "h r v", y peor, "t-cross" se confundiría con
 * "tcross" por un camino distinto al de la tabla de alias, que es la que tiene
 * que decidir esas cosas y no un accidente de normalización.
 */
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // saca los acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
