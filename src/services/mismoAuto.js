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

const CARROCERIAS = {
  hatchback: ["hatchback", "hatch", "compacto", "utilitario chico"],
  sedan: ["sedan", "berlina", "saloon"],
  suv: ["suv", "crossover", "todoterreno", "4x4"],
  pickup: ["pickup", "pick", "chata"],
  van: ["van", "furgon", "furgoneta", "minivan", "combi"],
  moto: ["moto", "motocicleta", "scooter", "motorcycle"],
  coupe: ["coupe", "deportivo"],
  familiar: ["familiar", "rural", "station", "wagon", "break"],
};

/*
  "Camioneta" NO está en la tabla a propósito: en Argentina se le dice camioneta
  tanto a una pickup como a una SUV, así que tomarla por una de las dos inventa
  un desacuerdo que no existe. Una palabra ambigua no es un dato.
*/

const MARCAS = [
  "renault", "peugeot", "citroen", "fiat", "volkswagen", "vw", "chevrolet",
  "ford", "toyota", "honda", "nissan", "hyundai", "kia", "jeep", "suzuki",
  "mitsubishi", "subaru", "mazda", "bmw", "mercedes", "audi", "ram", "dodge",
  "chrysler", "alfa", "seat", "skoda", "chery", "baic", "jetour", "byd", "tesla",
  "iveco", "isuzu", "lexus", "porsche", "volvo", "mini", "land", "range",
];

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

  const marca = palabras.find(p => MARCAS.includes(p)) || null;
  return {
    tipo: primerGrupo(CARROCERIAS, palabras),
    color: primerGrupo(COLORES, palabras),
    marca,
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
    const marca = marcaModelo.find(p => MARCAS.includes(p)) || null;
    const modelo = marcaModelo.filter(p => p !== marca).join(" ") || null;
    return {
      tipo: grupoDe(CARROCERIAS, normalizar(dato.tipo)) || null,
      color: grupoDe(COLORES, normalizar(dato.color)) || null,
      marca,
      modelo,
    };
  }
  return rasgosDeTexto(revision?.detected);
}

const CAMPOS = ["tipo", "color", "marca", "modelo"];

/** ¿Cuántos rasgos conocidos de los dos lados NO coinciden? */
export function desacuerdos(a, b) {
  let n = 0;
  for (const campo of CAMPOS) {
    const uno = a?.[campo];
    const otro = b?.[campo];
    // Un rasgo que uno de los dos no tiene no es un desacuerdo: es un dato que
    // falta, y por un dato que falta no se acusa a nadie.
    if (uno && otro && uno !== otro) n++;
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
 * pantalla de publicar. Devuelve:
 *
 *   · `indices`    → las fotos que no coinciden con el resto (para marcarlas)
 *   · `referencia` → los rasgos del auto que sí coincide
 *   · `principal`  → el índice de la primera foto de ese auto. Con él la pantalla
 *                    puede decir "las otras muestran «Renault Clio blanco»"
 *                    usando la descripción que ya vino traducida del servidor,
 *                    en vez de armar una frase con estas etiquetas, que están
 *                    siempre en castellano porque son para comparar, no para leer.
 *
 * QUIÉN MANDA CUANDO HAY EMPATE: el grupo más grande, y si hay empate, el que
 * contiene a la foto de más arriba. La primera foto es la principal del aviso,
 * la que se ve en el buscador: si hay que elegir un auto de referencia, es ese.
 * Elegir al azar dejaría a la persona sin saber cuál sacar.
 */
export function fotosDeOtroAuto(revisiones) {
  const entradas = Object.entries(revisiones || {})
    .map(([i, revision]) => ({ i: Number(i), rasgos: rasgosDeRevision(revision) }))
    .filter(x => Number.isInteger(x.i) && tieneRasgos(x.rasgos))
    .sort((a, b) => a.i - b.i);

  // Con una sola foto descrita no hay nada contra qué comparar.
  if (entradas.length < 2) return { indices: [], referencia: null, principal: null };

  // Grupos: cada foto entra en el primer grupo con el que no discrepe.
  const grupos = [];
  for (const entrada of entradas) {
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

  if (grupos.length < 2) return { indices: [], referencia: null, principal: null };

  const referencia = grupos.reduce((mejor, g) => {
    if (g.indices.length > mejor.indices.length) return g;
    if (g.indices.length === mejor.indices.length && g.indices[0] < mejor.indices[0]) return g;
    return mejor;
  });

  return {
    indices: grupos.filter(g => g !== referencia).flatMap(g => g.indices).sort((a, b) => a - b),
    referencia: referencia.rasgos,
    principal: referencia.indices[0],
  };
}
