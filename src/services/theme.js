// ============================================================================
//  theme.js — Modo oscuro
// ----------------------------------------------------------------------------
//  ANTES ERA UN FILTRO, Y ESTABA MAL. La app tenía los colores escritos a mano
//  en cada componente, así que no había dónde cambiar "el blanco por un gris
//  oscuro", y lo único que se podía hacer desde un solo lugar era invertir el
//  documento entero: `filter: invert(1) hue-rotate(180deg)`.
//
//  El problema de invertir no es que se vea distinto, es que NO SE PUEDE
//  ELEGIR NADA. La inversión le pega a todo por igual: el azul de la marca
//  —#0f6ce6— salía convertido en un celeste lavado, y no había forma de
//  rescatarlo, porque cualquier ajuste que arreglara el azul rompía el resto.
//  Encima invertía las sombras, así que cada tarjeta terminaba con un halo
//  blanco alrededor.
//
//  AHORA HAY UNA PALETA DE VERDAD. Los colores de toda la app salen de las
//  variables de acá abajo, y el modo oscuro no invierte nada: cambia el valor
//  de cada variable. Eso permite justo lo que faltaba: decidir color por color.
//  El azul se queda EXACTAMENTE IGUAL en los dos modos —es el color de la
//  marca, y una marca que cambia de color según el modo no es una marca—, los
//  fondos pasan a los grises azulados de GitHub, y los textos a sus grises
//  claros, que es el ejemplo que pidió el proyecto.
//
//  POR QUÉ GITHUB. Un modo oscuro no es "lo mismo en negro": el negro puro con
//  blanco puro encima vibra y cansa a los diez minutos. GitHub usa un azul muy
//  oscuro de fondo (#0d1117), superficies apenas más claras (#161b22) y textos
//  que no llegan al blanco (#e6edf3). Esa distancia corta entre fondo y
//  superficie es lo que hace que se distingan las tarjetas sin sombras.
//
//  LO QUE SIGUE SIENDO UN FILTRO: nada. Las fotos se ven como son.
// ============================================================================

const STYLE_ID = "fw-tema";

/*
  LA PALETA.

  Cada variable es un PAPEL, no un color: `--fw-surface` es "el fondo de una
  tarjeta", y lo que valga en cada modo es un detalle. Por eso los componentes
  no saben si están en claro o en oscuro: piden el papel y les toca el color.

  Los nombres van de más oscuro a más claro en el texto (`--fw-text` es el
  título, `--fw-text-4` el dato chiquito gris) y de más claro a más oscuro en
  las líneas (`--fw-line` es apenas visible, `--fw-border-2` es la más marcada).
*/
const CLARO = `
  --fw-bg: #f3f4f6;
  --fw-surface: #ffffff;
  --fw-surface-2: #f9fafb;
  --fw-surface-3: #e5e7eb;
  --fw-chip: #111827;
  --fw-line: #ececec;
  --fw-line-soft: #f3f4f6;
  --fw-border: #e5e7eb;
  --fw-border-2: #d1d5db;
  --fw-text: #111827;
  --fw-text-2: #374151;
  --fw-text-3: #6b7280;
  --fw-text-4: #9ca3af;
  --fw-blue: #0f6ce6;
  --fw-blue-strong: #0b55c0;
  --fw-blue-bg: #eff6ff;
  --fw-blue-bg-2: #dbeafe;
  --fw-blue-line: #bfdbfe;
  --fw-blue-text: #1e40af;
  --fw-red: #dc2626;
  --fw-red-text: #dc2626;
  --fw-red-text-2: #b91c1c;
  --fw-red-bg: #fef2f2;
  --fw-red-line: #fecaca;
  --fw-green: #16a34a;
  --fw-green-text: #16a34a;
  --fw-green-text-2: #166534;
  --fw-green-bg: #f0fdf4;
  --fw-green-line: #bbf7d0;
  --fw-amber: #f59e0b;
  --fw-amber-text: #92400e;
  --fw-amber-bg: #fffbeb;
  --fw-amber-line: #fde68a;
  --fw-orange: #ea580c;
  --fw-orange-text: #9a3412;
  --fw-orange-bg: #fff7ed;
  --fw-orange-line: #fed7aa;
  /*
    EL REDONDEL QUE VA ENCIMA DE UNA FOTO: las flechas de pasar fotos.

    Es el único caso donde el fondo no es una superficie de la app sino una foto
    cualquiera, y por eso necesita su propio color en vez de reusar --fw-surface:
    tiene que ser translúcido para que se note que está apoyado encima, y a la
    vez bastante opaco para que la flecha se lea sobre cualquier foto.

    Estaba escrito a mano como rgba(255,255,255,.92) en los dos lugares que lo
    usan. En modo oscuro eso era un botón blanco brillante sobre una tarjeta
    oscura: lo primero que te saltaba a la vista de toda la pantalla, cuando es
    un control secundario.
  */
  --fw-vidrio: rgba(255,255,255,.92);
  --fw-vidrio-2: rgba(255,255,255,1);
  --fw-vidrio-texto: #374151;
  --fw-sombra: rgba(0,0,0,.08);
  --fw-sombra-fuerte: rgba(0,0,0,.18);
`;

const OSCURO = `
  --fw-bg: #0d1117;
  --fw-surface: #161b22;
  --fw-surface-2: #1c2128;
  --fw-surface-3: #21262d;
  /* La etiqueta oscura (SUV, Hatchback) no puede quedarse en #111827: sobre un
     fondo casi igual de oscuro desaparecería. Sube a un gris que se despega. */
  --fw-chip: #30363d;
  --fw-line: #262c36;
  --fw-line-soft: #21262d;
  --fw-border: #30363d;
  --fw-border-2: #3d444d;
  --fw-text: #e6edf3;
  --fw-text-2: #c9d1d9;
  --fw-text-3: #9198a1;
  --fw-text-4: #7d8590;

  /* EL AZUL NO SE TOCA. Es el color de la marca y tiene que ser el mismo en los
     dos modos: si cambiara, en oscuro la app sería de otra empresa. */
  --fw-blue: #0f6ce6;
  --fw-blue-strong: #0b55c0;
  /* Lo que en claro era un celeste bien pálido de fondo, acá es el mismo azul
     pero oscuro: mantiene el significado —"esto es azul, es lo de la marca"—
     sin encandilar. */
  --fw-blue-bg: #0d2b4d;
  --fw-blue-bg-2: #123a63;
  --fw-blue-line: #1f4b7f;
  /* El texto azul sí se aclara: #1e40af sobre fondo oscuro no se lee. */
  --fw-blue-text: #79c0ff;

  --fw-red: #c93c37;
  --fw-red-text: #ff7b72;
  --fw-red-text-2: #ff7b72;
  --fw-red-bg: #3a1c1c;
  --fw-red-line: #5c2b2b;
  --fw-green: #238636;
  --fw-green-text: #3fb950;
  --fw-green-text-2: #56d364;
  --fw-green-bg: #14301f;
  --fw-green-line: #245c39;
  --fw-amber: #d29922;
  --fw-amber-text: #e3b341;
  --fw-amber-bg: #37290f;
  --fw-amber-line: #5c471a;
  --fw-orange: #db6d28;
  --fw-orange-text: #e0864a;
  --fw-orange-bg: #38230f;
  --fw-orange-line: #5c3a1e;
  /* El redondel de encima de las fotos, en oscuro: el mismo gris de las
     superficies pero translúcido, así se apoya sobre la foto sin encandilar. */
  --fw-vidrio: rgba(22,27,34,.86);
  --fw-vidrio-2: rgba(28,33,40,.96);
  --fw-vidrio-texto: #e6edf3;
  /* En oscuro una sombra negra no se ve: lo que separa una tarjeta del fondo es
     que la tarjeta sea más clara, más un contorno. La sombra queda casi
     apagada para que no ensucie. */
  --fw-sombra: rgba(1,4,9,.5);
  --fw-sombra-fuerte: rgba(1,4,9,.7);
`;

/*
  Lo que no se pudo pasar a variables: los colores escritos como ATRIBUTO de un
  SVG (`stroke="#6b7280"`). Un atributo de presentación no admite `var()` en
  todos los navegadores, y si no lo admite el trazo se pierde y el dibujo
  desaparece. Se resuelve desde acá, apuntando al valor literal con un selector
  de atributo, que sí funciona en todos lados.
*/
const ICONOS = ["#111827", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];
const VARIABLE_DE = {
  "#111827": "--fw-text", "#374151": "--fw-text-2", "#4b5563": "--fw-text-2",
  "#6b7280": "--fw-text-3", "#9ca3af": "--fw-text-4",
  "#d1d5db": "--fw-border-2", "#e5e7eb": "--fw-border",
};
const reglasDeIconos = () => ICONOS.flatMap((c) => [
  `html.fw-dark [stroke="${c}"] { stroke: var(${VARIABLE_DE[c]}); }`,
  `html.fw-dark [fill="${c}"] { fill: var(${VARIABLE_DE[c]}); }`,
]).join("\n    ");

function ponerEstilos() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    :root { ${CLARO} }
    html.fw-dark { ${OSCURO} }

    html, body { background: var(--fw-bg); }

    /* La transición hace que prender y apagar el modo oscuro sea un fundido y
       no un parpadeo. Va solo sobre color y fondo: poner "all" acá arruinaría
       todas las animaciones de la app. */
    html.fw-cambiando, html.fw-cambiando * {
      transition: background-color .25s ease, color .25s ease, border-color .25s ease !important;
    }

    ${reglasDeIconos()}

    /*
      El mapa de OpenStreetMap es una foto de un mapa hecho para fondo claro: al
      lado de una pantalla oscura queda como una linterna. No se puede pedir un
      mapa oscuro sin cambiar de proveedor, así que se lo oscurece con un filtro
      —acá sí corresponde, porque es una imagen— bajando el brillo y girando el
      tono. Los pines y el globo se dejan afuera: son nuestros y ya están bien.
    */
    /* El gris claro que Leaflet le pone a su contenedor es lo que se ve
       mientras bajan las baldosas: en oscuro, un destello blanco. */
    html.fw-dark .leaflet-container {
      background: var(--fw-surface-2);
    }
    html.fw-dark .leaflet-tile {
      filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.9) saturate(.75);
    }
    html.fw-dark .leaflet-popup-content-wrapper,
    html.fw-dark .leaflet-popup-tip {
      background: var(--fw-surface);
      color: var(--fw-text);
      box-shadow: 0 3px 14px var(--fw-sombra-fuerte);
    }
    html.fw-dark .leaflet-bar a,
    html.fw-dark .leaflet-control-attribution {
      background: var(--fw-surface);
      color: var(--fw-text-3);
    }
    html.fw-dark .leaflet-bar a { border-bottom-color: var(--fw-border); }

    /* El calendario viene con su hoja de estilos propia, con los colores
       adentro: se lo trae a la paleta. */
    html.fw-dark .react-datepicker,
    html.fw-dark .react-datepicker__header,
    html.fw-dark .react-datepicker__month-container {
      background: var(--fw-surface);
      border-color: var(--fw-border);
      color: var(--fw-text);
    }
    /* El encabezado del calendario ya es azul con letras blancas en los dos
       modos (ver theme.css): acá solo se traen los días. */
    html.fw-dark .react-datepicker__day {
      color: var(--fw-text);
    }
    html.fw-dark .react-datepicker__day:hover {
      background: var(--fw-surface-3);
    }
    html.fw-dark .react-datepicker__day--disabled {
      color: var(--fw-text-4);
    }

    /* Los campos del navegador (calendario nativo, selects) heredan el color
       del sistema: sin esto quedan blancos en medio de la pantalla oscura. */
    html.fw-dark { color-scheme: dark; }

    ${reglasDeBotones()}

    ${reglasDeLectura()}
  `;
  document.head.appendChild(el);
}

/*
  ──────────────────────── LOS BOTONES SE HUNDEN ─────────────────────────────

  Al apretar, el botón baja un poco y se achica un pelo. Suena a adorno y no lo
  es: es la única señal de que el toque llegó. Sin eso, entre que apretás
  "Publicar" y que la pantalla cambia hay un momento en blanco donde no pasa
  nada visible, y la reacción normal es apretar de nuevo pensando que no
  anduvo. En un botón que cobra o que publica, apretar dos veces no es gratis.

  DOS INTENSIDADES. Todos los botones bajan un poco; los importantes —publicar,
  pagar, reservar, confirmar, el siguiente del formulario— bajan más y se les
  achica la sombra, que es lo que hace que se vea hundido de verdad y no
  simplemente corrido. Esos llevan `data-fw-accion`.

  :active dura lo que dura el dedo apretado, así que no hay nada que apagar
  después ni ningún estado que limpiar.

  QUIEN PIDIÓ QUE NO SE MUEVA NADA, NO SE MUEVE. `prefers-reduced-motion` es la
  preferencia del sistema de quien se marea con las animaciones. Ahí el botón se
  sigue oscureciendo al apretarlo —la señal no se pierde— pero no se mueve.
*/
function reglasDeBotones() {
  return `
    button:not(:disabled) {
      transition: transform .06s ease, box-shadow .12s ease, filter .12s ease;
    }
    button:not(:disabled):active {
      transform: translateY(1px) scale(.99);
    }
    /* Los que hacen algo importante: bajan más y pierden la sombra, que es lo
       que da la sensación de que se hunden contra la pantalla. */
    button[data-fw-accion]:not(:disabled):active {
      transform: translateY(2px) scale(.985);
      box-shadow: none;
      filter: brightness(.95);
    }
    @media (prefers-reduced-motion: reduce) {
      button:not(:disabled):active,
      button[data-fw-accion]:not(:disabled):active {
        transform: none;
      }
    }
  `;
}

/*
  ─────────────────────────── MODO LECTURA ───────────────────────────────────

  Una opción de Apariencia que cambia cómo se lee TODA la app. Está pensada
  para quien tiene dislexia, pero no solo: también sirve para leer cansado, en
  el colectivo, o con una pantalla chica.

  LA TIPOGRAFÍA VIENE CON LA APP. Es OpenDyslexic, hecha justamente para esto:
  las letras tienen la base más pesada que la parte de arriba, así que "pesan"
  hacia abajo y cuesta mucho más confundir una b con una d o una p con una q, que
  es de lo que más se da vuelta al leer. Además cada letra tiene una forma propia
  en vez de ser la misma figura espejada.

  VA EMPAQUETADA, NO PEDIDA PRESTADA. La primera versión de esto ponía
  "OpenDyslexic" al principio de una lista de tipografías, confiando en que la
  persona la tuviera instalada. Casi nadie la tiene, así que en la práctica no se
  usaba nunca: se caía en Verdana y la opción no hacía lo que su nombre decía. El
  archivo ahora viaja con la app (public/fuentes) y se declara con @font-face, así
  que se ve igual en cualquier máquina. Se baja SOLO cuando alguien prende el
  modo: quien no lo usa no paga esos kilobytes.

  Y ADEMÁS LA FORMA DEL TEXTO. La tipografía sola no alcanza: lo que también
  muestra mejoras es cuánto aire hay entre letras, entre palabras y entre
  renglones. Las dos cosas van juntas:

   · Más espacio entre letras y entre palabras. Es lo que evita que dos
     palabras cortas se lean como una sola.
   · Más alto de renglón. Al saltar de línea, el ojo tiene que encontrar el
     principio del renglón siguiente; apretados, se saltea o repite líneas.
   · Nada de cursiva. La cursiva deforma las letras y es de lo que más cuesta.
   · Un poco más de cuerpo, sin agrandar los botones ni romper el diseño.

  DETRÁS DE OPENDYSLEXIC HAY UNA LISTA DE RESPALDO, por si el archivo tarda o no
  llega: Comic Sans, Verdana y Tahoma. No es un chiste: las tres están en casi
  toda computadora y son de las que mejor se leen de las que vienen de fábrica,
  porque tienen letras anchas, bien separadas y sin adornos.

  `font-display: swap` es la diferencia entre que el texto se vea enseguida con
  el respaldo y se cambie solo cuando llega la tipografía, o que la pantalla
  quede en blanco esperando.

  DÓNDE NO SE APLICA. En los números que se leen de a uno —el código de seis
  dígitos, el año—, donde el espaciado extra los separa tanto que dejan de verse
  como un número. Ahí se respeta lo que ya tenían.
*/
function reglasDeLectura() {
  return `
    /* La tipografía vive en public/fuentes y se sirve desde la raíz del sitio.
       El navegador la baja recién cuando una regla que la usa le toca a algún
       texto de verdad, o sea solo si el modo está prendido. */
    @font-face {
      font-family: "OpenDyslexic";
      src: url("/fuentes/opendyslexic-400.woff2") format("woff2");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    /* El negrita va aparte: sin este archivo el navegador engorda el normal por
       su cuenta, y ese engordado artificial borra justamente las bases pesadas
       que hacen que la letra se distinga. */
    @font-face {
      font-family: "OpenDyslexic";
      src: url("/fuentes/opendyslexic-700.woff2") format("woff2");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    html.fw-lectura, html.fw-lectura body {
      font-family: "OpenDyslexic", "Comic Sans MS", Verdana, Tahoma,
        "Trebuchet MS", system-ui, sans-serif;
    }
    /*
      Los campos y los botones NO heredan la tipografía por su cuenta: el
      navegador les pone la suya. Se les pide que hereden, y nada más.

      SIN "!important", Y ES A PROPÓSITO. La primera versión ponía
      "font-family: inherit !important" sobre TODO, y eso le ganaba hasta a los
      estilos escritos a mano en cada componente. O sea que pisaba las tres
      tipografías que están puestas porque sí hacen falta: el monoespaciado del
      código de verificación y del token del QR —que se leen carácter por
      carácter y se alinean en columna— y la serif del cartel de la landing.
      Justamente el código, que es lo que más importa leer bien, terminaba en la
      tipografía equivocada.
    */
    html.fw-lectura input,
    html.fw-lectura button,
    html.fw-lectura select,
    html.fw-lectura textarea,
    html.fw-lectura optgroup {
      font-family: inherit;
    }
    html.fw-lectura *:not(svg):not(svg *) {
      /* Poco, porque OpenDyslexic ya viene separada de fábrica: sumándole mucho
         más, el texto se estira y empieza a salirse de los botones. */
      letter-spacing: .02em;
      word-spacing: .12em;
      line-height: 1.75;
    }
    /* La cursiva es de lo que más cuesta: se pasa a redonda. Se distingue
       igual, porque en la app siempre va acompañada de un color o un tamaño
       distinto. */
    html.fw-lectura i, html.fw-lectura em,
    html.fw-lectura [style*="italic"] {
      font-style: normal !important;
    }
    /* Un poco más grande, pero solo el texto: el 6% no mueve ninguna caja de
       lugar y se nota al leer. */
    html.fw-lectura body { font-size: 106%; }
    /* Los números que se leen de a un dígito quedan como estaban: separados
       más de la cuenta dejan de verse como un número. */
    html.fw-lectura input[inputmode="numeric"],
    html.fw-lectura input[type="number"] {
      letter-spacing: normal;
      word-spacing: normal;
    }
  `;
}

/** Prende o apaga el modo lectura. */
export function applyReadableFont(on) {
  ponerEstilos();
  const root = document.documentElement;
  if (on) root.classList.add("fw-lectura");
  else root.classList.remove("fw-lectura");
}

/** Prende o apaga el modo oscuro. */
export function applyDarkMode(on) {
  ponerEstilos();
  const root = document.documentElement;
  // La marca de "estoy cambiando" se pone un momento para que el cambio sea un
  // fundido, y se saca enseguida: si quedara puesta, cada color que cambia por
  // cualquier otro motivo tardaría un cuarto de segundo en llegar.
  root.classList.add("fw-cambiando");
  if (on) root.classList.add("fw-dark");
  else root.classList.remove("fw-dark");
  window.setTimeout(() => root.classList.remove("fw-cambiando"), 300);
}

/** Lee las preferencias guardadas y las aplica, al arrancar la app. */
export function initTheme() {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("fw_prefs") || "{}"); } catch { prefs = {}; }
  ponerEstilos();
  // Sin el fundido: al arrancar no hay nada de qué venir, y la transición haría
  // que la primera pintada se vea cambiar de color.
  if (prefs.dark) document.documentElement.classList.add("fw-dark");
  // El modo lectura también se aplica acá, antes del primer dibujo. Prendiéndolo
  // después, quien lo necesita ve un instante la pantalla como NO puede leerla,
  // y encima el texto salta de lugar al reacomodarse.
  if (prefs.lectura) document.documentElement.classList.add("fw-lectura");
}
