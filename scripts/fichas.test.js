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
import { numerosDe, sacarEspecificaciones, pdfsDeLaPagina, permitida } from "./fichas.mjs";

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
