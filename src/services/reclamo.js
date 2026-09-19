// ============================================================================
//  reclamo.js — El reclamo de un daño, revisado antes de mandarlo
// ----------------------------------------------------------------------------
//  Cuando el auto vuelve, el dueño lo revisa. Si encuentra un daño lo reclama
//  con fotos y un importe, y un administrador resuelve cuánto se cobra del
//  depósito en garantía. El dueño NUNCA cobra solo: es plata de otra persona y
//  las dos partes tienen intereses opuestos exactamente acá.
//
//  ── LA VENTANA ────────────────────────────────────────────────────────────
//  El depósito ya no se libera en el instante en que se confirma la devolución:
//  queda retenido 48 horas para que el dueño tenga tiempo de mirar el auto. Sin
//  esa ventana el reclamo llegaría siempre tarde, porque no habría retención
//  que capturar.
//
//  Este archivo tiene las dos cosas que la pantalla necesita: cómo se lee la
//  ventana y si el formulario está en condiciones de mandarse.
//
//  ── POR QUÉ SE REVISA ACÁ SI TAMBIÉN REVISA EL SERVIDOR ───────────────────
//  Porque el servidor contesta DESPUÉS de subir las fotos. Un reclamo rechazado
//  por tener veintiocho caracteres de descripción, después de esperar a que
//  suban cuatro fotos, es un minuto perdido y un error que no se entiende. Los
//  límites son los mismos que los del servidor (CreateDamageClaimDto), y si
//  alguna vez no coinciden, el que manda es el servidor.
// ============================================================================

/** Las horas que el dueño tiene para revisar el auto. Igual que el servidor. */
export const HORAS_DE_REVISION = 48;

/**
 * SI HAY QUE OFRECERLE AL DUEÑO REVISAR EL AUTO.
 *
 * ── El agujero que esto tapa ──────────────────────────────────────────────
 * El botón se ofrecía en TODA reserva devuelta, para siempre. O sea que
 * después de decir "está todo bien" seguía ahí, apretable infinitas veces, y
 * cada vez decía que la garantía se liberaba cuando ya estaba liberada desde
 * la primera.
 *
 * Ahora se mira lo mismo que mira el servidor:
 *
 *  · `ownerInspectedAt` — el dueño ya revisó y cerró el tema. No se ofrece.
 *  · la ventana de 48 horas desde la devolución. Vencida, no hay nada que
 *    hacer ahí: el depósito se libera solo.
 *  · salvo que ya se haya cobrado algo de la garantía, y ahí SÍ se ofrece
 *    aunque el plazo haya pasado, porque adentro está el detalle de qué se
 *    cobró y por qué. Esconder eso sería dejar al dueño sin el comprobante de
 *    su propio reclamo.
 */
export function hayQueRevisar(booking, ahora = new Date()) {
  if (booking?.status !== "COMPLETED") return false;
  if (booking.depositCapturedAmount != null) return true;
  if (booking.ownerInspectedAt) return false;
  if (!booking.returnConfirmedAt) return false;

  const devuelto = new Date(booking.returnConfirmedAt);
  if (Number.isNaN(devuelto.getTime())) return false;
  const horas = (new Date(ahora).getTime() - devuelto.getTime()) / 3600000;
  return horas < HORAS_DE_REVISION;
}

/** Los mismos límites que el servidor. */
export const DESCRIPCION_MINIMA = 30;
export const DESCRIPCION_MAXIMA = 1000;
export const MAX_FOTOS = 6;

/**
 * CÓMO SE LEE LA VENTANA DE REVISIÓN.
 *
 * Devuelve la clave del cartel y las horas que quedan. Las horas se redondean
 * hacia arriba a propósito: decir "queda 1 hora" cuando quedan 70 minutos es
 * correcto, y decir "quedan 0 horas" cuando todavía se puede reclamar sería
 * mentir en el peor momento.
 */
export function comoSeLeeLaRevision(estado = {}) {
  const horas = Number(estado.horasQueQuedan);
  if (!Number.isFinite(horas)) return { clave: null, horas: 0 };

  if (estado.puedeReclamar) {
    return { clave: "reclamo.ventanaAbierta", horas: Math.max(1, Math.ceil(horas)) };
  }
  // Sin poder reclamar hay dos motivos, y no son lo mismo: o ya hay un reclamo
  // esperando resolución, o el plazo pasó.
  const hayAbierto = (estado.claims || []).some(c => c.status === "OPEN");
  if (hayAbierto) return { clave: "reclamo.yaReclamado", horas: 0 };
  return { clave: "reclamo.ventanaCerrada", horas: 0 };
}

/**
 * ¿Este reclamo se puede mandar?
 *
 * `monto` entra en PESOS, que es como lo escribe una persona, y sale en
 * centavos, que es como lo quiere el servidor. La conversión vive en un solo
 * lugar para que no haya dos redondeos sobre plata ajena.
 *
 * @param topeMinor  el depósito retenido: no se puede reclamar más que eso.
 */
export function revisarReclamo({ descripcion, monto, fotos, topeMinor } = {}) {
  const errores = {};

  const texto = String(descripcion ?? "").trim();
  if (!texto) errores.descripcion = "reclamo.error.textoVacio";
  else if (texto.length < DESCRIPCION_MINIMA) errores.descripcion = "reclamo.error.textoCorto";
  else if (texto.length > DESCRIPCION_MAXIMA) errores.descripcion = "reclamo.error.textoLargo";

  const numero = Number(String(monto ?? "").replace(",", "."));
  const montoMinor = Math.round(numero * 100);
  if (!String(monto ?? "").trim()) errores.monto = "reclamo.error.montoVacio";
  else if (!Number.isFinite(numero) || montoMinor <= 0) errores.monto = "reclamo.error.montoInvalido";
  else if (topeMinor != null && topeMinor > 0 && montoMinor > topeMinor) {
    errores.monto = "reclamo.error.montoSePasa";
  }

  /*
    SIN FOTOS NO SE RECLAMA, Y NO ES UN TRÁMITE.

    Un reclamo sin fotos es la palabra de uno contra la del otro, y acá hay
    plata de por medio: quien resuelve tiene que poder comparar el daño contra
    las fotos del retiro. Exigirla es lo que hace que el depósito se pueda
    cobrar sin que nadie tenga que confiar a ciegas.
  */
  const cantidad = Array.isArray(fotos) ? fotos.length : 0;
  if (cantidad === 0) errores.fotos = "reclamo.error.sinFotos";
  else if (cantidad > MAX_FOTOS) errores.fotos = "reclamo.error.muchasFotos";

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    descripcion: texto,
    montoMinor: Number.isFinite(montoMinor) ? montoMinor : 0,
  };
}

/**
 * QUÉ PASÓ DE VERDAD AL DECIR "ESTÁ TODO BIEN".
 *
 * El servidor contesta si soltó la retención o no, y no siempre la suelta: una
 * reserva devuelta antes de que existiera la ventana ya tenía el depósito
 * liberado, así que no hay nada que soltar. Decir "garantía liberada" ahí sería
 * anunciar una devolución de plata que no se movió, que es la peor mentira que
 * puede decir una pantalla de pagos.
 */
export function comoSalioLaRevision(respuesta = {}) {
  if (respuesta.liberado) return "reclamo.listoOk";
  if (respuesta.motivo === "sinRetencion") return "reclamo.listoSinRetencion";
  if (respuesta.motivo === "reclamoAbierto") return "reclamo.listoConReclamo";
  return "reclamo.listoSinCambios";
}

/** "Rayón en la puerta" + "$60 USD" para la lista del panel. */
export function comoSeLeeElReclamo(claim = {}) {
  return {
    monto: (claim.claimedAmountMinor ?? 0) / 100,
    cobrado: claim.capturedAmountMinor != null ? claim.capturedAmountMinor / 100 : null,
    estado: claim.status || "OPEN",
    fotos: Array.isArray(claim.evidenceUrls) ? claim.evidenceUrls : [],
  };
}
