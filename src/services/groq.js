import { BASE_URL } from "./api";

// La API key de Groq vive SOLO en el backend. Acá pegamos al proxy /ai/*.
export async function groqChat(messages, temperature = 0.7) {
  const res = await fetch(`${BASE_URL}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }

  const data = await res.json();
  return data.content;
}

export function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo parsear la respuesta de IA");
  return JSON.parse(match[0]);
}

async function resizeImage(dataUrl, maxPx = 512) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.65));
    };
    img.src = dataUrl;
  });
}

export async function groqVision(imageDataUrl) {
  try {
    const resized = await resizeImage(imageDataUrl);
    const res = await fetch(`${BASE_URL}/ai/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: resized }),
    });
    if (!res.ok) {
      console.error("Vision proxy error:", res.status);
      return null;
    }
    const data = await res.json();
    return data.isVehicle ?? null;
  } catch (err) {
    console.error("Vision exception:", err);
    return null;
  }
}
