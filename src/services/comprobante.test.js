// ============================================================================
//  Pruebas de comprobante.js
// ----------------------------------------------------------------------------
//  Un comprobante es una cuenta: o cierra o no cierra. Lo que se prueba aca es
//  que cierre, y sobre todo que el DEPOSITO no se sume al total, que es el
//  error que nadie mira dos veces porque el numero parece bien.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lineasDelComprobante, numeroDeComprobante, vehiculoComoSeLee,
} from "./comprobante.js";

const RESERVA = {
  id: "d33cdb36-9f21-4a7e-8b10-5c2a19b7e4d3",
  startDate: "2026-10-02T12:00:00Z",
  endDate: "2026-10-09T12:00:00Z",
  listing: { vehicle: { brand: "Toyota", model: "Corolla", year: 2022 } },
};
const PAGO = {
  total: 292600, sena: 87780, balance: 204820, deposit: 200,
  commission: 0, insurance: 0, currency: "USD",
};

const claves = (lineas) => lineas.filter(l => l.clave).map(l => l.clave);
const buscar = (lineas, clave) => lineas.find(l => l.clave === clave);

// ── El numero ──────────────────────────────────────────────────────────────

test("el numero se puede dictar por telefono", () => {
  // Treinta y seis caracteres no los lee nadie; ocho alcanzan para encontrar
  // una reserva entre las de una persona, que es para lo unico que sirve.
  assert.equal(numeroDeComprobante(RESERVA.id), "FW-D33CDB36");
  assert.equal(numeroDeComprobante(""), "");
  assert.equal(numeroDeComprobante(null), "");
});

// ── Los renglones ──────────────────────────────────────────────────────────

test("el deposito NO suma al total y va despues", () => {
  /*
    El error que este archivo existe para que no pase. El deposito es una
    retencion: se bloquea en la tarjeta y vuelve. Sumado, el comprobante diria
    que se cobraron 292.800 cuando se cobraron 292.600.
  */
  const lineas = lineasDelComprobante({ booking: RESERVA, payment: PAGO, dias: 7 });
  const total = buscar(lineas, "payment.totalPaid");
  const deposito = buscar(lineas, "payment.guarantee");
  assert.equal(total.monto, 292600);
  assert.equal(deposito.tipo, "retenido");
  assert.ok(lineas.indexOf(total) < lineas.indexOf(deposito), "el deposito quedo arriba del total");
});

test("la seña y el saldo suman exactamente el total", () => {
  const lineas = lineasDelComprobante({ booking: RESERVA, payment: PAGO, dias: 7 });
  const sena = buscar(lineas, "payment.sena").monto;
  const saldo = buscar(lineas, "payment.balance").monto;
  assert.equal(sena + saldo, buscar(lineas, "payment.totalPaid").monto);
});

test("un cargo en cero no se escribe", () => {
  // Un ticket enumera lo que se cobro. "Seguro $0" no es informacion: es ruido
  // en el unico lugar donde cada renglon tendria que significar algo.
  const lineas = lineasDelComprobante({ booking: RESERVA, payment: PAGO, dias: 7 });
  assert.ok(!claves(lineas).includes("payment.insurance"));
  assert.ok(!claves(lineas).includes("car.fee"));
});

test("y uno que existe si", () => {
  const conCargos = { ...PAGO, commission: 14630, insurance: 8000 };
  const lineas = lineasDelComprobante({ booking: RESERVA, payment: PAGO && conCargos, dias: 7 });
  assert.equal(buscar(lineas, "car.fee").monto, 14630);
  assert.equal(buscar(lineas, "payment.insurance").monto, 8000);
});

test("una reserva sin deposito no lleva un renglon de deposito", () => {
  const lineas = lineasDelComprobante({
    booking: RESERVA, payment: { ...PAGO, deposit: null }, dias: 7,
  });
  assert.ok(!claves(lineas).includes("payment.guarantee"));
});

test("manda el servidor, no las instantaneas de la reserva", () => {
  /*
    Las dos fuentes existen porque no siempre estan las dos, pero cuando estan
    gana el servidor: los montos los calcula el. Al reves, un comprobante podria
    decir un precio viejo guardado en la reserva.
  */
  const conViejo = { ...RESERVA, totalPriceSnapshot: 111111 };
  const lineas = lineasDelComprobante({ booking: conViejo, payment: PAGO, dias: 7 });
  assert.equal(buscar(lineas, "payment.totalPaid").monto, 292600);

  // Y sin el servidor, se usa lo que quedo guardado en la reserva.
  const sinServidor = lineasDelComprobante({ booking: conViejo, payment: null, dias: 7 });
  assert.equal(buscar(sinServidor, "payment.totalPaid").monto, 111111);
});

test("el alquiler lleva lo que SUMA, no el precio de un dia", () => {
  /*
    El renglon dice "Alquiler x 7" y al lado va el subtotal. Con el precio por
    dia ahi, el renglon se lee como una cuenta que no cierra: "x 7" al lado de
    40.000 dice que el resultado es 40.000.
  */
  const lineas = lineasDelComprobante({
    booking: { ...RESERVA, pricePerDaySnapshot: 40000, rentalSubtotalSnapshot: 280000 },
    payment: PAGO, dias: 7,
  });
  const alquiler = buscar(lineas, "comprobante.alquiler");
  assert.equal(alquiler.monto, 280000);
  assert.equal(alquiler.multiplicador, 7);
});

test("y si la reserva no lo trae guardado, se multiplica", () => {
  // Las reservas viejas no tienen el subtotal. Multiplicar es el ultimo
  // recurso, no el camino normal: el que manda es el numero del servidor.
  const lineas = lineasDelComprobante({
    booking: { ...RESERVA, pricePerDaySnapshot: 40000 }, payment: PAGO, dias: 7,
  });
  assert.equal(buscar(lineas, "comprobante.alquiler").monto, 280000);

  // Sin precio por dia tampoco hay renglon: no se inventa una cuenta.
  const pelada = lineasDelComprobante({ booking: RESERVA, payment: PAGO, dias: 7 });
  assert.ok(!claves(pelada).includes("comprobante.alquiler"));
});

test("sin datos no rompe: devuelve lo poco que pueda", () => {
  // La pantalla de pago llega a dibujarse antes de que responda el servidor.
  const lineas = lineasDelComprobante();
  assert.ok(Array.isArray(lineas));
  assert.equal(buscar(lineas, "payment.totalPaid").monto, 0);
  assert.deepEqual(lineasDelComprobante({}), lineas);
});

test("el auto se lee con lo que haya", () => {
  assert.equal(vehiculoComoSeLee(RESERVA), "Toyota Corolla 2022");
  assert.equal(vehiculoComoSeLee({ vehicle: { brand: "Fiat", model: "Cronos" } }), "Fiat Cronos");
  assert.equal(vehiculoComoSeLee({}), "");
  assert.equal(vehiculoComoSeLee(null), "");
});
