// ============================================================================
//  Pruebas de billetera.js — las tarjetas vinculadas
// ----------------------------------------------------------------------------
//  Corren sin navegador: en vez del localStorage de verdad se le pasa un
//  objeto con los mismos tres metodos. Es la razon por la que el deposito entra
//  por parametro en todas las funciones.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leerTarjetas, agregarTarjeta, borrarTarjeta, elegirTarjeta,
  tarjetaElegida, olvidarBilletera, identificadorDe,
} from "./billetera.js";

/** Un localStorage de mentira, que ademas deja mirar lo que quedo escrito. */
function deposito(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
    removeItem: (k) => { delete datos[k]; },
    _datos: datos,
  };
}

const VISA = { marca: "visa", nombreMarca: "Visa", ultimos: "4242", mes: 4, anio: 2028, nombre: "MARTINA REY" };
const MASTER = { marca: "mastercard", nombreMarca: "Mastercard", ultimos: "4444", mes: 7, anio: 2029, nombre: "MARTINA REY" };

test("sin nada guardado la billetera esta vacia", () => {
  const d = deposito();
  assert.deepEqual(leerTarjetas("u1", d), []);
  assert.equal(tarjetaElegida("u1", d), null);
});

test("una tarjeta vinculada queda, y queda elegida", () => {
  // Vincular una tarjeta es decir "quiero usar esta": pedir que ademas la
  // marquen seria pedir dos veces lo mismo.
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  assert.equal(leerTarjetas("u1", d).length, 1);
  assert.equal(tarjetaElegida("u1", d).ultimos, "4242");
});

test("la ultima vinculada pasa adelante", () => {
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  agregarTarjeta("u1", MASTER, d);
  assert.equal(tarjetaElegida("u1", d).ultimos, "4444");
  assert.equal(leerTarjetas("u1", d).length, 2);
});

test("vincular DOS VECES la misma tarjeta no la repite", () => {
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  agregarTarjeta("u1", { ...VISA, nombre: "MARTINA G REY" }, d);
  const lista = leerTarjetas("u1", d);
  assert.equal(lista.length, 1);
  // Y se queda con lo ultimo que se cargo, no con lo viejo.
  assert.equal(lista[0].nombre, "MARTINA G REY");
});

test("dos tarjetas que terminan igual siguen siendo dos", () => {
  // Pasa de verdad: se renueva la tarjeta y la nueva termina en los mismos
  // cuatro digitos con otro vencimiento. Son dos plasticos distintos.
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  agregarTarjeta("u1", { ...VISA, mes: 4, anio: 2031 }, d);
  assert.equal(leerTarjetas("u1", d).length, 2);
});

test("se puede elegir otra de las guardadas", () => {
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  agregarTarjeta("u1", MASTER, d);
  elegirTarjeta("u1", identificadorDe(VISA), d);
  assert.equal(tarjetaElegida("u1", d).ultimos, "4242");
});

test("elegir una que no existe no rompe ni cambia nada", () => {
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  elegirTarjeta("u1", "no-existe", d);
  assert.equal(tarjetaElegida("u1", d).ultimos, "4242");
});

test("al borrar la elegida queda elegida otra, no ninguna", () => {
  /*
    La lista no puede quedar con tarjetas y sin ninguna elegida: la pantalla de
    pago se quedaria sin con que pagar teniendo tarjetas cargadas.
  */
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  agregarTarjeta("u1", MASTER, d);
  borrarTarjeta("u1", identificadorDe(MASTER), d);
  assert.equal(tarjetaElegida("u1", d).ultimos, "4242");
});

test("CADA CUENTA TIENE SU BILLETERA", () => {
  /*
    Dos cuentas en la misma computadora es lo normal en este proyecto: se
    prueba el alquiler desde las dos puntas. Con una clave sola, la tarjeta de
    una le aparecia a la otra.
  */
  const d = deposito();
  agregarTarjeta("martina", VISA, d);
  agregarTarjeta("emiliano", MASTER, d);
  assert.equal(leerTarjetas("martina", d).length, 1);
  assert.equal(leerTarjetas("martina", d)[0].ultimos, "4242");
  assert.equal(leerTarjetas("emiliano", d)[0].ultimos, "4444");
  olvidarBilletera("martina", d);
  assert.deepEqual(leerTarjetas("martina", d), []);
  assert.equal(leerTarjetas("emiliano", d).length, 1);
});

test("EL NUMERO DE LA TARJETA NO LLEGA AL DEPOSITO", () => {
  /*
    La prueba que cierra el circulo con la de tarjeta.js: aca se mira lo que
    QUEDO ESCRITO, no lo que se paso. Si alguna vez alguien guarda el objeto
    del formulario entero en vez de la ficha, esto se pone en rojo.
  */
  const d = deposito();
  agregarTarjeta("u1", VISA, d);
  const escrito = JSON.stringify(d._datos);
  assert.ok(!/\d{12,}/.test(escrito), "quedo escrito algo con pinta de numero de tarjeta");
  assert.ok(escrito.includes("4242"), "faltan los ultimos cuatro");
});

test("un texto roto de una version anterior no rompe la pantalla", () => {
  // Sin esto, un renglon a medio escribir en el navegador de alguien tira la
  // pantalla de pago entera.
  const d = deposito({ "fw_tarjetas_u1": "{esto no es json" });
  assert.deepEqual(leerTarjetas("u1", d), []);
});

test("una lista con basura adentro se limpia sola", () => {
  const d = deposito({ "fw_tarjetas_u1": JSON.stringify([null, { sinId: true }, { ...VISA, id: "x" }]) });
  assert.equal(leerTarjetas("u1", d).length, 1);
});

test("sin localStorage disponible tampoco rompe", () => {
  // Navegacion privada, permisos apagados, o el servidor dibujando la pagina.
  assert.deepEqual(leerTarjetas("u1", null), []);
  assert.equal(tarjetaElegida("u1", null), null);
  assert.doesNotThrow(() => olvidarBilletera("u1", null));
});

test("un deposito que se niega a escribir no tira la operacion", () => {
  // Pasa con el almacenamiento lleno. La tarjeta sirve igual para este rato:
  // lo unico que se pierde es que siga estando la proxima vez.
  const d = deposito();
  d.setItem = () => { throw new Error("lleno"); };
  const lista = agregarTarjeta("u1", VISA, d);
  assert.equal(lista.length, 1);
});
