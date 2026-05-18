import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useSearchParams } from "react-router-dom";
import {
  getMyConversations,
  getConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
} from "../../services/api";
import { uploadAudioToCloudinary } from "../../services/cloudinary";

function getDisplayName(u) {
  if (!u) return "Usuario";
  return u.displayName ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    "Usuario";
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const msgDay = new Date(dateStr);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msgMidnight = new Date(msgDay.getFullYear(), msgDay.getMonth(), msgDay.getDate());
  const diff = todayMidnight - msgMidnight;
  if (diff === 0) return "Hoy";
  if (diff === 86400000) return "Ayer";
  return msgDay.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

function getViewportData() {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  if (window.visualViewport)
    return {
      height: window.visualViewport.height,
      offsetTop: window.visualViewport.offsetTop || 0,
    };
  return { height: window.innerHeight, offsetTop: 0 };
}

export default function Chat() {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [viewport, setViewport] = useState(getViewportData());

  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherUser = activeConv
    ? (activeConv.renterId === user?.id ? activeConv.owner : activeConv.renter)
    : null;

  // Cargar conversaciones al montar
  useEffect(() => {
    getMyConversations()
      .then(data => setConversations(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Leer param ?conv= de la URL
  useEffect(() => {
    const convId = searchParams.get("conv");
    if (!convId) return;
    setActiveConvId(convId);
    // Si no está en la lista, fetchearla
    getConversation(convId)
      .then(conv => {
        if (conv) setConversations(prev =>
          prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]
        );
      })
      .catch(() => {});
  }, [searchParams]);

  // Polling de mensajes cuando hay conversación activa
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeConvId) { setMessages([]); return; }

    const poll = () =>
      getConversationMessages(activeConvId)
        .then(msgs => setMessages(msgs || []))
        .catch(() => {});

    poll();
    markConversationRead(activeConvId).catch(() => {});

    pollRef.current = setInterval(() => {
      poll();
      markConversationRead(activeConvId).catch(() => {});
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [activeConvId]);

  // Scroll al último mensaje
  useLayoutEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages.length, activeConvId]);

  // Viewport móvil (teclado)
  useEffect(() => {
    const update = () => setViewport(getViewportData());
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  const handleSend = async () => {
    if (!text.trim() || !activeConvId || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const msg = await sendMessage(activeConvId, { content, type: "TEXT" });
      setMessages(prev => [...prev, msg]);
    } catch {
      setText(content);
    }
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startRecording = async () => {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        setRecordingSeconds(0);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const url = await uploadAudioToCloudinary(blob);
          const msg = await sendMessage(activeConvId, { content: url, type: "AUDIO" });
          setMessages(prev => [...prev, msg]);
        } catch {
          alert("Error al enviar el audio");
        }
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(
        () => setRecordingSeconds(s => s + 1), 1000
      );
    } catch {
      alert("No se pudo acceder al micrófono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording)
      mediaRecorderRef.current.stop();
  };

  const getLastPreview = (conv) => {
    const msgs = conv.messages;
    if (!msgs || msgs.length === 0) return "Sin mensajes";
    const last = msgs[0];
    return last.type === "AUDIO" ? "🎵 Audio" : last.content;
  };

  // ── Subcomponentes ──────────────────────────────────────────────

  const SeenIcon = ({ msg }) => {
    if (msg.senderId !== user?.id) return null;
    return (
      <span style={{
        fontSize: 10, marginLeft: 3, letterSpacing: -1,
        color: msg.readAt ? "#93c5fd" : "rgba(255,255,255,0.5)",
      }}>
        {msg.readAt ? "✓✓" : "✓"}
      </span>
    );
  };

  const MsgBubble = ({ msg, showDate, dateLabel }) => {
    const isMe = msg.senderId === user?.id;
    return (
      <>
        {showDate && (
          <div style={{ textAlign: "center", margin: "8px 0" }}>
            <span style={{
              fontSize: 11, color: "#9ca3af",
              background: "#f3f4f6", borderRadius: 10, padding: "2px 10px",
            }}>
              {dateLabel}
            </span>
          </div>
        )}
        <div style={{
          alignSelf: isMe ? "flex-end" : "flex-start",
          maxWidth: "75%",
          background: isMe ? "#2563eb" : "#fff",
          color: isMe ? "#fff" : "#111827",
          borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
          border: isMe ? "none" : "1px solid #e5e7eb",
          padding: "10px 14px",
          fontSize: 13, lineHeight: 1.5,
        }}>
          {msg.type === "AUDIO" ? (
            <audio
              controls
              src={msg.content}
              style={{ maxWidth: 220, height: 36, display: "block" }}
            />
          ) : (
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.content}
            </span>
          )}
          <div style={{
            display: "flex", justifyContent: "flex-end",
            alignItems: "center", marginTop: 4, gap: 2,
          }}>
            <span style={{ fontSize: 10, opacity: 0.55 }}>
              {formatTime(msg.createdAt)}
            </span>
            <SeenIcon msg={msg} />
          </div>
        </div>
      </>
    );
  };

  const ConvList = () => (
    <div style={{
      background: "#fff",
      width: isMobile ? "100%" : 300,
      borderRight: "1px solid #f3f4f6",
      display: "flex", flexDirection: "column",
      flexShrink: 0, overflowY: "auto",
    }}>
      <div style={{
        padding: "18px 20px", fontWeight: 700, fontSize: 15,
        borderBottom: "1px solid #f3f4f6", color: "#111827",
      }}>
        Mensajes
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          Cargando...
        </div>
      )}
      {!loading && conversations.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          No tenés conversaciones aún.
        </div>
      )}

      {conversations.map(conv => {
        const other = conv.renterId === user?.id ? conv.owner : conv.renter;
        const name = getDisplayName(other);
        const v = conv.listing?.vehicle;
        const listingLabel = v
          ? `${v.brand} ${v.model} ${v.year}`
          : conv.listing?.title || "";
        const isActive = conv.id === activeConvId;

        return (
          <div
            key={conv.id}
            onClick={() => setActiveConvId(conv.id)}
            style={{
              padding: "14px 18px", cursor: "pointer",
              borderBottom: "1px solid #f9fafb",
              background: isActive ? "#eff6ff" : "transparent",
              display: "flex", gap: 12, alignItems: "center",
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#2563eb", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: "#fff", fontSize: 16, flexShrink: 0,
            }}>
              {name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 1 }}>
                {name}
              </div>
              <div style={{ fontSize: 11, color: "#2563eb", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {listingLabel}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getLastPreview(conv)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const ChatArea = () => {
    const otherName = getDisplayName(otherUser);
    const v = activeConv?.listing?.vehicle;
    const listingLabel = v
      ? `${v.brand} ${v.model} ${v.year}`
      : activeConv?.listing?.title || "";

    let lastDateLabel = "";

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

        {/* Header */}
        <div style={{
          padding: isMobile ? "12px 16px" : "14px 20px",
          borderBottom: "1px solid #f3f4f6", background: "#fff",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          {isMobile && (
            <button
              onClick={() => setActiveConvId(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#2563eb", fontSize: 22, fontWeight: 700,
                padding: "0 8px 0 0",
              }}
            >‹</button>
          )}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "#2563eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: "#fff", fontSize: 15, flexShrink: 0,
          }}>
            {otherName[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
              {otherName}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{listingLabel}</div>
          </div>
        </div>

        {/* Mensajes */}
        <div
          ref={messagesRef}
          style={{
            flex: 1, overflowY: "auto",
            padding: isMobile ? "12px 16px" : "16px 20px",
            display: "flex", flexDirection: "column", gap: 6,
            background: "#f9fafb", minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 20 }}>
              Enviá un mensaje para empezar.
            </div>
          )}
          {messages.map(msg => {
            const dateLabel = formatDateLabel(msg.createdAt);
            const showDate = dateLabel !== lastDateLabel;
            if (showDate) lastDateLabel = dateLabel;
            return (
              <MsgBubble
                key={msg.id}
                msg={msg}
                showDate={showDate}
                dateLabel={dateLabel}
              />
            );
          })}
        </div>

        {/* Input */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          padding: isMobile ? "10px 16px" : "12px 20px",
          paddingBottom: isMobile
            ? "max(10px, env(safe-area-inset-bottom))"
            : "12px",
          borderTop: "1px solid #f3f4f6", background: "#fff", flexShrink: 0,
        }}>
          {recording ? (
            <>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 10,
                background: "#fef2f2", borderRadius: 24,
                padding: "10px 16px", border: "1.5px solid #fecaca",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#dc2626", animation: "pulse 1s infinite",
                }} />
                <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 500 }}>
                  Grabando... {recordingSeconds}s
                </span>
              </div>
              <button
                onClick={stopRecording}
                style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "#dc2626", color: "#fff",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <input
                ref={inputRef}
                style={{
                  flex: 1,
                  padding: isMobile ? "10px 14px" : "10px 16px",
                  borderRadius: 24, border: "1.5px solid #e5e7eb",
                  fontSize: isMobile ? 16 : 13,
                  outline: "none", color: "#111827",
                }}
                placeholder="Escribí un mensaje..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                enterKeyHint="send"
              />
              {/* Botón micrófono */}
              <button
                onClick={startRecording}
                title="Grabar audio"
                style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "#f3f4f6", color: "#6b7280",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </button>
              {/* Botón enviar */}
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: text.trim() ? "#2563eb" : "#e5e7eb",
                  color: "#fff", border: "none",
                  cursor: text.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  transition: "background .15s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const navbarHeight = 61;

  // ── Render ───────────────────────────────────────────────────────

  if (isMobile) return (
    <>
      <style>{`
        html, body { overscroll-behavior-y: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
      <div style={{
        position: "fixed",
        top: navbarHeight + viewport.offsetTop,
        left: 0, right: 0,
        height: Math.max(0, viewport.height - navbarHeight),
        display: "flex", flexDirection: "column",
        background: "#fff", zIndex: 50, overflow: "hidden",
      }}>
        {!activeConvId ? <ConvList /> : <ChatArea />}
      </div>
    </>
  );

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <div style={{ display: "flex", height: "calc(100vh - 61px)", overflow: "hidden" }}>
        <ConvList />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!activeConvId ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", color: "#9ca3af",
              flexDirection: "column", gap: 12,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                  stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 14 }}>Seleccioná una conversación</span>
            </div>
          ) : (
            <ChatArea />
          )}
        </div>
      </div>
    </>
  );
}