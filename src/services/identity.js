// ============================================================================
//  identity.js — DNI y CUIL: validarlos ANTES de mandarlos
// ----------------------------------------------------------------------------
//  La verificación documental compara el DNI, el CUIL y el domicilio que la
//  persona escribe contra lo que el backend lee del DNI y de la licencia. Si esos
//  datos están mal cargados, la verificación no puede aprobar nunca.
//
//  POR QUÉ SE VALIDA ACÁ TAMBIÉN: el backend ya valida, pero contesta con un
//  código (CUIL_DNI_MISMATCH, 400) recién después de mandar el formulario. Un
//  dígito mal tipeado tiene que avisarse en el momento y explicando qué está mal,
//  no como un error del servidor al final del trámite.
//
//  Las cuentas son las MISMAS que las del backend (src/common/utils/cuil.util.ts).
//  Tienen que coincidir: si acá se aceptara algo que allá se rechaza, el
//  formulario dejaría enviar para que el servidor lo rebote, que es exactamente
//  lo que se quiere evitar.
// ============================================================================

// Pesos del dígito verificador del CUIL, en orden.
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Prefijos de PERSONA. 30, 33 y 34 son de empresas: un CUIT de empresa no
 * identifica a nadie, así que no sirve para verificar una identidad.
 */
const PREFIJOS_PERSONA = ["20", "23", "24", "25", "26", "27"];

/** Deja solo los 11 dígitos del CUIL, o null si no son 11. */
export function normalizarCuil(valor) {
  const digitos = String(valor ?? "").replace(/[-\s.]/g, "");
  return /^\d{11}$/.test(digitos) ? digitos : null;
}

/** Solo los dígitos, para el DNI (la gente lo escribe con puntos). */
export function normalizarDni(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

/**
 * El dígito verificador (módulo 11) sobre los primeros diez dígitos.
 * Un resto que exigiría el dígito 10 no existe como CUIL real —en esos casos se
 * cambia el prefijo— así que se rechaza.
 */
export function cuilTieneDigitoValido(cuil) {
  if (!/^\d{11}$/.test(cuil)) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(cuil[i]), 0);
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? 0 : resto;
  return esperado !== 10 && Number(cuil[10]) === esperado;
}

/** El DNI que va embebido en el CUIL, siempre con 8 dígitos. */
export const dniDelCuil = (cuil) => cuil.slice(2, 10);

/** ¿El CUIL corresponde a ese DNI? Un DNI de 7 dígitos va con un 0 adelante. */
export function cuilCoincideConDni(dni, cuil) {
  return dniDelCuil(cuil) === normalizarDni(dni).padStart(8, "0");
}

/** CUIL de persona completo: 11 dígitos, prefijo de persona y dígito correcto. */
export function esCuilDePersona(valor) {
  const cuil = normalizarCuil(valor);
  return (
    cuil !== null &&
    PREFIJOS_PERSONA.includes(cuil.slice(0, 2)) &&
    cuilTieneDigitoValido(cuil)
  );
}

/**
 * Revisa los tres datos juntos y devuelve la CLAVE del primer problema, o null si
 * están bien. Devuelve una clave y no un texto porque el mensaje se traduce en el
 * componente, que es el que tiene el idioma.
 *
 * El orden es a propósito: primero cada dato por separado y al final la relación
 * entre los dos. Decir "el CUIL no corresponde al DNI" cuando el CUIL además
 * tiene un dígito mal manda a mirar el campo equivocado.
 */
export function problemaDeIdentidad({ dni, cuil, address }) {
  const soloDni = normalizarDni(dni);
  if (!soloDni) return "kyc.errDniRequired";
  if (!/^\d{7,8}$/.test(soloDni)) return "kyc.errDniFormat";

  const soloCuil = normalizarCuil(cuil);
  if (!soloCuil) return "kyc.errCuilFormat";
  if (!PREFIJOS_PERSONA.includes(soloCuil.slice(0, 2))) return "kyc.errCuilCompany";
  if (!cuilTieneDigitoValido(soloCuil)) return "kyc.errCuilDigit";

  if (!String(address ?? "").trim()) return "kyc.errAddressRequired";
  if (String(address).trim().length < 5) return "kyc.errAddressShort";

  if (!cuilCoincideConDni(soloDni, soloCuil)) return "kyc.errCuilDni";

  return null;
}

/**
 * Los códigos con los que el backend rechaza estos datos, y su mensaje.
 * Sin esta tabla la persona ve el texto crudo de la API o un "algo salió mal".
 */
const CODIGOS = {
  CUIL_DNI_MISMATCH: "kyc.errCuilDni",
  DNI_ALREADY_REGISTERED: "kyc.errDniTaken",
  CUIL_ALREADY_REGISTERED: "kyc.errCuilTaken",
  IDENTITY_FIELDS_LOCKED: "kyc.errIdentityLocked",
  DOCUMENT_SLOT_MISMATCH: "kyc.errSlotMismatch",
  INVALID_DOCUMENT_URL: "kyc.errSlotMismatch",
  REVIEW_NOT_PENDING: "kyc.errRetryNotPending",
};

/** La clave del mensaje para un error del backend, o null si no lo conocemos. */
export const claveDelError = (err) => CODIGOS[err?.code] ?? null;

// ============================================================================
//  Motivos de la revisión
// ----------------------------------------------------------------------------
//  El backend no cuenta qué leyó de los documentos —es un dato personal y solo lo
//  ve un administrador—, pero sí devuelve CÓDIGOS estables de por qué una
//  solicitud no se aprobó sola. Acá se traducen a algo que diga qué corregir.
//
//  Sin esta tabla la pantalla dice "en revisión" y no hay manera de saber si hay
//  que arreglar un dato, sacar de nuevo una foto o solo esperar.
// ============================================================================
const MOTIVOS = {
  // No coincide algo que sí se pudo leer.
  SLOT_CONTENT_MISMATCH: "kyc.rcSlot",
  AI_DOCUMENT_MISMATCH: "kyc.rcSlot",
  SOURCE_CONFLICT: "kyc.rcSourceConflict",
  DNI_NUMBER_MISMATCH: "kyc.rcDniNumber",
  LICENSE_DNI_MISMATCH: "kyc.rcLicenseDni",
  SURNAME_MISMATCH: "kyc.rcSurname",
  GIVEN_NAMES_MISMATCH: "kyc.rcGivenNames",
  LICENSE_NAME_MISMATCH: "kyc.rcLicenseName",
  DOB_MISMATCH: "kyc.rcDob",
  SEX_MISMATCH: "kyc.rcSex",
  ADDRESS_MISMATCH: "kyc.rcAddress",
  CUIL_INVALID: "kyc.rcCuilInvalid",
  CUIL_DNI_MISMATCH: "kyc.rcCuilDni",
  CUIL_SEX_MISMATCH: "kyc.rcCuilSex",
  CUIL_OCR_MISMATCH: "kyc.rcCuilPrinted",
  // El documento no habilita.
  UNDERAGE: "kyc.rcUnderage",
  DNI_EXPIRED: "kyc.rcDniExpired",
  LICENSE_EXPIRED: "kyc.rcLicenseExpired",
  DNI_ALREADY_VERIFIED: "kyc.rcDniTaken",
  // No se pudo decidir.
  NO_AUTHORITATIVE_SOURCE: "kyc.rcNoSource",
  LICENSE_CODE_UNAVAILABLE: "kyc.rcLicenseCode",
  MANUAL_REVIEW_REQUIRED: "kyc.rcManual",
  REVIEW_TIMEOUT: "kyc.rcTimeout",
  REVIEW_ERROR: "kyc.rcError",
  AI_UNAVAILABLE: "kyc.rcAiDown",
  AI_PARTIALLY_UNAVAILABLE: "kyc.rcAiDown",
};

/**
 * Un dato que hacía falta y no se pudo leer llega como el código del control con
 * el sufijo `_UNREADABLE`. No es lo mismo que "no coincide": ahí hay que sacar
 * mejor la foto, no corregir el dato. Varios controles comparten mensaje porque
 * lo que la persona tiene que hacer es el mismo.
 */
const ILEGIBLES = {
  SLOT_CONTENT_MISMATCH: "kyc.rcUnreadSlot",
  DNI_NUMBER_MISMATCH: "kyc.rcUnreadData",
  SURNAME_MISMATCH: "kyc.rcUnreadData",
  GIVEN_NAMES_MISMATCH: "kyc.rcUnreadData",
  DOB_MISMATCH: "kyc.rcUnreadData",
  UNDERAGE: "kyc.rcUnreadData",
  DNI_EXPIRED: "kyc.rcUnreadDniExpiry",
  LICENSE_EXPIRED: "kyc.rcUnreadLicense",
  LICENSE_DNI_MISMATCH: "kyc.rcUnreadLicense",
  CUIL_INVALID: "kyc.rcUnreadCuil",
  CUIL_DNI_MISMATCH: "kyc.rcUnreadCuil",
};

const SUFIJO_ILEGIBLE = "_UNREADABLE";

/**
 * Traduce un código de motivo. Devuelve `{ code, clave }`: la clave es null si el
 * código es nuevo y este front todavía no lo conoce, y en ese caso la pantalla
 * muestra el código crudo. Es feo, pero es información: esconder el motivo del
 * rechazo deja a la persona sin saber qué hacer.
 */
export function motivoDeRevision(code) {
  if (MOTIVOS[code]) return { code, clave: MOTIVOS[code] };

  if (String(code).endsWith(SUFIJO_ILEGIBLE)) {
    const base = String(code).slice(0, -SUFIJO_ILEGIBLE.length);
    return { code, clave: ILEGIBLES[base] ?? "kyc.rcUnreadData" };
  }

  return { code, clave: null };
}

// ============================================================================
//  Qué hacer con el resultado
// ----------------------------------------------------------------------------
//  Un listado de motivos no es una respuesta: la persona que acaba de recibir
//  cuatro códigos necesita saber cuál es el ÚNICO botón que le sirve. Y no es
//  siempre el mismo: "el CUIL no corresponde al DNI" se arregla escribiendo bien
//  un número, y volver a sacar las fotos no lo cambia; "no pudimos leer el código
//  del DNI" se arregla con otra foto, y corregir el perfil no lo cambia.
//
//  Estos tres conjuntos son los del contrato del backend. Van de más urgente a
//  menos: primero lo que NO tiene salida desde la app, después lo que se arregla
//  con datos y por último lo que se arregla con fotos. Cualquier otra cosa
//  (timeout, proveedor caído) es simplemente volver a pedir la revisión.
// ============================================================================

/** No se arreglan desde acá: el documento hay que renovarlo o hablar con soporte. */
const SIN_SALIDA = new Set([
  "UNDERAGE", "DNI_EXPIRED", "LICENSE_EXPIRED", "DNI_ALREADY_VERIFIED",
]);

/** Se arreglan corrigiendo el DNI, el CUIL, el domicilio o el perfil. */
const SE_ARREGLA_CON_DATOS = new Set([
  "DNI_NUMBER_MISMATCH", "SURNAME_MISMATCH", "GIVEN_NAMES_MISMATCH",
  "DOB_MISMATCH", "CUIL_INVALID", "CUIL_DNI_MISMATCH", "CUIL_OCR_MISMATCH",
  "ADDRESS_MISMATCH",
]);

/** Se arreglan sacando otra vez las fotos. */
const SE_ARREGLA_CON_FOTOS = new Set([
  "SLOT_CONTENT_MISMATCH", "NO_AUTHORITATIVE_SOURCE",
  "LICENSE_CODE_UNAVAILABLE", "SOURCE_CONFLICT",
]);

/**
 * La acción principal que corresponde ofrecer para una lista de motivos:
 *   "soporte"  → no se arregla desde la app
 *   "datos"    → corregir DNI / CUIL / domicilio
 *   "fotos"    → volver a sacar las cuatro fotos
 *   "reintentar" → solo volver a pedir la revisión (timeout, proveedor caído)
 *
 * Un motivo ilegible (`_UNREADABLE`) se cuenta como "sacar mejor la foto": el
 * dato no se pudo LEER, así que corregirlo en el perfil no cambiaría nada.
 */
export function accionSugerida(codes = []) {
  const lista = codes.map(String);
  if (lista.some((code) => SIN_SALIDA.has(code))) return "soporte";
  if (lista.some((code) => SE_ARREGLA_CON_DATOS.has(code))) return "datos";
  if (lista.some((code) => SE_ARREGLA_CON_FOTOS.has(code) || code.endsWith(SUFIJO_ILEGIBLE))) {
    return "fotos";
  }
  return "reintentar";
}
