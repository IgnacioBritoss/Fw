// ============================================================================
//  Pruebas del reordenado de fotos
// ----------------------------------------------------------------------------
//  El gesto en sí (el dedo, el umbral, qué hay debajo del puntero) no se prueba
//  acá: eso necesita un navegador. Lo que se prueba son las dos cuentas que
//  deciden el resultado, que son las que se pueden equivocar en silencio.
//
//  Importan porque una falla acá no se ve como un error: se ve como fotos que
//  quedaron en un orden raro, y eso se descubre cuando ya está publicado.
//
//  Se corren con el runner que ya trae Node, sin agregar dependencias:
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { moverEnLista, indiceTrasMover } from "./useOrdenArrastrando.js";

// ── Mover un elemento de lugar ─────────────────────────────────────────────

test("moverEnLista lleva una foto hacia adelante", () => {
  assert.deepEqual(moverEnLista(["a", "b", "c", "d"], 2, 0), ["c", "a", "b", "d"]);
});

test("moverEnLista lleva una foto hacia atrás", () => {
  assert.deepEqual(moverEnLista(["a", "b", "c", "d"], 0, 3), ["b", "c", "d", "a"]);
});

test("moverEnLista al mismo lugar deja todo igual", () => {
  assert.deepEqual(moverEnLista(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
});

test("moverEnLista no toca la lista original", () => {
  const original = ["a", "b", "c"];
  moverEnLista(original, 0, 2);
  assert.deepEqual(original, ["a", "b", "c"]);
});

test("moverEnLista nunca pierde ni repite un elemento", () => {
  // La falla que importa: un splice mal puesto duplica una foto y borra otra, y
  // el resultado igual "parece" una lista de fotos.
  const original = ["a", "b", "c", "d", "e"];
  for (let desde = 0; desde < original.length; desde++) {
    for (let hasta = 0; hasta < original.length; hasta++) {
      const salida = moverEnLista(original, desde, hasta);
      assert.equal(salida.length, original.length, `${desde}→${hasta}: cambió el largo`);
      assert.deepEqual([...salida].sort(), [...original].sort(), `${desde}→${hasta}: cambiaron los elementos`);
      assert.equal(salida[hasta], original[desde], `${desde}→${hasta}: no quedó en su lugar`);
    }
  }
});

// ── Seguir a la foto que se está mirando ───────────────────────────────────
//
//  Mientras se arrastra una miniatura, la foto grande tiene que seguir siendo LA
//  MISMA foto. Si el índice se queda quieto, la grande cambia sola a mitad del
//  gesto y parece que reordenar también eligiera.

test("indiceTrasMover sigue a la foto que se movió", () => {
  assert.equal(indiceTrasMover(2, 2, 0), 0);
  assert.equal(indiceTrasMover(0, 0, 3), 3);
});

test("indiceTrasMover corre las que quedaron en el medio", () => {
  // ["a","b","c","d"], se mueve la "a" (0) al lugar 2 → ["b","c","a","d"]
  assert.equal(indiceTrasMover(1, 0, 2), 0);   // "b" pasa de 1 a 0
  assert.equal(indiceTrasMover(2, 0, 2), 1);   // "c" pasa de 2 a 1
  // ["a","b","c","d"], se mueve la "d" (3) al lugar 1 → ["a","d","b","c"]
  assert.equal(indiceTrasMover(1, 3, 1), 2);   // "b" pasa de 1 a 2
  assert.equal(indiceTrasMover(2, 3, 1), 3);   // "c" pasa de 2 a 3
});

test("indiceTrasMover no toca a las que quedaron fuera del tramo", () => {
  assert.equal(indiceTrasMover(4, 0, 2), 4);
  assert.equal(indiceTrasMover(0, 1, 3), 0);
});

test("indiceTrasMover coincide con dónde quedó de verdad", () => {
  // La comprobación de fondo: en vez de confiar en las cuentas, se mueve la
  // lista de verdad y se busca dónde terminó cada elemento.
  const original = ["a", "b", "c", "d", "e"];
  for (let desde = 0; desde < original.length; desde++) {
    for (let hasta = 0; hasta < original.length; hasta++) {
      const salida = moverEnLista(original, desde, hasta);
      original.forEach((valor, i) => {
        assert.equal(
          indiceTrasMover(i, desde, hasta), salida.indexOf(valor),
          `${desde}→${hasta}: "${valor}" no quedó donde decía la cuenta`,
        );
      });
    }
  }
});
