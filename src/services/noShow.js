// ============================================================================
//  noShow.js — El retiro que no pasó, desde la pantalla
// ----------------------------------------------------------------------------
//  QUÉ PROBLEMA RESUELVE ESTO.
//
//  El retiro es el único momento del alquiler que ocurre en la vereda, donde el
//  servidor no ve nada. Si nadie escanea el código, lo único que queda son dos
//  personas, y hasta hace poco solo UNA de ellas tenía dónde dejar constancia:
//  el dueño podía reportar "no vino a buscar el auto", y quien alquilaba no
//  tenía dónde decir lo mismo del dueño. Su única salida era cancelar, y una
//  cancelación no distingue entre "me arrepentí" y "estuve media hora esperando
//  en la esquina".
//
//  Ahora las dos partes pueden, con la MISMA ventana y las mismas reglas. Este
//  archivo es el espejo en el front de bookings/cancellation-policy.ts: decide
//  cuándo mostrar cada botón, para que nadie apriete algo que el servidor va a
//  rechazar.
//
//  ── LOS NÚMEROS ESTÁN DOS VECES, Y ESO SE CUIDA ──────────────────────────
//  La media hora y las veinticuatro horas están acá y en el servidor. No hay
//  forma de que no: el front tiene que decidir si dibuja un botón antes de
//  preguntar nada. Lo que sí se puede es que la diferencia no pase inadvertida,
//  y por eso están en constantes con nombre, en un solo lugar, con esta nota al
//  lado. El servidor es el que manda: si los dos no coinciden, lo que se ve es
//  un botón que contesta un error.
//
//  ── POR QUÉ NO ALCANZA CON "ES DESPUÉS DE LA HORA" ───────────────────────
//  Las dos puntas de la ventana existen por motivos distintos y los dos
//  importan. Antes de la media hora, reportar sería marcar a alguien que
//  todavía está llegando: el tránsito, el colectivo, no encontrar la esquina.
//  Pasadas las veinticuatro horas, sería decidir con la billetera en la mano si
//  conviene reclamar, y un reporte de tres días después ya no lo puede discutir
//  nadie porque nadie se acuerda.
// ============================================================================

/** Los mismos de bookings/cancellation-policy.ts del backend. */
export const MINUTOS_DE_GRACIA = 30;
export const HORAS_PARA_RECLAMAR = 24;

/** Los estados en los que una reserva todavía está viva. */
const VIVAS = ["REQUESTED", "ACCEPTED", "READY_FOR_PICKUP"];

const MINUTO = 60 * 1000;

/**
 * Si se puede dejar constancia de que el otro no apareció, y si no, por qué.
 *
 * Devuelve `{ puede, motivo }`. El motivo sirve para explicar en vez de
 * esconder: un botón que desaparece sin decir nada deja a alguien buscándolo.
 *
 *   "noEsTuReserva"   → no sos ninguna de las dos partes.
 *   "yaReportaste"    → tu constancia ya está, con su hora.
 *   "cerrada"         → la reserva ya terminó: no hay nada que decidir.
 *   "yaSeEntrego"     → alguien escaneó el código. El auto se entregó.
 *   "todaviaNo"       → falta para la media hora de gracia.
 *   "plazoVencido"    → pasaron más de 24 horas desde el horario acordado.
 */
export function puedeReportar(reserva, { soyElDueno, ahora = new Date() } = {}) {
  if (!reserva) return { puede: false, motivo: "noEsTuReserva" };

  const yaReporte = soyElDueno ? reserva.renterNoShowAt : reserva.ownerNoShowAt;
  if (yaReporte) return { puede: false, motivo: "yaReportaste" };

  /*
    LA ENTREGA SE MIRA ANTES QUE EL ESTADO, y es a propósito.

    Una reserva con la entrega confirmada ya no está "viva" para cancelar, así
    que las dos condiciones dan false y se podría contestar cualquiera de las
    dos. Pero no explican lo mismo: "el auto ya se entregó" dice qué pasó, y
    "la reserva está cerrada" deja a alguien preguntándose por qué. El orden es
    el mismo en el servidor.
  */
  if (reserva.pickupConfirmedAt) {
    return { puede: false, motivo: "yaSeEntrego" };
  }
  if (!VIVAS.includes(reserva.status)) {
    return { puede: false, motivo: "cerrada" };
  }

  const inicio = new Date(reserva.startDate).getTime();
  if (Number.isNaN(inicio)) return { puede: false, motivo: "todaviaNo" };

  const minutosDesdeElInicio = (ahora.getTime() - inicio) / MINUTO;
  if (minutosDesdeElInicio < MINUTOS_DE_GRACIA) {
    return { puede: false, motivo: "todaviaNo" };
  }
  if (minutosDesdeElInicio > HORAS_PARA_RECLAMAR * 60) {
    return { puede: false, motivo: "plazoVencido" };
  }
  return { puede: true, motivo: null };
}

/**
 * En qué quedó el retiro, mirando las dos constancias.
 *
 *   "sinReportes"  → nadie dijo nada todavía.
 *   "reporteMio"   → dejé mi constancia y el otro no dijo nada.
 *   "reporteSuyo"  → el otro dejó la suya y yo no dije nada.
 *   "trabado"      → los dos. La plata no se mueve hasta que se resuelva.
 *   "resuelto"     → ya se decidió a favor de alguien.
 *
 * Se calcula acá y no en cada pantalla porque son cinco estados y cada uno se
 * dibuja distinto; repartidos en la pantalla terminan siendo cuatro `if`
 * anidados que nadie vuelve a leer.
 */
export function estadoDelRetiro(reserva, { soyElDueno } = {}) {
  const mio = soyElDueno ? reserva?.renterNoShowAt : reserva?.ownerNoShowAt;
  const suyo = soyElDueno ? reserva?.ownerNoShowAt : reserva?.renterNoShowAt;

  if (reserva?.noShowResolvedFor) {
    return {
      clave: "resuelto",
      /** Si la decisión fue a mi favor. */
      aMiFavor: reserva.noShowResolvedFor === (soyElDueno ? "OWNER" : "RENTER"),
    };
  }
  if (mio && suyo) return { clave: "trabado", aMiFavor: null };
  if (mio) return { clave: "reporteMio", aMiFavor: null };
  if (suyo) return { clave: "reporteSuyo", aMiFavor: null };
  return { clave: "sinReportes", aMiFavor: null };
}

/**
 * Si la cancelación está trabada por las dos constancias.
 *
 * Es lo que mira la pantalla para NO ofrecer el botón de cancelar: apretarlo
 * contesta NO_SHOW_DISPUTED, y un botón que falla siempre es peor que un botón
 * que no está. En su lugar va la explicación de por qué la plata está quieta.
 */
export const estaTrabada = (reserva) =>
  Boolean(
    reserva?.renterNoShowAt &&
      reserva?.ownerNoShowAt &&
      !reserva?.noShowResolvedFor,
  );
