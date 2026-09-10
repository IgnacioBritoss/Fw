// ============================================================================
//  mismoAuto.js — ¿Todas las fotos son del mismo auto?
// ----------------------------------------------------------------------------
//  EL AGUJERO QUE TAPA. La revisión de fotos miraba cada foto por separado y
//  contestaba una sola cosa: "¿esto es un vehículo real?". Con eso alcanzaba
//  para frenar la foto de un perro, pero no para frenar lo que pasó en la
//  prueba: cargar dos fotos de un Clio blanco y una tercera de un Corolla Cross.
//  Las tres eran autos reales, así que las tres pasaron, y la publicación quedó
//  con las fotos de dos autos distintos.
//
//  Y el dato para darse cuenta ESTABA: la revisión ya devolvía qué había visto
//  en cada foto. Nadie lo comparaba contra las otras.
//
//  ── POR QUÉ ESTO NO ES UNA COMPARACIÓN DE IMÁGENES ────────────────────────
//  No se comparan las fotos entre sí —eso es otro problema y otro costo—: se
//  comparan las DESCRIPCIONES que ya devolvió la revisión de cada una. Cuatro
//  rasgos que un modelo puede leer de una foto sin equivocarse mucho: la
//  carrocería, el color, la marca y el modelo.
//
//  ── LA REGLA: HACEN FALTA DOS DESACUERDOS ─────────────────────────────────
//  Un solo rasgo distinto NO alcanza para decir que es otro auto. El mismo auto
//  fotografiado a la sombra puede salir "gris" en una foto y "negro" en otra, y
//  una foto del baúl abierto puede leerse como otra carrocería. Frenar una
//  publicación legítima por eso sería peor que el problema que se está
//  arreglando: quien publica no tiene forma de convencer al programa.
//
//  Con dos rasgos distintos ya no es un matiz. "Hatchback blanco Renault Clio"
//  contra "SUV gris Toyota Corolla Cross" son cuatro desacuerdos.
//
//  ── QUÉ PASA SI EL SERVIDOR ES VIEJO ──────────────────────────────────────
//  El servidor nuevo devuelve los rasgos separados (`rasgos`). Uno viejo devuelve
//  solo la frase de dos o tres palabras que ya devolvía (`detected`), y de ahí se
//  sacan el color, la carrocería y la marca leyendo palabras conocidas. Es menos
//  fino, pero es lo mismo que haría una persona leyendo esas frases, y sin él
//  este control no existiría hasta que el servidor se actualice.
//
//  Vive en su propio archivo, y no adentro de la pantalla de publicar, porque es
//  la clase de cosa que hay que poder probar sin navegador y sin gastar cuota de
//  IA: las pruebas están en mismoAuto.test.js.
// ============================================================================

/** Saca acentos, mayúsculas y todo lo que no sea letra o número. */
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
  Los sinónimos existen para que el control no se dispare por una palabra.
  "Plateado" y "gris" son el mismo auto; "crossover" y "SUV" también. Sin esto,
  dos fotos del mismo auto descritas con palabras distintas contarían como un
  desacuerdo, que es justo lo que no se quiere.
*/
const COLORES = {
  blanco: ["blanco", "blanca", "white"],
  negro: ["negro", "negra", "black"],
  gris: ["gris", "plateado", "plata", "silver", "grey", "gray"],
  rojo: ["rojo", "roja", "bordo", "red"],
  azul: ["azul", "celeste", "blue"],
  verde: ["verde", "green"],
  amarillo: ["amarillo", "amarilla", "yellow"],
  naranja: ["naranja", "naranjo", "orange"],
  marron: ["marron", "beige", "dorado", "brown"],
  violeta: ["violeta", "morado", "purple"],
};

/*
  Las variantes incluyen los códigos con los que el formulario de publicar
  guarda la categoría (HATCHBACK, SEDAN, SUV...), para poder comparar la foto
  contra lo que la persona declaró sin traducir nada en el medio.

  ELECTRIC no está, y es a propósito: eléctrico no es una carrocería. Un Tesla
  Model 3 es un sedán y un Kona eléctrico es una SUV; tomar "eléctrico" por una
  forma de auto inventaría un desacuerdo con cualquier foto.
*/
const CARROCERIAS = {
  hatchback: ["hatchback", "hatch", "compacto", "utilitario chico"],
  sedan: ["sedan", "berlina", "saloon"],
  suv: ["suv", "crossover", "todoterreno", "4x4"],
  pickup: ["pickup", "pick", "chata"],
  van: ["van", "furgon", "furgoneta", "minivan", "combi"],
  moto: ["moto", "motocicleta", "scooter", "motorcycle"],
  coupe: ["coupe", "deportivo"],
  convertible: ["convertible", "cabriolet", "cabrio", "descapotable", "roadster"],
  familiar: ["familiar", "rural", "station", "wagon", "break"],
};

/*
  "Camioneta" NO está en la tabla a propósito: en Argentina se le dice camioneta
  tanto a una pickup como a una SUV, así que tomarla por una de las dos inventa
  un desacuerdo que no existe. Una palabra ambigua no es un dato.
*/

const MARCAS = [
  "renault", "peugeot", "citroen", "fiat", "volkswagen", "chevrolet",
  "ford", "toyota", "honda", "nissan", "hyundai", "kia", "jeep", "suzuki",
  "mitsubishi", "subaru", "mazda", "bmw", "mercedes", "audi", "ram", "dodge",
  "chrysler", "alfa", "seat", "skoda", "chery", "baic", "jetour", "byd", "tesla",
  "iveco", "isuzu", "lexus", "porsche", "volvo", "mini", "land", "range",
];

/** La misma marca escrita de dos formas es la misma marca. */
const ALIAS_DE_MARCA = {
  vw: "volkswagen",
  chevy: "chevrolet",
  merc: "mercedes",
  benz: "mercedes",
};

const marcaCanonica = (palabra) => ALIAS_DE_MARCA[palabra] || palabra;

/** Busca en qué grupo cae una palabra. Devuelve la clave del grupo o null. */
function grupoDe(tabla, palabra) {
  for (const [clave, variantes] of Object.entries(tabla)) {
    if (variantes.includes(palabra)) return clave;
  }
  return null;
}

/** El primero de los grupos que aparezca en el texto, o null. */
function primerGrupo(tabla, palabras) {
  for (const palabra of palabras) {
    const clave = grupoDe(tabla, palabra);
    if (clave) return clave;
  }
  return null;
}

/**
 * Lee los rasgos de un auto de una frase suelta ("Renault Clio blanco").
 *
 * Es el camino de respaldo, para cuando el servidor todavía no devuelve los
 * rasgos separados. Lo que no reconoce queda en null, y un rasgo en null no
 * participa de ninguna comparación: no se inventa un desacuerdo por no haber
 * entendido una palabra.
 */
export function rasgosDeTexto(texto) {
  const palabras = normalizar(texto).split(" ").filter(Boolean);
  if (!palabras.length) return { tipo: null, color: null, marca: null, modelo: null };

  const marca = palabras.find(p => MARCAS.includes(marcaCanonica(p))) || null;
  return {
    tipo: primerGrupo(CARROCERIAS, palabras),
    color: primerGrupo(COLORES, palabras),
    marca: marca ? marcaCanonica(marca) : null,
    // El modelo no se adivina de una frase suelta: cualquier palabra que no sea
    // color ni carrocería podría ser el modelo, o el fondo, o el barrio.
    modelo: null,
  };
}

/**
 * Los rasgos de una foto ya revisada, vengan como vengan.
 *
 * Prioridad: lo que el servidor haya separado (`rasgos`), y si no, la frase
 * corta de siempre (`detected`). Los dos caminos terminan en la misma forma,
 * así que el resto del archivo no sabe cuál se usó.
 */
export function rasgosDeRevision(revision) {
  const dato = revision?.rasgos;
  if (dato && typeof dato === "object") {
    const marcaModelo = normalizar(dato.marcaModelo ?? dato.marca_modelo)
      .split(" ").filter(Boolean);
    const marca = marcaModelo.find(p => MARCAS.includes(marcaCanonica(p))) || null;
    const modelo = marcaModelo.filter(p => p !== marca).join(" ") || null;
    return {
      tipo: grupoDe(CARROCERIAS, normalizar(dato.tipo)) || null,
      color: grupoDe(COLORES, normalizar(dato.color)) || null,
      marca: marca ? marcaCanonica(marca) : null,
      modelo,
    };
  }
  return rasgosDeTexto(revision?.detected);
}

/**
 * Los rasgos del auto QUE LA PERSONA DECLARÓ en el primer paso del formulario.
 *
 * Es la comparación más confiable de todas y la más barata: no la adivina un
 * modelo mirando una foto, la escribió quien está publicando. Si dice que
 * publica un Renault Clio hatchback blanco y la foto muestra una SUV gris
 * Toyota, no hay nada que interpretar.
 *
 * Lo que no se pueda mapear queda en null y no participa: el color "Otro" del
 * formulario guarda un código hexadecimal, y la categoría "Eléctrico" no es una
 * carrocería.
 */
export function rasgosDeclarados(vehiculo) {
  const marca = normalizar(vehiculo?.brand).split(" ")[0] || null;
  return {
    tipo: grupoDe(CARROCERIAS, normalizar(vehiculo?.category)) || null,
    color: grupoDe(COLORES, normalizar(vehiculo?.color)) || null,
    // La marca declarada se cree tal como se escribió, esté o no en la lista de
    // marcas conocidas: la escribió una persona, no la dedujo un modelo.
    marca: marca ? marcaCanonica(marca) : null,
    modelo: normalizar(vehiculo?.model) || null,
  };
}

const CAMPOS = ["tipo", "color", "marca", "modelo"];

/**
 * ¿Dos modelos son el mismo?
 *
 * Alcanza con la primera palabra. "Clio Mio" y "Clio" son el mismo auto escrito
 * con más o menos detalle, y quien completó el formulario y quien mira la foto
 * casi nunca escriben lo mismo. Comparar la frase entera convertiría cada
 * versión de un modelo en un desacuerdo, y el error caería siempre del lado de
 * frenar una publicación buena.
 */
const mismoModelo = (a, b) => a.split(" ")[0] === b.split(" ")[0];

/** ¿Cuántos rasgos conocidos de los dos lados NO coinciden? */
export function desacuerdos(a, b) {
  let n = 0;
  for (const campo of CAMPOS) {
    const uno = a?.[campo];
    const otro = b?.[campo];
    // Un rasgo que uno de los dos no tiene no es un desacuerdo: es un dato que
    // falta, y por un dato que falta no se acusa a nadie.
    if (!uno || !otro) continue;
    const iguales = campo === "modelo" ? mismoModelo(uno, otro) : uno === otro;
    if (!iguales) n++;
  }
  return n;
}

/** Cuántos rasgos conocidos tiene una descripción. Sin ninguno, no opina. */
export const tieneRasgos = (r) => CAMPOS.some(campo => Boolean(r?.[campo]));

/** Hacen falta DOS rasgos distintos. Ver el encabezado del archivo. */
export const MINIMO_DESACUERDOS = 2;

/**
 * De un montón de fotos ya revisadas, cuáles parecen de OTRO auto.
 *
 * `revisiones` es un objeto { índiceDeLaFoto: revisión }, tal como lo guarda la
 * pantalla de publicar. `declarado` son los rasgos del auto que la persona cargó
 * en el primer paso (ver `rasgosDeclarados`), si los hay.
 *
 * SE COMPARA CONTRA LAS DOS COSAS, y en ese orden:
 *
 *  1. Contra lo DECLARADO. Es lo más confiable que hay: no lo dedujo un modelo
 *     mirando una foto, lo escribió quien publica. Y es lo único que puede
 *     resolver el caso de dos fotos, una de cada auto, donde entre ellas no hay
 *     forma de saber cuál es la intrusa.
 *  2. Entre las fotos que sobrevivieron a lo anterior. Sirve igual, porque el
 *     formulario puede no tener con qué comparar: el color "Otro", una categoría
 *     que no es una carrocería, un modelo escrito de cualquier forma.
 *
 * Devuelve:
 *
 *   · `indices`       → las fotos que no coinciden (para marcarlas)
 *   · `porFormulario` → cuáles de esas chocan contra lo declarado. La pantalla
 *                       las explica distinto: ahí puede nombrar el auto tal como
 *                       lo escribió la persona.
 *   · `referencia`    → los rasgos del auto que sí coincide
 *   · `principal`     → el índice de la primera foto de ese auto. Con él la
 *                       pantalla puede decir "las otras muestran «Renault Clio
 *                       blanco»" usando la descripción que ya vino traducida del
 *                       servidor, en vez de armar una frase con estas etiquetas,
 *                       que están siempre en castellano porque son para
 *                       comparar, no para leer.
 *
 * QUIÉN MANDA CUANDO HAY EMPATE: el grupo más grande, y si hay empate, el que
 * contiene a la foto de más arriba. La primera foto es la principal del aviso,
 * la que se ve en el buscador: si hay que elegir un auto de referencia, es ese.
 * Elegir al azar dejaría a la persona sin saber cuál sacar.
 */
export function fotosDeOtroAuto(revisiones, declarado = null) {
  const entradas = Object.entries(revisiones || {})
    .map(([i, revision]) => ({ i: Number(i), rasgos: rasgosDeRevision(revision) }))
    .filter(x => Number.isInteger(x.i) && tieneRasgos(x.rasgos))
    .sort((a, b) => a.i - b.i);

  // 1 · Contra el auto declarado en el formulario.
  const contraFormulario = tieneRasgos(declarado)
    ? entradas.filter(e => desacuerdos(declarado, e.rasgos) >= MINIMO_DESACUERDOS).map(e => e.i)
    : [];

  // 2 · Entre las que quedaron. Una foto ya marcada no vuelve a compararse: sin
  // esto, la intrusa formaría su propio grupo y arrastraría el conteo.
  const quedan = entradas.filter(e => !contraFormulario.includes(e.i));

  const nada = {
    indices: contraFormulario,
    porFormulario: contraFormulario,
    referencia: contraFormulario.length ? declarado : null,
    principal: null,
  };

  // Con una sola foto descrita no hay nada contra qué compararla.
  if (quedan.length < 2) return nada;

  // Grupos: cada foto entra en el primer grupo con el que no discrepe.
  const grupos = [];
  for (const entrada of quedan) {
    const grupo = grupos.find(g => desacuerdos(g.rasgos, entrada.rasgos) < MINIMO_DESACUERDOS);
    if (grupo) {
      grupo.indices.push(entrada.i);
      // Los rasgos del grupo se van completando: si la primera foto no dejaba
      // ver la marca y la segunda sí, el grupo pasa a tenerla.
      for (const campo of CAMPOS) {
        if (!grupo.rasgos[campo] && entrada.rasgos[campo]) grupo.rasgos[campo] = entrada.rasgos[campo];
      }
    } else {
      grupos.push({ rasgos: { ...entrada.rasgos }, indices: [entrada.i] });
    }
  }

  if (grupos.length < 2) return nada;

  const referencia = grupos.reduce((mejor, g) => {
    if (g.indices.length > mejor.indices.length) return g;
    if (g.indices.length === mejor.indices.length && g.indices[0] < mejor.indices[0]) return g;
    return mejor;
  });

  const sueltas = grupos.filter(g => g !== referencia).flatMap(g => g.indices);
  return {
    indices: [...contraFormulario, ...sueltas].sort((a, b) => a - b),
    porFormulario: contraFormulario,
    referencia: referencia.rasgos,
    principal: referencia.indices[0],
  };
}
