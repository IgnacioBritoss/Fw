// ============================================================================
//  Pruebas de precio.js — leer lo que contesta la IA sin tirar nada al pedo
// ----------------------------------------------------------------------------
//  Estas cuentas deciden si el botón "Sugerir con IA" carga un precio o dice
//  que no se pudo. Se prueban acá y no en el navegador porque no hacen falta ni
//  una pantalla ni cuota de IA: son las respuestas que se vieron de verdad,
//  escritas a mano.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { aNumero, esPrecioCreible, precioUsable, PISO_RENTABLE, PORCION_POR_DIA } from "./precio.js";

// ── Leer el número ─────────────────────────────────────────────────────────
//
//  El bug que rompía todo: un modelo que contesta en castellano escribe
//  "45.000", y Number("45.000") da 45. Cuarenta y cinco pesos por día no pasa
//  ningún control, así que la respuesta —que estaba bien— se descartaba.

test("un número entero pasa igual", () => {
  assert.equal(aNumero(45000), 45000);
  assert.equal(aNumero(0), 0);
});

test("el punto de miles del castellano NO es un decimal", () => {
  assert.equal(aNumero("45.000"), 45000);
  assert.equal(aNumero("1.500.000"), 1500000);
});

test("la coma de miles del inglés tampoco", () => {
  assert.equal(aNumero("45,000"), 45000);
  assert.equal(aNumero("1,500,000"), 1500000);
});

test("con los dos separadores manda el último", () => {
  assert.equal(aNumero("45.000,50"), 45000.5);
  assert.equal(aNumero("45,000.50"), 45000.5);
});

test("un separador que NO trae tres dígitos atrás es decimal", () => {
  assert.equal(aNumero("45.5"), 45.5);
  assert.equal(aNumero("0,3"), 0.3);
  assert.equal(aNumero("12.75"), 12.75);
});

test("los símbolos de plata y las palabras se ignoran", () => {
  assert.equal(aNumero("$45.000"), 45000);
  assert.equal(aNumero("ARS 45.000 por día"), 45000);
  assert.equal(aNumero(" 45000 "), 45000);
});

test("lo que no tiene ningún número devuelve null, no cero", () => {
  // La diferencia importa: null es "no vino", cero es un precio de cero.
  assert.equal(aNumero("no sé"), null);
  assert.equal(aNumero(""), null);
  assert.equal(aNumero(null), null);
  assert.equal(aNumero(undefined), null);
  assert.equal(aNumero({}), null);
});

// ── ¿Es creíble? ───────────────────────────────────────────────────────────

test("un alquiler razonable pasa", () => {
  assert.equal(esPrecioCreible(45000), true);
  assert.equal(esPrecioCreible(45000, 15_000_000), true);
});

test("un número demasiado chico o demasiado grande no", () => {
  assert.equal(esPrecioCreible(45), false);
  assert.equal(esPrecioCreible(12_000_000), false);
  assert.equal(esPrecioCreible(NaN), false);
});

test("con el valor del auto a mano se pide además que la proporción cierre", () => {
  // 12 millones de auto y 3 millones por día es un disparate aunque los dos
  // números, por separado, entren en sus bandas.
  assert.equal(esPrecioCreible(2_500_000, 12_000_000), false);
  // Y al revés: 200 pesos por día sobre un auto de 12 millones tampoco.
  assert.equal(esPrecioCreible(3_100, 12_000_000), false);
});

// ── Sacar el precio de la respuesta ────────────────────────────────────────

test("la respuesta buena se usa tal cual", () => {
  const r = precioUsable({
    valor_estimado: 12_000_000, precio_min: 28000, precio_max: 44000,
    precio_recomendado: 36000, justificacion: "un Clio 2013",
  });
  assert.equal(r.precio_recomendado, 36000);
  assert.equal(r.origen, "ia");
  assert.equal(r.justificacion, "un Clio 2013");
});

test("la respuesta escrita en castellano también", () => {
  // Esta es la que fallaba: todo bien escrito, pero con puntos de miles.
  const r = precioUsable({
    valor_estimado: "12.000.000", precio_min: "28.000",
    precio_max: "44.000", precio_recomendado: "$36.000",
  });
  assert.equal(r.precio_recomendado, 36000);
  assert.equal(r.valor_estimado, 12000000);
  assert.equal(r.origen, "ia");
});

test("si falta el recomendado, se usa el medio del rango", () => {
  const r = precioUsable({ valor_estimado: 12_000_000, precio_min: 30000, precio_max: 50000 });
  assert.equal(r.precio_recomendado, 40000);
  assert.equal(r.origen, "rango");
});

test("si el modelo contestó en dólares, se calcula desde el valor del auto", () => {
  // 35 dólares por día es correcto como idea y no sirve como precio en pesos.
  // El valor del auto sí está bien estimado, y con eso alcanza.
  const r = precioUsable({
    valor_estimado: 12_000_000, precio_min: 28, precio_max: 44, precio_recomendado: 36,
  });
  assert.equal(r.origen, "valor");
  assert.equal(r.precio_recomendado, Math.round(12_000_000 * PORCION_POR_DIA));
  assert.ok(r.precio_recomendado > 20000 && r.precio_recomendado < 40000);
});

test("si puso el valor del auto en el campo del alquiler, también", () => {
  const r = precioUsable({ valor_estimado: 12_000_000, precio_recomendado: 12_000_000 });
  assert.equal(r.origen, "valor");
  assert.equal(r.precio_recomendado, 26400);
});

// ── El piso de lo que vale la pena ─────────────────────────────────────────
//
//  Un auto viejo da un alquiler correcto y a la vez inaceptable: nadie presta
//  su auto por cinco mil pesos. Mostrar ese número al lado de la foto del auto
//  propio se lee como una opinión sobre el auto, no como un dato.

test("abajo del piso no se devuelve ningún precio", () => {
  const r = precioUsable({
    valor_estimado: 2_200_000, precio_min: 3500, precio_max: 6200,
    precio_recomendado: 5000, justificacion: "El Meriva 2012 vale $2.200.000.",
  });
  assert.equal(r.origen, "bajoElPiso");
  assert.equal(r.precio_recomendado, null);
});

test("y tampoco ninguno de los otros números que pueden molestar", () => {
  // Ni el rango, ni lo que sale el auto, ni la justificación que los repite.
  // Si alguno se colara, la pantalla volvería a mostrar justo lo que se quiso
  // sacar.
  const r = precioUsable({
    valor_estimado: 2_200_000, precio_min: 3500, precio_max: 6200,
    precio_recomendado: 5000, justificacion: "vale $2.200.000, alquiler de $5.000",
  });
  assert.equal(r.precio_min, null);
  assert.equal(r.precio_max, null);
  assert.equal(r.valor_estimado, null);
  assert.equal(r.justificacion, null);
});

test("justo en el piso sí se sugiere", () => {
  const r = precioUsable({ valor_estimado: 12_000_000, precio_recomendado: PISO_RENTABLE });
  assert.equal(r.precio_recomendado, PISO_RENTABLE);
  assert.equal(r.origen, "ia");
});

test("un peso abajo del piso, no", () => {
  const r = precioUsable({ valor_estimado: 12_000_000, precio_recomendado: PISO_RENTABLE - 1 });
  assert.equal(r.origen, "bajoElPiso");
});

test("el piso también corre para el precio calculado por nosotros", () => {
  // Un auto barato: el 0,22% de 2,2 millones da menos del piso. No alcanza con
  // frenar lo que dice el modelo; hay que frenar también nuestra propia cuenta.
  const r = precioUsable({ valor_estimado: 2_200_000, precio_recomendado: 4 });
  assert.equal(r.origen, "bajoElPiso");
  assert.equal(r.precio_recomendado, null);
});

test("sin nada usable, avisa en vez de inventar", () => {
  // Que no se pueda tiene que poder decirse. Inventar un precio para no mostrar
  // un error es peor: el dueño publica a un valor que no eligió nadie.
  assert.throws(() => precioUsable({ justificacion: "ni idea" }), /precio usable/);
  assert.throws(() => precioUsable({}), /precio usable/);
  assert.throws(() => precioUsable(null), /precio usable/);
});

test("un valor de auto disparatado no se usa para calcular", () => {
  // 8000 sería el auto en dólares. No hay cotización acá, y sacarla de la nada
  // sería peor que decir que no se pudo.
  assert.throws(() => precioUsable({ valor_estimado: 8000, precio_recomendado: 35 }), /precio usable/);
});

test("el error avisa que el problema fue el precio y no la conexión", () => {
  // La pantalla usa esta marca para elegir el mensaje: "la IA devolvió un
  // precio raro" no es lo mismo que "la IA no contestó".
  try {
    precioUsable({});
    assert.fail("tenía que lanzar");
  } catch (err) {
    assert.equal(err.precioRaro, true);
  }
});
