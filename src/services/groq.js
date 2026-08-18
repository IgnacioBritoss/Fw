// ============================================================================
//  groq.js — Funciones de INTELIGENCIA ARTIFICIAL
// ----------------------------------------------------------------------------
//  Se usa la IA para cuatro cosas:
//    1) aiChat          → el chatbot de ayuda y autocompletar las specs del auto.
//    2) groqVision      → verificar que una foto sea realmente de un vehículo.
//    3) checkDocument   → verificar que una foto sea el DNI/licencia pedido.
//    4) groqTranscribe  → pasar a texto las notas de voz del chat.
//
//  DÓNDE CORRE ESTO
//  Los pedidos van al BACKEND (/ai/*), que es el único que conoce la clave de la
//  IA. Antes se llamaba a Groq directo desde el navegador con la clave en
//  VITE_GROQ_API_KEY, y todo lo que empieza con VITE_ queda escrito dentro del
//  JavaScript que se descarga cualquier visitante: la clave estaba a la vista.
//
//  RESPALDO
//  Si el backend contesta que la IA no está configurada (le falta GROQ_API_KEY en
//  sus variables de entorno), y el front todavía tiene VITE_GROQ_API_KEY cargada,
//  se llama a Groq directo desde el navegador. Es el mismo criterio que ya usa
//  cloudinary.js: preferir que la función ande a que quede muerta esperando que
//  alguien toque un panel. En cuanto la clave esté en el backend, este respaldo
//  deja de usarse solo.
//
//  ANTES DE MANDAR, SE ACHICA
//  Las fotos de un celular pesan varios MB, y en base64 crecen un 33% más. El
//  backend rechaza cualquier imagen de más de 3MB, así que una foto sin achicar
//  volvía como "no se pudo revisar" sin que la IA la llegara a mirar nunca. Por
//  eso toda imagen pasa por shrinkImage() antes de salir.
// ============================================================================
import { aiChat as apiAiChat, aiDocument as apiAiDocument, aiTranscribe as apiAiTranscribe, aiVision as apiAiVision } from "./api";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DIRECT_KEY = import.meta.env.VITE_GROQ_API_KEY;

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
<<<<<<< HEAD
  if (!match) throw new Error("No se pudo parsear la respuesta de IA");
=======
  if (!match) throw new Error("AI response is not valid JSON");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  return JSON.parse(match[0]);
}

/**
 * Achica una imagen antes de mandarla a la IA. `maxPx` es el lado más largo.
 *
 * Para "¿es un auto?" alcanza con 512px. Para un documento hace falta bastante
 * más resolución, porque el modelo tiene que poder LEER el número y el nombre:
 * con 512px el texto queda ilegible y la revisión falla aunque la foto esté bien.
 */
export async function shrinkImage(dataUrl, maxPx = 512, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl); // si no se pudo achicar, va como está
    img.src = dataUrl;
  });
}

/** ¿El backend avisó que la IA no está configurada de su lado? */
function notConfigured(errorOrResult) {
  return errorOrResult?.status === 503 || errorOrResult?.code === "not_configured";
}

/**
 * Llamada directa a Groq desde el navegador. Solo se usa como respaldo (ver la
 * nota de arriba) y solo si VITE_GROQ_API_KEY sigue cargada en el front.
 * Devuelve el texto de la respuesta, o null si no se pudo.
 */
async function askVisionDirect(imageDataUrl, prompt, maxTokens) {
  if (!DIRECT_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DIRECT_KEY}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: prompt },
          ],
        }],
        temperature: 0,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// Texto de las preguntas. Están repetidos del backend a propósito: son los que
// usa el respaldo del navegador, que tiene que preguntar exactamente lo mismo
// para que el resultado sea comparable.
// Tiene que ser exactamente el mismo que usa el backend (ai.service.ts): si las
// dos preguntas fueran distintas, una foto podría pasar por un camino y no por el
// otro sin que nada lo explique.
//
// La pregunta anterior era "¿esta imagen muestra un automóvil, camioneta, SUV,
// moto u otro vehículo de motor? SI o NO", y con eso un auto de JUGUETE contesta
// SI: es, literalmente, la imagen de un automóvil. También pasaban los dibujos,
// las maquetas y las capturas de videojuegos. El control existía y no filtraba lo
// único que hay que filtrar, que la foto sea del auto real que se publica.
const VEHICLE_PROMPT =
  "Mirá la imagen. Tiene que ser la foto de un vehículo REAL, de tamaño real, " +
  "de los que una persona puede conducir y alquilar (auto, camioneta, SUV, " +
  "pickup, van o moto).\n\n" +
  "RECHAZALA si es cualquiera de estas cosas, aunque tenga forma de auto:\n" +
  "- un juguete, un auto a escala, una maqueta o un auto a batería para chicos\n" +
  "- un dibujo, una ilustración, un render 3D o una captura de un videojuego\n" +
  "- la foto de un afiche, una pantalla, un catálogo o una publicidad\n" +
  "- un vehículo que no se alquila así (tren, avión, barco, bicicleta, monopatín)\n" +
  "- cualquier otra cosa (una persona, un animal, un paisaje, comida, una captura de pantalla)\n\n" +
  "Pistas para darte cuenta de que NO es real: proporciones de juguete, " +
  "plástico brillante, ruedas lisas sin dibujo, asiento de plástico, " +
  "tamaño chico comparado con lo que está alrededor, fondo de estudio blanco " +
  "tipo foto de producto, o que no tenga patente ni espejos ni picaportes reales.\n\n" +
  "Respondé SOLO un JSON válido, sin texto alrededor, con esta forma exacta:\n" +
  '{"es_vehiculo": true|false, "es_real": true|false, ' +
  '"que_es": "en 2 o 3 palabras qué se ve", ' +
  '"motivo": "una frase corta explicando la decisión"}';

const DOCUMENT_EXPECTED = {
  DNI_FRONT: "el FRENTE de un documento nacional de identidad (DNI), con la foto de la persona, su nombre y el número de documento",
  DNI_BACK: "el DORSO de un documento nacional de identidad (DNI), con datos como domicilio, fecha de emisión o código de barras",
  LICENSE_FRONT: "el FRENTE de una licencia de conducir, con la foto de la persona, su nombre y el número de licencia",
  LICENSE_BACK: "el DORSO de una licencia de conducir, con las categorías habilitadas y/o la fecha de vencimiento",
};

const documentPrompt = (kind) =>
  `Analizá la imagen. Se espera ${DOCUMENT_EXPECTED[kind]}.\n` +
  "Respondé SOLO un JSON válido, sin texto alrededor, con esta forma exacta:\n" +
  '{"corresponde": true|false, "legible": true|false, "tipo_detectado": "texto corto", ' +
  '"numero": "solo dígitos o null", "nombre": "nombre completo o null", ' +
  '"vencimiento": "YYYY-MM-DD o null", "motivo": "una frase explicando la decisión"}\n' +
  "Si la imagen no es un documento de identidad (por ejemplo un paisaje, una mascota, " +
  'una captura de pantalla o una persona sin documento), "corresponde" debe ser false.';

/**
 * Verifica con IA si una foto muestra un vehículo REAL (no un juguete, ni un
 * dibujo, ni una maqueta). Se usa al publicar un auto.
 *
 * Devuelve { isVehicle, reason, detected, code }:
 *   · isVehicle true  → es la foto de un vehículo real
 *   · isVehicle false → no sirve, y `reason` dice por qué (para mostrarlo)
 *   · isVehicle null  → NO SE PUDO VERIFICAR, y `code` dice el motivo. Ojo: null
 *     no es "está bien". Que se tratara como si estuviera bien es exactamente lo
 *     que dejó publicar una foto de un perro como foto de un auto.
 *
 * Antes devolvía un booleano pelado, así que la pantalla no tenía con qué
 * explicar el rechazo ni distinguir "no es un auto" de "no se pudo revisar".
 *
 * 768px en vez de 512: para ver si un auto es de juguete hacen falta los
 * detalles chicos (el dibujo de las ruedas, los picaportes, el plástico), y a
 * 512 se pierden.
 */
export async function groqVision(imageDataUrl) {
  const small = await shrinkImage(imageDataUrl, 768, 0.72);

  let failure = null;
  try {
    const data = await apiAiVision(small);
    if (data?.isVehicle === true || data?.isVehicle === false) return data;
    failure = data;
  } catch (err) {
    failure = err;
  }

  // El backend no pudo. Si es porque no tiene la clave, se intenta desde acá.
  if (notConfigured(failure)) {
    const content = await askVisionDirect(small, VEHICLE_PROMPT, 220);
    if (content) {
      try {
        const parsed = extractJSON(content);
        const esVehiculo = parsed.es_vehiculo === true;
        const esReal = parsed.es_real !== false;
        return {
          isVehicle: esVehiculo && esReal,
          reason: parsed.motivo || null,
          detected: parsed.que_es || null,
        };
      } catch {
        // El modelo contestó SI/NO en vez del JSON pedido.
        const texto = content.trim().toUpperCase();
        if (texto.startsWith("SI")) return { isVehicle: true };
        if (texto.startsWith("NO")) {
<<<<<<< HEAD
          return { isVehicle: false, reason: "La imagen no muestra un vehículo." };
=======
          return { isVehicle: false, reasonKey: "ai.notAVehicle" };
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        }
      }
    }
  }

  return {
    isVehicle: null,
    code: failure?.code || (notConfigured(failure) ? "not_configured" : "upstream_error"),
    reason: failure?.message || null,
  };
}

/**
 * Revisa si una foto es realmente el documento pedido, ANTES de subirla.
 * `kind` es DNI_FRONT, DNI_BACK, LICENSE_FRONT o LICENSE_BACK.
 *
 * Devuelve { matches, reason, code }:
 *   · matches true  → es el documento correcto
 *   · matches false → no corresponde (reason explica por qué)
 *   · matches null  → no se pudo revisar (code dice el motivo)
 */
export async function checkDocument(imageDataUrl, kind) {
  // 1024px y calidad 0.8: suficiente para que se lea el número del documento y
  // muy por debajo del límite de peso del backend.
  const small = await shrinkImage(imageDataUrl, 1024, 0.8);

  let failure = null;
  try {
    const data = await apiAiDocument(small, kind);
    if (data?.matches === true || data?.matches === false) return data;
    failure = data;
  } catch (err) {
    failure = err;
  }

  // El backend no pudo. Si es porque no tiene la clave, se intenta desde acá.
  if (notConfigured(failure)) {
    const content = await askVisionDirect(small, documentPrompt(kind), 400);
    if (content) {
      try {
        const parsed = extractJSON(content);
        const matches = parsed.corresponde === true && parsed.legible !== false;
        return {
          matches,
<<<<<<< HEAD
          reason: parsed.motivo || (matches
            ? "El documento coincide con lo esperado."
            : "La imagen no corresponde al documento pedido."),
=======
          // Sin motivo del modelo se usa una clave, que la pantalla traduce.
          reasonKey: parsed.motivo ? undefined : (matches ? "ai.docOk" : "ai.docBad"),
          reason: parsed.motivo || "",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        };
      } catch { /* respuesta ilegible: cae al retorno de abajo */ }
    }
  }

  return {
    matches: null,
    code: failure?.code || (failure?.status === 503 ? "not_configured" : "upstream_error"),
<<<<<<< HEAD
    reason: failure?.reason || failure?.message || "No se pudo revisar la foto.",
=======
    reason: failure?.reason || failure?.message || "",
    reasonKey: (failure?.reason || failure?.message) ? undefined : "ai.cannotReview",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  };
}

// Transcribe una nota de voz. Recibe la URL del audio ya subido a Cloudinary y
// el backend se encarga de descargarlo y mandarlo al modelo.
export async function groqTranscribe(audioUrl) {
  if (typeof audioUrl !== "string" || !audioUrl) {
<<<<<<< HEAD
    throw new Error("Se necesita la URL del audio para transcribir");
=======
    throw new Error("audioUrl is required");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  }
  const data = await apiAiTranscribe(audioUrl);
  return (data?.text || "").trim();
}
