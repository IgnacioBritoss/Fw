// ============================================================================
//  atributos.js — Las características que se eligen al dejar una reseña
// ----------------------------------------------------------------------------
//  POR QUÉ NO ALCANZA CON LAS ESTRELLAS. Cinco estrellas y un texto libre dicen
//  CUÁNTO gustó, pero no QUÉ pasó. Dos personas ponen 3 estrellas: una porque el
//  dueño tardó dos horas en contestar y la otra porque el auto estaba sucio. Ese
//  3 no le sirve a nadie: quien lo lee no sabe cuál de las dos cosas le va a
//  tocar, y quien lo recibió no sabe qué corregir.
//
//  Con características, en cambio, veinte reseñas dejan de ser veinte textos
//  para leer uno por uno y se convierten en un dato: "contesta rápido, 18 veces".
//  Es lo que hace que un perfil se pueda LEER DE UN VISTAZO, que es de lo que se
//  trata toda esta pantalla.
//
//  ── LAS REGLAS QUE SE SIGUIERON PARA ARMAR LA LISTA ────────────────────────
//
//  1. SON HECHOS, NO ADJETIVOS. "Contestó rápido" se puede verificar; "es buena
//     onda" no. La lista describe cosas que pasaron, no juicios sobre la persona.
//  2. CADA UNA TIENE SU CONTRARIA. Si existe "contesta rápido" tiene que existir
//     "tardó en contestar". Una lista con más elogios que quejas es una lista que
//     empuja: la persona encuentra dónde tocar para decir algo bueno y no
//     encuentra dónde decir lo que le pasó.
//  3. SEIS COMO MUCHO, Y NINGUNA OBLIGATORIA. Veinte casillas se contestan a
//     desgano o no se contestan; el límite obliga a elegir lo que de verdad pasó.
//  4. SON CÓDIGOS, NO TEXTO. Lo que se guarda es RESPONDE_RAPIDO, no la frase.
//     Así la misma reseña se lee en los cinco idiomas, y se pueden contar: un
//     texto libre no se cuenta.
//
//  ── LOS DOS LADOS NO PUNTÚAN LO MISMO ──────────────────────────────────────
//  Quien alquiló habla del auto y de la entrega; el dueño habla de cómo lo
//  cuidaron y de cómo lo devolvieron. Preguntarle a un dueño si "el auto estaba
//  como en las fotos" no tiene sentido: las fotos las sacó él.
// ============================================================================

/**
 * Todas las características, con su signo y a quién se le pueden poner.
 *
 *  · `code`   → lo que se guarda. No se cambia nunca: cambiarlo perdería las
 *               reseñas viejas que lo tengan.
 *  · `bueno`  → si suma o resta. Es lo que decide el color y de qué lado del
 *               resumen aparece.
 *  · `sobre`  → "dueño" si se la puede recibir el dueño de un auto, "conductor"
 *               si la recibe quien alquiló, "ambos" si aplica a los dos.
 *
 *  El texto NO está acá: sale del diccionario de idiomas con la clave
 *  `attr.<code>`, como todo lo que lee una persona.
 */
export const ATRIBUTOS = [
  // ── Las que aplican a los dos lados ──────────────────────────────────────
  { code: "RESPONDE_RAPIDO", bueno: true, sobre: "ambos" },
  { code: "RESPONDE_TARDE", bueno: false, sobre: "ambos" },
  { code: "TRATO_AMABLE", bueno: true, sobre: "ambos" },
  { code: "TRATO_AGRESIVO", bueno: false, sobre: "ambos" },
  { code: "PUNTUAL", bueno: true, sobre: "ambos" },
  { code: "IMPUNTUAL", bueno: false, sobre: "ambos" },

  // ── Sobre el dueño: el auto y lo que se prometió ─────────────────────────
  { code: "AUTO_COMO_LA_FOTO", bueno: true, sobre: "dueño" },
  { code: "AUTO_DISTINTO", bueno: false, sobre: "dueño" },
  { code: "AUTO_LIMPIO", bueno: true, sobre: "dueño" },
  { code: "AUTO_SUCIO", bueno: false, sobre: "dueño" },
  { code: "SIN_COBROS_EXTRA", bueno: true, sobre: "dueño" },
  { code: "COBROS_INESPERADOS", bueno: false, sobre: "dueño" },

  // ── Sobre quien alquiló: cómo volvió el auto ─────────────────────────────
  { code: "CUIDO_EL_AUTO", bueno: true, sobre: "conductor" },
  { code: "MALTRATO_EL_AUTO", bueno: false, sobre: "conductor" },
  { code: "DEVOLVIO_LIMPIO", bueno: true, sobre: "conductor" },
  { code: "DEVOLVIO_SUCIO", bueno: false, sobre: "conductor" },
];

/** Solo los códigos, que es lo que valida el servidor. */
export const CODIGOS = ATRIBUTOS.map(a => a.code);

/** Cuántas se pueden elegir en una misma reseña. Ver la regla 3, arriba. */
export const MAXIMO = 6;

const PORCODIGO = new Map(ATRIBUTOS.map(a => [a.code, a]));

/** Los datos de una característica, o null si el código no existe. */
export const atributo = (code) => PORCODIGO.get(code) || null;

/** ¿Esta característica suma? Un código desconocido no suma ni resta. */
export const esBueno = (code) => PORCODIGO.get(code)?.bueno === true;

/**
 * Las que se le pueden poner a alguien según el papel que cumplió.
 *
 * `papel` es el de QUIEN RECIBE la reseña: "dueño" cuando se está puntuando al
 * dueño del auto, "conductor" cuando se puntúa a quien lo alquiló.
 */
export function atributosPara(papel) {
  return ATRIBUTOS.filter(a => a.sobre === "ambos" || a.sobre === papel);
}

/**
 * Cuenta las características de un montón de reseñas.
 *
 * Devuelve una lista ordenada de mayor a menor, ya separada en buenas y malas,
 * que es como se muestra en el perfil. Se saltean los códigos que este front no
 * conozca: si el servidor un día agrega uno nuevo, la pantalla vieja lo ignora
 * en vez de mostrar un código crudo en pantalla.
 */
export function contarAtributos(reviews = []) {
  const cuenta = new Map();
  for (const review of reviews) {
    const lista = Array.isArray(review?.tags) ? review.tags : [];
    for (const code of lista) {
      if (!PORCODIGO.has(code)) continue;
      cuenta.set(code, (cuenta.get(code) || 0) + 1);
    }
  }
  const todas = [...cuenta.entries()]
    .map(([code, n]) => ({ code, n, bueno: esBueno(code) }))
    .sort((a, b) => b.n - a.n);

  return {
    buenas: todas.filter(x => x.bueno),
    malas: todas.filter(x => !x.bueno),
    total: todas.reduce((suma, x) => suma + x.n, 0),
  };
}

/**
 * Cómo le fue a alguien en un aspecto concreto, comparando la característica
 * buena con su contraria.
 *
 * Devuelve "bien" | "regular" | "mal" | null (null = todavía no hay con qué
 * decirlo, que NO es lo mismo que "mal" y por eso no se inventa).
 *
 * El umbral es 70% para "bien" y 40% para "regular". No es un número redondo por
 * gusto: con 2 de 3 (66%) alguien no "brinda buena atención", y con menos de la
 * mitad tampoco es un caso dudoso.
 */
export function comoLeFue(cuenta, codeBueno, codeMalo) {
  const suma = (code) => cuenta.find(x => x.code === code)?.n || 0;
  const bien = suma(codeBueno);
  const mal = suma(codeMalo);
  const total = bien + mal;
  if (total < 2) return null;
  const proporcion = bien / total;
  if (proporcion >= 0.7) return "bien";
  if (proporcion >= 0.4) return "regular";
  return "mal";
}
