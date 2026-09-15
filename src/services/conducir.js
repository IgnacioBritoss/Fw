// ============================================================================
//  conducir.js — Estar verificado no es lo mismo que poder manejar
// ----------------------------------------------------------------------------
//  ESTAR VERIFICADO dice "sos quien decís ser". Se resuelve una vez y no se
//  desarma solo.
//
//  PODER CONDUCIR dice "hoy podés manejar", y cambia SIN QUE NADIE TOQUE NADA:
//  una licencia vence un martes a la mañana y esa cuenta, perfectamente
//  verificada, deja de poder alquilar. Son dos cosas distintas, con dos carteles
//  distintos y dos caminos distintos para arreglarlas, y confundirlas manda a la
//  persona a completar una verificación que ya tiene hecha.
//
//  El servidor lo manda resuelto en `driving`, adentro de GET /users/me y de
//  GET /verification/me/status:
//
//      driving: {
//        canRent: false,
//        reasons: [{ code: "LICENCIA_VENCIDA", message: "Tu licencia..." }],
//        licenseExpiresAt: "2026-03-03T12:00:00.000Z",
//        expiresSoon: false,
//      }
//
//  ── LA REGLA QUE ORDENA TODO ESTE ARCHIVO ─────────────────────────────────
//  SIN DATO NO SE BLOQUEA. Un backend que todavía no manda `driving`, o una
//  fecha en null porque esa cuenta se verificó antes de que existiera la lectura
//  automática, significan "no se sabe", NO "no puede". Bloquear por un dato que
//  falta dejaría afuera a gente que está perfectamente habilitada, y encima sin
//  nada que pueda hacer para destrabarlo.
//
//  ── LOS TEXTOS NO SE ESCRIBEN ACÁ ─────────────────────────────────────────
//  Cada motivo viene con `code` (estable, para ramificar) y `message` (en
//  castellano, listo para mostrar, con la fecha adentro). Reescribirlos acá daría
//  dos versiones del mismo mensaje que se van separando, y la de acá no sabe la
//  fecha. Se muestran tal cual vienen.
// ============================================================================

const lista = (x) => (Array.isArray(x) ? x : []);

/**
 * El bloque `driving`, venga de donde venga.
 *
 * El servidor lo manda en los dos lados —GET /users/me y
 * GET /verification/me/status— y la sesión guarda los dos. Se mira primero el de
 * la cuenta, que es el que se relee al abrir la app; el otro es el respaldo para
 * cuando la pantalla tiene el estado de verificación más fresco que la cuenta.
 */
const deConducir = (user) => user?.driving ?? user?.verification?.driving ?? null;

/**
 * ¿Esta persona puede alquilar hoy?
 *
 * Solo un `canRent: false` explícito dice que no. Ver la regla de arriba.
 */
export const puedeConducir = (user) => deConducir(user)?.canRent !== false;

/** Por qué no puede, tal como lo explica el servidor. */
export const motivosParaConducir = (user) => lista(deConducir(user)?.reasons);

/**
 * ¿La licencia vence dentro de poco?
 *
 * Solo cuenta mientras TODAVÍA puede alquilar: una vez vencida el aviso suave
 * sobra, porque ya está el cartel que bloquea.
 */
export const licenciaVencePronto = (user) =>
  deConducir(user)?.expiresSoon === true && puedeConducir(user);

/** Cuándo vence la licencia, si el servidor lo sabe. */
export const venceLaLicencia = (user) => deConducir(user)?.licenseExpiresAt || user?.licenseExpiresAt || null;

/**
 * ¿Este error es "no podés manejar" y no "no estás verificado"?
 *
 * Los dos son 403 y los dos se resuelven distinto: uno subiendo una licencia
 * vigente, el otro completando la verificación. Mirar solo el número de la
 * respuesta —que es lo que hacían las pantallas— los mezcla, y entonces a quien
 * tiene la licencia vencida se le ofrece verificar una cuenta que ya está
 * verificada.
 */
export const esBloqueoDeConducir = (err) =>
  (err?.code || err?.payload?.code) === "DRIVING_NOT_ALLOWED";

/** ¿Y este otro es "la cuenta no está verificada"? */
export const esCuentaSinVerificar = (err) =>
  (err?.code || err?.payload?.code) === "ACCOUNT_NOT_VERIFIED";

/**
 * Los motivos de un rechazo del servidor.
 *
 * Si el 403 no trajo la lista —un backend viejo, o un error armado a mano—, el
 * mensaje suelto sirve igual: es preferible mostrar una frase a mostrar un
 * cartel vacío.
 */
export function motivosDelRechazo(err) {
  const motivos = lista(err?.reasons ?? err?.payload?.reasons);
  if (motivos.length) return motivos;
  const suelto = err?.payload?.message || err?.message;
  return suelto ? [{ code: err?.code || err?.payload?.code || null, message: suelto }] : [];
}

/**
 * Qué aviso corresponde mostrar, si es que corresponde alguno.
 *
 * Devuelve `null` cuando no hay nada que decir, que es el caso normal: una
 * cuenta que puede alquilar y con la licencia lejos de vencer no tiene por qué
 * ver ningún cartel.
 *
 *  · `tono: "bloqueo"` → no puede alquilar. Cartel firme y botón de reservar
 *    apagado.
 *  · `tono: "pronto"`  → puede, pero la licencia vence dentro de treinta días.
 *    Cartel suave, para que no se quede afuera de golpe en medio de una reserva.
 */
export function avisoDeConducir(user) {
  if (!user) return null;
  if (!puedeConducir(user)) {
    return { tono: "bloqueo", mensajes: motivosParaConducir(user), vence: venceLaLicencia(user) };
  }
  if (licenciaVencePronto(user)) {
    return { tono: "pronto", mensajes: [], vence: venceLaLicencia(user) };
  }
  return null;
}

/** El mismo aviso, pero armado con lo que vino en un 403 del servidor. */
export function avisoDelRechazo(err) {
  if (!esBloqueoDeConducir(err)) return null;
  return {
    tono: "bloqueo",
    mensajes: motivosDelRechazo(err),
    vence: err?.licenseExpiresAt || err?.payload?.licenseExpiresAt || null,
  };
}

/**
 * Los vencimientos que el servidor leyó del documento, para mostrarlos juntos.
 *
 * Solo los que EXISTEN. Un `null` acá no es un error ni una advertencia: es una
 * cuenta que se verificó antes de que el servidor supiera leer estas fechas, y
 * dibujar un renglón vacío o —peor— un "vencido" sería inventar un problema.
 */
export const CAMPOS_DE_DOCUMENTOS = [
  { campo: "licenseExpiresAt", clave: "docs.licenseExpires", fecha: true },
  { campo: "licenseClass", clave: "docs.licenseClass", fecha: false },
  { campo: "licenseIssuedAt", clave: "docs.licenseIssued", fecha: true },
  { campo: "licenseBeginnerUntil", clave: "docs.beginnerUntil", fecha: true },
  { campo: "dniExpiresAt", clave: "docs.dniExpires", fecha: true },
];

export function datosDeDocumentos(user) {
  return CAMPOS_DE_DOCUMENTOS
    .map((x) => ({ ...x, valor: user?.[x.campo] ?? null }))
    .filter((x) => x.valor !== null && x.valor !== "");
}
