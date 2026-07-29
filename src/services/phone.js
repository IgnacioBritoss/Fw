// ============================================================================
//  phone.js — Reglas del teléfono argentino
// ----------------------------------------------------------------------------
//  El servicio funciona solo en Argentina, así que el número tiene que estar en
//  formato internacional y empezar con el código de país 54:
//
//        54  9   11      3289 5416
//        ↑   ↑   ↑       ↑
//        país│   área    número
//            └ el 9 identifica que es un celular
//
//  Después del 54 van siempre 10 dígitos entre área y número (11 + 8 en CABA,
//  351 + 7 en Córdoba, 2954 + 6 en La Pampa: cambia el reparto, no el total).
//
//  Es la MISMA regla que aplica el backend, repetida acá para poder avisar en la
//  pantalla antes de mandar el pedido. El backend igual la vuelve a validar.
// ============================================================================
/** Cantidad de dígitos de área + número en Argentina. */
export const LOCAL_DIGITS = 10;

/**
 * Deja el número en formato canónico E.164 `+549XXXXXXXXXX` o devuelve null si
 * no es un teléfono argentino válido. Es la misma regla que aplica el backend,
 * para que la pantalla avise antes de mandar el pedido.
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
