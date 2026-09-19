// ============================================================================
//  Pruebas de cancelacion.js
// ----------------------------------------------------------------------------
//  Esto es el cartel que se lee ANTES de cancelar, asi que lo que se prueba es
//  que el cartel diga la verdad: los plazos, y sobre todo los numeros. Prometer
//  que vuelve plata que no vuelve es el peor error posible en esta pantalla.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decidirCancelacion, loQueVuelve, avisoDeCancelacion, horasQueQuedanGratis,
  HORAS_DE_GRACIA,
} from "./cancelacion.js";

const INICIO = "2026-10-10T12:00:00.000Z";
const horasAntes = (h) => new Date(new Date(INICIO).getTime() - h * 60 * 60 * 1000);

const decidir = (horas, extra = {}) => decidirCancelacion({
  status: "ACCEPTED", startDate: INICIO, ahora: horasAntes(horas), ...extra,
});

// ── Los plazos ─────────────────────────────────────────────────────────────

test("con tiempo de sobra vuelve todo", () => {
  const d = decidir(72);
  assert.equal(d.puede, true);
  assert.equal(d.tier, "libre");
  assert.equal(d.retieneSena, false);
});

test("el limite cuenta a favor de quien cancela", () => {
  // A las 48 horas exactas todavia entra. Un borde que cae del otro lado
  // convierte un plazo claro en una loteria de segundos.
  assert.equal(decidir(HORAS_DE_GRACIA).tier, "libre");
  assert.equal(decidir(HORAS_DE_GRACIA - 0.02).tier, "tardia");
});

test("la noche anterior retiene la seña", () => {
  const d = decidir(10);
  assert.equal(d.puede, true);
  assert.equal(d.tier, "tardia");
  assert.equal(d.retieneSena, true);
});

test("el dueño que se baja devuelve todo, y en cualquier momento", () => {
  for (const horas of [200, 48, 10, 1]) {
    const d = decidir(horas, { laCancelaElDueno: true });
    assert.equal(d.tier, "delDueno");
    assert.equal(d.retieneSena, false);
  }
});

test("con el auto afuera no se cancela: se devuelve", () => {
  for (const status of ["IN_PROGRESS", "RETURN_PENDING"]) {
    const d = decidir(-5, { status });
    assert.equal(d.puede, false);
    assert.equal(d.motivo, "enCurso");
  }
});

test("una reserva terminada o cancelada tampoco", () => {
  for (const status of ["COMPLETED", "CANCELLED_BY_RENTER", "REJECTED"]) {
    assert.equal(decidir(-100, { status }).puede, false);
    assert.equal(decidir(-100, { status }).motivo, "cerrada");
  }
});

test("sin fecha no rompe la pantalla", () => {
  // La lista de reservas llega antes que todo lo demas; una fecha que falta no
  // puede dejar sin boton de cancelar a quien tiene derecho a cancelar.
  const d = decidirCancelacion({ status: "ACCEPTED" });
  assert.equal(d.puede, true);
});

// ── Los numeros ────────────────────────────────────────────────────────────

const RESERVA = {
  senaAmountSnapshot: 87780,
  balanceAmountSnapshot: 204820,
  depositSnapshot: 200,
};

test("solo cuenta lo que YA se pago", () => {
  /*
    Prometer que vuelven 292.600 en una reserva donde se pago solo la seña
    seria mentir con un numero grande, que es la peor manera de mentir.
  */
  const impaga = { ...RESERVA, paymentStatus: "PENDING" };
  assert.deepEqual(loQueVuelve(impaga, { retieneSena: false }), { devuelve: 0, retiene: 0, pagado: 0 });

  const conSena = { ...RESERVA, paymentStatus: "DEPOSIT_PAID" };
  assert.equal(loQueVuelve(conSena, { retieneSena: false }).devuelve, 87780);

  const todo = { ...RESERVA, paymentStatus: "FULLY_PAID" };
  assert.equal(loQueVuelve(todo, { retieneSena: false }).devuelve, 292600);
});

test("cancelando tarde vuelve el saldo y no la seña", () => {
  const todo = { ...RESERVA, paymentStatus: "FULLY_PAID" };
  const r = loQueVuelve(todo, { retieneSena: true });
  assert.equal(r.devuelve, 204820);
  assert.equal(r.retiene, 87780);
  // Y lo que vuelve mas lo que se retiene es exactamente lo que se pago.
  assert.equal(r.devuelve + r.retiene, r.pagado);
});

test("cancelando tarde con solo la seña paga no vuelve nada", () => {
  const conSena = { ...RESERVA, paymentStatus: "DEPOSIT_PAID" };
  const r = loQueVuelve(conSena, { retieneSena: true });
  assert.equal(r.devuelve, 0);
  assert.equal(r.retiene, 87780);
});

test("EL DEPOSITO NO APARECE EN NINGUNA DE LAS DOS COLUMNAS", () => {
  /*
    No es un cobro: es una retencion, y se libera pase lo que pase. Meterlo en
    "lo que vuelve" haria que el total devuelto no coincida con lo que la
    tarjeta va a mostrar, que es justo donde alguien reclama.
  */
  const todo = { ...RESERVA, paymentStatus: "FULLY_PAID" };
  const r = loQueVuelve(todo, { retieneSena: false });
  assert.equal(r.devuelve, 292600);
  assert.ok(!String(r.devuelve).includes("200200"));
});

// ── El cartel ──────────────────────────────────────────────────────────────

test("el cartel cambia con el caso", () => {
  const todo = { ...RESERVA, paymentStatus: "FULLY_PAID" };
  assert.equal(avisoDeCancelacion(todo, decidir(72)).clave, "cancelar.libre");
  assert.equal(avisoDeCancelacion(todo, decidir(10)).clave, "cancelar.tardia");
  assert.equal(avisoDeCancelacion(todo, decidir(10, { laCancelaElDueno: true })).clave, "cancelar.delDueno");
  assert.equal(avisoDeCancelacion(todo, decidir(-5, { status: "IN_PROGRESS" })).clave, "cancelar.enCurso");
});

test("sin nada pagado el cartel no habla de plata", () => {
  // Hablar de devoluciones cuando no hay nada cobrado es ruido: lo que importa
  // ahi es que las fechas se liberan.
  const impaga = { ...RESERVA, paymentStatus: "PENDING" };
  assert.equal(avisoDeCancelacion(impaga, decidir(10)).clave, "cancelar.sinPagos");
  assert.equal(avisoDeCancelacion(impaga, decidir(72)).clave, "cancelar.sinPagos");
});

test("dice cuantas horas quedan de cancelacion libre", () => {
  // "Te quedan 6 horas" es accionable; "48 horas antes del inicio" hay que
  // calcularlo de cabeza.
  assert.equal(horasQueQuedanGratis(decidir(54)), 6);
  assert.equal(horasQueQuedanGratis(decidir(48.5)), 0);
  // Ya pasado, o tan lejos que decirlo no aporta nada.
  assert.equal(horasQueQuedanGratis(decidir(10)), null);
  assert.equal(horasQueQuedanGratis(decidir(200)), null);
});
