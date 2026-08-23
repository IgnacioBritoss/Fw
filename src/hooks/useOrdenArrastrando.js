// ============================================================================
//  useOrdenArrastrando — Reordenar una fila de cosas arrastrándolas
// ----------------------------------------------------------------------------
//  Lo usan las dos pantallas que muestran las fotos de un auto en fila: el
//  formulario de publicación y el modo edición de la publicación. Está acá y no
//  copiado en las dos porque el comportamiento tiene varios detalles finos, y
//  dos copias se van separando sin que nadie lo note hasta que una anda distinto.
//
//  CON EL DEDO Y CON EL MOUSE. Usa eventos de puntero y no el arrastre de HTML,
//  que solo anda con mouse: la mitad de las publicaciones se cargan desde el
//  teléfono, y ahí el arrastre de HTML directamente no existe.
//
//  SE ACOMODA MIENTRAS ARRASTRÁS, no al soltar: se ve el orden final antes de
//  decidir, en vez de soltar a ciegas y fijarse después.
//
//  Uso:
//    const orden = useOrdenArrastrando(mover, guardar);
//    ...
//    <div {...orden.props(i)} style={{ ...orden.estilo(i) }}>
//
//  `mover(desde, hasta)` se llama muchas veces durante el gesto; `guardar()`,
//  una sola vez al soltar, y solo si algo se movió de verdad. Están separados
//  porque uno acomoda la pantalla y el otro habla con el servidor: mandarle un
//  pedido por cada pixel del arrastre sería una tormenta de llamadas para
//  guardar, al final, un único orden.
// ============================================================================
import { useRef, useState } from "react";

/** Cuánto hay que mover antes de que cuente como arrastre y no como un toque. */
const UMBRAL_PX = 6;

export function useOrdenArrastrando(onMover, alSoltar) {
  const gesto = useRef(null);
  const [arrastrando, setArrastrando] = useState(null);
  // Queda marcado hasta el próximo toque: sirve para que el clic que el
  // navegador dispara al soltar no se tome como "eligió esta foto".
  const huboArrastre = useRef(false);

  const empezar = (e, i) => {
    // Los botones de encima (la X de borrar, el reintentar) no arrastran nada.
    if (e.target.closest?.("button")) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesto.current = { desde: i, x: e.clientX, y: e.clientY, movido: false };
    huboArrastre.current = false;
    setArrastrando(i);
  };

  const seguir = (e) => {
    const g = gesto.current;
    if (!g) return;
    // Sin el umbral, cualquier temblor de la mano al tocar una foto la movería
    // de lugar sin que nadie lo haya pedido.
    if (!g.movido && Math.hypot(e.clientX - g.x, e.clientY - g.y) < UMBRAL_PX) return;
    g.movido = true;
    huboArrastre.current = true;

    const debajo = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-orden]");
    if (!debajo) return;
    const hasta = Number(debajo.dataset.orden);
    if (Number.isNaN(hasta) || hasta === g.desde) return;
    onMover(g.desde, hasta);
    g.desde = hasta;
    setArrastrando(hasta);
  };

  const terminar = (e) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const movido = gesto.current?.movido === true;
    gesto.current = null;
    setArrastrando(null);
    // Solo si cambió algo: soltar en el mismo lugar no es un orden nuevo, y
    // guardarlo igual escribiría en el servidor por cada toque suelto.
    if (movido) alSoltar?.();
  };

  return {
    arrastrando,
    /** ¿El último gesto fue un arrastre y no un toque? */
    fueArrastre: () => huboArrastre.current,
    props: (i) => ({
      "data-orden": i,
      onPointerDown: (e) => empezar(e, i),
      onPointerMove: seguir,
      onPointerUp: terminar,
      onPointerCancel: terminar,
    }),
    /** El aspecto de la pieza que se está moviendo. */
    estilo: (i) => ({
      // Que el dedo arrastre la foto en vez de hacer scroll de la página.
      touchAction: "none",
      cursor: arrastrando === i ? "grabbing" : "grab",
      opacity: arrastrando === i ? 0.55 : 1,
      transform: arrastrando === i ? "scale(.94)" : "none",
      // La transición se apaga MIENTRAS se arrastra: con ella puesta, las piezas
      // que se corren para hacer lugar llegan tarde y el orden que se ve no es
      // el que va a quedar.
      transition: arrastrando === null ? "transform .18s, opacity .18s" : "none",
    }),
  };
}

/** Devuelve la lista con el elemento de `desde` movido a `hasta`. */
export function moverEnLista(lista, desde, hasta) {
  const copia = [...lista];
  const [movido] = copia.splice(desde, 1);
  copia.splice(hasta, 0, movido);
  return copia;
}

/**
 * En qué posición queda `indice` después de mover un elemento de `desde` a `hasta`.
 *
 * Hace falta para que la foto grande siga siendo LA MISMA foto mientras se
 * acomodan las miniaturas. Sin esto, el índice se queda quieto y la foto grande
 * cambia sola a mitad del arrastre: parece que reordenar también eligiera, y el
 * que arrastra pierde de vista qué está moviendo.
 */
export function indiceTrasMover(indice, desde, hasta) {
  if (indice === desde) return hasta;
  if (desde < indice && indice <= hasta) return indice - 1;
  if (hasta <= indice && indice < desde) return indice + 1;
  return indice;
}
