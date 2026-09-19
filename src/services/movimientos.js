// ============================================================================
//  movimientos.js — El historial de plata de una reserva, y cobrar la garantía
// ----------------------------------------------------------------------------
//  Dos cosas que el servidor ya tenía y el front no usaba:
//
//    GET  /payments/bookings/:id/ledger        el registro de todo lo que pasó
//    POST /payments/bookings/:id/deposit-capture   cobrar parte del depósito
//
//  ── POR QUÉ EL REGISTRO IMPORTA MÁS DE LO QUE PARECE ──────────────────────
//  La pantalla de pago muestra en qué estado está cada tramo: pagado o no. Eso
//  alcanza mientras todo sale bien. Cuando algo no sale bien —un cobro que
//  falló y después funcionó, un depósito que se retuvo y se soltó, un
//  desconocimiento de cobro— el estado actual no cuenta lo que pasó, y quien
//  pregunta "¿por qué me cobraron esto?" se queda sin respuesta.
//
//  El registro es una lista de hechos con su fecha, escrita por el servidor y
//  que no se edita nunca. Es lo que contesta esa pregunta.
//
//  ── Y POR QUÉ LO OTRO ES DELICADO ─────────────────────────────────────────
//  Cobrar el depósito en garantía es sacarle plata a una persona por un daño
//  que denunció otra. Por eso el servidor solo se lo permite a un
//  administrador, exige un motivo largo de verdad y no deja pasarse de lo que
//  está retenido. Acá se repiten esos límites ANTES de mandar: no para
//  reemplazar el control del servidor —que es el que vale— sino para que quien
//  está por hacerlo vea el problema mientras escribe y no después de apretar.
// ============================================================================

/**
 * Los tipos de hecho que anota el servidor, y cómo se leen.
 *
 * Salen de payments.service.ts: son los valores que escribe `recordEvent`.
 * Un tipo que no esté en esta lista se muestra igual, con su nombre crudo: es
 * mejor mostrar "algo.raro" que esconder un movimiento de plata porque el
 * front no lo conoce.
 */
const MOVIMIENTOS = {
  "intent.succeeded": { clave: "mov.cobrado", signo: "entra" },
  "intent.failed": { clave: "mov.fallido", signo: "nada" },
  "intent.processing": { clave: "mov.procesando", signo: "nada" },
  "hold.authorized": { clave: "mov.retenido", signo: "retiene" },
  "hold.captured": { clave: "mov.garantiaCobrada", signo: "entra" },
  "hold.released": { clave: "mov.garantiaSoltada", signo: "suelta" },
  "refund.created": { clave: "mov.devuelto", signo: "sale" },
  "transfer.created": { clave: "mov.transferido", signo: "sale" },
  "dispute.opened": { clave: "mov.desconocido", signo: "nada" },
  "connect.account.updated": { clave: "mov.cuentaActualizada", signo: "nada" },
};

/** Cómo se lee un hecho del registro. */
export function comoSeLeeElMovimiento(tipo) {
  return MOVIMIENTOS[tipo] || { clave: null, signo: "nada", crudo: tipo };
}

/**
 * El registro, ordenado para mostrar: lo último primero.
 *
 * El servidor lo devuelve del más viejo al más nuevo, que es el orden correcto
 * para guardarlo. Para mirarlo es al revés: lo que acaba de pasar es lo que se
 * está buscando, y con veinte movimientos sería el que queda más abajo.
 */
export function paraMostrar(registro) {
  const lista = Array.isArray(registro) ? registro : [];
  return [...lista]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map(hecho => ({ ...hecho, ...comoSeLeeElMovimiento(hecho.type) }));
}

/**
 * LA GARANTÍA DE UNA RESERVA, MIRADA DESDE EL PANEL DE ADMINISTRACIÓN.
 *
 * Se decide con los datos de la RESERVA y no con el registro de cobros, y eso
 * no es una preferencia: un administrador no puede leer el estado de pagos de
 * una reserva ajena. El servidor solo se lo entrega a las dos partes
 * (findBookingForParticipant), así que pedirlo desde el panel da 403.
 *
 * Con lo que sí trae /admin/bookings alcanza para saber si vale la pena
 * ofrecer el cobro:
 *
 *   · `depositSnapshot`          cuánto se acordó de garantía
 *   · `depositPaymentIntentId`   el servidor lo guarda al PEDIR la retención
 *   · `depositCapturedAmount`    queda escrito si ya se cobró (y se cobra una
 *                                sola vez: capturar consume la retención)
 *
 * Lo que NO se puede saber desde acá es si la retención sigue viva o ya se
 * soltó al devolverse el auto. Eso lo contesta el servidor al intentar, con
 * DEPOSIT_HOLD_NOT_AVAILABLE, y la pantalla muestra ese mensaje. Es preferible
 * a esconder el cobro por las dudas: el caso en que hace falta —hay un daño y
 * hay que responder— es justamente cuando no se puede quedar sin la
 * herramienta.
 */
export function garantiaDeLaReserva(reserva) {
  const deposito = reserva?.depositSnapshot;
  if (!deposito || deposito <= 0) return null;
  if (!reserva?.depositPaymentIntentId) return null;
  if (reserva?.depositCapturedAmount != null) return null;
  return {
    topeMinor: Math.round(deposito * 100),
    total: deposito,
    moneda: reserva.currency || "ars",
  };
}

/**
 * SI A UNA RESERVA DEVUELTA LE FALTA LIQUIDAR.
 *
 * ── Qué es liquidar ───────────────────────────────────────────────────────
 * Al confirmarse la devolución, el servidor suelta el depósito retenido y le
 * transfiere al dueño lo que le toca. Eso habla con el procesador y puede
 * fallar por su cuenta —el caso más común es el dueño que todavía no terminó
 * el alta de cobros, y entonces la transferencia se rechaza—.
 *
 * La devolución NO se cae por eso: el auto volvió igual. Pero la reserva queda
 * cerrada con el dueño sin cobrar, y confirmar la devolución otra vez no se
 * puede (el código ya se consumió). Alguien lo tiene que poder reintentar, y
 * esto es lo que decide a cuáles ofrecérselo.
 *
 * ── Cómo se sabe, con lo que trae /admin/bookings ─────────────────────────
 * `ownerTransferId` queda escrito cuando la transferencia sale. Una reserva
 * COMPLETED, con plata para el dueño, y sin ese identificador, es una que no
 * se liquidó.
 *
 * El caso de cero —una reserva sin nada que transferir— se descarta aparte:
 * ahí nunca va a haber identificador y el botón quedaría prendido para
 * siempre ofreciendo arreglar algo que no está roto.
 */
export function liquidacionPendiente(reserva) {
  if (reserva?.status !== "COMPLETED") return false;
  const alDueno = reserva?.ownerPayoutSnapshot;
  if (!alDueno || alDueno <= 0) return false;
  return !reserva?.ownerTransferId;
}

const MOTIVO_MINIMO = 10;
const MOTIVO_MAXIMO = 500;

/**
 * Revisa una captura antes de mandarla.
 *
 * Los mismos límites que pone el servidor (CaptureDepositDto y captureDeposit):
 * importe entero en centavos, mayor que cero, que no supere lo retenido, y un
 * motivo de al menos diez caracteres.
 *
 * Lo del motivo no es burocracia: es lo que va a leer quien alquiló cuando
 * pregunte por qué le cobraron la garantía, y "daño" no es una respuesta.
 *
 * `monto` entra en PESOS, que es como lo escribe una persona, y sale en
 * centavos, que es como lo quiere el servidor. La conversión vive acá y no en
 * la pantalla para que no haya dos lugares redondeando plata ajena.
 */
export function revisarCaptura({ monto, motivo, topeMinor }) {
  const errores = {};
  const numero = Number(String(monto ?? "").replace(",", "."));
  const montoMinor = Math.round(numero * 100);

  if (!String(monto ?? "").trim()) errores.monto = "captura.error.montoVacio";
  else if (!Number.isFinite(numero) || montoMinor <= 0) errores.monto = "captura.error.montoInvalido";
  else if (topeMinor != null && montoMinor > topeMinor) errores.monto = "captura.error.montoSePasa";

  const texto = String(motivo ?? "").trim();
  if (!texto) errores.motivo = "captura.error.motivoVacio";
  else if (texto.length < MOTIVO_MINIMO) errores.motivo = "captura.error.motivoCorto";
  else if (texto.length > MOTIVO_MAXIMO) errores.motivo = "captura.error.motivoLargo";

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    montoMinor: Number.isFinite(montoMinor) ? montoMinor : 0,
    motivo: texto,
  };
}
