// ============================================================================
//  escaner.js — Leer el código de entrega con la cámara
// ----------------------------------------------------------------------------
//  Acá no se abre ninguna cámara: son las decisiones alrededor de hacerlo, que
//  es lo que se puede probar sin una. Qué es un código válido, qué hay adentro
//  de lo que se escaneó, con qué lector se lee en cada navegador y qué decirle
//  a alguien cuando la cámara no arranca.
//
//  ── POR QUÉ ESTO NO ES UNA COMODIDAD ──────────────────────────────────────
//  El código de entrega son CUARENTA Y OCHO caracteres hexadecimales. No es
//  "1234": es algo como
//
//      9f3c7a12bd48e05f6c2a19b7e4d30f8a5c61be27d94af083
//
//  Escribirlo a mano, parados al lado del auto, uno leyendo del teléfono del
//  otro, es imposible en la práctica: cualquier persona se equivoca en un
//  dígito y el servidor —con razón— contesta que el código no es válido, sin
//  poder decir en cuál de los cuarenta y ocho estuvo el error.
//
//  O sea que la pantalla tenía un campo de texto para un dato que nadie puede
//  tipear. La cámara no le agrega una opción al retiro del auto: es la única
//  forma de que el retiro del auto funcione.
// ============================================================================

/**
 * Cómo es un código de entrega.
 *
 * El servidor lo arma con 24 bytes al azar escritos en hexadecimal, así que son
 * 48 caracteres de 0 a f. El rango de largos que se acepta es más ancho a
 * propósito: si algún día el servidor genera tokens de otro tamaño, el escáner
 * tiene que seguir leyéndolos en vez de rechazarlos por una constante que
 * quedó vieja de este lado. Lo que NO se acepta es cualquier cosa: un código
 * de barras de una gaseosa no puede pasar por un código de entrega.
 */
const HEXADECIMAL = /^[0-9a-f]+$/i;
const LARGO_MINIMO = 16;
const LARGO_MAXIMO = 128;

/** Si un texto tiene forma de código de entrega. */
export function pareceToken(texto) {
  const t = String(texto ?? "").trim();
  return t.length >= LARGO_MINIMO && t.length <= LARGO_MAXIMO && HEXADECIMAL.test(t);
}

/**
 * Lo que se escribe a mano, acomodado.
 *
 * Alguien que copia y pega el código desde el chat se lleva espacios, saltos de
 * línea y a veces mayúsculas. Nada de eso hace que el código sea otro, así que
 * rechazarlo por eso sería inventar un error.
 */
export function normalizarCodigoEscrito(texto) {
  return String(texto ?? "").replace(/\s+/g, "").toLowerCase();
}

/**
 * El código que hay adentro de lo que se escaneó.
 *
 * El QR de esta aplicación lleva el código pelado, pero un escáner que solo
 * entienda eso se rompe el día que el QR lleve un enlace —que es lo que
 * conviene hacer para que apuntar la cámara desde afuera de la app también
 * funcione—. Así que se acepta:
 *
 *   · el código solo
 *   · una dirección con el código en `?token=` o `?code=`
 *   · una dirección que TERMINE en el código
 *
 * Devuelve null cuando lo leído no tiene ningún código adentro, que es el caso
 * de apuntar la cámara a cualquier otro QR del mundo: ahí no hay que mandar
 * nada al servidor, hay que seguir buscando.
 */
export function tokenDelCodigo(leido) {
  const texto = normalizarCodigoEscrito(leido);
  if (!texto) return null;
  if (pareceToken(texto)) return texto;

  if (/^https?:\/\//i.test(texto)) {
    let url;
    try { url = new URL(texto); } catch { return null; }
    for (const nombre of ["token", "code", "codigo"]) {
      const valor = url.searchParams.get(nombre);
      if (valor && pareceToken(valor)) return valor.toLowerCase();
    }
    const ultimo = url.pathname.split("/").filter(Boolean).pop();
    if (ultimo && pareceToken(ultimo)) return ultimo.toLowerCase();
  }
  return null;
}

/**
 * CON QUÉ SE LEE EL QR EN ESTE NAVEGADOR.
 *
 *   "nativo"    el navegador trae un lector de códigos adentro
 *               (BarcodeDetector). Chrome en Android y en Mac, y Edge.
 *   "libreria"  no lo trae, y se baja uno escrito en JavaScript.
 *
 * Los dos leen lo mismo. El nativo es el del sistema operativo, así que lee más
 * rápido y gasta menos batería; se prefiere cuando está.
 *
 * ── Por qué hace falta el segundo ─────────────────────────────────────────
 * Porque Safari no trae el primero, y en iPhone TODOS los navegadores son
 * Safari por dentro. Sin el lector de repuesto, la mitad de los teléfonos del
 * mundo abrirían la cámara y se quedarían mirando el QR sin leerlo nunca, que
 * es peor que no ofrecer la cámara. Se baja solo cuando hace falta y recién
 * cuando alguien aprieta "escanear": quien no usa el escáner no descarga nada.
 */
export function motorDeLectura(ventana = typeof window === "undefined" ? null : window) {
  if (!ventana) return "libreria";
  return typeof ventana.BarcodeDetector === "function" ? "nativo" : "libreria";
}

/**
 * Lo que se le pide a la cámara.
 *
 * `environment` es la de atrás, que es la que sirve: nadie escanea el teléfono
 * de otra persona con la cámara que se apunta a la cara. Va como preferencia y
 * no como exigencia (`ideal` y no `exact`) porque una notebook tiene una sola
 * cámara y exigir la de atrás haría que ahí no abra ninguna, cuando esa única
 * cámara anda perfecto.
 *
 * La resolución pedida no es por calidad de imagen: un QR leído de un cuadro de
 * 320 píxeles es un cuadrado borroso y no se decodifica nunca.
 */
export function restriccionesDeCamara() {
  return {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

/**
 * QUÉ SALIÓ MAL CON LA CÁMARA, EN CASTELLANO Y CON QUÉ HACER.
 *
 * El navegador contesta con un nombre de error y nada más: "NotAllowedError".
 * Mostrado tal cual no le dice nada a nadie, y encima los cuatro motivos por
 * los que una cámara no abre necesitan CUATRO respuestas distintas —uno se
 * arregla en la barra del navegador, otro cerrando otro programa, otro no se
 * arregla— así que un único "no se pudo abrir la cámara" deja a la persona sin
 * saber si insistir, cambiar algo o rendirse.
 *
 * Devuelve la clave del texto; el texto está en los diccionarios.
 */
export function motivoDelFallo(error, ventana = typeof window === "undefined" ? null : window) {
  /*
    ESTE CASO VA PRIMERO, Y NO ES UN DETALLE.

    Sin HTTPS, los navegadores no dejan ni preguntar por la cámara: directamente
    no existe `navigator.mediaDevices`, así que el intento falla con un
    TypeError que no se parece en nada a un problema de permisos. Explicado como
    "permiso denegado", alguien se pasaría media hora buscando un permiso que
    nunca le pidieron.
  */
  if (ventana && ventana.isSecureContext === false) return "qr.errInseguro";
  if (!ventana?.navigator?.mediaDevices?.getUserMedia) return "qr.errSinSoporte";

  switch (error?.name) {
    // Dijeron que no, o el navegador lo tiene bloqueado para este sitio.
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "qr.errPermiso";
    // No hay ninguna cámara conectada.
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "qr.errSinCamara";
    // La cámara existe pero la está usando otro programa.
    case "NotReadableError":
    case "TrackStartError":
      return "qr.errOcupada";
    // Ninguna cámara cumple lo que se pidió.
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "qr.errSinCamara";
    default:
      return "qr.errCamara";
  }
}

/**
 * Si un código recién leído hay que mandarlo, o es el mismo de hace un rato.
 *
 * La cámara lee el mismo QR muchas veces por segundo mientras sigue apuntando.
 * Sin esto, un escaneo se convertía en veinte pedidos al servidor: el primero
 * confirmaba la entrega y los diecinueve siguientes recibían "esta reserva ya
 * fue confirmada", así que la pantalla terminaba mostrando un error JUSTO
 * DESPUÉS de haber funcionado.
 */
export function esCodigoNuevo(codigo, ultimo) {
  return Boolean(codigo) && codigo !== ultimo;
}
