// ============================================================================
//  Pruebas de revisionDocumentos.js — el estado que antes no existía
// ----------------------------------------------------------------------------
//  Lo que más se prueba acá es la diferencia entre DOS COSAS QUE PARECEN UNA:
//
//   · `reasons` es qué está mal con el documento. La persona lo puede arreglar.
//   · `analysis.error` es qué nos pasó a nosotros. La persona no tiene nada que
//     hacer, y mandarla a sacar las fotos de nuevo es hacerle perder el tiempo.
//
//  Las dos llegan con el mismo `status: "PENDING"`, así que si no se las
//  distingue acá, la pantalla les dice lo mismo a las dos.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enAnalisis, reintentables, faltaReintentar, resultadoDe, todoAprobado,
  loQueHayQueDecir, codigosDeMotivos, CADA_MS, TOPE_MS,
} from "./revisionDocumentos.js";

const doc = (type, status, extra = {}) => ({
  id: `d-${type}`, type, status, reasons: [], documents: { front: true, back: true },
  analysis: { status: "DONE", pending: false, error: null, canRetry: false },
  ...extra,
});

const MOTIVO = {
  code: "DATO_NO_COINCIDE_CON_LA_CUENTA",
  field: "fecha_nacimiento",
  message: "La fecha de nacimiento de tu documento no coincide con la de tu cuenta (el documento dice 1998-03-07).",
};

// ── Cuándo seguir mirando ──────────────────────────────────────────────────

test("mientras haya un documento en analisis, se sigue preguntando", () => {
  const docs = [
    doc("DNI", "APPROVED"),
    doc("LICENSE", "PENDING", { analysis: { status: "QUEUED", pending: true, error: null, canRetry: false } }),
  ];
  assert.equal(enAnalisis(docs), true);
});

test("con todos resueltos se deja de preguntar", () => {
  assert.equal(enAnalisis([doc("DNI", "APPROVED"), doc("LICENSE", "APPROVED")]), false);
  assert.equal(enAnalisis([]), false);
  assert.equal(enAnalisis(null), false);
});

test("los tiempos son los que pide el backend: cada 3 segundos, con tope", () => {
  assert.equal(CADA_MS, 3000);
  assert.ok(TOPE_MS >= 60_000, "el tope tiene que ser holgado: la lectura ronda los 10 segundos");
});

// ── El reintento, una sola vez ─────────────────────────────────────────────

test("solo se reintenta lo que el servidor dice que se puede reintentar", () => {
  const docs = [
    doc("DNI", "PENDING", { analysis: { status: "FAILED", pending: false, error: "No contestó", canRetry: true } }),
    doc("LICENSE", "PENDING", { analysis: { status: "FAILED", pending: false, error: "No contestó", canRetry: false } }),
  ];
  assert.deepEqual(reintentables(docs).map((d) => d.type), ["DNI"]);
});

test("una sola vez por documento: el servicio lee de a uno y el turno es de otro", () => {
  const docs = [doc("DNI", "PENDING", { analysis: { status: "FAILED", pending: false, error: "x", canRetry: true } })];
  assert.deepEqual(faltaReintentar(docs, []).map((d) => d.type), ["DNI"]);
  assert.deepEqual(faltaReintentar(docs, ["DNI"]), []);
});

// ── En qué quedó cada documento ────────────────────────────────────────────

test("aprobado solo", () => {
  assert.equal(resultadoDe(doc("DNI", "APPROVED")).clase, "aprobado");
});

test("con motivos: es algo del documento y se puede corregir", () => {
  const r = resultadoDe(doc("DNI", "PENDING", { reasons: [MOTIVO] }));
  assert.equal(r.clase, "motivos");
  assert.equal(r.motivos[0].message, MOTIVO.message);
  assert.equal(r.error, null);
});

test("sin motivos: el problema fue nuestro, y se dice con otras palabras", () => {
  // MISMO status que el de arriba. Sin distinguirlos, a quien no tiene nada que
  // arreglar se le pide que saque las fotos de nuevo.
  const r = resultadoDe(doc("DNI", "PENDING", {
    analysis: { status: "FAILED", pending: false, error: "El servicio de lectura no contestó.", canRetry: true },
  }));
  assert.equal(r.clase, "sinLectura");
  assert.equal(r.error, "El servicio de lectura no contestó.");
  assert.deepEqual(r.motivos, []);
});

test("mientras se analiza no se muestra ningun veredicto todavia", () => {
  const r = resultadoDe(doc("DNI", "PENDING", {
    reasons: [MOTIVO],
    analysis: { status: "QUEUED", pending: true, error: null, canRetry: false },
  }));
  assert.equal(r.clase, "analizando");
  assert.deepEqual(r.motivos, []);
});

test("en la cola de un administrador", () => {
  assert.equal(resultadoDe(doc("DNI", "MANUAL_REVIEW")).clase, "enRevision");
});

test("rechazado por un administrador, con el motivo", () => {
  const r = resultadoDe(doc("DNI", "REJECTED", { reasons: [{ code: "RECHAZADO_POR_ADMIN", message: "La foto está cortada." }] }));
  assert.equal(r.clase, "rechazado");
  assert.equal(r.motivos[0].message, "La foto está cortada.");
});

test("sin documento no se inventa nada", () => {
  assert.equal(resultadoDe(null).clase, "esperando");
  assert.equal(resultadoDe(undefined).clase, "esperando");
});

// ── El resumen para la pantalla ────────────────────────────────────────────

test("los motivos y los errores nuestros van por separado", () => {
  const { motivos, errores } = loQueHayQueDecir([
    doc("DNI", "PENDING", { reasons: [MOTIVO] }),
    doc("LICENSE", "PENDING", { analysis: { status: "FAILED", pending: false, error: "No se pudo leer.", canRetry: false } }),
  ]);
  assert.equal(motivos.length, 1);
  assert.equal(motivos[0].documento, "DNI");
  assert.equal(errores.length, 1);
  assert.equal(errores[0].documento, "LICENSE");
});

test("todo aprobado solo si hay documentos y todos estan aprobados", () => {
  assert.equal(todoAprobado([doc("DNI", "APPROVED"), doc("LICENSE", "APPROVED")]), true);
  assert.equal(todoAprobado([doc("DNI", "APPROVED"), doc("LICENSE", "PENDING")]), false);
  // Sin ningun documento NO es "todo aprobado": es que no se mando nada.
  assert.equal(todoAprobado([]), false);
});

// ── Los codigos que eligen el boton ────────────────────────────────────────

test("los codigos salen de los motivos, sin repetir", () => {
  const codigos = codigosDeMotivos([
    doc("DNI", "PENDING", { reasons: [MOTIVO] }),
    doc("LICENSE", "REJECTED", { reasons: [MOTIVO, { code: "LICENCIA_VENCIDA", message: "Vencida." }] }),
  ]);
  assert.deepEqual(codigos, [MOTIVO.code, "LICENCIA_VENCIDA"]);
});

test("un problema NUESTRO no genera ningun boton", () => {
  // El servicio de lectura caido no es un motivo: no hay nada que corregir, el
  // reintento ya salio solo, y ofrecer "saca las fotos de nuevo" seria mandar a
  // rehacer un tramite que estaba bien.
  const codigos = codigosDeMotivos([
    doc("LICENSE", "PENDING", { analysis: { status: "FAILED", pending: false, error: "No se pudo leer.", canRetry: false } }),
  ]);
  assert.deepEqual(codigos, []);
});

test("sin documentos no hay codigos", () => {
  assert.deepEqual(codigosDeMotivos([]), []);
  assert.deepEqual(codigosDeMotivos(null), []);
});
