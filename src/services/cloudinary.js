const CLOUD_NAME = "djvokvxt1";
const UPLOAD_PRESET = "freewheel";

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