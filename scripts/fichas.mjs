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

const AGENTE = "FreewheelFichas/1.0 (proyecto educativo; lee fichas tecnicas publicas)";

/** Una pausa entre pedidos. No hay apuro y el sitio no es nuestro. */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ESPERA_MS = 1200;

/*
  DE DÓNDE SE BAJA.

  Todas estas contestaron que sí en su robots.txt (se vuelve a verificar al
  correr, no se confía en esta lista). Las páginas son los puntos de entrada
  donde suelen colgar las fichas; desde ahí se siguen los enlaces a PDF.
*/
const MARCAS = {
  fiat: { base: "https://www.fiat.com.ar", entradas: ["/", "/cronos", "/argo", "/mobi", "/toro", "/strada", "/pulse", "/fastback"] },
  toyota: { base: "https://www.toyota.com.ar", entradas: ["/", "/hilux", "/corolla", "/corolla-cross", "/yaris", "/sw4", "/rav4"] },
  volkswagen: { base: "https://www.volkswagen.com.ar", entradas: ["/", "/es/modelos.html"] },
  chevrolet: { base: "https://www.chevrolet.com.ar", entradas: ["/", "/autos", "/suvs", "/pickups"] },
  renault: { base: "https://www.renault.com.ar", entradas: ["/", "/gama.html", "/vehiculos.html"] },
  peugeot: { base: "https://www.peugeot.com.ar", entradas: ["/", "/gama.html"] },
  ford: { base: "https://www.ford.com.ar", entradas: ["/", "/suvs-y-crossovers", "/pickups-y-comerciales"] },
  nissan: { base: "https://www.nissan.com.ar", entradas: ["/", "/vehiculos.html"] },
  citroen: { base: "https://www.citroen.com.ar", entradas: ["/", "/gama.html"] },
  jeep: { base: "https://www.jeep.com.ar", entradas: ["/", "/renegade", "/compass"] },
  honda: { base: "https://www.honda.com.ar", entradas: ["/", "/autos"] },
};

// ── Permisos ───────────────────────────────────────────────────────────────

/** Las rutas que el sitio pide que no recorramos, para el agente "*". */
export async function rutasProhibidas(base) {
  try {
    const r = await fetch(`${base}/robots.txt`, {
      headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const texto = await r.text();
    const bloques = texto.split(/user-agent:/i).slice(1);
    const nuestro = bloques.find((b) => b.split(/\r?\n/)[0].trim() === "*") ?? "";
    return nuestro.split(/\r?\n/)
      .filter((l) => /^disallow:/i.test(l.trim()))
      .map((l) => l.split(":").slice(1).join(":").trim())
      .filter(Boolean);
  } catch {
    // Sin poder leer el robots no se asume que esté permitido.
    return ["/"];
  }
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

for (const [marca, { base, entradas }] of aRecorrer) {
  console.log(`\n=== ${marca} (${base})`);

  const prohibidas = await rutasProhibidas(base);
  if (prohibidas.includes("/")) {
    console.log("  el sitio pide que no se lo recorra. Se saltea.");
    continue;
  }

  const encontrados = new Set();
  for (const entrada of entradas) {
    if (!permitida(entrada, prohibidas)) { console.log(`  ${entrada} -> prohibida por robots.txt`); continue; }
    try {
      const html = await traerTexto(base + entrada);
      const pdfs = pdfsDeLaPagina(html, base);
      pdfs.forEach((u) => encontrados.add(u));
      console.log(`  ${entrada.padEnd(28)} ${pdfs.length} ficha(s)`);
    } catch (e) {
      console.log(`  ${entrada.padEnd(28)} no se pudo leer (${e.message})`);
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
