// ============================================================================
//  cancelacion.js — Qué pasa si se cancela, dicho ANTES de cancelar
// ----------------------------------------------------------------------------
//  ── LA POLÍTICA ───────────────────────────────────────────────────────────
//
//    · Hasta 48 horas antes del inicio → vuelve TODO.
//    · Entre las 48 horas y el inicio  → vuelve el saldo, se retiene la seña.
//    · Con el auto ya entregado        → no se cancela: se devuelve el auto,
//                                        que además libera las fechas que
//                                        sobran.
//    · Si cancela el DUEÑO             → vuelve todo, siempre.
//
//  El depósito en garantía se libera en todos los casos: nunca fue un cobro.
//
//  ── POR QUÉ ESTO VIVE TAMBIÉN ACÁ, SI LO DECIDE EL SERVIDOR ───────────────
//  Porque el servidor decide DESPUÉS de apretar, y para entonces ya no hay nada
//  que decidir. Una política de cancelación que solo se ejecuta no sirve de
//  nada: sirve cuando se lee ANTES, en el momento en que alguien está dudando
//  si cancelar hoy o mañana. Esa diferencia —hoy vuelve todo, mañana no— es
//  literalmente la única información que esta pantalla puede dar y que cambia
//  lo que la persona hace.
//
//  ACÁ NO SE DECIDE NADA. El servidor vuelve a calcular lo mismo por su cuenta y
//  es el único que cobra o devuelve; esto es el cartel, no la caja. Si los dos
//  no dicen lo mismo, el que está mal es este archivo.
//
//  LAS 48 HORAS ESTÁN ESCRITAS EN LOS DOS LADOS y tienen que coincidir: acá y en
//  el backend, en src/bookings/cancellation-policy.ts. Que el aviso prometa un
//  plazo y el servidor aplique otro es peor que no avisar nada.
// ============================================================================

/** Las horas antes del inicio hasta las que la cancelación es libre. */
export const HORAS_DE_GRACIA = 48;

/** Los estados en los que una reserva todavía se puede cancelar. */
const CANCELABLES = ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"];

/** Los estados en los que el auto está afuera: ahí se devuelve, no se cancela. */
const EN_LA_CALLE = ["IN_PROGRESS", "RETURN_PENDING"];

const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Qué pasaría si se cancelara ahora.
 *
 * `ahora` entra por parámetro por lo de siempre: una prueba de plazos atada al
 * reloj de la máquina pasa hoy y falla mañana.
 *
 * @returns `{ puede, motivo, tier, retieneSena, horasParaElInicio }`
 *   · tier "libre"    con tiempo: vuelve todo
 *   · tier "tardia"   sobre la fecha: se retiene la seña
 *   · tier "delDueno" la cancela el dueño: vuelve todo
 *   · tier "cerrada"  no se puede
 */
export function decidirCancelacion({
  status, startDate, ahora = new Date(), laCancelaElDueno = false,
} = {}) {
  const inicio = startDate ? new Date(startDate) : null;
  const horasParaElInicio = inicio && !Number.isNaN(inicio.getTime())
    ? (inicio.getTime() - new Date(ahora).getTime()) / MS_POR_HORA
    : 0;

  if (!CANCELABLES.includes(status)) {
    return {
      puede: false,
      // Dos motivos distintos porque son dos cosas distintas: con el auto en la
      // calle la salida existe, solo que no es cancelar.
      motivo: EN_LA_CALLE.includes(status) ? "enCurso" : "cerrada",
      tier: "cerrada",
      retieneSena: false,
      horasParaElInicio,
    };
  }

  if (laCancelaElDueno) {
    return { puede: true, motivo: null, tier: "delDueno", retieneSena: false, horasParaElInicio };
  }

  if (horasParaElInicio >= HORAS_DE_GRACIA) {
    return { puede: true, motivo: null, tier: "libre", retieneSena: false, horasParaElInicio };
  }

  return { puede: true, motivo: null, tier: "tardia", retieneSena: true, horasParaElInicio };
}

/**
 * CUÁNTO VUELVE Y CUÁNTO NO, con lo que trae la reserva.
 *
 * Solo cuenta lo que YA SE PAGÓ: prometer que "vuelven $292.600" en una reserva
 * donde se pagó únicamente la seña sería mentir con un número grande, que es la
 * peor manera de mentir.
 *
 * El depósito no aparece en ninguna de las dos columnas, y es a propósito: no
 * es un cobro, es una retención, y se libera pase lo que pase. Meterlo en "lo
 * que vuelve" haría que el total devuelto no coincida con lo que la tarjeta va
 * a mostrar.
 */
export function loQueVuelve(booking = {}, decision = {}) {
  const pago = booking.paymentStatus;
  const senaPaga = pago === "DEPOSIT_PAID" || pago === "FULLY_PAID";
  const saldoPago = pago === "FULLY_PAID";

  const sena = senaPaga ? Number(booking.senaAmountSnapshot || 0) : 0;
  const saldo = saldoPago ? Number(booking.balanceAmountSnapshot || 0) : 0;

  const retiene = decision.retieneSena ? sena : 0;
  return { devuelve: sena + saldo - retiene, retiene, pagado: sena + saldo };
}

/**
 * El cartel que se muestra al ir a cancelar: la clave del texto y sus datos.
 *
 * Devuelve la CLAVE de traducción y no el texto porque quién traduce es la
 * pantalla, que es la que sabe en qué idioma está.
 */
export function avisoDeCancelacion(booking = {}, decision = {}) {
  const { devuelve, retiene, pagado } = loQueVuelve(booking, decision);

  if (decision.tier === "cerrada") {
    return { clave: decision.motivo === "enCurso" ? "cancelar.enCurso" : "cancelar.cerrada", devuelve, retiene };
  }
  // Sin nada pagado no hay plata de la que hablar, y el plazo es irrelevante:
  // el cartel tiene que decir lo que importa, que es que las fechas se liberan.
  if (pagado <= 0) return { clave: "cancelar.sinPagos", devuelve, retiene };
  if (decision.tier === "tardia") return { clave: "cancelar.tardia", devuelve, retiene };
  if (decision.tier === "delDueno") return { clave: "cancelar.delDueno", devuelve, retiene };
  return { clave: "cancelar.libre", devuelve, retiene };
}

/**
 * Cuánto falta para que deje de ser gratis, en horas enteras.
 *
 * Es lo que permite escribir "te quedan 6 horas para cancelar sin costo" en vez
 * de un plazo abstracto que hay que calcular de cabeza. Null cuando ya pasó o
 * cuando falta tanto que decirlo no aporta nada.
 */
export function horasQueQuedanGratis(decision = {}) {
  if (decision.tier !== "libre") return null;
  const quedan = Math.floor(decision.horasParaElInicio - HORAS_DE_GRACIA);
  if (quedan < 0 || quedan > 48) return null;
  return quedan;
}
