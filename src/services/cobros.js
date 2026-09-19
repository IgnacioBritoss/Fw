// ============================================================================
//  cobros.js — Si el dueño de un auto puede recibir la plata
// ----------------------------------------------------------------------------
//  ── EL AGUJERO QUE ESTO TAPA ──────────────────────────────────────────────
//  El servidor ya tenía todo esto hecho, y el front no lo usaba. El comentario
//  que dejó escrito en payments.service.ts dice exactamente para qué era:
//
//      "El front lo necesita para poder decir 'todavía te falta completar tus
//       datos en Stripe' antes de que alguien publique un auto y descubra
//       recién al devolverlo que no puede cobrar."
//
//  Y eso es lo que pasaba, porque nadie se lo preguntaba nunca. El recorrido
//  entero: se publica un auto, alguien lo alquila, se paga, se entrega, se
//  usa... y al confirmar la devolución el servidor intenta transferirle la
//  plata al dueño y no puede, porque su cuenta de cobro nunca se completó. La
//  reserva queda cerrada igual —el servidor la marca COMPLETED antes de
//  liquidar— así que lo único que pasa es que la pantalla tira un error raro
//  al final y el dueño no ve un peso.
//
//  El alta con Stripe hay que hacerla UNA vez y lleva dos minutos. Lo único
//  que faltaba era decirlo a tiempo.
//
//  ── LOS CUATRO ESTADOS SON DEL SERVIDOR, NO INVENTADOS ACÁ ────────────────
//  GET /payments/connect/status devuelve `status` con uno de estos cuatro
//  valores (el enum StripeAccountStatus del backend), más los tres datos que
//  Stripe informa de la cuenta. Acá se traducen a qué hay que mostrar.
// ============================================================================

/**
 * Qué hacer con lo que contestó el servidor.
 *
 *   "listo"        la plata le va a llegar: no hay nada que hacer.
 *   "enRevision"   completó sus datos y Stripe todavía no lo habilitó.
 *   "aMedias"      empezó el alta y la dejó por la mitad. El caso más común.
 *   "sinCuenta"    nunca la empezó.
 *   "desconocido"  no se pudo preguntar.
 *
 * ── POR QUÉ "DESCONOCIDO" NO ES "NO PUEDE COBRAR" ─────────────────────────
 * Misma regla que en el resto de la app: sin dato no se bloquea, y acá además
 * no se asusta. La consulta puede fallar porque el servidor no tiene el cobro
 * con tarjeta configurado, o porque se cayó la red un segundo. Mostrarle a
 * alguien "no vas a poder cobrar" porque una consulta no salió sería mentirle
 * sobre su plata, que es la peor cosa sobre la que mentir.
 */
export function estadoDeCobro(respuesta) {
  if (!respuesta || typeof respuesta !== "object") {
    return { clave: "desconocido", puedeCobrar: false, hayQueAvisar: false };
  }
  if (respuesta.payoutsEnabled || respuesta.status === "ENABLED") {
    return { clave: "listo", puedeCobrar: true, hayQueAvisar: false };
  }
  if (!respuesta.connected || respuesta.status === "NONE") {
    return { clave: "sinCuenta", puedeCobrar: false, hayQueAvisar: true };
  }
  /*
    RESTRICTED es "mandó los datos y Stripe todavía no habilitó los pagos".

    No se pinta como un problema del dueño porque no lo es: no hay nada que
    pueda hacer más que esperar. Un cartel rojo pidiéndole que complete algo
    que ya completó lo manda a dar vueltas por un formulario terminado.
  */
  if (respuesta.status === "RESTRICTED" || respuesta.detailsSubmitted) {
    return { clave: "enRevision", puedeCobrar: false, hayQueAvisar: false };
  }
  return { clave: "aMedias", puedeCobrar: false, hayQueAvisar: true };
}

/** El texto de cada estado, en el diccionario. */
export const textoDelEstado = (clave) => ({
  titulo: `cobros.${clave}.titulo`,
  detalle: `cobros.${clave}.detalle`,
});

/**
 * Si vale la pena molestar al dueño con un aviso en el panel.
 *
 * Solo cuando hay algo que él pueda resolver Y tiene autos publicados: a quien
 * todavía no publicó nada no se le pide que arregle cómo va a cobrar por un
 * auto que no existe. El aviso aparece cuando empieza a tener sentido.
 */
export function convieneAvisar(estado, cantidadDeAutos) {
  return Boolean(estado?.hayQueAvisar) && cantidadDeAutos > 0;
}
