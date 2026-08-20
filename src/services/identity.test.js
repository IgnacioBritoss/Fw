// ============================================================================
//  Pruebas de identity.js — las cuentas que deciden si alguien puede verificarse
// ----------------------------------------------------------------------------
//  Estas funciones tienen que dar EXACTAMENTE lo mismo que el backend. Si acá se
//  acepta un CUIL que allá se rechaza, el formulario deja enviar para que el
//  servidor lo rebote con un 400; y si acá se rechaza uno que allá acepta, hay
//  gente que no puede verificarse y no hay ningún error que lo explique. Las dos
//  fallas son silenciosas, así que se prueban.
//
//  Se corren con el runner que ya trae Node, sin agregar dependencias:
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accionSugerida, cuilCoincideConDni, cuilTieneDigitoValido, esCuilDePersona,
  motivoDeRevision, normalizarCuil, normalizarDni, problemaDeIdentidad,
} from "./identity.js";

// ── Normalización ──────────────────────────────────────────────────────────

test("normalizarDni saca los puntos con los que la gente escribe el documento", () => {
  assert.equal(normalizarDni("30.123.456"), "30123456");
  assert.equal(normalizarDni(" 30 123 456 "), "30123456");
  assert.equal(normalizarDni(null), "");
});

test("normalizarCuil acepta con y sin guiones, y solo con 11 dígitos", () => {
  assert.equal(normalizarCuil("20-30123456-3"), "20301234563");
  assert.equal(normalizarCuil("20301234563"), "20301234563");
  assert.equal(normalizarCuil("2030123456"), null);   // 10: falta uno
  assert.equal(normalizarCuil("203012345634"), null); // 12: sobra uno
});

// ── Dígito verificador ─────────────────────────────────────────────────────

test("cuilTieneDigitoValido acepta un CUIL bien formado", () => {
  assert.equal(cuilTieneDigitoValido("20301234563"), true);
});

test("cuilTieneDigitoValido rechaza si cambia el último dígito", () => {
  // Cambiar solo el verificador tiene que romperlo: es todo lo que hace.
  for (const d of "0124567890".split("")) {
    if (d === "3") continue;
    assert.equal(cuilTieneDigitoValido(`2030123456${d}`), false, `dígito ${d}`);
  }
});

test("el DNI embebido en el CUIL es el que se compara, con el 0 de relleno", () => {
  assert.equal(cuilCoincideConDni("30123456", "20301234563"), true);
  assert.equal(cuilCoincideConDni("30123457", "20301234563"), false);
  // Un DNI de 7 dígitos va con un cero adelante dentro del CUIL.
  assert.equal(cuilCoincideConDni("1234567", "20012345675"), true);
});

test("un CUIT de empresa no sirve para verificar una identidad", () => {
  // 30/33/34 son de empresa: no identifican a una persona.
  assert.equal(esCuilDePersona("30-71234567-4"), false);
  assert.equal(esCuilDePersona("20-30123456-3"), true);
});

// ── El formulario completo ─────────────────────────────────────────────────

const VALIDOS = { dni: "30123456", cuil: "20-30123456-3", address: "Av. Siempre Viva 742, Springfield" };

test("problemaDeIdentidad no encuentra nada en unos datos correctos", () => {
  assert.equal(problemaDeIdentidad(VALIDOS), null);
});

test("problemaDeIdentidad señala el primer problema real, campo por campo", () => {
  const casos = [
    [{ ...VALIDOS, dni: "" }, "kyc.errDniRequired"],
    [{ ...VALIDOS, dni: "123456" }, "kyc.errDniFormat"],          // 6 dígitos
    [{ ...VALIDOS, cuil: "123" }, "kyc.errCuilFormat"],
    [{ ...VALIDOS, dni: "71234567", cuil: "30-71234567-4" }, "kyc.errCuilCompany"],
    [{ ...VALIDOS, cuil: "20-30123456-9" }, "kyc.errCuilDigit"],
    [{ ...VALIDOS, address: "" }, "kyc.errAddressRequired"],
    [{ ...VALIDOS, address: "Av." }, "kyc.errAddressShort"],
  ];
  for (const [datos, esperado] of casos) {
    assert.equal(problemaDeIdentidad(datos), esperado, JSON.stringify(datos));
  }
});

test("el CUIL de otro DNI se avisa como tal, y no como un dígito mal", () => {
  // El orden importa: si además tuviera el verificador mal, hay que mandar a
  // mirar el CUIL, no la relación entre los dos campos.
  assert.equal(
    problemaDeIdentidad({ ...VALIDOS, dni: "30123457", cuil: "20-30123456-3" }),
    "kyc.errCuilDni",
  );
});

// ── Motivos de la revisión ─────────────────────────────────────────────────

test("un motivo conocido se traduce y uno nuevo se muestra crudo", () => {
  assert.equal(motivoDeRevision("DOB_MISMATCH").clave, "kyc.rcDob");
  // Un código que el backend agregue sin avisar NO puede romper la pantalla.
  assert.equal(motivoDeRevision("ALGO_QUE_NO_EXISTE").clave, null);
  assert.equal(motivoDeRevision("ALGO_QUE_NO_EXISTE").code, "ALGO_QUE_NO_EXISTE");
});

test("el sufijo _UNREADABLE es 'no se pudo leer', no 'está mal'", () => {
  assert.equal(motivoDeRevision("DNI_EXPIRED_UNREADABLE").clave, "kyc.rcUnreadDniExpiry");
  // Un ilegible sin entrada propia cae en el mensaje genérico de foto ilegible.
  assert.equal(motivoDeRevision("LO_QUE_SEA_UNREADABLE").clave, "kyc.rcUnreadData");
});

test("el QR de la licencia tiene su propio motivo", () => {
  // Faltaba: llegaba como código desconocido y se mostraba en crudo.
  assert.equal(motivoDeRevision("LICENSE_CODE_UNAVAILABLE").clave, "kyc.rcLicenseCode");
});

// ── Qué botón ofrecer ──────────────────────────────────────────────────────

test("lo que no se arregla desde la app manda a soporte, y gana sobre el resto", () => {
  assert.equal(accionSugerida(["DNI_EXPIRED"]), "soporte");
  assert.equal(accionSugerida(["UNDERAGE"]), "soporte");
  assert.equal(accionSugerida(["DNI_ALREADY_VERIFIED"]), "soporte");
  // Aunque venga acompañado de algo que sí se arregla: ofrecer "reintentar" ahí
  // es mandar a la persona a chocar contra la misma pared.
  assert.equal(accionSugerida(["NO_AUTHORITATIVE_SOURCE", "LICENSE_EXPIRED"]), "soporte");
});

test("un dato mal cargado manda a corregir el perfil, no a sacar fotos", () => {
  assert.equal(accionSugerida(["CUIL_DNI_MISMATCH"]), "datos");
  assert.equal(accionSugerida(["DOB_MISMATCH", "NO_AUTHORITATIVE_SOURCE"]), "datos");
});

test("un código ilegible manda a sacar mejor la foto", () => {
  assert.equal(accionSugerida(["NO_AUTHORITATIVE_SOURCE"]), "fotos");
  assert.equal(accionSugerida(["LICENSE_CODE_UNAVAILABLE"]), "fotos");
  // Un dato que no se pudo LEER no se arregla corrigiéndolo en el perfil.
  assert.equal(accionSugerida(["DOB_MISMATCH_UNREADABLE"]), "fotos");
});

test("un fallo pasajero solo pide volver a intentar", () => {
  assert.equal(accionSugerida(["REVIEW_TIMEOUT"]), "reintentar");
  assert.equal(accionSugerida(["AI_UNAVAILABLE"]), "reintentar");
  assert.equal(accionSugerida([]), "reintentar");
});
