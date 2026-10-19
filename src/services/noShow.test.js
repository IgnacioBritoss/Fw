// ============================================================================
//  Pruebas de noShow.js — el retiro que no pasó
// ----------------------------------------------------------------------------
//  Esto decide si se dibuja un botón que mueve plata. Las dos cosas que se
//  cuidan acá:
//
//   1. QUE LA VENTANA SEA LA MISMA PARA LOS DOS LADOS. Durante un tiempo solo
//      el dueño podía dejar constancia, y eso no era una asimetría de código
//      sino de poder: su versión era la única escrita que existía, y alcanzaba
//      con reportar para quedarse con la seña.
//   2. QUE NO SE OFREZCA LO QUE EL SERVIDOR VA A RECHAZAR. Un botón que
//      contesta un error es peor que un botón que no está.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HORAS_PARA_RECLAMAR,
  MINUTOS_DE_GRACIA,
  estaTrabada,
  estadoDelRetiro,
  puedeReportar,
} from "./noShow.js";

const INICIO = "2026-06-10T15:00:00.000Z";
const enMinutos = (m) => new Date(Date.parse(INICIO) + m * 60 * 1000);

const RESERVA = {
  status: "READY_FOR_PICKUP",
  startDate: INICIO,
  pickupConfirmedAt: null,
  renterNoShowAt: null,
  ownerNoShowAt: null,
  noShowResolvedFor: null,
};

const mirar = (extra, soyElDueno, minutos) =>
  puedeReportar({ ...RESERVA, ...extra }, {
    soyElDueno,
    ahora: enMinutos(minutos),
  });

// ── La ventana ───────────────────────────────────────────────────────────────

test("LA MISMA VENTANA PARA LOS DOS LADOS", () => {
  /*
    La prueba que importa. Se corren las dos puntas para el dueño y para quien
    alquiló, y los resultados tienen que ser idénticos: ninguno de los dos
    puede tener un plazo más cómodo que el otro.
  */
  for (const soyElDueno of [true, false]) {
    const quien = soyElDueno ? "el dueño" : "quien alquiló";
    assert.deepEqual(mirar({}, soyElDueno, MINUTOS_DE_GRACIA - 1),
      { puede: false, motivo: "todaviaNo" }, quien);
    assert.deepEqual(mirar({}, soyElDueno, MINUTOS_DE_GRACIA),
      { puede: true, motivo: null }, quien);
    assert.deepEqual(mirar({}, soyElDueno, HORAS_PARA_RECLAMAR * 60),
      { puede: true, motivo: null }, quien);
    assert.deepEqual(mirar({}, soyElDueno, HORAS_PARA_RECLAMAR * 60 + 1),
      { puede: false, motivo: "plazoVencido" }, quien);
  }
});

test("en el horario justo todavía no: un atraso no es un plantón", () => {
  // El tránsito, el colectivo, no encontrar la esquina.
  assert.equal(mirar({}, true, 0).motivo, "todaviaNo");
  assert.equal(mirar({}, false, 5).motivo, "todaviaNo");
});

// ── Lo que lo bloquea ────────────────────────────────────────────────────────

test("con la entrega confirmada no hay nada que reportar", () => {
  const entregada = { pickupConfirmedAt: INICIO, status: "IN_PROGRESS" };
  assert.equal(mirar(entregada, true, 120).motivo, "yaSeEntrego");
  assert.equal(mirar(entregada, false, 120).motivo, "yaSeEntrego");
});

test("sobre una reserva cerrada tampoco", () => {
  assert.equal(mirar({ status: "CANCELLED_BY_RENTER" }, true, 120).motivo, "cerrada");
  assert.equal(mirar({ status: "COMPLETED" }, false, 120).motivo, "cerrada");
});

test("y CADA UNO VE SOLO SU PROPIA CONSTANCIA", () => {
  /*
    El dueño deja la de "no vino a buscarlo" (renterNoShowAt) y quien alquiló
    la de "no me lo trajo" (ownerNoShowAt). Si se leyera la del otro, al dueño
    le desaparecería el botón porque la otra parte ya habló, que es
    exactamente al revés de lo que tiene que pasar: es ahí cuando más falta
    hace poder dar la propia versión.
  */
  const conLaDelDueno = { renterNoShowAt: INICIO };
  assert.equal(mirar(conLaDelDueno, true, 120).motivo, "yaReportaste");
  assert.equal(mirar(conLaDelDueno, false, 120).puede, true);

  const conLaDelOtro = { ownerNoShowAt: INICIO };
  assert.equal(mirar(conLaDelOtro, false, 120).motivo, "yaReportaste");
  assert.equal(mirar(conLaDelOtro, true, 120).puede, true);
});

test("sin reserva no se ofrece nada", () => {
  assert.deepEqual(puedeReportar(null, { soyElDueno: true }),
    { puede: false, motivo: "noEsTuReserva" });
});

// ── En qué quedó ─────────────────────────────────────────────────────────────

test("estadoDelRetiro cuenta las dos constancias desde los dos lados", () => {
  const con = (extra, soyElDueno) =>
    estadoDelRetiro({ ...RESERVA, ...extra }, { soyElDueno }).clave;

  assert.equal(con({}, true), "sinReportes");
  // La del dueño es "mía" para él y "suya" para el otro, y al revés.
  assert.equal(con({ renterNoShowAt: INICIO }, true), "reporteMio");
  assert.equal(con({ renterNoShowAt: INICIO }, false), "reporteSuyo");
  assert.equal(con({ ownerNoShowAt: INICIO }, false), "reporteMio");
  assert.equal(con({ ownerNoShowAt: INICIO }, true), "reporteSuyo");
});

test("CON LAS DOS QUEDA TRABADO", () => {
  const dos = { renterNoShowAt: INICIO, ownerNoShowAt: INICIO };
  assert.equal(estadoDelRetiro({ ...RESERVA, ...dos }, { soyElDueno: true }).clave, "trabado");
  assert.equal(estaTrabada({ ...RESERVA, ...dos }), true);
  // Y con una sola, no.
  assert.equal(estaTrabada({ ...RESERVA, renterNoShowAt: INICIO }), false);
  assert.equal(estaTrabada(null), false);
});

test("y resuelto deja de estar trabado, a favor de quien corresponda", () => {
  const resuelto = {
    renterNoShowAt: INICIO, ownerNoShowAt: INICIO, noShowResolvedFor: "OWNER",
  };
  assert.equal(estaTrabada({ ...RESERVA, ...resuelto }), false);

  const paraElDueno = estadoDelRetiro({ ...RESERVA, ...resuelto }, { soyElDueno: true });
  assert.equal(paraElDueno.clave, "resuelto");
  assert.equal(paraElDueno.aMiFavor, true);

  const paraElOtro = estadoDelRetiro({ ...RESERVA, ...resuelto }, { soyElDueno: false });
  assert.equal(paraElOtro.clave, "resuelto");
  assert.equal(paraElOtro.aMiFavor, false);
});
