// ============================================================================
//  Pruebas de reclamo.js
// ----------------------------------------------------------------------------
//  Lo que se prueba aca es que el formulario no deje mandar un reclamo que el
//  servidor va a rechazar DESPUES de subir las fotos, que es un minuto perdido
//  y un error que no se entiende.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  revisarReclamo, comoSeLeeLaRevision, comoSeLeeElReclamo,
  DESCRIPCION_MINIMA, MAX_FOTOS,
} from "./reclamo.js";

const TEXTO = "Rayon profundo en la puerta trasera izquierda, no estaba en las fotos del retiro.";
const BIEN = { descripcion: TEXTO, monto: "60", fotos: ["f1"], topeMinor: 20000 };

// ── El formulario ──────────────────────────────────────────────────────────

test("un reclamo completo pasa", () => {
  const r = revisarReclamo(BIEN);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errores, {});
  assert.equal(r.montoMinor, 6000);
});

test("SIN FOTOS NO SE RECLAMA", () => {
  /*
    No es un tramite: un reclamo sin fotos es la palabra de uno contra la del
    otro, y hay plata de por medio. Quien resuelve tiene que poder comparar el
    daño contra las fotos del retiro.
  */
  assert.equal(revisarReclamo({ ...BIEN, fotos: [] }).errores.fotos, "reclamo.error.sinFotos");
  assert.equal(revisarReclamo({ ...BIEN, fotos: null }).errores.fotos, "reclamo.error.sinFotos");
  const demasiadas = Array.from({ length: MAX_FOTOS + 1 }, (_, i) => `f${i}`);
  assert.equal(revisarReclamo({ ...BIEN, fotos: demasiadas }).errores.fotos, "reclamo.error.muchasFotos");
});

test("la descripcion tiene que explicar algo", () => {
  // Ese texto es lo que va a leer quien alquilo cuando le descuenten plata de
  // su garantia. "Rayon" no es una respuesta.
  assert.equal(revisarReclamo({ ...BIEN, descripcion: "" }).errores.descripcion, "reclamo.error.textoVacio");
  assert.equal(revisarReclamo({ ...BIEN, descripcion: "Rayon" }).errores.descripcion, "reclamo.error.textoCorto");
  assert.equal(revisarReclamo({ ...BIEN, descripcion: "x".repeat(1001) }).errores.descripcion, "reclamo.error.textoLargo");
  assert.equal(revisarReclamo({ ...BIEN, descripcion: "x".repeat(DESCRIPCION_MINIMA) }).ok, true);
});

test("no se puede reclamar mas de lo retenido", () => {
  // Pedir mas de lo que hay bloqueado es pedir plata que este circuito no
  // puede mover, y termina en una expectativa que nadie puede cumplir.
  assert.equal(revisarReclamo({ ...BIEN, monto: "300" }).errores.monto, "reclamo.error.montoSePasa");
  assert.equal(revisarReclamo({ ...BIEN, monto: "200" }).ok, true);
});

test("el importe se escribe como lo escribe una persona", () => {
  assert.equal(revisarReclamo({ ...BIEN, monto: "60,50" }).montoMinor, 6050);
  assert.equal(revisarReclamo({ ...BIEN, monto: "60.50" }).montoMinor, 6050);
  assert.equal(revisarReclamo({ ...BIEN, monto: "" }).errores.monto, "reclamo.error.montoVacio");
  assert.equal(revisarReclamo({ ...BIEN, monto: "hola" }).errores.monto, "reclamo.error.montoInvalido");
  assert.equal(revisarReclamo({ ...BIEN, monto: "0" }).errores.monto, "reclamo.error.montoInvalido");
});

test("sin tope no se inventa uno", () => {
  // Una reserva sin deposito no tiene que bloquear el formulario por un limite
  // que no existe: eso lo decide el servidor.
  assert.equal(revisarReclamo({ ...BIEN, monto: "9999", topeMinor: null }).ok, true);
  assert.equal(revisarReclamo({ ...BIEN, monto: "9999", topeMinor: 0 }).ok, true);
});

test("los errores se avisan todos juntos", () => {
  const r = revisarReclamo({ descripcion: "", monto: "", fotos: [] });
  assert.equal(Object.keys(r.errores).length, 3);
});

// ── La ventana ─────────────────────────────────────────────────────────────

test("con la ventana abierta dice cuantas horas quedan", () => {
  const r = comoSeLeeLaRevision({ puedeReclamar: true, horasQueQuedan: 11.2 });
  assert.equal(r.clave, "reclamo.ventanaAbierta");
  // Hacia arriba: decir "queda 1 hora" con 70 minutos es correcto; decir "0"
  // cuando todavia se puede reclamar seria mentir en el peor momento.
  assert.equal(r.horas, 12);
  assert.equal(comoSeLeeLaRevision({ puedeReclamar: true, horasQueQuedan: 0.2 }).horas, 1);
});

test("con un reclamo ya abierto lo dice, que no es lo mismo que vencida", () => {
  const r = comoSeLeeLaRevision({
    puedeReclamar: false, horasQueQuedan: -3, claims: [{ status: "OPEN" }],
  });
  assert.equal(r.clave, "reclamo.yaReclamado");
});

test("y con el plazo pasado, tambien", () => {
  const r = comoSeLeeLaRevision({ puedeReclamar: false, horasQueQuedan: -3, claims: [] });
  assert.equal(r.clave, "reclamo.ventanaCerrada");
  // Un reclamo ya resuelto no cuenta como abierto.
  assert.equal(comoSeLeeLaRevision({
    puedeReclamar: false, horasQueQuedan: -3, claims: [{ status: "ACCEPTED" }],
  }).clave, "reclamo.ventanaCerrada");
});

test("sin datos no dice nada, en vez de romper", () => {
  assert.equal(comoSeLeeLaRevision().clave, null);
  assert.equal(comoSeLeeLaRevision({}).clave, null);
});

test("el reclamo se lee con lo que haya", () => {
  assert.deepEqual(comoSeLeeElReclamo({ claimedAmountMinor: 6000, status: "OPEN" }), {
    monto: 60, cobrado: null, estado: "OPEN", fotos: [],
  });
  assert.equal(comoSeLeeElReclamo({ capturedAmountMinor: 4000 }).cobrado, 40);
  assert.equal(comoSeLeeElReclamo().estado, "OPEN");
});
