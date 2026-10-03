// ============================================================================
//  comparables.js — Cuánto se cobra ACÁ por un auto como el que se publica
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE.
//
//  El botón "Sugerir con IA" del formulario de publicar le pide a un modelo de
//  lenguaje que estime cuánto vale el auto usado y de ahí saque el alquiler por
//  día. Funciona, pero tiene un problema que no se arregla con un prompt mejor:
//  EL MODELO NO SABE LOS PRECIOS DE HOY. Fue entrenado hasta una fecha, los
//  precios acá están en pesos argentinos, y entre esa fecha y hoy el número
//  cambió varias veces. Es la pregunta que peor le queda: no es razonamiento,
//  es un dato de mercado del mes en curso.
//
//  Y ese dato lo tenemos nosotros. Si en FreeWheel ya hay tres Cronos de 2020 a
//  2022 publicados, la mediana de esos tres precios es mejor que cualquier
//  estimación: son pesos de hoy, del mismo mercado, puestos por dueños que
//  decidieron a qué precio prestan su auto. No hay que estimar nada.
//
//  Así que el precio se busca primero acá y la IA queda para el auto del que no
//  hay con qué comparar. Es la misma idea que la tabla de especificaciones: lo
//  que podemos asegurar nosotros no se le pregunta a un modelo.
//
//  ── TRES NIVELES, Y NO VALEN LO MISMO ─────────────────────────────────────
//
//   · "mismoModelo"         mismo modelo, año parecido (±2). Esto FIJA el
//                           precio: es el mismo auto que el que se publica.
//   · "mismoModeloOtroAnio" mismo modelo, cualquier año. También fija, con la
//                           aclaración de los años que entraron.
//   · "mismaCategoria"      autos del mismo tipo y años parecidos. NO fija
//                           nada: un SUV no es otro SUV. Sirve de contexto y de
//                           control: con esto alcanza para darse cuenta de que
//                           el modelo contestó en dólares.
//
//  ── POR QUÉ LA MEDIANA Y NO EL PROMEDIO ───────────────────────────────────
//
//  Un auto publicado a un precio disparatado —por error de tipeo, o porque el
//  dueño no quiere alquilarlo de verdad— arrastra el promedio y no mueve la
//  mediana. Con tres autos a $40.000, $45.000 y $900.000, el promedio da
//  $328.000 y la mediana $45.000. La mediana es la respuesta.
//
//  ── Y POR QUÉ TRES COMO MÍNIMO ────────────────────────────────────────────
//
//  Con uno solo se estaría copiando el precio de un vecino, que puede estar
//  equivocado; y con dos no hay mediana que proteja. Abajo de tres se muestran
//  igual, como referencia, pero no se usan para llenar el campo.
// ============================================================================
import { PISO_POR_DIA, TECHO_POR_DIA } from "./precio.js";
import { marcaCanonica, modeloCanonico } from "./especificaciones.js";

/** Cuántos autos parecidos hacen falta para animarse a usar su precio. */
export const MUESTRA_MINIMA = 3;

/** Cuántos años para arriba y para abajo cuentan como "el mismo auto". */
export const ANIOS_CERCA = 2;

/** Lo mismo, pero para los autos que solo comparten la categoría. */
export const ANIOS_CERCA_CATEGORIA = 3;

/**
 * El valor del medio de una lista de números.
 *
 * Con una cantidad par se promedian los dos del medio, que es la definición de
 * siempre. Devuelve null con la lista vacía, para que quien llama distinga
 * "no hay" de "da cero".
 */
export function mediana(numeros) {
  const utiles = (numeros || []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!utiles.length) return null;
  const medio = Math.floor(utiles.length / 2);
  return utiles.length % 2
    ? utiles[medio]
    : Math.round((utiles[medio - 1] + utiles[medio]) / 2);
}

/** El precio por día de un auto, con los dos nombres que puede tener el campo. */
const precioDe = (car) => Number(car?.price_per_day ?? car?.pricePerDay ?? 0);

const anioDe = (car) => Number(car?.year);

/**
 * Los autos de la lista que sirven para comparar precios.
 *
 * Se descartan, y cada uno por su motivo:
 *  · los autos de ejemplo (`isMock`), que tienen precios escritos a mano para
 *    que la pantalla no se vea vacía y no son precios de nadie;
 *  · los pausados, porque un auto que el dueño sacó de circulación muchas veces
 *    está pausado justamente por el precio;
 *  · el auto que se está editando, que si no se compararía consigo mismo;
 *  · los precios fuera de la banda creíble, que son errores de carga.
 */
function utilesParaComparar(cars, excluirId) {
  return (Array.isArray(cars) ? cars : []).filter((c) => {
    if (!c || c.isMock === true) return false;
    if (c.available === false) return false;
    if (excluirId && String(c.id) === String(excluirId)) return false;
    const precio = precioDe(c);
    return Number.isFinite(precio) && precio >= PISO_POR_DIA && precio <= TECHO_POR_DIA;
  });
}

function resumen(nivel, grupo) {
  const precios = grupo.map(precioDe);
  const anios = grupo.map(anioDe).filter(Number.isFinite);
  return {
    nivel,
    muestra: grupo.length,
    mediana: mediana(precios),
    min: Math.min(...precios),
    max: Math.max(...precios),
    desde: anios.length ? Math.min(...anios) : null,
    hasta: anios.length ? Math.max(...anios) : null,
    alcanza: grupo.length >= MUESTRA_MINIMA,
  };
}

/**
 * Qué se está cobrando en FreeWheel por un auto como este.
 *
 * `cars` son publicaciones ya normalizadas (normalizeListing). Devuelve el
 * nivel más preciso que llegue a la muestra mínima; si ninguno llega, devuelve
 * el mejor que tenga aunque sea un auto, con `alcanza: false`, para poder
 * mostrarlo como referencia sin usarlo como precio. Sin nada, null.
 *
 * La marca y el modelo se comparan CANÓNICOS: la misma tabla de apodos que usa
 * el autocompletado de especificaciones. Así un auto publicado como "VW Gol" y
 * otro como "Volkswagen Gol Trend" cuentan como el mismo modelo, que es lo que
 * son. Sin eso, la mitad de los comparables se escapaba por cómo lo escribió
 * cada dueño.
 */
export function autosComparables(cars, { brand, model, year, category, excluirId = null } = {}) {
  const utiles = utilesParaComparar(cars, excluirId);
  if (!utiles.length) return null;

  const anio = Number(year);
  const marca = brand ? marcaCanonica(brand) : "";
  const modelo = brand && model ? modeloCanonico(brand, model) : "";
  const categoria = category ? String(category).toUpperCase() : "";

  const delMismoModelo = marca && modelo
    ? utiles.filter((c) =>
        c.brand && c.model &&
        marcaCanonica(c.brand) === marca &&
        modeloCanonico(c.brand, c.model) === modelo)
    : [];

  const candidatos = [
    ["mismoModelo", Number.isFinite(anio)
      ? delMismoModelo.filter((c) => Math.abs(anioDe(c) - anio) <= ANIOS_CERCA)
      : []],
    ["mismoModeloOtroAnio", delMismoModelo],
    ["mismaCategoria", categoria && Number.isFinite(anio)
      ? utiles.filter((c) =>
          String(c.category || "").toUpperCase() === categoria &&
          Math.abs(anioDe(c) - anio) <= ANIOS_CERCA_CATEGORIA)
      : []],
  ];

  for (const [nivel, grupo] of candidatos) {
    if (grupo.length >= MUESTRA_MINIMA) return resumen(nivel, grupo);
  }
  const suelto = candidatos.find(([, grupo]) => grupo.length > 0);
  return suelto ? resumen(suelto[0], suelto[1]) : null;
}

/**
 * ¿Estos comparables alcanzan para poner el precio sin preguntarle a la IA?
 *
 * Hacen falta las dos cosas: la muestra mínima Y que sean del mismo modelo.
 * Tres SUV cualquiera no dicen cuánto vale un Taos, y poner el precio de otro
 * auto es peor que estimarlo.
 */
export function alcanzaParaFijarElPrecio(comp) {
  return Boolean(comp && comp.alcanza && comp.nivel !== "mismaCategoria");
}

/**
 * La sugerencia armada con los comparables, con la forma que espera la pantalla.
 *
 * `valor_estimado` y `justificacion` van en null a propósito: no estimamos
 * cuánto vale el auto —no hace falta, el precio no se deduce de ahí— y la
 * explicación la escribe la pantalla, que es la que sabe en qué idioma está.
 *
 * La banda son el mínimo y el máximo REALES de esos autos, no una banda
 * calculada alrededor del número. Es la información más honesta que hay acá:
 * "los que hay publicados van de tanto a tanto".
 */
export function precioDeComparables(comp) {
  if (!alcanzaParaFijarElPrecio(comp)) return null;
  return {
    valor_estimado: null,
    justificacion: null,
    precio_min: Math.round(comp.min),
    precio_max: Math.round(comp.max),
    precio_recomendado: Math.round(comp.mediana),
    banda: "comparables",
    origen: "comparables",
    comparables: comp,
  };
}

/**
 * Los comparables contados en una línea, para meterlos en el pedido a la IA.
 *
 * Cuando no alcanzan para fijar el precio igual sirven como ancla: el modelo
 * tiene algo real contra lo que calibrar en vez de adivinar el orden de
 * magnitud de los pesos de este mes. Devuelve "" si no hay nada que contar, y
 * entonces el pedido queda como estaba.
 */
export function comparablesParaElPrompt(comp) {
  if (!comp || !Number.isFinite(comp.mediana)) return "";
  const que = {
    mismoModelo: "del mismo modelo y años parecidos",
    mismoModeloOtroAnio: "del mismo modelo, de otros años",
    mismaCategoria: "de la misma categoría y años parecidos",
  }[comp.nivel] || "parecidos";
  const anios = comp.desde && comp.hasta
    ? (comp.desde === comp.hasta ? ` (${comp.desde})` : ` (${comp.desde} a ${comp.hasta})`)
    : "";
  return `Dato real del mercado, de la propia plataforma: hay ${comp.muestra} auto(s) publicado(s) ${que}${anios}, entre ${Math.round(comp.min)} y ${Math.round(comp.max)} pesos por día, con una mediana de ${Math.round(comp.mediana)}. Son precios de HOY en pesos argentinos: usalos para calibrar el orden de magnitud de tu respuesta.`;
}
