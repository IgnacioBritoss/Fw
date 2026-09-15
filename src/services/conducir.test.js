// ============================================================================
//  Pruebas de conducir.js — no bloquear a nadie por un dato que falta
// ----------------------------------------------------------------------------
//  La mitad de estas pruebas fija lo mismo desde distintos ángulos: SIN DATO NO
//  SE BLOQUEA. Un backend que todavía no manda `driving`, o una fecha en null
//  porque esa cuenta se verificó antes de que existiera la lectura automática,
//  significan "no se sabe", no "no puede".
//
//  Es el error que más caro sale acá: dejar afuera de la app a alguien que está
//  perfectamente habilitado, y encima sin nada que pueda hacer para destrabarlo.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  puedeConducir, licenciaVencePronto, esBloqueoDeConducir, esCuentaSinVerificar,
  motivosDelRechazo, avisoDeConducir, avisoDelRechazo, datosDeDocumentos,
} from "./conducir.js";

const VENCIDA = {
  code: "LICENCIA_VENCIDA",
  message: "Tu licencia de conducir está vencida desde el 3/3/2026.",
};

// ── Sin dato no se bloquea ─────────────────────────────────────────────────

test("un backend que todavia no manda 'driving' no bloquea a nadie", () => {
  assert.equal(puedeConducir({ id: "u1" }), true);
  assert.equal(avisoDeConducir({ id: "u1" }), null);
});

test("'driving' vacio tampoco bloquea", () => {
  assert.equal(puedeConducir({ driving: {} }), true);
  assert.equal(puedeConducir({ driving: { canRent: null } }), true);
});

test("sin sesion no hay aviso", () => {
  assert.equal(avisoDeConducir(null), null);
});

test("solo un canRent false explicito bloquea", () => {
  assert.equal(puedeConducir({ driving: { canRent: false } }), false);
  assert.equal(puedeConducir({ driving: { canRent: true } }), true);
});

// ── Los dos avisos ─────────────────────────────────────────────────────────

test("no poder manejar da el cartel firme, con el motivo del servidor", () => {
  const aviso = avisoDeConducir({
    driving: { canRent: false, reasons: [VENCIDA], licenseExpiresAt: "2026-03-03T12:00:00.000Z" },
  });
  assert.equal(aviso.tono, "bloqueo");
  assert.deepEqual(aviso.mensajes, [VENCIDA]);
  assert.equal(aviso.vence, "2026-03-03T12:00:00.000Z");
});

test("la licencia por vencer da el cartel suave", () => {
  const aviso = avisoDeConducir({ driving: { canRent: true, expiresSoon: true, licenseExpiresAt: "2026-10-01T00:00:00.000Z" } });
  assert.equal(aviso.tono, "pronto");
});

test("ya vencida, el aviso suave sobra: manda el que bloquea", () => {
  // Con las dos marcas a la vez, dos carteles sobre lo mismo se pisan y el que
  // importa se pierde entre los dos.
  const aviso = avisoDeConducir({ driving: { canRent: false, expiresSoon: true, reasons: [VENCIDA] } });
  assert.equal(aviso.tono, "bloqueo");
  assert.equal(licenciaVencePronto({ driving: { canRent: false, expiresSoon: true } }), false);
});

test("con todo en orden no se muestra nada", () => {
  assert.equal(avisoDeConducir({ driving: { canRent: true, expiresSoon: false } }), null);
});

// ── Los dos 403, que no son el mismo ───────────────────────────────────────

test("no poder manejar y no estar verificado son errores distintos", () => {
  const manejar = { status: 403, code: "DRIVING_NOT_ALLOWED" };
  const verificar = { status: 403, code: "ACCOUNT_NOT_VERIFIED" };
  assert.equal(esBloqueoDeConducir(manejar), true);
  assert.equal(esCuentaSinVerificar(manejar), false);
  assert.equal(esBloqueoDeConducir(verificar), false);
  assert.equal(esCuentaSinVerificar(verificar), true);
});

test("el codigo tambien se reconoce si vino adentro del payload", () => {
  assert.equal(esBloqueoDeConducir({ status: 403, payload: { code: "DRIVING_NOT_ALLOWED" } }), true);
});

test("un 403 cualquiera no se toma por ninguno de los dos", () => {
  assert.equal(esBloqueoDeConducir({ status: 403 }), false);
  assert.equal(esCuentaSinVerificar({ status: 403 }), false);
});

test("del rechazo salen los motivos que mando el servidor", () => {
  const aviso = avisoDelRechazo({ status: 403, code: "DRIVING_NOT_ALLOWED", payload: { reasons: [VENCIDA] } });
  assert.equal(aviso.tono, "bloqueo");
  assert.equal(aviso.mensajes[0].message, VENCIDA.message);
});

test("si el 403 no trajo la lista, el mensaje suelto sirve igual", () => {
  // Un cartel vacio es peor que una frase: no dice nada y encima parece roto.
  const motivos = motivosDelRechazo({ code: "DRIVING_NOT_ALLOWED", message: "Tu licencia está vencida." });
  assert.equal(motivos.length, 1);
  assert.equal(motivos[0].message, "Tu licencia está vencida.");
});

test("un error que no es de conducir no arma ningun aviso", () => {
  assert.equal(avisoDelRechazo({ status: 403, code: "ACCOUNT_NOT_VERIFIED" }), null);
});

// ── Los vencimientos ───────────────────────────────────────────────────────

test("solo se muestran las fechas que el servidor leyo de verdad", () => {
  const datos = datosDeDocumentos({
    licenseExpiresAt: "2031-04-06T12:00:00.000Z",
    licenseClass: "B.1",
    licenseIssuedAt: null,
    licenseBeginnerUntil: null,
    dniExpiresAt: null,
  });
  assert.deepEqual(datos.map((d) => d.campo), ["licenseExpiresAt", "licenseClass"]);
});

test("una cuenta vieja, sin ninguna fecha leida, no muestra la seccion", () => {
  assert.deepEqual(datosDeDocumentos({ id: "u1" }), []);
});
