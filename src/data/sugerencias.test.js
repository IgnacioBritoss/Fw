// ============================================================================
//  Pruebas de sugerencias.js — lo que el buscador ofrece mientras se escribe
// ----------------------------------------------------------------------------
//  EL PROBLEMA QUE TRAJO ESTO. Alguien escribía "Saavedra" en el campo de
//  ciudad o barrio y no se le ofrecía nada. No era una falla del completado:
//  era que la lista tenía SEIS barrios porteños de cuarenta y ocho. Y el efecto
//  es peor que no ayudar: un campo que no sugiere un barrio se lee como que ahí
//  no hay autos.
//
//  Lo que se prueba acá no es que haya tal o cual barrio —una lista se mira—,
//  sino las dos cosas de las que depende que la lista SIRVA:
//
//   1. que esté completa, porque el que falta deja a su gente escribiendo a
//      ciegas;
//   2. que el ORDEN resuelva bien los choques. Cuando dos entradas empiezan
//      igual se completa con la primera, así que el orden no es estética: es la
//      que se ofrece.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { ZONAS, completar } from "./sugerencias.js";

/** Con qué se completa lo tecleado. */
const con = (texto) => completar(texto, ZONAS).completa || null;

test("ESTÁN LOS CUARENTA Y OCHO BARRIOS PORTEÑOS", () => {
  /*
    La lista oficial entera, no una selección. Cuál es "importante" es una
    opinión, y el que se deja afuera deja a su gente escribiendo a ciegas: es
    exactamente lo que pasó con Saavedra.
  */
  const BARRIOS = [
    "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo",
    "Caballito", "Chacarita", "Coghlan", "Colegiales", "Constitución",
    "Flores", "Floresta", "La Boca", "La Paternal", "Liniers", "Mataderos",
    "Monte Castro", "Montserrat", "Nueva Pompeya", "Núñez", "Palermo",
    "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios",
    "Puerto Madero", "Recoleta", "Retiro", "Saavedra", "San Cristóbal",
    "San Nicolás", "San Telmo", "Vélez Sársfield", "Versalles", "Villa Crespo",
    "Villa del Parque", "Villa Devoto", "Villa General Mitre", "Villa Lugano",
    "Villa Luro", "Villa Ortúzar", "Villa Pueyrredón", "Villa Real",
    "Villa Riachuelo", "Villa Santa Rita", "Villa Soldati", "Villa Urquiza",
  ];
  assert.equal(BARRIOS.length, 48);
  const faltan = BARRIOS.filter((b) => !ZONAS.includes(b));
  assert.deepEqual(faltan, [], `faltan en ZONAS: ${faltan.join(", ")}`);
});

test("y los barrios donde ya hay autos publicados se completan", () => {
  // Los de las publicaciones de verdad, que es donde se notó que faltaban.
  assert.equal(con("saa"), "Saavedra");
  assert.equal(con("san cri"), "San Cristóbal");
  assert.equal(con("cole"), "Colegiales");
  assert.equal(con("villa cre"), "Villa Crespo");
});

test("sin acentos también, porque nadie los escribe en un buscador", () => {
  assert.equal(con("nune"), "Núñez");
  assert.equal(con("velez"), "Vélez Sársfield");
  assert.equal(con("constitu"), "Constitución");
});

test("EL ORDEN RESUELVE LOS CHOQUES A FAVOR DE LO MÁS BUSCADO", () => {
  /*
    "Villa Ge" son dos: un barrio de los menos buscados de la ciudad y uno de
    los destinos más buscados del verano. Gana el que la gente escribe. Por eso
    "Villa General Mitre" está al final del archivo y no entre los barrios: es
    la única entrada fuera de su bloque, y está comentada ahí.
  */
  assert.equal(con("villa ge"), "Villa Gesell");
  // Y escribiendo un poco más se llega igual al otro.
  assert.equal(con("villa gen"), "Villa General Mitre");
});

test("no hay entradas repetidas", () => {
  // Una repetida no rompe nada visible, pero significa que alguien agregó algo
  // que ya estaba sin mirar la lista, y es el momento de enterarse.
  assert.equal(new Set(ZONAS).size, ZONAS.length);
});

test("con una sola letra no se sugiere nada", () => {
  // Con menos de dos letras hay demasiadas opciones y la sugerencia manotea.
  assert.equal(con("s"), null);
  assert.equal(con(""), null);
});
