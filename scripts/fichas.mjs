// ============================================================================
//  fichas.mjs — Baja las fichas técnicas de las marcas y saca los números
// ----------------------------------------------------------------------------
//  QUÉ HACE, EN UNA LÍNEA: recorre las webs oficiales de las marcas que venden
//  en Argentina, encuentra los PDF de ficha técnica, los baja, les saca las
//  especificaciones y escribe un informe para cargar en data/autosArgentina.js.
//
//  POR QUÉ EXISTE. Los números de ese archivo estaban cargados de memoria, y al
//  compararlos contra nueve fichas oficiales salió que el peso estaba mal en
//  los seis casos que se pudieron verificar. Lo que no sale de una ficha no se
//  puede defender, y pedirle a una persona que busque cincuenta PDF a mano es
//  trabajo que hace una computadora.
//
//  ── ESTO NO ES UN SCRAPER DE CUALQUIER COSA ───────────────────────────────
//
//  Solo entra a los dominios de la lista de abajo, y solo después de leer su
//  robots.txt y confirmar que la ruta esté permitida. Autocosmos, por ejemplo,
//  contesta "Disallow: /" y por eso NO está acá: cuando un sitio pide que no lo
//  recorran, no se lo recorre, y punto.
//
//  Además va despacio a propósito —una página por vez, con pausa— y se
//  identifica. No hay ninguna necesidad de bajar cincuenta PDF en diez
//  segundos, y hacerlo es la forma más rápida de que te bloqueen con razón.
//
//  ── LO QUE NO HACE ────────────────────────────────────────────────────────
//
//  No escribe autosArgentina.js solo. Escribe un informe (fichas.json) con lo
//  que encontró Y la línea cruda del PDF de donde sacó cada número, para que se
//  pueda revisar antes de cargarlo. Las fichas de cada marca tienen formatos
//  distintos y un número mal leído es peor que un número que falta: el que
//  falta se ve, el que está mal se publica.
//
//  USO:
//      node scripts/fichas.mjs              todas las marcas
//      node scripts/fichas.mjs fiat toyota  solo esas
//
//  Deja los PDF en scripts/fichas/ y el informe en scripts/fichas.json.
// ============================================================================
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CARPETA = join(AQUI, "fichas");
const INFORME = join(AQUI, "fichas.json");

/*
  POR QUÉ UN USER-AGENT DE NAVEGADOR Y NO UNO PROPIO.

  La primera versión se identificaba con un nombre propio, y Toyota contestó
  403 a todo. Varios sitios corporativos filtran por agente desconocido sin
  mirar nada más: no es una decisión sobre qué se puede leer, es un portero que
  no deja pasar al que no reconoce.

  Lo que SÍ es una declaración de qué se puede leer es el robots.txt, y ese se
  respeta al pie de la letra (ver rutasProhibidas). Pasar por el portero con un
  agente normal, respetando lo que el sitio pidió por escrito y yendo despacio,
  no es lo mismo que entrar donde dijeron que no.
*/
const AGENTE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Una pausa entre pedidos. No hay apuro y el sitio no es nuestro. */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPERA_MS = 1200;

/*
  DE DÓNDE SE BAJA.

  Todas estas contestaron que sí en su robots.txt (se vuelve a verificar al
  correr, no se confía en esta lista). Las páginas son los puntos de entrada
  donde suelen colgar las fichas; desde ahí se siguen los enlaces a PDF.
*/
/*
  LAS RUTAS NO SE ADIVINAN, SE DESCUBREN.

  La primera versión traía una lista escrita a mano —/cronos, /autos,
  /gama.html— y dio 404 en casi todas: cada marca arma su sitio distinto y
  además los cambia. Adivinar direcciones es perder el tiempo de la persona que
  corre esto.

  Ahora el único dato escrito a mano es el dominio. De ahí sale todo lo demás:
  el robots.txt casi siempre dice dónde está el sitemap, el sitemap es la lista
  de TODAS las páginas que el sitio publica, y de esa lista se filtran las que
  hablan de fichas técnicas. Es la forma en que un sitio dice "esto es lo que
  tengo", así que es la que hay que usar.
*/
const MARCAS = {
  fiat: "https://www.fiat.com.ar",
  toyota: "https://www.toyota.com.ar",
  volkswagen: "https://www.volkswagen.com.ar",
  chevrolet: "https://www.chevrolet.com.ar",
  renault: "https://www.renault.com.ar",
  peugeot: "https://www.peugeot.com.ar",
  ford: "https://www.ford.com.ar",
  nissan: "https://www.nissan.com.ar",
  citroen: "https://www.citroen.com.ar",
  jeep: "https://www.jeep.com.ar",
  honda: "https://www.honda.com.ar",
};

/*
  LAS CARPETAS DONDE UNA MARCA GUARDA SUS FICHAS.

  Esto es lo ÚNICO que se escribe a mano, y solo cuando se conoce de verdad una
  dirección real. La de Fiat salió de una ficha que ya teníamos en la mano:

      fiat.com.ar/content/dam/fiat/argentina/ficha-tecnica/Ficha-Tecnica-Fiat-Cronos-MY21.pdf

  Ese "/content/dam/" es Adobe Experience Manager, el gestor de contenidos que
  usan casi todas las automotrices. Tiene una propiedad muy útil: cualquier
  carpeta se puede pedir como JSON agregándole ".N.json", y contesta con la
  lista de lo que tiene adentro. O sea que con una sola dirección conocida se
  descubren todas las fichas de esa marca.

  NO SE AGREGAN CARPETAS ADIVINADAS. Adivinar rutas ya falló una vez y dio 404
  en cadena. Acá va solo lo que se comprobó; cuando una carpeta nueva conteste,
  se suma.
*/
const CARPETAS_DE_FICHAS = {
  fiat: ["/content/dam/fiat/argentina/ficha-tecnica"],
};

/** Hasta qué profundidad se le pide el listado a una carpeta de AEM. */
const NIVELES_JSON = [1, 2, 3];

/*
  CUANDO NO SE CONOCE LA CARPETA, SE LA BUSCA.

  Con Fiat quedó probado que el listado JSON funciona: una sola llamada a
  /content/dam/fiat/argentina/ficha-tecnica.1.json devolvió las 39 fichas. Pero
  escribir a mano esa ruta para las otras diez marcas sería adivinar otra vez,
  y adivinar ya falló dos veces.

  Así que se baja por el árbol desde /content/dam, que es la raíz del gestor en
  todos los AEM, pidiendo el listado de cada carpeta y metiéndose solo en las
  que pueden llevar a una ficha argentina. Es el mismo mecanismo, usado para
  encontrar la carpeta en vez de para leerla.
*/
const RAIZ_DAM = "/content/dam";

/** Por qué carpetas vale la pena bajar. El resto del gestor no nos interesa. */
const CARPETA_INTERESANTE = /ficha|tecnic|técnic|especificac|argentin|descarga|document|catalog|^ar$|^es[-_]?ar$/i;

/** Tope de pedidos por marca, para no recorrer un gestor entero. */
const NODOS_POR_MARCA = 45;

/** Lo que tiene que decir una dirección para que valga la pena abrirla. */
const SUENA_A_FICHA = /ficha|tecnic|técnic|especificac|datasheet|specs/i;

/** Cuántas páginas HTML se abren por marca buscando enlaces a PDF. */
const PAGINAS_POR_MARCA = 25;

// ── Permisos ───────────────────────────────────────────────────────────────

/** Lo que dice el robots.txt: qué no tocar, y dónde está el sitemap. */
export function leerRobots(texto) {
  const bloques = texto.split(/user-agent:/i).slice(1);
  const nuestro = bloques.find((b) => b.split(/\r?\n/)[0].trim() === "*") ?? "";
  const prohibidas = nuestro.split(/\r?\n/)
    .filter((l) => /^disallow:/i.test(l.trim()))
    .map((l) => l.split(":").slice(1).join(":").trim())
    .filter(Boolean);
  /*
    La línea "Sitemap:" puede aparecer en cualquier parte del archivo, no solo
    adentro de un bloque de agente. Por eso se busca en el texto entero y no
    en `nuestro`.
  */
  const sitemaps = [...texto.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  return { prohibidas, sitemaps };
}

export async function rutasProhibidas(base) {
  try {
    const r = await fetch(`${base}/robots.txt`, {
      headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return { prohibidas: [], sitemaps: [] };
    return leerRobots(await r.text());
  } catch {
    // Sin poder leer el robots no se asume que esté permitido.
    return { prohibidas: ["/"], sitemaps: [] };
  }
}

/**
 * Las direcciones de un sitemap.
 *
 * Un sitemap puede ser una lista de páginas o un índice que apunta a OTROS
 * sitemaps (los sitios grandes los parten por sección). Las dos cosas usan la
 * misma etiqueta `<loc>`, así que se sacan igual y después se distingue por la
 * extensión al seguirlos.
 */
export function urlsDeSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

/**
 * Los PDF que cuelgan de un listado JSON de Adobe Experience Manager.
 *
 * La respuesta es un objeto donde cada clave es el nombre de un hijo de la
 * carpeta. Los que terminan en .pdf son archivos; los demás son subcarpetas y
 * se recorren también, porque las marcas suelen separar por año o por modelo.
 *
 * Las claves que empiezan con "jcr:" o ":" son metadatos del gestor, no
 * contenido, y se saltean.
 */
/**
 * Qué cuelga de un listado JSON: los PDF y las carpetas por donde seguir.
 *
 * Separado de pdfsDeJson porque son dos preguntas distintas: aquella recorre
 * hacia abajo todo lo que encuentra, y esta mira UN nivel para decidir a dónde
 * ir. Mezclarlas haría que la exploración se meta en el gestor entero.
 */
export function hijosDeJson(objeto) {
  const pdfs = [];
  const carpetas = [];
  if (!objeto || typeof objeto !== "object") return { pdfs, carpetas };
  for (const [nombre, hijo] of Object.entries(objeto)) {
    if (nombre.startsWith("jcr:") || nombre.startsWith(":")) continue;
    if (!hijo || typeof hijo !== "object") continue;
    if (/\.pdf$/i.test(nombre)) pdfs.push(nombre);
    else carpetas.push(nombre);
  }
  return { pdfs, carpetas };
}

export function pdfsDeJson(objeto, rutaBase) {
  const salida = [];
  const recorrer = (nodo, ruta) => {
    if (!nodo || typeof nodo !== "object") return;
    for (const [nombre, hijo] of Object.entries(nodo)) {
      if (nombre.startsWith("jcr:") || nombre.startsWith(":")) continue;
      const camino = `${ruta}/${nombre}`;
      if (/\.pdf$/i.test(nombre)) salida.push(camino);
      else if (hijo && typeof hijo === "object") recorrer(hijo, camino);
    }
  };
  recorrer(objeto, rutaBase);
  return [...new Set(salida)];
}

export const permitida = (ruta, prohibidas) => !prohibidas.some((p) => ruta.startsWith(p));

// ── Bajar ──────────────────────────────────────────────────────────────────

async function traerTexto(url) {
  const r = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** Los enlaces a PDF de una página que parecen una ficha técnica. */
export function pdfsDeLaPagina(html, base) {
  const enlaces = [...html.matchAll(/href\s*=\s*["']([^"']+\.pdf[^"']*)["']/gi)].map((m) => m[1]);
  return [...new Set(enlaces)]
    .map((h) => { try { return new URL(h, base).href; } catch { return null; } })
    .filter(Boolean)
    // El nombre del archivo tiene que hablar de una ficha. Sin este filtro se
    // bajan los folletos, las listas de precios y los manuales de garantía.
    .filter((u) => /ficha|tecnic|técnic|especificac|datasheet|specs/i.test(decodeURIComponent(u)));
}

// ── Leer el PDF ────────────────────────────────────────────────────────────

/**
 * El texto del PDF, reconstruyendo las filas.
 *
 * Una ficha técnica es una tabla, y leída en orden de lectura queda toda
 * mezclada: el valor de una columna aparece lejos de su etiqueta. Se agrupan
 * los fragmentos por su coordenada vertical, que es lo que vuelve a armar la
 * fila "Cilindrada ... 1.332 1.747".
 */
export async function textoDelPdf(datos) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(datos), useSystemFonts: true }).promise;
  const lineas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const filas = new Map();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const clave = [...filas.keys()].find((k) => Math.abs(k - y) <= 3) ?? y;
      filas.set(clave, [...(filas.get(clave) ?? []), { x: it.transform[4], t: it.str }]);
    }
    for (const y of [...filas.keys()].sort((a, b) => b - a)) {
      const linea = filas.get(y).sort((a, b) => a.x - b.x).map((c) => c.t).join(" ")
        .replace(/\s+/g, " ").trim();
      if (linea) lineas.push(linea);
    }
  }
  return lineas;
}

// ── Sacar los números ──────────────────────────────────────────────────────

/*
  Los patrones salieron de leer nueve fichas reales (Fiat, Toyota, Volkswagen,
  Peugeot, Renault, Chevrolet). Cada marca escribe distinto: "Capacidad de baúl
  (lt)", "Volumen del baúl (dm3)", "Volumen de baúl (lts)". Por eso cada campo
  tiene varias formas de nombrarse y NO se adivina: si ninguna coincide, el
  campo queda vacío y se ve en el informe.
*/
const CAMPOS = [
  { campo: "cc", etiquetas: /cilindrada/i, rango: [400, 8000] },
  { campo: "hp", etiquetas: /potencia\s*(m[aá]xima)?/i, rango: [40, 1500] },
  { campo: "baulL", etiquetas: /(capacidad|volumen)\s+(del?\s+)?(ba[uú]l|maletero)/i, rango: [50, 3000] },
  { campo: "pesoKg", etiquetas: /peso\s+(en\s+orden\s+de\s+marcha|vac[ií]o|neto)/i, rango: [500, 6000] },
  /*
    EL CONSUMO EXIGE VER LA UNIDAD, Y ES POR ALGO.

    Con un patrón suelto —solo la palabra "consumo"— se traía cualquier número
    de cualquier renglón que la mencionara: de la ficha del Corolla salía "3" y
    de la del Argo, "2". Y peor: unas marcas lo publican en l/100km (menos es
    mejor) y otras en km/l (más es mejor), así que un 18 puede ser un auto muy
    económico o uno malísimo según quién lo escribió.

    Por eso la línea tiene que decir la unidad, y el valor se convierte a
    l/100km, que es lo que guarda el formulario.
  */
  {
    campo: "consumoL100",
    etiquetas: /consumo[^]*?(l\s*\/\s*100|km\s*\/\s*l|l\/100km|km\/l)/i,
    rango: [2, 40],
    /*
      EL CONSUMO NO SE CARGA SOLO. SE PROPONE Y LO MIRA ALGUIEN.

      Probado contra nueve fichas reales, es el único campo que no se pudo
      sacar bien, y no por un patrón flojo:

       · Aparece en frases de propaganda y no en la tabla. De la ficha del
         Corolla salía "un consumo promedio urbano de 3.9 L/100 kms", que es el
         número más favorecedor de los tres ciclos.
       · Del Kwid salía "Eficiencia en consumo: 21,6 KM/L", que es el de
         carretera. El de ciclo mixto, el que sirve, es 18,2.
       · Unas marcas publican l/100km (menos es mejor) y otras km/l (más es
         mejor), así que un 18 puede ser un auto muy económico o uno malísimo.

      Convertirlo igual y darlo por bueno sería cambiar un número inventado por
      otro inventado con más pasos. Se marca para revisar, con la línea de
      donde salió, y lo decide una persona.
    */
    revisar: true,
    convertir: (valores, linea) =>
      /km\s*\/\s*l/i.test(linea)
        ? valores.map((v) => Number((100 / v).toFixed(1))).filter((v) => v >= 2 && v <= 35)
        : valores.filter((v) => v >= 2 && v <= 35),
  },
];

/**
 * Los números de una línea.
 *
 * EL PUNTO ES DE MILES O ES DECIMAL, Y HAY QUE DISTINGUIRLO. Las fichas
 * argentinas escriben "1.332" para mil trescientos treinta y dos y "6,1" para
 * seis coma uno, pero algunos documentos mezclan y ponen "3.9 L/100 km".
 *
 * La regla que los separa: un grupo de miles tiene SIEMPRE tres dígitos. Así
 * que "1.332" es un entero y "3.9" es un decimal. Sin esto, "3.9" se leía como
 * dos números —un 3 y un 9— y el consumo del Corolla salía "3/9".
 *
 * El orden de las alternativas importa: la primera que coincide gana, así que
 * las formas largas van antes que las cortas.
 */
export function numerosDe(linea) {
  const formas = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+\.\d{1,2}(?!\d)|\d+/g;
  return [...linea.matchAll(formas)]
    .map((m) => {
      const t = m[0];
      // Con coma decimal, los puntos son de miles. Sin coma, un punto seguido
      // de uno o dos dígitos es la parte decimal.
      const limpio = t.includes(",")
        ? t.replace(/\./g, "").replace(",", ".")
        : (/\.\d{3}/.test(t) ? t.replace(/\./g, "") : t);
      return Number(limpio);
    })
    .filter((n) => Number.isFinite(n));
}

export function sacarEspecificaciones(lineas) {
  const salida = {};
  for (const { campo, etiquetas, rango, convertir, revisar } of CAMPOS) {
    for (const linea of lineas) {
      if (!etiquetas.test(linea)) continue;
      const crudos = numerosDe(linea).filter((n) => n >= rango[0] && n <= rango[1]);
      const valores = convertir ? convertir(crudos, linea) : crudos;
      if (!valores.length) continue;
      salida[campo] = {
        // Todas las versiones de esa fila, no solo la primera: una ficha con
        // tres columnas son tres autos distintos.
        valores: [...new Set(valores)],
        // La línea cruda viaja con el dato para poder revisarlo sin volver a
        // abrir el PDF. Es lo que permite darse cuenta de que un "3" salió de
        // "cm3" y no de una cilindrada.
        linea: linea.slice(0, 160),
        ...(revisar ? { revisar: true } : {}),
      };
      break;
    }
  }
  return salida;
}

// ── El recorrido ───────────────────────────────────────────────────────────

/*
  El recorrido corre SOLO cuando se ejecuta este archivo. Importado —desde
  las pruebas— no sale a internet ni escribe nada.
*/
const ejecutado =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (ejecutado) {
const pedidas = process.argv.slice(2).map((s) => s.toLowerCase());
const aRecorrer = Object.entries(MARCAS).filter(([n]) => !pedidas.length || pedidas.includes(n));

mkdirSync(CARPETA, { recursive: true });
const informe = existsSync(INFORME) ? JSON.parse(readFileSync(INFORME, "utf8")) : {};

for (const [marca, base] of aRecorrer) {
  console.log(`\n=== ${marca} (${base})`);

  const { prohibidas, sitemaps } = await rutasProhibidas(base);
  if (prohibidas.includes("/")) {
    console.log("  el sitio pide que no se lo recorra. Se saltea.");
    continue;
  }
  console.log(`  robots.txt: ${prohibidas.length} rutas cerradas, ${sitemaps.length} sitemap(s) declarado(s)`);

  const encontrados = new Set();

  /*
    PRIMERO LA CARPETA CONOCIDA, SI LA HAY.

    Es el camino bueno cuando existe: una sola llamada devuelve todas las
    fichas de la marca, sin recorrer el sitio. Se prueban varios niveles de
    profundidad porque el gestor devuelve solo hasta donde se le pide, y las
    marcas separan las fichas en subcarpetas por año o por modelo.
  */
  /*
    Si no se conoce la carpeta de esta marca, se la busca bajando por el árbol
    del gestor. Es la parte que evita tener que escribir once rutas a ciegas.
  */
  const carpetasDeEstaMarca = CARPETAS_DE_FICHAS[marca] ?? [];
  if (!carpetasDeEstaMarca.length && permitida(RAIZ_DAM, prohibidas)) {
    console.log("  carpeta desconocida: se busca bajando por el gestor");
    const cola = [RAIZ_DAM];
    const visitadas = new Set();
    let pedidos = 0;

    while (cola.length && pedidos < NODOS_POR_MARCA) {
      const nodo = cola.shift();
      if (visitadas.has(nodo) || !permitida(nodo, prohibidas)) continue;
      visitadas.add(nodo);
      pedidos++;
      try {
        const { pdfs, carpetas } = hijosDeJson(JSON.parse(await traerTexto(`${base}${nodo}.1.json`)));
        pdfs.forEach((n) => { if (SUENA_A_FICHA.test(n)) encontrados.add(`${base}${nodo}/${n}`); });
        for (const nombre of carpetas) {
          // Desde la raíz se mira todo —ahí están las marcas—; más abajo, solo
          // lo que puede llevar a una ficha argentina.
          if (nodo === RAIZ_DAM || CARPETA_INTERESANTE.test(nombre)) cola.push(`${nodo}/${nombre}`);
        }
        if (pdfs.length) console.log(`    ${nodo.slice(-52).padEnd(54)} ${pdfs.length} pdf`);
      } catch { /* una carpeta que no contesta no corta la búsqueda */ }
      await dormir(ESPERA_MS);
    }
    console.log(`  explorado: ${pedidos} carpetas, ${encontrados.size} ficha(s) encontradas`);
  }

  for (const carpeta of carpetasDeEstaMarca) {
    if (!permitida(carpeta, prohibidas)) { console.log(`  ${carpeta} -> cerrada por robots.txt`); continue; }
    for (const nivel of NIVELES_JSON) {
      try {
        const crudo = await traerTexto(`${base}${carpeta}.${nivel}.json`);
        const pdfs = pdfsDeJson(JSON.parse(crudo), base + carpeta);
        pdfs.forEach((u) => encontrados.add(u));
        console.log(`  carpeta ${carpeta.slice(-34).padEnd(36)} nivel ${nivel}: ${pdfs.length} ficha(s)`);
        // Con que un nivel conteste alcanza; los más profundos repiten.
        if (pdfs.length) break;
      } catch (e) {
        console.log(`  carpeta ${carpeta.slice(-34).padEnd(36)} nivel ${nivel}: ${e.message}`);
      }
      await dormir(ESPERA_MS);
    }
  }

  /*
    DE DÓNDE SALE LA LISTA DE PÁGINAS.

    Primero el sitemap que el propio robots.txt declara. Si no declara ninguno,
    se prueban los dos nombres de siempre. Y si tampoco, queda la home como
    último recurso, que es lo que hacía la versión anterior y lo que casi nunca
    alcanza en un sitio hecho con JavaScript.
  */
  const porProbar = sitemaps.length ? [...sitemaps] : [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];
  const vistos = new Set();
  const direcciones = new Set();

  while (porProbar.length && direcciones.size < 6000) {
    const cual = porProbar.shift();
    if (vistos.has(cual)) continue;
    vistos.add(cual);
    try {
      const xml = await traerTexto(cual);
      const encontradas = urlsDeSitemap(xml);
      // Un sitemap puede ser un índice que apunta a otros sitemaps.
      for (const u of encontradas) {
        if (/\.xml(\.gz)?(\?|$)/i.test(u)) { if (vistos.size < 40) porProbar.push(u); }
        else direcciones.add(u);
      }
      console.log(`  sitemap ${cual.replace(base, "").slice(0, 44).padEnd(46)} ${encontradas.length} direcciones`);
    } catch (e) {
      console.log(`  sitemap ${cual.replace(base, "").slice(0, 44).padEnd(46)} ${e.message}`);
    }
    await dormir(ESPERA_MS);
  }

  // Los PDF que el propio sitemap lista, que es el otro buen caso.
  for (const u of direcciones) {
    if (/\.pdf(\?|$)/i.test(u) && SUENA_A_FICHA.test(decodeURIComponent(u))) encontrados.add(u);
  }
  console.log(`  ${direcciones.size} direcciones en total · ${encontrados.size} PDF de ficha listados`);

  /*
    Las páginas que hablan de fichas y todavía no son un PDF: ahí adentro suele
    estar el enlace. Se abren de a una, con pausa, y con tope: no hace falta
    recorrer un sitio entero para encontrar veinte fichas.
  */
  const candidatas = [...direcciones]
    .filter((u) => !/\.(pdf|jpg|png|webp|svg|css|js)(\?|$)/i.test(u))
    .filter((u) => SUENA_A_FICHA.test(decodeURIComponent(u)))
    .slice(0, PAGINAS_POR_MARCA);

  if (!direcciones.size) {
    console.log("  sin sitemap utilizable, se prueba la home");
    candidatas.push(base);
  } else if (!encontrados.size && !candidatas.length) {
    /*
      El sitio contestó y publicó su lista de páginas, pero ninguna dice
      "ficha" ni "técnica". O esta marca no publica fichas, o las nombra de
      otra manera. Se muestran unas cuantas direcciones de muestra: con verlas
      se ajusta el patrón de una, sin tener que volver a recorrer todo.
    */
    console.log("  ninguna direccion suena a ficha tecnica. Muestra de lo que hay:");
    for (const u of [...direcciones].slice(0, 12)) console.log(`      ${u.replace(base, "")}`);
  }

  for (const pagina of candidatas) {
    const ruta = pagina.replace(base, "") || "/";
    if (!permitida(ruta, prohibidas)) { console.log(`  ${ruta.slice(0, 46)} -> cerrada por robots.txt`); continue; }
    try {
      const pdfs = pdfsDeLaPagina(await traerTexto(pagina), base);
      pdfs.forEach((u) => encontrados.add(u));
      console.log(`  ${ruta.slice(0, 46).padEnd(48)} ${pdfs.length} ficha(s)`);
    } catch (e) {
      console.log(`  ${ruta.slice(0, 46).padEnd(48)} ${e.message}`);
    }
    await dormir(ESPERA_MS);
  }

  for (const url of encontrados) {
    const nombre = decodeURIComponent(url.split("/").pop().split("?")[0]).replace(/[^\w.-]/g, "_");
    const destino = join(CARPETA, `${marca}__${nombre}`);
    try {
      const r = await fetch(url, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const datos = await r.arrayBuffer();
      writeFileSync(destino, Buffer.from(datos));

      const lineas = await textoDelPdf(datos);
      const specs = sacarEspecificaciones(lineas);
      informe[`${marca}/${nombre}`] = {
        marca, url, archivo: destino,
        paginas: undefined,
        // La primera línea con contenido suele ser el título del documento, y
        // es lo que dice de qué modelo y año es la ficha.
        encabezado: lineas.slice(0, 6),
        especificaciones: specs,
      };
      const hallados = Object.keys(specs);
      console.log(`  bajada ${nombre.slice(0, 48).padEnd(50)} ${hallados.length ? hallados.join(", ") : "SIN DATOS LEGIBLES"}`);
    } catch (e) {
      console.log(`  falló  ${nombre.slice(0, 48).padEnd(50)} ${e.message}`);
    }
    await dormir(ESPERA_MS);
  }
}

writeFileSync(INFORME, JSON.stringify(informe, null, 2));
console.log(`\nInforme escrito en ${INFORME} (${Object.keys(informe).length} fichas).`);
console.log("Los PDF quedaron en scripts/fichas/. Mandá el .json, que es chico.");
}
