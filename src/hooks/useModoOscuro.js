// ============================================================================
//  useModoOscuro — Saber, desde un componente, si el modo oscuro está prendido
// ----------------------------------------------------------------------------
//  Casi toda la app no necesita esto: sus colores salen de las variables de
//  services/theme.js y cambian solas. Hace falta cuando lo que cambia NO es un
//  color sino otra cosa —la foto del bloque principal de la home, que de día es
//  una y de noche es otra—, y eso no se puede escribir como una variable de CSS.
//
//  CÓMO SE ENTERA: mirando la clase del <html>, que es la marca que pone y saca
//  `applyDarkMode`. No se lee la preferencia guardada porque esa se guarda al
//  tocar el interruptor y no dice nada del momento: la clase es lo que está
//  puesto AHORA, y el observador avisa apenas cambia, sin que Ajustes tenga que
//  saber quién lo está mirando.
// ============================================================================
import { useEffect, useState } from "react";

const estaOscuro = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("fw-dark");

export function useModoOscuro() {
  const [oscuro, setOscuro] = useState(estaOscuro);

  useEffect(() => {
    const raiz = document.documentElement;
    // Se vuelve a leer al montar: entre el primer dibujado y este momento pudo
    // haber corrido `initTheme`.
    setOscuro(raiz.classList.contains("fw-dark"));

    const observador = new MutationObserver(() => setOscuro(raiz.classList.contains("fw-dark")));
    observador.observe(raiz, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, []);

  return oscuro;
}
