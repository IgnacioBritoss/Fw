// ============================================================================
//  asistente.js — Qué le contestamos nosotros a Wili, y qué le dejamos a la IA
// ----------------------------------------------------------------------------
//  Dos cosas, las dos chicas:
//
//   1. RECONOCER una pregunta que ya tenemos contestada, para no mandarla a la
//      IA. Las respuestas y los conjuntos de palabras están en
//      src/data/preguntasWili.js, con el detalle de por qué.
//
//   2. ORDENAR los botones de preguntas sugeridas por lo que más se pregunta.
//
//  ── SOBRE LO SEGUNDO, Y SIN VENDERLO DE MÁS ───────────────────────────────
//
//  La cuenta es de ESTE navegador y de esta cuenta. No es "lo que más preguntan
//  los usuarios del sitio": para eso haría falta guardarlo en el servidor, que
//  hoy no tiene dónde (no hay tabla de preguntas en el backend). Así que los
//  botones se acomodan a lo que viene preguntando esta persona, que igual es
//  útil —el que alquila pregunta otras cosas que el que publica— pero NO es un
//  ranking del sitio y no se muestra como si lo fuera.
//
//  ── Y SOLO SE CUENTAN LAS QUE TENEMOS CONTESTADAS ─────────────────────────
//
//  No se cuenta lo que la gente escribe: se cuenta qué entrada de la tabla le
//  tocó. Si se contara el texto suelto, los botones se llenarían de "hola",
//  "probando" y preguntas sin respuesta propia, que es justo lo que no puede ir
//  en un botón: lo tocás y la IA contesta cualquier cosa.
// ============================================================================
import { normalizar } from "./texto.js";
import { PREGUNTAS, BOTONES } from "../data/preguntasWili.js";

/**
 * Cuántas veces hay que preguntar algo para que suba a los botones.
 *
 * Con uno alcanzaría, y es justamente lo que no se quiere: una pregunta hecha
 * una sola vez —de curiosidad, o de rebote— desplazaría a una de las cuatro
 * que sirven siempre. Dos ya es una persona que volvió sobre el mismo tema.
 */
export const REPETICIONES_PARA_SUBIR = 2;

const clave = (usuarioId) => `fw_wili_preguntas_${usuarioId || "anon"}`;

/*
  Las palabras de `claves` pasan por la MISMA normalización que la pregunta.

  Están escritas como se escriben ("daño", "seña") y la pregunta llega sin
  acentos ni eñes, así que sin esto no coincidían nunca y la tabla entera no
  servía para nada escrito a mano.
*/
const clavesNormalizadas = PREGUNTAS.map((p) => ({
  entrada: p,
  conjuntos: (p.claves || []).map((conjunto) => conjunto.map(normalizar).filter(Boolean)),
}));

/** ¿Alguna palabra de la pregunta empieza con esta clave? */
const estaEnLaPregunta = (palabras, clavePalabra) =>
  palabras.some((palabra) => palabra.startsWith(clavePalabra));

/**
 * La entrada de la tabla que corresponde a lo que la persona escribió, o null.
 *
 * Reconoce por conjuntos de palabras: alcanza con que UN conjunto de la entrada
 * entre completo. Las palabras se comparan por el principio, así que "cancel"
 * reconoce "cancelo", "cancelar" y "cancelación", que son la misma pregunta.
 *
 * DOS COINCIDENCIAS NO SE DESEMPATAN. Si lo que escribió entra en dos entradas
 * —"¿me devuelven la garantía si cancelo?" entra en garantía y en cancelación—
 * contesta la IA, que puede hablar de las dos cosas a la vez. Elegir una sería
 * contestar media pregunta con cara de respuesta completa.
 */
export function respuestaGuardada(texto) {
  const palabras = normalizar(texto).split(" ").filter(Boolean);
  if (!palabras.length) return null;

  const coinciden = clavesNormalizadas.filter(({ conjuntos }) =>
    conjuntos.some((conjunto) =>
      conjunto.length > 0 && conjunto.every((c) => estaEnLaPregunta(palabras, c))));

  return coinciden.length === 1 ? coinciden[0].entrada : null;
}

/** La entrada con ese id, para cuando se toca un botón y no hay nada que adivinar. */
export function preguntaPorId(id) {
  return PREGUNTAS.find((p) => p.id === id) || null;
}

/** Lo contado hasta ahora. Un depósito que no se puede leer cuenta como vacío. */
export function cuentaGuardada(usuarioId, deposito = globalThis.localStorage) {
  try {
    const crudo = deposito?.getItem(clave(usuarioId));
    const datos = crudo ? JSON.parse(crudo) : null;
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return {};
    // Se limpia al leer: una clave que ya no existe en la tabla, o un valor que
    // no es un número, no tiene por qué llegar al orden de los botones.
    const limpio = {};
    for (const [id, veces] of Object.entries(datos)) {
      if (preguntaPorId(id) && Number.isFinite(Number(veces)) && Number(veces) > 0) {
        limpio[id] = Number(veces);
      }
    }
    return limpio;
  } catch {
    return {};
  }
}

/**
 * Suma uno a una pregunta y devuelve la cuenta nueva.
 *
 * Si el depósito se niega a escribir —modo privado, sin lugar— no se tira el
 * error: el asistente tiene que contestar igual. Lo único que se pierde es el
 * orden de los botones, que es lo menos importante de la pantalla.
 */
export function contarPregunta(id, usuarioId, deposito = globalThis.localStorage) {
  if (!preguntaPorId(id)) return cuentaGuardada(usuarioId, deposito);
  const cuenta = cuentaGuardada(usuarioId, deposito);
  const nueva = { ...cuenta, [id]: (cuenta[id] || 0) + 1 };
  try {
    deposito?.setItem(clave(usuarioId), JSON.stringify(nueva));
  } catch { /* sin lugar para guardar: la respuesta sale igual */ }
  return nueva;
}

/**
 * Cuántos de los cuatro botones quedan reservados para las preguntas de
 * siempre, pase lo que pase.
 *
 * Las cuatro de siempre son las de plata, daños, cancelación y documentos: lo
 * que alguien necesita saber ANTES de entregar o de retirar un auto. Si el
 * orden fuera puro ranking, a una persona que ya preguntó varias veces otras
 * cosas se le llenaban los cuatro botones con las otras, y esos cuatro temas
 * dejaban de estar ofrecidos. Dos y dos: la mitad se acomoda a la persona y la
 * mitad sigue siendo la ayuda que la app decide ofrecer.
 */
export const BOTONES_RESERVADOS = 2;

/**
 * Las preguntas que van en los botones, en orden.
 *
 * Adelante las más preguntadas por esta persona —hasta donde dejan los botones
 * reservados— y atrás las de siempre, también ordenadas por lo más preguntado y
 * desempatadas por el orden de la tabla, que es a propósito: dos listas que se
 * arman igual no se reacomodan de una vez a la otra sin motivo.
 *
 * Una pregunta que no es de las de siempre sube solo si se preguntó al menos
 * REPETICIONES_PARA_SUBIR veces.
 */
export function preguntasDeLosBotones(cuenta = {}, cuantas = BOTONES) {
  const veces = (p) => Number(cuenta[p.id] || 0);
  const orden = new Map(PREGUNTAS.map((p, i) => [p.id, i]));
  const porRanking = (a, b) => veces(b) - veces(a) || orden.get(a.id) - orden.get(b.id);

  const deSiempre = PREGUNTAS.filter((p) => p.enLosBotones).slice().sort(porRanking);
  const subidas = PREGUNTAS
    .filter((p) => !p.enLosBotones && veces(p) >= REPETICIONES_PARA_SUBIR)
    .sort(porRanking)
    .slice(0, Math.max(0, cuantas - BOTONES_RESERVADOS));

  return [...subidas, ...deSiempre].slice(0, cuantas);
}
