// ============================================================================
//  Pruebas de escaner.js
// ----------------------------------------------------------------------------
//  El codigo de entrega que usa el servidor son 24 bytes al azar en
//  hexadecimal: 48 caracteres. El de aca abajo tiene ese largo exacto, para que
//  las pruebas corran contra lo que la app recibe de verdad.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pareceToken, normalizarCodigoEscrito, tokenDelCodigo,
  motorDeLectura, restriccionesDeCamara, motivoDelFallo, esCodigoNuevo,
} from "./escaner.js";

const TOKEN = "9f3c7a12bd48e05f6c2a19b7e4d30f8a5c61be27d94af083";   // 48 hex

test("el codigo de entrega son 48 caracteres hexadecimales", () => {
  assert.equal(TOKEN.length, 48);
  assert.ok(pareceToken(TOKEN));
});

test("cualquier otro QR del mundo NO es un codigo de entrega", () => {
  // La camara ve lo que se le ponga adelante. Un QR de un producto, de una
  // wifi o de un pago no tiene que salir hacia el servidor.
  for (const basura of ["", "hola", "https://freewheel.app", "12345", "WIFI:S:casa;T:WPA;P:1234;;", "zzzz"]) {
    assert.ok(!pareceToken(basura), `dejo pasar ${basura}`);
  }
});

test("un codigo pegado del chat entra igual", () => {
  // Copiar y pegar se lleva espacios, saltos de linea y mayusculas. Nada de
  // eso hace que el codigo sea otro.
  assert.equal(normalizarCodigoEscrito(` ${TOKEN.toUpperCase()} \n`), TOKEN);
  assert.equal(tokenDelCodigo(`  ${TOKEN.toUpperCase()}  `), TOKEN);
});

test("lee el codigo pelado, que es lo que trae el QR de la app", () => {
  assert.equal(tokenDelCodigo(TOKEN), TOKEN);
});

test("tambien lo lee adentro de un enlace", () => {
  /*
    El QR de hoy lleva el codigo solo, pero conviene que esto ande: un QR con
    un enlace se puede escanear con la camara del telefono SIN abrir la app, y
    el dia que se cambie, el escaner no tiene que cambiar.
  */
  assert.equal(tokenDelCodigo(`https://freewheel.app/qr/b1?token=${TOKEN}`), TOKEN);
  assert.equal(tokenDelCodigo(`https://freewheel.app/entrega?code=${TOKEN}`), TOKEN);
  assert.equal(tokenDelCodigo(`https://freewheel.app/entrega/${TOKEN}`), TOKEN);
});

test("un enlace SIN codigo adentro no devuelve nada", () => {
  // Nada, y no una excepcion: apuntar la camara a un QR cualquiera es normal,
  // y lo que corresponde es seguir buscando, no romper la pantalla.
  assert.equal(tokenDelCodigo("https://freewheel.app/qr/b1"), null);
  assert.equal(tokenDelCodigo("https://freewheel.app/qr/b1?token=hola"), null);
  assert.equal(tokenDelCodigo("no es una direccion"), null);
  assert.equal(tokenDelCodigo(null), null);
});

test("un enlace roto no rompe el escaner", () => {
  assert.equal(tokenDelCodigo("http://[esto no es una url"), null);
});

// ── Con que se lee ─────────────────────────────────────────────────────────

test("usa el lector del navegador cuando lo hay", () => {
  assert.equal(motorDeLectura({ BarcodeDetector: function () {} }), "nativo");
});

test("y uno propio cuando no, que es el caso del iPhone", () => {
  // En iPhone todos los navegadores son Safari por dentro, y Safari no trae
  // lector. Sin el de repuesto, la camara se abriria y no leeria nunca.
  assert.equal(motorDeLectura({}), "libreria");
  assert.equal(motorDeLectura({ BarcodeDetector: undefined }), "libreria");
});

test("pide la camara de atras como PREFERENCIA, no como exigencia", () => {
  /*
    Con `exact`, una notebook —que tiene una sola camara, la de la pantalla— no
    abriria ninguna, cuando esa camara anda perfecto para escanear un telefono
    que te muestran.
  */
  const r = restriccionesDeCamara();
  assert.equal(r.video.facingMode.ideal, "environment");
  assert.equal(r.video.facingMode.exact, undefined);
  assert.equal(r.audio, false);
  // Y pide resolucion: un QR en un cuadro chico es un cuadrado borroso.
  assert.ok(r.video.width.ideal >= 1280);
});

// ── Cuando la camara no abre ───────────────────────────────────────────────

const ventanaSana = { isSecureContext: true, navigator: { mediaDevices: { getUserMedia() {} } } };

test("cada motivo tiene su propia respuesta", () => {
  // Cuatro motivos distintos necesitan cuatro respuestas distintas: uno se
  // arregla en la barra del navegador, otro cerrando otro programa, otro no se
  // arregla. Un unico "no se pudo abrir la camara" deja sin saber que hacer.
  const caso = (name) => motivoDelFallo({ name }, ventanaSana);
  assert.equal(caso("NotAllowedError"), "qr.errPermiso");
  assert.equal(caso("NotFoundError"), "qr.errSinCamara");
  assert.equal(caso("NotReadableError"), "qr.errOcupada");
  assert.equal(caso("OverconstrainedError"), "qr.errSinCamara");
  assert.equal(caso("CualquierOtroError"), "qr.errCamara");
});

test("SIN HTTPS no es un problema de permisos, y se dice aparte", () => {
  /*
    El caso que mas confunde. Sin HTTPS el navegador ni siquiera pregunta por
    la camara: no existe `navigator.mediaDevices`, y el intento falla con un
    TypeError que no se parece en nada a un permiso denegado. Explicado como
    "permiso denegado", alguien se pasa media hora buscando un permiso que
    nunca le pidieron.
  */
  const inseguro = { isSecureContext: false, navigator: {} };
  assert.equal(motivoDelFallo(new TypeError("undefined is not an object"), inseguro), "qr.errInseguro");
});

test("un navegador sin camara se distingue de uno que la nego", () => {
  const viejo = { isSecureContext: true, navigator: {} };
  assert.equal(motivoDelFallo({ name: "NotAllowedError" }, viejo), "qr.errSinSoporte");
});

// ── No mandar veinte veces el mismo codigo ─────────────────────────────────

test("el mismo codigo leido de nuevo no se vuelve a mandar", () => {
  /*
    La camara lee el mismo QR muchas veces por segundo mientras sigue
    apuntando. Sin esto, un escaneo eran veinte pedidos: el primero confirmaba
    la entrega y los diecinueve siguientes recibian "esta reserva ya fue
    confirmada", asi que la pantalla mostraba un error JUSTO DESPUES de haber
    funcionado.
  */
  assert.equal(esCodigoNuevo(TOKEN, null), true);
  assert.equal(esCodigoNuevo(TOKEN, TOKEN), false);
  assert.equal(esCodigoNuevo(TOKEN, "otro"), true);
  assert.equal(esCodigoNuevo(null, null), false);
});
