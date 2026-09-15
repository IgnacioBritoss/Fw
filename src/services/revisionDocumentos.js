// ============================================================================
//  revisionDocumentos.js — Leer en qué quedó la revisión del DNI y la licencia
// ----------------------------------------------------------------------------
//  QUÉ CAMBIÓ. Antes, mandar las fotos las dejaba esperando a que un
//  administrador las mirara: el envío contestaba y ahí terminaba todo. Ahora el
//  servidor se las manda a un servicio que las LEE, cruza lo leído contra los
//  datos de la cuenta y puede aprobar solo. Eso tarda unos diez segundos, así
//  que el envío contesta enseguida y el resultado llega después.
//
//  O sea que apareció un estado que antes no existía: "todavía se está
//  revisando". Sin mostrarlo, la persona ve "enviado" y una pantalla que no
//  cambia más, y no tiene forma de saber si quedó aprobado, si falló algo o si
//  hay que esperar.
//
//  ── DOS COSAS QUE PARECEN UNA Y NO LO SON ─────────────────────────────────
//  `reasons` es QUÉ ESTÁ MAL CON EL DOCUMENTO: la fecha no coincide, la licencia
//  está vencida, el CUIL no corresponde. Es algo que la persona puede arreglar.
//
//  `analysis.error` es QUÉ NOS PASÓ A NOSOTROS: el servicio que lee los
//  documentos no contestó. La persona no tiene nada que arreglar ahí, y decirle
//  "revisá tu documento" cuando el problema es nuestro la manda a sacar fotos de
//  nuevo para nada.
//
//  Por eso este archivo las devuelve por separado y la pantalla las muestra
//  distinto.
//
//  ── LOS TEXTOS VIENEN HECHOS ──────────────────────────────────────────────
//  Cada motivo trae `code` (estable) y `message` (castellano, con los datos
//  adentro: "el documento dice 1998-03-07"). Los mensajes se muestran TAL CUAL.
//  Traducirlos acá daría una versión peor —sin la fecha, sin el dato que no
//  coincidía— de algo que ya viene listo.
//
//  Acá no hay ni pantallas ni pedidos: son decisiones puras, que se prueban sin
//  navegador y sin servidor (revisionDocumentos.test.js).
// ============================================================================

const lista = (x) => (Array.isArray(x) ? x : []);

/** Cada cuánto volver a preguntar mientras se está analizando. */
export const CADA_MS = 3000;

/**
 * Cuánto esperar como mucho antes de dejar de preguntar.
 *
 * La lectura ronda los diez segundos. Dos minutos es holgadísimo, y existe para
 * el caso en que el servicio se quede colgado sin contestar nunca: sin tope, la
 * pantalla se quedaría girando para siempre y consultando cada tres segundos.
 */
export const TOPE_MS = 120_000;

/** Los documentos, tal como los devuelve GET /verification/identity/me. */
export const documentos = (respuesta) => lista(respuesta);

/** ¿Hay algún documento todavía en análisis? Es lo que decide si seguir mirando. */
export const enAnalisis = (docs) =>
  documentos(docs).some((d) => d?.analysis?.pending === true);

/**
 * Los documentos a los que se les puede volver a pedir la lectura.
 *
 * `canRetry` lo decide el servidor: acá no se adivina cuándo tiene sentido
 * reintentar.
 */
export const reintentables = (docs) =>
  documentos(docs).filter((d) => d?.analysis?.canRetry === true && d?.type);

/**
 * ¿Ya se reintentó este documento?
 *
 * SE REINTENTA UNA SOLA VEZ, Y NO ES UNA CUESTIÓN DE PRUDENCIA: el servicio que
 * lee los documentos procesa de a uno, así que reintentar sin freno le saca el
 * turno a otra persona que está esperando. Si el segundo intento tampoco sale,
 * se muestra el motivo y el botón de pedir revisión manual, que es el camino que
 * corresponde.
 */
export const faltaReintentar = (docs, yaReintentados) =>
  reintentables(docs).filter((d) => !yaReintentados.includes(d.type));

/**
 * En qué quedó un documento, en una sola palabra, más lo que hay para mostrar.
 *
 *  · "analizando"  → todavía se está leyendo
 *  · "aprobado"    → cruzó todo y se aprobó solo
 *  · "motivos"     → algo no cerró, y hay motivos concretos que se pueden
 *                    corregir
 *  · "sinLectura"  → la lectura no se pudo hacer. NO es culpa del documento
 *  · "enRevision"  → está en la cola de un administrador
 *  · "rechazado"   → un administrador lo rechazó
 *  · "esperando"   → todavía no se mandó nada
 */
export function resultadoDe(documento) {
  if (!documento) return { clase: "esperando", motivos: [], error: null };

  const motivos = lista(documento.reasons);
  const error = documento.analysis?.error || null;

  if (documento.analysis?.pending === true) return { clase: "analizando", motivos: [], error: null };

  switch (documento.status) {
    case "APPROVED":
      return { clase: "aprobado", motivos: [], error: null };
    case "MANUAL_REVIEW":
      return { clase: "enRevision", motivos, error: null };
    case "REJECTED":
      return { clase: "rechazado", motivos, error: null };
    case "PENDING":
    case "FAILED":
      /*
        Con motivos, el problema es del documento y se puede corregir. Sin
        motivos, el problema fue nuestro —no se pudo leer— y lo cuenta
        `analysis.error`. El mismo `status` significa dos cosas distintas según
        venga o no acompañado, y mostrarlas igual sería mandar a sacar fotos de
        nuevo a alguien que no tiene nada que arreglar.
      */
      return motivos.length
        ? { clase: "motivos", motivos, error: null }
        : { clase: "sinLectura", motivos: [], error };
    default:
      return { clase: "esperando", motivos, error };
  }
}

/** ¿Está todo aprobado? Solo si hay documentos y ninguno quedó pendiente. */
export const todoAprobado = (docs) => {
  const lista_ = documentos(docs);
  return lista_.length > 0 && lista_.every((d) => d?.status === "APPROVED");
};

/**
 * Los mensajes para mostrar de TODOS los documentos, ya separados.
 *
 * `motivos` son cosas del documento; `errores` son cosas nuestras. La pantalla
 * los dibuja distinto porque piden acciones distintas.
 */
export function loQueHayQueDecir(docs) {
  const motivos = [];
  const errores = [];
  for (const documento of documentos(docs)) {
    const { clase, motivos: propios, error } = resultadoDe(documento);
    for (const motivo of propios) {
      if (motivo?.message) motivos.push({ ...motivo, documento: documento.type });
    }
    if (clase === "sinLectura" && error) errores.push({ documento: documento.type, mensaje: error });
  }
  return { motivos, errores };
}

/**
 * Los códigos de los motivos, sin repetir, para decidir QUÉ BOTÓN ofrecer.
 *
 * La pantalla elegía ese botón mirando `lastReview.reasonCodes`, que es el
 * resumen del último envío completo. Con la lectura automática ese resumen puede
 * venir vacío o quedar atrasado mientras cada documento YA trae sus propios
 * motivos, y entonces pasaba lo peor de los dos mundos: se leía en pantalla
 * exactamente qué estaba mal y no había ningún botón para arreglarlo.
 *
 * Los errores de lectura quedan afuera a propósito. No son un motivo y no tienen
 * botón: no hay nada que la persona pueda corregir, el reintento ya salió solo, y
 * ofrecerle "sacá las fotos de nuevo" sería hacerle perder el tiempo por algo que
 * se rompió de este lado.
 */
export function codigosDeMotivos(docs) {
  const vistos = [];
  for (const motivo of loQueHayQueDecir(docs).motivos) {
    if (motivo?.code && !vistos.includes(motivo.code)) vistos.push(motivo.code);
  }
  return vistos;
}
