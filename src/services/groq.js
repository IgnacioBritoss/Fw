// ============================================================================
//  groq.js — Integración con INTELIGENCIA ARTIFICIAL (API de Groq)
// ----------------------------------------------------------------------------
//  Groq es un proveedor que corre modelos de lenguaje (LLM) tipo ChatGPT muy
//  rápido. Lo usamos para dos cosas:
//    1) groqChat  → el chatbot de ayuda y autocompletar specs del auto (texto).
//    2) groqVision → verificar que una foto realmente sea de un vehículo (imagen).
//
//  La API key viaja en una variable de entorno (VITE_GROQ_API_KEY) para no
//  dejarla escrita en el código.
// ============================================================================

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"; // audio → texto
const MODEL = "llama-3.3-70b-versatile";           // modelo de texto
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // modelo que "ve" imágenes
const TRANSCRIBE_MODEL = "whisper-large-v3-turbo"; // modelo que "escucha" audios (Whisper)

// Envía una conversación al modelo de texto y devuelve la respuesta como string.
// - messages: lista de mensajes con roles (system/user/assistant).
// - temperature: qué tan "creativa" es la respuesta (0 = precisa, 1 = variada).
export async function groqChat(messages, temperature = 0.7) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY no configurada");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// La IA a veces devuelve texto extra alrededor del JSON pedido. Esta función
// recorta desde la primera "{" hasta la última "}" y lo convierte en objeto.
export function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo parsear la respuesta de IA");
  return JSON.parse(match[0]);
}

// Achica una imagen antes de mandarla a la IA (máx. 512px de lado y calidad 65%).
// Sirve para que el pedido pese menos y sea más rápido/barato. Usa un <canvas>
// para redibujar la imagen más chica y la devuelve como dataURL JPEG.
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

// Verifica con IA si una foto muestra un vehículo. Se usa al publicar un auto
// para evitar que suban fotos que no correspondan.
// Devuelve: true (es vehículo), false (no lo es) o null (no se pudo verificar).
export async function groqVision(imageDataUrl) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const resized = await resizeImage(imageDataUrl);
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: resized } },
            { type: "text", text: "¿Esta imagen muestra un automóvil, camioneta, SUV, moto u otro vehículo de motor? Respondé únicamente SI o NO." },
          ],
        }],
        temperature: 0,
        max_tokens: 5,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("Groq vision error:", res.status, errBody);
      return null;
    }
    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content || "").trim().toUpperCase();
    return answer.startsWith("SI") ? true : answer.startsWith("NO") ? false : null;
  } catch (err) {
    console.error("Groq vision exception:", err);
    return null;
  }
}

// Transcribe un audio a texto usando el modelo Whisper de Groq. Se usa en el
// chat para el botón "Transcribir mensaje" debajo de las notas de voz.
// - audioUrlOrBlob: la URL del audio (en Cloudinary) o directamente un Blob.
// Devuelve el texto transcripto. Si algo falla, lanza una excepción para que
// el componente muestre el estado de error.
export async function groqTranscribe(audioUrlOrBlob) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY no configurada");

  // Si nos pasan una URL, primero descargamos el audio como Blob.
  let blob = audioUrlOrBlob;
  if (typeof audioUrlOrBlob === "string") {
    const r = await fetch(audioUrlOrBlob);
    if (!r.ok) throw new Error("No se pudo descargar el audio");
    blob = await r.blob();
  }

  // Armamos el pedido multipart con el archivo y el modelo. Le indicamos que el
  // idioma es español para mejorar la precisión. (No fijamos Content-Type: el
  // navegador lo pone solo con el "boundary" correcto para FormData.)
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  form.append("model", TRANSCRIBE_MODEL);
  form.append("language", "es");
  form.append("response_format", "json");

  const res = await fetch(TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error ${res.status}`);
  }
  const data = await res.json();
  return (data.text || "").trim();
}