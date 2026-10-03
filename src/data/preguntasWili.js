// ============================================================================
//  preguntasWili — Las preguntas que contestamos nosotros, no la IA
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE ESTE ARCHIVO.
//
//  El asistente le pasaba TODAS las preguntas al modelo de IA, incluidas las
//  cuatro que la propia pantalla ofrece como botones. Y para esas cuatro el
//  modelo es el peor informante posible: no conoce FreeWheel. Sabe cómo
//  funciona un alquiler de autos en general, así que contesta algo razonable y
//  generalmente equivocado en lo único que importa, que son los números:
//
//    · Preguntado por la cancelación, inventaba un plazo. Acá son 48 horas, y
//      están escritas en services/cancelacion.js y en el backend.
//    · Preguntado por la garantía, decía que se cobra. Acá NO se cobra: se
//      autoriza y queda retenida.
//    · Preguntado por los documentos, pedía documentos que no pedimos.
//
//  Una respuesta así no se nota que está mal: suena bien, es la primera cosa
//  que lee alguien que entra a la app, y es sobre plata. Para estas preguntas
//  el dato lo tenemos nosotros, escrito en el código que las aplica.
//
//  Así que de acá salen las respuestas, y la IA queda para lo que de verdad
//  necesita IA: la pregunta que no está en esta lista. Es la misma idea que la
//  tabla de especificaciones de los autos.
//
//  ── CÓMO SE RECONOCE UNA PREGUNTA ─────────────────────────────────────────
//
//  Con `claves`: conjuntos de palabras escritos a mano. Una pregunta coincide
//  con una entrada si alguno de sus conjuntos entra COMPLETO en la pregunta.
//  No hay parecido ni distancia entre palabras, a propósito.
//
//  El riesgo de esto es asimétrico, igual que en la tabla de los autos. Si no
//  se reconoce una pregunta que sí teníamos contestada, contesta la IA y no
//  pasa nada. Si se reconoce MAL, le contestamos con total seguridad otra cosa
//  —y encima sin el aviso de que lo dijo un modelo—. Así que los conjuntos son
//  específicos y, cuando una pregunta coincide con dos entradas, no se elige
//  ninguna: va a la IA. Ver services/asistente.js.
//
//  ── POR QUÉ LAS RESPUESTAS SON CLAVES Y NO TEXTO ──────────────────────────
//
//  Porque la app está en cinco idiomas y el asistente contesta en el que la
//  persona eligió en Ajustes. El texto vive en src/i18n/*.js como todo lo
//  demás.
//
//  ── SI SE CAMBIA UNA REGLA, SE CAMBIA ACÁ TAMBIÉN ─────────────────────────
//
//  Cada entrada dice de qué archivo salieron sus números. Una respuesta
//  nuestra que promete un plazo distinto del que aplica el servidor es peor
//  que la respuesta inventada de un modelo: esta tiene el cartel de oficial.
// ============================================================================

/**
 * Las preguntas con respuesta propia.
 *
 * `enLosBotones` marca las cuatro que se ofrecen de entrada. Las otras existen
 * para dos cosas: contestar a quien las escribe, y poder subir a los botones si
 * resultan ser las que más se preguntan. Ver services/asistente.js.
 */
export const PREGUNTAS = [
  {
    // Números de services/reclamo.js (las 48 horas de revisión) y de
    // services/pago.js (el depósito se autoriza, no se cobra).
    id: "warranty",
    pregunta: "chat.q.warranty",
    respuesta: "chat.a.warranty",
    enLosBotones: true,
    claves: [["garantia"], ["deposito"], ["deposit"]],
  },
  {
    // services/reclamo.js: la ventana, las fotos obligatorias, el tope y que
    // lo resuelve un administrador.
    id: "accident",
    pregunta: "chat.q.accident",
    respuesta: "chat.a.accident",
    enLosBotones: true,
    claves: [["accidente"], ["choque"], ["daño"], ["dano"], ["raya"], ["rompo"], ["roto"]],
  },
  {
    // services/cancelacion.js, que a su vez tiene que coincidir con
    // src/bookings/cancellation-policy.ts del backend.
    id: "cancel",
    pregunta: "chat.q.cancel",
    respuesta: "chat.a.cancel",
    enLosBotones: true,
    claves: [["cancel"], ["anular"]],
  },
  {
    // i18n publish.verifyFirst y components/IdentityDocuments.jsx: DNI y
    // licencia, frente y dorso.
    id: "documents",
    pregunta: "chat.q.documents",
    respuesta: "chat.a.documents",
    enLosBotones: true,
    claves: [["documento"], ["papeles"], ["licencia"], ["registro"], ["dni"]],
  },
  {
    // pages/PublishCar: los tres pasos, el mínimo de fotos, de dónde sale la
    // sugerencia de precio. Y services/cobros.js para el alta de cobros.
    id: "publish",
    pregunta: "chat.q.publish",
    respuesta: "chat.a.publish",
    claves: [["publicar"], ["publico"], ["subir", "auto"], ["alquilar", "mi", "auto"]],
  },
  {
    // services/pago.js: los tres tramos y su orden. Y services/movimientos.js
    // para cuándo cobra el dueño.
    id: "payments",
    pregunta: "chat.q.payments",
    respuesta: "chat.a.payments",
    claves: [["seña"], ["sena"], ["saldo"], ["cuando", "pago"], ["como", "pago"], ["cuando", "cobro"]],
  },
  {
    // services/escaner.js: el código de 48 caracteres, el QR, el lector propio
    // para los navegadores que no traen uno.
    id: "delivery",
    pregunta: "chat.q.delivery",
    respuesta: "chat.a.delivery",
    claves: [["entrega"], ["retiro"], ["devolucion"], ["devolver"], ["codigo"]],
  },
  {
    // services/identity.js y services/revisionDocumentos.js: qué se compara y
    // qué se puede corregir desde la app.
    id: "verify",
    pregunta: "chat.q.verify",
    respuesta: "chat.a.verify",
    claves: [["verificar"], ["verificacion"], ["verificado"]],
  },
];

/** Cuántos botones de pregunta entran en la ventana del asistente. */
export const BOTONES = 4;
