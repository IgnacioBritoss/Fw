// ============================================================================
//  phone.js — Reglas del teléfono
// ----------------------------------------------------------------------------
//  ANTES SOLO ENTRABAN NÚMEROS ARGENTINOS. El campo tenía el "+54" fijo y
//  cualquier otro número quedaba rechazado, en la pantalla y en el servidor. Eso
//  dejaba afuera exactamente a quien más necesita alquilar un auto acá: alguien
//  que viene de afuera, que llega con su teléfono de su país y todavía no tiene
//  una línea argentina. La app está traducida a cinco idiomas para que la usen
//  extranjeros y después les pedía un celular argentino en el primer formulario.
//
//  AHORA SE ELIGE EL PAÍS y el número se guarda en formato internacional E.164
//  (`+` país + número, sin espacios ni guiones), que es el formato con el que se
//  puede llamar o mandar un SMS desde cualquier lado.
//
//  QUÉ SE VALIDA Y QUÉ NO
//  Argentina se sigue validando en serio, porque su plan de numeración lo
//  conocemos: después del 54 van siempre 10 dígitos entre área y número
//  (11 + 8 en CABA, 351 + 7 en Córdoba, 2954 + 6 en La Pampa: cambia el
//  reparto, no el total), más el 9 que identifica al celular.
//
//  Para el resto de los países se comprueba el largo y nada más. No se inventa
//  una regla por país: no las sabemos, y una regla inventada rechaza números
//  buenos, que es peor que aceptar uno malo. E.164 admite hasta 15 dígitos
//  contando el país, así que ese es el techo real.
// ============================================================================

/** Cantidad de dígitos de área + número en Argentina. */
export const LOCAL_DIGITS = 10;

/** Largo máximo de un número E.164, contando el código de país. */
const E164_MAX = 15;
/** Mínimo razonable para la parte local: por debajo de esto es un descuido. */
const MIN_LOCAL = 5;

/**
 * Los países que se ofrecen, con su código telefónico.
 *
 * NO llevan el nombre escrito: el navegador ya sabe cómo se llama cada país en
 * cada idioma (`Intl.DisplayNames`), así que escribirlos acá significaría
 * mantener la misma lista cinco veces y que igual quede mal en el sexto idioma
 * que agreguemos. Con el código ISO alcanza.
 *
 * Argentina primero porque es donde funciona el servicio, después los
 * limítrofes, y de ahí en adelante alfabético por código.
 */
export const PAISES = [
  { iso: "AR", dial: "54" },
  { iso: "BR", dial: "55" }, { iso: "CL", dial: "56" }, { iso: "UY", dial: "598" },
  { iso: "PY", dial: "595" }, { iso: "BO", dial: "591" },
  { iso: "US", dial: "1" }, { iso: "CA", dial: "1" },
  { iso: "MX", dial: "52" }, { iso: "CO", dial: "57" }, { iso: "PE", dial: "51" },
  { iso: "EC", dial: "593" }, { iso: "VE", dial: "58" }, { iso: "CR", dial: "506" },
  { iso: "PA", dial: "507" }, { iso: "DO", dial: "1809" }, { iso: "CU", dial: "53" },
  { iso: "GT", dial: "502" }, { iso: "HN", dial: "504" }, { iso: "SV", dial: "503" },
  { iso: "NI", dial: "505" },
  { iso: "ES", dial: "34" }, { iso: "PT", dial: "351" }, { iso: "FR", dial: "33" },
  { iso: "IT", dial: "39" }, { iso: "DE", dial: "49" }, { iso: "GB", dial: "44" },
  { iso: "IE", dial: "353" }, { iso: "NL", dial: "31" }, { iso: "BE", dial: "32" },
  { iso: "CH", dial: "41" }, { iso: "AT", dial: "43" }, { iso: "SE", dial: "46" },
  { iso: "NO", dial: "47" }, { iso: "DK", dial: "45" }, { iso: "FI", dial: "358" },
  { iso: "PL", dial: "48" }, { iso: "CZ", dial: "420" }, { iso: "GR", dial: "30" },
  { iso: "RO", dial: "40" }, { iso: "RU", dial: "7" }, { iso: "UA", dial: "380" },
  { iso: "TR", dial: "90" },
  { iso: "CN", dial: "86" }, { iso: "JP", dial: "81" }, { iso: "KR", dial: "82" },
  { iso: "IN", dial: "91" }, { iso: "ID", dial: "62" }, { iso: "TH", dial: "66" },
  { iso: "PH", dial: "63" }, { iso: "VN", dial: "84" }, { iso: "MY", dial: "60" },
  { iso: "SG", dial: "65" }, { iso: "IL", dial: "972" }, { iso: "AE", dial: "971" },
  { iso: "SA", dial: "966" },
  { iso: "AU", dial: "61" }, { iso: "NZ", dial: "64" },
  { iso: "ZA", dial: "27" }, { iso: "EG", dial: "20" }, { iso: "MA", dial: "212" },
  { iso: "NG", dial: "234" }, { iso: "KE", dial: "254" },
];

/** El país que viene elegido de entrada. */
export const PAIS_POR_DEFECTO = "AR";

export const buscarPais = (iso) =>
  PAISES.find((p) => p.iso === iso) ?? PAISES[0];

/**
 * El nombre del país en el idioma que se esté usando. Lo resuelve el navegador,
 * que ya tiene la tabla de los 250 países en todos los idiomas. Si no lo
 * soporta, queda el código ISO, que igual se entiende al lado del "+54".
 */
export function nombrePais(iso, lang = "es") {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(iso) || iso;
  } catch {
    return iso;
  }
}

/**
 * Deja un número argentino en formato canónico E.164 `+549XXXXXXXXXX`, o null si
 * no es válido. Es la misma regla que aplica el backend, para que la pantalla
 * avise antes de mandar el pedido.
 */
export function normalizeArgentinePhone(value) {
  if (typeof value !== "string") return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("54")) return null;

  let rest = digits.slice(2);
  // El 0 de larga distancia (011) y el 15 de celular no van en el internacional.
  if (rest.startsWith("0")) rest = rest.slice(1);

  if (rest.length === LOCAL_DIGITS + 1 && rest.startsWith("9")) return `+54${rest}`;
  if (rest.length === LOCAL_DIGITS) return `+549${rest}`;
  return null;
}

export const isArgentinePhone = (value) => normalizeArgentinePhone(value) !== null;

/**
 * Arma el número internacional a partir del código de país y de lo que la
 * persona escribió. Devuelve `+<país><número>` o null si no cierra.
 *
 * Argentina pasa por la regla estricta de arriba; el resto, por el largo.
 */
export function normalizePhone(dial, local) {
  const paisDigits = String(dial ?? "").replace(/\D/g, "");
  let locales = String(local ?? "").replace(/\D/g, "");
  if (!paisDigits || !locales) return null;

  if (paisDigits === "54") return normalizeArgentinePhone(`54${locales}`);

  // El 0 de larga distancia nacional no va en el formato internacional. Es la
  // costumbre en buena parte de Europa y de América Latina escribirlo igual.
  if (locales.startsWith("0")) locales = locales.slice(1);

  if (locales.length < MIN_LOCAL) return null;
  if (paisDigits.length + locales.length > E164_MAX) return null;
  return `+${paisDigits}${locales}`;
}

export const isValidPhone = (dial, local) => normalizePhone(dial, local) !== null;

/** Cuántos dígitos locales entran como máximo para este país. */
export const maxLocalDigits = (dial) => {
  const paisDigits = String(dial ?? "").replace(/\D/g, "");
  if (paisDigits === "54") return LOCAL_DIGITS + 1;
  return E164_MAX - paisDigits.length;
};
