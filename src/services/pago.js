// ============================================================================
//  pago.js — Qué tramo del pago sigue, decidido en un solo lugar
// ----------------------------------------------------------------------------
//  El alquiler se paga en tres tramos y en este orden:
//
//    1. SEÑA          confirma la reserva.
//    2. SALDO         el resto del alquiler. Recién con esto la reserva queda
//                     "pago completo", que es lo único que habilita el retiro.
//    3. DEPÓSITO      no es un gasto: se AUTORIZA y queda retenido hasta que se
//                     devuelve el auto.
//
//  El orden no lo inventa el front: el servidor rechaza el saldo si la seña no
//  está paga.
//
//  ── POR QUÉ ESTO ES UN ARCHIVO Y NO CÓDIGO ADENTRO DE LA PANTALLA ─────────
//  Hay DOS pantallas que necesitan saber qué falta pagar, y no es lo mismo lo
//  que cada una tiene a mano:
//
//   · La pantalla de pago pide el estado al servidor y recibe `records`, la
//     lista de cobros con el estado de cada uno. Es el dato exacto.
//   · "Mis reservas" trae la lista de reservas, sin los cobros. Ahí lo único que
//     hay son los montos guardados en la reserva y el estado general.
//
//  Con la regla escrita dos veces, las dos pantallas se contradecían: una decía
//  "falta el saldo" y la otra ofrecía "Pagar" a secas, o directamente dejaba de
//  ofrecerlo. Acá la regla es una sola y cada pantalla le pasa lo que tiene.
//
//  ── EL CASO QUE ESTABA ROTO ───────────────────────────────────────────────
//  "Mis reservas" ofrecía pagar mientras la reserva no estuviera en "pago
//  completo". Pero el pago completo llega con el SALDO, no con el depósito: si
//  alguien pagaba la seña y el saldo y se iba de la pantalla antes de autorizar
//  el depósito, el botón desaparecía y NO HABÍA FORMA DE VOLVER. La reserva se
//  quedaba sin garantía para siempre y nadie se enteraba.
// ============================================================================

/** Los estados de un cobro que cuentan como cubierto. */
const CUBIERTO = ["PAID", "CAPTURED", "AUTHORIZED", "SUCCEEDED"];

/**
 * Los tres tramos con su estado.
 *
 * @param datos.paymentStatus  el estado general de la reserva
 * @param datos.sena / balance / deposit  los montos (null = ese tramo no existe)
 * @param datos.records  la lista de cobros del servidor, si se tiene
 * @param datos.depositPaymentIntentId  lo que guarda la RESERVA cuando el
 *        depósito ya se pidió. Es lo único que sabe de él una pantalla que no
 *        consultó los cobros.
 */
export function tramosDelPago({
  paymentStatus, sena, balance, deposit, records, depositPaymentIntentId,
} = {}) {
  const lista = Array.isArray(records) ? records : [];

  const registroDe = (kind) => lista
    .filter(r => r.kind === kind)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;

  /*
    El estado general nunca puede decir MENOS que los registros, así que se
    usan los dos: si la reserva figura paga, la seña y el saldo están, vengan o
    no los cobros.
  */
  const porEstado = (kind) => {
    if (kind === "SENA") return paymentStatus === "DEPOSIT_PAID" || paymentStatus === "FULLY_PAID";
    if (kind === "BALANCE") return paymentStatus === "FULLY_PAID";
    // El depósito NO cambia el estado general de la reserva: se autoriza, no se
    // cobra. Lo único que deja rastro afuera de los cobros es el identificador
    // que queda guardado en la reserva cuando se pidió.
    return Boolean(depositPaymentIntentId);
  };

  /*
    NO HAY NINGÚN ATAJO DEL TIPO "SI ESTÁ TODO PAGO, DAR EL DEPÓSITO POR HECHO".

    Lo tuvo, y estaba mal. La idea era contemplar las reservas viejas, de cuando
    el botón cobraba los tres tramos juntos: sin registros y en "pago completo",
    se daba todo por cubierto. El problema es que "Mis reservas" NUNCA tiene
    registros —la lista de reservas no los trae—, así que el atajo se disparaba
    siempre, y una reserva con la seña y el saldo pagos pero sin el depósito
    aparecía como terminada. Justo el agujero que había que tapar.

    Y no hace falta: `depositPaymentIntentId` ya distingue los dos casos. El
    backend lo guarda en la reserva en cuanto se PIDE el depósito, así que una
    reserva vieja pagada de una sola vez lo tiene cargado (el cobro único
    también creaba el depósito) y una que se quedó a mitad de camino no.
  */

  return [
    { kind: "SENA", label: "payment.sena", monto: sena },
    { kind: "BALANCE", label: "payment.balance", monto: balance },
    { kind: "DEPOSIT_HOLD", label: "payment.guarantee", monto: deposit },
  ]
    // Un tramo sin monto no existe: una reserva sin depósito no muestra un paso
    // vacío ni pide autorizar cero pesos.
    .filter(t => t.monto != null)
    .map(t => {
      const r = registroDe(t.kind);
      return {
        ...t,
        hecho: Boolean(r && CUBIERTO.includes(r.status)) || porEstado(t.kind),
        rechazado: r?.status === "FAILED",
      };
    });
}

/** El tramo que sigue: el primero sin cubrir, o null si no falta nada. */
export function tramoPendiente(datos) {
  const tramos = tramosDelPago(datos);
  return tramos.find(t => !t.hecho) || null;
}

/**
 * Lo mismo, pero a partir de una reserva de la lista de "Mis reservas".
 *
 * Ahí no hay `records`: la lista de reservas no los trae. Se arma con lo que sí
 * viaja en cada reserva, que alcanza para saber QUÉ FALTA aunque no alcance
 * para saber el detalle de cada cobro.
 */
export function tramoPendienteDeReserva(booking = {}) {
  return tramoPendiente({
    paymentStatus: booking.paymentStatus,
    sena: booking.senaAmountSnapshot,
    balance: booking.balanceAmountSnapshot,
    deposit: booking.depositSnapshot,
    depositPaymentIntentId: booking.depositPaymentIntentId,
  });
}
