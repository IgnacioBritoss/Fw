// ============================================================================
//  useThemeColor — El color de la barra del navegador en el celular
// ----------------------------------------------------------------------------
//  En iOS, Safari pinta su barra de arriba con el color de <meta name="theme-color">.
//  Las pantallas de entrada tienen una franja oscura arriba, y como el theme-color
//  de la app es blanco, quedaba una banda blanca del navegador ENCIMA de la franja:
//  la franja no llegaba hasta el borde del teléfono.
//
//  Este hook cambia ese color mientras la pantalla está abierta y lo devuelve a lo
//  que estaba al salir, así el resto de la app sigue con su barra clara.
// ============================================================================
import { useEffect } from "react";

/**
 * Pinta la barra del navegador del celular con un color.
 *
 * Es el `<meta name="theme-color">`: en el teléfono, la franja de arriba toma
 * ese color y la pantalla se ve de una pieza en vez de con una banda blanca
 * arriba. Al salir de la pantalla, vuelve al color de antes.
 */
export function useThemeColor(color) {
  useEffect(() => {
    if (!color) return undefined;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return undefined;

    const anterior = meta.getAttribute("content");
    meta.setAttribute("content", color);
    return () => meta.setAttribute("content", anterior ?? "#ffffff");
  }, [color]);
}
