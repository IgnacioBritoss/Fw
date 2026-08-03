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
import { useDraggableFab } from "../hooks/useDraggableFab";

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

Respondé siempre en español, de forma clara, profesional y sin emojis. Máximo 3 párrafos por respuesta. Si te preguntan algo que no tiene que ver con Freewheel o alquiler de autos, redirigí la conversación amablemente.`;

// Primer mensaje de bienvenida que ve el usuario al abrir el chat.
const INITIAL_MESSAGE = {
  role: "assistant",
  text: "Hola, soy el asistente de Freewheel. Puedo ayudarte con dudas sobre seguridad, pagos, cómo publicar tu auto, cancelaciones y más. ¿En qué puedo ayudarte?",
};

// Preguntas frecuentes que se ofrecen como botones al iniciar la conversación.
const SUGGESTIONS = [
  "¿Cómo funciona la garantía?",
  "¿Qué pasa si hay un accidente?",
  "¿Cómo cancelo una reserva?",
  "¿Qué documentos necesito?",
];

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

export default function ChatBot() {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const isChat = location.pathname === "/chat";     // ¿estamos en la pantalla de chat?
  const hideFab = isMobile && isChat;               // ocultar el botón para no tapar el chat real

  const [open, setOpen] = useState(false);              // ¿está abierto el asistente?
  const [messages, setMessages] = useState([INITIAL_MESSAGE]); // historial de la charla
  const [input, setInput] = useState("");               // texto que se está escribiendo
  const [loading, setLoading] = useState(false);        // esperando respuesta de la IA
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

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [messages, loading, open]);

  // Envía un mensaje del usuario a la IA y agrega la respuesta al historial.
  // Arma la conversación (system prompt + todos los mensajes) y llama a groqChat.
  // Si falla, muestra un mensaje amable (distinto si es por exceso de pedidos).
  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return; // no manda vacío ni si ya está esperando

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    requestAnimationFrame(() => scrollToBottom("auto"));

    try {
      // Formato que espera la IA: primero las instrucciones, luego la charla.
      const groqMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.map((m) => ({ role: m.role, content: m.text })),
      ];

      const { groqChat } = await import("../services/groq");
      const responseText = await groqChat(groqMessages);

      setMessages((prev) => [...prev, { role: "assistant", text: responseText }]);
    } catch (err) {
      const isRateLimit = err.message?.includes("429") || err.message?.toLowerCase().includes("rate");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: isRateLimit
            ? "Estás enviando muchos mensajes muy rápido. Esperá un momento antes de seguir."
            : "Hubo un problema al conectarme. Intentá de nuevo en un momento.",
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus?.({ preventScroll: true });
        scrollToBottom("auto");
      });
    }
  };

  const desktopWidgetStyle = {
    position: "fixed",
    bottom: 92,
    right: isChat ? "auto" : 28,
    left: isChat ? 28 : "auto",
    width: 360,
    height: 500,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 40px rgba(0,0,0,.15)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  };

  // El botón flotante en celular quedaba justo encima de los botones de la
  // pantalla ("Eliminar publicación", "Reservar ahora") y les robaba el toque.
  // Se lo baja al borde y se lo hace un poco más chico.
  const fabSize = isMobile ? 46 : 50;
  // El botón se puede arrastrar: dónde molesta depende de la pantalla, así que la
  // decisión es de quien lo usa. El hook pone position/left/top.
  const fab = useDraggableFab({ size: fabSize, onTap: () => setOpen((o) => !o) });

  const fabStyle = {
    width: isMobile ? 46 : 50,
    height: isMobile ? 46 : 50,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(37,99,235,.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    transition: "transform .15s, box-shadow .15s",
  };

  // Encabezado del chat: logo, título "Asistente Freewheel" y botón de cerrar.
  const Header = (
    <div
      style={{
        background: "#2563eb",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
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
          <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="15" stroke="#fff" strokeWidth="2" />
            <circle cx="18" cy="18" r="5" fill="#fff" />
            <circle cx="18" cy="18" r="2" fill="#2563eb" />
            {[0, 60, 120, 180, 240, 300].map((a, i) => {
              const r = (a * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={18 + 6 * Math.cos(r)}
                  y1={18 + 6 * Math.sin(r)}
                  x2={18 + 13 * Math.cos(r)}
                  y2={18 + 13 * Math.sin(r)}
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>

        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
            Asistente Freewheel
          </div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11 }}>
            En línea
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(false)}
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
        background: "#f9fafb",
        minHeight: 0,
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      {messages.map((m, i) => (
        <div
          key={i}
          style={
            m.role === "assistant"
              ? {
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px 12px 12px 2px",
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#111827",
                  whiteSpace: "pre-wrap",
                }
              : {
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }
          }
        >
          {m.text}
        </div>
      ))}

      {loading && (
        <div
          style={{
            alignSelf: "flex-start",
            background: "#fff",
            border: "1px solid #e5e7eb",
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
              background: "#9ca3af",
            }}
            className="fw-dot-1"
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#9ca3af",
            }}
            className="fw-dot-2"
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#9ca3af",
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
        background: "#fff",
        flexShrink: 0,
      }}
    >
      {SUGGESTIONS.map((sg) => (
        <button
          key={sg}
          onClick={() => send(sg)}
          style={{
            padding: "5px 12px",
            borderRadius: 20,
            border: "1.5px solid #dbeafe",
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: 11,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {sg}
        </button>
      ))}
    </div>
  );

  // Barra inferior: caja de texto (envía con Enter) y botón de enviar.
  const InputBar = (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "12px 14px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        borderTop: "1px solid #f3f4f6",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <input
        ref={inputRef}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: 24,
          border: "1.5px solid #e5e7eb",
          fontSize: 16,
          outline: "none",
          color: "#111827",
        }}
        placeholder="Escribí tu pregunta..."
        value={input}
        enterKeyHint="send"
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

      <button
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          cursor: "pointer",
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
  );

  return (
    <>
      <style>{`
        html, body {
          overscroll-behavior-y: none;
          background: #fff;
        }

        #root {
          background: #fff;
        }

        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .fw-dot-1 { animation: bounce .8s infinite 0s; }
        .fw-dot-2 { animation: bounce .8s infinite .15s; }
        .fw-dot-3 { animation: bounce .8s infinite .3s; }
      `}</style>

      {/* Si está abierto: en celular ocupa toda la pantalla; en escritorio es
          un widget flotante. En ambos casos arma Header + Messages + Sugerencias + Input. */}
      {open &&
        (isMobile ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#fff",
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
                background: "#fff",
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

      {/* Botón flotante (FAB) que abre/cierra el asistente. */}
      {!hideFab && (
        <button
          style={{ ...fabStyle, ...fab.style }}
          {...fab.handlers}
          aria-label={open ? "Cerrar el asistente" : "Abrir el asistente (se puede arrastrar)"}
          title="Tocá para abrir. Sostené y arrastrá para moverlo."
          onMouseEnter={(e) => {
            if (fab.dragging) return;
            e.currentTarget.style.transform = "scale(1.08)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,.4)";
          }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      )}
    </>
  );
}