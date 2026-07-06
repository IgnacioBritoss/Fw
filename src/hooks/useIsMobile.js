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
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  useEffect(() => {
    // Cada vez que cambia el tamaño de la ventana, recalculamos los valores.
    const handle = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener("resize", handle);
    // Limpieza: quitamos el listener cuando el componente se desmonta.
    return () => window.removeEventListener("resize", handle);
  }, []);

  return { isMobile, isTablet };
}