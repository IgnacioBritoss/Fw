// ============================================================================
//  servidor.js — El backend de mentira de la demo
// ----------------------------------------------------------------------------
//  Contesta, desde el propio navegador, todo lo que la app le pide al servidor.
//  Lo llama `apiFetch` —la única función por la que salen TODOS los pedidos— así
//  que ninguna pantalla sabe que esto existe: piden lo mismo de siempre y les
//  llega lo mismo de siempre, con las mismas formas.
//
//  ── LAS TRES REGLAS ───────────────────────────────────────────────────────
//
//  1. NADA SE TRABA. La demo existe para MOSTRAR la app, así que nada puede
//     salir mal: la verificación aprueba cualquier foto, los pagos salen bien,
//     los envíos no fallan. Un error honesto, en una demo, es un demo cortado.
//
//  2. TIENE QUE PARECER DE VERDAD. Contestar al instante se nota y se ve falso:
//     las pantallas tienen sus carteles de "cargando", sus esperas y sus
//     animaciones, y sin demora ninguna se llega a ver. Cada respuesta tarda un
//     poco, y las que en la vida real tardan más —leer un documento, pensar una
//     respuesta— tardan más acá también.
//
//  3. LO QUE SE HACE, QUEDA. Publicar un auto y después encontrarlo en el mapa,
//     reservarlo y verlo en "Mis reservas": eso es lo que hace que la demo se
//     sienta una app y no una maqueta. El estado vive en `localStorage`.
//
//  ── POR QUÉ NO HAY IA ACÁ ─────────────────────────────────────────────────
//  El asistente, el autocompletado del auto, el precio sugerido y la revisión de
//  las fotos son, en la app de verdad, llamadas a un modelo. Acá son respuestas
//  escritas en datos.json. No es una versión pobre: para lo que se muestra —un
//  Corolla 2022 que se completa solo, un precio con su explicación, una foto que
//  pasa el control— el resultado en pantalla es exactamente el mismo, y no
//  depende de una clave, de un límite de pedidos ni de que el modelo conteste.
// ============================================================================
import semilla from "./datos.json";
import { leerGuardado, guardar } from "../services/demo";

// ── El reloj ────────────────────────────────────────────────────────────────

const DIA = 86_400_000;
const enDias = (n) => new Date(Date.now() + n * DIA).toISOString();

/**
 * Las fechas de los datos son relativas, no fijas.
 *
 * Una fecha escrita a mano envejece: la demo que hoy muestra "tu reserva es en
 * cinco días" en dos meses muestra una reserva vencida, y ahí se ve que está
 * armada. Los marcadores `__EN_5_DIAS__` se resuelven contra el día en que se
 * abre, así que la demo siempre está al día.
 */
const RELATIVAS = {
  __EN_5_DIAS__: () => enDias(5),
  __EN_8_DIAS__: () => enDias(8),
  __HACE_1_DIA__: () => enDias(-1),
  __HACE_2_DIAS__: () => enDias(-2),
  __HACE_8_DIAS__: () => enDias(-8),
  __HACE_12_DIAS__: () => enDias(-12),
  __HACE_17_DIAS__: () => enDias(-17),
  __HACE_20_DIAS__: () => enDias(-20),
  __HACE_25_DIAS__: () => enDias(-25),
  __HACE_30_DIAS__: () => enDias(-30),
};

function resolverFechas(valor) {
  if (typeof valor === "string") return RELATIVAS[valor] ? RELATIVAS[valor]() : valor;
  if (Array.isArray(valor)) return valor.map(resolverFechas);
  if (valor && typeof valor === "object") {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) salida[k] = resolverFechas(v);
    return salida;
  }
  return valor;
}

// ── El estado ───────────────────────────────────────────────────────────────

const nuevoEstado = () => {
  const datos = resolverFechas(semilla);
  return {
    usuario: datos.usuario,
    autos: datos.autos,
    reservas: datos.reservas,
    resenas: datos.resenas,
    conversaciones: datos.conversaciones,
    favoritos: [],
    notificaciones: datos.notificaciones,
    bloqueos: {},
    pagos: {},
    documentos: {},
  };
};

let estado = leerGuardado() || nuevoEstado();

/** Lo fijo, que nunca cambia y por eso no se guarda. */
const fijos = resolverFechas({
  duenos: semilla.duenos,
  reputacion: semilla.reputacion,
  corolla2022: semilla.corolla2022,
  precioSugerido: semilla.precioSugerido,
  revisionDeFotos: semilla.revisionDeFotos,
  asistente: semilla.asistente,
  asistentePorDefecto: semilla.asistentePorDefecto,
});

const anotar = () => guardar(estado);

/** Vuelve a dejar la demo como recién abierta. */
export function reiniciar() {
  estado = nuevoEstado();
  anotar();
}

// ── Utilidades ──────────────────────────────────────────────────────────────

const id = (prefijo) => `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));
const copia = (x) => JSON.parse(JSON.stringify(x));

/**
 * Cuánto tarda cada cosa.
 *
 * No son números al azar: son los tiempos que hacen que las pantallas se vean
 * como se ven con un servidor de verdad. Instantáneo se siente falso, y además
 * se saltea los carteles de "cargando" que la app dibuja, que son parte de lo
 * que hay que mostrar.
 */
const DEMORA = { corta: 180, media: 420, larga: 900, revision: 2600, pensar: 1100 };

const usuarioPublico = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  displayName: u.displayName || `${u.firstName} ${u.lastName}`,
});

const duenoDe = (auto) =>
  auto.owner || fijos.duenos.find((d) => d.id === auto.ownerId) || usuarioPublico(estado.usuario);

const conDueno = (auto) => ({ ...auto, owner: duenoDe(auto) });

/** El auto de una reserva, ya listo para que lo dibuje la pantalla. */
const autoDe = (reserva) => {
  const auto = estado.autos.find((a) => a.id === reserva.listingId);
  return auto ? conDueno(auto) : null;
};

const conAuto = (reserva) => ({
  ...reserva,
  listing: autoDe(reserva),
  renter: usuarioPublico(estado.usuario),
  owner: duenoDe({ ownerId: reserva.ownerId }),
});

/**
 * Una conversación con la forma que espera la pantalla.
 *
 * `messages` va del más nuevo al más viejo: la lista de la izquierda muestra
 * `messages[0]` como vista previa.
 */
const comoConversacion = (charla) => ({
  id: charla.id,
  listing: estado.autos.find((a) => a.id === charla.listingId) || null,
  renterId: estado.usuario.id,
  renter: usuarioPublico(estado.usuario),
  owner: charla.otro,
  messages: [...charla.mensajes].reverse(),
});

/** Un error con la misma forma que los del backend, para que se lea igual. */
function fallar(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  throw err;
}

// ── La verificación de identidad ────────────────────────────────────────────

/**
 * ACÁ NO SE RECHAZA NADA, Y ES A PROPÓSITO.
 *
 * En la app de verdad esto lee el DNI y la licencia, cruza los datos contra la
 * cuenta y puede rechazar por diez motivos distintos. En la demo eso sería un
 * demo cortado: quien la esté mostrando no tiene un DNI de prueba que pase los
 * controles, y se quedaría trabado en la pantalla de verificación.
 *
 * Así que entra cualquier foto y el resultado es siempre aprobado. Lo que SÍ se
 * respeta es el camino completo: se sube, queda "analizando", se espera, y
 * recién después aparece el veredicto. Ese es el flujo que hay que mostrar, y es
 * el mismo que corre contra el servidor real.
 */
const documentoAprobado = (tipo) => ({
  id: `doc-${tipo}`,
  type: tipo,
  status: "APPROVED",
  reasons: [],
  analysis: { status: "DONE", pending: false, error: null, canRetry: false },
  createdAt: new Date().toISOString(),
});

const documentoEnAnalisis = (tipo) => ({
  id: `doc-${tipo}`,
  type: tipo,
  status: "PENDING",
  reasons: [],
  analysis: { status: "QUEUED", pending: true, error: null, canRetry: false },
  createdAt: new Date().toISOString(),
});

/**
 * Deja el documento "analizando" y lo aprueba unos segundos después.
 *
 * El temporizador corre por afuera del pedido a propósito: así el envío contesta
 * enseguida —igual que el backend de verdad, que encola la lectura— y la
 * pantalla tiene que ir a preguntar por el resultado, que es justamente el
 * camino que se quiere mostrar.
 */
function encolarLectura(tipo) {
  estado.documentos[tipo] = documentoEnAnalisis(tipo);
  anotar();
  setTimeout(() => {
    estado.documentos[tipo] = documentoAprobado(tipo);
    if (estado.documentos.DNI?.status === "APPROVED" && estado.documentos.LICENSE?.status === "APPROVED") {
      estado.usuario.verificationStatus = "VERIFIED";
    }
    anotar();
  }, DEMORA.revision + 1400);
}

// ── El asistente ────────────────────────────────────────────────────────────

/**
 * Elige una respuesta escrita según lo que se haya preguntado.
 *
 * No intenta parecer un modelo de lenguaje: busca palabras y contesta lo que
 * corresponde. Para lo que se muestra en una demo —preguntar cómo se reserva,
 * cómo se paga, qué pasa si hay un choque— alcanza y sobra, y a diferencia de un
 * modelo, contesta siempre y contesta bien.
 */
function responderAsistente(mensajes) {
  const ultima = [...(mensajes || [])].reverse().find((m) => m?.role === "user");
  const texto = String(ultima?.content || "").toLowerCase();
  for (const { pregunta, respuesta } of fijos.asistente) {
    if (new RegExp(pregunta, "i").test(texto)) return respuesta;
  }
  return fijos.asistentePorDefecto;
}

/**
 * Qué contesta el "modelo" según lo que se le pida.
 *
 * Por `/ai/chat` pasan tres cosas distintas: el asistente del chat, el
 * autocompletado de las especificaciones del auto y el precio sugerido. Las tres
 * salen por la misma puerta, así que acá se mira QUÉ se preguntó y se devuelve
 * lo que corresponde.
 *
 * Las dos que esperan un objeto lo reciben como texto, igual que del modelo de
 * verdad: quien llama lo pasa por `extractJSON`, y si acá se devolviera un
 * objeto ya armado se saltearía ese paso y la demo probaría un camino que no es
 * el que corre en producción.
 */
function contestarComoModelo(mensajes) {
  const ultima = [...(mensajes || [])].reverse().find((m) => m?.role === "user");
  const texto = String(ultima?.content || "");

  // El autocompletado: se reconoce por los campos que pide.
  if (/especificaciones t[eé]cnicas|baul_litros|cilindrada_cc/i.test(texto)) {
    const e = fijos.corolla2022.specs;
    return JSON.stringify({
      puertas: e.puertas,
      baul_litros: e.baul_litros,
      peso_kg: e.peso_kg,
      ancho_mm: e.ancho_mm,
      largo_mm: e.largo_mm,
      consumo_l100km: Number(String(e.consumo_mixto).replace(",", ".").match(/[\d.]+/)?.[0]) || null,
      hp: e.potencia_cv,
      cilindrada_cc: 1800,
      bluetooth: e.bluetooth,
      camara_reversa: e.camara_reversa,
      sensor_estacionamiento: e.sensor_estacionamiento ? "Sí" : "No",
    });
  }

  // El precio sugerido.
  if (/precio_recomendado|precio_min|alquiler m[aá]s barato/i.test(texto)) {
    const p = fijos.precioSugerido;
    return JSON.stringify({
      precio_min: p.minimo,
      precio_max: p.maximo,
      precio_recomendado: p.sugerido,
      justificacion: p.razon,
    });
  }

  return responderAsistente(mensajes);
}

// ── Las rutas ───────────────────────────────────────────────────────────────

/**
 * Cada entrada es [método, patrón, qué contestar].
 *
 * El patrón usa `:algo` para las partes variables, igual que las rutas del
 * backend, así que se leen igual que en `api.js` y es fácil comprobar que no
 * falte ninguna.
 */
const RUTAS = [
  // ── Sesión ──────────────────────────────────────────────────────────────
  // Cualquier mail y cualquier contraseña entran: pedirle credenciales a quien
  // está mostrando la app sería trabarlo en la primera pantalla.
  ["POST", "/auth/login", () => ({ user: estado.usuario, accessToken: "demo" })],
  ["POST", "/auth/register/start", () => ({ onboardingToken: "demo", email: estado.usuario.email })],
  ["POST", "/auth/register/complete", () => ({ user: estado.usuario, accessToken: "demo" })],
  ["POST", "/auth/verify-email", () => ({ user: estado.usuario, accessToken: "demo" })],
  ["POST", "/auth/resend-verification", () => ({ ok: true })],
  ["POST", "/auth/complete-profile", (_, cuerpo) => {
    Object.assign(estado.usuario, cuerpo || {});
    anotar();
    return { user: estado.usuario, accessToken: "demo" };
  }],
  ["POST", "/auth/forgot-password", () => ({ ok: true })],
  ["POST", "/auth/reset-password", () => ({ ok: true })],
  ["POST", "/auth/request-email-change", () => ({ ok: true })],
  ["POST", "/auth/confirm-email-change", () => ({ user: estado.usuario })],

  // ── La cuenta ───────────────────────────────────────────────────────────
  ["GET", "/users/me", () => estado.usuario],
  ["PATCH", "/users/me", (_, cuerpo) => {
    Object.assign(estado.usuario, cuerpo || {});
    anotar();
    return estado.usuario;
  }],
  ["GET", "/users/:id/reputation", () => fijos.reputacion],
  ["GET", "/users/:id/reviews", () => estado.resenas],
  ["GET", "/users/:id", ({ id: quien }) =>
    quien === estado.usuario.id
      ? estado.usuario
      : fijos.duenos.find((d) => d.id === quien) || estado.usuario],

  // ── Los autos ───────────────────────────────────────────────────────────
  ["GET", "/listings/me", () => estado.autos.filter((a) => a.ownerId === estado.usuario.id).map(conDueno)],
  ["GET", "/listings/:id/reviews", ({ id: auto }) => estado.resenas.filter((r) => r.listingId === auto)],
  ["GET", "/listings/:id/availability", ({ id: auto }) => ({
    // Los días ya ocupados por las reservas de la demo, para que el calendario
    // los muestre bloqueados igual que con el backend.
    unavailableDates: estado.reservas
      .filter((r) => r.listingId === auto && ["ACCEPTED", "IN_PROGRESS", "READY_FOR_PICKUP"].includes(r.status))
      .flatMap((r) => {
        const dias = [];
        for (let d = new Date(r.startDate); d <= new Date(r.endDate); d = new Date(d.getTime() + DIA)) {
          dias.push(d.toISOString().slice(0, 10));
        }
        return dias;
      }),
  })],
  ["GET", "/listings/:id/availability-blocks", ({ id: auto }) => estado.bloqueos[auto] || []],
  ["POST", "/listings/:id/availability-blocks", ({ id: auto }, cuerpo) => {
    const bloque = { id: id("blq"), ...cuerpo };
    estado.bloqueos[auto] = [...(estado.bloqueos[auto] || []), bloque];
    anotar();
    return bloque;
  }],
  ["DELETE", "/listings/:id/availability-blocks/:blockId", ({ id: auto, blockId }) => {
    estado.bloqueos[auto] = (estado.bloqueos[auto] || []).filter((b) => b.id !== blockId);
    anotar();
    return { ok: true };
  }],
  ["POST", "/listings/:id/price-change", () => ({ requiresConfirmation: false })],
  ["POST", "/listings/:id/price-change/confirm", () => ({ ok: true })],
  ["POST", "/listings/:id/photos", ({ id: auto }, cuerpo) => {
    const publicacion = estado.autos.find((a) => a.id === auto);
    if (publicacion) {
      publicacion.photos = [...(publicacion.photos || []), ...(cuerpo?.urls || [])];
      anotar();
    }
    return publicacion || {};
  }],
  ["PATCH", "/listings/:id", ({ id: auto }, cuerpo) => {
    const publicacion = estado.autos.find((a) => a.id === auto);
    if (!publicacion) fallar(404, "No encontramos esa publicación");
    Object.assign(publicacion, cuerpo || {});
    anotar();
    return conDueno(publicacion);
  }],
  ["GET", "/listings/:id", ({ id: auto }) => {
    const publicacion = estado.autos.find((a) => a.id === auto);
    if (!publicacion) fallar(404, "No encontramos ese auto");
    return conDueno(publicacion);
  }],
  ["POST", "/listings", (_, cuerpo) => {
    /*
      EL AUTO PUBLICADO EN LA DEMO ES UN AUTO MÁS.

      Queda en la misma lista que los demás, así que aparece en el buscador, en
      el mapa y en "Mis autos", y se puede reservar. Poder publicar uno y
      encontrarlo en el mapa es la mitad de lo que hay para mostrar.
    */
    const nuevo = {
      id: id("auto"),
      title: cuerpo?.title || "Auto publicado en la demo",
      description: cuerpo?.description || "",
      pricePerDay: Number(cuerpo?.pricePerDay) || 0,
      locationText: cuerpo?.locationText || "Palermo, CABA",
      // Sin ubicación elegida cae en el centro de Palermo: un auto sin punto no
      // se dibujaría en el mapa, y el mapa es lo que se quiere mostrar.
      latitude: cuerpo?.latitude ?? -34.5890,
      longitude: cuerpo?.longitude ?? -58.4300,
      status: "ACTIVE",
      deliveryRadiusM: cuerpo?.deliveryRadiusM ?? 0,
      ratingAverage: null,
      ratingCount: 0,
      ownerId: estado.usuario.id,
      owner: usuarioPublico(estado.usuario),
      vehicle: cuerpo?.vehicle || fijos.corolla2022,
      photos: cuerpo?.photos || [],
    };
    estado.autos = [nuevo, ...estado.autos];
    anotar();
    return nuevo;
  }],
  ["GET", "/listings", (_, __, consulta) => {
    let lista = estado.autos.filter((a) => a.status === "ACTIVE");
    const texto = (consulta.get("locationText") || "").toLowerCase();
    if (texto) lista = lista.filter((a) => `${a.title} ${a.locationText}`.toLowerCase().includes(texto));
    const marca = (consulta.get("brand") || "").toLowerCase();
    if (marca) lista = lista.filter((a) => a.vehicle?.brand?.toLowerCase().includes(marca));
    const categoria = consulta.get("category");
    if (categoria) lista = lista.filter((a) => a.vehicle?.category === categoria);
    return lista.map(conDueno);
  }],

  // ── Los vehículos (el paso previo a publicar) ───────────────────────────
  ["GET", "/vehicles/me", () => []],
  ["POST", "/vehicles", (_, cuerpo) => ({ id: id("veh"), ...(cuerpo || {}) })],
  ["PATCH", "/vehicles/:id", ({ id: veh }, cuerpo) => ({ id: veh, ...(cuerpo || {}) })],
  ["GET", "/vehicles/:id", ({ id: veh }) => ({ id: veh, ...fijos.corolla2022 })],

  // ── Las reservas ────────────────────────────────────────────────────────
  ["GET", "/bookings/me", () => estado.reservas.map(conAuto)],
  ["GET", "/bookings/:id/tokens", () => ({ pickupToken: "DEMO-RETIRO", returnToken: "DEMO-DEVOLUCION" })],
  ["GET", "/bookings/:id", ({ id: res }) => {
    const reserva = estado.reservas.find((r) => r.id === res);
    if (!reserva) fallar(404, "No encontramos esa reserva");
    return conAuto(reserva);
  }],
  ["POST", "/bookings/:id/reviews", ({ id: res }, cuerpo) => {
    const reserva = estado.reservas.find((r) => r.id === res);
    const resena = {
      id: id("rev"),
      listingId: reserva?.listingId,
      authorName: estado.usuario.name,
      rating: Number(cuerpo?.rating) || 5,
      comment: cuerpo?.comment || "",
      tags: cuerpo?.tags || [],
      createdAt: new Date().toISOString(),
    };
    estado.resenas = [resena, ...estado.resenas];
    anotar();
    return resena;
  }],
  ["POST", "/bookings", (_, cuerpo) => {
    const auto = estado.autos.find((a) => a.id === cuerpo?.listingId);
    const reserva = {
      id: id("res"),
      listingId: cuerpo?.listingId,
      renterId: estado.usuario.id,
      ownerId: auto?.ownerId || "d1",
      status: "REQUESTED",
      startDate: cuerpo?.startDate,
      endDate: cuerpo?.endDate,
      totalAmount: Number(cuerpo?.totalAmount) || 0,
      commissionAmount: Number(cuerpo?.commissionAmount) || 0,
      depositAmount: Number(cuerpo?.depositAmount) || 0,
      createdAt: new Date().toISOString(),
    };
    estado.reservas = [reserva, ...estado.reservas];
    /*
      EL DUEÑO ACEPTA SOLO, A LOS POCOS SEGUNDOS.

      En la app de verdad hay otra persona del otro lado que tiene que entrar y
      aceptar. En una demo no hay nadie, y una reserva que se queda para siempre
      en "esperando al dueño" deja sin mostrar todo lo que viene después: el
      pago, el retiro, la devolución, la reseña. Así que el dueño contesta.
    */
    setTimeout(() => {
      const guardada = estado.reservas.find((r) => r.id === reserva.id);
      if (guardada && guardada.status === "REQUESTED") {
        guardada.status = "ACCEPTED";
        estado.notificaciones = [{
          id: id("not"),
          type: "BOOKING_ACCEPTED",
          title: `${duenoDe(auto || {}).displayName} aceptó tu solicitud`,
          body: "Ya podés pagar la seña.",
          read: false,
          createdAt: new Date().toISOString(),
        }, ...estado.notificaciones];
        anotar();
      }
    }, 6000);
    anotar();
    return conAuto(reserva);
  }],

  // ── Los favoritos ───────────────────────────────────────────────────────
  ["GET", "/favorites/me/ids", () => estado.favoritos],
  ["GET", "/favorites/me", () => estado.autos.filter((a) => estado.favoritos.includes(a.id)).map(conDueno)],
  ["POST", "/favorites", (_, cuerpo) => {
    const auto = cuerpo?.listingId;
    if (auto && !estado.favoritos.includes(auto)) estado.favoritos.push(auto);
    anotar();
    return { ok: true };
  }],
  ["DELETE", "/favorites/:id", ({ id: auto }) => {
    estado.favoritos = estado.favoritos.filter((x) => x !== auto);
    anotar();
    return { ok: true };
  }],

  // ── Los mensajes ────────────────────────────────────────────────────────
  /*
    La forma es la del backend y no la que uno escribiría de cero.

    La pantalla no lee "el otro usuario": lee `renterId`, `owner` y `renter`, y
    deduce cuál de los dos es el otro. Y la vista previa sale de `messages[0]`,
    o sea que la lista va del mensaje MÁS NUEVO al más viejo. Devolverlo al
    revés, o con un campo de más llamado `otherUser`, deja la conversación
    diciendo "Usuario" y "Sin mensajes" aunque los mensajes estén ahí.
  */
  ["GET", "/conversations/me", () => estado.conversaciones.map(comoConversacion)],
  ["GET", "/conversations/:id/messages", ({ id: conv }) =>
    [...(estado.conversaciones.find((c) => c.id === conv)?.mensajes || [])].reverse()],
  ["POST", "/conversations/:id/messages", ({ id: conv }, cuerpo) => {
    const charla = estado.conversaciones.find((c) => c.id === conv);
    const mensaje = {
      id: id("msg"),
      type: cuerpo?.type || "TEXT",
      senderId: estado.usuario.id,
      content: cuerpo?.content || "",
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    if (charla) {
      charla.mensajes.push(mensaje);
      /*
        Y el otro contesta.

        Un chat donde uno escribe y nunca le responden no muestra que el chat
        funciona: muestra media pantalla. La respuesta tarda unos segundos, como
        tardaría una persona.
      */
      setTimeout(() => {
        charla.mensajes.push({
          id: id("msg"),
          type: "TEXT",
          senderId: charla.otro.id,
          content: "Dale, perfecto. Cualquier cosa avisame por acá.",
          readAt: null,
          createdAt: new Date().toISOString(),
        });
        anotar();
      }, 3500);
      anotar();
    }
    return mensaje;
  }],
  ["POST", "/conversations/:id/read", () => ({ ok: true })],
  ["GET", "/conversations/:id", ({ id: conv }) => {
    const charla = estado.conversaciones.find((c) => c.id === conv);
    if (!charla) fallar(404, "No encontramos esa conversación");
    return comoConversacion(charla);
  }],
  ["POST", "/conversations", (_, cuerpo) => {
    const auto = estado.autos.find((a) => a.id === cuerpo?.listingId);
    const charla = {
      id: id("conv"),
      listingId: cuerpo?.listingId,
      otro: duenoDe(auto || {}),
      mensajes: [],
    };
    estado.conversaciones = [charla, ...estado.conversaciones];
    anotar();
    return comoConversacion(charla);
  }],

  // ── La verificación ─────────────────────────────────────────────────────
  ["GET", "/verification/me/status", () => {
    const dni = estado.documentos.DNI;
    const lic = estado.documentos.LICENSE;
    const verificada = estado.usuario.verificationStatus === "VERIFIED";
    return {
      fullyVerified: verificada,
      phoneRequired: false,
      checklist: {
        emailVerified: true,
        profile: true,
        phoneVerified: Boolean(estado.usuario.phone),
        birthDate: true,
        dniApproved: verificada || dni?.status === "APPROVED",
        licenseApproved: verificada || lic?.status === "APPROVED",
      },
      documents: { dni: dni || null, license: lic || null },
      driving: estado.usuario.driving,
    };
  }],
  ["GET", "/verification/identity/me", () => ({
    dni: estado.documentos.DNI || null,
    license: estado.documentos.LICENSE || null,
  })],
  ["POST", "/verification/identity/upload-signature", () => ({
    // La demo no sube nada a ningún lado: las fotos se quedan en el navegador.
    // Se devuelve la forma completa igual, porque es lo que espera quien llama.
    cloudName: "demo", apiKey: "demo", signature: "demo",
    timestamp: Math.floor(Date.now() / 1000),
    params: { public_id: `demo/${Date.now()}` },
  })],
  ["POST", "/verification/identity/inspect-url", () => ({ ok: true, ...fijos.revisionDeFotos.ok })],
  ["POST", "/verification/identity/:documento/submit", ({ documento }) => {
    encolarLectura(String(documento).toUpperCase() === "LICENSE" ? "LICENSE" : "DNI");
    return { ok: true, status: "PENDING" };
  }],
  ["POST", "/verification/identity/:documento/retry-analysis", ({ documento }) => {
    encolarLectura(String(documento).toUpperCase() === "LICENSE" ? "LICENSE" : "DNI");
    return { ok: true };
  }],
  ["POST", "/verification/identity/:documento/request-review", () => ({ ok: true })],
  ["GET", "/verification/identity/diagnostics", () => ({ transport: "demo", reachable: true, detail: "La demo no usa verificador externo" })],
  ["POST", "/verification/phone/request", () => ({ ok: true, hint: "123456" })],
  ["POST", "/verification/phone/confirm", (_, cuerpo) => {
    estado.usuario.phone = cuerpo?.phone || estado.usuario.phone;
    anotar();
    return { ok: true, user: estado.usuario };
  }],

  // ── Los pagos ───────────────────────────────────────────────────────────
  ["GET", "/payments/bookings/:bookingId/status", ({ bookingId }) =>
    estado.pagos[bookingId] || { senaPaid: false, balancePaid: false, depositHeld: false }],
  ["POST", "/payments/bookings/:bookingId/sena-intent", ({ bookingId }) => ({ intentId: `demo-${bookingId}`, status: "REQUIRES_CONFIRMATION" })],
  ["POST", "/payments/bookings/:bookingId/balance-intent", ({ bookingId }) => ({ intentId: `demo-${bookingId}`, status: "REQUIRES_CONFIRMATION" })],
  ["POST", "/payments/bookings/:bookingId/deposit-hold", ({ bookingId }) => {
    estado.pagos[bookingId] = { ...(estado.pagos[bookingId] || {}), depositHeld: true };
    anotar();
    return { ok: true };
  }],
  // En la demo el pago SIEMPRE sale bien. El camino del pago fallido existe en
  // la app de verdad; acá cortaría la demostración a la mitad.
  ["POST", "/payments/bookings/:bookingId/mock-confirm", ({ bookingId }) => {
    estado.pagos[bookingId] = { senaPaid: true, balancePaid: true, depositHeld: true };
    const reserva = estado.reservas.find((r) => r.id === bookingId);
    if (reserva && reserva.status === "ACCEPTED") reserva.status = "READY_FOR_PICKUP";
    anotar();
    return { ok: true, status: "SUCCEEDED" };
  }],
  ["POST", "/payments/bookings/:bookingId/mock-fail", () => ({ ok: true, status: "FAILED" })],

  // ── El contrato ─────────────────────────────────────────────────────────
  ["GET", "/contracts/bookings/:bookingId", ({ bookingId }) => ({
    bookingId,
    accepted: Boolean(estado.pagos[bookingId]?.contractAccepted),
    version: "demo-1",
  })],
  ["POST", "/contracts/bookings/:bookingId/accept", ({ bookingId }) => {
    estado.pagos[bookingId] = { ...(estado.pagos[bookingId] || {}), contractAccepted: true };
    anotar();
    return { ok: true };
  }],

  // ── Fotos y archivos ────────────────────────────────────────────────────
  ["POST", "/media/cloudinary-signature", () => ({
    cloudName: "demo", apiKey: "demo", signature: "demo",
    timestamp: Math.floor(Date.now() / 1000), folder: "demo",
  })],
  ["POST", "/media/assets", () => ({ ok: true })],

  // ── Reportes ────────────────────────────────────────────────────────────
  ["GET", "/reports/me", () => []],
  ["POST", "/reports", () => ({ ok: true, id: id("rep") })],
  ["GET", "/reviews/me/pending", () => []],

  // ── La IA ───────────────────────────────────────────────────────────────
  ["GET", "/ai/health", () => ({ ok: true, demo: true })],
  ["POST", "/ai/chat", (_, cuerpo) => ({ content: contestarComoModelo(cuerpo?.messages) })],
  ["POST", "/ai/vision", () => ({
    /*
      LA FOTO SIEMPRE PASA, Y SIEMPRE ES EL MISMO AUTO.

      La app compara los rasgos que "ve" en cada foto contra el auto declarado en
      el formulario, y marca las que no coinciden. En la demo se devuelven los
      rasgos del Corolla que el formulario ya trae cargado, así que todas las
      fotos concuerdan y ninguna queda marcada: quien esté mostrando la app sube
      cualquier imagen y el control la deja pasar.
    */
    isVehicle: true,
    rasgos: { tipo: "sedan", color: fijos.corolla2022.color, marcaModelo: `${fijos.corolla2022.brand} ${fijos.corolla2022.model}` },
    detected: `${fijos.corolla2022.brand} ${fijos.corolla2022.model} ${fijos.corolla2022.color}`,
  })],
  ["POST", "/ai/transcribe", () => ({ text: "" })],

  // ── El panel de administración ──────────────────────────────────────────
  ["GET", "/admin/users", () => [estado.usuario, ...fijos.duenos]],
  ["GET", "/admin/listings", () => estado.autos.map(conDueno)],
  ["GET", "/admin/verifications", () => []],
  ["GET", "/admin/reports", () => []],
  ["GET", "/admin/settings", () => ({ demo: true })],
];

// ── El despachador ──────────────────────────────────────────────────────────

/** ¿Este patrón coincide con esta ruta? Devuelve las partes variables, o null. */
function calzar(patron, ruta) {
  const partesPatron = patron.split("/").filter(Boolean);
  const partesRuta = ruta.split("/").filter(Boolean);
  if (partesPatron.length !== partesRuta.length) return null;
  const variables = {};
  for (let i = 0; i < partesPatron.length; i++) {
    if (partesPatron[i].startsWith(":")) {
      variables[partesPatron[i].slice(1)] = decodeURIComponent(partesRuta[i]);
    } else if (partesPatron[i] !== partesRuta[i]) {
      return null;
    }
  }
  return variables;
}

/**
 * Contesta un pedido. Es lo único que se exporta hacia `apiFetch`.
 *
 * Si una ruta no está acá contesta un objeto vacío en vez de fallar. Es a
 * propósito: una demo que revienta con "404" en una pantalla que nadie iba a
 * mostrar es peor que una que muestra esa pantalla vacía. Lo importante —lo que
 * se recorre en una demostración— está cubierto; el resto no tiene que estorbar.
 */
export async function responderDemo(ruta, opciones = {}) {
  const metodo = (opciones.method || "GET").toUpperCase();
  const [camino, busqueda] = ruta.split("?");
  const consulta = new URLSearchParams(busqueda || "");

  let cuerpo = null;
  try {
    cuerpo = typeof opciones.body === "string" ? JSON.parse(opciones.body) : opciones.body || null;
  } catch { cuerpo = null; }

  for (const [metodoRuta, patron, contestar] of RUTAS) {
    if (metodoRuta !== metodo) continue;
    const variables = calzar(patron, camino);
    if (!variables) continue;

    // Lo pesado tarda más, como tardaría de verdad. Ver DEMORA, más arriba.
    const demora = camino.includes("/ai/") ? DEMORA.pensar
      : camino.includes("/verification/identity/") && metodo === "POST" ? DEMORA.larga
        : metodo === "GET" ? DEMORA.corta : DEMORA.media;
    await esperar(demora);

    return copia(contestar(variables, cuerpo, consulta));
  }

  await esperar(DEMORA.corta);
  return {};
}

/** Lo que la demo sabe del Corolla 2022, para el autocompletado y el precio. */
export const datosDelCorolla = () => copia(fijos.corolla2022);
export const precioSugeridoDemo = () => copia(fijos.precioSugerido);
export const revisionDeFotoDemo = () => copia(fijos.revisionDeFotos.ok);
