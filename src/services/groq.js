// ============================================================================
//  groq.js — Funciones de INTELIGENCIA ARTIFICIAL (a través del backend)
// ----------------------------------------------------------------------------
//  Se usa la IA para tres cosas:
//    1) aiChat       → el chatbot de ayuda y autocompletar las specs del auto.
//    2) aiVision     → verificar que una foto sea realmente de un vehículo.
//    3) aiTranscribe → pasar a texto las notas de voz del chat.
//
//  IMPORTANTE — dónde corre esto:
//  Antes este archivo llamaba a la API de Groq DIRECTO desde el navegador, con
//  la clave en VITE_GROQ_API_KEY. Todo lo que empieza con VITE_ queda escrito
//  dentro del JavaScript que se descarga cualquier visitante: la clave quedaba a
//  la vista y cualquiera podía usarla (y gastarla).
//
//  Ahora los pedidos van al BACKEND (/ai/chat, /ai/vision, /ai/transcribe), que
//  es el único que conoce la GROQ_API_KEY. El navegador nunca ve la clave.
//  Las funciones siguen llamándose y devolviendo lo mismo, así que las pantallas
//  no tuvieron que cambiar.
// ============================================================================
import { aiChat as apiAiChat, aiTranscribe as apiAiTranscribe, aiVision as apiAiVision } from "./api";

// Envía una conversación al modelo de texto y devuelve la respuesta como string.
// - messages: lista de mensajes con roles (system/user/assistant).
// - temperature: qué tan "creativa" es la respuesta (0 = precisa, 1 = variada).
export async function groqChat(messages, temperature = 0.7) {
  const data = await apiAiChat(messages, temperature);
  return data?.content ?? "";
}

// La IA a veces devuelve texto extra alrededor del JSON pedido. Esta función
// recorta desde la primera "{" hasta la última "}" y lo convierte en objeto.
export function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo parsear la respuesta de IA");
  return JSON.parse(match[0]);
}

// Achica una imagen antes de mandarla a la IA (máx. 512px de lado y calidad 65%).
// Se sigue haciendo en el navegador a propósito: así viaja menos peso al servidor
// y la verificación es más rápida y barata.
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
    img.onerror = () => resolve(dataUrl); // si no se pudo achicar, va como está
    img.src = dataUrl;
  });
}

// Verifica con IA si una foto muestra un vehículo. Se usa al publicar un auto
// para evitar que suban fotos que no correspondan.
// Devuelve: true (es vehículo), false (no lo es) o null (no se pudo verificar).
export async function groqVision(imageDataUrl) {
  try {
    const resized = await resizeImage(imageDataUrl);
    const data = await apiAiVision(resized);
    return data?.isVehicle ?? null;
  } catch {
    // Si la IA no está disponible no se bloquea la publicación: se devuelve
    // null y la pantalla trata la foto como "no verificada".
    return null;
  }
}

// Transcribe una nota de voz. Recibe la URL del audio ya subido a Cloudinary y
// el backend se encarga de descargarlo y mandarlo al modelo.
export async function groqTranscribe(audioUrl) {
  if (typeof audioUrl !== "string" || !audioUrl) {
    throw new Error("Se necesita la URL del audio para transcribir");
  }
  const data = await apiAiTranscribe(audioUrl);
  return (data?.text || "").trim();
}
