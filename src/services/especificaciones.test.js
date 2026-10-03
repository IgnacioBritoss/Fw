// ============================================================================
//  Pruebas de la tabla de autos y de su búsqueda
// ----------------------------------------------------------------------------
//  Dos cosas distintas se prueban acá, y la segunda importa más de lo que
//  parece:
//
//   1. Que la búsqueda encuentre lo que tiene que encontrar y —sobre todo— que
//      NO encuentre lo que no. Un acierto equivocado completa el formulario con
//      los datos de otro auto, y eso no se nota: son números plausibles en los
//      campos correctos.
//
//   2. Que la tabla sea coherente. Es un archivo cargado a mano con cincuenta y
//      pico de entradas y nueve números cada una: un cero de más en el peso o
//      dos generaciones con los años pisados no los va a ver nadie leyendo. Las
//      pruebas del final recorren la tabla entera y los encuentran solos.
//
//      Si alguien corrige un dato y se le va la mano, se entera acá y no en
//      una publicación.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizar, marcaCanonica, modeloCanonico,
  buscarEspecificaciones, comoFormulario,
} from "./especificaciones.js";
import { AUTOS } from "../data/autosArgentina.js";

// ── Normalizar lo que la gente escribe ─────────────────────────────────────

test("normalizar saca acentos, mayúsculas y espacios de más", () => {
  assert.equal(normalizar("  Citroën  "), "citroen");
  assert.equal(normalizar("VOLKSWAGEN"), "volkswagen");
  assert.equal(normalizar("Gol   Trend"), "gol trend");
});

test("normalizar convierte los signos en espacios, no los borra", () => {
  // Si los borrara, "hr-v" quedaría "hrv" por un camino distinto al de la tabla
  // de alias, que es la que tiene que decidir eso.
  assert.equal(normalizar("HR-V"), "hr v");
  assert.equal(normalizar("Up!"), "up");
  assert.equal(normalizar("C4 Cactus"), "c4 cactus");
});

test("normalizar aguanta que no venga nada", () => {
  assert.equal(normalizar(null), "");
  assert.equal(normalizar(undefined), "");
  assert.equal(normalizar(123), "123");
});

// ── Los apodos ─────────────────────────────────────────────────────────────

test("marcaCanonica resuelve como escribe la gente", () => {
  assert.equal(marcaCanonica("VW"), "volkswagen");
  assert.equal(marcaCanonica("vw"), "volkswagen");
  assert.equal(marcaCanonica("Chevy"), "chevrolet");
  assert.equal(marcaCanonica("Citroën"), "citroen");
  assert.equal(marcaCanonica("Toyota"), "toyota");
});

test("modeloCanonico resuelve los apodos de cada marca", () => {
  assert.equal(modeloCanonico("VW", "Gol"), "gol trend");
  assert.equal(modeloCanonico("Citroen", "Cactus"), "c4 cactus");
});

test("un apodo con guion queda comparable con la tabla", () => {
  // El bug que esto cuida: el alias devolvía "t-cross" y la tabla normalizada
  // dice "t cross", así que no coincidían y el auto se iba a la IA teniendo
  // los datos cargados. Las tres formas tienen que terminar igual.
  assert.equal(modeloCanonico("VW", "T-Cross"), "t cross");
  assert.equal(modeloCanonico("VW", "T Cross"), "t cross");
  assert.equal(modeloCanonico("VW", "tcross"), "t cross");
  assert.equal(modeloCanonico("Honda", "HR-V"), "hr v");
  assert.equal(modeloCanonico("Honda", "HRV"), "hr v");
});

test("los modelos con guion de la tabla ahora SÍ se encuentran", () => {
  assert.ok(buscarEspecificaciones("VW", "T-Cross", 2021), "T-Cross");
  assert.ok(buscarEspecificaciones("Volkswagen", "tcross", 2021), "tcross");
  assert.ok(buscarEspecificaciones("Honda", "HR-V", 2021), "HR-V");
  assert.ok(buscarEspecificaciones("Honda", "hrv", 2021), "hrv");
});

// ── Encontrar el auto ──────────────────────────────────────────────────────

test("encuentra un auto de la tabla", () => {
  const cronos = buscarEspecificaciones("Fiat", "Cronos", 2021);
  assert.equal(cronos.marca, "Fiat");
  assert.equal(cronos.categoria, "SEDAN");
  assert.equal(cronos.baulL, 525);
});

test("encuentra escrito como sea", () => {
  assert.ok(buscarEspecificaciones("  fiat ", "CRONOS", 2021));
  assert.ok(buscarEspecificaciones("VW", "Gol", 2018));
  assert.ok(buscarEspecificaciones("Citroën", "C3", 2020));
});

test("elige la generación por el año", () => {
  assert.equal(buscarEspecificaciones("Toyota", "Corolla", 2016).hp, 140);
  assert.equal(buscarEspecificaciones("Toyota", "Corolla", 2022).hp, 170);
  assert.equal(buscarEspecificaciones("Chevrolet", "Onix", 2015).cc, 1389);
  assert.equal(buscarEspecificaciones("Chevrolet", "Onix", 2022).cc, 999);
});

test("un modelo que dejó de venderse no aparece fuera de su rango", () => {
  assert.ok(buscarEspecificaciones("Ford", "Ka", 2018));
  assert.equal(buscarEspecificaciones("Ford", "Ka", 2024), null);
});

// ── Lo que NO tiene que encontrar ──────────────────────────────────────────
//
// Esta es la parte que justifica que la búsqueda sea exacta.

test("Corolla y Corolla Cross NO se confunden", () => {
  const corolla = buscarEspecificaciones("Toyota", "Corolla", 2022);
  const cross = buscarEspecificaciones("Toyota", "Corolla Cross", 2022);
  assert.equal(corolla.categoria, "SEDAN");
  assert.equal(cross.categoria, "SUV");
  assert.notEqual(corolla.baulL, cross.baulL);
});

test("Onix y Onix Plus NO se confunden", () => {
  assert.equal(buscarEspecificaciones("Chevrolet", "Onix", 2022).categoria, "HATCHBACK");
  assert.equal(buscarEspecificaciones("Chevrolet", "Onix Plus", 2022).categoria, "SEDAN");
});

test("un auto que no está en la tabla no devuelve nada", () => {
  assert.equal(buscarEspecificaciones("Lamborghini", "Aventador", 2021), null);
  assert.equal(buscarEspecificaciones("Fiat", "Modelo Inventado", 2021), null);
});

test("no inventa con un modelo parecido", () => {
  // "Coroll" no es "Corolla". Sin resultado se va a la IA, que es lo correcto.
  assert.equal(buscarEspecificaciones("Toyota", "Coroll", 2022), null);
  assert.equal(buscarEspecificaciones("Toyota", "Corola", 2022), null);
});

test("un año imposible no devuelve nada", () => {
  assert.equal(buscarEspecificaciones("Fiat", "Cronos", 2200), null);
  assert.equal(buscarEspecificaciones("Fiat", "Cronos", "abc"), null);
  assert.equal(buscarEspecificaciones("Fiat", "Cronos", null), null);
  assert.equal(buscarEspecificaciones("Fiat", "Cronos", 1990), null);
});

test("sin marca o sin modelo no devuelve nada", () => {
  assert.equal(buscarEspecificaciones("", "Cronos", 2021), null);
  assert.equal(buscarEspecificaciones("Fiat", "", 2021), null);
});

// ── Lo que se escribe en el formulario ─────────────────────────────────────

test("comoFormulario usa los nombres de los campos y manda texto", () => {
  const campos = comoFormulario(buscarEspecificaciones("Fiat", "Cronos", 2021));
  assert.equal(campos.category, "SEDAN");
  assert.equal(campos.fuel, "GASOLINE");
  assert.equal(campos.doors, "4");
  assert.equal(campos.trunkCapacityLiters, "525");
  assert.equal(typeof campos.horsePower, "string");
});

test("comoFormulario NO manda los datos que no tenemos", () => {
  // La Hilux no tiene litros de baúl: es una caja de carga, no un baúl.
  const campos = comoFormulario(buscarEspecificaciones("Toyota", "Hilux", 2020));
  assert.equal("trunkCapacityLiters" in campos, false);
  assert.equal(campos.fuel, "DIESEL");
});

test("comoFormulario con nada devuelve nada", () => {
  assert.deepEqual(comoFormulario(null), {});
  assert.deepEqual(comoFormulario(undefined), {});
});

// ── Que la tabla sea coherente ─────────────────────────────────────────────
//
// Los límites son los mismos que ya valida el formulario (getSpecWarnings en
// PublishCar). Si un dato de la tabla los pasara, el formulario se completaría
// solo y acto seguido se quejaría de lo que él mismo escribió.

const LIMITES = {
  puertas: [2, 7], asientos: [2, 9], hp: [40, 1500], cc: [400, 8000],
  baulL: [50, 3000], consumoL100: [2, 35], pesoKg: [500, 6000],
};
const CATEGORIAS = new Set(["HATCHBACK", "SEDAN", "SUV", "PICKUP", "VAN", "COUPE", "CONVERTIBLE", "ELECTRIC"]);
const COMBUSTIBLES = new Set(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "GNC"]);

test("la tabla no tiene valores fuera de los rangos del formulario", () => {
  for (const auto of AUTOS) {
    const quien = `${auto.marca} ${auto.modelo} ${auto.desde}`;
    for (const [campo, [min, max]] of Object.entries(LIMITES)) {
      const v = auto[campo];
      if (v === null || v === undefined) continue;
      assert.ok(v >= min && v <= max, `${quien}: ${campo}=${v} fuera de ${min}-${max}`);
    }
  }
});

test("la tabla usa categorías y combustibles que el backend conoce", () => {
  for (const auto of AUTOS) {
    const quien = `${auto.marca} ${auto.modelo} ${auto.desde}`;
    assert.ok(CATEGORIAS.has(auto.categoria), `${quien}: categoría ${auto.categoria}`);
    assert.ok(COMBUSTIBLES.has(auto.combustible), `${quien}: combustible ${auto.combustible}`);
  }
});

test("los años de cada entrada tienen sentido", () => {
  const tope = new Date().getFullYear();
  for (const auto of AUTOS) {
    const quien = `${auto.marca} ${auto.modelo} ${auto.desde}`;
    assert.ok(auto.desde >= 1950 && auto.desde <= tope, `${quien}: desde ${auto.desde}`);
    if (auto.hasta !== null) {
      assert.ok(auto.hasta >= auto.desde, `${quien}: hasta ${auto.hasta} antes que desde`);
      assert.ok(auto.hasta <= tope, `${quien}: hasta ${auto.hasta} en el futuro`);
    }
  }
});

test("dos generaciones del mismo auto NO se pisan de años", () => {
  // Es el error que haría que la búsqueda devuelva cualquiera de las dos.
  const tope = new Date().getFullYear();
  const porModelo = new Map();
  for (const auto of AUTOS) {
    const clave = `${normalizar(auto.marca)}|${normalizar(auto.modelo)}`;
    porModelo.set(clave, [...(porModelo.get(clave) ?? []), auto]);
  }
  for (const [clave, generaciones] of porModelo) {
    const ordenadas = [...generaciones].sort((a, b) => a.desde - b.desde);
    for (let i = 1; i < ordenadas.length; i++) {
      const previa = ordenadas[i - 1];
      assert.ok(
        (previa.hasta ?? tope) < ordenadas[i].desde,
        `${clave}: ${previa.desde}-${previa.hasta} se pisa con ${ordenadas[i].desde}`,
      );
    }
  }
});

test("no hay dos entradas idénticas de marca, modelo y año de inicio", () => {
  const vistas = new Set();
  for (const auto of AUTOS) {
    const clave = `${normalizar(auto.marca)}|${normalizar(auto.modelo)}|${auto.desde}`;
    assert.equal(vistas.has(clave), false, `repetida: ${clave}`);
    vistas.add(clave);
  }
});

test("toda entrada dice de qué versión son los números", () => {
  // Sin esto, un dato de la tabla no se puede ni verificar ni corregir: no se
  // sabe a qué auto corresponde.
  for (const auto of AUTOS) {
    assert.ok(auto.version && auto.version.length > 2,
      `${auto.marca} ${auto.modelo} ${auto.desde} sin versión`);
  }
});
