// ============================================================================
//  useGrabadora — Grabar una nota de voz con el micrófono
// ----------------------------------------------------------------------------
//  Lo necesita el asistente: preguntarle a Wili hablando en vez de escribiendo.
//  El chat entre usuarios ya grababa audio, pero para otra cosa —ahí el audio
//  ES el mensaje y se manda como tal—, así que esto no le saca el grabador:
//  aquel manda el archivo y este lo pasa a texto y lo tira. Unificarlos es una
//  tarea aparte y no se hace en la misma tanda que agrega una pantalla nueva.
//
//  ── QUÉ SE PRUEBA Y QUÉ NO ────────────────────────────────────────────────
//  El micrófono no se puede probar sin un navegador de verdad, así que no se
//  prueba. Lo que sí está probado son las tres decisiones que se toman
//  alrededor y que se pueden equivocar calladas: cómo se escribe el reloj, si
//  una grabación sirve, y dónde cae el texto transcripto. Es la misma división
//  que en useOrdenArrastrando: las cuentas se prueban, el gesto no.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Menos que esto no es una pregunta, es un dedo que tocó el botón sin querer.
 *
 * Importa más de lo que parece: sin este corte, cada toque al micrófono sube un
 * archivo a Cloudinary y gasta una transcripción para devolver una cadena
 * vacía. La persona no ve nada y la cuenta igual se consume.
 */
const MINIMO_UTIL_MS = 700;

/** Un blob más chico que esto no tiene audio adentro, solo la cabecera. */
const MINIMO_UTIL_BYTES = 1200;

/**
 * El reloj de la grabación: 0:07, 1:05.
 *
 * Se escribe a mano y no con toLocaleTimeString porque acá no es una hora del
 * día: es una duración, y en varios idiomas la hora sale con formato de 12
 * horas y un "AM" pegado atrás.
 */
export function segundosComoReloj(segundos) {
  const enteros = Math.max(0, Math.floor(Number(segundos) || 0));
  const minutos = Math.floor(enteros / 60);
  const resto = enteros % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}

/**
 * Si vale la pena subir y transcribir esta grabación.
 *
 * Se miran las dos cosas —cuánto duró y cuánto pesa— porque ninguna alcanza
 * sola. El reloj puede marcar un segundo con el micrófono mudo (permiso dado
 * pero entrada en silencio, o el micrófono del sistema apagado), y un blob
 * puede pesar por la cabecera del contenedor sin un solo cuadro de audio.
 */
export function esAudioUtil(blob, duracionMs) {
  if (!blob || typeof blob.size !== "number") return false;
  if (blob.size < MINIMO_UTIL_BYTES) return false;
  return Number(duracionMs) >= MINIMO_UTIL_MS;
}

/**
 * Dónde cae lo que se transcribió.
 *
 * NO PISA LO QUE YA ESTABA ESCRITO. Es la diferencia entre agregarle voz a una
 * pregunta a medio escribir y borrarle a alguien lo que venía tecleando. Si la
 * caja estaba vacía es lo mismo; si no, se suma al final con un espacio.
 *
 * Y si la transcripción vino vacía —pasa con un audio ruidoso o en silencio—
 * se devuelve lo que ya había, tal cual: una caja que se vacía sola después de
 * hablar parece que la aplicación se rompió.
 */
export function textoParaLaCaja(previo, transcripto) {
  const antes = String(previo ?? "").trim();
  const nuevo = String(transcripto ?? "").trim();
  if (!nuevo) return String(previo ?? "");
  if (!antes) return nuevo;
  return `${antes} ${nuevo}`;
}

/**
 * El grabador.
 *
 * Devuelve `{ soportado, grabando, segundos, error, empezar, detener, cancelar }`.
 *
 * `detener()` devuelve una promesa con el blob —o con null si la grabación no
 * sirve—, para poder escribir el flujo de corrido (grabar, subir, transcribir)
 * en vez de repartirlo entre callbacks. `cancelar()` corta sin devolver nada.
 *
 * ── EL MICRÓFONO SE SUELTA SIEMPRE ────────────────────────────────────────
 * En todos los caminos: al detener, al cancelar y al desmontarse el componente.
 * Sin eso el navegador deja prendida la lucecita de "esta página te está
 * escuchando" después de cerrar el asistente, que además de ser mentira es
 * exactamente lo que hace que alguien desconfíe de un sitio.
 */
export default function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState(null);

  const grabadorRef = useRef(null);
  const pedazosRef = useRef([]);
  const relojRef = useRef(null);
  const desdeRef = useRef(0);

  const soportado =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";

  /** Corta el reloj y suelta el micrófono. No toca el estado de React. */
  const soltar = useCallback(() => {
    clearInterval(relojRef.current);
    relojRef.current = null;
    const grabador = grabadorRef.current;
    if (grabador?.stream) grabador.stream.getTracks().forEach((pista) => pista.stop());
    grabadorRef.current = null;
  }, []);

  useEffect(() => () => soltar(), [soltar]);

  const empezar = useCallback(async () => {
    if (grabadorRef.current) return false;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const grabador = new MediaRecorder(stream);
      pedazosRef.current = [];
      grabador.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) pedazosRef.current.push(e.data);
      };
      grabadorRef.current = grabador;
      desdeRef.current = Date.now();
      grabador.start();
      setGrabando(true);
      setSegundos(0);
      relojRef.current = setInterval(
        () => setSegundos(Math.floor((Date.now() - desdeRef.current) / 1000)),
        250,
      );
      return true;
    } catch {
      // Un permiso denegado y un micrófono que no existe llegan igual acá, y
      // para quien lo está usando son el mismo problema: no se pudo grabar.
      setError("permiso");
      soltar();
      setGrabando(false);
      return false;
    }
  }, [soltar]);

  const detener = useCallback(() => {
    const grabador = grabadorRef.current;
    if (!grabador || grabador.state === "inactive") return Promise.resolve(null);
    const duracion = Date.now() - desdeRef.current;
    return new Promise((resolver) => {
      grabador.onstop = () => {
        const blob = new Blob(pedazosRef.current, { type: "audio/webm" });
        pedazosRef.current = [];
        soltar();
        setGrabando(false);
        setSegundos(0);
        if (!esAudioUtil(blob, duracion)) {
          setError("corto");
          resolver(null);
          return;
        }
        resolver(blob);
      };
      grabador.stop();
    });
  }, [soltar]);

  const cancelar = useCallback(() => {
    const grabador = grabadorRef.current;
    if (grabador && grabador.state !== "inactive") {
      grabador.onstop = null;
      grabador.stop();
    }
    pedazosRef.current = [];
    soltar();
    setGrabando(false);
    setSegundos(0);
    setError(null);
  }, [soltar]);

  return { soportado, grabando, segundos, error, setError, empezar, detener, cancelar };
}
