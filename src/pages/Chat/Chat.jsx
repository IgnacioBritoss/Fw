import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { mockMessages } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const CONTACTS = [
  { id: "2", name: "Roberto O.", role: "Dueño · Toyota Corolla",
    initial: "R", email: "roberto@email.com", phone: "1145678901" },
  { id: "3", name: "Carmen V.", role: "Dueña · Fiat 500",
    initial: "C", email: "carmen@email.com", phone: "1167890123" },
];

function getViewportData() {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  if (window.visualViewport) return {
    height: window.visualViewport.height,
    offsetTop: window.visualViewport.offsetTop || 0,
  };
  return { height: window.innerHeight, offsetTop: 0 };
}

function ContactInfoModal({ contact, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, padding:24,
        width:"90%", maxWidth:340, boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"#1a4d2e",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:20, color:"#fff" }}>
            {contact.initial}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>
              {contact.name}
            </div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{contact.role}</div>
          </div>
        </div>
        <div style={{ background:"#f9fafb", borderRadius:10, padding:14,
          marginBottom:10, border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
            Email
          </div>
          <div style={{ fontSize:14, color:"#111827", fontWeight:500 }}>
            {contact.email}
          </div>
        </div>
        <div style={{ background:"#f9fafb", borderRadius:10, padding:14,
          marginBottom:16, border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
            Teléfono
          </div>
          <div style={{ fontSize:14, color:"#111827", fontWeight:500 }}>
            {contact.phone}
          </div>
        </div>
        <div style={{ fontSize:11, color:"#9ca3af", textAlign:"center",
          marginBottom:14, lineHeight:1.5 }}>
          Estos datos se comparten por seguridad una vez que la reserva está confirmada.
        </div>
        <button onClick={onClose}
          style={{ width:"100%", padding:"10px", background:"#f3f4f6",
            border:"none", borderRadius:8, fontSize:14, fontWeight:600,
            color:"#374151", cursor:"pointer" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [active, setActive] = useState(null);
  const [allMsgs, setAllMsgs] = useState(mockMessages);
  const [text, setText] = useState("");
  const [viewport, setViewport] = useState(getViewportData());
  const [contactModal, setContactModal] = useState(null);

  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const msgs = allMsgs.filter(m =>
    (m.from === active?.id && m.to === "current_user") ||
    (m.from === "current_user" && m.to === active?.id)
  );

  const scrollToBottom = (behavior = "auto") => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior });
  };

  useEffect(() => {
    const updateViewport = () => setViewport(getViewportData());
    const updateViewportDeferred = () => {
      updateViewport();
      requestAnimationFrame(() => {
        updateViewport();
        setTimeout(() => updateViewport(), 120);
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
    if (!active) return;
    scrollToBottom("auto");
  }, [active]);

  useEffect(() => {
    if (!active) return;
    scrollToBottom("auto");
  }, [msgs.length, active]);

  const send = () => {
    if (!text.trim() || !active) return;
    setAllMsgs(ms => [...ms, {
      id: Date.now().toString(),
      from: "current_user",
      to: active.id,
      text: text.trim(),
      time: new Date().toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" }),
    }]);
    setText("");
    requestAnimationFrame(() => {
      inputRef.current?.focus?.({ preventScroll: true });
      scrollToBottom("auto");
    });
  };

  const avatarStyle = (small) => ({
    width: small ? 36 : 42,
    height: small ? 36 : 42,
    borderRadius: "50%",
    background: "#1a4d2e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, color: "#fff",
    fontSize: small ? 14 : 16,
    flexShrink: 0,
  });

  const MsgBubble = ({ m }) => (
    <div style={{
      alignSelf: m.from === "current_user" ? "flex-end" : "flex-start",
      maxWidth: "78%",
      background: m.from === "current_user" ? "#1a4d2e" : "#fff",
      color: m.from === "current_user" ? "#fff" : "#111827",
      borderRadius: m.from === "current_user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
      border: m.from === "current_user" ? "none" : "1px solid #e5e7eb",
      padding: "10px 14px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
    }}>
      {m.text}
      <div style={{ fontSize:10, opacity:.6, marginTop:4, textAlign:"right" }}>
        {m.time}
      </div>
    </div>
  );

  const ContactList = () => (
    <div style={{ background:"#fff", overflowY:"auto",
      width: isMobile ? "100%" : 280,
      borderRight: isMobile ? "none" : "1px solid #f3f4f6", flexShrink:0 }}>
      <div style={{ padding:"18px 20px", fontWeight:700, fontSize:15,
        borderBottom:"1px solid #f3f4f6", color:"#111827" }}>
        Mensajes
      </div>
      {CONTACTS.map(c => (
        <div key={c.id}
          style={{ display:"flex", gap:12, alignItems:"center",
            padding:"14px 18px", cursor:"pointer",
            borderBottom:"1px solid #f9fafb",
            background: active?.id === c.id ? "#f0f7f2" : "transparent" }}
          onClick={() => setActive(c)}>
          <div style={avatarStyle(false)}>{c.initial}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:"#111827" }}>{c.name}</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{c.role}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const ChatHeader = () => (
    <div style={{ padding: isMobile ? "12px 16px" : "14px 20px",
      borderBottom:"1px solid #f3f4f6", background:"#fff",
      display:"flex", alignItems:"center", gap: isMobile ? 10 : 12, flexShrink:0 }}>
      {isMobile && (
        <button onClick={() => setActive(null)}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:"#1a4d2e", fontSize:22, fontWeight:700,
            padding:"0 8px 0 0", flexShrink:0 }}>
          ‹
        </button>
      )}
      <div style={avatarStyle(isMobile)}>{active.initial}</div>
      <div style={{ cursor:"pointer", flex:1 }}
        onClick={() => setContactModal(active)}>
        <div style={{ fontWeight:700, fontSize: isMobile ? 14 : 15, color:"#111827" }}>
          {active.name}
        </div>
        <div style={{ fontSize:12, color:"#1a4d2e", fontWeight:500 }}>
          Ver contacto
        </div>
      </div>
    </div>
  );

  const MessagesArea = () => (
    <div ref={messagesRef}
      style={{ flex:1, overflowY:"auto",
        padding: isMobile ? "12px 16px" : "20px",
        display:"flex", flexDirection:"column", gap:10,
        background:"#f9fafb", minHeight:0,
        WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
      {msgs.length === 0 && (
        <div style={{ textAlign:"center", color:"#9ca3af", fontSize:13, marginTop:20 }}>
          Enviá un mensaje para empezar.
        </div>
      )}
      {msgs.map(m => <MsgBubble key={m.id} m={m} />)}
    </div>
  );

  const InputArea = () => (
    <div style={{ display:"flex", gap:8,
      padding: isMobile ? "10px 16px" : "14px 20px",
      paddingBottom: isMobile ? "max(10px, env(safe-area-inset-bottom))" : "14px",
      borderTop:"1px solid #f3f4f6", background:"#fff", flexShrink:0 }}>
      <input ref={inputRef}
        style={{ flex:1, padding: isMobile ? "10px 14px" : "11px 16px",
          borderRadius:24, border:"1.5px solid #e5e7eb",
          fontSize: isMobile ? 16 : 13, outline:"none", color:"#111827" }}
        placeholder="Escribí un mensaje..."
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => {
          requestAnimationFrame(() => {
            setViewport(getViewportData());
            setTimeout(() => { setViewport(getViewportData()); scrollToBottom("auto"); }, 120);
          });
        }}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
        enterKeyHint="send"
      />
      <button onClick={send}
        style={{ width:40, height:40, borderRadius:"50%", background:"#1a4d2e",
          color:"#fff", border:"none", cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );

  const navbarHeight = 61;

  if (isMobile) return (
    <>
      <style>{`html, body { overscroll-behavior-y: none; }`}</style>
      {contactModal && <ContactInfoModal contact={contactModal} onClose={() => setContactModal(null)} />}
      <div style={{ position:"fixed", top: navbarHeight + viewport.offsetTop,
        left:0, right:0,
        height: Math.max(0, viewport.height - navbarHeight),
        display:"flex", flexDirection:"column",
        background:"#fff", zIndex:50, overflow:"hidden" }}>
        {!active ? <ContactList /> : (
          <>
            <ChatHeader />
            <MessagesArea />
            <InputArea />
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {contactModal && <ContactInfoModal contact={contactModal} onClose={() => setContactModal(null)} />}
      <div style={{ display:"flex", height:"calc(100vh - 61px)" }}>
        <ContactList />
        <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
          {!active ? (
            <div style={{ flex:1, display:"flex", alignItems:"center",
              justifyContent:"center", color:"#9ca3af",
              flexDirection:"column", gap:12 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                  stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:14 }}>Seleccioná una conversación</span>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
              <ChatHeader />
              <MessagesArea />
              <InputArea />
            </div>
          )}
        </div>
      </div>
    </>
  );
}