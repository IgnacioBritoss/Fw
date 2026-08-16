// ============================================================================
//  useDraggableFab — El botón flotante se puede mover por la pantalla
// ----------------------------------------------------------------------------
//  POR QUÉ: el botón del asistente vive fijo en una esquina, y ahí tapa cosas. En
//  una publicación se le pone encima del botón de reservar; en el panel de
//  administración, arriba de los botones de aprobar. Se lo bajó y se lo hizo más
//  chico, pero siempre va a estorbar en ALGUNA pantalla, porque el lugar que
//  molesta depende de lo que uno esté mirando. La solución es la misma que usa
//  Mercado Pago: que la persona lo agarre y lo ponga donde no le moleste.
//
//  CÓMO:
//   · se arrastra tocando y sosteniendo, con el dedo o con el mouse (Pointer
//     Events, que cubre los dos con el mismo código);
//   · un toque corto sigue siendo un toque: si el dedo se movió menos de 6px, no
//     fue un arrastre y se abre el chat. Sin este umbral, mover el mouse dos
//     píxeles al hacer clic ya contaría como arrastre y el botón no abriría nunca;
//   · al soltar se pega al lado más cercano, como las burbujas de chat, así no
//     queda flotando en el medio tapando el contenido;
//   · se acuerda de dónde quedó (localStorage), porque tener que reubicarlo en
//     cada pantalla sería peor que dejarlo fijo;
//   · si la ventana cambia de tamaño o se gira el teléfono, se vuelve a meter
//     adentro: una posición guardada con la ventana ancha puede caer afuera.
//
//  Devuelve lo que hay que poner en el botón: `style` con la posición, los
//  manejadores de puntero, y `dragging` para poder sacarle la animación mientras
//  se mueve.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fw_fab_pos";
/** Cuánto tiene que moverse para que cuente como arrastre y no como toque. */
const DRAG_THRESHOLD = 6;
/** Aire mínimo contra los bordes. */
const MARGIN = 12;

/** Deja la posición adentro de la ventana, con su margen. */
function clamp(pos, size) {
  const maxX = Math.max(MARGIN, window.innerWidth - size - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size - MARGIN);
  return {
    x: Math.min(Math.max(pos.x, MARGIN), maxX),
    y: Math.min(Math.max(pos.y, MARGIN), maxY),
  };
}

/** Se pega al borde izquierdo o al derecho, al que esté más cerca. */
function snapToSide(pos, size) {
  const centro = pos.x + size / 2;
  const derecha = window.innerWidth - size - MARGIN;
  return { x: centro < window.innerWidth / 2 ? MARGIN : derecha, y: pos.y };
}

/**
 * Dónde se estaciona el botón cuando la pantalla pide que se corra: abajo a la
 * izquierda, por encima de la barra de escribir.
 */
export function aparcadoIzquierda(size) {
  return { x: MARGIN, y: window.innerHeight - size - 96 };
}

/**
 * `fijo` es una posición impuesta por la pantalla. Cuando llega, el botón se
 * dibuja ahí y deja de arrastrarse: es lo que hace falta en el chat entre
 * usuarios, donde la esquina de siempre le queda encima a la conversación.
 * Al salir de esa pantalla vuelve solo a donde estaba, porque la posición
 * arrastrable nunca se pisó.
 */
export function useDraggableFab({ size = 50, onTap, fijo = null }) {
  // Posición inicial: la guardada, o abajo a la derecha como estaba antes.
  const [pos, setPos] = useState(() => {
    const porDefecto = {
      x: window.innerWidth - size - 20,
      y: window.innerHeight - size - 80,
    };
    try {
      const guardada = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (guardada && typeof guardada.x === "number" && typeof guardada.y === "number") {
        return clamp(guardada, size);
      }
    } catch { /* nada guardado o ilegible: se usa el lugar por defecto */ }
    return clamp(porDefecto, size);
  });

  const [dragging, setDragging] = useState(false);
  // En un ref y no en estado: cambia en cada movimiento del puntero y no tiene
  // que provocar un dibujado por sí mismo.
  const drag = useRef(null);

  // Si cambia el tamaño de la ventana (o se gira el teléfono), la posición
  // guardada puede quedar afuera de la pantalla.
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p, size));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [size]);

  const onPointerDown = useCallback((event) => {
    // Solo el botón principal del mouse; el derecho abre el menú del sistema.
    if (event.button !== undefined && event.button !== 0) return;
    if (fijo) return;   // estacionado por la pantalla: no se arrastra
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      origen: { ...pos },
      movido: false,
    };
  }, [pos, fijo]);

  const onPointerMove = useCallback((event) => {
    const d = drag.current;
    if (!d) return;

    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;

    if (!d.movido && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.movido) {
      d.movido = true;
      setDragging(true);
    }

    setPos(clamp({ x: d.origen.x + dx, y: d.origen.y + dy }, size));
  }, [size]);

  const onPointerUp = useCallback((event) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    // No se movió: fue un toque, se abre el chat.
    if (!d.movido) {
      onTap?.();
      return;
    }

    setDragging(false);
    setPos((p) => {
      const final = snapToSide(clamp(p, size), size);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(final)); } catch { /* sin espacio: no es grave */ }
      return final;
    });
  }, [size, onTap]);

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
    style: {
      position: "fixed",
      left: (fijo ?? pos).x,
      top: (fijo ?? pos).y,
      right: "auto",
      bottom: "auto",
      // Sin esto, arrastrar con el dedo scrollea la página en vez de mover el botón.
      touchAction: "none",
      cursor: fijo ? "pointer" : dragging ? "grabbing" : "grab",
    },
  };
}
