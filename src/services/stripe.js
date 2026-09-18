// ============================================================================
//  stripe.js — La pasarela de pago, cargada una sola vez
// ----------------------------------------------------------------------------
//  Stripe no se puede empaquetar con la aplicación: su librería TIENE que
//  bajarse de js.stripe.com en el momento. No es un capricho de la empresa —es
//  la condición para que los campos de la tarjeta vivan adentro de un marco que
//  pertenece a Stripe y no a nosotros. El número que se teclea nunca entra en
//  nuestro JavaScript, y por eso este proyecto no tiene que cumplir ninguna de
//  las obligaciones de quien guarda tarjetas: no las toca.
//
//  Lo que sí está acá es la CLAVE PÚBLICA, y está a propósito. Se llama pública
//  porque viaja adentro del JavaScript que descarga cualquiera que abra la
//  página: cualquiera puede leerla mirando el código, en esta aplicación y en
//  todas. Con ella se puede crear un intento de pago y nada más; para cobrar
//  hace falta la clave secreta, que vive en el servidor y no sale de ahí.
//
//  ── POR QUÉ ESTO ES UN ARCHIVO APARTE ─────────────────────────────────────
//  Por lo mismo que leaflet.js: una librería que se carga sola desde dos
//  pantallas se carga DOS VECES. Con Leaflet eso ya rompió los clics del mapa
//  —dos copias del código y las comprobaciones internas dejando de reconocer
//  sus propios objetos— y se arregló con un único cargador memorizado. Acá la
//  promesa se guarda igual: la primera llamada baja la librería, las demás
//  esperan a la misma.
// ============================================================================

import { loadStripe } from "@stripe/stripe-js";

/*
  LA CLAVE DE PRUEBA VIENE PUESTA, Y NO ES UN DESCUIDO.

  Es la clave PÚBLICA de la cuenta de Stripe del proyecto, en modo de prueba.
  Las claves públicas viajan adentro del JavaScript que descarga cualquiera que
  abra la página —en esta aplicación y en todas—, así que ponerla acá no revela
  nada que no se revele igual al publicar el sitio. Con ella solo se puede
  armar un cobro contra un intento que el servidor ya creó; cobrar de verdad
  necesita la clave SECRETA, que está en el servidor y no sale de ahí. Y además
  es de prueba: `pk_test_` no mueve un peso real, y el servidor de este proyecto
  se niega a arrancar con una clave que no sea de prueba.

  Viene puesta para que el sitio publicado cobre sin tener que ir a cargar una
  variable a mano en Vercel. VITE_STRIPE_PUBLISHABLE_KEY la pisa, que es lo que
  hay que usar el día que se pase a cobrar de verdad: ahí la clave sí se carga
  como variable y NO se escribe en el código.
*/
const CLAVE_DE_PRUEBA = "pk_test_51UHA8TLmU3IdbjVZcRHnLfEf9z1HXz3LsSsX2II84O5ecSxWbSjz7CeaMVNqymd277fKmmRD4LtHr8g5IZciSPrG00baF2ay9e";

/*
  `off` apaga la pasarela a propósito.

  Sin esto no habría forma de volver al camino simulado, porque con la clave
  puesta por defecto la pasarela está SIEMPRE disponible y el camino de la
  simulación quedaría escrito y muerto. Sirve para desarrollar contra un
  servidor levantado con PAYMENTS_PROVIDER=mock, que es como corren las pruebas
  automáticas del backend.
*/
const CONFIGURADA = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const CLAVE = CONFIGURADA === "off" ? "" : (CONFIGURADA || CLAVE_DE_PRUEBA);

/**
 * Si esta copia del front está configurada para cobrar de verdad.
 *
 * Sin clave no hay pasarela, y la pantalla de pago tiene que DECIRLO en vez de
 * mostrar un formulario de tarjeta que no va a llevar a ningún lado. Es la
 * misma idea que con VITE_IA_URL: lo que no está cargado se anuncia, no se
 * simula.
 */
export const hayPasarela = () => Boolean(CLAVE);

/**
 * Si la clave es de prueba.
 *
 * Las claves de Stripe llevan el modo escrito adelante: `pk_test_` es la cuenta
 * de prueba y `pk_live_` la real. Que la pantalla pueda decir "esto es modo de
 * prueba, no se cobra plata de verdad" sale de mirar la clave y no de una
 * variable aparte que alguien se puede olvidar de cambiar.
 */
export const esModoPrueba = () => CLAVE.startsWith("pk_test_");

let promesa = null;

/**
 * La librería de Stripe, cargada una sola vez.
 *
 * Devuelve `null` —y no una excepción— cuando no hay clave o cuando la librería
 * no se pudo bajar. Quien llama tiene que poder distinguir "no se puede cobrar
 * acá" de "el cobro falló", que son dos carteles distintos, y un error tirado
 * desde acá los mezcla.
 *
 * Si la carga falla, la promesa se suelta para que el próximo intento vuelva a
 * probar: una caída de red de dos segundos no puede dejar la pantalla sin pago
 * hasta que alguien recargue.
 */
export function cargarStripe() {
  if (!CLAVE) return Promise.resolve(null);
  if (!promesa) {
    promesa = loadStripe(CLAVE).catch(() => {
      promesa = null;
      return null;
    });
  }
  return promesa;
}

/**
 * Cómo se ve un campo de tarjeta de Stripe con los colores de la aplicación.
 *
 * Los campos viven adentro de un marco de Stripe, así que NO los alcanza el CSS
 * de la página: si esto no se pasa, quedan con la tipografía y el negro de
 * fábrica en el medio de un formulario claro, y en modo oscuro directamente
 * negro sobre negro. Los valores se leen de las variables del tema al momento
 * de crear los campos, que es lo que los hace seguir el modo elegido.
 */
export function aparienciaDeLosCampos() {
  const leer = (nombre, porDefecto) => {
    if (typeof window === "undefined") return porDefecto;
    const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return valor || porDefecto;
  };
  return {
    base: {
      fontFamily: "inherit",
      fontSize: "15px",
      color: leer("--fw-text", "#101828"),
      "::placeholder": { color: leer("--fw-text-4", "#98a2b3") },
      iconColor: leer("--fw-text-3", "#667085"),
    },
    invalid: {
      color: leer("--fw-red-text-2", "#b42318"),
      iconColor: leer("--fw-red-text-2", "#b42318"),
    },
  };
}
