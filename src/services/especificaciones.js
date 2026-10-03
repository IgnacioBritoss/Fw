// ============================================================================
//  especificaciones — Buscar un auto en la tabla antes de preguntarle a la IA
// ----------------------------------------------------------------------------
//  El formulario de publicación completa las especificaciones técnicas con IA.
//  Para los autos que son el grueso de la flota argentina eso es preguntar algo
//  que ya sabemos, pagando una llamada, esperando unos segundos y aceptando que
//  la respuesta cambie entre una vez y la otra (ver data/autosArgentina.js).
//
//  Acá se busca primero en la tabla. Si está, se completa al instante. Si no
//  está, quien llama se va a la IA como siempre.
//
//  ── NO BUSCAR DE MÁS ──────────────────────────────────────────────────────
//
//  La tentación es hacer una búsqueda tolerante: parecidos, distancia de
//  edición, "empieza con". Está mal, y es la decisión importante de este
//  archivo.
//
//  Si la búsqueda se equivoca, el formulario se completa con los datos de OTRO
//  auto, y eso no se nota: son números plausibles en los campos correctos.
//  La persona confirma, publica, y queda un Corolla con el baúl de un Corolla
//  Cross. Un fallo de búsqueda, en cambio, cae en la IA y sigue todo como
//  antes.
//
//  O sea que los dos errores no cuestan lo mismo, ni de cerca. Por eso acá se
//  busca EXACTO sobre el texto normalizado, con una tabla de alias escrita a
//  mano para lo que la gente escribe de verdad ("VW", "hrv", "gol"), y nada
//  más. Ante la duda, no hay resultado.
// ============================================================================
// El `.js` del final NO sobra, aunque el resto del proyecto importe sin
// extensión. Eso lo resuelve Vite; las pruebas corren con `node --test`, que es
// Node pelado y exige la ruta completa. Es el primer servicio con pruebas que
// importa otro archivo nuestro, así que acá aparece por primera vez.
import { AUTOS, ALIAS_DE_MARCA, ALIAS_DE_MODELO } from "../data/autosArgentina.js";

/**
 * El texto con el que se compara: sin acentos, sin mayúsculas, sin espacios de
 * más y sin los signos que la gente mete al escribir un modelo ("HR-V", "Up!",
 * "C4 Cactus").
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

/*
  LO QUE DEVUELVE UN ALIAS TAMBIÉN SE NORMALIZA.

  Parece de más y no lo es: la tabla de alias está escrita como se escribe el
  auto ("t-cross", "hr-v"), y la comparación de abajo es contra el modelo de la
  tabla YA normalizado, donde el guion es un espacio. Sin pasar el resultado
  del alias por la misma función, "T-Cross" se traducía a "t-cross" y se
  comparaba contra "t cross": no coincidía nunca, y los dos únicos modelos con
  guion de la tabla se iban a la IA teniendo los datos acá.
*/
const conAlias = (tabla, clave) => normalizar(tabla?.[clave] ?? clave);

/** La marca como está escrita en la tabla, resolviendo los apodos. */
export function marcaCanonica(marca) {
  return conAlias(ALIAS_DE_MARCA, normalizar(marca));
}

/** El modelo como está escrito en la tabla, para esa marca. */
export function modeloCanonico(marca, modelo) {
  return conAlias(ALIAS_DE_MODELO[marcaCanonica(marca)], normalizar(modelo));
}

/**
 * El auto de la tabla, o null.
 *
 * `hasta: null` quiere decir que se sigue vendiendo, así que el rango llega
 * hasta hoy. Un año futuro NO entra: si alguien escribe 2030 es un error de
 * tipeo, y completarle el formulario con los datos de la generación actual
 * sería darle por buena la fecha.
 */
export function buscarEspecificaciones(marca, modelo, anio) {
  const año = Number(anio);
  if (!Number.isInteger(año)) return null;

  const laMarca = marcaCanonica(marca);
  const elModelo = modeloCanonico(marca, modelo);
  if (!laMarca || !elModelo) return null;

  const tope = new Date().getFullYear();

  return AUTOS.find((auto) =>
    normalizar(auto.marca) === laMarca &&
    normalizar(auto.modelo) === elModelo &&
    año >= auto.desde &&
    año <= (auto.hasta ?? tope)) ?? null;
}

/**
 * Lo que hay que escribir en el formulario, con los nombres de sus campos.
 *
 * Solo se devuelven los campos que tienen un valor: un `null` de la tabla
 * significa "no tenemos este dato con confianza", y eso NO es lo mismo que
 * cero. Si se devolviera igual, el formulario escribiría un vacío arriba de lo
 * que la persona ya hubiera cargado a mano.
 *
 * Los números van como texto porque los campos del formulario son `<input>` y
 * guardan texto; mandar un número hace que React avise de un campo que pasa de
 * no controlado a controlado.
 */
export function comoFormulario(auto) {
  if (!auto) return {};
  const campos = {
    category: auto.categoria,
    fuel: auto.combustible,
    seats: auto.asientos,
    doors: auto.puertas,
    engineDisplacementCC: auto.cc,
    horsePower: auto.hp,
    trunkCapacityLiters: auto.baulL,
    fuelConsumptionLitersPer100Km: auto.consumoL100,
    weightKg: auto.pesoKg,
  };
  return Object.fromEntries(
    Object.entries(campos)
      .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "")
      .map(([clave, valor]) => [clave, typeof valor === "number" ? String(valor) : valor]),
  );
}

/** Cuántos autos hay cargados. Lo usa la pantalla de ajustes para mostrarlo. */
export const CUANTOS_AUTOS = AUTOS.length;
