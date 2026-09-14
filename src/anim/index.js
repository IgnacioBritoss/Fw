// ============================================================================
//  anim — LA PUERTA DE ENTRADA DEL MOVIMIENTO
// ----------------------------------------------------------------------------
//  Las pantallas importan de acá y no de los archivos de adentro. Son tres
//  piezas y cada una resuelve una cosa distinta:
//
//   · scrollcraft.js → lo que se mueve SOLO, con el scroll y con el mouse. No se
//     llama a nada: se escriben marcas `data-sc-*` en el HTML que ya existe.
//   · feedback.js    → lo que se mueve cuando PASA algo: un pago, un error.
//     Esas sí se llaman, y acá están envueltas en ganchos de React para que se
//     disparen con el cambio de estado en vez de a mano dentro de un efecto.
//   · motion.css     → los estados que el motor enciende y apaga.
//
//  CÓMO SE AGREGA MOVIMIENTO A UNA PANTALLA NUEVA
//
//   1. Algo que aparece al scrollear  → `data-sc-in` en el elemento, y
//      `data-sc-stagger="55"` en su contenedor si son varios hermanos.
//   2. Una foto grande con profundidad → `data-sc-depth="-0.08"`.
//   3. Una tarjeta que reacciona al mouse → `data-sc-tilt="6"`.
//   4. Una confirmación               → `useCelebracion`.
//   5. Un error                       → `useSacudida`.
//
//  No hace falta importar nada para los tres primeros: el motor ya está
//  andando y engancha lo que aparezca.
// ============================================================================
import { useEffect, useRef } from "react";
import { montarScrollCraft } from "./scrollcraft";
import { celebrar, sacudir, latir, aparecer, desplegar } from "./feedback";

export { celebrar, sacudir, latir, aparecer, desplegar };
export { SALIDA } from "./scrollcraft";

/**
 * Enciende el motor de scroll para toda la app. Va UNA sola vez, en el Layout.
 *
 * Se monta sobre `document.body` y no sobre el contenedor de la pantalla porque
 * hay cosas que viven afuera: los modales y el aviso de abajo se dibujan con
 * `createPortal` directamente en el body, y desde el contenedor de la página el
 * motor no los vería.
 */
export function useScrollCraft() {
  useEffect(() => {
    const motor = montarScrollCraft(document.body);
    return () => motor.apagar();
  }, []);
}

/**
 * LA CELEBRACIÓN, atada a un estado.
 *
 * Se usa así:
 *
 *   const { icono, detalle } = useCelebracion(pagado, { tono: "verde" });
 *   ...
 *   <div ref={icono} style={s.successIcon}><svg>…el tilde…</svg></div>
 *   <div ref={detalle}>
 *     <h2>Pago confirmado</h2>
 *     <p>…</p>
 *   </div>
 *
 * `icono` es el círculo que gira y del que sale el anillo. `detalle` es
 * opcional: sus hijos directos suben escalonados detrás del tilde. Si no se usa,
 * la celebración es solo el ícono.
 *
 * Dispara cuando `activo` pasa a verdadero, no en cada dibujado.
 */
export function useCelebracion(activo, { tono = "ok" } = {}) {
  const icono = useRef(null);
  const detalle = useRef(null);

  useEffect(() => {
    if (!activo || !icono.current) return;
    /*
      Los hijos directos del bloque de detalle, leídos en el momento de animar y
      no antes: entre que se dibuja la pantalla y que corre este efecto, la lista
      puede haber cambiado —un renglón que aparece solo si hay depósito, por
      ejemplo— y una lista guardada de antes animaría elementos que ya no están.
    */
    const luego = detalle.current
      ? Array.prototype.slice.call(detalle.current.children)
      : [];
    celebrar(icono.current, { tono, luego });
  }, [activo, tono]);

  return { icono, detalle };
}

/**
 * LA SACUDIDA, atada a un estado.
 *
 *   const cartel = useSacudida(error);
 *   ...
 *   {error && <div ref={cartel} style={s.error}>{error}</div>}
 *
 * Dispara cada vez que `senal` cambia a algo con valor. OJO CON EL MISMO ERROR
 * DOS VECES: si alguien aprieta "Pagar" y falla con el mismo mensaje, `senal`
 * no cambió y no se sacude nada, que es justo el caso donde más falta hace.
 * Para eso se le pasa un contador que suba en cada intento, o el mensaje junto
 * con el número de intento.
 */
export function useSacudida(senal) {
  const ref = useRef(null);
  useEffect(() => {
    if (senal) sacudir(ref.current);
  }, [senal]);
  return ref;
}

/**
 * EL LATIDO, atado a un valor que cambia.
 *
 * No late en el primer dibujado: la primera vez que se ve un número no cambió
 * nada, y un número que late apenas aparece la pantalla es ruido.
 */
export function useLatido(valor) {
  const ref = useRef(null);
  const anterior = useRef(valor);
  useEffect(() => {
    if (anterior.current !== valor && anterior.current !== undefined) {
      latir(ref.current);
    }
    anterior.current = valor;
  }, [valor]);
  return ref;
}

/**
 * LA TRANSICIÓN ENTRE PANTALLAS.
 *
 * Devuelve un ref para el contenedor del contenido. Cada vez que cambia la
 * ruta, le vuelve a poner la clase de entrada.
 *
 * SE HACE SACANDO Y PONIENDO LA CLASE Y NO CON UN `key` EN EL DIV. Poner un
 * `key` obligaría a React a tirar el contenedor y construir uno nuevo en cada
 * navegación, con todo lo que tiene adentro. Acá el contenedor se queda y lo
 * único que cambia es una clase.
 *
 * `void nodo.offsetWidth` en el medio no es una línea de más: sin leer una
 * medida, el navegador junta el "sacar" y el "poner" en una sola operación,
 * concluye que la clase nunca se fue, y la animación no vuelve a arrancar.
 */
export function useTransicionDePantalla(ruta) {
  const ref = useRef(null);
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    nodo.classList.remove("fw-pantalla-entra");
    void nodo.offsetWidth;
    nodo.classList.add("fw-pantalla-entra");
  }, [ruta]);
  return ref;
}
