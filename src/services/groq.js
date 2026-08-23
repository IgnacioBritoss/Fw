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
//  IA. Acá NUNCA hay una clave.
//
//  POR QUÉ SE SACÓ EL RESPALDO QUE LLAMABA A GROQ DIRECTO
//  Existía un camino que, si el backend contestaba que no tenía la clave, llamaba
//  a Groq desde el navegador usando VITE_GROQ_API_KEY. El problema es que todo lo
//  que empieza con VITE_ queda ESCRITO DENTRO del JavaScript que se descarga
//  cualquier visitante: bastaba con abrir el archivo del navegador para copiarse
//  la clave y gastar la cuota del proyecto, o dejarnos una factura. Y ni siquiera
//  hacía falta que alguien la buscara a propósito.
//
//  Un respaldo que solo funciona regalando la clave no es un respaldo. Si al
//  backend le falta GROQ_API_KEY, la revisión contesta "no se pudo revisar" —que
//  es un estado que las pantallas ya manejan y explican— y la solución es cargar
//  la clave en el backend, donde no la ve nadie.
//
//  ANTES DE MANDAR, SE ACHICA
//  Las fotos de un celular pesan varios MB, y en base64 crecen un 33% más. El
//  backend rechaza cualquier imagen de más de 3MB, así que una foto sin achicar
//  volvía como "no se pudo revisar" sin que la IA la llegara a mirar nunca. Por
//  eso toda imagen pasa por shrinkImage() antes de salir.
// ============================================================================
import { aiChat as apiAiChat, aiDocument as apiAiDocument, aiTranscribe as apiAiTranscribe, aiVision as apiAiVision } from "./api";

// Envía una conversación al modelo de texto y devuelve la respuesta como string.
// - messages: lista de mensajes con roles (system/user/assistant).
// - temperature: qué tan "creativa" es la respuesta (0 = precisa, 1 = variada).
export async function groqChat(messages, temperature = 0.7, opciones) {
  const data = await apiAiChat(messages, temperature, opciones);
  return data?.content ?? "";
}

/**
 * Saca el objeto JSON de una respuesta que puede venir con cosas alrededor.
 *
 * POR QUÉ NO ALCANZABA CON "DE LA PRIMERA LLAVE A LA ÚLTIMA". Los modelos nuevos
 * razonan antes de contestar y escriben ese razonamiento en la respuesta. Como
 * ahí adentro también aparecen llaves —el modelo se pone a hablar del JSON que
 * va a escribir—, el recorte se llevaba el razonamiento y el JSON pegados y no
 * parseaba nada. Eso es lo que se veía como "no se pudo obtener la sugerencia de
 * precio" y como la foto que quedaba "sin revisar".
 *
 * Ahora se tira el razonamiento primero y después se busca el PRIMER objeto
 * COMPLETO contando llaves, sin contar las que están dentro de un texto entre
 * comillas. El servidor hace exactamente lo mismo (lib/groq.js de freewheel-ia);
 * está en los dos lados porque los dos reciben texto de un modelo.
 */
export function extractJSON(text) {
  const limpio = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/```(?:json)?/gi, "");

  const probar = (t) => { try { return JSON.parse(t); } catch { return null; } };

  const directo = probar(limpio.trim());
  if (directo && typeof directo === "object") return directo;

  for (let ini = limpio.indexOf("{"); ini !== -1; ini = limpio.indexOf("{", ini + 1)) {
    let nivel = 0, enTexto = false, escapado = false;
    for (let i = ini; i < limpio.length; i++) {
      const c = limpio[i];
      if (escapado) { escapado = false; continue; }
      if (c === "\\") { escapado = true; continue; }
      if (c === '"') { enTexto = !enTexto; continue; }
      if (enTexto) continue;
      if (c === "{") nivel++;
      else if (c === "}" && --nivel === 0) {
        const encontrado = probar(limpio.slice(ini, i + 1));
        if (encontrado && typeof encontrado === "object") return encontrado;
        break;
      }
    }
  }
  throw new Error("AI response is not valid JSON");
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

// Las preguntas que se le hacen al modelo NO están acá: las escribe el backend
// (src/ai/ai.service.ts), que es el único que habla con Groq. Antes estaban
// duplicadas en este archivo para el respaldo que llamaba a Groq desde el
// navegador; ese respaldo se sacó —exponía la clave— y con él se fueron las
// copias, que además eran dos textos que podían separarse sin que nada lo avisara.

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

  // El backend no pudo. `isVehicle: null` es "no se pudo revisar", que la pantalla
  // muestra como tal y no como una foto aprobada: una foto que nadie miró no
  // puede pasar por buena.
  return {
    isVehicle: null,
    code: failure?.code || (notConfigured(failure) ? "not_configured" : "upstream_error"),
    reason: failure?.message || null,
    // El texto crudo del proveedor. Es lo único que dice qué pasó de verdad, y
    // sin él "no se pudo revisar" no le sirve a nadie para arreglar nada.
    detail: failure?.payload?.detail || failure?.detail || null,
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

  // El backend no pudo: `matches: null` es "no se pudo revisar". La pantalla lo
  // dice y pide que la persona lo confirme; no aprueba nada por su cuenta.
  return {
    matches: null,
    code: failure?.code || (failure?.status === 503 ? "not_configured" : "upstream_error"),
    reason: failure?.reason || failure?.message || "",
    reasonKey: (failure?.reason || failure?.message) ? undefined : "ai.cannotReview",
  };
}

// Transcribe una nota de voz. Recibe la URL del audio ya subido a Cloudinary y
// el backend se encarga de descargarlo y mandarlo al modelo.
export async function groqTranscribe(audioUrl) {
  if (typeof audioUrl !== "string" || !audioUrl) {
    throw new Error("audioUrl is required");
  }
  const data = await apiAiTranscribe(audioUrl);
  return (data?.text || "").trim();
}
