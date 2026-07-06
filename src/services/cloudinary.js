// ============================================================================
//  cloudinary.js — Subida de archivos a la nube (Cloudinary)
// ----------------------------------------------------------------------------
//  Cloudinary es un servicio externo que almacena imágenes/archivos y nos
//  devuelve una URL pública. Lo usamos para las fotos de los autos, los
//  audios del chat y los archivos adjuntos. En vez de guardar los archivos en
//  nuestro backend, los subimos acá y guardamos solo el link.
//
//  "upload_preset" es una configuración pública en Cloudinary que permite
//  subir sin exponer credenciales secretas desde el navegador.
// ============================================================================

const CLOUD_NAME = "djvokvxt1";
const UPLOAD_PRESET = "freewheel";

// Sube una imagen (en formato base64/dataURL) y devuelve su URL pública segura.
export async function uploadImageToCloudinary(base64DataUrl) {
  const formData = new FormData();
  formData.append("file", base64DataUrl);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error subiendo imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

// Sube un audio (Blob grabado con el micrófono) y devuelve su URL pública.
export async function uploadAudioToCloudinary(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error subiendo audio a Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

// Sube cualquier archivo genérico (imagen o documento) elegido por el usuario.
// Detecta si es imagen para usar el endpoint correcto y devuelve { url, isImage, name }.
export async function uploadFileToCloudinary(file) {
  const isImage = file.type.startsWith("image/");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const endpoint = isImage ? "image/upload" : "raw/upload";
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error subiendo archivo a Cloudinary");
  const data = await res.json();
  return { url: data.secure_url, isImage, name: file.name };
}