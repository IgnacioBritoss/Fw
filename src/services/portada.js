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
const CLAVE_ULTIMO = "fw_portada_ts";

/**
 * Cuánto tiene que pasar entre dos avances para que cuenten como dos entradas.
 *
 * Existe porque una misma entrada puede avisar dos veces: el camino de Google
 * guarda la sesión en dos pasos —primero el token, después los datos de la
 * persona— y los dos son "ya hay sesión". Avanzando en los dos, el turno subiría
 * de a dos; y con dos fotos por juego, subir de a dos es quedarse en la misma.
 * O sea que el intento de arreglarlo lo dejaba igual de roto.
 *
 * Cuatro segundos: más que lo que tarda un login en resolverse, y muchísimo
 * menos que lo que tarda alguien en salir y volver a entrar.
 */
const ESPERA_ENTRE_ENTRADAS_MS = 4000;

/**
 * Avanza el turno. Se llama UNA vez por entrada, desde el login.
 *
 * El número crece y nunca se reinicia; el resto de la división elige la foto,
 * así que da lo mismo cuánto valga.
 */
export function siguientePortada() {
  try {
    const ahora = Date.now();
    const ultimo = Number(localStorage.getItem(CLAVE_ULTIMO) || 0);
    if (ahora - ultimo < ESPERA_ENTRE_ENTRADAS_MS) return;

    const turno = Number(localStorage.getItem(CLAVE_TURNO) || 0);
    localStorage.setItem(CLAVE_TURNO, String((turno + 1) % 1000));
    localStorage.setItem(CLAVE_ULTIMO, String(ahora));
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
 * EL VELO ERA DEMASIADO. La primera versión iba de 93% a 62% de opacidad, o sea
 * que en el punto MÁS transparente todavía tapaba casi dos tercios de la foto.
 * El resultado era un bloque azul con una sombra adentro: la foto estaba, se
 * descargaba, pero no se veía. Y como no se veía, las dos fotos de día parecían
 * la misma —"nunca cambia"—, cuando en realidad cambiaban en cada entrada.
 *
 * Ahora el velo se cierra más rápido del lado del texto (94% hasta el 26%, que
 * es donde termina el subtítulo) y se abre mucho más del otro (22% al final).
 * El contraste de las letras no cambia, porque donde están las letras el velo es
 * más opaco que antes; lo que cambia es que del medio a la derecha la ciudad se
 * ve de verdad, y entonces se nota cuál foto tocó.
 *
 * En oscuro el velo es más cerrado: la pantalla entera es oscura y una foto
 * brillante en el medio saltaría a la vista más de lo que corresponde.
 */
export function veloDePortada(oscuro) {
  return oscuro
    ? "linear-gradient(100deg, rgba(9,32,63,.95) 0%, rgba(9,32,63,.90) 26%, rgba(9,32,63,.62) 55%, rgba(9,32,63,.34) 100%)"
    : "linear-gradient(100deg, rgba(11,85,192,.94) 0%, rgba(11,85,192,.86) 26%, rgba(11,85,192,.52) 55%, rgba(11,85,192,.22) 100%)";
}
