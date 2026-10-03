// ============================================================================
//  Pruebas del bajador de fichas técnicas
// ----------------------------------------------------------------------------
//  Lo que sale a internet no se prueba acá: eso depende de que las marcas no
//  muevan sus páginas, y una prueba que falla porque Volkswagen rediseñó el
//  sitio no dice nada sobre si el código está bien.
//
//  Lo que sí se prueba son las tres piezas que deciden si un número entra bien
//  o entra mal, que son las que fallan en silencio:
//
//    · leer un número (el punto, ¿es de miles o es la coma decimal?)
//    · elegir qué enlaces son una ficha y cuáles son un folleto
//    · respetar lo que el robots.txt pide
//
//  Las líneas de ejemplo son TEXTUALES de las nueve fichas con las que se
//  armó esto (Fiat, Toyota, Volkswagen, Peugeot, Renault, Chevrolet). No son
//  inventadas: son exactamente lo que hay que saber leer.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  numerosDe, sacarEspecificaciones, pdfsDeLaPagina, permitida,
  leerRobots, urlsDeSitemap, pdfsDeJson, hijosDeJson, lineasDeHtml,
  modelosDeLaTabla, normalizarRuta,
} from "./fichas.mjs";

// ── Leer los números ───────────────────────────────────────────────────────

test("el punto de miles no se confunde con la coma decimal", () => {
  assert.deepEqual(numerosDe("Cilindrada total (cm3) 1.332 1.747"), [3, 1332, 1747]);
  assert.deepEqual(numerosDe("Peso en orden de marcha (kg) 1.136 1.225 1.258"), [1136, 1225, 1258]);
  assert.deepEqual(numerosDe("Consumo mixto 6,1"), [6.1]);
});

test("un punto con uno o dos decimales ES decimal", () => {
  /*
    EL BUG QUE ESTO CUIDA. "3.9" se leía como dos números, un 3 y un 9, porque
    todo punto se tomaba como separador de miles. El consumo del Corolla salía
    "3/9" y parecía un dato legítimo. La regla que los separa: un grupo de
    miles tiene siempre TRES dígitos.
  */
  assert.deepEqual(numerosDe("consumo promedio urbano de 3.9 L/100 kms"), [3.9, 100]);
  assert.deepEqual(numerosDe("12.5 kgm"), [12.5]);
  assert.deepEqual(numerosDe("1.332"), [1332]);
});

test("aguanta líneas sin números y texto suelto", () => {
  assert.deepEqual(numerosDe("Combustible Nafta"), []);
  assert.deepEqual(numerosDe(""), []);
});

// ── Sacar las especificaciones ─────────────────────────────────────────────

test("saca todas las columnas de una fila, no solo la primera", () => {
  // Una ficha con tres columnas son tres autos distintos, y hay que verlos a
  // los tres para poder preguntar cuál es el de la persona.
  const s = sacarEspecificaciones(["Peso en orden de marcha (kg) 1.136 1.225 1.258"]);
  assert.deepEqual(s.pesoKg.valores, [1136, 1225, 1258]);
});

test("descarta los números fuera de rango", () => {
  // El "3" de "cm3" no es una cilindrada.
  const s = sacarEspecificaciones(["Cilindrada total (cm3) 1.332 1.747"]);
  assert.deepEqual(s.cc.valores, [1332, 1747]);
});

test("guarda la línea de donde salió cada número", () => {
  // Sin esto no hay forma de revisar un dato sin volver a abrir el PDF.
  const s = sacarEspecificaciones(["Capacidad de baúl (lt) 525"]);
  assert.equal(s.baulL.valores[0], 525);
  assert.match(s.baulL.linea, /Capacidad de baúl/);
});

test("el consumo queda marcado para revisar, nunca se da por bueno", () => {
  /*
    Es el único campo que no se pudo sacar bien de nueve fichas: aparece en
    frases de propaganda, en tres ciclos distintos y en dos unidades. Se
    propone, no se carga.
  */
  const s = sacarEspecificaciones(["Consumo en ciudad / mixto / carretera [km/l] 14,2 / 18,2 / 21,6"]);
  assert.equal(s.consumoL100.revisar, true);
});

test("el consumo en km/l se convierte a l/100km", () => {
  const s = sacarEspecificaciones(["Eficiencia en consumo: 21,6 KM / L"]);
  // 100 / 21,6 = 4,6. El formulario guarda l/100km.
  assert.ok(s.consumoL100.valores.includes(4.6));
});

test("una ficha sin un dato no lo inventa", () => {
  const s = sacarEspecificaciones(["Combustible Nafta", "Tracción Delantera"]);
  assert.deepEqual(Object.keys(s), []);
});

// ── Qué enlaces son una ficha ──────────────────────────────────────────────

test("se queda con los PDF que dicen ser una ficha", () => {
  const html = `
    <a href="/ficha-tecnica/Ficha-Tecnica-Cronos-MY21.pdf">Ficha</a>
    <a href="/folletos/catalogo-comercial.pdf">Folleto</a>
    <a href="/legales/garantia.pdf">Garantía</a>
    <a href="/specs/argo-datasheet.pdf">Specs</a>`;
  const encontrados = pdfsDeLaPagina(html, "https://www.fiat.com.ar");
  assert.equal(encontrados.length, 2);
  assert.ok(encontrados.some((u) => u.includes("Ficha-Tecnica-Cronos")));
  assert.ok(encontrados.some((u) => u.includes("datasheet")));
  assert.ok(!encontrados.some((u) => u.includes("garantia")));
});

test("las direcciones relativas se vuelven absolutas", () => {
  const u = pdfsDeLaPagina('<a href="../fichas/ficha-tecnica.pdf">x</a>', "https://www.fiat.com.ar/modelos/");
  assert.ok(u[0].startsWith("https://www.fiat.com.ar/"));
});

test("no se repite el mismo PDF enlazado dos veces", () => {
  const html = '<a href="/a/ficha.pdf">1</a><a href="/a/ficha.pdf">2</a>';
  assert.equal(pdfsDeLaPagina(html, "https://x.com.ar").length, 1);
});

// ── Respetar el robots.txt ─────────────────────────────────────────────────

test("no se entra a una ruta que el sitio pide no recorrer", () => {
  assert.equal(permitida("/modelos/cronos", ["/admin", "/buscar"]), true);
  assert.equal(permitida("/admin/usuarios", ["/admin"]), false);
  assert.equal(permitida("/lo-que-sea", ["/"]), false, "Disallow: / cierra todo");
});

test("sin reglas, se puede entrar", () => {
  assert.equal(permitida("/cualquier/cosa", []), true);
});

test("del robots.txt salen las rutas cerradas Y donde esta el sitemap", () => {
  const { prohibidas, sitemaps } = leerRobots(`
    Sitemap: https://www.marca.com.ar/sitemap_index.xml

    User-agent: Googlebot
    Disallow: /solo-para-google

    User-agent: *
    Disallow: /admin
    Disallow: /buscar
    Allow: /
  `);
  assert.deepEqual(prohibidas, ["/admin", "/buscar"], "solo las reglas del agente *");
  assert.deepEqual(sitemaps, ["https://www.marca.com.ar/sitemap_index.xml"]);
});

test("la linea Sitemap se encuentra aunque este en cualquier lado", () => {
  // No pertenece a ningun bloque de agente, asi que se busca en todo el texto.
  const { sitemaps } = leerRobots("User-agent: *\nDisallow:\n\nSitemap: https://x.com.ar/sm.xml\n");
  assert.deepEqual(sitemaps, ["https://x.com.ar/sm.xml"]);
});

test("un robots sin sitemap no inventa ninguno", () => {
  assert.deepEqual(leerRobots("User-agent: *\nDisallow: /nada\n").sitemaps, []);
});

// ── El sitemap ─────────────────────────────────────────────────────────────

test("del sitemap salen las direcciones", () => {
  const xml = `<?xml version="1.0"?>
    <urlset><url><loc>https://x.com.ar/cronos</loc><lastmod>2026-01-01</lastmod></url>
    <url><loc> https://x.com.ar/fichas/cronos.pdf </loc></url></urlset>`;
  assert.deepEqual(urlsDeSitemap(xml),
    ["https://x.com.ar/cronos", "https://x.com.ar/fichas/cronos.pdf"]);
});

test("un indice de sitemaps se lee igual: son las mismas etiquetas", () => {
  const xml = `<sitemapindex><sitemap><loc>https://x.com.ar/sm-1.xml</loc></sitemap>
    <sitemap><loc>https://x.com.ar/sm-2.xml</loc></sitemap></sitemapindex>`;
  assert.equal(urlsDeSitemap(xml).length, 2);
  assert.ok(urlsDeSitemap(xml).every((u) => u.endsWith(".xml")));
});

test("un sitemap vacio o roto no rompe nada", () => {
  assert.deepEqual(urlsDeSitemap(""), []);
  assert.deepEqual(urlsDeSitemap("<html>pagina de error</html>"), []);
});

test("una direccion sin https:// se arregla, no se pega como ruta", () => {
  /*
    EL BUG DE CITROEN. Su sitemap lista "www.citroen.com.ar/c3.html" sin
    esquema. Resuelto como ruta relativa quedaba
    "https://www.citroen.com.ar/www.citroen.com.ar/c3.html", que es un 404 que
    no parece un error. Se perdian las 106 paginas del sitio.
  */
  assert.deepEqual(
    urlsDeSitemap("<loc>www.citroen.com.ar/c3.html</loc>", "https://www.citroen.com.ar"),
    ["https://www.citroen.com.ar/c3.html"]);
});

test("una direccion relativa SI se resuelve contra el sitio", () => {
  assert.deepEqual(
    urlsDeSitemap("<loc>/renegade.html</loc>", "https://www.jeep.com.ar"),
    ["https://www.jeep.com.ar/renegade.html"]);
});

test("una direccion completa se deja como esta", () => {
  assert.deepEqual(
    urlsDeSitemap("<loc>https://otro.com.ar/a</loc>", "https://www.jeep.com.ar"),
    ["https://otro.com.ar/a"]);
});

// ── Buscar los autos que nos importan ──────────────────────────────────────

test("los modelos a buscar salen de la tabla, no de lo que liste el sitio", () => {
  /*
    Ford publica sus fichas en PDF y anduvo, pero la primera corrida se gasto
    el cupo en Mustang, Transit y F-150 y no llego a la Ranger. El sitio no
    sabe cuales nos sirven; la tabla si.
  */
  const autos = [
    { marca: "Ford", modelo: "Ranger" }, { marca: "Ford", modelo: "EcoSport" },
    { marca: "Fiat", modelo: "Cronos" },
  ];
  assert.deepEqual(modelosDeLaTabla("Ford", autos), ["ranger", "ecosport"]);
  assert.deepEqual(modelosDeLaTabla("ford", autos), ["ranger", "ecosport"]);
  assert.deepEqual(modelosDeLaTabla("Chery", autos), []);
});

test("un modelo con espacios o acentos se busca como va en una direccion", () => {
  const autos = [{ marca: "Volkswagen", modelo: "Gol Trend" }, { marca: "Citroen", modelo: "C4 Cactus" }];
  assert.deepEqual(modelosDeLaTabla("Volkswagen", autos), ["gol-trend"]);
  assert.deepEqual(modelosDeLaTabla("Citroën", autos), ["c4-cactus"]);
});

test("normalizarRuta deja la direccion comparable con un nombre de modelo", () => {
  assert.ok(normalizarRuta("/crossovers-suvs-4x4/Territory/modelos/SEL/").includes("territory"));
  assert.ok(normalizarRuta("https://x.com.ar/es/modelos/nuevo-t-cross.html").includes("t-cross"));
});

// ── El listado de la carpeta de fichas ─────────────────────────────────────

test("del listado JSON salen los PDF, incluso en subcarpetas", () => {
  // Las marcas separan las fichas por año o por modelo, asi que hay que bajar.
  const nodo = {
    "jcr:primaryType": "sling:Folder",
    ":type": "dam/folder",
    "Ficha-Tecnica-Cronos-MY21.pdf": { "jcr:primaryType": "dam:Asset" },
    my22: {
      "jcr:primaryType": "sling:Folder",
      "Ficha-Tecnica-Argo-MY22.pdf": { "jcr:primaryType": "dam:Asset" },
    },
  };
  const pdfs = pdfsDeJson(nodo, "https://www.fiat.com.ar/content/dam/fiat/argentina/ficha-tecnica");
  assert.equal(pdfs.length, 2);
  assert.ok(pdfs.some((u) => u.endsWith("/Ficha-Tecnica-Cronos-MY21.pdf")));
  assert.ok(pdfs.some((u) => u.endsWith("/my22/Ficha-Tecnica-Argo-MY22.pdf")));
});

test("los metadatos del gestor no se confunden con archivos", () => {
  // Todo lo que empieza con "jcr:" o ":" es del gestor de contenidos, no es
  // contenido. Sin saltearlos, el recorrido se mete en los metadatos.
  const pdfs = pdfsDeJson({ "jcr:createdBy": "admin", ":items": {}, "x.pdf": {} }, "https://x.com.ar/dam");
  assert.deepEqual(pdfs, ["https://x.com.ar/dam/x.pdf"]);
});

test("una carpeta sin PDF devuelve nada, y una respuesta rara tampoco rompe", () => {
  assert.deepEqual(pdfsDeJson({ foto: { "a.jpg": {} } }, "https://x.com.ar/dam"), []);
  assert.deepEqual(pdfsDeJson(null, "https://x.com.ar/dam"), []);
  assert.deepEqual(pdfsDeJson("no es un objeto", "https://x.com.ar/dam"), []);
});

test("hijosDeJson separa los PDF de las carpetas por donde seguir", () => {
  const { pdfs, carpetas } = hijosDeJson({
    "jcr:primaryType": "sling:Folder",
    "Ficha-Cronos.pdf": { "jcr:primaryType": "dam:Asset" },
    argentina: { "jcr:primaryType": "sling:Folder" },
    "logo.png": { "jcr:primaryType": "dam:Asset" },
    "nombre-suelto": "no es un nodo",
  });
  assert.deepEqual(pdfs, ["Ficha-Cronos.pdf"]);
  // El png es un archivo, no una carpeta, pero igual se lista como candidato:
  // distinguirlo por extensión seria adivinar, y bajar por el devuelve vacio.
  assert.ok(carpetas.includes("argentina"));
  assert.ok(!carpetas.includes("nombre-suelto"), "lo que no es un nodo no se sigue");
});

test("hijosDeJson aguanta una respuesta que no es un listado", () => {
  assert.deepEqual(hijosDeJson(null), { pdfs: [], carpetas: [] });
  assert.deepEqual(hijosDeJson("<html>404</html>"), { pdfs: [], carpetas: [] });
});

// ── Leer la ficha de la pagina ─────────────────────────────────────────────

test("una tabla HTML deja la etiqueta y el valor en la misma linea", () => {
  /*
    LO QUE ESTO CUIDA. Si se tiran las etiquetas de golpe, cada celda cae en su
    propio renglon y ningun patron encuentra nada: "Cilindrada" por un lado y
    "1.332" por el otro. Hay que cerrar la FILA con un salto y la CELDA con un
    espacio.
  */
  const html = `<table>
    <tr><td>Cilindrada</td><td>1.332 cm3</td></tr>
    <tr><th>Potencia máxima</th><td>99 CV</td></tr>
  </table>`;
  const lineas = lineasDeHtml(html);
  assert.ok(lineas.some((l) => /Cilindrada\s+1\.332/.test(l)), lineas.join(" | "));
  assert.ok(lineas.some((l) => /Potencia máxima\s+99/.test(l)));
});

test("una lista de definiciones tambien", () => {
  const lineas = lineasDeHtml("<dl><dt>Capacidad de baúl</dt><dd>525 lts</dd></dl>");
  assert.ok(lineas.some((l) => /Capacidad de baúl\s+525/.test(l)), lineas.join(" | "));
});

test("de una pagina de ficha salen los mismos numeros que de un PDF", () => {
  const html = `<html><body>
    <script>var basura = {cilindrada: 9999};</script>
    <table><tr><td>Cilindrada (cc)</td><td>1.332</td></tr>
    <tr><td>Potencia máxima (CV)</td><td>99</td></tr>
    <tr><td>Capacidad de baúl (lts)</td><td>300</td></tr>
    <tr><td>Peso en orden de marcha (kg)</td><td>1.114</td></tr></table>
  </body></html>`;
  const s = sacarEspecificaciones(lineasDeHtml(html));
  assert.equal(s.cc.valores[0], 1332);
  assert.equal(s.hp.valores[0], 99);
  assert.equal(s.baulL.valores[0], 300);
  assert.equal(s.pesoKg.valores[0], 1114);
});

test("lo que esta adentro de un script no cuenta como dato", () => {
  // Las paginas traen configuracion y analitica en etiquetas script. Si se
  // leyera, saldrian numeros que no tienen nada que ver con el auto.
  const lineas = lineasDeHtml("<script>var cilindrada = 9999;</script><p>Cilindrada 1.332</p>");
  assert.ok(!lineas.join(" ").includes("9999"));
});

test("una pagina vacia o rota no rompe nada", () => {
  assert.deepEqual(lineasDeHtml(""), []);
  assert.deepEqual(lineasDeHtml(null), []);
  assert.deepEqual(lineasDeHtml("<div></div>"), []);
});
