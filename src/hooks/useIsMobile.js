import { useState, useEffect } from "react";

// ============================================================================
//  useIsMobile — Hook para saber el tamaño de pantalla (responsive)
// ----------------------------------------------------------------------------
//  Devuelve { isMobile, isTablet } según el ancho de la ventana. Las pantallas
//  lo usan para mostrar layouts distintos en celular, tablet y escritorio.
//  Se re-calcula solo cada vez que el usuario cambia el tamaño de la ventana.
//    - isMobile: ancho < 768px
//    - isTablet: entre 768px y 1023px
// ============================================================================
// - [Celular 1] Hook propio que cualquier componente puede usar
export function useIsMobile() {
  // - [Celular 2] Es celular si la ventana mide menos de 768 píxeles
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // - [Celular 3] Es tablet entre 768 y 1023
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  useEffect(() => {
    // Cada vez que cambia el tamaño de la ventana, recalculamos los valores.
    // - [Celular 4] Vuelve a calcular las dos cosas
    const handle = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    // - [Celular 5] Se recalcula al girar el teléfono o achicar la ventana
    window.addEventListener("resize", handle);
    // Limpieza: quitamos el listener cuando el componente se desmonta.
    // - [Celular 6] Se desengancha al cerrar el componente
    return () => window.removeEventListener("resize", handle);
  }, []);

  // - [Celular 7] Lo que reciben las pantallas
  return { isMobile, isTablet };
}