// ============================================================================
//  useDraggableWindow — La ventana del asistente se puede mover por la pantalla
// ----------------------------------------------------------------------------
//  POR QUÉ: el botón flotante ya se podía arrastrar, pero la ventana abierta no.
//  Y es la ventana la que estorba: mide 360x500 y queda clavada abajo a la
//  derecha, justo encima de lo que uno estaba mirando. Preguntarle al asistente
//  algo SOBRE la pantalla y que la respuesta tape la pantalla es el peor momento
//  posible para no poder moverla. Mover el botón no alcanzaba, porque el botón y
//  la ventana son dos cosas distintas.
//
//  POR QUÉ NO ES EL MISMO HOOK QUE EL DEL BOTÓN: se parecen pero no son iguales.
//  El botón es un cuadrado, se pega al borde más cercano al soltarlo y tiene que
//  distinguir un toque de un arrastre, porque tocarlo abre el chat. La ventana es
//  un rectángulo, NO se pega a ningún lado —la idea es poder dejarla donde uno
//  quiera— y su asa no hace nada al tocarla. Meter las dos cosas en un hook con
//  banderas lo dejaba más difícil de leer que tenerlos separados.
//
//  DE DÓNDE SE AGARRA: de la barra del título, no de toda la ventana. Si se
//  arrastrara desde cualquier parte no se podría seleccionar el texto de una
//  respuesta, ni scrollear la conversación, ni escribir.
//
//  QUÉ SE CUIDA:
//   · nunca queda afuera de la pantalla, y sobre todo NUNCA por arriba del borde
//     de arriba: si la barra del título se sale, no hay de dónde agarrarla para
//     traerla de vuelta;
//   · se acuerda de dónde la dejaron (localStorage), como el botón;
//   · si la ventana del navegador cambia de tamaño, se vuelve a meter adentro;
//   · el botón de cerrar sigue funcionando: si el gesto arranca sobre un botón,
//     no se arrastra nada.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fw_chat_pos";
/** Aire mínimo contra los bordes. */
const MARGIN = 12;

/**
 * Deja la posición adentro de la ventana del navegador.
 *
 * El `Math.max(MARGIN, ...)` del tope importa: si la pantalla es más baja que la
 * ventana del chat, el máximo daría un número menor que el mínimo y la ventana
 * saltaría al borde de abajo, con el título afuera. Así, en ese caso, queda
 * pegada arriba, que es donde el título se sigue viendo.
 */
function clamp(pos, ancho, alto) {
  const maxX = Math.max(MARGIN, window.innerWidth - ancho - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - alto - MARGIN);
  return {
    x: Math.min(Math.max(pos.x, MARGIN), maxX),
    y: Math.min(Math.max(pos.y, MARGIN), maxY),
  };
}

/**
 * `ladoIzquierdo` es para el chat entre usuarios: ahí la esquina de siempre le
 * queda encima a la conversación, así que la ventana arranca a la izquierda. Es
 * solo el lugar POR DEFECTO: si la persona ya la movió, manda lo que eligió.
 */
export function useDraggableWindow({ ancho, alto, activo = true, ladoIzquierdo = false }) {
  const [pos, setPos] = useState(() => {
    try {
      const guardada = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (guardada && typeof guardada.x === "number" && typeof guardada.y === "number") {
        return clamp(guardada, ancho, alto);
      }
    } catch { /* nada guardado o ilegible: se usa el lugar por defecto */ }
    // El lugar de siempre, para que a quien nunca la mueva no le cambie nada.
    return clamp({
      x: ladoIzquierdo ? 28 : window.innerWidth - ancho - 28,
      y: window.innerHeight - alto - 92,
    }, ancho, alto);
  });

  const [arrastrando, setArrastrando] = useState(false);
  // En un ref y no en estado: cambia en cada movimiento del puntero y no tiene
  // que provocar un dibujado por sí mismo.
  const drag = useRef(null);

  useEffect(() => {
    if (!activo) return;
    const onResize = () => setPos((p) => clamp(p, ancho, alto));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [ancho, alto, activo]);

  const onPointerDown = useCallback((event) => {
    if (!activo) return;
    // Solo el botón principal del mouse; el derecho abre el menú del sistema.
    if (event.button !== undefined && event.button !== 0) return;
    // Si el gesto arranca sobre un botón —el de cerrar— es un clic, no un
    // arrastre. Sin esto la captura del puntero se come el clic y la X deja de
    // cerrar el chat.
    if (event.target?.closest?.("button")) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      origen: { ...pos },
      movido: false,
    };
    setArrastrando(true);
  }, [pos, activo]);

  const onPointerMove = useCallback((event) => {
    const d = drag.current;
    if (!d) return;
    d.movido = true;
    setPos(clamp({
      x: d.origen.x + (event.clientX - d.startX),
      y: d.origen.y + (event.clientY - d.startY),
    }, ancho, alto));
  }, [ancho, alto]);

  const onPointerUp = useCallback((event) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setArrastrando(false);
    // Se guarda solo si de verdad se movió: un clic en la barra del título no
    // tiene por qué escribir en el almacenamiento.
    if (!d.movido) return;
    setPos((p) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* sin espacio: no es grave */ }
      return p;
    });
  }, []);

  if (!activo) return { arrastrando: false, style: {}, asa: {} };

  return {
    arrastrando,
    style: {
      position: "fixed",
      left: pos.x,
      top: pos.y,
      right: "auto",
      bottom: "auto",
    },
    // Lo que va en la barra del título.
    asa: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      style: {
        // Sin esto, arrastrar con el dedo scrollea la página en vez de mover la
        // ventana.
        touchAction: "none",
        cursor: arrastrando ? "grabbing" : "grab",
        // Mientras se arrastra, el navegador intentaría seleccionar el texto del
        // título y quedaría todo resaltado en azul.
        userSelect: "none",
      },
    },
  };
}
