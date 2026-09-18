// ============================================================================
//  mapaGlobo.js — Cuánto puede medir la tarjeta que se abre sobre el mapa
// ----------------------------------------------------------------------------
//  LA TARJETA SE MIDE CONTRA EL MAPA, NO CONTRA SÍ MISMA.
//
//  Era de 208x132 siempre. Con el globo de Leaflet alrededor eso da 255x267, y
//  el mapa de la pantalla de inicio mide 353x480 cuando no está agrandado: la
//  tarjeta ocupaba el 72% del ancho y el 56% del alto. O sea que para ver un
//  auto había que tapar el mapa que uno estaba mirando para ubicarlo, que es
//  justamente lo que se fue a buscar ahí. En pantallas bajas —una notebook de
//  1366x620— el mapa queda en 380px de alto y la tarjeta se salía por arriba.
//
//  Acá no se dibuja nada: es la cuenta de cuánto entra, separada para poder
//  probarla con números sin abrir un navegador (mapaGlobo.test.js).
//
//  ── POR QUÉ HAY TOPES ARRIBA Y ABAJO ──────────────────────────────────────
//  Arriba, porque en un mapa grande no hay ninguna razón para achicar la
//  tarjeta: 208x132 se ve bien y agrandarla más no suma.
//
//  Abajo, porque una tarjeta que se encoge sin límite deja de servir: la foto
//  se vuelve una franja donde no se distingue el auto y el nombre del modelo se
//  parte en tres renglones. Si el mapa es tan chico que ni el mínimo entra,
//  el problema es el mapa y se resuelve en otro lado (en el teléfono la lista y
//  el mapa no se muestran juntos, justamente por eso).
// ============================================================================

/** Lo más grande que se dibuja, que es como estaba antes. */
export const ANCHO_MAXIMO = 208;

/*
  Lo más chico que sigue siendo legible.

  El piso de ancho no es un gusto: MEDIDO, por debajo de 180px el nombre del
  auto no entra en un renglón. "Volkswagen Gol Trend 2014" se parte en dos, y
  entonces achicar la tarjeta a lo ancho la hace MÁS ALTA: con el piso en 158 el
  globo pasaba de 267 a 278 de alto, o sea que el arreglo empeoraba justo lo que
  venía a arreglar. Lo que tiene que achicarse es la foto, no el texto.
*/
export const ANCHO_MINIMO = 180;
export const ALTO_FOTO_MINIMO = 96;

/**
 * Lo que ocupa la tarjeta SIN contar la foto.
 *
 * Título, lugar, precio, el botón de reservar y el marco del globo de Leaflet.
 * Medido sobre la tarjeta de verdad: con una foto de 132 el globo daba 267, o
 * sea 135 de todo lo demás... cuando el nombre entra en un renglón.
 *
 * Y no siempre entra. "Fiat Uno 2015" entra en cualquier ancho y "Volkswagen
 * Gol Trend 2014" se parte en dos hasta con la tarjeta en su ancho máximo.
 * Buscar el ancho donde entren TODOS los nombres es perseguir un número que no
 * existe, porque depende del nombre.
 *
 * Así que el presupuesto cuenta SIEMPRE los dos renglones. Cuando el nombre usa
 * uno solo la tarjeta queda veinte píxeles más baja de lo previsto, que es el
 * lado bueno para errar: sobra mapa, no falta.
 */
export const ALTO_SIN_FOTO = 155;

/** Cuánto del mapa puede tapar la tarjeta a lo ancho. */
const PARTE_DEL_ANCHO = 0.62;

/**
 * LA FOTO GUARDA SU PROPORCIÓN. NO SE APLASTA.
 *
 * Antes el alto de la foto salía de cuánto mapa había: se le restaba el texto a
 * la mitad del alto del mapa y lo que quedaba era la foto. El problema es que
 * eso no mira el ANCHO, así que en un mapa bajo la foto quedaba de 227x95 —una
 * franja de 2.4 a 1— y un auto ahí adentro sale cortado por arriba y por abajo:
 * se ve el capot y las ruedas, y nada del medio.
 *
 * Ahora el alto sale del ancho, con la proporción a la que se ve un auto entero.
 * La tarjeta queda un poco más alta en los mapas bajos, y eso se resuelve donde
 * corresponde: corriendo el mapa para que entre (ver `ajusteParaQueEntre`), que
 * es gratis, en vez de arruinando la foto, que es lo único que se mira.
 */
const PROPORCION_DE_LA_FOTO = 0.62;

/**
 * El alto de la foto en la tarjeta más grande.
 *
 * Sale de la proporción y no es un número escrito aparte: si fuera suelto,
 * cambiar la proporción lo dejaría diciendo otra cosa, que es exactamente lo que
 * pasaba con el 132 que había antes.
 */
export const ALTO_FOTO_MAXIMO = Math.round(ANCHO_MAXIMO * PROPORCION_DE_LA_FOTO);

/** Lo que el globo de Leaflet le suma al ancho de la tarjeta (marco y sombra). */
const MARCO = 47;

const entre = (min, max, valor) => Math.max(min, Math.min(max, valor));

/**
 * El tamaño de la tarjeta adentro de un mapa de `{ w, h }` píxeles.
 *
 * Sin medida —el mapa todavía no se dibujó, o no se pudo medir— devuelve el
 * tamaño de siempre. Vale la misma regla que en el resto de la app: sin dato no
 * se cambia nada, porque una tarjeta chiquita por una medición que falló sería
 * peor que una grande.
 */
export function medidaDeLaTarjeta(mapa) {
  const ancho = mapa?.w > 0
    ? entre(ANCHO_MINIMO, ANCHO_MAXIMO, Math.round(mapa.w * PARTE_DEL_ANCHO) - MARCO)
    : ANCHO_MAXIMO;
  const altoFoto = entre(ALTO_FOTO_MINIMO, ALTO_FOTO_MAXIMO, Math.round(ancho * PROPORCION_DE_LA_FOTO));
  return { ancho, altoFoto };
}


/**
 * Cuánto hay que correr el mapa para que el globo entre entero.
 *
 * Devuelve el desplazamiento tal como lo espera `panBy` de Leaflet: valores en
 * píxeles de pantalla, negativos para descubrir lo que quedó arriba o a la
 * izquierda. Las cuatro comprobaciones van en este orden a propósito —primero
 * el borde de abajo y el de la derecha, después el de arriba y el de la
 * izquierda— para que en un globo más grande que el mapa gane el borde
 * SUPERIOR: es donde está la foto y el nombre, o sea lo que hay que ver si algo
 * se va a perder.
 *
 * `margenes` es el lugar que no se puede usar: arriba están "Agrandar mapa" y
 * "Cómo funciona", y a la izquierda el zoom de Leaflet. Un globo que entra en
 * el mapa pero abajo de un botón no entra.
 *
 * POR QUÉ ESTÁ ESCRITO ACÁ Y NO SE LE PIDE A LEAFLET: la librería hace esta
 * misma cuenta al ABRIR el globo, y nada más. Si después algo mueve el mapa
 * —acá lo mueven dos cosas: el encuadre de la zona de entrega y el botón de
 * agrandar— el globo se queda donde estaba y puede terminar cortado por el
 * borde. Volver a llamar a `openOn` no sirve: sobre un globo que ya está
 * abierto, Leaflet corta antes de rehacer la cuenta.
 */
export function ajusteParaQueEntre(globo, mapa, margenes) {
  const m = { arriba: 0, izq: 0, abajo: 0, der: 0, ...margenes };
  let dx = 0;
  let dy = 0;
  if (globo.x + globo.w + m.der > mapa.w) dx = globo.x + globo.w - mapa.w + m.der;
  if (globo.x - dx - m.izq < 0) dx = globo.x - m.izq;
  if (globo.y + globo.h + m.abajo > mapa.h) dy = globo.y + globo.h - mapa.h + m.abajo;
  if (globo.y - dy - m.arriba < 0) dy = globo.y - m.arriba;
  return { dx: Math.round(dx), dy: Math.round(dy) };
}
