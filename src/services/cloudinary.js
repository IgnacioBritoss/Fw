// ============================================================================
//  cloudinary.js — Subida de archivos a la nube (Cloudinary)
// ----------------------------------------------------------------------------
//  Cloudinary almacena imágenes/archivos y devuelve una URL pública. Se usa para
//  las fotos de los autos, los documentos de verificación y los audios/adjuntos
//  del chat: en la base guardamos solo el link.
//
//  IMPORTANTE — dónde corre esto:
//  Antes el navegador subía con un "upload_preset" abierto y el nombre de la
//  cuenta escrito en este archivo. Eso significa que cualquiera que abriera el
//  código podía subir lo que quisiera a la cuenta de Cloudinary del proyecto.
//
//  Ahora la parte sensible está en el BACKEND: se le pide una FIRMA
//  (POST /media/cloudinary-signature, que es el único que conoce el api_secret) y
//  con esa firma —válida por un rato— el navegador sube el archivo. El secreto
//  nunca sale del servidor. El archivo sigue yendo directo del navegador a
//  Cloudinary para no hacerlo pasar por el backend, que tiene un límite chico de
//  tamaño de pedido.
//
//  POR QUÉ SE SACÓ EL RESPALDO CON EL PRESET ABIERTO
//  Quedaba, para cuando el backend no tenía credenciales, un camino que subía con
//  un "upload_preset" abierto y el nombre de la cuenta escritos acá mismo. Eso es
//  justamente lo que se había venido a arreglar: los dos valores viajan dentro del
//  JavaScript que se descarga cualquier visitante, así que cualquiera podía subir
//  lo que quisiera a la cuenta de Cloudinary del proyecto —cualquier archivo,
//  cualquier tamaño, sin sesión— y nosotros pagarlo y responder por él.
//
//  Si el backend no tiene Cloudinary configurado, ahora la subida FALLA con un
//  mensaje que dice qué falta cargar. Es peor de usar y mejor así: el arreglo es
//  poner CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en el
//  backend, no dejar una puerta abierta a nombre de la cuenta.
// ============================================================================
import { getCloudinarySignature, getIdentityUploadSignature } from "./api";
import { tSync } from "../i18n/core";

// La firma sirve para varias subidas seguidas (mismo folder y timestamp), así
// que se reutiliza un rato en vez de pedir una por foto.
const SIGNATURE_TTL_MS = 45 * 1000;
let cachedSignature = null;

async function fetchSignature(folder) {
  const now = Date.now();
  if (cachedSignature && cachedSignature.folder === folder && now - cachedSignature.at < SIGNATURE_TTL_MS) {
    return cachedSignature.data;
  }
  const data = await getCloudinarySignature(folder);
  cachedSignature = { folder, at: now, data };
  return data;
}

/**
 * Sube un archivo a Cloudinary. `resourceType` es el tipo que espera Cloudinary:
 * "image" para fotos, "auto" para audio y "raw" para documentos.
 * Devuelve la respuesta completa de Cloudinary.
 */
async function upload(file, { resourceType = "image", folder = "freewheel", fileName } = {}) {
  const form = new FormData();
  if (fileName) form.append("file", file, fileName);
  else form.append("file", file);

  let signature;
  try {
    signature = await fetchSignature(folder);
  } catch (err) {
    // Sin firma no se sube. Un 503 es "el backend no tiene Cloudinary
    // configurado", y eso se arregla cargando las variables en el servidor.
    cachedSignature = null;
    if (err?.status === 503) throw new Error(tSync("net.uploadNotConfigured"));
    throw err;
  }

  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* respuesta no JSON */ }
    throw new Error(detail || tSync("net.uploadFailed"));
  }
  return res.json();
}

// Sube una imagen (base64/dataURL o File) y devuelve su URL pública segura.
export async function uploadImageToCloudinary(imageOrDataUrl) {
  const data = await upload(imageOrDataUrl, { resourceType: "image" });
  return data.secure_url;
}

/**
 * Sube UNA foto de identidad (DNI o licencia, frente o dorso).
 *
 * ── POR QUÉ NO ALCANZA uploadImageToCloudinary ──────────────────────────────
 * El backend dejó de aceptar cualquier URL de Cloudinary al enviar los
 * documentos: ahora comprueba que el archivo esté en `identity/<tu-id>/` y que su
 * nombre empiece con el slot correspondiente (`dni_front_`, `license_back_`...).
 * Con eso es imposible mandar el dorso donde va el frente, ni colar un archivo de
 * otra cuenta por otro campo. Subiendo con la firma genérica —carpeta
 * `freewheel`— el envío falla con DOCUMENT_SLOT_MISMATCH y nadie puede verificar
 * su identidad.
 *
 * Así que acá se pide una firma PARA ESE SLOT y se sube con exactamente los
 * parámetros que el servidor firmó. No se puede cambiar ni uno: la firma se
 * calcula sobre ellos y Cloudinary la rechaza si no coinciden.
 *
 * El asset queda `type=authenticated`, o sea PRIVADO: la URL guardada no se abre
 * sin firmar, ni siquiera sabiéndola. Quien la necesita —un administrador
 * revisando— la pide firmada y con vencimiento.
 *
 * NO HAY CAMINO ALTERNATIVO, Y ES A PROPÓSITO. Antes, si el pedido de la firma
 * fallaba con 404, esta función subía la foto con la firma genérica de la app
 * —carpeta `freewheel`, asset PÚBLICO— "para no trabar el trámite". Eso hacía dos
 * cosas malas a la vez: dejaba el DNI y la licencia de una persona en una carpeta
 * que se abre sin credenciales, y el envío fallaba igual un paso después con
 * INVALID_DOCUMENT_URL, porque el backend exige que el archivo esté en
 * `identity/<tu-id>/`. O sea: se filtraba el documento y encima no servía.
 *
 * Si la firma no se puede pedir, la subida FALLA con el motivo a la vista. Es la
 * única respuesta correcta: sin firma no hay lugar donde guardar estas fotos que
 * no sea uno que no debería existir.
 */
export async function uploadIdentityDocument(file, { document, side }) {
  const firma = await getIdentityUploadSignature({ document, side });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", firma.apiKey);
  form.append("timestamp", String(firma.timestamp));
  form.append("signature", firma.signature);
  form.append("public_id", firma.publicId);
  form.append("type", firma.type);
  // La carpeta va SOLO si el servidor la mandó, porque la firma se calcula sobre
  // los parámetros exactos: mandar uno que no firmó, o dejar de mandar uno que sí
  // firmó, hace que Cloudinary rechace la subida. Hoy la firma incluye la
  // carpeta; si el backend deja de incluirla —el public_id ya lleva la ruta
  // entera— esto sigue funcionando sin tocar nada acá.
  if (firma.folder) form.append("folder", firma.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* respuesta no JSON */ }
    // Los tres errores que Cloudinary devuelve de verdad, dichos en términos de
    // lo que la persona puede hacer. El texto crudo ("Invalid Signature") no le
    // dice nada a nadie que no esté leyendo este archivo.
    if (res.status === 401) throw new Error(tSync("kyc.errUploadSignature"));
    if (res.status === 400 && /file size|too large/i.test(detail)) {
      throw new Error(tSync("kyc.errTooBig"));
    }
    if (res.status === 420 || res.status === 429) throw new Error(tSync("kyc.errTooMany"));
    throw new Error(detail || tSync("net.uploadFailed"));
  }
  const data = await res.json();

  // El archivo tiene que haber quedado EXACTAMENTE donde el servidor dijo. Si
  // Cloudinary lo guardó en otra ruta, el envío iba a fallar más adelante con un
  // 400 que no explica nada; acá se corta con el detalle a la vista, que es lo
  // que hace falta para arreglarlo.
  if (data.public_id && firma.publicId && data.public_id !== firma.publicId) {
    throw new Error(
      `${tSync("kyc.errUploadPath")} (${data.public_id} != ${firma.publicId})`,
    );
  }
  return data.secure_url;
}

// Sube un audio (Blob grabado con el micrófono) y devuelve su URL pública.
export async function uploadAudioToCloudinary(audioBlob) {
  const data = await upload(audioBlob, { resourceType: "auto", fileName: "audio.webm" });
  return data.secure_url;
}

// Sube cualquier archivo elegido por el usuario (imagen o documento).
// Detecta si es imagen para usar el endpoint correcto y devuelve
// { url, isImage, name }.
export async function uploadFileToCloudinary(file) {
  const isImage = file.type.startsWith("image/");
  const data = await upload(file, {
    resourceType: isImage ? "image" : "raw",
    fileName: file.name,
  });
  return { url: data.secure_url, isImage, name: file.name };
}
