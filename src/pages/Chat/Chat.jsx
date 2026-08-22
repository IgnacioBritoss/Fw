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
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import Avatar from "../../components/Avatar";
import { initialsOf } from "../../services/people";

// Reproductor de las notas de voz: botón play/pausa + barritas de onda + tiempo.
// Además, debajo tiene un botón "Transcribir mensaje" que convierte el audio a
// texto usando Whisper (IA de Groq) y muestra el resultado.
/**
 * Los tics de "entregado" y "leído", como en cualquier mensajería.
 *
 * ANTES eran el texto "✓" / "✓✓" a 10px con `letter-spacing: -1`, y el estado
 * leído se pintaba de un celeste (#93c5fd) SOBRE LA BURBUJA AZUL. Dos azules
 * pegados no se distinguen: el mensaje se marcaba como leído y en la pantalla no
 * cambiaba nada, así que parecía que la marca de leído no andaba.
 *
 * Ahora es un dibujo, y el estado se nota por dos cosas a la vez: el segundo tic
 * aparece, y el color salta a un celeste claro que sí contrasta contra el azul.
 * Con una sola de las dos señales alcanza para entenderlo.
 */
function Ticks({ read }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}>
      <path d="M1 6.2 3.6 8.9 9 2.6" stroke={read ? "#7dd3fc" : "rgba(255,255,255,.6)"}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {read && (
        <path d="M6.4 8.9 11.8 2.6" stroke="#7dd3fc"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function AudioMsg({ src }) {
  const { t: tr } = useI18n();
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
        <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(127,127,127,0.22)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "inherit" }}>
          {playing
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        {/*
          Las ondas toman el color de la burbuja (currentColor) en vez de ser
          blancas fijas. Blancas se veían solo en los audios PROPIOS, que van
          sobre la burbuja azul; en los que manda la otra persona, que van sobre
          una burbuja blanca, las ondas eran blancas sobre blanco y no se veía
          nada: parecía un reproductor roto.
        */}
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              width: 3, height: h, borderRadius: 2, background: "currentColor",
              opacity: progress > 0 && i / bars.length < progress ? 0.95 : 0.3,
            }} />
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
          {transcribing ? tr("chat.transcribing") : transcribeError ? tr("chat.transcribeRetry") : tr("chat.transcribe")}
        </button>
      )}
    </div>
  );
}

// Nombre visible de un usuario.
function getDisplayName(u, fallback = "Usuario") {
  if (!u) return fallback;
  return u.displayName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || fallback;
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
    const name = getDisplayName(other, tr("profile.userFallback")).toLowerCase();
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
    } catch { alert(tr("chat.micFailed")); }
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
    } catch { alert(tr("chat.audioFailed")); }
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
    } catch { alert(tr("chat.uploadFailed")); }
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
          style={{ color: isMe ? "#bfdbfe" : "var(--fw-blue)", fontSize: 13 }}>
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
              <span style={{ fontSize: 11, color: "var(--fw-text-3)", background: "var(--fw-surface-3)", borderRadius: 10, padding: "3px 12px", fontWeight: 500 }}>
                {dateLabel}
              </span>
            </div>
          )}
          <div style={{
            alignSelf: isMe ? "flex-end" : "flex-start",
            maxWidth: "72%",
            background: isMe ? "var(--fw-blue)" : "var(--fw-surface)",
            color: isMe ? "#fff" : "var(--fw-text)",
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            border: isMe ? "none" : "1px solid var(--fw-border)",
            padding: "10px 14px",
            fontSize: 13.5, lineHeight: 1.5,
            boxShadow: isMe ? "0 1px 3px rgba(11,85,192,.25)" : "0 1px 3px rgba(0,0,0,.06)",
          }}>
            {renderMsgContent(msg)}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 3 }}>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{formatTime(msg.createdAt)}</span>
              {isMe && <Ticks read={Boolean(msg.readAt)} />}
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
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid var(--fw-line-soft)", background: "var(--fw-surface)", flexShrink: 0 }}>
          <audio controls src={pendingAudio.url} style={{ flex: 1, height: 36, minWidth: 0 }} />
          <button onClick={handleSendAudio} disabled={uploading}
            style={{ padding: "9px 18px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {uploading ? "..." : `${tr("chat.send")} ✓`}
          </button>
          <button onClick={handleCancelAudio}
            style={{ padding: "9px 14px", background: "var(--fw-bg)", color: "var(--fw-text-2)", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      );
    }

    if (recording) {
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid var(--fw-line-soft)", background: "var(--fw-surface)", flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "var(--fw-red-bg)", borderRadius: 24, padding: "10px 16px", border: "1.5px solid var(--fw-red-line)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--fw-red)", animation: "pulse 1s infinite" }} />
            <span style={{ color: "var(--fw-red-text)", fontSize: 14, fontWeight: 500 }}>Grabando... {recordingSeconds}s</span>
          </div>
          <button onClick={stopRecording}
            style={{ padding: "9px 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            Detener
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: isMobile ? "10px 16px" : "12px 20px", paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "12px", borderTop: "1px solid var(--fw-line-soft)", background: "var(--fw-surface)", flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.zip" style={{ display: "none" }} onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Adjuntar"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--fw-bg)", border: "none", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={tr("chat.phMessage")}
          enterKeyHint="send"
          /*
            `minWidth: 0` es lo que evita que la barra se desborde.

            Un elemento flexible NO se achica por debajo del ancho de su
            contenido salvo que se le diga: con el texto de ejemplo adentro, este
            campo se negaba a encogerse y empujaba a los botones hacia afuera. Por
            eso la barra se veía corrida a la derecha y el avioncito de enviar
            quedaba cortado contra el borde de la pantalla.
          */
          style={{ flex: 1, minWidth: 0, padding: isMobile ? "10px 14px" : "10px 18px", borderRadius: 20, border: "1.5px solid var(--fw-border)", fontSize: isMobile ? 16 : 13.5, outline: "none", color: "var(--fw-text)", background: "var(--fw-surface-2)" }}
        />
        <button onClick={startRecording} title="Grabar audio"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--fw-bg)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button onClick={handleSend} disabled={sending || !text.trim()}
          style={{ width: 42, height: 42, borderRadius: "50%", background: text.trim() ? "var(--fw-blue)" : "var(--fw-surface-3)", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,.3)" : "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  };

  const otherName = getDisplayName(otherUser, tr("profile.userFallback"));
  const v = activeConv?.listing?.vehicle;
  const listingLabel = v ? `${v.brand} ${v.model} ${v.year}` : activeConv?.listing?.title || "";

  // Panel izquierdo: buscador + lista de conversaciones (con avatar, último
  // mensaje y puntito de no leído).
  const convListJSX = (
    <div style={{ background: "var(--fw-surface)", width: isMobile ? "100%" : 300, borderRight: "1px solid var(--fw-line-soft)", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--fw-line-soft)" }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: "var(--fw-text)", letterSpacing: "-.3px" }}>{tr("nav.messages")}</div>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--fw-line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", background: "var(--fw-bg)", borderRadius: 22, padding: "8px 14px", gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tr("chat.searchConv")}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--fw-text)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fw-text-4)", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>
      {loading && <Spinner block label={tr("common.loading")} />}
      {!loading && conversations.length === 0 && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block" }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontSize: 13, color: "var(--fw-text-3)", fontWeight: 500 }}>{tr("chat.noConversations")}</div>
        </div>
      )}
      {!loading && filteredConversations.length === 0 && conversations.length > 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--fw-text-4)", fontSize: 13 }}>{tr("chat.noResults")}</div>
      )}
      {filteredConversations.map(conv => {
        const other = conv.renterId === user?.id ? conv.owner : conv.renter;
        const name = getDisplayName(other, tr("profile.userFallback"));
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
          : tr("chat.noMessages");
        const isActive = conv.id === activeConvId;
        const unread = hasUnread(conv);
        return (
          <div key={conv.id} onClick={() => setActiveConvId(conv.id)}
            style={{ padding: "13px 18px", cursor: "pointer", borderBottom: "1px solid #f9fafb", background: isActive ? "var(--fw-blue-bg)" : "transparent", display: "flex", gap: 12, alignItems: "center", transition: "background .1s" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar src={other?.profilePhotoUrl} initials={initialsOf(other)} size={42} alt={name} />
              {unread && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--fw-blue)", border: "2px solid #fff" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: "var(--fw-text)", marginBottom: 1 }}>{name}</div>
              <div style={{ fontSize: 11, color: "var(--fw-blue)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 12, color: unread ? "var(--fw-text-2)" : "var(--fw-text-4)", fontWeight: unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Panel derecho: cabecera con el otro usuario + lista de mensajes + input.
  const chatAreaJSX = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: isMobile ? "12px 16px" : "14px 20px", borderBottom: "1px solid var(--fw-line-soft)", background: "var(--fw-surface)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <button onClick={() => setActiveConvId(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fw-blue)", fontSize: 22, fontWeight: 700, padding: "0 8px 0 0" }}>
            ‹
          </button>
        )}
        {/* El avatar y el nombre abren el perfil de la otra persona: ahí se ven
            sus calificaciones como conductor y como dueño, y sus reseñas. Es la
            forma de saber con quién estás tratando antes de acordar algo. */}
        <button
          type="button"
          onClick={() => otherUser?.id && setProfileUserId(otherUser.id)}
          title={tr("chat.viewProfile")}
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: otherUser?.id ? "pointer" : "default", textAlign: "left" }}
        >
          <Avatar src={otherUser?.profilePhotoUrl} initials={initialsOf(otherUser)} size={40} alt={otherName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--fw-text)" }}>{otherName}</div>
            {listingLabel && <div style={{ fontSize: 12, color: "var(--fw-blue)", fontWeight: 500 }}>{listingLabel}</div>}
          </div>
        </button>
      </div>
      <div ref={messagesRef}
        style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 16px" : "16px 24px", display: "flex", flexDirection: "column", gap: 6, background: "var(--fw-surface-2)", minHeight: 0, WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--fw-text-4)", fontSize: 13, marginTop: 40 }}>
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
      <div style={{ position: "fixed", top: navbarHeight + viewport.offsetTop, left: 0, right: 0, height: Math.max(0, viewport.height - navbarHeight), display: "flex", flexDirection: "column", background: "var(--fw-surface)", zIndex: 50, overflow: "hidden" }}>
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
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, background: "var(--fw-surface-2)" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--fw-blue-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="#0f6ce6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fw-text)", textAlign: "center" }}>{tr("chat.yourMessages")}</div>
                <div style={{ fontSize: 13, color: "var(--fw-text-4)", textAlign: "center", marginTop: 4 }}>{tr("chat.pickConversation")}</div>
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