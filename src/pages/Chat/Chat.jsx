import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useSearchParams } from "react-router-dom";
import {
  getMyConversations, getConversation,
  getConversationMessages, sendMessage, markConversationRead,
} from "../../services/api";
import { uploadAudioToCloudinary, uploadFileToCloudinary } from "../../services/cloudinary";

function getDisplayName(u) {
  if (!u) return "Usuario";
  return u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Usuario";
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = todayMs - dMs;
  if (diff === 0) return "Hoy";
  if (diff === 86400000) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

function getMsgKind(msg) {
  if (msg.type === "AUDIO") return "audio";
  const c = msg.content || "";
  if (c.includes("res.cloudinary.com") && c.includes("/image/")) return "image";
  if (c.includes("res.cloudinary.com") && !c.includes("/image/")) return "file";
  return "text";
}

function getViewportData() {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  if (window.visualViewport) return {
    height: window.visualViewport.height,
    offsetTop: window.visualViewport.offsetTop || 0,
  };
  return { height: window.innerHeight, offsetTop: 0 };
}

function Avatar({ name, size = 40 }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, color: "#fff",
      fontSize: size > 36 ? 16 : 14,
      flexShrink: 0,
      boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
    }}>
      {initial}
    </div>
  );
}

function AudioMsg({ src, isMe }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? current / duration : 0;
  const bars = [3, 5, 9, 14, 20, 18, 12, 8, 14, 18, 20, 16, 10, 7, 12, 18, 20, 14, 6, 4];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 190, maxWidth: 220 }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
      <button onClick={toggle} style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: isMe ? "rgba(255,255,255,0.22)" : "#e9edef",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill={isMe ? "#fff" : "#374151"}>
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill={isMe ? "#fff" : "#374151"}>
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 22 }}>
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <div key={i} style={{
                width: 3, height: h, borderRadius: 2, flexShrink: 0,
                background: filled
                  ? (isMe ? "#fff" : "#2563eb")
                  : (isMe ? "rgba(255,255,255,0.35)" : "#d1d5db"),
                transition: "background 0.1s",
              }} />
            );
          })}
        </div>
        <span style={{
          fontSize: 10.5,
          color: isMe ? "rgba(255,255,255,0.7)" : "#8696a0",
          lineHeight: 1,
        }}>
          {fmt(playing ? current : duration)}
        </span>
      </div>
    </div>
  );
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
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [viewport, setViewport] = useState(getViewportData());

  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherUser = activeConv
    ? (activeConv.renterId === user?.id ? activeConv.owner : activeConv.renter)
    : null;

  const hasUnread = (conv) => {
    const msgs = conv.messages;
    if (!msgs || msgs.length === 0) return false;
    const last = msgs[0];
    return last.senderId !== user?.id && !last.readAt;
  };

  useEffect(() => {
    getMyConversations()
      .then(data => setConversations(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const convId = searchParams.get("conv");
    if (!convId) return;
    setActiveConvId(convId);
    getConversation(convId)
      .then(conv => {
        if (conv) setConversations(prev =>
          prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]
        );
      })
      .catch(() => {});
  }, [searchParams]);

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

  useLayoutEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages.length, activeConvId]);

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
    } catch { setText(content); }
    setSending(false);
  };

  const startRecording = async () => {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        setRecordingSeconds(0);
        setRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPendingAudio({ blob, url });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch { alert("No se pudo acceder al micrófono"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording)
      mediaRecorderRef.current.stop();
  };

  const handleSendAudio = async () => {
    if (!pendingAudio || !activeConvId) return;
    const { blob, url } = pendingAudio;
    URL.revokeObjectURL(url);
    setPendingAudio(null);
    setUploading(true);
    try {
      const cloudUrl = await uploadAudioToCloudinary(blob);
      const msg = await sendMessage(activeConvId, { content: cloudUrl, type: "AUDIO" });
      setMessages(prev => [...prev, msg]);
    } catch { alert("Error al enviar el audio"); }
    setUploading(false);
  };

  const handleCancelAudio = () => {
    if (pendingAudio) {
      URL.revokeObjectURL(pendingAudio.url);
      setPendingAudio(null);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConvId) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { url } = await uploadFileToCloudinary(file);
      const msg = await sendMessage(activeConvId, { content: url, type: "TEXT" });
      setMessages(prev => [...prev, msg]);
    } catch { alert("Error al subir el archivo"); }
    setUploading(false);
  };

  const renderMsgContent = (msg) => {
    const kind = getMsgKind(msg);
    const isMe = msg.senderId === user?.id;
    if (kind === "audio") {
      return <AudioMsg src={msg.content} isMe={isMe} />;
    }
    if (kind === "image") {
      return (
        <img src={msg.content} alt=""
          onClick={() => window.open(msg.content, "_blank")}
          style={{ maxWidth: 220, borderRadius: 8, display: "block", cursor: "pointer" }} />
      );
    }
    if (kind === "file") {
      return (
        <a href={msg.content} target="_blank" rel="noreferrer"
          style={{ color: isMe ? "#bfdbfe" : "#2563eb", fontSize: 13 }}>
          Abrir archivo
        </a>
      );
    }
    return (
      <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {msg.content}
      </span>
    );
  };

  const renderMessages = () => {
    let lastDateLabel = "";
    return messages.map(msg => {
      const isMe = msg.senderId === user?.id;
      const dateLabel = formatDateLabel(msg.createdAt);
      const showDate = dateLabel !== lastDateLabel;
      if (showDate) lastDateLabel = dateLabel;
      return (
        <div key={msg.id} style={{ display: "contents" }}>
          {showDate && (
            <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
              <span style={{
                fontSize: 11, color: "#8696a0",
                background: "#e9edef",
                borderRadius: 8, padding: "4px 12px",
                fontWeight: 500,
              }}>
                {dateLabel}
              </span>
            </div>
          )}
          <div style={{
            display: "flex",
            justifyContent: isMe ? "flex-end" : "flex-start",
            marginBottom: 2,
            padding: "0 12px",
          }}>
            <div style={{
              maxWidth: "72%",
              background: isMe ? "#2563eb" : "#fff",
              color: isMe ? "#fff" : "#111827",
              borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
              padding: "7px 12px 6px",
              fontSize: 13.5,
              lineHeight: 1.5,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              border: isMe ? "none" : "1px solid #e9edef",
              position: "relative",
            }}>
              {renderMsgContent(msg)}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 3,
                marginTop: 2,
              }}>
                <span style={{ fontSize: 10.5, color: isMe ? "rgba(255,255,255,0.65)" : "#8696a0", lineHeight: 1 }}>
                  {formatTime(msg.createdAt)}
                </span>
                {isMe && (
                  <span style={{
                    fontSize: 12,
                    lineHeight: 1,
                    color: msg.readAt ? "#93c5fd" : "rgba(255,255,255,0.5)",
                    letterSpacing: -2,
                  }}>
                    ✓✓
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const renderInput = () => {
    if (pendingAudio) {
      return (
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          padding: isMobile ? "8px 12px" : "10px 16px",
          paddingBottom: isMobile ? "max(8px, env(safe-area-inset-bottom))" : "10px",
          background: "#f0f2f5",
          borderTop: "1px solid #e9edef",
        }}>
          <audio controls src={pendingAudio.url} style={{ flex: 1, height: 36, minWidth: 0 }} />
          <button onClick={handleSendAudio} disabled={uploading}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#2563eb", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={handleCancelAudio}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#e9edef", color: "#374151",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 18,
            }}>
            ✕
          </button>
        </div>
      );
    }

    if (recording) {
      return (
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          padding: isMobile ? "8px 12px" : "10px 16px",
          paddingBottom: isMobile ? "max(8px, env(safe-area-inset-bottom))" : "10px",
          background: "#f0f2f5",
          borderTop: "1px solid #e9edef",
        }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: "#fff", borderRadius: 24, padding: "10px 16px",
            border: "1px solid #e9edef",
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "#dc2626", animation: "recPulse 1s infinite",
            }} />
            <span style={{ color: "#374151", fontSize: 13.5 }}>
              Grabando... {recordingSeconds}s
            </span>
          </div>
          <button onClick={stopRecording}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "#374151", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      );
    }

    const sideIconBtn = {
      width: 38, height: 38, borderRadius: "50%",
      background: "transparent", border: "none",
      cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0, color: "#8696a0",
      transition: "color .15s, background .15s",
    };

    return (
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 6,
        padding: isMobile ? "8px 10px" : "10px 14px",
        paddingBottom: isMobile ? "max(8px, env(safe-area-inset-bottom))" : "10px",
        background: "#fff",
        borderTop: "1px solid #e9edef",
        flexShrink: 0,
      }}>
        <input ref={fileInputRef} type="file"
          accept="image/*,.pdf,.doc,.docx,.zip"
          style={{ display: "none" }}
          onChange={handleFileSelect} />
        <input id="fw-img-input" type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect} />

        <button
          onClick={() => document.getElementById("fw-img-input")?.click()}
          disabled={uploading}
          title="Enviar imagen"
          style={sideIconBtn}
          onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#8696a0"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Adjuntar archivo"
          style={sideIconBtn}
          onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#8696a0"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <div style={{ flex: 1 }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => {
              setText(e.target.value);
              e.target.style.height = "40px";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribí un mensaje..."
            rows={1}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 24,
              border: "none",
              background: "#f0f2f5",
              fontSize: isMobile ? 16 : 13.5,
              outline: "none",
              color: "#111827",
              resize: "none",
              overflow: "hidden",
              minHeight: 40,
              maxHeight: 120,
              lineHeight: 1.5,
              display: "block",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={startRecording}
          title="Grabar audio"
          style={sideIconBtn}
          onMouseEnter={e => { e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#8696a0"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          title="Enviar"
          style={{
            ...sideIconBtn,
            width: 42, height: 42,
            background: text.trim() ? "#2563eb" : "#e5e7eb",
            color: "#fff",
            cursor: text.trim() ? "pointer" : "default",
            boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
            transition: "background .15s, transform .1s, box-shadow .15s",
          }}
          onMouseDown={e => text.trim() && (e.currentTarget.style.transform = "scale(0.92)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  };

  const otherName = getDisplayName(otherUser);
  const v = activeConv?.listing?.vehicle;
  const listingLabel = v
    ? `${v.brand} ${v.model} ${v.year}`
    : activeConv?.listing?.title || "";

  const convListJSX = (
    <div style={{
      background: "#fff",
      width: isMobile ? "100%" : 320,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      borderRight: "1px solid #e9edef",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px",
        background: "#f0f2f5",
        borderBottom: "1px solid #e9edef",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={user?.name || user?.email} size={38} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>
            Mensajes
          </span>
        </div>
      </div>

      <div style={{ padding: "8px 10px", background: "#f0f2f5", borderBottom: "1px solid #e9edef" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", borderRadius: 8,
          padding: "6px 12px", border: "1px solid #e9edef",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 13, color: "#8696a0" }}>Buscar conversación</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: 24, textAlign: "center", color: "#8696a0", fontSize: 13 }}>
            Cargando...
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div style={{
            padding: 32, textAlign: "center", color: "#8696a0", fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#f0f2f5",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                  stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            No tenés conversaciones aún.
          </div>
        )}

        {conversations.map(conv => {
          const other = conv.renterId === user?.id ? conv.owner : conv.renter;
          const name = getDisplayName(other);
          const cv = conv.listing?.vehicle;
          const label = cv ? `${cv.brand} ${cv.model} ${cv.year}` : conv.listing?.title || "";
          const lastMsg = conv.messages?.[0];
          const preview = lastMsg
            ? (lastMsg.type === "AUDIO"
              ? "🎵 Audio"
              : lastMsg.content?.length > 45
                ? lastMsg.content.slice(0, 45) + "…"
                : lastMsg.content)
            : "Sin mensajes";
          const isActive = conv.id === activeConvId;
          const unread = hasUnread(conv);
          const msgTime = lastMsg ? formatTime(lastMsg.createdAt) : "";

          return (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              style={{
                display: "flex", gap: 12, alignItems: "center",
                padding: "12px 16px",
                cursor: "pointer",
                background: isActive ? "#e9edef" : "transparent",
                borderBottom: "1px solid #f0f2f5",
                transition: "background .1s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f5f6f7"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <Avatar name={name} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 2,
                }}>
                  <span style={{
                    fontWeight: unread ? 700 : 500,
                    fontSize: 14.5, color: "#111827",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {name}
                  </span>
                  {msgTime && (
                    <span style={{
                      fontSize: 11,
                      color: unread ? "#2563eb" : "#8696a0",
                      flexShrink: 0, marginLeft: 6,
                    }}>
                      {msgTime}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 11.5, color: "#2563eb",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginBottom: 1,
                }}>
                  {label}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{
                    fontSize: 12.5,
                    color: unread ? "#111827" : "#8696a0",
                    fontWeight: unread ? 500 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {preview}
                  </span>
                  {unread && (
                    <div style={{
                      minWidth: 20, height: 20, borderRadius: 10,
                      background: "#2563eb", color: "#fff",
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 5px", marginLeft: 6, flexShrink: 0,
                    }}>
                      1
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const chatAreaJSX = (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
      background: "#f1f4f9",
    }}>
      <div style={{
        padding: isMobile ? "10px 14px" : "10px 16px",
        background: "#fff",
        borderBottom: "1px solid #e9edef",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        {isMobile && (
          <button
            onClick={() => setActiveConvId(null)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#2563eb", padding: "0 8px 0 0",
              display: "flex", alignItems: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <Avatar name={otherName} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", lineHeight: 1.3 }}>
            {otherName}
          </div>
          <div style={{ fontSize: 11.5, color: "#8696a0", lineHeight: 1.3 }}>
            {listingLabel}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
          ].map((icon, i) => (
            <button key={i} style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#e9edef"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={messagesRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", flex: 1, gap: 12, padding: 32,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.85)",
              borderRadius: 12, padding: "12px 24px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13.5, color: "#6b7280", lineHeight: 1.6 }}>
                Los mensajes son entre vos y el dueño del auto.
              </div>
              <div style={{ fontSize: 12, color: "#8696a0", marginTop: 4 }}>
                Enviá el primer mensaje para empezar.
              </div>
            </div>
          </div>
        )}
        {renderMessages()}
        <div style={{ height: 8 }} />
      </div>

      {renderInput()}
    </div>
  );

  const navbarHeight = 61;

  if (isMobile) return (
    <>
      <style>{`
        html, body { overscroll-behavior-y: none; }
        @keyframes recPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div style={{
        position: "fixed",
        top: navbarHeight + viewport.offsetTop,
        left: 0, right: 0,
        height: Math.max(0, viewport.height - navbarHeight),
        display: "flex", flexDirection: "column",
        background: "#fff", zIndex: 50, overflow: "hidden",
      }}>
        {!activeConvId ? convListJSX : chatAreaJSX}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @keyframes recPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div style={{
        display: "flex",
        height: "calc(100vh - 61px)",
        overflow: "hidden",
        background: "#111827",
      }}>
        {convListJSX}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!activeConvId ? (
            <div style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "#f1f4f9",
              gap: 16,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "#e0e8f7",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="#8696a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{
                background: "#fff",
                border: "1px solid #dce3ee",
                borderRadius: 12, padding: "14px 28px", textAlign: "center",
              }}>
                <div style={{ fontWeight: 600, fontSize: 18, color: "#111827", marginBottom: 6 }}>
                  Freewheel Mensajes
                </div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>
                  Seleccioná una conversación para empezar
                </div>
              </div>
            </div>
          ) : chatAreaJSX}
        </div>
      </div>
    </>
  );
}