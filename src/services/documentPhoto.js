// ============================================================================
//  documentPhoto.js — Dejar una foto de documento en condiciones de ser leída
// ----------------------------------------------------------------------------
//  La revisión de identidad no "mira" el DNI como lo miraría una persona: tiene
//  que DECODIFICAR el código PDF417 del frente, el MRZ del dorso y el QR de la
//  licencia, y además leer texto chico impreso. Eso pone dos condiciones sobre el
//  archivo que sale del celular, y las dos se incumplían solas:
//
//  1) EL FORMATO. El backend acepta jpg, jpeg, png y webp, y nada más. Un iPhone
//     saca las fotos en HEIC, así que la foto de un iPhone —el caso más común de
//     todos— llegaba al envío y volvía como 400 INVALID_DOCUMENT_URL, sin que la
//     pantalla pudiera explicar por qué. Acá se reencoda todo a JPEG, con lo cual
//     el formato deja de depender del teléfono de cada uno.
//
//  2) EL TAMAÑO. Una foto de 4032px pesa varios MB y no aporta nada por encima de
//     los ~2400px del lado largo; pero por debajo de ~1280px el PDF417 deja de
//     poder decodificarse y la solicitud queda "pendiente" con
//     NO_AUTHORITATIVE_SOURCE, que es el motivo inconcluso más frecuente. Así que
//     se achica lo que sobra y se AVISA —no se agranda— lo que falta: estirar una
//     foto chica no inventa los píxeles que el lector necesita, solo esconde el
//     problema hasta que la revisión lo encuentra.
//
//  Lo que NO se hace, a propósito: filtros, blanco y negro, recortes y marcas de
//  agua. Todo eso pisa el patrón del código de barras y lo vuelve ilegible.
// ============================================================================
import { tSync } from "../i18n/core";

// Lado más largo de la foto que se sube. El backend pide entre 1600 y 2400: se
// toma el techo porque el costo de un archivo más grande lo paga una sola vez la
// subida, y el de una foto ilegible lo paga la persona reintentando.
const LADO_SUBIDA = 2400;

// Por debajo de esto el código de barras no se decodifica de forma confiable. No
// bloquea el envío —una foto justa igual puede salir aprobada, y trabarla sería
// peor— pero se avisa antes de gastar el intento.
const LADO_MINIMO = 1280;

// La vista previa cumple dos papeles: se dibuja en pantalla y es la que va a la
// revisión previa de la IA, que internamente la achica a 1024. Con 1400 alcanza
// para las dos cosas y evita tener en memoria el base64 de la foto grande.
const LADO_PREVIA = 1400;

const CALIDAD_SUBIDA = 0.9;   // dentro del 0.85–0.92 que pide el backend
const CALIDAD_PREVIA = 0.82;

// Tope de peso del archivo que se sube. Si el JPEG sale más pesado se reencoda
// con menos calidad antes de rendirse.
const PESO_MAXIMO = 8 * 1024 * 1024;
const CALIDADES_DE_RESCATE = [0.8, 0.7, 0.6];

/**
 * Decodifica el archivo a algo que se pueda dibujar en un canvas.
 *
 * Se intenta primero con createImageBitmap porque es el único camino que decodifica
 * HEIC en los navegadores que lo soportan, y porque `imageOrientation` aplica la
 * rotación de la cámara: sin eso, una foto sacada en horizontal se sube acostada y
 * el lector de códigos no la reconoce.
 *
 * El respaldo con <img> cubre a los navegadores sin createImageBitmap. Si los dos
 * fallan, el formato no se puede leer acá (HEIC en Chrome de escritorio es el caso
 * típico) y hay que decirlo, no subir el archivo igual para que lo rechace el
 * servidor tres pantallas después.
 */
async function decodificar(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Algunos navegadores no aceptan las opciones: se reintenta sin ellas.
      try {
        return await createImageBitmap(file);
      } catch { /* sigue por el respaldo de abajo */ }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(tSync("kyc.errPhotoFormat")));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Dibuja la imagen escalada al lado más largo pedido. Nunca la agranda. */
function dibujar(imagen, ladoMaximo) {
  const ancho = imagen.width;
  const alto = imagen.height;
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(ancho * escala));
  canvas.height = Math.max(1, Math.round(alto * escala));

  const ctx = canvas.getContext("2d");
  // Un documento es texto y líneas finas: el suavizado de calidad alta conserva
  // los bordes del código de barras mucho mejor que el interpolado por defecto.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** canvas.toBlob prometificado (la API nativa solo tiene callback). */
function aBlob(canvas, calidad) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(tSync("kyc.errPhotoFormat")))),
      "image/jpeg",
      calidad,
    );
  });
}

/**
 * Prepara UNA foto de documento para el flujo de verificación.
 *
 * Devuelve:
 *   blob        el JPEG que se sube a Cloudinary
 *   preview     dataURL liviana, para dibujar en pantalla y para la revisión
 *               previa de la IA (que la vuelve a achicar de su lado)
 *   lado        el lado más largo del ORIGINAL, en píxeles
 *   avisoClave  clave de traducción con una advertencia, o null si está todo bien.
 *               Es una advertencia y no un error: la foto se puede enviar igual.
 *
 * Lanza si el archivo no es una imagen o si el navegador no puede decodificarla.
 */
export async function prepararFotoDocumento(file) {
  if (!file || !file.type?.startsWith("image/")) {
    throw new Error(tSync("kyc.errNotAnImage"));
  }

  const imagen = await decodificar(file);
  const ladoOriginal = Math.max(imagen.width, imagen.height);

  const canvasSubida = dibujar(imagen, LADO_SUBIDA);
  let blob = await aBlob(canvasSubida, CALIDAD_SUBIDA);

  // Reencodar con menos calidad es preferible a achicar más: bajar los píxeles
  // es justo lo que vuelve ilegible el código de barras, y el peso baja igual.
  for (const calidad of CALIDADES_DE_RESCATE) {
    if (blob.size <= PESO_MAXIMO) break;
    blob = await aBlob(canvasSubida, calidad);
  }

  const preview = dibujar(imagen, LADO_PREVIA).toDataURL("image/jpeg", CALIDAD_PREVIA);

  // El bitmap ocupa memoria hasta que se lo cierra, y son cuatro fotos grandes.
  imagen.close?.();

  return {
    blob,
    preview,
    lado: ladoOriginal,
    avisoClave:
      ladoOriginal < LADO_MINIMO ? "kyc.warnLowRes"
        : blob.size > PESO_MAXIMO ? "kyc.warnTooHeavy"
          : null,
  };
}
