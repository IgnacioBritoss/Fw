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
//  Si el backend todavía no tiene configuradas las credenciales de Cloudinary
//  (responde 503), se usa el preset abierto como respaldo para no dejar la app
//  sin subida de fotos. Es un modo degradado: conviene configurar
//  CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.
// ============================================================================
import { getCloudinarySignature } from "./api";
import { tSync } from "../i18n/core";

// Respaldo para cuando el backend no tiene Cloudinary configurado.
const FALLBACK_CLOUD_NAME = "djvokvxt1";
const FALLBACK_UPLOAD_PRESET = "freewheel";

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

  let cloudName = FALLBACK_CLOUD_NAME;
  try {
    // Camino normal: subida FIRMADA por el backend.
    const signature = await fetchSignature(folder);
    cloudName = signature.cloudName;
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);
  } catch {
    // El backend no tiene Cloudinary configurado (o no hay sesión): se sube con
    // el preset abierto para no quedarse sin subida de archivos.
    cachedSignature = null;
    form.append("upload_preset", FALLBACK_UPLOAD_PRESET);
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
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
