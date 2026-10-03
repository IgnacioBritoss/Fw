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
  buscarVersiones, buscarEspecificaciones, comoFormulario, estaVerificado,
} from "./especificaciones.js";
import { AUTOS } from "../data/autosArgentina.js";

/** La primera versión que coincide. Varias pruebas solo miran un dato del auto. */
const unaDe = (marca, modelo, anio) => buscarVersiones(marca, modelo, anio)[0];

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
  const cronos = unaDe("Fiat", "Cronos", 2021);
  assert.equal(cronos.marca, "Fiat");
  assert.equal(cronos.categoria, "SEDAN");
  assert.equal(cronos.baulL, 525);
});

test("encuentra escrito como sea", () => {
  assert.ok(unaDe("  fiat ", "CRONOS", 2021));
  assert.ok(unaDe("VW", "Gol", 2018));
  assert.ok(unaDe("Citroën", "C3", 2020));
});

test("elige la generación por el año", () => {
  assert.equal(unaDe("Toyota", "Corolla", 2016).hp, 140);
  assert.equal(unaDe("Toyota", "Corolla", 2022).cc, 1987);
  assert.equal(unaDe("Chevrolet", "Onix", 2015).cc, 1389);
  // La generación nueva del Onix vino de catálogo, que no publica cilindrada.
  assert.equal(unaDe("Chevrolet", "Onix", 2022).cc, null);
});

test("el restyling de la Hilux y de la SW4 no se le adelanta a los años viejos", () => {
  /*
    EL ERROR QUE ESTO CUIDA, Y ERA MÍO. La 2.8 de la Hilux estaba cargada con
    204 CV para todo el rango 2016 en adelante. Los 204 llegaron recién con el
    restyling de 2021: la ficha de 2017 y la de la SW4 de 2018 dan 177 CV para
    el mismo motor. Un dueño de una Hilux 2018 publicaba 27 CV que no tiene, y
    el número venía con el cartel de "ficha oficial" al lado.
  */
  const potencias = (marca, modelo, anio) =>
    buscarVersiones(marca, modelo, anio).map((v) => v.hp);

  assert.ok(potencias("Toyota", "Hilux", 2018).includes(177), "la 2.8 de 2018 da 177");
  assert.ok(!potencias("Toyota", "Hilux", 2018).includes(204), "y NO 204");
  assert.ok(potencias("Toyota", "Hilux", 2023).includes(204), "la de 2023 sí da 204");
  assert.ok(potencias("Toyota", "SW4", 2018).includes(177));
  assert.ok(!potencias("Toyota", "SW4", 2018).includes(204));
});

// ── Varias versiones del mismo auto ────────────────────────────────────────

test("devuelve TODAS las versiones de ese modelo y año", () => {
  const cronos = buscarVersiones("Fiat", "Cronos", 2021);
  assert.equal(cronos.length, 3, "el Cronos MY21 son tres versiones");
  assert.deepEqual(cronos.map((v) => v.pesoKg), [1136, 1225, 1258]);
  assert.deepEqual([...new Set(cronos.map((v) => v.baulL))], [525], "el baúl es el mismo");
});

test("con varias versiones NO se queda con una sola", () => {
  // Elegir por ellos "la más vendida" es justamente lo que hacía que los
  // números estuvieran mal. Devuelve null para que la pantalla pregunte.
  assert.equal(buscarEspecificaciones("Fiat", "Cronos", 2021), null);
  assert.equal(buscarEspecificaciones("Toyota", "Corolla", 2022), null);
});

test("con una sola versión la devuelve sin preguntar nada", () => {
  const kwid = buscarEspecificaciones("Renault", "Kwid", 2021);
  assert.equal(kwid.hp, 66);
});

test("un modelo que dejó de venderse no aparece fuera de su rango", () => {
  assert.ok(buscarEspecificaciones("Ford", "Ka", 2018));
  assert.equal(buscarEspecificaciones("Ford", "Ka", 2024), null);
});

// ── Lo que NO tiene que encontrar ──────────────────────────────────────────
//
// Esta es la parte que justifica que la búsqueda sea exacta.

test("Corolla y Corolla Cross NO se confunden", () => {
  assert.equal(unaDe("Toyota", "Corolla", 2022).categoria, "SEDAN");
  assert.equal(unaDe("Toyota", "Corolla Cross", 2022).categoria, "SUV");
  assert.notEqual(unaDe("Toyota", "Corolla", 2022).baulL,
    unaDe("Toyota", "Corolla Cross", 2022).baulL);
});

test("Onix y Onix Plus NO se confunden", () => {
  assert.equal(unaDe("Chevrolet", "Onix", 2022).categoria, "HATCHBACK");
  assert.equal(unaDe("Chevrolet", "Onix Plus", 2022).categoria, "SEDAN");
});

test("un auto que no está en la tabla no devuelve nada", () => {
  assert.deepEqual(buscarVersiones("Lamborghini", "Aventador", 2021), []);
  assert.deepEqual(buscarVersiones("Fiat", "Modelo Inventado", 2021), []);
});

test("no inventa con un modelo parecido", () => {
  // "Coroll" no es "Corolla". Sin resultado se va a la IA, que es lo correcto.
  assert.deepEqual(buscarVersiones("Toyota", "Coroll", 2022), []);
  assert.deepEqual(buscarVersiones("Toyota", "Corola", 2022), []);
});

test("un año imposible no devuelve nada", () => {
  assert.deepEqual(buscarVersiones("Fiat", "Cronos", 2200), []);
  assert.deepEqual(buscarVersiones("Fiat", "Cronos", "abc"), []);
  assert.deepEqual(buscarVersiones("Fiat", "Cronos", null), []);
  assert.deepEqual(buscarVersiones("Fiat", "Cronos", 1990), []);
});

test("sin marca o sin modelo no devuelve nada", () => {
  assert.deepEqual(buscarVersiones("", "Cronos", 2021), []);
  assert.deepEqual(buscarVersiones("Fiat", "", 2021), []);
});

// ── Lo que se escribe en el formulario ─────────────────────────────────────

test("comoFormulario usa los nombres de los campos y manda texto", () => {
  const campos = comoFormulario(unaDe("Fiat", "Cronos", 2021));
  assert.equal(campos.category, "SEDAN");
  assert.equal(campos.fuel, "GASOLINE");
  assert.equal(campos.doors, "4");
  assert.equal(campos.trunkCapacityLiters, "525");
  assert.equal(campos.engineDisplacementCC, "1332");
  assert.equal(typeof campos.horsePower, "string");
});

test("comoFormulario NO manda los datos que no tenemos", () => {
  // La Hilux no tiene litros de baúl: es una caja de carga, no un baúl.
  const campos = comoFormulario(unaDe("Toyota", "Hilux", 2020));
  assert.equal("trunkCapacityLiters" in campos, false);
  assert.equal(campos.fuel, "DIESEL");
});

test("comoFormulario manda el equipamiento SOLO cuando la ficha dice que sí", () => {
  // La ficha del Cronos MY21 da camara y sensores de serie en las tres
  // versiones, asi que se tildan.
  const cronos = comoFormulario(unaDe("Fiat", "Cronos", 2021));
  assert.equal(cronos.rearCamera, true);
  assert.equal(cronos.parkingSensors, true);

  // El Corolla no trae esos datos en su ficha. NO se manda `false`: ausencia
  // de dato no es lo mismo que "no lo tiene", y un false le destildaria a
  // alguien una camara que su auto si tiene.
  const corolla = comoFormulario(unaDe("Toyota", "Corolla", 2022));
  assert.equal("rearCamera" in corolla, false);
  assert.equal("parkingSensors" in corolla, false);
});

test("estaVerificado distingue lo que salio de una ficha", () => {
  assert.equal(estaVerificado(unaDe("Fiat", "Cronos", 2021)), true);
  assert.equal(estaVerificado(unaDe("Suzuki", "Jimny", 2021)), false);
  assert.equal(estaVerificado(null), false);
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

test("dos generaciones de la MISMA versión no se pisan de años", () => {
  /*
    Varias versiones del mismo modelo comparten el rango de años a propósito
    —ese es el punto de que la pantalla pregunte cuál es—, así que la clave
    incluye la versión. Lo que sigue estando mal es que la MISMA versión
    aparezca en dos generaciones que se solapan: ahí no habría forma de saber
    cuál corresponde.
  */
  const tope = new Date().getFullYear();
  const porVersion = new Map();
  for (const auto of AUTOS) {
    const clave = `${normalizar(auto.marca)}|${normalizar(auto.modelo)}|${normalizar(auto.version)}`;
    porVersion.set(clave, [...(porVersion.get(clave) ?? []), auto]);
  }
  for (const [clave, generaciones] of porVersion) {
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

test("no hay dos entradas idénticas de marca, modelo, versión y año", () => {
  const vistas = new Set();
  for (const auto of AUTOS) {
    const clave = `${normalizar(auto.marca)}|${normalizar(auto.modelo)}|${normalizar(auto.version)}|${auto.desde}`;
    assert.equal(vistas.has(clave), false, `repetida: ${clave}`);
    vistas.add(clave);
  }
});

test("sin ficha oficial NO se carga el peso", () => {
  /*
    LA REGLA QUE SALIO DE COMPARAR CONTRA NUEVE FICHAS.

    De seis pesos que se pudieron verificar, los seis estaban mal. No por poco:
    el Gol Trend decía 1000 kg y pesa 944. Es el dato que más cambia entre
    versiones y el que peor se recuerda, asi que o sale de una ficha o no está.

    Las demás cifras se portaron mejor (la potencia dio 8 de 8), por eso siguen
    aunque no estén verificadas: el cartel de la pantalla avisa cuáles son.
  */
  for (const auto of AUTOS) {
    if (auto.fuente) continue;
    assert.equal(auto.pesoKg, null,
      `${auto.marca} ${auto.modelo} ${auto.version}: tiene peso sin ficha que lo respalde`);
  }
});

test("toda entrada verificada dice de qué ficha salió", () => {
  for (const auto of AUTOS) {
    if (!auto.fuente) continue;
    assert.ok(/ficha|cat[aá]logo/i.test(auto.fuente),
      `${auto.marca} ${auto.modelo}: la fuente no nombra el documento`);
    assert.ok(auto.fuente.length > 20,
      `${auto.marca} ${auto.modelo}: la fuente es demasiado vaga`);
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
