// ============================================================================
//  ChatBot — Asistente virtual flotante (botón azul abajo a la derecha)
// ----------------------------------------------------------------------------
//  Es un chat con IA que aparece en TODAS las pantallas (se monta en App.jsx).
//  Responde dudas sobre el funcionamiento de Freewheel usando el modelo de
//  Groq (ver services/groq.js). Buena parte del código maneja que en el
//  celular el teclado no tape la caja de texto (por eso tanto cálculo de
//  "viewport"). En escritorio es un widget flotante de tamaño fijo.
// ============================================================================
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAsistente } from "../context/AssistantContext";
import { useAuth } from "../context/AuthContext";
import { useDraggableWindow } from "../hooks/useDraggableWindow";
import useGrabadora, { segundosComoReloj, textoParaLaCaja } from "../hooks/useGrabadora";
import {
  respuestaGuardada, preguntaPorId, contarPregunta, cuentaGuardada,
  preguntasDeLosBotones, cuentaDelServidor, cuentaQueManda,
} from "../services/asistente";
import { useI18n } from "../i18n/core";
import RobotIcon from "./RobotIcon";

// "System prompt": instrucciones ocultas que definen la personalidad y los
// límites del asistente. Se envían antes de cada conversación con la IA.
const SYSTEM_PROMPT = `Sos el asistente virtual de Freewheel, una plataforma de alquiler de autos entre particulares en Argentina.
Tu rol es ayudar a usuarios con dudas sobre:
- Cómo funciona la plataforma
- Seguridad y verificación de usuarios y vehículos
- Pagos, garantías y depósitos
- Cancelaciones y penalidades
- Cómo publicar un auto
- Cómo reservar un auto
- Qué pasa en caso de accidentes o daños
- Documentación necesaria (DNI, licencia)

Respondé SIEMPRE en {IDIOMA}, sin importar en qué idioma esté escrita la pregunta, de forma clara, profesional y sin emojis. Máximo 3 párrafos por respuesta. Si te preguntan algo que no tiene que ver con Freewheel o alquiler de autos, redirigí la conversación amablemente.`;

/**
 * Cómo se le nombra el idioma al modelo.
 *
 * Se le dice en castellano ("responde siempre en inglés") y no en el idioma de
 * destino, porque el resto del prompt está en castellano y mezclar idiomas dentro
 * de la misma instrucción hace que el modelo dude sobre en cuál tiene que
 * contestar. Además se aclara "sin importar en qué idioma esté escrita la
 * pregunta": si no, contesta en el idioma de quien escribe y no en el que la
 * persona eligió en Ajustes.
 */
const NOMBRE_IDIOMA = {
  es: "español", en: "inglés", pt: "portugués", it: "italiano", zh: "chino simplificado",
};

/*
  LAS PREGUNTAS SUGERIDAS YA NO SON UNA LISTA FIJA DE CUATRO CLAVES.

  Eran estas cuatro, siempre en el mismo orden, y lo que se tocaba iba a la IA
  igual que cualquier otra cosa escrita a mano. Ahora salen de la tabla de
  preguntas con respuesta propia (src/data/preguntasWili.js) y se acomodan a lo
  que esta persona viene preguntando, con las cuatro de siempre como base.

  Que el botón venga de la misma tabla que la respuesta es a propósito: así no
  puede existir un botón que ofrezca una pregunta que no sabemos contestar.
*/

// Devuelve el alto y la posición del área visible de la pantalla. En el celular,
// cuando aparece el teclado, "visualViewport" nos dice cuánto espacio queda
// realmente libre, para poder acomodar el chat encima del teclado.
function getViewportData() {
  if (typeof window === "undefined") {
    return {
      height: 0,
      offsetTop: 0,
    };
  }

  if (window.visualViewport) {
    return {
      height: window.visualViewport.height,
      offsetTop: window.visualViewport.offsetTop || 0,
    };
  }

  return {
    height: window.innerHeight,
    offsetTop: 0,
  };
}

/** Cuánto mide la ventana del asistente en computadora. */
const ANCHO_VENTANA = 360;
const ALTO_VENTANA = 500;

/**
 * DÓNDE NO VA EL ASISTENTE.
 *
 * En las pantallas de entrada no tiene nada que hacer: el asistente contesta
 * sobre alquileres, reservas y autos, y ahí todavía no hay cuenta ni reserva de
 * la que hablar. Lo único que hacía era apoyarse encima del formulario —es un
 * botón flotante de 50px anclado abajo a la izquierda— y ofrecer ayuda que no
 * puede dar.
 *
 * Se corta acá arriba y no adentro: si el componente no se dibuja, tampoco
 * corren sus hooks ni se carga el modelo.
 */
const SIN_ASISTENTE = new Set([
  "/login", "/register", "/forgot-password", "/reset-password",
  "/verify-email", "/complete-profile",
]);

export default function ChatBot() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // Sin sesión iniciada no hay botón que lo abra —ver Layout—, así que tampoco
  // hace falta tenerlo montado esperando.
  if (!user || SIN_ASISTENTE.has(pathname)) return null;
  return <Asistente />;
}

function Asistente() {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const isChat = location.pathname === "/chat";     // ¿estamos en la pantalla de chat?
  // La cuenta, solo para separar por usuario lo que cada uno viene preguntando:
  // en un navegador compartido los botones de uno no son los del otro.
  const { user } = useAuth();

  const { t: tr, lang } = useI18n();
  /*
    EL BOTÓN QUE ABRE EL ASISTENTE YA NO ES EL REDONDEL FLOTANTE.

    Ahora vive en la franja de arriba, al lado de la rueda de ajustes, junto con
    los demás. El redondel se fue porque era el único elemento de toda la app
    que flotaba encima del contenido: tapaba lo que hubiera abajo, había que
    arrastrarlo cuando molestaba, y en el chat de verdad se le venía encima al
    botón de mandar.

    Como el botón lo dibuja Layout y el asistente lo dibuja este componente, lo
    único que comparten —si está abierto— pasa por un contexto.
  */
  const { abierto: open, cerrar } = useAsistente();
  /**
   * El saludo NO se guarda como texto: se guarda una marca y se traduce al
   * dibujarlo. Antes se armaba con `useState(() => tr("chat.greeting"))`, o sea
   * una sola vez, así que si después se cambiaba el idioma en Ajustes el primer
   * mensaje se quedaba en el idioma anterior —el resto de la conversación sí
   * cambiaba, y quedaba mezclado—.
   *
   * Los mensajes que escribe la persona y los que contesta la IA sí son texto
   * literal: esos no se traducen, son lo que se dijo.
   */
  const [messages, setMessages] = useState([{ role: "assistant", key: "chat.greeting" }]);
  /** El texto de un mensaje: el literal si lo tiene, o la clave traducida. */
  const textoDe = (m) => (m.key ? tr(m.key) : m.text);
  const [input, setInput] = useState("");               // texto que se está escribiendo
  const [loading, setLoading] = useState(false);        // esperando respuesta de la IA
  /*
    Lo que esta persona viene preguntando, para ordenar los botones. Se lee del
    navegador una sola vez, al montar: si se leyera en cada dibujado los botones
    se reacomodarían mientras la charla está abierta, debajo del dedo.
  */
  const [cuenta, setCuenta] = useState(() => cuentaGuardada(user?.id));
  /*
    Lo que pregunta el SITIO, que es lo que de verdad se quería para ordenar los
    botones. Vive en el backend; acá llega una vez, al montar.

    Arranca vacío y se queda vacío si el pedido falla o si la migración todavía
    no está aplicada en el deploy. Eso no es un problema: con el ranking vacío
    los botones se ordenan con la cuenta de este navegador, que es exactamente lo
    que hacían antes. Ver cuentaQueManda() en services/asistente.js.
  */
  const [delSitio, setDelSitio] = useState({});
  const [viewport, setViewport] = useState(getViewportData());

  // Genera (o reutiliza) un identificador único de sesión para esta charla.
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('fw_session');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('fw_session', sid);
    }
    return sid;
  });

  const messagesRef = useRef(null); // contenedor de mensajes (para hacer scroll)
  const inputRef = useRef(null);    // caja de texto (para enfocarla)

  /*
    PREGUNTARLE A WILI HABLANDO.

    El recorrido es grabar, subir, transcribir, y el texto CAE EN LA CAJA: no se
    manda solo. Es a propósito. La transcripción se equivoca justo con lo que
    esta aplicación tiene por todos lados —patentes, modelos, nombres propios—,
    y una pregunta mal transcripta que se manda sola se lleva puesta la
    respuesta: Wili contesta bien otra cosa, y desde afuera parece que el
    asistente no entiende. Un segundo para corregir antes de mandar sale más
    barato que eso.

    Se sube a Cloudinary porque el backend transcribe desde una URL http (ver
    AiTranscribeDto: @IsUrl y 2048 caracteres de tope), así que un audio en
    base64 no entra. Queda el archivo dado vuelta, que no lo escucha nadie; el
    backend tiene `npm run cloudinary:limpiar` para eso.
  */
  const grabadora = useGrabadora();
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState(null); // clave del diccionario, o null

  const empezarAGrabar = async () => {
    setAvisoVoz(null);
    if (!(await grabadora.empezar())) setAvisoVoz("chat.voice.denied");
  };

  const terminarDeGrabar = async () => {
    const audio = await grabadora.detener();
    // Sin blob es que la grabación no llegó a durar nada: un toque sin querer.
    if (!audio) { setAvisoVoz("chat.voice.short"); return; }

    setTranscribiendo(true);
    try {
      const { uploadAudioToCloudinary } = await import("../services/cloudinary");
      const { groqTranscribe } = await import("../services/groq");
      const texto = await groqTranscribe(await uploadAudioToCloudinary(audio));
      if (!String(texto ?? "").trim()) { setAvisoVoz("chat.voice.empty"); return; }
      setInput((previo) => textoParaLaCaja(previo, texto));
      inputRef.current?.focus();
    } catch {
      setAvisoVoz("chat.voice.failed");
    } finally {
      setTranscribiendo(false);
    }
  };

  const descartarGrabacion = () => {
    grabadora.cancelar();
    setAvisoVoz(null);
  };

  // Baja el scroll hasta el último mensaje.
  const scrollToBottom = (behavior = "auto") => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior,
    });
  };

  // Escucha los cambios de tamaño/posición de la pantalla (teclado que aparece,
  // rotación del celular, etc.) y recalcula el viewport para reacomodar el chat.
  useEffect(() => {
    const updateViewport = () => {
      setViewport(getViewportData());
    };

    const updateViewportDeferred = () => {
      updateViewport();

      requestAnimationFrame(() => {
        updateViewport();

        setTimeout(() => {
          updateViewport();
        }, 120);
      });
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport);
      window.visualViewport.addEventListener("scroll", updateViewport);
    } else {
      window.addEventListener("resize", updateViewport);
    }

    window.addEventListener("focusin", updateViewportDeferred);
    window.addEventListener("focusout", updateViewportDeferred);
    window.addEventListener("orientationchange", updateViewportDeferred);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateViewport);
        window.visualViewport.removeEventListener("scroll", updateViewport);
      } else {
        window.removeEventListener("resize", updateViewport);
      }

      window.removeEventListener("focusin", updateViewportDeferred);
      window.removeEventListener("focusout", updateViewportDeferred);
      window.removeEventListener("orientationchange", updateViewportDeferred);
    };
  }, []);

  /*
    El ranking del sitio se pide UNA VEZ, al montar, y no al abrir la ventana.

    Abrirla y cerrarla es algo que se hace varias veces en una visita, y los
    botones solo se dibujan al principio de la charla: pedirlo cada vez serían
    varios viajes al servidor para ordenar lo mismo. Y si falla no se avisa nada
    ni se reintenta: son cuatro botones, no vale una pantalla de error.
  */
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const { aiQuestionsTop } = await import("../services/api");
        const ranking = await aiQuestionsTop();
        if (vigente) setDelSitio(cuentaDelServidor(ranking));
      } catch { /* sin ranking se ordenan con la cuenta de este navegador */ }
    })();
    return () => { vigente = false; };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [messages, loading, open]);

  // Envía un mensaje del usuario y agrega la respuesta al historial. Primero se
  // mira si es una de las preguntas que contestamos nosotros; si no, va a la IA.
  //
  // `idGuardado` llega cuando se tocó un botón de pregunta sugerida: ahí no hay
  // nada que reconocer, el botón sabe qué pregunta es. Escrita a mano, la
  // reconoce respuestaGuardada(). Ver services/asistente.js.
  const send = async (text, idGuardado = null) => {
    const userText = (text || input).trim();
    if (!userText || loading) return; // no manda vacío ni si ya está esperando

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    requestAnimationFrame(() => scrollToBottom("auto"));

    /*
      LA RESPUESTA PROPIA SALE ENSEGUIDA, Y NO PASA POR LA IA.

      Sin espera, sin gastar cuota y sin depender de que el servicio de IA esté
      arriba. Y sobre todo: con los plazos y los montos que de verdad aplica el
      servidor, en vez de los que un modelo supone que aplica una plataforma de
      alquiler de autos. Ver src/data/preguntasWili.js.

      El contador se suma acá, con la pregunta ya reconocida: lo que se cuenta
      es qué tema se preguntó, no el texto suelto que se escribió.
    */
    const guardada = idGuardado ? preguntaPorId(idGuardado) : respuestaGuardada(userText);
    if (guardada) {
      setCuenta(contarPregunta(guardada.id, user?.id));
      /*
        Y se le avisa al servidor, que es el que lleva la cuenta del sitio.

        Sin await y con el error tragado: esto va DESPUÉS de haber contestado, no
        hay nadie esperándolo, y que no se pueda contar una pregunta no es motivo
        para que el asistente deje de funcionar ni para mostrarle un error a
        alguien que preguntó otra cosa.
      */
      import("../services/api")
        .then(({ aiQuestionAsked }) => aiQuestionAsked(guardada.id))
        .catch(() => {});
      setMessages((prev) => [...prev, { role: "assistant", text: tr(guardada.respuesta) }]);
      requestAnimationFrame(() => {
        inputRef.current?.focus?.({ preventScroll: true });
        scrollToBottom("auto");
      });
      return;
    }

    setLoading(true);
    try {
      // Formato que espera la IA: primero las instrucciones, luego la charla.
      const groqMessages = [
        { role: "system", content: SYSTEM_PROMPT.replace("{IDIOMA}", NOMBRE_IDIOMA[lang] || "español") },
        ...newMessages.map((m) => ({ role: m.role, content: textoDe(m) })),
      ];

      const { groqChat } = await import("../services/groq");
      const responseText = await groqChat(groqMessages);

      setMessages((prev) => [...prev, { role: "assistant", text: responseText }]);
    } catch (err) {
      /*
        WILI DICE QUÉ PASÓ, NO "no me pude conectar".

        Antes cualquier fallo que no fuera exceso de pedidos salía como un
        genérico "no me pude conectar". Eso es justo lo que hizo difícil darse
        cuenta la vez que la IA se cayó de verdad: el servidor estaba contestando
        con todas las letras que le faltaba la clave, y acá se tiraba a la basura
        para escribir una frase que no dice nada y que además apunta al lado
        equivocado —parece un problema de internet de la persona—.

        El servicio manda un `code` en cada error; lo único que hay que hacer es
        no perderlo.
      */
      const porCodigo = {
        not_configured: "ai.whyNotConfigured",
        rate_limited: "chat.rateLimit",
      };
      const esPorCuota = err.message?.includes("429") || err.message?.toLowerCase().includes("rate");
      const clave = porCodigo[err?.code] || (esPorCuota ? "chat.rateLimit" : "chat.connectError");
      setMessages((prev) => [...prev, { role: "assistant", text: tr(clave) }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus?.({ preventScroll: true });
        scrollToBottom("auto");
      });
    }
  };

  /*
    La ventana abierta se puede mover por toda la pantalla, agarrándola de la
    barra azul del título. Antes estaba clavada abajo a la derecha y tapaba
    justo lo que uno estaba mirando cuando le preguntaba algo al asistente.

    El lugar por defecto es el de siempre, así que a quien nunca la mueva no le
    cambia nada; en el chat entre usuarios arranca a la izquierda, como antes,
    porque a la derecha le queda encima a la conversación.
  */
  const ventana = useDraggableWindow({
    ancho: ANCHO_VENTANA, alto: ALTO_VENTANA,
    activo: !isMobile, ladoIzquierdo: isChat,
  });

  const desktopWidgetStyle = {
    ...ventana.style,
    width: ANCHO_VENTANA,
    height: ALTO_VENTANA,
    background: "var(--fw-surface)",
    borderRadius: 16,
    boxShadow: "0 8px 40px rgba(0,0,0,.15)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    overflow: "hidden",
    border: "1px solid var(--fw-border)",
  };

  // Encabezado del chat: logo, título "Asistente Freewheel" y botón de cerrar.
  const Header = (
    <div
      {...ventana.asa}
      title={isMobile ? undefined : tr("chat.dragWindow")}
      style={{
        background: "var(--fw-blue)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        // En el teléfono la ventana ocupa toda la pantalla, así que no hay
        // adónde moverla y `asa` viene vacío.
        ...ventana.asa.style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* La misma cara que el botón de la barra. Antes acá había una
              rueda de auto: el mismo asistente con dos dibujos distintos según
              desde dónde lo miraras. */}
          <RobotIcon size={20} color="#fff" />
        </div>

        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
            {tr("chat.title")}
          </div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11 }}>
            {tr("chat.online")}
          </div>
        </div>
      </div>

      <button
        onClick={cerrar}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,.8)",
          fontSize: 20,
          cursor: "pointer",
          padding: 4,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );

  // Lista de mensajes: los del asistente van a la izquierda y los del usuario a
  // la derecha. Al final, si loading es true, muestra los 3 puntitos animados.
  const Messages = (
    <div
      ref={messagesRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--fw-surface-2)",
        minHeight: 0,
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      {messages.map((m, i) => (
        <div
          key={i}
          // Wili contesta desde la izquierda y lo que escribo entra desde la
          // derecha, igual que en el chat entre personas. Ver styles/motion.css.
          className={m.role === "assistant" ? "fw-burbuja-suya" : "fw-burbuja-mia"}
          style={
            m.role === "assistant"
              ? {
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  background: "var(--fw-surface)",
                  border: "1px solid var(--fw-border)",
                  borderRadius: "12px 12px 12px 2px",
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--fw-text)",
                  whiteSpace: "pre-wrap",
                }
              : {
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  background: "var(--fw-blue)",
                  color: "#fff",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }
          }
        >
          {textoDe(m)}
        </div>
      ))}

      {loading && (
        <div
          style={{
            alignSelf: "flex-start",
            background: "var(--fw-surface)",
            border: "1px solid var(--fw-border)",
            borderRadius: "12px 12px 12px 2px",
            padding: "12px 16px",
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--fw-text-4)",
            }}
            className="fw-dot-1"
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--fw-text-4)",
            }}
            className="fw-dot-2"
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--fw-text-4)",
            }}
            className="fw-dot-3"
          />
        </div>
      )}
    </div>
  );

  // Botones de preguntas sugeridas (solo se muestran al inicio de la charla).
  const Suggestions = messages.length <= 1 && (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "0 12px 10px",
        flexWrap: "wrap",
        background: "var(--fw-surface)",
        flexShrink: 0,
      }}
    >
      {preguntasDeLosBotones(cuentaQueManda(cuenta, delSitio)).map((p) => (
        <button
          key={p.id}
          onClick={() => send(tr(p.pregunta), p.id)}
          /*
            LETRA OSCURA SOBRE FONDO CLARO, NO AZUL SOBRE AZUL.

            Eran de color `--fw-blue` sobre `--fw-blue-bg`: en claro ya costaba,
            y en oscuro ese fondo pasa a ser azul oscuro y la letra azul encima
            queda ilegible. Ahora el fondo es una superficie de la app y la letra
            el texto de siempre, con el azul reservado para el borde, que es
            donde alcanza para decir "esto se puede tocar".
          */
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            border: "1.5px solid var(--fw-blue-line)",
            background: "var(--fw-surface-2)",
            color: "var(--fw-text-2)",
            fontSize: 11.5,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {tr(p.pregunta)}
        </button>
      ))}
    </div>
  );

  /*
    Mientras se graba, la caja de texto no está: está esta tira en su lugar.

    Ocupar el mismo hueco en vez de agregar una fila arriba es lo que hace que
    quede claro que el micrófono es la otra forma de escribir la pregunta, y no
    un adjunto que se manda aparte. Y de paso la ventana no cambia de alto en el
    celular, que es donde el teclado ya pelea por cada pixel.
  */
  const TiraDeGrabacion = (
    <div
      style={{
        flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderRadius: 24,
        border: "1.5px solid var(--fw-red-line)", background: "var(--fw-red-bg)",
      }}
    >
      <span
        className="fw-grabando"
        style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--fw-red-text-2)", flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-red-text-2)", fontVariantNumeric: "tabular-nums" }}>
        {segundosComoReloj(grabadora.segundos)}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--fw-text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {tr("chat.voice.recording")}
      </span>
      <button
        onClick={descartarGrabacion}
        style={{
          marginLeft: "auto", flexShrink: 0, background: "none", border: "none",
          color: "var(--fw-text-3)", fontFamily: "inherit", fontSize: 12.5,
          cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
          padding: "2px 4px",
        }}
      >
        {tr("chat.voice.cancel")}
      </button>
    </div>
  );

  // Barra inferior: caja de texto (envía con Enter), micrófono y botón de enviar.
  const InputBar = (
    <div
      style={{
        padding: "12px 14px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        borderTop: "1px solid var(--fw-line-soft)",
        background: "var(--fw-surface)",
        flexShrink: 0,
      }}
    >
      {/*
        El renglón de aviso vive ARRIBA de la fila y no encima de los mensajes:
        lo que dice es sobre lo que se está por escribir, no sobre la charla.
        Mientras se transcribe dice qué está pasando, que es lo único que
        justifica los segundos que tarda.
      */}
      {(transcribiendo || avisoVoz) && (
        <div style={{ fontSize: 12, color: "var(--fw-text-3)", padding: "0 6px 8px", lineHeight: 1.4 }}>
          {tr(transcribiendo ? "chat.voice.working" : avisoVoz)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {grabadora.grabando ? TiraDeGrabacion : (
          <input
            ref={inputRef}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 24,
              border: "1.5px solid var(--fw-border)",
              fontSize: 16,
              outline: "none",
              color: "var(--fw-text)",
            }}
            placeholder={tr("chat.placeholder")}
            value={input}
            enterKeyHint="send"
            disabled={transcribiendo}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              requestAnimationFrame(() => {
                setViewport(getViewportData());

                setTimeout(() => {
                  setViewport(getViewportData());
                  scrollToBottom("auto");
                }, 120);
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
          />
        )}

        {/*
          El micrófono no se dibuja donde no puede funcionar.

          Sin HTTPS, y en algún navegador viejo, getUserMedia y MediaRecorder
          directamente no existen. Un botón que al tocarlo solo puede disculparse
          es peor que no tenerlo: promete algo que esa pantalla no da.
        */}
        {grabadora.soportado && (
          <button
            title={tr(grabadora.grabando ? "chat.voice.stop" : "chat.voice.start")}
            aria-label={tr(grabadora.grabando ? "chat.voice.stop" : "chat.voice.start")}
            disabled={transcribiendo}
            onClick={() => (grabadora.grabando ? terminarDeGrabar() : empezarAGrabar())}
            style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: transcribiendo ? "default" : "pointer",
              opacity: transcribiendo ? 0.5 : 1,
              background: grabadora.grabando ? "var(--fw-blue)" : "var(--fw-surface-2)",
              border: grabadora.grabando ? "none" : "1.5px solid var(--fw-border)",
              color: grabadora.grabando ? "#fff" : "var(--fw-text-2)",
            }}
          >
            {grabadora.grabando ? (
              // Un cuadrado: "cortá acá". Es el gesto que ya tiene aprendido
              // cualquiera que haya grabado algo alguna vez.
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2.5" fill="#fff" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="2.5" width="6" height="11" rx="3"
                  stroke="currentColor" strokeWidth="2" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}

        <button
          disabled={grabadora.grabando || transcribiendo}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "var(--fw-blue)",
            color: "#fff",
            border: "none",
            cursor: grabadora.grabando || transcribiendo ? "default" : "pointer",
            opacity: grabadora.grabando || transcribiendo ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          onClick={() => send()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        html, body {
          overscroll-behavior-y: none;
          /* El fondo de la página, no el de una tarjeta: esta regla le gana a
             la de theme.css por venir después, y con la superficie dejaba toda
             la app un escalón más clara de lo que corresponde en modo oscuro. */
          background: var(--fw-bg);
        }

        #root {
          background: var(--fw-bg);
        }

        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .fw-dot-1 { animation: bounce .8s infinite 0s; }
        .fw-dot-2 { animation: bounce .8s infinite .15s; }
        .fw-dot-3 { animation: bounce .8s infinite .3s; }

        @keyframes fw-grabando {
          0%,100% { opacity: 1; }
          50%     { opacity: .25; }
        }

        .fw-grabando { animation: fw-grabando 1s ease-in-out infinite; }

        /* Quien pidió que no se mueva nada ve el punto fijo, no apagado: es el
           único indicio de que el micrófono está abierto. */
        @media (prefers-reduced-motion: reduce) {
          .fw-grabando { animation: none; }
        }
      `}</style>

      {/* Si está abierto: en celular ocupa toda la pantalla; en escritorio es
          un widget flotante. En ambos casos arma Header + Messages + Sugerencias + Input. */}
      {open &&
        (isMobile ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--fw-surface)",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: viewport.offsetTop,
                left: 0,
                right: 0,
                height: viewport.height || window.innerHeight,
                background: "var(--fw-surface)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {Header}
              {Messages}
              {Suggestions}
              {InputBar}
            </div>
          </div>
        ) : (
          <div style={desktopWidgetStyle}>
            {Header}
            {Messages}
            {Suggestions}
            {InputBar}
          </div>
        ))}
    </>
  );
}