// ============================================================================
//  portadaDePerfil.js — El dibujo de arriba del perfil
// ----------------------------------------------------------------------------
//  QUÉ ERA ANTES. Un degradado azul escrito a mano adentro de Profile.jsx,
//  igual para todas las cuentas. En la ficha que se abre desde una publicación
//  —la que mira el otro antes de decidir si le presta el auto— directamente no
//  había nada: el cuadro empezaba con el nombre.
//
//  AHORA cada persona elige dos cosas: el DIBUJO y el COLOR. Y lo que elige se
//  ve en los dos lados. Que se vea en los dos lados es el punto: una portada
//  que solo apareciera en el perfil propio sería una decoración privada, y no
//  es para eso que alguien la elige.
//
//  ── POR QUÉ DOS DATOS Y NO UNO ────────────────────────────────────────────
//  Guardar "rayas-azules" como una sola cosa obligaría a una lista cerrada de
//  combinaciones y a tocar la base cada vez que se agrega un color. Separados,
//  seis dibujos por cualquier color son seis dibujos por cualquier color.
//
//  ── POR QUÉ EL CATÁLOGO VIVE ACÁ Y NO EN EL SERVIDOR ──────────────────────
//  Porque acá es donde se dibuja. El servidor guarda la preferencia y valida la
//  forma del texto, nada más: si también tuviera la lista, agregar un dibujo
//  sería tocar las dos puntas y publicar las dos. Un dibujo que este archivo no
//  conozca cae en el de siempre, que es degradarse bien y no romperse.
//
//  ── NO CONFUNDIR CON services/portada.js ─────────────────────────────────
//  Ese otro archivo es la FOTO DE LA HOME, la que va detrás del bloque de
//  arriba de la pantalla de inicio. No tienen nada que ver y por eso no
//  comparten archivo: una es una foto de la ciudad que rota sola, esto es un
//  dibujo de color que elige cada persona para su perfil.
//
//  ── CÓMO ESTÁN HECHOS ─────────────────────────────────────────────────────
//  Todos salen de UN color. Las variantes más claras y más oscuras se calculan
//  mezclando con blanco y con negro, así que agregar un color nuevo a la paleta
//  es agregar una línea y los seis dibujos andan solos. Son gradientes de CSS:
//  no hay una sola imagen, así que la portada no pesa nada y se ve nítida en
//  cualquier pantalla.
// ============================================================================

/** El dibujo y el color con los que arranca una cuenta que nunca eligió nada. */
export const PORTADA_POR_OMISION = "degrade";
export const COLOR_POR_OMISION = "#1d4ed8";

/**
 * Los dibujos, en el orden en que se muestran.
 *
 * El nombre de cada uno está en el diccionario (`portada.<clave>`): acá va la
 * clave y nada más, porque este archivo no sabe en qué idioma se está mirando.
 */
export const DIBUJOS = [
  "degrade",
  "liso",
  "rayas",
  "ondas",
  "puntos",
  "malla",
  "atardecer",
  "noche",
];

/**
 * La paleta sugerida.
 *
 * Son un punto de partida, no un límite: el selector tiene además el cuadradito
 * del navegador para elegir cualquier color. Están elegidos para que el texto
 * blanco se lea encima de todos —ninguno es pastel— y para que se distingan
 * entre sí de un vistazo, que es lo único que le pedimos a una paleta de ocho.
 */
export const COLORES = [
  "#1d4ed8", // azul, el de la marca
  "#0f766e", // verde petróleo
  "#15803d", // verde
  "#b45309", // ámbar quemado
  "#be123c", // rojo
  "#7e22ce", // violeta
  "#0369a1", // celeste profundo
  "#334155", // gris pizarra
];

// ── Las cuentas de color ────────────────────────────────────────────────────

/** "#1d4ed8" → [29, 78, 216]. Tolera que venga cualquier cosa. */
function aRgb(hex) {
  const limpio = typeof hex === "string" ? hex.trim() : "";
  if (!/^#[0-9a-fA-F]{6}$/.test(limpio)) return aRgb(COLOR_POR_OMISION);
  return [
    parseInt(limpio.slice(1, 3), 16),
    parseInt(limpio.slice(3, 5), 16),
    parseInt(limpio.slice(5, 7), 16),
  ];
}

/**
 * Mezcla un color con blanco (`hacia` = 255) o con negro (`hacia` = 0).
 * `cuanto` va de 0 (el color tal cual) a 1 (el destino puro).
 *
 * DEVUELVE EL ARREGLO Y NO EL TEXTO, y es lo único importante de esta función.
 * Cuando devolvía "rgb(138, 191, 158)" ya escrito, cualquier cuenta que
 * quisiera seguir trabajando sobre el resultado —aclarar y DESPUÉS poner
 * transparencia, que es lo que hacen las rayas y los puntos— le pasaba ese
 * texto a `aRgb`, que solo entiende hexadecimales: no lo reconocía, caía en el
 * azul de respaldo, y las rayas salían azules sobre un fondo verde. Con los
 * números crudos no hay texto intermedio que volver a leer.
 */
function mezclar(hex, hacia, cuanto) {
  const [r, g, b] = aRgb(hex);
  const uno = (c) => Math.round(c + (hacia - c) * cuanto);
  return [uno(r), uno(g), uno(b)];
}

const comoRgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const comoRgba = ([r, g, b], alfa) => `rgba(${r}, ${g}, ${b}, ${alfa})`;

/** El mismo color, más claro. */
export const aclarar = (hex, cuanto) => comoRgb(mezclar(hex, 255, cuanto));
/** El mismo color, más oscuro. */
export const oscurecer = (hex, cuanto) => comoRgb(mezclar(hex, 0, cuanto));

/**
 * El color aclarado Y con transparencia, en un solo paso: es lo que necesitan
 * las rayas, los puntos y la cuadrícula para dibujarse encima del fondo.
 *
 * Los dos efectos van juntos a propósito. Hacerlos en dos pasos obligaba a
 * convertir a texto en el medio, que es exactamente lo que rompía.
 */
const claroConAlfa = (hex, cuanto, alfa) =>
  comoRgba(mezclar(hex, 255, cuanto), alfa);

// ── Los dibujos ─────────────────────────────────────────────────────────────

/**
 * Cada dibujo devuelve un objeto de estilo listo para pasarle a React.
 *
 * Devuelven el estilo entero y no solo el `background` porque algunos necesitan
 * además `backgroundSize`: con la propiedad suelta, quien dibuje la portada
 * tendría que acordarse de cuál lleva qué, y es cuestión de tiempo que se
 * olvide en una de las dos pantallas.
 */
const RECETAS = {
  // El de siempre: oscuro en una punta, el color en la otra.
  degrade: (c) => ({
    background: `linear-gradient(100deg, ${oscurecer(c, 0.72)} 0%, ${c} 72%, ${aclarar(c, 0.22)} 100%)`,
  }),

  // Un solo color, apenas más claro arriba. Lo más sobrio de la lista.
  liso: (c) => ({
    background: `linear-gradient(180deg, ${aclarar(c, 0.12)} 0%, ${c} 100%)`,
  }),

  // Rayas al sesgo. El tamaño fijo las mantiene iguales en celular y en
  // pantalla grande; sin él, se estiran con el ancho y se ven desprolijas.
  rayas: (c) => ({
    background:
      `repeating-linear-gradient(135deg, ${claroConAlfa(c, 0.5, 0.32)} 0px, ` +
      `${claroConAlfa(c, 0.5, 0.32)} 10px, transparent 10px, transparent 22px), ` +
      `linear-gradient(120deg, ${oscurecer(c, 0.55)} 0%, ${c} 100%)`,
  }),

  // Dos manchas de luz, como un foco apuntando desde arriba.
  ondas: (c) => ({
    background:
      `radial-gradient(120% 150% at 12% 0%, ${aclarar(c, 0.42)} 0%, transparent 55%), ` +
      `radial-gradient(90% 130% at 88% 100%, ${oscurecer(c, 0.45)} 0%, transparent 60%), ` +
      `linear-gradient(90deg, ${c} 0%, ${oscurecer(c, 0.25)} 100%)`,
  }),

  /*
    Puntos. El `backgroundSize` es lo que arma la grilla: sin él queda UN punto.

    El tamaño y la opacidad están subidos respecto de lo primero que se probó.
    El motivo no es la portada —ahí se veía bien— sino la MUESTRA del selector,
    que mide 96 por 44: con puntos de 1,6px al 50% el cuadradito parecía vacío
    y nadie iba a elegir un dibujo que se ve como nada.
  */
  puntos: (c) => ({
    background:
      `radial-gradient(${claroConAlfa(c, 0.92, 0.46)} 2.1px, transparent 2.2px), ` +
      `linear-gradient(135deg, ${oscurecer(c, 0.62)} 0%, ${c} 100%)`,
    backgroundSize: "16px 16px, 100% 100%",
  }),

  // Una cuadrícula fina, como un papel milimetrado. Mismo criterio que los
  // puntos: tiene que leerse también en la muestra chica.
  malla: (c) => ({
    background:
      `linear-gradient(${claroConAlfa(c, 0.92, 0.3)} 1px, transparent 1px), ` +
      `linear-gradient(90deg, ${claroConAlfa(c, 0.92, 0.3)} 1px, transparent 1px), ` +
      `linear-gradient(160deg, ${oscurecer(c, 0.58)} 0%, ${c} 100%)`,
    backgroundSize: "22px 22px, 22px 22px, 100% 100%",
  }),

  // Tres bandas, de lo oscuro a lo claro. El único con un toque cálido: el
  // naranja no sale del color elegido, está puesto, porque un atardecer sin
  // naranja no es un atardecer.
  atardecer: (c) => ({
    background:
      `linear-gradient(170deg, ${oscurecer(c, 0.8)} 0%, ${c} 45%, ` +
      `${aclarar(c, 0.35)} 72%, #f59e0b 100%)`,
  }),

  // Casi negro, con el color asomando como un resplandor. Para quien no quiere
  // una portada de color pero tampoco un rectángulo gris.
  noche: (c) => ({
    background:
      `radial-gradient(100% 140% at 78% 110%, ${c} 0%, transparent 62%), ` +
      `linear-gradient(180deg, #0b1020 0%, ${oscurecer(c, 0.84)} 100%)`,
  }),
};

// ── La foto de portada ──────────────────────────────────────────────────────

/**
 * Una dirección de imagen que se puede meter adentro de un `url(...)` de CSS.
 *
 * ── POR QUÉ ESTO SE REVISA Y NO SE USA TAL CUAL ───────────────────────────
 * Esta dirección viene de la base de datos y termina pegada adentro de una
 * propiedad de CSS. Un texto con un paréntesis o una comilla no queda "feo":
 * CIERRA EL url() ANTES DE TIEMPO y lo que sigue se interpreta como más CSS.
 * Es el mismo cuidado que se tiene al armar una consulta a la base, y vale
 * aunque hoy la única forma de cargar una foto sea subiéndola desde la app:
 * la comprobación cuesta una línea y el día que el dato entre por otro lado ya
 * está hecha.
 *
 * Se exige https: una imagen por http en una página https no la carga ningún
 * navegador, así que una dirección así es una portada rota y no una portada.
 */
export function fotoUsable(url) {
  if (typeof url !== "string") return null;
  const limpio = url.trim();
  if (!/^https:\/\/[^\s"'()\\<>]+$/.test(limpio)) return null;
  return limpio;
}

/**
 * El estilo de una portada.
 *
 * LA FOTO GANA. Si hay una foto cargada se muestra la foto, y el dibujo queda
 * guardado abajo para cuando la persona la saque: sacar la foto devuelve lo
 * que tenía elegido en vez de dejarlo en el azul de fábrica, que sería
 * perderle una decisión que ya había tomado.
 *
 * Un dibujo desconocido —una cuenta guardada por una versión más nueva del
 * front, un dato tocado a mano— cae en el de siempre en vez de romper la
 * pantalla. Es la misma regla que el color: si no es un hexadecimal válido, se
 * usa el azul; y la misma que la foto, que si no es usable es como si no
 * estuviera.
 */
export function fondoDePortada(dibujo, color, foto) {
  const imagen = fotoUsable(foto);
  if (imagen) {
    return {
      backgroundImage: `url("${imagen}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      // Mientras la foto baja se ve el dibujo elegido y no un rectángulo
      // gris. Dura un instante, pero es el instante en que se abre la
      // pantalla.
      backgroundColor: color,
    };
  }
  const receta = RECETAS[dibujo] ?? RECETAS[PORTADA_POR_OMISION];
  return receta(color);
}

/**
 * Lo que eligió una persona, tolerando que no venga nada.
 *
 * Se usa igual con `/users/me` y con el perfil público, que devuelven los
 * mismos tres campos. Un backend viejo que todavía no los mande deja la
 * portada de siempre, que es exactamente cómo se veía antes.
 */
export function portadaDe(persona) {
  const dibujo = persona?.profileCoverDesign;
  const color = persona?.profileCoverColor;
  return {
    dibujo: DIBUJOS.includes(dibujo) ? dibujo : PORTADA_POR_OMISION,
    color: /^#[0-9a-fA-F]{6}$/.test(color || "") ? color : COLOR_POR_OMISION,
    foto: fotoUsable(persona?.profileCoverPhotoUrl),
  };
}

/** El estilo de la portada de una persona, en un solo paso. */
export function portadaDeLaPersona(persona) {
  const { dibujo, color, foto } = portadaDe(persona);
  return fondoDePortada(dibujo, color, foto);
}
