// ============================================================================
//  Pruebas de atributos.js — que la planilla de reputación no se contradiga
// ----------------------------------------------------------------------------
//  Estas cuentas deciden lo que dice el perfil de una persona sobre otra. Se
//  prueban acá y no en el navegador porque no hacen falta ni pantalla ni
//  servidor: son listas de conteos escritas a mano.
//
//  EL BUG QUE TRAJO ESTE ARCHIVO. La tarjeta decía "Puntualidad: Sin datos" y
//  tres centímetros más abajo, en la misma tarjeta, "Puntual · 1". El dato
//  estaba y la pantalla lo negaba, porque hacían falta DOS menciones para
//  animarse a decir algo. Quien lo lee no deduce que faltaba una mención:
//  deduce que la pantalla miente.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATRIBUTOS, PARES, MAXIMO, paresPara, esBueno, contarAtributos, resumenDe,
} from "./atributos.js";

const cuenta = (pares) => Object.entries(pares).map(([code, n]) => ({ code, n, bueno: esBueno(code) }));

// ── El bug ─────────────────────────────────────────────────────────────────

test("una sola mención YA es un dato: no se dice 'sin datos' con la etiqueta a la vista", () => {
  const { nivel, total } = resumenDe(cuenta({ PUNTUAL: 1 }), "PUNTUAL", "IMPUNTUAL");
  assert.equal(nivel, "bien");
  assert.equal(total, 1);
});

test("y viene con el tamaño de la muestra, para no exagerar", () => {
  const r = resumenDe(cuenta({ RESPONDE_RAPIDO: 1 }), "RESPONDE_RAPIDO", "RESPONDE_TARDE");
  assert.deepEqual(r, { nivel: "bien", bien: 1, mal: 0, total: 1 });
});

test("sin ninguna mención sí es 'sin datos', que no es lo mismo que 'mal'", () => {
  const r = resumenDe(cuenta({ TRATO_AMABLE: 3 }), "PUNTUAL", "IMPUNTUAL");
  assert.equal(r.nivel, null);
  assert.equal(r.total, 0);
});

// ── Los cortes ─────────────────────────────────────────────────────────────

test("70% o más es 'bien'", () => {
  assert.equal(resumenDe(cuenta({ PUNTUAL: 7, IMPUNTUAL: 3 }), "PUNTUAL", "IMPUNTUAL").nivel, "bien");
});

test("2 de 3 (66%) todavía no es 'bien'", () => {
  assert.equal(resumenDe(cuenta({ PUNTUAL: 2, IMPUNTUAL: 1 }), "PUNTUAL", "IMPUNTUAL").nivel, "regular");
});

test("menos de la mitad es 'mal', no un caso dudoso", () => {
  assert.equal(resumenDe(cuenta({ PUNTUAL: 1, IMPUNTUAL: 3 }), "PUNTUAL", "IMPUNTUAL").nivel, "mal");
});

test("una sola mención mala también cuenta", () => {
  assert.equal(resumenDe(cuenta({ IMPUNTUAL: 1 }), "PUNTUAL", "IMPUNTUAL").nivel, "mal");
});

// ── Los pares ──────────────────────────────────────────────────────────────

test("cada característica está en exactamente un par, y ninguna quedó suelta", () => {
  const enPares = PARES.flatMap(p => [p.bueno, p.malo]);
  assert.equal(enPares.length, ATRIBUTOS.length);
  assert.equal(new Set(enPares).size, ATRIBUTOS.length);
  for (const a of ATRIBUTOS) assert.ok(enPares.includes(a.code), `${a.code} no está en ningún par`);
});

test("cada par tiene una buena y una mala, y las dos son del mismo público", () => {
  for (const par of PARES) {
    assert.equal(esBueno(par.bueno), true, par.key);
    assert.equal(esBueno(par.malo), false, par.key);
    const buena = ATRIBUTOS.find(a => a.code === par.bueno);
    const mala = ATRIBUTOS.find(a => a.code === par.malo);
    assert.equal(buena.sobre, par.sobre, par.key);
    assert.equal(mala.sobre, par.sobre, par.key);
  }
});

test("nadie puede pasarse del tope del servidor: una respuesta por aspecto", () => {
  // Es lo que hace que el tope no haga falta explicárselo a la persona.
  for (const papel of ["dueño", "conductor"]) {
    assert.ok(paresPara(papel).length <= MAXIMO, papel);
  }
});

test("al dueño no se le pregunta cómo devolvió el auto", () => {
  const claves = paresPara("dueño").map(p => p.key);
  assert.ok(claves.includes("limpieza"));
  assert.ok(!claves.includes("devolucion"));
});

test("al conductor no se le pregunta si el auto era como en las fotos", () => {
  const claves = paresPara("conductor").map(p => p.key);
  assert.ok(claves.includes("cuidado"));
  assert.ok(!claves.includes("fidelidad"));
});

// ── El conteo ──────────────────────────────────────────────────────────────

test("se cuentan las características de varias reseñas, de mayor a menor", () => {
  const { todas, buenas, malas, total } = contarAtributos([
    { tags: ["PUNTUAL", "TRATO_AMABLE"] },
    { tags: ["PUNTUAL"] },
    { tags: ["AUTO_SUCIO"] },
  ]);
  assert.deepEqual(todas.map(x => [x.code, x.n]), [["PUNTUAL", 2], ["TRATO_AMABLE", 1], ["AUTO_SUCIO", 1]]);
  assert.equal(buenas.length, 2);
  assert.equal(malas.length, 1);
  assert.equal(total, 4);
});

test("un código que este front no conoce se saltea en vez de mostrarse crudo", () => {
  const { todas } = contarAtributos([{ tags: ["PUNTUAL", "INVENTADO_POR_EL_SERVIDOR"] }]);
  assert.deepEqual(todas.map(x => x.code), ["PUNTUAL"]);
});

test("una reseña sin características no rompe nada", () => {
  assert.deepEqual(contarAtributos([{ tags: null }, {}]).todas, []);
  assert.deepEqual(contarAtributos().todas, []);
});
