// ============================================================================
//  Pruebas del grabador de notas de voz
// ----------------------------------------------------------------------------
//  El micrófono necesita un navegador, así que no se prueba acá. Lo que se
//  prueba son las tres decisiones que se toman alrededor y que fallan calladas:
//  una grabación vacía que igual se sube y se transcribe, un reloj que escribe
//  "1:5" en vez de "1:05", y una transcripción que le borra a alguien lo que
//  venía escribiendo.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { segundosComoReloj, esAudioUtil, textoParaLaCaja } from "./useGrabadora.js";

// ── El reloj de la grabación ───────────────────────────────────────────────

test("segundosComoReloj rellena los segundos con cero", () => {
  assert.equal(segundosComoReloj(5), "0:05");
  assert.equal(segundosComoReloj(65), "1:05");
});

test("segundosComoReloj pasa el minuto", () => {
  assert.equal(segundosComoReloj(59), "0:59");
  assert.equal(segundosComoReloj(60), "1:00");
  assert.equal(segundosComoReloj(600), "10:00");
});

test("segundosComoReloj no escribe tiempos negativos ni rotos", () => {
  assert.equal(segundosComoReloj(-3), "0:00");
  assert.equal(segundosComoReloj(undefined), "0:00");
  assert.equal(segundosComoReloj(NaN), "0:00");
  assert.equal(segundosComoReloj(7.9), "0:07");
});

// ── Si la grabación sirve ──────────────────────────────────────────────────
//
// Las dos condiciones se miran juntas. Cada una sola deja pasar un caso real:
// un micrófono mudo graba tres segundos de nada, y un blob puede pesar solo por
// la cabecera del contenedor.

const blobDe = (size) => ({ size });

test("esAudioUtil acepta una grabación con audio adentro", () => {
  assert.equal(esAudioUtil(blobDe(40_000), 3000), true);
});

test("esAudioUtil rechaza el toque sin querer al micrófono", () => {
  assert.equal(esAudioUtil(blobDe(40_000), 200), false);
});

test("esAudioUtil rechaza un blob que solo trae la cabecera", () => {
  assert.equal(esAudioUtil(blobDe(300), 5000), false);
});

test("esAudioUtil rechaza que no haya grabación", () => {
  assert.equal(esAudioUtil(null, 5000), false);
  assert.equal(esAudioUtil(undefined, 5000), false);
  assert.equal(esAudioUtil({}, 5000), false);
});

// ── Dónde cae el texto transcripto ─────────────────────────────────────────

test("textoParaLaCaja escribe la transcripción en una caja vacía", () => {
  assert.equal(textoParaLaCaja("", "cuanto sale alquilar un auto"), "cuanto sale alquilar un auto");
});

test("textoParaLaCaja NO pisa lo que ya estaba escrito", () => {
  assert.equal(
    textoParaLaCaja("hola", "cuanto sale alquilar un auto"),
    "hola cuanto sale alquilar un auto",
  );
});

test("textoParaLaCaja deja la caja como estaba si no se entendió nada", () => {
  // Un audio en silencio devuelve texto vacío. Vaciar la caja después de
  // hablar se lee como que la aplicación se rompió.
  assert.equal(textoParaLaCaja("lo que venia escribiendo", ""), "lo que venia escribiendo");
  assert.equal(textoParaLaCaja("lo que venia escribiendo", null), "lo que venia escribiendo");
});

test("textoParaLaCaja no deja espacios de más", () => {
  assert.equal(textoParaLaCaja("  hola  ", "  que tal  "), "hola que tal");
  assert.equal(textoParaLaCaja("", "  que tal  "), "que tal");
});

test("textoParaLaCaja aguanta que no venga nada", () => {
  assert.equal(textoParaLaCaja(undefined, undefined), "");
  assert.equal(textoParaLaCaja(undefined, "hola"), "hola");
});
