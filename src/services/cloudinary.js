import { getCloudinarySignature } from "./api";

// Subida FIRMADA: el backend genera la firma con su API secret (que nunca
// sale del servidor). Ya no se usa el upload_preset unsigned.
async function uploadSigned(file, { resourceType = "image", filename } = {}) {
  const { cloudName, apiKey, timestamp, signature, folder } =
    await getCloudinarySignature();

  const formData = new FormData();
  if (filename) formData.append("file", file, filename);
  else formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error subiendo archivo a Cloudinary");
  return res.json();
}

export async function uploadImageToCloudinary(base64DataUrl) {
  const data = await uploadSigned(base64DataUrl, { resourceType: "image" });
  return data.secure_url;
}

export async function uploadAudioToCloudinary(audioBlob) {
  const data = await uploadSigned(audioBlob, {
    resourceType: "auto",
    filename: "audio.webm",
  });
  return data.secure_url;
}

export async function uploadFileToCloudinary(file) {
  const isImage = file.type.startsWith("image/");
  const data = await uploadSigned(file, {
    resourceType: isImage ? "image" : "raw",
  });
  return { url: data.secure_url, isImage, name: file.name };
}
