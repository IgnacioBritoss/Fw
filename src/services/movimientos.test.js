// ============================================================================
//  Pruebas de movimientos.js
// ----------------------------------------------------------------------------
//  Los tipos de hecho que aparecen aca son los que escribe de verdad el
//  servidor (recordEvent, en payments.service.ts), y los limites de la captura
//  son los mismos que pone CaptureDepositDto.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  comoSeLeeElMovimiento, paraMostrar, garantiaDeLaReserva, revisarCaptura,
  liquidacionPendiente,
} from "./movimientos.js";

const hecho = (type, createdAt) => ({ id: type + createdAt, type, status: "PAID", amountMinor: 3000000, currency: "ars", createdAt });

test("cada hecho del registro se lee en castellano", () => {
  assert.equal(comoSeLeeElMovimiento("intent.succeeded").clave, "mov.cobrado");
  assert.equal(comoSeLeeElMovimiento("hold.authorized").signo, "retiene");
  assert.equal(comoSeLeeElMovimiento("transfer.created").signo, "sale");
});

test("un hecho que el front NO conoce se muestra igual", () => {
  /*
    Es mejor mostrar "algo.raro" que esconder un movimiento de plata porque el
    front no lo conoce: el dia que el servidor agregue un tipo, el registro
    sigue estando completo en vez de tener un agujero silencioso.
  */
  const m = comoSeLeeElMovimiento("algo.nuevo");
  assert.equal(m.clave, null);
  assert.equal(m.crudo, "algo.nuevo");
});

test("para mirarlo va al reves: lo ultimo primero", () => {
  // El servidor lo guarda del mas viejo al mas nuevo, que es correcto para
  // guardarlo. Para mirarlo, lo que acaba de pasar es lo que se busca.
  const registro = [
    hecho("intent.succeeded", "2026-09-01T10:00:00Z"),
    hecho("hold.authorized", "2026-09-03T10:00:00Z"),
    hecho("hold.released", "2026-09-05T10:00:00Z"),
  ];
  assert.deepEqual(paraMostrar(registro).map(m => m.type),
    ["hold.released", "hold.authorized", "intent.succeeded"]);
});

test("un registro vacio o roto no rompe la pantalla", () => {
  for (const nada of [null, undefined, {}, "", 0]) {
    assert.deepEqual(paraMostrar(nada), []);
  }
});

// ── La garantia, mirada desde el panel de administracion ───────────────────

const RESERVA = {
  id: "b1", currency: "ars", depositSnapshot: 50000,
  depositPaymentIntentId: "pi_1", depositCapturedAmount: null,
};

test("con la garantia retenida se puede cobrar, hasta lo que se acordo", () => {
  const g = garantiaDeLaReserva(RESERVA);
  assert.equal(g.topeMinor, 5000000);
  assert.equal(g.total, 50000);
});

test("sin retencion pedida no hay nada que cobrar", () => {
  // `depositPaymentIntentId` lo escribe el servidor al PEDIR la retencion: sin
  // el, nunca se autorizo nada.
  assert.equal(garantiaDeLaReserva({ ...RESERVA, depositPaymentIntentId: null }), null);
});

test("una garantia YA cobrada no se cobra dos veces", () => {
  // Capturar consume la retencion: se cobra una sola vez.
  assert.equal(garantiaDeLaReserva({ ...RESERVA, depositCapturedAmount: 12000 }), null);
  // Y cero cobrado es un cobro hecho por cero, no "sin cobrar".
  assert.equal(garantiaDeLaReserva({ ...RESERVA, depositCapturedAmount: 0 }), null);
});

test("una reserva sin garantia no ofrece nada", () => {
  assert.equal(garantiaDeLaReserva({ ...RESERVA, depositSnapshot: null }), null);
  assert.equal(garantiaDeLaReserva({ ...RESERVA, depositSnapshot: 0 }), null);
  assert.equal(garantiaDeLaReserva(null), null);
  assert.equal(garantiaDeLaReserva(undefined), null);
});

// ── Cobrar parte de la garantia ────────────────────────────────────────────

const TOPE = 5000000;   // 50.000 retenidos
const BIEN = { monto: "12000", motivo: "Rayon largo en la puerta del acompañante", topeMinor: TOPE };

test("una captura bien cargada pasa y sale en centavos", () => {
  // El servidor los quiere en centavos y enteros. La conversion vive aca para
  // que no haya dos lugares redondeando plata ajena.
  const r = revisarCaptura(BIEN);
  assert.equal(r.ok, true);
  assert.equal(r.montoMinor, 1200000);
});

test("no se puede cobrar mas de lo retenido", () => {
  const r = revisarCaptura({ ...BIEN, monto: "60000" });
  assert.equal(r.ok, false);
  assert.equal(r.errores.monto, "captura.error.montoSePasa");
  // Justo el tope si se puede.
  assert.equal(revisarCaptura({ ...BIEN, monto: "50000" }).ok, true);
});

test("cero, negativo o cualquier cosa no pasan", () => {
  assert.equal(revisarCaptura({ ...BIEN, monto: "0" }).errores.monto, "captura.error.montoInvalido");
  assert.equal(revisarCaptura({ ...BIEN, monto: "-100" }).errores.monto, "captura.error.montoInvalido");
  assert.equal(revisarCaptura({ ...BIEN, monto: "hola" }).errores.monto, "captura.error.montoInvalido");
  assert.equal(revisarCaptura({ ...BIEN, monto: "" }).errores.monto, "captura.error.montoVacio");
});

test("se escribe con coma, que es como se escribe acá", () => {
  assert.equal(revisarCaptura({ ...BIEN, monto: "1200,50" }).montoMinor, 120050);
});

test("EL MOTIVO TIENE QUE EXPLICAR ALGO", () => {
  /*
    No es burocracia: es lo que va a leer quien alquilo cuando pregunte por que
    le cobraron la garantia, y "daño" no es una respuesta. El servidor exige
    diez caracteres; se revisa aca tambien para que el problema se vea mientras
    se escribe y no despues de apretar.
  */
  assert.equal(revisarCaptura({ ...BIEN, motivo: "" }).errores.motivo, "captura.error.motivoVacio");
  assert.equal(revisarCaptura({ ...BIEN, motivo: "daño" }).errores.motivo, "captura.error.motivoCorto");
  assert.equal(revisarCaptura({ ...BIEN, motivo: "x".repeat(501) }).errores.motivo, "captura.error.motivoLargo");
  assert.equal(revisarCaptura({ ...BIEN, motivo: "x".repeat(10) }).ok, true);
});

test("los dos errores a la vez se avisan los dos", () => {
  const r = revisarCaptura({ monto: "", motivo: "", topeMinor: TOPE });
  assert.equal(Object.keys(r.errores).length, 2);
});

// ── La reserva devuelta a la que le falta liquidar ─────────────────────────

test("una devuelta sin transferencia al dueño pide reintento", () => {
  /*
    Al confirmarse la devolucion el servidor suelta el deposito y le transfiere
    al dueño. Eso habla con Stripe y puede fallar solo —el caso comun es el
    dueño que no termino el alta de cobros—. La devolucion no se cae por eso,
    asi que la reserva queda cerrada con el dueño sin cobrar y alguien lo tiene
    que poder reintentar.
  */
  assert.equal(liquidacionPendiente({
    status: "COMPLETED", ownerPayoutSnapshot: 200000, ownerTransferId: null,
  }), true);
});

test("y una que si transfirio, no", () => {
  assert.equal(liquidacionPendiente({
    status: "COMPLETED", ownerPayoutSnapshot: 200000, ownerTransferId: "tr_1",
  }), false);
});

test("una reserva que todavia no se devolvio no se liquida", () => {
  for (const status of ["ACCEPTED", "IN_PROGRESS", "RETURN_PENDING", "CANCELLED_BY_RENTER"]) {
    assert.equal(liquidacionPendiente({ status, ownerPayoutSnapshot: 200000 }), false, status);
  }
});

test("sin plata para el dueño el boton no se prende nunca", () => {
  // Ahi no va a haber identificador de transferencia jamas, y el boton
  // quedaria ofreciendo arreglar algo que no esta roto.
  assert.equal(liquidacionPendiente({ status: "COMPLETED", ownerPayoutSnapshot: 0 }), false);
  assert.equal(liquidacionPendiente({ status: "COMPLETED" }), false);
  assert.equal(liquidacionPendiente(null), false);
});
