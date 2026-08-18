// ============================================================================
//  Chat — MENSAJERÍA entre usuarios (estilo WhatsApp)
// ----------------------------------------------------------------------------
//  Pantalla dividida en dos: la lista de conversaciones a la izquierda y la
//  charla activa a la derecha (en celular se ve una u otra). Permite mandar
//  texto, imágenes/archivos (a Cloudinary) y notas de voz grabadas con el
//  micrófono. Para simular "tiempo real", cada 3 segundos vuelve a pedir los
//  mensajes (polling) y marca la conversación como leída.
// ============================================================================
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useSearchParams } from "react-router-dom";
import {
  getMyConversations, getConversation,
  getConversationMessages, sendMessage, markConversationRead,
} from "../../services/api";
import { uploadAudioToCloudinary, uploadFileToCloudinary } from "../../services/cloudinary";
import UserProfileModal from "../../components/UserProfileModal";
<<<<<<< HEAD
=======
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import Avatar from "../../components/Avatar";
import { initialsOf } from "../../services/people";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

// Reproductor de las notas de voz: botón play/pausa + barritas de onda + tiempo.
// Además, debajo tiene un botón "Transcribir mensaje" que convierte el audio a
// texto usando Whisper (IA de Groq) y muestra el resultado.
function AudioMsg({ src }) {
<<<<<<< HEAD
=======
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");     // texto transcripto
  const [transcribing, setTranscribing] = useState(false); // esperando a la IA
  const [transcribeError, setTranscribeError] = useState(false);
  const audioRef = useRef(null);
  const bars = [3, 5, 9, 14, 20, 18, 12, 8, 14, 18, 20, 16, 10, 7, 12, 18, 20, 14, 6, 4];
  const progress = duration > 0 ? current / duration : 0;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };
  // Pide la transcripción del audio a la IA y guarda el texto (o marca el error).
  const handleTranscribe = async () => {
    if (transcribing) return;
    setTranscribing(true);
    setTranscribeError(false);
    try {
      const { groqTranscribe } = await import("../../services/groq");
      const text = await groqTranscribe(src);
      setTranscript(text || "(No se reconoció texto en el audio)");
    } catch {
      setTranscribeError(true);
    } finally {
      setTranscribing(false);
    }
  };
  return (
    <div style={{ minWidth: 180 }}>
      {/* Fila del reproductor */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <audio ref={audioRef} src={src}
          onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => { setPlaying(false); setCurrent(0); }} />
        <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {playing
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: progress > 0 && i / bars.length < progress ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
        <span style={{ fontSize: 11, opacity: 0.8, minWidth: 30, textAlign: "right" }}>
          {playing ? fmt(current) : fmt(duration)}
        </span>
      </div>

      {/* Transcripción: muestra el texto si ya lo tenemos, o el botón para pedirlo.
          Usa color/opacidad heredados para que se lea tanto en la burbuja azul
          (mensajes propios) como en la blanca (mensajes del otro). */}
      {transcript ? (
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(127,127,127,0.25)", fontSize: 12.5, lineHeight: 1.45, fontStyle: "italic", opacity: 0.92, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {transcript}
        </div>
      ) : (
        <button onClick={handleTranscribe} disabled={transcribing}
          style={{ marginTop: 6, background: "none", border: "none", padding: 0, cursor: transcribing ? "default" : "pointer", color: "inherit", opacity: 0.75, fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, textDecoration: "underline" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h10M4 17h7" />
          </svg>
<<<<<<< HEAD
          {transcribing ? "Transcribiendo..." : transcribeError ? "Error — reintentar" : "Transcribir mensaje"}
=======
          {transcribing ? tr("chat.transcribing") : transcribeError ? tr("chat.transcribeRetry") : tr("chat.transcribe")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </button>
      )}
    </div>
  );
}

// Nombre visible de un usuario.
<<<<<<< HEAD
function getDisplayName(u) {
  if (!u) return "Usuario";
  return u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Usuario";
=======
function getDisplayName(u, fallback = "Usuario") {
  if (!u) return fallback;
  return u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || fallback;
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
}

// Hora de un mensaje (HH:mm).
function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// Etiqueta del separador de fecha entre mensajes: "Hoy", "Ayer" o la fecha.
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

// Detecta el tipo de un mensaje (audio, imagen, archivo o texto) para saber
// cómo mostrarlo. Se apoya en el type y en la URL de Cloudinary.
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
<<<<<<< HEAD
}

// Avatar circular con la inicial del nombre y un color elegido según la letra.
function Avatar({ name, size = 40, fontSize = 15 }) {
  const colors = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize, flexShrink: 0 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
=======
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
}

export default function Chat() {
  const { t: tr } = useI18n();
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
  const [searchQuery, setSearchQuery] = useState("");

  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Conversación abierta y el "otro" participante (si soy el inquilino, el otro
  // es el dueño, y viceversa).
  // Perfil que se está mirando (se abre desde el avatar del encabezado).
  const [profileUserId, setProfileUserId] = useState(null);

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherUser = activeConv
    ? (activeConv.renterId === user?.id ? activeConv.owner : activeConv.renter)
    : null;

  // Conversaciones que coinciden con el texto del buscador.
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const other = conv.renterId === user?.id ? conv.owner : conv.renter;
<<<<<<< HEAD
    const name = getDisplayName(other).toLowerCase();
=======
    const name = getDisplayName(other, tr("profile.userFallback")).toLowerCase();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    return name.includes(searchQuery.toLowerCase().trim());
  });

  // ¿La conversación tiene un mensaje sin leer del otro? (para el puntito azul).
  const hasUnread = (conv) => {
    const msgs = conv.messages;
    if (!msgs || msgs.length === 0) return false;
    const last = msgs[0];
    return last.senderId !== user?.id && !last.readAt;
  };

  // Al cargar: trae todas las conversaciones del usuario.
  useEffect(() => {
    getMyConversations()
      .then(data => setConversations(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Si venimos con ?conv=... en la URL (ej: desde "Contactar al dueño"), abre
  // esa conversación y la agrega a la lista si no estaba.
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

  // Al abrir una conversación: carga sus mensajes y los vuelve a pedir cada 3s
  // (polling) para simular tiempo real; además la marca como leída.
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
    return () => clearInterval(pollRef.current); // corta el polling al salir
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

  // Envía un mensaje de texto. Si falla, devuelve el texto al input para reintentar.
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

  // Empieza a grabar audio con el micrófono (MediaRecorder) y cuenta los segundos.
  // Al detener, arma un Blob de audio y lo deja "pendiente" para enviar o cancelar.
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
<<<<<<< HEAD
    } catch { alert("No se pudo acceder al micrófono"); }
=======
    } catch { alert(tr("chat.micFailed")); }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  };

  // Detiene la grabación en curso.
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording)
      mediaRecorderRef.current.stop();
  };

  // Sube el audio grabado a Cloudinary y lo manda como mensaje tipo AUDIO.
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
<<<<<<< HEAD
    } catch { alert("Error al enviar el audio"); }
=======
    } catch { alert(tr("chat.audioFailed")); }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    setUploading(false);
  };

  // Descarta el audio grabado sin enviarlo.
  const handleCancelAudio = () => {
    if (pendingAudio) {
      URL.revokeObjectURL(pendingAudio.url);
      setPendingAudio(null);
    }
  };

  // Sube un archivo/imagen elegido a Cloudinary y manda su URL como mensaje.
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConvId) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { url } = await uploadFileToCloudinary(file);
      const msg = await sendMessage(activeConvId, { content: url, type: "TEXT" });
      setMessages(prev => [...prev, msg]);
<<<<<<< HEAD
    } catch { alert("Error al subir el archivo"); }
=======
    } catch { alert(tr("chat.uploadFailed")); }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    setUploading(false);
  };

  // Dibuja el contenido de un mensaje según su tipo (audio, imagen, archivo o texto).
  const renderMsgContent = (msg) => {
    const kind = getMsgKind(msg);
    const isMe = msg.senderId === user?.id;
    if (kind === "audio") return <AudioMsg src={msg.content} />;
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
    return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</span>;
  };

  // Dibuja todos los mensajes, insertando un separador de fecha cuando cambia
  // el día. Los míos van a la derecha (azul); los del otro, a la izquierda.
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
            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <span style={{ fontSize: 11, color: "#6b7280", background: "#e5e7eb", borderRadius: 10, padding: "3px 12px", fontWeight: 500 }}>
                {dateLabel}
              </span>
            </div>
          )}
          <div style={{
            alignSelf: isMe ? "flex-end" : "flex-start",
            maxWidth: "72%",
            background: isMe ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#fff",
            color: isMe ? "#fff" : "#111827",
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            border: isMe ? "none" : "1px solid #e5e7eb",
            padding: "10px 14px",
            fontSize: 13.5, lineHeight: 1.5,
            boxShadow: isMe ? "0 2px 8px rgba(37,99,235,.2)" : "0 1px 3px rgba(0,0,0,.06)",
          }}>
            {renderMsgContent(msg)}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 3 }}>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{formatTime(msg.createdAt)}</span>
              {isMe && (
                <span style={{ fontSize: 10, letterSpacing: -1, color: msg.readAt ? "#93c5fd" : "rgba(255,255,255,0.5)" }}>
                  {msg.readAt ? "✓✓" : "✓"}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  // Dibuja la barra inferior, que cambia según el estado: audio pendiente de
  // enviar, grabando, o el input normal (adjuntar + escribir + grabar + enviar).
  const renderInput = () => {
    if (pendingAudio) {
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid #f3f4f6", background: "#fff", flexShrink: 0 }}>
          <audio controls src={pendingAudio.url} style={{ flex: 1, height: 36, minWidth: 0 }} />
          <button onClick={handleSendAudio} disabled={uploading}
            style={{ padding: "9px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
<<<<<<< HEAD
            {uploading ? "..." : "Enviar ✓"}
=======
            {uploading ? "..." : `${tr("chat.send")} ✓`}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
          <button onClick={handleCancelAudio}
            style={{ padding: "9px 14px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      );
    }

    if (recording) {
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid #f3f4f6", background: "#fff", flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", borderRadius: 24, padding: "10px 16px", border: "1.5px solid #fecaca" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", animation: "pulse 1s infinite" }} />
            <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 500 }}>Grabando... {recordingSeconds}s</span>
          </div>
          <button onClick={stopRecording}
            style={{ padding: "9px 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            Detener
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid #f3f4f6", background: "#fff", flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.zip" style={{ display: "none" }} onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Adjuntar"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
<<<<<<< HEAD
          placeholder="Escribí un mensaje..."
=======
          placeholder={tr("chat.phMessage")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          enterKeyHint="send"
          style={{ flex: 1, padding: isMobile ? "10px 16px" : "10px 18px", borderRadius: 24, border: "1.5px solid #e5e7eb", fontSize: isMobile ? 16 : 13.5, outline: "none", color: "#111827", background: "#f9fafb" }}
        />
        <button onClick={startRecording} title="Grabar audio"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#f3f4f6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button onClick={handleSend} disabled={sending || !text.trim()}
          style={{ width: 42, height: 42, borderRadius: "50%", background: text.trim() ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#e5e7eb", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,.3)" : "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  };

<<<<<<< HEAD
  const otherName = getDisplayName(otherUser);
=======
  const otherName = getDisplayName(otherUser, tr("profile.userFallback"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const v = activeConv?.listing?.vehicle;
  const listingLabel = v ? `${v.brand} ${v.model} ${v.year}` : activeConv?.listing?.title || "";

  // Panel izquierdo: buscador + lista de conversaciones (con avatar, último
  // mensaje y puntito de no leído).
  const convListJSX = (
    <div style={{ background: "#fff", width: isMobile ? "100%" : 300, borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #f3f4f6" }}>
<<<<<<< HEAD
        <div style={{ fontWeight: 800, fontSize: 17, color: "#111827", letterSpacing: "-.3px" }}>Mensajes</div>
=======
        <div style={{ fontWeight: 800, fontSize: 17, color: "#111827", letterSpacing: "-.3px" }}>{tr("nav.messages")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#f3f4f6", borderRadius: 22, padding: "8px 14px", gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
<<<<<<< HEAD
            placeholder="Buscar conversación"
=======
            placeholder={tr("chat.searchConv")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#111827" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>
<<<<<<< HEAD
      {loading && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Cargando...</div>}
      {!loading && conversations.length === 0 && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block" }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>No tenés conversaciones aún.</div>
        </div>
      )}
      {!loading && filteredConversations.length === 0 && conversations.length > 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Sin resultados.</div>
      )}
      {filteredConversations.map(conv => {
        const other = conv.renterId === user?.id ? conv.owner : conv.renter;
        const name = getDisplayName(other);
=======
      {loading && <Spinner block label={tr("common.loading")} />}
      {!loading && conversations.length === 0 && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block" }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{tr("chat.noConversations")}</div>
        </div>
      )}
      {!loading && filteredConversations.length === 0 && conversations.length > 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>{tr("chat.noResults")}</div>
      )}
      {filteredConversations.map(conv => {
        const other = conv.renterId === user?.id ? conv.owner : conv.renter;
        const name = getDisplayName(other, tr("profile.userFallback"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        const cv = conv.listing?.vehicle;
        const label = cv ? `${cv.brand} ${cv.model} ${cv.year}` : conv.listing?.title || "";
        const lastMsg = conv.messages?.[0];
        const preview = lastMsg
          ? (lastMsg.type === "AUDIO"
            ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                Audio
              </span>
            : lastMsg.content)
<<<<<<< HEAD
          : "Sin mensajes";
=======
          : tr("chat.noMessages");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        const isActive = conv.id === activeConvId;
        const unread = hasUnread(conv);
        return (
          <div key={conv.id} onClick={() => setActiveConvId(conv.id)}
            style={{ padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid #f9fafb", background: isActive ? "#eff6ff" : "transparent", display: "flex", gap: 12, alignItems: "center", transition: "background .1s" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
<<<<<<< HEAD
              <Avatar name={name} size={42} fontSize={16} />
=======
              <Avatar src={other?.profilePhotoUrl} initials={initialsOf(other)} size={42} alt={name} />
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              {unread && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "#2563eb", border: "2px solid #fff" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: "#111827", marginBottom: 1 }}>{name}</div>
              <div style={{ fontSize: 11, color: "#2563eb", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 12, color: unread ? "#374151" : "#9ca3af", fontWeight: unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Panel derecho: cabecera con el otro usuario + lista de mensajes + input.
  const chatAreaJSX = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: isMobile ? "12px 16px" : "14px 20px", borderBottom: "1px solid #f3f4f6", background: "#fff", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <button onClick={() => setActiveConvId(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 22, fontWeight: 700, padding: "0 8px 0 0" }}>
            ‹
          </button>
        )}
        {/* El avatar y el nombre abren el perfil de la otra persona: ahí se ven
            sus calificaciones como conductor y como dueño, y sus reseñas. Es la
            forma de saber con quién estás tratando antes de acordar algo. */}
        <button
          type="button"
          onClick={() => otherUser?.id && setProfileUserId(otherUser.id)}
<<<<<<< HEAD
          title="Ver perfil y reseñas"
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: otherUser?.id ? "pointer" : "default", textAlign: "left" }}
        >
          <Avatar name={otherName} size={40} fontSize={15} />
=======
          title={tr("chat.viewProfile")}
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: otherUser?.id ? "pointer" : "default", textAlign: "left" }}
        >
          <Avatar src={otherUser?.profilePhotoUrl} initials={initialsOf(otherUser)} size={40} alt={otherName} />
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{otherName}</div>
            {listingLabel && <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 500 }}>{listingLabel}</div>}
          </div>
        </button>
      </div>
      <div ref={messagesRef}
        style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 16px" : "16px 24px", display: "flex", flexDirection: "column", gap: 6, background: "#f9fafb", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 40 }}>
            Enviá un mensaje para empezar.
          </div>
        )}
        {renderMessages()}
      </div>
      {renderInput()}
    </div>
  );

  const navbarHeight = 61;

  if (isMobile) return (
    <>
      <style>{`
        html, body { overscroll-behavior-y: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
      <div style={{ position: "fixed", top: navbarHeight + viewport.offsetTop, left: 0, right: 0, height: Math.max(0, viewport.height - navbarHeight), display: "flex", flexDirection: "column", background: "#fff", zIndex: 50, overflow: "hidden" }}>
        {!activeConvId ? convListJSX : chatAreaJSX}
      </div>
      {profileUserId && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </>
  );

  return (
    <>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <div style={{ display: "flex", height: "calc(100vh - 61px)", overflow: "hidden" }}>
        {convListJSX}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!activeConvId ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, background: "#f9fafb" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
<<<<<<< HEAD
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", textAlign: "center" }}>Tus mensajes</div>
                <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>Seleccioná una conversación</div>
=======
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", textAlign: "center" }}>{tr("chat.yourMessages")}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>{tr("chat.pickConversation")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </div>
            </div>
          ) : chatAreaJSX}
        </div>
      </div>
      {profileUserId && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </>
  );
}