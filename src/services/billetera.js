// ============================================================================
//  billetera.js — Las tarjetas que alguien dejó vinculadas, en SU navegador
// ----------------------------------------------------------------------------
//  Lo que se guarda de una tarjeta es lo mismo que muestra cualquier
//  aplicación: la marca, los últimos cuatro dígitos, el vencimiento y el nombre
//  impreso. El número entero y el código de atrás no entran acá —ver
//  tarjeta.js—, así que esto no es una copia de la tarjeta: es su ficha.
//
//  ── POR QUÉ LA FICHA VIVE EN EL NAVEGADOR Y NO EN EL SERVIDOR ─────────────
//  Porque la ficha no cobra. Quien cobra es Stripe, y para eso pide sus propios
//  campos en el momento del pago (services/stripe.js). Lo que la ficha resuelve
//  es lo otro: que la pantalla de pago sepa con qué tarjeta vas a pagar, que el
//  nombre ya esté cargado y que no haya que decidir nada cuando lo único que
//  falta es apretar un botón.
//
//  Guardarla en el servidor querría decir mandar los datos de una tarjeta a una
//  base para mostrar cuatro dígitos. No hace falta, y el día que haga falta —una
//  tarjeta vinculada que siga estando desde otro teléfono— lo que corresponde no
//  es esta tabla sino guardar el medio de pago en Stripe, que es quien puede
//  hacerlo sin tener la tarjeta escrita en ningún lado.
//
//  ── UNA BILLETERA POR CUENTA ──────────────────────────────────────────────
//  La clave lleva el identificador de la persona adentro. Dos cuentas en la
//  misma computadora es lo normal acá —se prueba el alquiler desde las dos
//  puntas, la que alquila y la que presta— y con una clave sola la tarjeta de
//  una le aparecía a la otra.
// ============================================================================

const PREFIJO = "fw_tarjetas_";

/**
 * El depósito donde se guarda. Por defecto el del navegador.
 *
 * Entra por parámetro para poder probar todo esto sin navegador: las pruebas le
 * pasan un objeto con tres métodos y listo (billetera.test.js).
 */
const delNavegador = () => (typeof localStorage === "undefined" ? null : localStorage);

const clave = (usuarioId) => `${PREFIJO}${usuarioId || "anonimo"}`;

/**
 * Lee la lista, y ante cualquier problema devuelve una vacía.
 *
 * Nunca tira. Un `localStorage` bloqueado —navegación privada, un permiso
 * apagado— o un texto a medio escribir de una versión anterior no pueden
 * romper la pantalla de pago: el peor caso es no tener ninguna tarjeta
 * vinculada, que es el estado con el que arranca cualquiera.
 */
export function leerTarjetas(usuarioId, deposito = delNavegador()) {
  if (!deposito) return [];
  try {
    const crudo = deposito.getItem(clave(usuarioId));
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter(t => t && t.id) : [];
  } catch {
    return [];
  }
}

function escribir(usuarioId, lista, deposito) {
  if (!deposito) return lista;
  try {
    deposito.setItem(clave(usuarioId), JSON.stringify(lista));
  } catch {
    // Sin lugar para guardar, la tarjeta igual sirve para este rato: la lista
    // que se devuelve es la buena y la pantalla la usa. Lo único que se pierde
    // es que siga estando la próxima vez.
  }
  return lista;
}

/**
 * EL IDENTIFICADOR SALE DE LA TARJETA MISMA.
 *
 * No es un número al azar: es la marca, los últimos cuatro y el vencimiento
 * pegados. Así, vincular dos veces la misma tarjeta la deja una sola vez en vez
 * de repetir el mismo renglón —que es lo que pasa cuando el identificador es un
 * azar— y a la vez dos tarjetas distintas que terminan en los mismos cuatro
 * dígitos siguen siendo dos, porque el vencimiento las separa.
 */
export const identificadorDe = (t) => `${t.marca}-${t.ultimos}-${t.mes}-${t.anio}`;

/**
 * Agrega una tarjeta (o actualiza la que ya estaba) y la deja elegida.
 *
 * Queda elegida siempre, y no solo la primera vez, porque vincular una tarjeta
 * nueva es decir "quiero usar esta". Tener que vincularla y DESPUÉS ir a
 * marcarla sería pedir dos veces lo mismo.
 */
export function agregarTarjeta(usuarioId, tarjeta, deposito = delNavegador()) {
  const id = identificadorDe(tarjeta);
  const nueva = { ...tarjeta, id, guardadaEl: new Date().toISOString() };
  const resto = leerTarjetas(usuarioId, deposito).filter(t => t.id !== id);
  return escribir(usuarioId, [nueva, ...resto], deposito);
}

/**
 * Saca una tarjeta.
 *
 * Si la que se saca era la elegida, queda elegida la primera de las que
 * quedan: la lista no puede quedar con tarjetas y sin ninguna elegida, porque
 * la pantalla de pago se quedaría sin con qué pagar teniendo tarjetas cargadas.
 * Eso lo resuelve `tarjetaElegida`, que siempre contesta con la primera.
 */
export function borrarTarjeta(usuarioId, id, deposito = delNavegador()) {
  return escribir(usuarioId, leerTarjetas(usuarioId, deposito).filter(t => t.id !== id), deposito);
}

/** Pone una tarjeta adelante: la de adelante es la que se usa. */
export function elegirTarjeta(usuarioId, id, deposito = delNavegador()) {
  const lista = leerTarjetas(usuarioId, deposito);
  const elegida = lista.find(t => t.id === id);
  if (!elegida) return lista;
  return escribir(usuarioId, [elegida, ...lista.filter(t => t.id !== id)], deposito);
}

/** Con cuál se va a pagar: la primera de la lista, o ninguna. */
export function tarjetaElegida(usuarioId, deposito = delNavegador()) {
  return leerTarjetas(usuarioId, deposito)[0] || null;
}

/** Cuando se cierra la sesión, la billetera de esa cuenta se va con ella. */
export function olvidarBilletera(usuarioId, deposito = delNavegador()) {
  if (!deposito) return;
  try { deposito.removeItem(clave(usuarioId)); } catch { /* ver escribir() */ }
}
