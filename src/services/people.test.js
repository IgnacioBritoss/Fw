// ============================================================================
//  Pruebas de people.js — cómo se escribe el nombre de una persona
// ----------------------------------------------------------------------------
//  EL CASO QUE LO TRAJO. El perfil decía "ignacio britos". No era un error de
//  la pantalla: la cuenta se creó escribiendo el nombre en minúscula —como
//  escribe cualquiera en el teclado de un celular— y lo que se guardó fue eso.
//  Ese texto aparece en el perfil, en el chat, en los mails y en la ficha que
//  mira la otra persona antes de prestarle su auto.
//
//  LO DELICADO NO ES PONER LA MAYÚSCULA. Es no arruinar los nombres que ya
//  están bien escritos: un apellido es de alguien, y "corregirle" un "McDonald"
//  a "Mcdonald" sería peor que el problema que se vino a resolver. Eso es lo
//  que cuidan la mitad de estas pruebas.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { conMayusculas, initialsOf, nameOf } from "./people.js";

test("pone la mayúscula donde falta", () => {
  assert.equal(conMayusculas("ignacio"), "Ignacio");
  assert.equal(conMayusculas("ignacio britos"), "Ignacio Britos");
  assert.equal(conMayusculas("maria jose"), "Maria Jose");
});

test("y deja igual lo que ya estaba bien", () => {
  assert.equal(conMayusculas("Ignacio Britos"), "Ignacio Britos");
});

test("NO TOCA UN APELLIDO ESCRITO CON MAYÚSCULA ADENTRO", () => {
  for (const apellido of ["McDonald", "DiCaprio", "O'Brien", "LaValle"]) {
    assert.equal(conMayusculas(apellido), apellido);
  }
});

test("deja las partículas en minúscula, como se escriben en castellano", () => {
  assert.equal(conMayusculas("juan de la cruz"), "Juan de la Cruz");
  assert.equal(conMayusculas("ana van der berg"), "Ana van der Berg");
});

test("salvo cuando la partícula ES el apellido", () => {
  assert.equal(conMayusculas("da silva"), "Da Silva");
  assert.equal(conMayusculas("de luca"), "De Luca");
});

test("también separa por guiones", () => {
  assert.equal(conMayusculas("ana-maria"), "Ana-Maria");
  assert.equal(conMayusculas("jean-luc picard"), "Jean-Luc Picard");
});

test("limpia los espacios que nadie quiso escribir", () => {
  assert.equal(conMayusculas("  ignacio   britos  "), "Ignacio Britos");
});

test("y no se rompe con lo que no es texto", () => {
  for (const nada of ["", "   ", null, undefined, 42, {}]) {
    assert.equal(conMayusculas(nada), "");
  }
});

// ── Cómo se nombra a una persona entera ─────────────────────────────────────

test("nameOf arma el nombre completo, ya con la mayúscula", () => {
  assert.equal(nameOf({ firstName: "ignacio", lastName: "britos" }), "Ignacio Britos");
  assert.equal(nameOf({ displayName: "nacho b" }), "Nacho B");
});

test("EL EMAIL NO PASA POR LA MAYÚSCULA", () => {
  // Una dirección es un identificador y se escribe como es: "Juan@Gmail.com"
  // no es el mail de nadie.
  assert.equal(nameOf({ email: "juan@gmail.com" }), "juan@gmail.com");
});

test("y sin ningún dato queda el texto que pasó quien llama", () => {
  assert.equal(nameOf(null, "Usuario"), "Usuario");
  assert.equal(nameOf({}, "Usuario"), "Usuario");
});

test("las iniciales siguen saliendo en mayúscula", () => {
  assert.equal(initialsOf({ firstName: "ignacio", lastName: "britos" }), "IB");
  assert.equal(initialsOf({}), "U");
});
