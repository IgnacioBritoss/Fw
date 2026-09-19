// ============================================================================
//  Pruebas de pago.js — que tramo falta, y esperar a que el servidor se entere
// ----------------------------------------------------------------------------
//  La espera se prueba SIN esperar: el `dormir` entra por parametro y las
//  pruebas le pasan uno que no duerme. Si no, probar "el aviso nunca llega"
//  costaria veinte segundos de reloj por corrida y nadie lo correria.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tramosDelPago, tramoPendiente, esperarElCobro, esClaveDeOtraCuenta,
} from "./pago.js";

const MONTOS = { sena: 30000, balance: 70000, deposit: 50000 };
const cobro = (kind, status) => ({ kind, status, createdAt: "2026-09-18T10:00:00Z" });

// ── Que tramo falta ────────────────────────────────────────────────────────

test("sin nada pago, el que sigue es la seña", () => {
  assert.equal(tramoPendiente({ ...MONTOS, paymentStatus: "UNPAID" }).kind, "SENA");
});

test("con la seña paga sigue el saldo", () => {
  const t = tramoPendiente({ ...MONTOS, paymentStatus: "DEPOSIT_PAID" });
  assert.equal(t.kind, "BALANCE");
});

test("el deposito RETENIDO cuenta como hecho", () => {
  // Se autoriza, no se cobra: el estado que deja es AUTHORIZED y no PAID.
  const tramos = tramosDelPago({
    ...MONTOS, paymentStatus: "FULLY_PAID",
    records: [cobro("SENA", "PAID"), cobro("BALANCE", "PAID"), cobro("DEPOSIT_HOLD", "AUTHORIZED")],
  });
  assert.ok(tramos.every(t => t.hecho));
  assert.equal(tramoPendiente({
    ...MONTOS, paymentStatus: "FULLY_PAID",
    records: [cobro("SENA", "PAID"), cobro("BALANCE", "PAID"), cobro("DEPOSIT_HOLD", "AUTHORIZED")],
  }), null);
});

test("pago completo SIN deposito todavia debe el deposito", () => {
  // El agujero que esto vino a tapar: se pagaba todo, se salia de la pantalla
  // antes de autorizar la garantia, y el boton desaparecia para siempre.
  assert.equal(tramoPendiente({ ...MONTOS, paymentStatus: "FULLY_PAID" }).kind, "DEPOSIT_HOLD");
});

test("un tramo sin monto no existe", () => {
  const tramos = tramosDelPago({ sena: 30000, balance: 70000, deposit: null });
  assert.deepEqual(tramos.map(t => t.kind), ["SENA", "BALANCE"]);
});

// ── Esperar a que el servidor se entere ────────────────────────────────────

/** Un `dormir` que no duerme, pero anota cuanto le pidieron. */
function relojFalso() {
  const siestas = [];
  return { dormir: async (ms) => { siestas.push(ms); }, siestas };
}

/** Un servidor de mentira que contesta una cosa distinta en cada vuelta. */
function servidor(respuestas) {
  let vuelta = 0;
  const f = async () => respuestas[Math.min(vuelta++, respuestas.length - 1)];
  f.vueltas = () => vuelta;
  return f;
}

const IMPAGO = { paymentStatus: "UNPAID", ...MONTOS, records: [] };
const SENA_OK = { paymentStatus: "DEPOSIT_PAID", ...MONTOS, records: [cobro("SENA", "PAID")] };

test("si el aviso ya llego, contesta en la primera vuelta", () => {
  const { dormir, siestas } = relojFalso();
  return esperarElCobro({ kind: "SENA", pedirEstado: servidor([SENA_OK]), dormir })
    .then(r => {
      assert.equal(r.confirmado, true);
      assert.equal(r.vueltas, 1);
      // Y no durmio ni una vez: no hay nada que esperar.
      assert.deepEqual(siestas, []);
    });
});

test("espera al aviso de Stripe y despues confirma", async () => {
  /*
    El caso normal, y el motivo por el que esta funcion existe. Cuando el
    navegador termina de pagar, el servidor TODAVIA NO SABE NADA: se entera por
    un aviso aparte que manda Stripe. Refrescar una sola vez justo ahi muestra
    la reserva impaga con la plata ya debitada.
  */
  const { dormir, siestas } = relojFalso();
  const r = await esperarElCobro({
    kind: "SENA",
    pedirEstado: servidor([IMPAGO, IMPAGO, SENA_OK]),
    dormir,
  });
  assert.equal(r.confirmado, true);
  assert.equal(r.vueltas, 3);
  assert.equal(siestas.length, 2);
});

test("un RECHAZO corta la espera en el momento", async () => {
  // Sin esto, una tarjeta sin fondos dejaba la pantalla dando vueltas los
  // veinte segundos enteros para terminar diciendo "demora", que es mentira.
  const { dormir } = relojFalso();
  const rechazado = { paymentStatus: "FAILED", ...MONTOS, records: [cobro("SENA", "FAILED")] };
  const r = await esperarElCobro({
    kind: "SENA", pedirEstado: servidor([IMPAGO, rechazado, SENA_OK]), dormir,
  });
  assert.equal(r.confirmado, false);
  assert.equal(r.motivo, "rechazado");
  assert.equal(r.vueltas, 2);
});

test("si el aviso NUNCA llega, lo dice en vez de quedarse colgada", async () => {
  const { dormir, siestas } = relojFalso();
  const r = await esperarElCobro({
    kind: "SENA", pedirEstado: servidor([IMPAGO]), dormir, vueltas: 5,
  });
  assert.equal(r.confirmado, false);
  assert.equal(r.motivo, "demora");
  assert.equal(r.vueltas, 5);
  // Cinco preguntas, cuatro esperas: despues de la ultima no se duerme.
  assert.equal(siestas.length, 4);
});

test("el deposito se da por hecho cuando queda RETENIDO, no cuando se pide", async () => {
  /*
    La trampa que esta funcion esquiva a proposito. El servidor guarda el
    identificador del deposito en la reserva en cuanto CREA el intento, o sea
    antes de que nadie haya puesto una tarjeta. Si la espera mirara ese dato,
    contestaria "confirmado" en la primera vuelta siempre y sin cobro.
  */
  const { dormir } = relojFalso();
  const pedido = {
    paymentStatus: "FULLY_PAID", ...MONTOS,
    depositPaymentIntentId: "pi_123",
    records: [cobro("SENA", "PAID"), cobro("BALANCE", "PAID"), cobro("DEPOSIT_HOLD", "REQUIRES_ACTION")],
  };
  const retenido = { ...pedido, records: [...pedido.records.slice(0, 2), cobro("DEPOSIT_HOLD", "AUTHORIZED")] };
  const r = await esperarElCobro({
    kind: "DEPOSIT_HOLD", pedirEstado: servidor([pedido, retenido]), dormir,
  });
  assert.equal(r.confirmado, true);
  assert.equal(r.vueltas, 2, "se dio por hecho antes de que la plata se retuviera");
});

test("devuelve el ultimo estado leido, para no volver a preguntar", async () => {
  const { dormir } = relojFalso();
  const r = await esperarElCobro({ kind: "SENA", pedirEstado: servidor([IMPAGO, SENA_OK]), dormir });
  assert.equal(r.estado.paymentStatus, "DEPOSIT_PAID");
});

// ── Las dos claves de Stripe, que tienen que ser de la misma cuenta ────────

test("reconoce el rechazo por claves de cuentas distintas", () => {
  /*
    El servidor crea el intento con la clave SECRETA y el navegador lo confirma
    con la PUBLICA. Si son de cuentas distintas, el servidor contesta 201 y un
    segundo despues el navegador va a buscar el intento a otra cuenta, donde no
    existe. Leido sin contexto, "No such payment_intent" manda a revisar la
    tarjeta o el importe, que no tienen nada que ver.
  */
  assert.equal(esClaveDeOtraCuenta("No such payment_intent: 'pi_3UHOet4qdtS1iEzQ0XnbZDny'"), true);
  assert.equal(esClaveDeOtraCuenta("no such payment_intent"), true);
});

test("y no confunde un rechazo normal con eso", () => {
  for (const otro of [
    "Tu tarjeta fue rechazada.",
    "No such customer: 'cus_mock_2784d9c4b388427f'",
    "Your card has insufficient funds.",
    "", null, undefined,
  ]) {
    assert.equal(esClaveDeOtraCuenta(otro), false, `confundio: ${otro}`);
  }
});
