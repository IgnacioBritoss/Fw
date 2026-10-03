// ============================================================================
//  Pruebas de comparables.js
// ----------------------------------------------------------------------------
//  Lo que se cuida acá es una sola cosa, y es la que puede hacer daño: QUE EL
//  PRECIO DE OTRO AUTO NO TERMINE EN EL CAMPO DE ESTE. Un número estimado de
//  más o de menos se discute; un número copiado de un auto que no es el mismo
//  se publica y nadie se da cuenta.
//
//  Por eso casi todas las pruebas son de lo que NO tiene que pasar: con pocos
//  autos, con autos de ejemplo, con un precio disparatado en el medio, con un
//  modelo parecido pero distinto.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediana, autosComparables, alcanzaParaFijarElPrecio, precioDeComparables,
  comparablesParaElPrompt, MUESTRA_MINIMA,
} from "./comparables.js";

/** Una publicación ya normalizada, con lo poco que mira este archivo. */
const auto = (brand, model, year, price, extra = {}) => ({
  id: `${brand}-${model}-${year}-${price}`,
  brand, model, year, price_per_day: price, category: "SEDAN", ...extra,
});

// ── La mediana ─────────────────────────────────────────────────────────────

test("la mediana es el valor del medio, no el promedio", () => {
  assert.equal(mediana([40000, 45000, 900000]), 45000);
  assert.equal(mediana([10000, 20000]), 15000);
  assert.equal(mediana([50000]), 50000);
});

test("la mediana no se cree el orden en que llegan los autos", () => {
  assert.equal(mediana([900000, 40000, 45000]), 45000);
});

test("sin números no hay mediana, y no es cero", () => {
  assert.equal(mediana([]), null);
  assert.equal(mediana(undefined), null);
});

// ── El auto que se está publicando ─────────────────────────────────────────

test("tres del mismo modelo y año parecido FIJAN el precio", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2020, 40000),
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2022, 52000),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp.nivel, "mismoModelo");
  assert.equal(comp.muestra, 3);
  assert.equal(comp.mediana, 45000);
  assert.equal(comp.min, 40000);
  assert.equal(comp.max, 52000);
  assert.ok(alcanzaParaFijarElPrecio(comp));
});

test("un precio disparatado en el medio no mueve la sugerencia", () => {
  /*
    El caso real: alguien publica su auto a $900.000 por día porque en verdad no
    quiere alquilarlo, o porque se le fue un cero. Con el promedio, la
    sugerencia para los demás Cronos del país pasaba a $328.000.
  */
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 40000),
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 900000),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp.mediana, 45000);
});

test("la marca y el modelo se comparan con los apodos resueltos", () => {
  // "VW Gol" y "Volkswagen Gol Trend" son el mismo auto. Sin la tabla de
  // apodos, cada forma de escribirlo era un modelo distinto y no había
  // comparables para ninguno.
  const comp = autosComparables([
    auto("VW", "Gol", 2018, 30000),
    auto("Volkswagen", "Gol Trend", 2019, 33000),
    auto("volkswagen", "gol  trend", 2020, 36000),
  ], { brand: "Volkswagen", model: "Gol Trend", year: 2019 });

  assert.equal(comp.nivel, "mismoModelo");
  assert.equal(comp.muestra, 3);
  assert.equal(comp.mediana, 33000);
});

test("un modelo parecido NO es el mismo modelo", () => {
  const comp = autosComparables([
    auto("Chevrolet", "Onix Plus", 2021, 40000),
    auto("Chevrolet", "Onix Plus", 2021, 44000),
    auto("Chevrolet", "Onix Plus", 2021, 48000),
  ], { brand: "Chevrolet", model: "Onix", year: 2021, category: "HATCHBACK" });

  // Hay tres autos, pero ninguno es un Onix: no se fija ningún precio con ellos.
  assert.ok(!comp || comp.nivel !== "mismoModelo");
});

test("un año lejano sale del grupo del mismo auto", () => {
  const flota = [
    auto("Toyota", "Corolla", 2012, 30000),
    auto("Toyota", "Corolla", 2013, 32000),
    auto("Toyota", "Corolla", 2014, 34000),
  ];
  const comp = autosComparables(flota, { brand: "Toyota", model: "Corolla", year: 2023 });
  // Son del mismo modelo pero de otra década: se usan igual, con el nivel que
  // lo dice y los años a la vista.
  assert.equal(comp.nivel, "mismoModeloOtroAnio");
  assert.equal(comp.desde, 2012);
  assert.equal(comp.hasta, 2014);
  assert.ok(alcanzaParaFijarElPrecio(comp), "el mismo modelo sirve aunque sea de otros años");
});

// ── Lo que NO alcanza ──────────────────────────────────────────────────────

test("con menos de tres se muestran pero NO fijan el precio", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 50000),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp.muestra, 2);
  assert.equal(comp.alcanza, false);
  assert.ok(!alcanzaParaFijarElPrecio(comp));
  assert.equal(precioDeComparables(comp), null);
});

test("tres de la misma categoria tampoco fijan nada: un SUV no es otro SUV", () => {
  const comp = autosComparables([
    auto("Volkswagen", "Taos", 2022, 80000, { category: "SUV" }),
    auto("Jeep", "Compass", 2022, 95000, { category: "SUV" }),
    auto("Ford", "Territory", 2021, 70000, { category: "SUV" }),
  ], { brand: "Peugeot", model: "2008", year: 2022, category: "SUV" });

  assert.equal(comp.nivel, "mismaCategoria");
  assert.equal(comp.alcanza, true, "la muestra alcanza");
  assert.ok(!alcanzaParaFijarElPrecio(comp), "pero no para fijar el precio");
  assert.equal(precioDeComparables(comp), null);
});

test("los autos de ejemplo no son precios de nadie", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 45000, { isMock: true }),
    auto("Fiat", "Cronos", 2021, 46000, { isMock: true }),
    auto("Fiat", "Cronos", 2021, 47000, { isMock: true }),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp, null);
});

test("un auto pausado no cuenta, que muchas veces se pausa por el precio", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 46000),
    auto("Fiat", "Cronos", 2021, 999999, { available: false }),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp.muestra, 2);
});

test("el auto que se esta editando no se compara consigo mismo", () => {
  const propio = auto("Fiat", "Cronos", 2021, 500000);
  const comp = autosComparables([
    propio,
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 46000),
    auto("Fiat", "Cronos", 2021, 47000),
  ], { brand: "Fiat", model: "Cronos", year: 2021, excluirId: propio.id });

  assert.equal(comp.muestra, 3);
  assert.equal(comp.mediana, 46000);
});

test("un precio imposible es un error de carga y se descarta", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 46000),
    auto("Fiat", "Cronos", 2021, 12),          // doce pesos por día
    auto("Fiat", "Cronos", 2021, 99000000),    // noventa y nueve millones
  ], { brand: "Fiat", model: "Cronos", year: 2021 });

  assert.equal(comp.muestra, 2);
});

test("sin autos, sin marca o sin nada no rompe: devuelve null", () => {
  assert.equal(autosComparables([], { brand: "Fiat", model: "Cronos", year: 2021 }), null);
  assert.equal(autosComparables(null, {}), null);
  assert.equal(autosComparables([auto("Fiat", "Cronos", 2021, 45000)], {}), null);
  assert.equal(alcanzaParaFijarElPrecio(null), false);
  assert.equal(precioDeComparables(null), null);
});

// ── La sugerencia que se arma con ellos ────────────────────────────────────

test("la banda son el minimo y el maximo REALES, no una banda calculada", () => {
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 38000),
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 61000),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });
  const sugerencia = precioDeComparables(comp);

  assert.equal(sugerencia.precio_recomendado, 45000);
  assert.equal(sugerencia.precio_min, 38000);
  assert.equal(sugerencia.precio_max, 61000);
  assert.equal(sugerencia.origen, "comparables");
});

test("la sugerencia de comparables NO trae justificacion ni valor del auto", () => {
  // La explicación la escribe la pantalla, que sabe en qué idioma está; y acá
  // no se estima cuánto vale el auto porque el precio no sale de ahí.
  const comp = autosComparables([
    auto("Fiat", "Cronos", 2021, 40000),
    auto("Fiat", "Cronos", 2021, 45000),
    auto("Fiat", "Cronos", 2021, 50000),
  ], { brand: "Fiat", model: "Cronos", year: 2021 });
  const sugerencia = precioDeComparables(comp);

  assert.equal(sugerencia.justificacion, null);
  assert.equal(sugerencia.valor_estimado, null);
});

test("la muestra minima es tres, y esta escrita una sola vez", () => {
  assert.equal(MUESTRA_MINIMA, 3);
});

// ── Lo que se le cuenta a la IA cuando igual hay que preguntarle ───────────

test("al pedido de la IA se le pasan los comparables como ancla", () => {
  const comp = autosComparables([
    auto("Volkswagen", "Taos", 2022, 80000, { category: "SUV" }),
    auto("Jeep", "Compass", 2022, 95000, { category: "SUV" }),
    auto("Ford", "Territory", 2021, 70000, { category: "SUV" }),
  ], { brand: "Peugeot", model: "2008", year: 2022, category: "SUV" });

  const texto = comparablesParaElPrompt(comp);
  assert.match(texto, /3 auto/);
  assert.match(texto, /misma categor/);
  assert.match(texto, /80000/, "la mediana va en el texto");
  assert.match(texto, /2021 a 2022/);
});

test("sin comparables el pedido queda como estaba", () => {
  assert.equal(comparablesParaElPrompt(null), "");
  assert.equal(comparablesParaElPrompt({ muestra: 0 }), "");
});
