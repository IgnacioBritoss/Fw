// ============================================================================
//  portada — La foto que va detrás del bloque principal de la home
// ----------------------------------------------------------------------------
//  POR QUÉ: el bloque de arriba era un azul liso. Cumplía, pero no decía nada:
//  una foto de la ciudad ubica al que entra —esto es acá, en Buenos Aires— y le
//  da a la pantalla algo que mirar en el primer segundo, que es lo único que
//  hay para convencer a alguien de quedarse.
//
//  DE DÍA Y DE NOCHE. Hay dos juegos de fotos y el que se usa depende del modo:
//  en claro, las de día; en oscuro, las de noche. Una foto de mediodía sobre una
//  pantalla oscura queda como una linterna, y una foto nocturna sobre una
//  pantalla blanca queda como un agujero. Además el modo oscuro se prende
//  justamente de noche, así que la foto acompaña.
//
//  CAMBIA EN CADA ENTRADA. No es al azar: es por turno. Al azar, con dos fotos,
//  una de cada cuatro veces sale la misma dos veces seguidas y parece que no
//  cambió nada. Por turno cambia siempre.
//
//  EL AZUL NO SE VA. La foto va debajo de un velo azul de la marca. Sin él, el
//  título blanco se pierde contra las luces de la ciudad y el bloque deja de
//  leerse como parte de Freewheel: pasaría a ser una foto con letras encima.
// ============================================================================

/** Las fotos viven en `public/`, así que desde acá se piden con la barra. */
export const PORTADAS = {
  dia: ["/hero-dia-1.jpg", "/hero-dia-2.jpg"],
  noche: ["/hero-noche-1.jpg", "/hero-noche-2.jpg"],
};

const CLAVE_TURNO = "fw_portada";

/**
 * Avanza el turno. Se llama UNA vez por entrada, desde el login.
 *
 * El número crece y nunca se reinicia; el resto de la división elige la foto,
 * así que da lo mismo cuánto valga.
 */
export function siguientePortada() {
  try {
    const ahora = Number(localStorage.getItem(CLAVE_TURNO) || 0);
    localStorage.setItem(CLAVE_TURNO, String((ahora + 1) % 1000));
  } catch {
    // Navegador con el almacenamiento bloqueado: se queda siempre en la primera.
  }
}

/**
 * La foto que toca ahora.
 *
 * `oscuro` decide el juego —de día o de noche— y el turno decide cuál de las
 * dos. Los dos juegos tienen la misma cantidad, así que al cambiar de modo se
 * ve la foto equivalente y no una cualquiera.
 */
export function portadaDeAhora(oscuro) {
  const juego = oscuro ? PORTADAS.noche : PORTADAS.dia;
  let turno = 0;
  try { turno = Number(localStorage.getItem(CLAVE_TURNO) || 0); } catch { turno = 0; }
  if (!Number.isFinite(turno) || turno < 0) turno = 0;
  return juego[turno % juego.length];
}

/**
 * El velo azul que va encima de la foto.
 *
 * No es un color plano: es un degradado que arranca bien tapado del lado
 * izquierdo —donde están el título y el subtítulo— y se abre hacia la derecha,
 * que es donde la foto puede respirar sin tapar ninguna letra. Así el texto se
 * lee con el contraste de siempre y la ciudad igual se ve.
 *
 * En oscuro el velo es más cerrado: la pantalla entera es oscura y una foto
 * brillante en el medio saltaría a la vista más de lo que corresponde.
 */
export function veloDePortada(oscuro) {
  return oscuro
    ? "linear-gradient(100deg, rgba(9,32,63,.94) 0%, rgba(9,32,63,.88) 42%, rgba(11,50,100,.72) 100%)"
    : "linear-gradient(100deg, rgba(11,85,192,.93) 0%, rgba(11,85,192,.84) 42%, rgba(15,108,230,.62) 100%)";
}
