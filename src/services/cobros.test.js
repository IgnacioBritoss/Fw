// ============================================================================
//  Pruebas de cobros.js
// ----------------------------------------------------------------------------
//  Las respuestas que se prueban aca son las que devuelve de verdad
//  GET /payments/connect/status, copiadas de payments.service.ts del backend.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoDeCobro, convieneAvisar } from "./cobros.js";

// Tal cual las arma el servidor.
const SIN_CUENTA = { connected: false, status: "NONE", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
const A_MEDIAS = { connected: true, status: "PENDING", accountId: "acct_1", chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
const EN_REVISION = { connected: true, status: "RESTRICTED", accountId: "acct_1", chargesEnabled: true, payoutsEnabled: false, detailsSubmitted: true };
const LISTO = { connected: true, status: "ENABLED", accountId: "acct_1", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };

test("una cuenta habilitada puede cobrar y no molesta a nadie", () => {
  const e = estadoDeCobro(LISTO);
  assert.equal(e.clave, "listo");
  assert.equal(e.puedeCobrar, true);
  assert.equal(e.hayQueAvisar, false);
});

test("sin cuenta hay que avisar: es lo que se puede resolver", () => {
  const e = estadoDeCobro(SIN_CUENTA);
  assert.equal(e.clave, "sinCuenta");
  assert.equal(e.puedeCobrar, false);
  assert.equal(e.hayQueAvisar, true);
});

test("el alta empezada y abandonada es el caso mas comun, y tambien avisa", () => {
  // Se abre el formulario de Stripe, se cierra la pestaña, y la cuenta queda
  // creada pero sin datos. Desde afuera se ve igual que no haber empezado.
  const e = estadoDeCobro(A_MEDIAS);
  assert.equal(e.clave, "aMedias");
  assert.equal(e.hayQueAvisar, true);
});

test("esperando a Stripe NO se pinta como un problema del dueño", () => {
  /*
    RESTRICTED es "mando todo y Stripe todavia no habilito los pagos". No hay
    nada que pueda hacer, asi que un cartel pidiendole que complete algo que ya
    completo lo manda a dar vueltas por un formulario terminado.
  */
  const e = estadoDeCobro(EN_REVISION);
  assert.equal(e.clave, "enRevision");
  assert.equal(e.puedeCobrar, false);
  assert.equal(e.hayQueAvisar, false);
});

test("si no se pudo preguntar, NO se le dice que no va a cobrar", () => {
  /*
    La consulta puede fallar porque el servidor no tiene configurado el cobro
    con tarjeta, o porque se cayo la red un segundo. Decirle a alguien "no vas
    a poder cobrar" por eso seria mentirle sobre su plata.
  */
  for (const nada of [null, undefined, "", 0, "error"]) {
    const e = estadoDeCobro(nada);
    assert.equal(e.clave, "desconocido");
    assert.equal(e.hayQueAvisar, false, `aviso con ${JSON.stringify(nada)}`);
  }
});

test("payoutsEnabled manda, aunque el estado diga otra cosa", () => {
  // El estado se recalcula del lado del servidor a partir de lo que contesta
  // Stripe; si los dos no coinciden, el que dice si la plata se mueve es el
  // dato de Stripe.
  assert.equal(estadoDeCobro({ connected: true, status: "PENDING", payoutsEnabled: true }).puedeCobrar, true);
});

test("a quien no publico ningun auto no se le avisa nada", () => {
  // No se le pide que arregle como va a cobrar por un auto que no existe.
  assert.equal(convieneAvisar(estadoDeCobro(SIN_CUENTA), 0), false);
  assert.equal(convieneAvisar(estadoDeCobro(SIN_CUENTA), 2), true);
  assert.equal(convieneAvisar(estadoDeCobro(LISTO), 5), false);
  assert.equal(convieneAvisar(estadoDeCobro(null), 5), false);
});

// ── Cobros simulados ─────────────────────────────────────────────────────────
//  Freewheel es un proyecto escolar: el pago con tarjeta va a Stripe en modo de
//  prueba, pero la transferencia AL DUEÑO necesita Stripe Connect, que es un
//  alta de plataforma que este deploy no tiene. Mientras no la tenga, el
//  servidor simula la transferencia y lo avisa con `simulated: true`
//  (ver src/payments/cobros-simulados.ts del backend).
//
//  Antes eso llegaba acá como "sinCuenta" y la pantalla le pedía al dueño que
//  completara un alta: un cartel de plata, sobre plata que no existe, dirigido
//  a la única persona que no podía resolverlo.
const SIMULADO = {
  connected: true, status: "ENABLED", accountId: "acct_sim_abc",
  chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true,
  simulated: true,
};

test("con los cobros simulados no hay nada que completar ni nada que avisar", () => {
  const e = estadoDeCobro(SIMULADO);
  assert.equal(e.clave, "simulado");
  assert.equal(e.puedeCobrar, true);
  assert.equal(e.hayQueAvisar, false);
});

test("Y NO SE AVISA NI CON AUTOS PUBLICADOS", () => {
  // Es el cartel amarillo del panel. Con los cobros simulados no tiene nada que
  // ofrecer: no hay alta que hacer.
  assert.equal(convieneAvisar(estadoDeCobro(SIMULADO), 6), false);
});

test("se reconoce por el campo del servidor, no por estar todo en verde", () => {
  /*
    Son dos cosas distintas y confundirlas sería grave en los dos sentidos: una
    cuenta de Stripe de verdad habilitada también tiene todo en verde, y decirle
    "está simulado" a alguien que SÍ va a cobrar es tan malo como lo contrario.
  */
  assert.equal(estadoDeCobro(LISTO).clave, "listo");
  assert.equal(estadoDeCobro({ ...SIMULADO, simulated: false }).clave, "listo");
  assert.equal(estadoDeCobro({ ...SIMULADO, simulated: "si" }).clave, "listo");
});

test("y un backend viejo, que no manda el campo, se comporta como antes", () => {
  const { simulated: _sinElCampo, ...viejo } = SIMULADO;
  void _sinElCampo;
  assert.equal(estadoDeCobro(viejo).clave, "listo");
});
