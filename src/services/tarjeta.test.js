// ============================================================================
//  Pruebas de tarjeta.js
// ----------------------------------------------------------------------------
//  Los numeros que aparecen aca son las tarjetas de PRUEBA de Stripe, las que
//  estan publicadas en stripe.com/docs/testing. No son de nadie: existen para
//  que cualquiera pueda probar un cobro sin plata real. La 4242 4242 4242 4242
//  es la canonica de "el pago sale bien".
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  marcaDeLaTarjeta, pasaLuhn, numeroConEspacios, revisarNumero,
  revisarVencimiento, revisarCodigo, coincideElNombre, normalizarNombre,
  revisarTarjeta, comoSeLee, vencimientoComoSeLee, estaVencida,
} from "./tarjeta.js";

const VISA = "4242424242424242";
const MASTER = "5555555555554444";
const MASTER_NUEVA = "2223003122003222";   // el rango 2221-2720, abierto en 2017
const AMEX = "378282246310005";
const HOY = new Date(2026, 8, 18);          // 18 de septiembre de 2026

// ── La marca ───────────────────────────────────────────────────────────────

test("reconoce Visa, Mastercard y Amex", () => {
  assert.equal(marcaDeLaTarjeta(VISA).id, "visa");
  assert.equal(marcaDeLaTarjeta(MASTER).id, "mastercard");
  assert.equal(marcaDeLaTarjeta(MASTER_NUEVA).id, "mastercard");
  assert.equal(marcaDeLaTarjeta(AMEX).id, "amex");
});

test("la marca aparece con el PRIMER digito, no al final", () => {
  // Es lo que hace que el logo salga mientras se escribe. Si hiciera falta el
  // numero entero, el logo apareceria cuando ya no sirve para nada.
  assert.equal(marcaDeLaTarjeta("4").id, "visa");
  assert.equal(marcaDeLaTarjeta("53").id, "mastercard");
  assert.equal(marcaDeLaTarjeta("37").id, "amex");
});

test("no adivina una marca que todavia no se puede saber", () => {
  // Un "2" solo puede terminar en Mastercard (2223) o en cualquier otra cosa
  // (2999). Anunciar Mastercard ahi y borrarlo dos teclas despues es peor que
  // no decir nada.
  assert.equal(marcaDeLaTarjeta("2").id, "otra");
  assert.equal(marcaDeLaTarjeta("22").id, "otra");
  assert.equal(marcaDeLaTarjeta("2999").id, "otra");
  assert.equal(marcaDeLaTarjeta("").id, "otra");
});

test("Amex no tiene 16 digitos ni codigo de 3", () => {
  const amex = marcaDeLaTarjeta(AMEX);
  assert.deepEqual(amex.largos, [15]);
  assert.equal(amex.codigo, 4);
});

// ── El numero ──────────────────────────────────────────────────────────────

test("el control de Luhn acepta las tarjetas de prueba", () => {
  for (const n of [VISA, MASTER, MASTER_NUEVA, AMEX, "4000000000000002"]) {
    assert.ok(pasaLuhn(n), `Luhn rechazo ${n}`);
  }
});

test("un digito mal tecleado no pasa", () => {
  // Es justamente el error que comete una persona escribiendo dieciseis
  // numeros, y es el que esta cuenta existe para atajar.
  assert.ok(!pasaLuhn("4242424242424243"));
  assert.ok(!pasaLuhn("4242424242424252"));
});

test("dos digitos cambiados de lugar tampoco", () => {
  // El otro error tipico: cambiar dos numeros de orden. Se prueban TODOS los
  // pares vecinos de la 4242, no uno elegido a dedo, que es lo unico que
  // demuestra que la cuenta los agarra a todos y no al que se me ocurrio.
  for (let i = 0; i < VISA.length - 1; i++) {
    const digitos = VISA.split("");
    [digitos[i], digitos[i + 1]] = [digitos[i + 1], digitos[i]];
    const cambiado = digitos.join("");
    if (cambiado === VISA) continue;
    assert.ok(!pasaLuhn(cambiado), `paso ${cambiado}`);
  }
});

test("distingue 'faltan numeros' de 'el numero no existe'", () => {
  // Quien esta escribiendo necesita saber cual de las dos cosas le pasa: con un
  // solo mensaje para todo hay que adivinar.
  assert.equal(revisarNumero("4242 4242 4242").motivo, "largo");
  assert.equal(revisarNumero("4242424242424243").motivo, "invalido");
  assert.equal(revisarNumero("").motivo, "vacio");
  assert.equal(revisarNumero(VISA).ok, true);
});

test("el numero se escribe agrupado, y Amex con SUS grupos", () => {
  assert.equal(numeroConEspacios(VISA), "4242 4242 4242 4242");
  assert.equal(numeroConEspacios(AMEX), "3782 822463 10005");
  assert.equal(numeroConEspacios("42424"), "4242 4");
});

test("no deja escribir mas digitos de los que entran", () => {
  // El tope es el de la MARCA, no uno solo para todas: Visa admite hasta 19
  // digitos y Amex tiene exactamente 15. Con un tope unico de 16, una Visa
  // larga quedaba cortada y sin poder cargarse.
  assert.equal(numeroConEspacios(VISA + "9999999"), "4242 4242 4242 4242 999");
  assert.equal(numeroConEspacios(AMEX + "99"), "3782 822463 10005");
});

test("acepta el numero escrito con espacios o guiones", () => {
  assert.equal(revisarNumero("4242-4242 4242 4242").ok, true);
});

// ── El vencimiento ─────────────────────────────────────────────────────────

test("una tarjeta que vence ESTE mes todavia sirve", () => {
  // Vence el ultimo dia del mes: rechazarla hoy seria rechazar una tarjeta que
  // anda.
  assert.equal(revisarVencimiento(9, 2026, HOY).ok, true);
});

test("el mes pasado no", () => {
  assert.equal(revisarVencimiento(8, 2026, HOY).motivo, "vencida");
  assert.equal(revisarVencimiento(12, 2025, HOY).motivo, "vencida");
});

test("'28' y '2028' son la misma fecha", () => {
  // El plastico dice 28 y el teclado numerico invita a escribir 2028.
  assert.deepEqual(
    revisarVencimiento("04", "28", HOY),
    revisarVencimiento("4", "2028", HOY),
  );
});

test("un mes que no existe se marca aparte", () => {
  assert.equal(revisarVencimiento(13, 2028, HOY).motivo, "mes");
  assert.equal(revisarVencimiento(0, 2028, HOY).motivo, "mes");
});

test("un ano absurdo es un error de tecleo, no una tarjeta", () => {
  assert.equal(revisarVencimiento(4, 2099, HOY).motivo, "lejos");
});

// ── El codigo de atras ─────────────────────────────────────────────────────

test("el codigo son 3 digitos, y 4 en Amex", () => {
  assert.equal(revisarCodigo("123", marcaDeLaTarjeta(VISA)).ok, true);
  assert.equal(revisarCodigo("123", marcaDeLaTarjeta(AMEX)).motivo, "largo");
  assert.equal(revisarCodigo("1234", marcaDeLaTarjeta(AMEX)).ok, true);
  assert.equal(revisarCodigo("12", marcaDeLaTarjeta(VISA)).motivo, "largo");
});

// ── El nombre contra el de la cuenta ───────────────────────────────────────

test("el plastico en mayusculas es el mismo nombre que la cuenta", () => {
  assert.equal(coincideElNombre("MARTINA REY", "Martina Rey"), "igual");
  assert.equal(normalizarNombre("José Peña"), "JOSE PENA");
  assert.equal(coincideElNombre("JOSE PENA", "José Peña"), "igual");
});

test("un nombre RECORTADO sigue siendo la misma persona", () => {
  /*
    En el plastico entran unos veinte caracteres, asi que el banco recorta. Si
    se exigiera el texto exacto, la tarjeta de quien la tiene en la mano
    quedaria rechazada, que es el peor error posible en esta pantalla.
  */
  assert.equal(coincideElNombre("MARIA GONZALEZ", "Maria Fernanda Gonzalez Perez"), "parecido");
  assert.equal(coincideElNombre("M F GONZALEZ", "Maria Fernanda Gonzalez"), "parecido");
  assert.equal(coincideElNombre("MARTINA REY", "Martina Gabriela Rey"), "parecido");
});

test("otro apellido no se explica con ningun recorte", () => {
  assert.equal(coincideElNombre("JUAN PEREZ", "Martina Rey"), "distinto");
  assert.equal(coincideElNombre("MARTINA LOPEZ", "Martina Rey"), "distinto");
});

test("sin nombre de cuenta no se bloquea a nadie", () => {
  // Misma regla que en toda la app: sin dato es "no se", no "esta mal".
  assert.equal(coincideElNombre("MARTINA REY", ""), "sindato");
  assert.equal(coincideElNombre("", "Martina Rey"), "sindato");
  assert.equal(coincideElNombre("M", "Martina Rey"), "sindato");
});

// ── El formulario entero ───────────────────────────────────────────────────

const BIEN = { numero: VISA, mes: "04", anio: "28", codigo: "123", nombre: "Martina Rey" };

test("una tarjeta bien cargada pasa y deja lo que se guarda", () => {
  const r = revisarTarjeta(BIEN, { nombreCuenta: "Martina Rey", hoy: HOY });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errores, {});
  assert.deepEqual(r.tarjeta, {
    marca: "visa", nombreMarca: "Visa", ultimos: "4242",
    mes: 4, anio: 2028, nombre: "MARTINA REY",
  });
});

test("LO QUE SE GUARDA NO TIENE EL NUMERO", () => {
  /*
    La prueba mas importante de este archivo. Lo unico que sobrevive a la
    pantalla son la marca y los cuatro ultimos: si alguna vez alguien agrega el
    numero entero al objeto que se guarda, esto se pone en rojo.
  */
  const { tarjeta } = revisarTarjeta(BIEN, { nombreCuenta: "Martina Rey", hoy: HOY });
  const guardado = JSON.stringify(tarjeta);
  assert.ok(!guardado.includes(VISA), "el numero entero quedo guardado");
  assert.ok(!guardado.includes("123"), "el codigo de atras quedo guardado");
  assert.ok(guardado.includes("4242"), "faltan los ultimos cuatro");
});

test("cada campo mal avisa por SU campo", () => {
  const r = revisarTarjeta(
    { numero: "4242", mes: "13", anio: "28", codigo: "1", nombre: "" },
    { nombreCuenta: "Martina Rey", hoy: HOY },
  );
  assert.equal(r.ok, false);
  assert.equal(r.errores.numero, "tarjeta.error.numero.largo");
  assert.equal(r.errores.vencimiento, "tarjeta.error.vencimiento.mes");
  assert.equal(r.errores.codigo, "tarjeta.error.codigo.largo");
  assert.equal(r.errores.nombre, "tarjeta.error.nombre.vacio");
});

test("el nombre de otra persona frena la tarjeta", () => {
  const r = revisarTarjeta({ ...BIEN, nombre: "Juan Perez" }, { nombreCuenta: "Martina Rey", hoy: HOY });
  assert.equal(r.ok, false);
  assert.equal(r.errores.nombre, "tarjeta.error.nombre.distinto");
});

test("un nombre recortado NO frena la tarjeta", () => {
  const r = revisarTarjeta({ ...BIEN, nombre: "M REY" }, { nombreCuenta: "Martina Gabriela Rey", hoy: HOY });
  assert.equal(r.ok, true);
  assert.equal(r.coincidencia, "parecido");
});

test("sin nombre de cuenta la tarjeta pasa igual", () => {
  const r = revisarTarjeta(BIEN, { nombreCuenta: "", hoy: HOY });
  assert.equal(r.ok, true);
  assert.equal(r.coincidencia, "sindato");
});

// ── Como se muestra despues ────────────────────────────────────────────────

test("se lee como en cualquier aplicacion", () => {
  const { tarjeta } = revisarTarjeta(BIEN, { nombreCuenta: "Martina Rey", hoy: HOY });
  assert.equal(comoSeLee(tarjeta), "Visa ···· 4242");
  assert.equal(vencimientoComoSeLee(tarjeta), "04/28");
  assert.equal(comoSeLee(null), "");
});

test("una tarjeta guardada que ya vencio se detecta", () => {
  // El vencimiento pasa solo: la tarjeta se cargo cuando servia.
  assert.equal(estaVencida({ mes: 4, anio: 2028 }, HOY), false);
  assert.equal(estaVencida({ mes: 4, anio: 2026 }, HOY), true);
  assert.equal(estaVencida({}, HOY), false);
});
