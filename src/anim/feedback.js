// ============================================================================
//  feedback — LAS ANIMACIONES DE LOS MOMENTOS QUE IMPORTAN
// ----------------------------------------------------------------------------
//  Acá vive el movimiento que NO lo dispara el scroll sino un hecho: un pago que
//  entró, un auto que quedó publicado, una identidad que quedó verificada, un
//  formulario que falló.
//
//  POR QUÉ ESTO NO ES ADORNO
//
//  Estas cuatro pantallas tenían todas el mismo problema y no se veía: la
//  pantalla de "pagado" y la de "pagá acá" son la MISMA pantalla con otro texto
//  adentro. Se reemplaza el contenido y listo. Quien apretó "Pagar" ve que algo
//  cambió, pero no ve QUÉ, y para saber si el pago entró tiene que ponerse a
//  leer. En un cobro, ese segundo de duda es exactamente el que hace que alguien
//  vuelva a apretar.
//
//  El tilde que se dibuja solo resuelve eso sin una palabra: dice "terminó, y
//  terminó bien" antes de que nadie lea nada. Y la sacudida del error dice lo
//  contrario igual de rápido, que es el otro caso donde la duda cuesta plata.
//
//  POR QUÉ CON anime.js Y NO CON CSS
//
//  El resto del movimiento de la app es CSS, y está bien que lo sea: entrar,
//  desvanecerse e inclinarse son estados, y un estado se describe mejor con una
//  transición. Esto son SECUENCIAS: el círculo se endereza, después el tilde se
//  dibuja de punta a punta, después sube el texto, y cada paso empieza cuando el
//  anterior va por la mitad. Escrito en CSS eso son cuatro `@keyframes` con
//  cuatro retrasos calculados a mano que hay que recalcular enteros si uno solo
//  cambia de duración. Escrito como línea de tiempo se lee como lo que es.
//
//  Y el dibujado del tilde no se puede hacer de otra forma razonable: es animar
//  `stroke-dashoffset` contra el largo real del trazo, que hay que medir del SVG
//  ya dibujado. `createDrawable` de anime.js hace esa medición.
//
//  MENOS MOVIMIENTO: con la preferencia puesta, TODAS estas funciones no hacen
//  nada y devuelven `null`. No hay versión suave que valga: son gestos que
//  existen únicamente por el movimiento. Lo que comunican ya está escrito
//  también en palabras —"Pago confirmado", "Tu auto ya está publicado"— porque
//  el color y el movimiento nunca pueden ser lo único que diga algo. Así que
//  apagados, no se pierde información: se pierde el gesto.
// ============================================================================
import { animate, createTimeline, createDrawable, createSpring, utils } from "animejs";

const menosMovimiento = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * LA CELEBRACIÓN: el círculo se endereza y el tilde se dibuja.
 *
 * Se le pasa el círculo de color que esas pantallas ya tienen dibujado. Adentro
 * busca el trazo del tilde para dibujarlo; si no encuentra ninguno, igual anima
 * el círculo, así que sirve para cualquier ícono de confirmación.
 *
 * El giro es sobre el eje X y arranca en -62 grados: el círculo entra volcado
 * hacia atrás y se endereza, como una ficha que se apoya sobre la mesa. Sobre
 * el eje Y —girando como una puerta— se leería como que algo se DA VUELTA, que
 * es el gesto de revelar una carta y no el de confirmar.
 *
 * El rebote final no es un `ease` de catálogo sino un resorte con poca fricción:
 * un resorte tiene masa, así que se pasa de largo y vuelve. Sin ese exceso, un
 * giro de 62 grados que frena justo en cero se ve como si lo hubieran frenado a
 * mano.
 *
 * @param {HTMLElement} el      El círculo del ícono.
 * @param {object} opts
 * @param {string} opts.tono    "ok" (azul, por defecto) o "verde".
 * @param {Element[]} opts.luego Elementos que suben detrás, escalonados.
 */
export function celebrar(el, { tono = "ok", luego = [] } = {}) {
  if (!el || menosMovimiento()) return null;

  // Por si quedó algo corriendo de una celebración anterior sobre el mismo
  // ícono: dos líneas de tiempo sobre el mismo elemento se pisan a mitad de
  // camino y el resultado no es ninguna de las dos.
  utils.remove(el);

  el.classList.add("fw-celebra");
  if (tono === "verde") el.classList.add("fw-celebra-verde");
  // El anillo que se expande es CSS, y se dispara sacando y poniendo la clase.
  // Sacarla primero es lo que permite que se repita: una animación de CSS sobre
  // un elemento que ya la tiene puesta no vuelve a arrancar.
  el.classList.remove("fw-celebra-activo");
  // Leer una medida obliga al navegador a resolver lo pendiente, y eso es lo
  // que separa el "sin clase" del "con clase" en dos estados distintos. Sin
  // esta línea el navegador junta las dos operaciones y no pasa nada.
  void el.offsetWidth;
  el.classList.add("fw-celebra-activo");

  const linea = createTimeline({ defaults: { ease: "outQuint" } });

  linea.add(el, {
    opacity: [0, 1],
    scale: [0.72, 1],
    rotateX: [-62, 0],
    duration: 760,
    ease: createSpring({ stiffness: 118, damping: 13 }),
  });

  /*
    EL TILDE SE DIBUJA DE PUNTA A PUNTA.

    `createDrawable` mide el largo real del trazo y lo maneja como una línea que
    se va destapando. Arranca a los 280 milisegundos, que es cuando el círculo
    ya está casi derecho: antes, el tilde se dibujaría sobre una elipse.

    LOS TIEMPOS SON ABSOLUTOS Y NO RELATIVOS, y esto costó encontrarlo. Estaban
    escritos como "-=140", o sea "140 milisegundos antes de que termine lo
    anterior", que es la forma natural de encadenar. El problema es que lo
    anterior va con un RESORTE, y un resorte no dura lo que dice `duration`:
    dura lo que tarda en dejar de rebotar, que lo calcula la librería a partir
    de la rigidez y la fricción. Así que "140 antes del final" caía mucho más
    tarde de lo pensado, el tilde empezaba a dibujarse cuando ya nadie estaba
    mirando, y a simple vista parecía que el círculo verde salía vacío.

    Con tiempos absolutos los tres pasos caen donde tienen que caer,
    independientemente de cuánto decida rebotar el resorte.

    Si el SVG no tiene trazo —un ícono relleno, por ejemplo— no hay nada que
    dibujar y el paso se saltea entero.
  */
  const trazo = el.querySelector("path, polyline");
  if (trazo) {
    const dibujable = createDrawable(trazo);
    if (dibujable.length) {
      linea.add(dibujable, { draw: ["0 0", "0 1"], duration: 460, ease: "outCubic" }, 280);
    }
  }

  if (luego.length) {
    linea.add(
      luego.filter(Boolean),
      { opacity: [0, 1], translateY: [14, 0], duration: 520, delay: (_, i) => i * 70 },
      340,
    );
  }

  return linea;
}

/**
 * LA SACUDIDA DEL ERROR.
 *
 * Se le pasa el cartel de error o el campo que falló. Se mueve seis píxeles
 * para cada lado, cuatro veces, cada una más corta que la anterior: es el gesto
 * de la cabeza que dice que no, y todo el mundo lo entiende sin que se lo
 * expliquen.
 *
 * NO ES UN TEMBLOR AL AZAR. Los valores van de mayor a menor y terminan en cero
 * exacto, así que frena sola y no queda nada que limpiar. Un temblor con
 * números al azar termina donde caiga y deja el elemento corrido.
 *
 * DURA 420 MILISEGUNDOS, y eso es a propósito: lo suficiente para verla, lo
 * justo para no estorbar a quien ya entendió y quiere corregir el campo. Una
 * sacudida larga es una traba.
 *
 * `utils.remove` primero: si llegan dos errores seguidos, el segundo no se suma
 * al primero. Sumadas, dos sacudidas dan una tercera cosa que no se parece a
 * ninguna de las dos y que puede terminar lejos del lugar.
 */
export function sacudir(el) {
  if (!el || menosMovimiento()) return null;
  utils.remove(el);
  return animate(el, {
    translateX: [0, -7, 6, -4, 3, 0],
    duration: 420,
    ease: "outQuad",
  });
}

/**
 * EL LATIDO: algo que ya estaba en pantalla cambió de valor.
 *
 * Para el contador de mensajes sin leer, el precio que se recalcula al mover
 * una fecha, el estado de una reserva que pasa a "aceptada". Sin esto, un
 * número que cambia mientras se está mirando otra parte de la pantalla cambia
 * sin que nadie se entere.
 *
 * Crece un 12% y vuelve. NO cambia de color ni de fondo: el color en esta app
 * significa estado —verde verificado, rojo rechazado— y usarlo para decir
 * "esto cambió" haría que un precio nuevo parezca un precio con problema.
 */
export function latir(el) {
  if (!el || menosMovimiento()) return null;
  utils.remove(el);
  return animate(el, {
    scale: [1, 1.12, 1],
    duration: 420,
    ease: "outQuad",
  });
}

/**
 * LA ENTRADA DE UN ELEMENTO QUE ACABA DE APARECER.
 *
 * Es lo mismo que hace `data-sc-in` desde el motor, pero para lo que NO llega
 * scrolleando: un paso de formulario que reemplaza al anterior, un panel que se
 * abre, un mensaje que entra en el chat. Ahí no hay nada que observar —el
 * elemento nace ya visible en pantalla— así que el observador no dispararía
 * nunca y hace falta llamarlo a mano.
 *
 * Los 26 píxeles de profundidad son los mismos que usa la transición entre
 * pantallas, para que los dos movimientos se lean como el mismo sistema.
 */
export function aparecer(el, { retraso = 0, profundidad = 26 } = {}) {
  if (!el || menosMovimiento()) return null;
  utils.remove(el);
  return animate(el, {
    opacity: [0, 1],
    translateY: [10, 0],
    translateZ: [-profundidad, 0],
    duration: 480,
    delay: retraso,
    ease: "outQuint",
  });
}

/**
 * LA LISTA QUE SE DESPLIEGA.
 *
 * Varios elementos entrando uno atrás del otro. El escalón por defecto es de 55
 * milisegundos: abajo de 30 no se nota que están escalonados y arriba de 80 se
 * lee como una lista que carga lento en vez de como una que se despliega.
 *
 * Con más de diez elementos el retraso deja de crecer. En una grilla de treinta
 * autos, el último tendría que esperar un segundo y medio para aparecer, y a esa
 * altura ya no es una animación de entrada: es una espera.
 */
export function desplegar(els, { paso = 55 } = {}) {
  const lista = Array.prototype.slice.call(els || []).filter(Boolean);
  if (!lista.length || menosMovimiento()) return null;
  utils.remove(lista);
  return animate(lista, {
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 460,
    delay: (_, i) => Math.min(i, 10) * paso,
    ease: "outQuint",
  });
}
