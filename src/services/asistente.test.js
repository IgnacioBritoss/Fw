// ============================================================================
//  Pruebas de asistente.js
// ----------------------------------------------------------------------------
//  LO QUE SE CUIDA ACÁ ES NO CONTESTAR CON SEGURIDAD OTRA COSA.
//
//  El riesgo es asimétrico. No reconocer una pregunta que teníamos contestada
//  es gratis: contesta la IA, como antes. Reconocerla MAL es caro: le
//  contestamos los plazos de la cancelación a alguien que preguntó por los
//  daños, sin ningún aviso de que puede estar mal, porque la respuesta es
//  nuestra.
//
//  Así que la mitad de estas pruebas son de lo que NO tiene que coincidir.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  respuestaGuardada, preguntaPorId, contarPregunta, cuentaGuardada,
  preguntasDeLosBotones, REPETICIONES_PARA_SUBIR, BOTONES_RESERVADOS,
  cuentaDelServidor, cuentaQueManda,
} from "./asistente.js";
import { PREGUNTAS, BOTONES } from "../data/preguntasWili.js";

/** Un localStorage de juguete, que es todo lo que este archivo usa. */
function deposito(inicial = {}) {
  const datos = { ...inicial };
  return {
    datos,
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
  };
}

const idDe = (texto) => respuestaGuardada(texto)?.id ?? null;

// ── La tabla, antes que nada ───────────────────────────────────────────────

test("toda pregunta de la tabla tiene su respuesta y sus palabras", () => {
  for (const p of PREGUNTAS) {
    assert.ok(p.id, "sin id");
    assert.match(p.pregunta, /^chat\.q\./, `${p.id}: la pregunta tiene que ser una clave`);
    assert.match(p.respuesta, /^chat\.a\./, `${p.id}: la respuesta tiene que ser una clave`);
    assert.ok(p.claves?.length, `${p.id}: sin palabras no se la puede reconocer`);
  }
});

test("no hay dos preguntas con el mismo id", () => {
  const ids = PREGUNTAS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("hay al menos cuatro para los botones, y mas para poder subir", () => {
  const deBase = PREGUNTAS.filter((p) => p.enLosBotones);
  assert.equal(deBase.length, BOTONES, "las de siempre llenan los botones");
  assert.ok(PREGUNTAS.length > BOTONES, "y hay otras que pueden subir");
});

// ── Reconocer lo que se escribe ────────────────────────────────────────────

test("reconoce la pregunta escrita como la escribe la gente", () => {
  assert.equal(idDe("como cancelo una reserva?"), "cancel");
  assert.equal(idDe("¿Cómo funciona la garantía?"), "warranty");
  assert.equal(idDe("que documentos necesito"), "documents");
  assert.equal(idDe("como publico mi auto"), "publish");
});

test("la misma palabra conjugada de otra forma sigue siendo la misma pregunta", () => {
  // Se compara por el principio de la palabra, así que una sola clave cubre
  // "cancelo", "cancelar" y "cancelacion".
  for (const texto of ["quiero cancelar", "voy a cancelar", "la cancelacion como es"]) {
    assert.equal(idDe(texto), "cancel", texto);
  }
});

test("los acentos y las eñes no cambian nada", () => {
  // Las claves están escritas "daño" y "seña"; la pregunta llega normalizada.
  assert.equal(idDe("si le hago un daño al auto que pasa"), "accident");
  assert.equal(idDe("si le hago un dano al auto que pasa"), "accident");
  assert.equal(idDe("cuanto es la seña"), "payments");
});

test("un conjunto de DOS palabras necesita las dos", () => {
  // "subir" + "auto" es publicar. "subir" solo no es nada: se puede estar
  // preguntando por subir las fotos, o por subir el precio.
  assert.equal(idDe("como hago para subir mi auto"), "publish");
  assert.equal(idDe("como subo las fotos"), null);
});

// ── Lo que NO se reconoce, que es la parte importante ──────────────────────

test("una pregunta que no esta en la tabla va a la IA", () => {
  assert.equal(idDe("puedo llevar el auto a Chile"), null);
  assert.equal(idDe("tienen autos automaticos en Cordoba"), null);
  assert.equal(idDe("se puede fumar adentro"), null);
});

test("un saludo o una prueba no son una pregunta", () => {
  for (const texto of ["hola", "probando", "", "   ", "?", "jajaja"]) {
    assert.equal(idDe(texto), null, JSON.stringify(texto));
  }
});

test("UNA PREGUNTA QUE ENTRA EN DOS TEMAS NO SE DESEMPATA", () => {
  /*
    El caso que esto cuida. "¿me devuelven la garantía si cancelo?" es
    legítimamente las dos cosas. Contestar solo la política de cancelación, o
    solo cómo funciona la garantía, es contestar media pregunta con cara de
    respuesta completa. La IA puede hablar de las dos a la vez.
  */
  assert.equal(idDe("me devuelven la garantia si cancelo"), null);
  assert.equal(idDe("que documentos necesito para publicar"), null);
});

test("no se inventa una pregunta por una palabra que aparece de paso", () => {
  // "auto" sola no alcanza para nada, y así tiene que ser: está en casi toda
  // pregunta que le hacen al asistente.
  assert.equal(idDe("el auto tiene aire"), null);
  assert.equal(idDe("cuantos autos hay"), null);
});

// ── Contar lo que se pregunta ──────────────────────────────────────────────

test("contar suma uno, y separado por cuenta de usuario", () => {
  const d = deposito();
  contarPregunta("cancel", "u1", d);
  contarPregunta("cancel", "u1", d);
  contarPregunta("cancel", "u2", d);

  assert.equal(cuentaGuardada("u1", d).cancel, 2);
  assert.equal(cuentaGuardada("u2", d).cancel, 1);
  assert.equal(cuentaGuardada("u3", d).cancel, undefined);
});

test("una pregunta que no esta en la tabla no se cuenta", () => {
  // Si no, el día que se saca una entrada queda contada para siempre una
  // pregunta que ya no se puede contestar.
  const d = deposito();
  contarPregunta("inventada", "u1", d);
  assert.deepEqual(cuentaGuardada("u1", d), {});
});

test("un deposito roto, vacio o que se niega a escribir no rompe nada", () => {
  const roto = {
    getItem: () => "{no es json",
    setItem: () => { throw new Error("sin lugar"); },
  };
  assert.deepEqual(cuentaGuardada("u1", roto), {});
  assert.deepEqual(contarPregunta("cancel", "u1", roto), { cancel: 1 });
  assert.deepEqual(cuentaGuardada("u1", undefined), {});

  const lista = deposito({ fw_wili_preguntas_u1: JSON.stringify(["cancel"]) });
  assert.deepEqual(cuentaGuardada("u1", lista), {});
});

test("un valor que no es un numero se descarta al leer", () => {
  const d = deposito({
    fw_wili_preguntas_u1: JSON.stringify({ cancel: "muchas", warranty: 3, documents: -1 }),
  });
  assert.deepEqual(cuentaGuardada("u1", d), { warranty: 3 });
});

// ── El orden de los botones ────────────────────────────────────────────────

test("sin nada preguntado, los botones son los cuatro de siempre", () => {
  const botones = preguntasDeLosBotones({});
  assert.equal(botones.length, BOTONES);
  assert.deepEqual(botones.map((p) => p.id), PREGUNTAS.filter((p) => p.enLosBotones).map((p) => p.id));
});

test("lo mas preguntado sube al primer lugar", () => {
  const botones = preguntasDeLosBotones({ documents: 5 });
  assert.equal(botones[0].id, "documents");
  assert.equal(botones.length, BOTONES);
});

test("una pregunta que no es de las de siempre sube si se repite", () => {
  const unaSolaVez = preguntasDeLosBotones({ delivery: 1 });
  assert.ok(!unaSolaVez.some((p) => p.id === "delivery"), "con una vez no alcanza");

  const repetida = preguntasDeLosBotones({ delivery: REPETICIONES_PARA_SUBIR });
  assert.equal(repetida[0].id, "delivery");
});

test("LAS DE SIEMPRE NO DESAPARECEN, aunque se pregunte mucho otra cosa", () => {
  /*
    Son los cuatro temas que alguien necesita antes de entregar o retirar un
    auto. Con el orden por puro ranking, a quien ya preguntó varias veces otras
    cosas se le llenaban los cuatro botones y esos temas dejaban de estar
    ofrecidos. Quedan dos lugares reservados.
  */
  const botones = preguntasDeLosBotones({ delivery: 9, verify: 9, payments: 9, publish: 9 });
  const deBase = PREGUNTAS.filter((p) => p.enLosBotones).map((p) => p.id);
  const cuantasDeBase = botones.filter((p) => deBase.includes(p.id)).length;
  assert.equal(cuantasDeBase, BOTONES_RESERVADOS);
  assert.equal(botones.length, BOTONES);
});

test("los botones nunca son mas de los que entran en la ventana", () => {
  const todas = Object.fromEntries(PREGUNTAS.map((p) => [p.id, 9]));
  assert.equal(preguntasDeLosBotones(todas).length, BOTONES);
});

test("un empate se resuelve por el orden de la tabla, no al azar", () => {
  const a = preguntasDeLosBotones({ warranty: 2, accident: 2 });
  const b = preguntasDeLosBotones({ accident: 2, warranty: 2 });
  assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
});

test("todo boton ofrece una pregunta que sabemos contestar", () => {
  // La propiedad que hace que esto no pueda empeorar nada: el botón y la
  // respuesta salen de la misma tabla.
  for (const p of preguntasDeLosBotones({ delivery: 5, verify: 5 })) {
    assert.ok(preguntaPorId(p.id)?.respuesta, `${p.id} sin respuesta`);
  }
});

// ── El ranking del sitio, que es el que vale ───────────────────────────────
//
//  Vive en el backend (tabla AssistantQuestionCount) y es qué le pregunta la
//  gente a FreeWheel. Lo de este navegador queda como respaldo para cuando el
//  servidor no trae nada, que es el caso de todos los días hasta que la
//  migración esté aplicada en el deploy.

test("el ranking del servidor se lee a la forma de la cuenta local", () => {
  const cuenta = cuentaDelServidor({
    preguntas: [
      { questionId: "delivery", count: 9 },
      { questionId: "cancel", count: 4 },
    ],
    minimo: 3,
  });
  assert.deepEqual(cuenta, { delivery: 9, cancel: 4 });
});

test("una pregunta del servidor que este front NO conoce se descarta", () => {
  // El servidor tiene su propia copia de la lista de ids. Si alguna vez quedan
  // desfasadas, el que manda sobre qué puede ir en un botón es el front, que es
  // el que tiene las respuestas: un botón sin respuesta es lo peor que puede
  // pasar acá.
  const cuenta = cuentaDelServidor({
    preguntas: [
      { questionId: "preguntaQueNoExiste", count: 99 },
      { questionId: "cancel", count: 4 },
    ],
  });
  assert.deepEqual(cuenta, { cancel: 4 });
});

test("una respuesta vacia, rota o que no llego no rompe nada", () => {
  for (const respuesta of [null, undefined, {}, { preguntas: null }, { preguntas: "no" }]) {
    assert.deepEqual(cuentaDelServidor(respuesta), {});
  }
  assert.deepEqual(cuentaDelServidor({ preguntas: [{ questionId: "cancel", count: "muchas" }] }), {});
  assert.deepEqual(cuentaDelServidor({ preguntas: [{ questionId: "cancel", count: 0 }] }), {});
});

test("CON RANKING DEL SITIO, MANDA EL DEL SITIO", () => {
  // Es lo que se pidió: que los botones muestren lo que pregunta la gente, no
  // lo que preguntó el que está mirando la pantalla.
  const manda = cuentaQueManda({ warranty: 50 }, { delivery: 9 });
  assert.deepEqual(manda, { delivery: 9 });
});

test("sin ranking del sitio, manda la cuenta de este navegador", () => {
  // El caso de todos los días hasta que la migración esté aplicada.
  const manda = cuentaQueManda({ warranty: 50 }, {});
  assert.deepEqual(manda, { warranty: 50 });
  assert.deepEqual(cuentaQueManda({ warranty: 50 }), { warranty: 50 });
  assert.deepEqual(cuentaQueManda(), {});
});

test("LAS DOS CUENTAS NO SE SUMAN", () => {
  // "las veces que lo pregunté yo" y "las veces que lo preguntó el sitio" son
  // escalas distintas: el total no significaría nada.
  const manda = cuentaQueManda({ cancel: 4 }, { cancel: 10 });
  assert.equal(manda.cancel, 10, "no 14");
});

test("el ranking del sitio ordena los botones igual que la cuenta local", () => {
  // La misma función de siempre: lo único que cambia es de dónde salen los
  // números. Así no hay dos maneras de ordenar los mismos cuatro botones.
  const delSitio = cuentaDelServidor({ preguntas: [{ questionId: "verify", count: 12 }] });
  const botones = preguntasDeLosBotones(cuentaQueManda({}, delSitio));
  assert.equal(botones[0].id, "verify");
  assert.equal(botones.length, BOTONES);
});
