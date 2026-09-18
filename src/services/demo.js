// ============================================================================
//  demo.js — El interruptor de la demo
// ----------------------------------------------------------------------------
//  PARA QUÉ EXISTE. La app depende de un backend que no siempre está: la base
//  está desplegada por otra persona, el servicio que lee los documentos puede no
//  estar configurado, y el de IA tiene un límite de pedidos por minuto. Para
//  mostrar Freewheel —una clase, una entrega, un video— eso es un problema, y no
//  uno que se pueda arreglar en el momento.
//
//  La demo es la app ENTERA andando sin nadie del otro lado. No es una pantalla
//  de ejemplo ni un modo recortado: son las mismas pantallas, los mismos
//  botones y los mismos caminos, con un servidor de mentira contestando desde el
//  propio navegador. Lo que se hace adentro se guarda, así que publicar un auto,
//  reservarlo y verlo en "Mis reservas" funciona de punta a punta.
//
//  ── POR QUÉ ACÁ Y NO EN UNA RAMA APARTE ───────────────────────────────────
//  La primera versión de esto fue una rama separada. Una rama se desactualiza:
//  cada arreglo que entra en `main` hay que llevarlo a mano, y el día que hace
//  falta la demo resulta que le faltan tres meses de cambios. Adentro del
//  proyecto, con un interruptor, la demo es siempre la última versión de la app.
//
//  ── LA REGLA QUE ORDENA TODO ESTO ─────────────────────────────────────────
//  APAGADA, LA DEMO NO EXISTE. Ni un pedido cambiado, ni un dato distinto, ni un
//  milisegundo de más en producción: la única pregunta que se hace la app normal
//  es un booleano leído de `localStorage`. Si alguna vez hay que elegir entre
//  que la demo quede más linda y que la app de verdad no se entere de que
//  existe, gana la app de verdad.
// ============================================================================

const LLAVE = "fw_demo";

/*
  Se lee una sola vez al arrancar y queda en memoria.

  Preguntarle a `localStorage` en cada pedido sería una lectura sincrónica al
  disco por cada llamada al servidor. Y peor: prender o apagar la demo a mitad
  de una sesión dejaría media app con datos de mentira y media con datos reales,
  que es el peor estado posible. Al cambiar se recarga la página (ver abajo) y
  así se arranca entero de un lado o entero del otro.
*/
let encendida = false;
try {
  encendida = localStorage.getItem(LLAVE) === "1";
} catch {
  // Navegador con el almacenamiento bloqueado: sin demo, que es lo correcto.
  encendida = false;
}

/** ¿Está corriendo la demo? */
export const enDemo = () => encendida;

/**
 * Prende o apaga la demo y recarga.
 *
 * La recarga no es pereza: es lo único que garantiza que no queden datos de un
 * mundo mezclados con los del otro. Contextos ya montados, listas ya pedidas,
 * la sesión guardada —todo eso se armó cuando la app arrancó, y no hay forma
 * honesta de cambiarlo a mitad de camino.
 */
export function ponerDemo(valor, destino = "/") {
  try {
    if (valor) localStorage.setItem(LLAVE, "1");
    else localStorage.removeItem(LLAVE);
  } catch { /* sin almacenamiento no hay demo que prender */ }
  window.location.href = destino;
}

/*
  ── LO QUE LA DEMO GUARDA ──────────────────────────────────────────────────

  Va aparte de la sesión y de todo lo demás, con su propia llave. Al salir de la
  demo se borra de una: nada de lo que se hizo adentro tiene que sobrevivir a la
  vuelta al mundo real, ni ensuciar la cuenta de verdad de nadie.
*/
const LLAVE_DATOS = "fw_demo_datos";

export function leerGuardado() {
  try {
    const crudo = localStorage.getItem(LLAVE_DATOS);
    return crudo ? JSON.parse(crudo) : null;
  } catch { return null; }
}

export function guardar(datos) {
  try {
    localStorage.setItem(LLAVE_DATOS, JSON.stringify(datos));
  } catch {
    /*
      El almacenamiento se llena —una foto grande en base64 alcanza— y tirar el
      error rompería la acción que la persona acaba de hacer. Se sigue: lo que
      ya está en memoria funciona igual, y lo único que se pierde es que
      sobreviva a una recarga. Mejor una demo que no recuerda que una demo que
      se corta en medio de una grabación.
    */
  }
}

/** Borra lo que se hizo en la demo, dejándola como recién abierta. */
export function borrarGuardado() {
  try { localStorage.removeItem(LLAVE_DATOS); } catch { /* nada que borrar */ }
}

/*
  ── ENTRAR Y SALIR ─────────────────────────────────────────────────────────
*/

/** La sesión con la que arranca la demo, sin pedirle credenciales a nadie. */
const SESION_DEMO = {
  id: "demo-user",
  email: "demo@freewheel.app",
  firstName: "Martina",
  lastName: "Rey",
  name: "Martina Rey",
  role: "USER",
  status: "ACTIVE",
  verificationStatus: "VERIFIED",
  accessToken: "demo",
};

/**
 * Entra a la demo.
 *
 * Deja la sesión puesta ANTES de recargar, y no después: si la demo arrancara
 * sin sesión, lo primero que se vería es la pantalla de ingreso otra vez, que es
 * justo de lo que la demo viene a ahorrar. Se entra y se está adentro.
 *
 * Y se empieza limpio. Una demo que arranca con el auto que alguien publicó la
 * vez pasada no es la demo: es la demo más lo que quedó dando vueltas.
 */
export function entrarALaDemo() {
  borrarGuardado();
  try { localStorage.setItem("fw_user", JSON.stringify(SESION_DEMO)); } catch { /* sin sesión entra igual */ }
  ponerDemo(true, "/");
}

/** Sale de la demo y borra todo lo que se hizo adentro. */
export function salirDeLaDemo() {
  borrarGuardado();
  try { localStorage.removeItem("fw_user"); } catch { /* ya no estaba */ }
  ponerDemo(false, "/login");
}
