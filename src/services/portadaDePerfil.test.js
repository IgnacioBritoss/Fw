// ============================================================================
//  Pruebas de portadaDePerfil.js — el dibujo de arriba del perfil
// ----------------------------------------------------------------------------
//  Lo que se cuida acá no es que un degradado quede lindo: eso se mira, no se
//  prueba. Lo que se prueba es que la portada NUNCA ROMPA LA PANTALLA.
//
//  Este dato viaja desde la base: lo eligió una persona, lo puede haber
//  guardado una versión más nueva del front, o lo puede haber tocado alguien a
//  mano. Se usa en dos lugares —el perfil propio y la ficha que abre otra
//  persona desde una publicación— y los dos lo meten directo en un `style` de
//  React. Un valor raro ahí no es un dibujo feo: es una pantalla en blanco.
//
//      npm test
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLORES,
  COLOR_POR_OMISION,
  DIBUJOS,
  PORTADA_POR_OMISION,
  aclarar,
  fondoDePortada,
  fotoUsable,
  oscurecer,
  portadaDe,
  portadaDeLaPersona,
} from "./portadaDePerfil.js";

test("todos los dibujos del catálogo devuelven un fondo de verdad", () => {
  for (const dibujo of DIBUJOS) {
    const estilo = fondoDePortada(dibujo, "#1d4ed8");
    assert.equal(typeof estilo.background, "string", dibujo);
    assert.ok(estilo.background.length > 0, dibujo);
  }
});

test("el que está por omisión es uno de los del catálogo", () => {
  // Si no lo fuera, una cuenta nueva caería en el `??` de fondoDePortada, que
  // busca justamente esta clave: quedaría una recursión de una vuelta y
  // undefined.
  assert.ok(DIBUJOS.includes(PORTADA_POR_OMISION));
});

test("UN DIBUJO QUE NO EXISTE NO ROMPE NADA: cae en el de siempre", () => {
  /*
    Pasa de verdad: el front y el servidor se publican por separado, así que una
    cuenta puede quedar con un dibujo que esta versión todavía no conoce. Caer
    en el de siempre es degradarse; devolver undefined es una pantalla rota.
  */
  const esperado = fondoDePortada(PORTADA_POR_OMISION, "#1d4ed8");
  for (const basura of ["no-existe", "", null, undefined, 42, {}]) {
    assert.deepEqual(fondoDePortada(basura, "#1d4ed8"), esperado);
  }
});

test("Y UN COLOR QUE NO ES UN COLOR TAMPOCO", () => {
  for (const basura of ["rojo", "#12345", "#xyzxyz", "", null, undefined, 7]) {
    const estilo = fondoDePortada("liso", basura);
    assert.equal(typeof estilo.background, "string");
    // Sin el respaldo saldría "rgb(NaN, NaN, NaN)", que el navegador ignora y
    // deja la portada transparente.
    assert.ok(!estilo.background.includes("NaN"), String(basura));
  }
});

test("NINGÚN DIBUJO SE OLVIDA DEL COLOR ELEGIDO", () => {
  /*
    EL ERROR QUE ESTO CUIDA, Y QUE PASÓ.

    Las rayas se dibujaban aclarando el color y poniéndole transparencia
    después, en dos pasos. El primero devolvía el color ya escrito —"rgb(138,
    191, 158)"— y el segundo solo sabía leer hexadecimales: no lo reconocía,
    caía en el azul de respaldo, y con la portada verde las rayas salían
    azules. Encima el fondo de abajo SÍ era verde, así que no se leía como un
    error sino como un diseño feo.

    No se prueba cada dibujo contra un texto esperado: eso sería copiar la
    receta en la prueba y no detectaría nada. Se prueba lo único que tienen que
    cumplir TODOS: que el color elegido aparezca, y que el azul de respaldo no
    aparezca cuando nadie lo eligió.
  */
  const VERDE = "#15803d";      // rgb(21, 128, 61)
  const AZUL_RESPALDO = "29, 78, 216";
  for (const dibujo of DIBUJOS) {
    const { background } = fondoDePortada(dibujo, VERDE);
    assert.ok(
      !background.includes(AZUL_RESPALDO),
      `${dibujo} se cayó al color de respaldo`,
    );
    // Puede aparecer tal cual ("#15803d", cuando la receta lo usa derecho) o ya
    // convertido ("rgb(21, 128, 61)", cuando lo aclaró u oscureció). Las dos
    // formas son el color elegido; lo que no puede es no estar.
    assert.ok(
      background.includes(VERDE) || background.includes("21, 128, 61"),
      `${dibujo} perdió el color`,
    );
  }
});

test("los dibujos con baldosa traen su tamaño", () => {
  // Sin backgroundSize, los puntos son UN punto y la cuadrícula una sola línea.
  // Es el error que se olvida de hacer en una de las dos pantallas, así que el
  // tamaño viaja junto con el fondo y no suelto.
  for (const dibujo of ["puntos", "malla"]) {
    assert.ok(fondoDePortada(dibujo, "#15803d").backgroundSize, dibujo);
  }
});

test("la paleta sugerida son colores válidos", () => {
  for (const color of COLORES) {
    assert.match(color, /^#[0-9a-f]{6}$/);
  }
  assert.match(COLOR_POR_OMISION, /^#[0-9a-f]{6}$/);
});

test("aclarar aclara y oscurecer oscurece", () => {
  // Con 0 no cambia nada, con 1 llega al extremo. Es lo único que se les pide:
  // los dibujos están armados sobre esa escala.
  assert.equal(aclarar("#1d4ed8", 0), "rgb(29, 78, 216)");
  assert.equal(aclarar("#1d4ed8", 1), "rgb(255, 255, 255)");
  assert.equal(oscurecer("#1d4ed8", 0), "rgb(29, 78, 216)");
  assert.equal(oscurecer("#1d4ed8", 1), "rgb(0, 0, 0)");
});

test("portadaDe lee lo que eligió una persona", () => {
  assert.deepEqual(
    portadaDe({ profileCoverDesign: "rayas", profileCoverColor: "#15803d" }),
    { dibujo: "rayas", color: "#15803d", foto: null },
  );
});

test("Y UN BACKEND QUE TODAVÍA NO MANDA LOS CAMPOS DEJA LA DE SIEMPRE", () => {
  /*
    El front y el backend se publican por separado. Mientras el backend viejo
    siga arriba, `/users/me` no devuelve estos tres campos, y la pantalla tiene
    que verse exactamente como se veía antes: no vacía, no rota.
  */
  const esperada = { dibujo: PORTADA_POR_OMISION, color: COLOR_POR_OMISION, foto: null };
  for (const persona of [null, undefined, {}, { profileCoverDesign: null }]) {
    assert.deepEqual(portadaDe(persona), esperada);
  }
});

test("portadaDeLaPersona hace los dos pasos de una", () => {
  const persona = { profileCoverDesign: "noche", profileCoverColor: "#be123c" };
  assert.deepEqual(portadaDeLaPersona(persona), fondoDePortada("noche", "#be123c"));
});

// ── La foto de portada ──────────────────────────────────────────────────────

const FOTO = "https://res.cloudinary.com/demo/image/upload/v1/portada.jpg";

test("con una foto cargada, la foto gana sobre el dibujo", () => {
  const estilo = fondoDePortada("rayas", "#15803d", FOTO);
  assert.equal(estilo.backgroundImage, `url("${FOTO}")`);
  assert.equal(estilo.backgroundSize, "cover");
  // El dibujo no se dibuja debajo: sería pintar algo que nadie va a ver.
  assert.equal(estilo.background, undefined);
});

test("EL DIBUJO SIGUE GUARDADO ABAJO DE LA FOTO", () => {
  /*
    Es lo que hace que quitar la foto no sea empezar de cero. Si al poner una
    foto se perdiera el dibujo, quien la saca vuelve al azul de fábrica y tiene
    que volver a elegir todo: una decisión que ya había tomado, borrada por
    haber probado otra cosa.
  */
  const persona = {
    profileCoverDesign: "noche", profileCoverColor: "#be123c",
    profileCoverPhotoUrl: FOTO,
  };
  const { dibujo, color, foto } = portadaDe(persona);
  assert.equal(dibujo, "noche");
  assert.equal(color, "#be123c");
  assert.equal(foto, FOTO);
  // Y sin la foto queda exactamente lo que tenía elegido.
  assert.deepEqual(fondoDePortada(dibujo, color, null), fondoDePortada("noche", "#be123c"));
});

test("NO ENTRA CUALQUIER COSA ADENTRO DEL url() DE CSS", () => {
  /*
    Esta dirección viene de la base y termina pegada adentro de una propiedad
    de CSS. Un paréntesis o una comilla no la dejan "fea": CIERRAN EL url()
    ANTES DE TIEMPO y lo que sigue se interpreta como más CSS. Es el mismo
    cuidado que se tiene al armar una consulta a la base.

    Se exige https porque además una imagen por http en una página https no la
    carga ningún navegador: sería una portada rota.
  */
  const VENENO = [
    'https://x.com/a.jpg"); background: red; --x: url("',
    "https://x.com/a.jpg'); color: red",
    "https://x.com/a(1).jpg",
    "javascript:alert(1)",
    "http://x.com/a.jpg",
    "//x.com/a.jpg",
    "   ",
    null,
    undefined,
    42,
  ];
  for (const malo of VENENO) {
    assert.equal(fotoUsable(malo), null, String(malo));
    // Y por lo tanto la portada se dibuja como si no hubiera foto.
    assert.deepEqual(
      fondoDePortada("liso", "#1d4ed8", malo),
      fondoDePortada("liso", "#1d4ed8"),
      String(malo),
    );
  }
});

test("y una dirección normal sí entra", () => {
  assert.equal(fotoUsable(FOTO), FOTO);
  // Con espacios al borde, que es lo que deja un copiar y pegar.
  assert.equal(fotoUsable(`  ${FOTO}  `), FOTO);
});
