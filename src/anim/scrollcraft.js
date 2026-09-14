// ============================================================================
//  scrollcraft — EL MOTOR DE MOVIMIENTO DE LA APP
// ----------------------------------------------------------------------------
//  QUÉ ES
//
//  Un solo motor que lee marcas `data-sc-*` escritas en el HTML que ya existe y
//  las mueve. NO dibuja nada: no crea elementos, no envuelve componentes, no
//  cambia un color ni un tamaño. Se le pone `data-sc-in` a una tarjeta que ya
//  estaba y esa tarjeta ahora entra desde el fondo cuando aparece en pantalla.
//  Si mañana se saca la marca, la tarjeta queda exactamente como está hoy.
//
//  Esa es la razón de que el movimiento no viva adentro de cada componente: son
//  ochenta archivos con estilos en línea, y meterle un `useEffect` con un
//  observador a cada uno son ochenta observadores, ochenta relojes y ochenta
//  formas distintas de hacer lo mismo. Acá hay UN observador, UN lector de
//  scroll y UN cuadro por fotograma para toda la aplicación.
//
//  La gramática `data-sc-*` viene de la skill scroll-craft (.claude/skills), que
//  la definió para páginas sueltas de HTML. Su motor original no sirve tal cual
//  acá porque monta una vez y no se desmonta nunca: en una aplicación de una
//  sola página, donde el contenido entero se reemplaza en cada ruta, eso deja
//  escuchadores colgados y no ve nada de lo que llega después. Este motor habla
//  la misma gramática y además mira los cambios del documento, así que una
//  pantalla que se dibuja al cambiar de ruta se engancha sola.
//
//  ─────────────────────────────── LOS APAREJOS ──────────────────────────────
//
//   data-sc-in="up|depth|left|right|scale"
//        Entra UNA vez, cuando el elemento aparece en pantalla. `depth` es el
//        que da profundidad: viene desde atrás (translateZ negativo) y rotado
//        apenas sobre el eje X, así que se ve como si se enderezara hacia el
//        lector. Por defecto: "up".
//        UNA VEZ Y NO CADA VEZ: contenido que se vuelve a esconder al subir el
//        scroll es un defecto, no un efecto. Quien sube a releer algo se lo
//        encuentra ahí.
//
//   data-sc-stagger="60"
//        En un contenedor: sus hijos directos con `data-sc-in` entran uno atrás
//        del otro, con esa cantidad de milisegundos entre cada uno. Entre 30 y
//        80 se lee como una cosa sola que se despliega; más arriba de 100 se
//        lee como una lista lenta.
//
//   data-sc-depth="-0.12"
//        Profundidad continua mientras se scrollea: el elemento se desplaza en
//        Y a una fracción de lo que se desplaza la página. Negativo = sube más
//        rápido que el scroll, o sea que se lee como si estuviera MÁS LEJOS.
//        De 0.12 para arriba agrega además un cambio de escala, porque lo lejano
//        no solo se mueve distinto: también se ve más chico. Abajo de ahí no,
//        porque esos valores se usan sobre texto (ver `leer`).
//
//   data-sc-tilt="6"
//        Se inclina en 3D hacia el puntero, hasta esa cantidad de grados. Va
//        amortiguado: sigue al mouse con peso, no pegado a él.
//        SOLO CON MOUSE. En una pantalla táctil no existe "pasar por encima", y
//        forzarlo hace que la tarjeta se quede torcida después de tocarla.
//
//   data-sc-spotlight
//        Publica `--sc-mx` y `--sc-my` (0..1) con la posición del puntero
//        adentro del elemento, para que un brillo lo siga desde el CSS.
//
//   data-sc-count="4200"
//        El número trepa hasta ese valor la primera vez que se lo ve. Para
//        cifras que son el dato principal de la pantalla, no para cualquier
//        número suelto.
//
//  QUÉ SE PUEDE COMBINAR EN UN MISMO ELEMENTO. Los tres primeros escriben la
//  misma propiedad, `transform`, así que no pueden estar los tres. Las reglas:
//
//   · `in` + `tilt` SÍ, y es la combinación normal de una tarjeta: entra al
//     scrollear y después responde al mouse. Se turnan, no se pisan (ver `tic`).
//   · `depth` con cualquiera de los otros dos NO: la profundidad escribe en cada
//     fotograma y para siempre, así que no hay turno que valga. Cuando hacen
//     falta las dos, van en dos elementos anidados: el de afuera con `depth`, el
//     de adentro con `in`.
//   · `spotlight` y `count` no transforman nada y se combinan con cualquiera.
//
//  ──────────────────────── MENOS MOVIMIENTO, NO CERO ─────────────────────────
//
//  Con `prefers-reduced-motion` activado se apaga TODO lo que cambia de
//  posición: la profundidad, la inclinación, el desplazamiento de entrada. Lo
//  que queda es la opacidad, porque eso es lo que comunica —"esto recién
//  aparece"— y no es lo que marea. Es la misma regla que ya siguen el aviso de
//  abajo y la propaganda del inicio.
//
//  Y se relee en vivo: quien prende la preferencia en mitad de la sesión no
//  tiene que recargar.
// ============================================================================

// El único suavizado de la app. Sale de la skill (`--sc-ease-out`) y es el
// mismo que ya usaban el menú y el aviso: arranca rápido y frena largo, que es
// lo que hace que algo se lea como que "llegó" y no como que "se desplazó".
export const SALIDA = "cubic-bezier(.22, 1, .36, 1)";

// Cuánto de la diferencia se recorre por fotograma cuando algo persigue al
// puntero. Más bajo, más pesado. 0.09 es el del motor original y está bien:
// seguir al mouse exacto se lee artificial porque no tiene inercia.
const PESO_PUNTERO = 0.09;

const consultaMenosMovimiento = () =>
  typeof matchMedia === "function"
    ? matchMedia("(prefers-reduced-motion: reduce)")
    : null;

// ¿Hay mouse de verdad? Un teléfono responde que no, y ahí la inclinación y el
// brillo que siguen al puntero no se encienden nunca.
const hayPuntero = () =>
  typeof matchMedia === "function"
    ? matchMedia("(hover: hover) and (pointer: fine)").matches
    : false;

const limitar = (n, min, max) => (n < min ? min : n > max ? max : n);

/*
  El estado de entrada de cada aparejo de `data-sc-in`.

  Está acá y no en el CSS porque la variante se elige por elemento y son cinco;
  escritas en la hoja serían cinco clases más que hay que recordar mantener al
  lado de esta tabla. El estado FINAL, en cambio, es siempre el mismo —quieto y
  opaco— y por eso sí vive en motion.css, que es lo que borra el movimiento
  cuando la preferencia de accesibilidad está puesta.
*/
const ENTRADAS = {
  up: "translate3d(0, 18px, 0)",
  // El de profundidad: viene desde atrás y apenas volcado, como una hoja que se
  // endereza. Los 4 grados son a propósito: con 10 se lee como un truco.
  depth: "perspective(1200px) translate3d(0, 22px, -60px) rotateX(4deg)",
  left: "translate3d(-22px, 0, 0)",
  right: "translate3d(22px, 0, 0)",
  // Nunca desde scale(0): nada en el mundo real aparece de la nada.
  scale: "scale(.96)",
};

/**
 * Enciende el motor sobre un elemento (normalmente `document.body`).
 *
 * Devuelve `{ escanear, apagar }`:
 *  · escanear() vuelve a recorrer el árbol. No hace falta llamarlo a mano en
 *    el uso normal —el observador de cambios lo hace solo—, pero está expuesto
 *    para el caso en que algo cambie sin tocar el DOM (por ejemplo, una imagen
 *    que termina de cargar y corre todo lo de abajo).
 *  · apagar() suelta absolutamente todo: observadores, escuchadores y el bucle.
 *    Sin esto, en una aplicación de una sola página cada montaje dejaría un
 *    bucle más corriendo para siempre.
 */
export function montarScrollCraft(raiz = document.body) {
  if (!raiz || typeof window === "undefined") return { escanear() {}, apagar() {} };

  const mq = consultaMenosMovimiento();
  let menos = Boolean(mq && mq.matches);

  // Los tres registros del motor. Son listas planas a propósito: el bucle las
  // recorre sesenta veces por segundo y un Map o un querySelectorAll por
  // fotograma serían el costo de todo esto.
  let profundidades = [];   // [{ el, tasa }]
  let inclinaciones = [];   // [{ el, grados, x, y, dx, dy, r }]
  let focos = [];           // [{ el, r }]

  let vh = innerHeight;
  let pendiente = false;    // ¿hay ya un fotograma pedido para leer el scroll?
  let bucle = 0;
  let observador = null;    // IntersectionObserver de las entradas
  let mutaciones = null;    // MutationObserver de los cambios de ruta
  let reScan = 0;

  /* ─────────────────────────── entradas (data-sc-in) ───────────────────── */

  /*
    POR QUÉ ES UN IntersectionObserver Y NO EL BUCLE.

    Una entrada ocurre una sola vez por elemento. Preguntarle su posición en
    cada fotograma a los cincuenta elementos de una grilla, para algo que va a
    pasar una vez, es cincuenta lecturas de geometría por fotograma tiradas a
    la basura —y cada una obliga al navegador a recalcular el diseño—. El
    observador avisa él, sin costo, y se desuscribe al primer disparo.

    El margen de -8% abajo es para que la entrada arranque cuando el elemento ya
    está francamente adentro y no cuando asoma un píxel: asomando, la animación
    se la pierde quien scrollea rápido.
  */
  const vistos = new WeakSet();
  /*
    LOS QUE ESTÁN ESPERANDO SU TURNO, Y POR QUÉ HACE FALTA ANOTARLOS.

    El observador guarda una referencia FUERTE a todo lo que mira, y solo la
    suelta cuando se le dice que deje de mirarlo. Un elemento que entra en
    pantalla se desengancha solo, así que ese caso está cubierto. El que no está
    cubierto es el que se va del documento SIN haber entrado nunca en pantalla,
    que acá pasa todo el tiempo: se escribe una marca en el buscador, la mitad
    de las tarjetas de abajo desaparecen antes de que nadie las viera, y cada
    una de esas queda observada para siempre. Una tarde filtrando son cientos de
    nodos muertos que el navegador no puede liberar.

    Con la lista se los puede repasar en cada escaneo y soltar los que ya no
    están en el documento.
  */
  const pendientes = new Set();

  function prepararEntrada(el) {
    if (vistos.has(el)) return;
    vistos.add(el);
    const modo = el.getAttribute("data-sc-in") || "up";
    el.classList.add("sc-in");
    if (!menos) {
      const desde = ENTRADAS[modo] || ENTRADAS.up;
      el.style.setProperty("--sc-desde", desde);
    }
    /*
      EL ESCALONADO SE DECIDE ACÁ Y NO AL ENTRAR.

      El retraso de cada hijo se calcula por su posición entre los hermanos, en
      el momento de engancharlo. Calcularlo al disparar sería tentador —"el
      tercero que entra espera el triple"— pero da un resultado distinto según
      desde dónde se scrollee: bajando, el de arriba es el primero; subiendo, el
      de abajo. El orden del documento es el mismo siempre.
    */
    const padre = el.parentElement;
    const paso = padre && Number(padre.getAttribute("data-sc-stagger"));
    if (paso > 0) {
      const hermanos = padre.children;
      let i = 0;
      for (let k = 0; k < hermanos.length; k++) {
        if (hermanos[k] === el) { i = k; break; }
      }
      // Con un tope: en una grilla de sesenta autos, el último no puede esperar
      // cuatro segundos para aparecer. Pasados los diez, entran todos juntos.
      el.style.setProperty("--sc-retraso", `${Math.min(i, 10) * paso}ms`);
    }
    observador.observe(el);
    pendientes.add(el);
  }

  function entrar(el) {
    /*
      --sc-desde NO SE BORRA ACÁ, y es a propósito: el fotograma inicial de la
      animación de entrada lo lee (ver `fw-sc-entra` en motion.css). Borrarlo al
      empezar dejaría la animación arrancando desde "ningún lado", o sea desde
      su posición final, y no se vería moverse nada.
    */
    el.classList.add("sc-visible");
    observador.unobserve(el);
    pendientes.delete(el);
    if (el.hasAttribute("data-sc-count")) revisarContadores();
  }

  /* ───────────────────────── el número que trepa ───────────────────────── */

  /*
    LOS NÚMEROS QUE TREPAN.

    `data-sc-count` lleva el valor de destino, y el contenido del elemento es lo
    que se va reescribiendo hasta llegar. Sube frenando al final: los últimos
    números pasan despacio, que es donde está mirando el ojo.

    POR QUÉ SE VUELVE A MIRAR EN CADA ESCANEO Y NO UNA SOLA VEZ AL APARECER.

    Estos números casi nunca están cuando la pantalla se dibuja: el panel del
    dueño muestra "..." mientras el servidor contesta y recién después pone la
    cantidad de autos. Mirado una sola vez, al momento de aparecer, el valor
    sería "..." —no es un número— y la animación no correría nunca, justo en el
    caso normal.

    El registro guarda desde qué valor arrancar, así que un número que cambia
    de 3 a 5 trepa de 3 a 5 y no desde cero: volver a cero cada vez que el
    servidor contesta se lee como que la cifra se reinició.

    LO QUE ESTO NO GARANTIZA, y hay que decirlo: si el número cambia sin que
    nada más del documento se mueva, no hay escaneo y la animación se la pierde.
    Ahí el número igual queda BIEN —React ya escribió el valor correcto en la
    pantalla— y lo único que falta es el gesto. Un contador que se pierde una
    animación es un detalle; uno que muestra un número viejo sería un error, y
    eso no puede pasar.
  */
  const contados = new WeakMap();

  function revisarContadores() {
    const nums = raiz.querySelectorAll("[data-sc-count]");
    for (let i = 0; i < nums.length; i++) {
      const el = nums[i];
      // Todavía no entró en pantalla: que espere su turno.
      if (!el.classList.contains("sc-visible")) continue;
      const hasta = Number(el.getAttribute("data-sc-count"));
      if (!isFinite(hasta)) continue;
      const desde = contados.get(el);
      if (desde === hasta) continue;
      contados.set(el, hasta);
      trepar(el, typeof desde === "number" ? desde : 0, hasta);
    }
  }

  function trepar(el, desde, hasta) {
    if (menos) { el.textContent = hasta.toLocaleString(); return; }
    const DURACION = 1100;
    const t0 = performance.now();
    const paso = (ahora) => {
      // Si el destino cambió en el medio, esta animación ya no es la vigente y
      // se abandona: dos animaciones escribiendo el mismo elemento lo dejarían
      // parpadeando entre dos cuentas.
      if (contados.get(el) !== hasta) return;
      const p = limitar((ahora - t0) / DURACION, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(desde + (hasta - desde) * e).toLocaleString();
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ──────────────────────────── la lectura del scroll ──────────────────── */

  /*
    UNA SOLA LECTURA POR FOTOGRAMA, Y TODAS LAS ESCRITURAS DESPUÉS.

    `getBoundingClientRect` obliga al navegador a resolver el diseño pendiente.
    Si se lee, se escribe, se vuelve a leer y se vuelve a escribir —que es lo
    que pasa sin querer cuando cada componente maneja lo suyo—, el navegador
    recalcula el diseño una vez por elemento. Acá se leen todas las posiciones
    primero y recién ahí se escriben todas las transformaciones.
  */
  /*
    LAS MEDIDAS DE LAS TARJETAS QUE SE INCLINAN SE GUARDAN, NO SE PREGUNTAN.

    La inclinación necesita saber dónde está cada tarjeta para decidir si el
    mouse está adentro. Preguntárselo al navegador en cada movimiento del mouse
    —que llega decenas de veces por segundo— sobre una grilla de cuarenta autos
    son cuarenta cálculos de diseño por evento, y eso se siente: el mouse
    empieza a arrastrarse.

    Así que las posiciones se toman en los tres momentos en que pueden haber
    cambiado —al enganchar, al scrollear y al redimensionar— y el movimiento del
    mouse no hace más que restar números.
  */
  function medirInclinaciones() {
    for (let i = 0; i < inclinaciones.length; i++) {
      inclinaciones[i].r = inclinaciones[i].el.getBoundingClientRect();
    }
    for (let i = 0; i < focos.length; i++) {
      focos[i].r = focos[i].el.getBoundingClientRect();
    }
  }

  function leer() {
    medirInclinaciones();
    if (menos || !profundidades.length) return;
    for (let i = 0; i < profundidades.length; i++) {
      const d = profundidades[i];
      const r = d.el.getBoundingClientRect();
      // Nada que hacer con lo que no está en pantalla, ni un poco.
      if (r.bottom < -200 || r.top > vh + 200) continue;
      /*
        EL PUNTO CERO ES DONDE EL ELEMENTO ESTABA ANTES DE EMPEZAR A SCROLLEAR.

        Es la decisión importante de todo este aparejo. Lo natural sería medir
        contra el centro de la pantalla —cero cuando el elemento está en el
        medio— pero eso tiene una consecuencia que se ve al primer vistazo: al
        abrir la página, sin haber tocado nada, el título del bloque principal ya
        estaría catorce píxeles más arriba de donde lo puso el diseño. Nadie
        scrolleó todavía y la pantalla ya no es la que se dibujó.

        Midiendo contra el ANCLA —el scroll a partir del cual el elemento empieza
        a asomar por abajo, o cero si ya estaba a la vista— la página en reposo
        se ve exactamente igual que sin esto, y la profundidad aparece recién
        cuando alguien mueve la rueda. Que es cuando tiene sentido: la
        profundidad se percibe por el movimiento relativo, así que quieto no
        había nada que mostrar de todos modos.
      */
      const p = (scrollY - d.ancla) / (vh || 1);
      const y = (p * d.tasa * vh).toFixed(2);
      /*
        LA ESCALA SOLO EN LOS PLANOS LEJANOS DE VERDAD.

        Lo que está lejos se ve más chico, y sin ese cambio de tamaño el
        desplazamiento se lee como que la foto resbala adentro de su marco en vez
        de como profundidad. Pero eso vale para una FOTO. Sobre TEXTO, una escala
        de 1.004 lo deja entre dos píxeles y el navegador lo dibuja apenas
        borroso: se pierde nitidez a cambio de un efecto que en un título de dos
        renglones no se ve.

        El corte está en 0.12, que es la frontera entre las dos maneras de usar
        esto: abajo de ahí son los desplazamientos chicos con los que un título y
        su bajada se separan entre sí; arriba, una foto de fondo que tiene que
        leerse lejos.
      */
      const escala = Math.abs(d.tasa) >= 0.12
        ? ` scale(${(1 + Math.abs(d.tasa) * 0.06).toFixed(4)})`
        : "";
      d.el.style.transform = `translate3d(0, ${y}px, 0)${escala}`;
    }
  }

  function alScrollear() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { leer(); pendiente = false; });
  }

  /* ─────────────────────────── el puntero (3D) ─────────────────────────── */

  function alMover(e) {
    for (let i = 0; i < inclinaciones.length; i++) {
      const t = inclinaciones[i];
      const r = t.r;
      if (!r || !r.width || !r.height) continue;
      const dentro =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      if (!dentro) { t.dx = 0; t.dy = 0; continue; }
      // -1..1 desde el centro de la tarjeta.
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      // El signo: el borde de arriba se aleja cuando el mouse está arriba, así
      // que la tarjeta "mira" hacia el puntero en vez de escaparse de él.
      t.dy = nx * t.grados;
      t.dx = -ny * t.grados;
    }
    for (let i = 0; i < focos.length; i++) {
      const f = focos[i];
      if (!f.r || !f.r.width || !f.r.height) continue;
      f.el.style.setProperty("--sc-mx", limitar((e.clientX - f.r.left) / f.r.width, 0, 1).toFixed(3));
      f.el.style.setProperty("--sc-my", limitar((e.clientY - f.r.top) / f.r.height, 0, 1).toFixed(3));
    }
  }

  /*
    El bucle de la inclinación.

    Va aparte del scroll porque no lo dispara el scroll: cuando el mouse se
    queda quieto la tarjeta todavía tiene que terminar de acomodarse, y cuando
    se va tiene que volver sola a cero. Se apaga solo: mientras nada esté
    torcido ni haya destino al que ir, no escribe nada.
  */
  function tic() {
    for (let i = 0; i < inclinaciones.length; i++) {
      const t = inclinaciones[i];
      /*
        MIENTRAS ESTÁ ENTRANDO, LA INCLINACIÓN NO TOCA NADA.

        Una tarjeta puede llevar `data-sc-in` y `data-sc-tilt` a la vez, y es la
        combinación que más se usa: entra desde el fondo al scrollear y después
        responde al mouse. Los dos escriben `transform`, pero nunca a la vez,
        porque se turnan: mientras la entrada está corriendo la inclinación se
        saltea el elemento, y cuando termina —clase `sc-visible` puesta— la
        entrada ya no vuelve a escribir nunca más.

        Sin esta guarda, pasar el mouse por encima de una tarjeta a mitad de su
        entrada la clava en su lugar final de golpe.
      */
      if (t.el.classList.contains("sc-in") && !t.el.classList.contains("sc-visible")) continue;
      t.x += (t.dx - t.x) * PESO_PUNTERO;
      t.y += (t.dy - t.y) * PESO_PUNTERO;
      if (Math.abs(t.x) > 0.002 || Math.abs(t.y) > 0.002) {
        t.el.style.transform =
          `perspective(900px) rotateX(${t.x.toFixed(3)}deg) rotateY(${t.y.toFixed(3)}deg)`;
      } else if (t.x !== 0 || t.y !== 0) {
        // El último fotograma: se limpia en vez de dejar una transformación de
        // ceros escrita, que crearía un contexto 3D permanente en cada tarjeta
        // que el mouse haya rozado alguna vez.
        t.x = 0; t.y = 0;
        t.el.style.removeProperty("transform");
      }
    }
    bucle = requestAnimationFrame(tic);
  }

  /* ──────────────────────────────── el escaneo ─────────────────────────── */

  function escanear() {
    // Las entradas: se preparan una por una y el WeakSet evita repetir. Una
    // entrada ya disparada no vuelve, así que no hay nada que rehacer.
    const entradas = raiz.querySelectorAll("[data-sc-in]");
    for (let i = 0; i < entradas.length; i++) prepararEntrada(entradas[i]);

    // Y se sueltan los que se fueron del documento sin llegar a entrar.
    for (const el of pendientes) {
      if (!el.isConnected) { observador.unobserve(el); pendientes.delete(el); }
    }

    // El resto sí se rehace entero: son elementos que el motor mueve en cada
    // fotograma, y guardar la referencia de uno que ya no está en el documento
    // es una fuga de memoria con forma de nodo huérfano.
    profundidades = [];
    const profs = raiz.querySelectorAll("[data-sc-depth]");
    for (let i = 0; i < profs.length; i++) {
      const tasa = Number(profs[i].getAttribute("data-sc-depth"));
      if (!tasa) { profs[i].style.removeProperty("transform"); continue; }
      /*
        El ancla se mide con el elemento en su lugar real, o sea SIN la
        transformación puesta: por eso se borra antes de medir. Midiendo con la
        transformación aplicada, cada escaneo correría el ancla un poco más y el
        elemento se iría alejando de su sitio escaneo tras escaneo.
      */
      profs[i].style.removeProperty("transform");
      const r = profs[i].getBoundingClientRect();
      profundidades.push({
        el: profs[i],
        tasa: limitar(tasa, -0.5, 0.5),
        ancla: Math.max(0, r.top + scrollY - vh),
      });
    }

    if (hayPuntero() && !menos) {
      const previas = new Map(inclinaciones.map(t => [t.el, t]));
      inclinaciones = [];
      const tilts = raiz.querySelectorAll("[data-sc-tilt]");
      for (let i = 0; i < tilts.length; i++) {
        const el = tilts[i];
        // Si la tarjeta ya estaba inclinada, se conserva su ángulo actual: sin
        // esto, cualquier redibujado de React la haría saltar a cero.
        const antes = previas.get(el);
        inclinaciones.push({
          el,
          grados: limitar(Number(el.getAttribute("data-sc-tilt")) || 6, 0, 14),
          x: antes ? antes.x : 0, y: antes ? antes.y : 0,
          dx: 0, dy: 0, r: null,
        });
      }
      focos = Array.prototype.map.call(
        raiz.querySelectorAll("[data-sc-spotlight]"),
        (el) => ({ el, r: null }),
      );
    } else {
      // Sin mouse o con la preferencia puesta no hay nada que perseguir, y las
      // listas tienen que quedar vacías: guardadas, el bucle seguiría escribiendo
      // sobre tarjetas que React ya sacó del documento.
      inclinaciones = [];
      focos = [];
    }

    revisarContadores();
    leer();
  }

  /* ──────────────────────────────── arranque ──────────────────────────── */

  observador = new IntersectionObserver((filas) => {
    for (let i = 0; i < filas.length; i++) {
      if (filas[i].isIntersecting) entrar(filas[i].target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

  /*
    EL OBSERVADOR DE CAMBIOS ES LO QUE HACE QUE ESTO ANDE EN UNA SPA.

    React reemplaza el contenido entero al cambiar de ruta, y también va
    agregando tarjetas a medida que llegan del servidor. Sin esto, el motor
    engancharía lo que hubiera en el primer dibujado y nada más.

    Mira solo nodos AGREGADOS, no atributos ni texto: en el chat, donde se
    escribe letra por letra, observar el texto sería un escaneo por tecla. Y aun
    así el escaneo se junta en un solo fotograma, porque React agrega los nodos
    de a montones y cada montón dispararía el suyo.
  */
  mutaciones = new MutationObserver((lista) => {
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].addedNodes.length) {
        if (!reScan) reScan = requestAnimationFrame(() => { reScan = 0; escanear(); });
        return;
      }
    }
  });
  mutaciones.observe(raiz, { childList: true, subtree: true });

  const alRedimensionar = () => { vh = innerHeight; leer(); };

  addEventListener("scroll", alScrollear, { passive: true });
  addEventListener("resize", alRedimensionar, { passive: true });
  if (hayPuntero()) addEventListener("pointermove", alMover, { passive: true });

  // Que la preferencia se pueda cambiar sin recargar: al prenderla, todo lo que
  // esté torcido o corrido vuelve a su lugar en el acto.
  const alCambiarPreferencia = () => {
    menos = Boolean(mq && mq.matches);
    if (menos) {
      for (let i = 0; i < profundidades.length; i++) profundidades[i].el.style.removeProperty("transform");
      for (let i = 0; i < inclinaciones.length; i++) inclinaciones[i].el.style.removeProperty("transform");
      inclinaciones = [];
      focos = [];
      if (bucle) { cancelAnimationFrame(bucle); bucle = 0; }
    }
    escanear();
    // Al apagar la preferencia, el bucle del puntero vuelve a arrancar: sin
    // esto, quien la prueba y la saca se queda sin inclinación hasta recargar.
    if (!menos && !bucle && hayPuntero()) bucle = requestAnimationFrame(tic);
  };
  if (mq && mq.addEventListener) mq.addEventListener("change", alCambiarPreferencia);

  escanear();
  if (hayPuntero() && !menos) bucle = requestAnimationFrame(tic);

  return {
    escanear,
    apagar() {
      removeEventListener("scroll", alScrollear);
      removeEventListener("resize", alRedimensionar);
      removeEventListener("pointermove", alMover);
      if (mq && mq.removeEventListener) mq.removeEventListener("change", alCambiarPreferencia);
      if (mutaciones) mutaciones.disconnect();
      if (observador) observador.disconnect();
      if (bucle) cancelAnimationFrame(bucle);
      if (reScan) cancelAnimationFrame(reScan);
      profundidades = []; inclinaciones = []; focos = [];
      pendientes.clear();
    },
  };
}
