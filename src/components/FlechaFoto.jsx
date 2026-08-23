// ============================================================================
//  FlechaFoto — La flecha de pasar fotos
// ----------------------------------------------------------------------------
//  Está en su propio archivo porque la usan dos pantallas —el globo del mapa y
//  el carrusel de la publicación— y tienen que verse iguales. Antes cada una
//  hacía la suya: el globo la dibujaba y la publicación usaba el carácter "‹".
//
//  POR QUÉ DIBUJADA Y NO EL CARÁCTER. "‹" es una comilla angular, no una flecha:
//  no tiene punta, el grosor del trazo y la altura dependen de la tipografía que
//  tenga el sistema —así que se ve distinta en Windows, en Mac y en Android—, y
//  nunca queda centrada en el redondel, porque un carácter trae su propio
//  espacio arriba y abajo que no se puede sacar. Dibujada mide siempre lo mismo,
//  tiene punta y cae justo en el centro.
//
//  Toma el color de quien la contiene (`currentColor`), así el redondel decide
//  el color una sola vez y la flecha lo sigue en los dos modos.
// ============================================================================

export default function FlechaFoto({ hacia = "der", size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={hacia === "izq" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
