import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Sos el asistente virtual de Freewheel, una plataforma de alquiler de autos entre particulares en Argentina. 
Tu rol es ayudar a usuarios con dudas sobre:
- Cómo funciona la plataforma
- Seguridad y verificación de usuarios y vehículos
- Pagos, garantías y depósitos
- Cancelaciones y penalidades
- Cómo publicar un auto
- Cómo reservar un auto
- Qué pasa en caso de accidentes o daños
- Documentación necesaria

Respondé siempre en español, de forma clara y amigable. Máximo 3 párrafos por respuesta. Si te preguntan algo que no tiene que ver con Freewheel o alquiler de autos, redirigí la conversación amablemente.`;

const INITIAL_MESSAGE = {
  role: "assistant",
  text: "¡Hola! Soy el asistente de Freewheel 🚗 ¿En qué te puedo ayudar? Puedo responder dudas sobre seguridad, pagos, cómo publicar tu auto, cancelaciones y más.",
};

const s = {
  fab: { position: "fixed", bottom: 28, right: 28, width: 56, height: 56,
    borderRadius: "50%", background: "#1d4ed8", color: "#fff", border: "none",
    fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(29,78,216,.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    transition: "transform .15s" },
  widget: { position: "fixed", bottom: 96, right: 28, width: 360, height: 500,
    background: "#fff", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.15)",
    display: "flex", flexDirection: "column", zIndex: 1000, overflow: "hidden" },
  header: { background: "#1d4ed8", padding: "14px 18px",
    display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.2)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  headerName: { color: "#fff", fontWeight: 600, fontSize: 14 },
  headerSub: { color: "rgba(255,255,255,.7)", fontSize: 11 },
  closeBtn: { background: "none", border: "none", color: "#fff",
    fontSize: 20, cursor: "pointer", padding: 4 },
  messages: { flex: 1, overflowY: "auto", padding: 16,
    display: "flex", flexDirection: "column", gap: 10, background: "#f9fafb" },
  msgBot: { alignSelf: "flex-start", maxWidth: "85%", background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: "12px 12px 12px 2px",
    padding: "10px 14px", fontSize: 13, lineHeight: 1.6, color: "#111827" },
  msgUser: { alignSelf: "flex-end", maxWidth: "85%", background: "#1d4ed8",
    color: "#fff", borderRadius: "12px 12px 2px 12px",
    padding: "10px 14px", fontSize: 13, lineHeight: 1.6 },
  typing: { alignSelf: "flex-start", background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: "12px 12px 12px 2px", padding: "10px 14px",
    display: "flex", gap: 4, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
    animation: "bounce .8s infinite" },
  inputRow: { display: "flex", gap: 8, padding: 12,
    borderTop: "1px solid #f3f4f6", background: "#fff" },
  input: { flex: 1, padding: "10px 14px", borderRadius: 24,
    border: "1px solid #e5e7eb", fontSize: 13, outline: "none" },
  sendBtn: { width: 38, height: 38, borderRadius: "50%", background: "#1d4ed8",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  suggestions: { display: "flex", gap: 6, padding: "0 12px 10px",
    flexWrap: "wrap", background: "#fff" },
  suggestion: { padding: "5px 12px", borderRadius: 20, border: "1px solid #dbeafe",
    background: "#eff6ff", color: "#1d4ed8", fontSize: 11,
    cursor: "pointer", fontWeight: 500 },
};

const SUGGESTIONS = [
  "¿Cómo funciona la garantía?",
  "¿Qué pasa si hay un accidente?",
  "¿Cómo cancelo una reserva?",
  "¿Qué documentos necesito?",
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .filter(m => m.role !== "assistant" || m !== INITIAL_MESSAGE)
            .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
          system: SYSTEM_PROMPT,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Lo siento, hubo un problema al conectarme. Intentá de nuevo en un momento.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .dot1 { animation-delay: 0s; }
        .dot2 { animation-delay: .15s; }
        .dot3 { animation-delay: .3s; }
      `}</style>

      {open && (
        <div style={s.widget}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.avatar}>🚗</div>
              <div>
                <div style={s.headerName}>Asistente Freewheel</div>
                <div style={s.headerSub}>● En línea</div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>×</button>
          </div>

          <div style={s.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === "assistant" ? s.msgBot : s.msgUser}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={s.typing}>
                <div style={{ ...s.dot }} className="dot1" />
                <div style={{ ...s.dot }} className="dot2" />
                <div style={{ ...s.dot }} className="dot3" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={s.suggestions}>
              {SUGGESTIONS.map(s => (
                <button key={s} style={{
                  padding: "5px 12px", borderRadius: 20, border: "1px solid #dbeafe",
                  background: "#eff6ff", color: "#1d4ed8", fontSize: 11,
                  cursor: "pointer", fontWeight: 500
                }} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <div style={s.inputRow}>
            <input
              style={s.input}
              placeholder="Escribí tu pregunta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
            />
            <button style={s.sendBtn} onClick={() => send()}>➤</button>
          </div>
        </div>
      )}

      <button style={s.fab} onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        {open ? "×" : "💬"}
      </button>
    </>
  );
}