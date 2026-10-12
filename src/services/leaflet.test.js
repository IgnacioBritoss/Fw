// ============================================================================
//  Pruebas de leaflet.js — de dónde salen las baldosas del mapa
// ----------------------------------------------------------------------------
//  EL ERROR QUE ESTO CUIDA, Y YA PASÓ UNA VEZ.
//
//  La dirección de las baldosas estaba escrita cuatro veces, una en cada
//  pantalla con mapa. Tres apuntaban a OpenStreetMap y la de la búsqueda había
//  quedado apuntando a un servidor de CARTO. El día que CARTO empezó a pedir
//  una clave, el mapa de la búsqueda dejó de cargar: devolvía baldosas con
//  "API KEY REQUIRED" escrito encima. Y no se notaba del todo, porque los pines
//  son nuestros y seguían apareciendo: se veía medio mapa y medio cartel.
//
//  Cuatro copias de una dirección se separan, es cuestión de tiempo. Así que
//  ahora hay una sola y esta prueba es la que lo sostiene: no comprueba que la
//  dirección sea una en particular, comprueba que NO HAYA OTRA ESCRITA EN
//  NINGÚN LADO.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BALDOSAS, ATRIBUCION } from "./leaflet.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Todos los archivos de código de src, con su ruta y su contenido. */
function archivosDeCodigo(dir = SRC) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      salida.push(...archivosDeCodigo(ruta));
    } else if (/\.(js|jsx)$/.test(nombre)) {
      salida.push({ ruta: ruta.slice(SRC.length + 1), texto: readFileSync(ruta, "utf8") });
    }
  }
  return salida;
}

test("las baldosas salen de OpenStreetMap y traen su atribución", () => {
  assert.match(BALDOSAS, /tile\.openstreetmap\.org/);
  // Las piezas que Leaflet reemplaza. Sin alguna, el mapa pide siempre la misma
  // baldosa y se ve un mosaico repetido.
  for (const pieza of ["{s}", "{z}", "{x}", "{y}"]) {
    assert.ok(BALDOSAS.includes(pieza), `falta ${pieza}`);
  }
  // La licencia de OpenStreetMap pide que se los nombre en el mapa.
  assert.match(ATRIBUCION, /OpenStreetMap/);
});

test("NINGUNA PANTALLA ESCRIBE SU PROPIA DIRECCIÓN DE BALDOSAS", () => {
  /*
    Es la prueba que importa. Cuando alguien agregue un mapa nuevo va a copiar
    de otro archivo —es lo que pasó— y esto se lo marca antes de que la quinta
    copia empiece a envejecer por su cuenta. Se usa ponerBaldosas().
  */
  const culpables = archivosDeCodigo()
    .filter(({ ruta }) => ruta !== "services/leaflet.js" && !ruta.endsWith(".test.js"))
    .filter(({ texto }) => texto.includes("L.tileLayer(") || texto.includes("tile.openstreetmap.org"))
    .map(({ ruta }) => ruta);

  assert.deepEqual(culpables, [], `escriben su propia dirección: ${culpables.join(", ")}`);
});

test("y nadie quedó apuntando a CARTO, que ahora pide una clave", () => {
  const culpables = archivosDeCodigo()
    .filter(({ ruta }) => !ruta.endsWith(".test.js"))
    .filter(({ texto }) => texto.includes("cartocdn.com") || texto.includes("basemaps.carto"))
    .map(({ ruta }) => ruta);

  assert.deepEqual(culpables, []);
});

test("EL MODO OSCURO NO TOCA EL MAPA", () => {
  /*
    El mapa invertido quedaba con el agua naranja y los verdes grises, y
    reconocer un lugar con los colores dados vuelta cuesta. Se mira el texto de
    theme.js porque la hoja de estilos se arma ahí y no se puede ejecutar sin
    navegador; alcanza, porque lo que se cuida es que la regla no vuelva.
  */
  const tema = readFileSync(join(SRC, "services/theme.js"), "utf8");
  assert.ok(
    !/\.leaflet-tile\s*\{[^}]*filter/.test(tema),
    "volvió el filtro que oscurecía las baldosas",
  );
  assert.ok(
    !/\.leaflet-container\s*\{[^}]*background/.test(tema),
    "volvió el fondo oscuro del contenedor del mapa",
  );
});
