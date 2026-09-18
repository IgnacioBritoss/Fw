// ============================================================================
//  Pruebas de mapaGlobo.js — que la tarjeta no se coma el mapa
// ----------------------------------------------------------------------------
//  Los tamaños de mapa que se prueban acá son los MEDIDOS en el navegador, no
//  inventados:
//
//   · 353x480  el mapa de inicio sin agrandar, en una pantalla de 1280x720
//   · 599x480  el mismo, con "Agrandar mapa"
//   · 412x380  una notebook de 1440x620, que es donde peor se veía
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  medidaDeLaTarjeta, ajusteParaQueEntre,
  ANCHO_MAXIMO, ALTO_FOTO_MAXIMO, ANCHO_MINIMO, ALTO_FOTO_MINIMO,
} from "./mapaGlobo.js";

const MAPAS = [
  { nombre: "inicio sin agrandar", w: 353, h: 480 },
  { nombre: "inicio agrandado", w: 599, h: 480 },
  { nombre: "notebook baja", w: 412, h: 380 },
  { nombre: "pantalla grande", w: 900, h: 800 },
];

test("la foto NUNCA se aplasta: siempre guarda su proporcion", () => {
  /*
    Esta es la regla que reemplazo a la anterior, y el motivo esta a la vista en
    el mapa: antes el alto de la foto salia de cuanto mapa habia, sin mirar el
    ancho, y en un mapa bajo quedaba una franja de 227x95 —2.4 a 1— donde del
    auto se veian el capot y las ruedas y nada del medio.

    Se prefiere una tarjeta un poco mas alta y correr el mapa para que entre
    (ajusteParaQueEntre) antes que arruinar lo unico que se mira.
  */
  for (const mapa of [...MAPAS, { nombre: "angostisimo", w: 120, h: 200 }]) {
    const { ancho, altoFoto } = medidaDeLaTarjeta(mapa);
    const proporcion = ancho / altoFoto;
    assert.ok(proporcion > 1.4 && proporcion < 1.8, `${mapa.nombre}: la foto quedo ${proporcion.toFixed(2)}:1`);
  }
});

test("en un mapa grande queda del tamaño de siempre", () => {
  // Achicarla ahi no arreglaria nada y se veria peor.
  const { ancho, altoFoto } = medidaDeLaTarjeta({ w: 900, h: 800 });
  assert.equal(ancho, ANCHO_MAXIMO);
  assert.equal(altoFoto, ALTO_FOTO_MAXIMO);
});

test("en un mapa angosto se achica el ANCHO, no la foto", () => {
  // Lo que se recorta es el texto, que se acomoda solo; la foto se acompaña
  // para no deformarse, y por eso baja proporcionalmente y no de golpe.
  const grande = medidaDeLaTarjeta({ w: 900, h: 800 });
  const chico = medidaDeLaTarjeta({ w: 353, h: 480 });
  assert.ok(chico.ancho < grande.ancho, "no se achico a lo ancho");
  assert.ok(chico.altoFoto <= grande.altoFoto, "la foto crecio en un mapa mas chico");
  assert.ok(Math.abs((chico.ancho / chico.altoFoto) - (grande.ancho / grande.altoFoto)) < 0.1,
    "cambio la proporcion al achicarse");
});

test("sin medida se usa el tamaño de siempre", () => {
  // Misma regla que en el resto de la app: sin dato no se cambia nada. Una
  // tarjeta diminuta por una medicion que fallo seria peor que una grande.
  for (const sinNada of [null, undefined, {}, { w: 0, h: 0 }]) {
    assert.deepEqual(medidaDeLaTarjeta(sinNada), { ancho: ANCHO_MAXIMO, altoFoto: ALTO_FOTO_MAXIMO });
  }
});

test("nunca se achica tanto que deje de leerse", () => {
  for (const mapa of [{ w: 40, h: 40 }, { w: 1, h: 1 }, { w: 200, h: 200 }]) {
    const { ancho, altoFoto } = medidaDeLaTarjeta(mapa);
    assert.ok(ancho >= ANCHO_MINIMO, `ancho ${ancho}`);
    assert.ok(altoFoto >= ALTO_FOTO_MINIMO, `alto de foto ${altoFoto}`);
  }
});


test("mas mapa nunca da una tarjeta mas chica", () => {
  let anchoAnterior = 0;
  let altoAnterior = 0;
  for (let lado = 200; lado <= 1000; lado += 50) {
    const { ancho, altoFoto } = medidaDeLaTarjeta({ w: lado, h: lado });
    assert.ok(ancho >= anchoAnterior, `a ${lado}px el ancho bajo`);
    assert.ok(altoFoto >= altoAnterior, `a ${lado}px el alto bajo`);
    anchoAnterior = ancho;
    altoAnterior = altoFoto;
  }
});

// ── Correr el mapa para que el globo entre ─────────────────────────────────

const MARGENES = { arriba: 100, izq: 56, abajo: 18, der: 18 };
const MAPA = { w: 353, h: 480 };

test("un globo que ya entra no mueve nada", () => {
  const quieto = ajusteParaQueEntre({ x: 100, y: 150, w: 227, h: 263 }, MAPA, MARGENES);
  assert.deepEqual(quieto, { dx: 0, dy: 0 });
});

test("el globo que se sale por arriba se baja", () => {
  // El caso de la captura: el globo asomaba 36px por encima del borde.
  const { dy } = ajusteParaQueEntre({ x: 100, y: -36, w: 227, h: 263 }, MAPA, MARGENES);
  // Negativo: asi lo espera panBy para descubrir lo de arriba.
  assert.ok(dy < 0, `dy fue ${dy}`);
  // Y lo baja hasta debajo de los botones, no solo hasta el borde.
  assert.equal(dy, -36 - MARGENES.arriba);
});

test("no queda debajo de los botones de arriba", () => {
  // Adentro del mapa pero tapado por "Agrandar mapa": tambien hay que bajarlo.
  const { dy } = ajusteParaQueEntre({ x: 100, y: 20, w: 227, h: 263 }, MAPA, MARGENES);
  assert.equal(dy, 20 - MARGENES.arriba);
});

test("no queda encima del zoom, que esta a la izquierda", () => {
  const { dx } = ajusteParaQueEntre({ x: 10, y: 150, w: 227, h: 263 }, MAPA, MARGENES);
  assert.equal(dx, 10 - MARGENES.izq);
});

test("el globo que se sale por abajo se sube", () => {
  const { dy } = ajusteParaQueEntre({ x: 100, y: 300, w: 227, h: 263 }, MAPA, MARGENES);
  assert.ok(dy > 0, `dy fue ${dy}`);
});

test("si no entra de ninguna manera, se salva lo de ARRIBA", () => {
  // La foto y el nombre estan arriba: si algo se tiene que perder, que sea el
  // borde de abajo y no la mitad de la tarjeta.
  const gigante = { x: 20, y: 40, w: 300, h: 600 };
  const { dy } = ajusteParaQueEntre(gigante, MAPA, MARGENES);
  assert.equal(gigante.y - dy, MARGENES.arriba, "el borde de arriba no quedo donde corresponde");
});
