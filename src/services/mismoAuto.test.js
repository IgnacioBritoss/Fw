// ============================================================================
//  Pruebas de mismoAuto.js — que no pasen fotos de dos autos distintos
// ----------------------------------------------------------------------------
//  EL CASO QUE TRAJO ESTE ARCHIVO. En la prueba a mano se cargaron dos fotos de
//  un Clio blanco y después una de un Corolla Cross. La revisión de cada foto
//  contestó bien —las tres eran autos reales— y las tres pasaron igual, porque
//  nadie comparaba una descripción contra la otra.
//
//  La otra mitad de estas pruebas es la contraria y es igual de importante: que
//  el mismo auto fotografiado a distinta luz o desde otro ángulo NO se marque
//  como otro. Un control que frena publicaciones buenas se termina apagando.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizar, rasgosDeTexto, rasgosDeRevision, desacuerdos, fotosDeOtroAuto,
} from "./mismoAuto.js";

// Una revisión como la que devuelve el servidor viejo: solo la frase corta.
const vista = (detected) => ({ isVehicle: true, detected });
// Una del servidor nuevo, con los rasgos ya separados.
const rasgos = (tipo, color, marcaModelo) => ({ isVehicle: true, rasgos: { tipo, color, marcaModelo } });

// ── Leer la descripción ────────────────────────────────────────────────────

test("los acentos y las mayusculas no cambian nada", () => {
  assert.equal(normalizar("SUV Gris Plateádo"), "suv gris plateado");
});

test("de una frase suelta salen el color, la carroceria y la marca", () => {
  assert.deepEqual(rasgosDeTexto("Renault Clio blanco"), {
    tipo: null, color: "blanco", marca: "renault", modelo: null,
  });
  assert.deepEqual(rasgosDeTexto("SUV gris"), {
    tipo: "suv", color: "gris", marca: null, modelo: null,
  });
});

test("plateado es gris y crossover es SUV", () => {
  assert.equal(rasgosDeTexto("auto plateado").color, "gris");
  assert.equal(rasgosDeTexto("crossover").tipo, "suv");
});

test("'camioneta' es ambigua en Argentina y no se toma por ninguna", () => {
  assert.equal(rasgosDeTexto("camioneta blanca").tipo, null);
});

test("lo que no se entiende queda en null, no se inventa", () => {
  assert.deepEqual(rasgosDeTexto("cosa rara"), {
    tipo: null, color: null, marca: null, modelo: null,
  });
  assert.deepEqual(rasgosDeTexto(""), {
    tipo: null, color: null, marca: null, modelo: null,
  });
});

test("con los rasgos separados del servidor, la marca y el modelo se parten", () => {
  assert.deepEqual(rasgosDeRevision(rasgos("SUV", "Gris", "Toyota Corolla Cross")), {
    tipo: "suv", color: "gris", marca: "toyota", modelo: "corolla cross",
  });
});

test("si el servidor no manda rasgos, se lee la frase de siempre", () => {
  assert.equal(rasgosDeRevision(vista("hatchback blanco")).tipo, "hatchback");
});

// ── La regla de los dos desacuerdos ────────────────────────────────────────

test("un solo rasgo distinto NO alcanza: puede ser la luz", () => {
  const a = { tipo: "sedan", color: "gris", marca: "ford", modelo: null };
  const b = { tipo: "sedan", color: "negro", marca: "ford", modelo: null };
  assert.equal(desacuerdos(a, b), 1);
});

test("un rasgo que falta de un lado no es un desacuerdo", () => {
  const a = { tipo: "suv", color: null, marca: null, modelo: null };
  const b = { tipo: "suv", color: "rojo", marca: "jeep", modelo: null };
  assert.equal(desacuerdos(a, b), 0);
});

// ── El caso que se probó a mano ────────────────────────────────────────────

test("dos fotos de un Clio blanco y una de un Corolla Cross: la tercera se marca", () => {
  const { indices, referencia, principal } = fotosDeOtroAuto({
    0: rasgos("hatchback", "blanco", "Renault Clio"),
    1: rasgos("hatchback", "blanco", "Renault Clio"),
    2: rasgos("SUV", "gris", "Toyota Corolla Cross"),
  });
  assert.deepEqual(indices, [2]);
  assert.equal(referencia.marca, "renault");
  assert.equal(referencia.color, "blanco");
  // Con cuál foto compararse para contarle a la persona qué muestran las otras.
  assert.equal(principal, 0);
});

test("tambien se marca con un servidor viejo, leyendo las frases", () => {
  const { indices } = fotosDeOtroAuto({
    0: vista("Renault Clio blanco"),
    1: vista("Renault Clio blanco"),
    2: vista("Toyota Corolla gris"),
  });
  assert.deepEqual(indices, [2]);
});

// ── Y que no moleste cuando el auto es el mismo ────────────────────────────

test("el mismo auto desde otro angulo no se marca", () => {
  const { indices } = fotosDeOtroAuto({
    0: rasgos("hatchback", "blanco", "Renault Clio"),
    1: rasgos("hatchback", "blanco", null),
    2: rasgos(null, "blanco", "Renault Clio"),
  });
  assert.deepEqual(indices, []);
});

test("una foto que no se pudo describir no acusa a nadie", () => {
  const { indices } = fotosDeOtroAuto({
    0: rasgos("hatchback", "blanco", "Renault Clio"),
    1: vista("primer plano"),
  });
  assert.deepEqual(indices, []);
});

test("con una sola foto no hay contra que comparar", () => {
  assert.deepEqual(fotosDeOtroAuto({ 0: rasgos("suv", "rojo", "Jeep Renegade") }), {
    indices: [], referencia: null, principal: null,
  });
  assert.deepEqual(fotosDeOtroAuto({}), { indices: [], referencia: null, principal: null });
});

test("el grupo mas grande es el de referencia, aunque llegue segundo", () => {
  const { indices, referencia, principal } = fotosDeOtroAuto({
    0: rasgos("SUV", "gris", "Toyota Corolla Cross"),
    1: rasgos("hatchback", "blanco", "Renault Clio"),
    2: rasgos("hatchback", "blanco", "Renault Clio"),
  });
  assert.deepEqual(indices, [0]);
  assert.equal(referencia.marca, "renault");
  assert.equal(principal, 1);
});

test("con empate manda la foto principal, que es la que se ve en el buscador", () => {
  const { indices, referencia } = fotosDeOtroAuto({
    0: rasgos("hatchback", "blanco", "Renault Clio"),
    1: rasgos("SUV", "gris", "Toyota Corolla Cross"),
  });
  assert.deepEqual(indices, [1]);
  assert.equal(referencia.marca, "renault");
});

test("los rasgos del grupo se completan entre las fotos que lo forman", () => {
  // La primera no deja ver la marca; la segunda si. El grupo termina sabiendola,
  // asi que la tercera se puede comparar contra ella.
  const { indices, referencia } = fotosDeOtroAuto({
    0: rasgos("hatchback", "blanco", null),
    1: rasgos("hatchback", "blanco", "Renault Clio"),
    2: rasgos("SUV", "negro", "Toyota Hilux"),
  });
  assert.deepEqual(indices, [2]);
  assert.equal(referencia.modelo, "clio");
});
