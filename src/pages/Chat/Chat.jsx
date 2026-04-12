import { useState, useRef, useEffect } from "react";
import { mockMessages } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const CONTACTS = [
  { id:"2", name:"Roberto O.", role:"Dueño · Toyota Corolla", initial:"R" },
  { id:"3", name:"Carmen V.", role:"Dueña · Fiat 500", initial:"C" },
];

export default function Chat() {
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [active, setActive] = useState(null);
  const [allMsgs, setAllMsgs] = useState(mockMessages);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const msgs = allMsgs.filter(m =>
    (m.from === active?.id && m.to === "current_user") ||
    (m.from === "current_user" && m.to === active?.id)
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  // Fix iOS: cuando aparece el teclado scrollea al fondo
  useEffect(() => {
    if (!isMobile) return;
    const handler = () => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior:"smooth" });
      }, 100);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [isMobile]);

  const send = () => {
    if (!text.trim() || !active) return;
    setAllMsgs(ms => [...ms, {
      id: Date.now().toString(),
      from: "current_user",
      to: active.id,
      text: text.trim(),
      time: new Date().toLocaleTimeString("es-AR",
        { hour:"2-digit", minute:"2-digit" }),
    }]);
    setText("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  };

  const avatarStyle = (small) => ({
    width: small ? 36 : 42,
    height: small ? 36 : 42,
    borderRadius:"50%", background:"#1a4d2e",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, color:"#fff",
    fontSize: small ? 14 : 16, flexShrink:0,
  });

  const ContactList = () => (
    <div style={{
      background:"#fff", overflowY:"auto",
      width: isMobile ? "100%" : 280,
      borderRight: isMobile ? "none" : "1px solid #f3f4f6",
      flexShrink:0,
    }}>
      <div style={{ padding:"18px 20px", fontWeight:700, fontSize:15,
        borderBottom:"1px solid #f3f4f6", color:"#111827" }}>
        Mensajes
      </div>
      {CONTACTS.map(c => (
        <div key={c.id}
          style={{ display:"flex", gap:12, alignItems:"center",
            padding:"14px 18px", cursor:"pointer",
            borderBottom:"1px solid #f9fafb",
            background: active?.id===c.id ? "#f0f7f2" : "transparent" }}
          onClick={() => setActive(c)}>
          <div style={avatarStyle(false)}>{c.initial}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:"#111827" }}>
              {c.name}
            </div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{c.role}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // En mobile usamos position fixed como WhatsApp
  // El contenedor no cambia de tamaño cuando aparece el teclado
  if (isMobile) {
    return (
      <>
        {/* Fondo para ocupar el espacio en el DOM */}
        <div style={{ height:"calc(100vh - 61px)" }} />

        {/* Chat fijo — no se mueve con el teclado */}
        <div style={{
          position:"fixed",
          top: 61, // altura del navbar
          left: 0, right: 0, bottom: 0,
          display:"flex", flexDirection:"column",
          background:"#fff", zIndex: 50,
        }}>
          {!active ? (
            <ContactList />
          ) : (
            <>
              {/* Header */}
              <div style={{
                padding:"12px 16px",
                borderBottom:"1px solid #f3f4f6",
                background:"#fff",
                display:"flex", alignItems:"center", gap:10,
                flexShrink:0,
              }}>
                <button onClick={() => setActive(null)}
                  style={{ background:"none", border:"none",
                    cursor:"pointer", color:"#1a4d2e", fontSize:22,
                    fontWeight:700, padding:"0 8px 0 0", flexShrink:0 }}>
                  ‹
                </button>
                <div style={avatarStyle(true)}>{active.initial}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>
                    {active.name}
                  </div>
                  <div style={{ fontSize:12, color:"#1a4d2e", fontWeight:500 }}>
                    En línea
                  </div>
                </div>
              </div>

              {/* Mensajes — ocupa todo el espacio disponible */}
              <div
                ref={messagesRef}
                style={{
                  flex:1, overflowY:"auto",
                  padding:"12px 16px",
                  display:"flex", flexDirection:"column", gap:10,
                  background:"#f9fafb",
                  // Importante: permite que el scroll funcione bien en iOS
                  WebkitOverflowScrolling:"touch",
                }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign:"center", color:"#9ca3af",
                    fontSize:13, marginTop:20 }}>
                    Enviá un mensaje para empezar.
                  </div>
                )}
                {msgs.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.from==="current_user" ? "flex-end" : "flex-start",
                    maxWidth:"78%",
                    background: m.from==="current_user" ? "#1a4d2e" : "#fff",
                    color: m.from==="current_user" ? "#fff" : "#111827",
                    borderRadius: m.from==="current_user"
                      ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    border: m.from==="current_user" ? "none" : "1px solid #e5e7eb",
                    padding:"10px 14px", fontSize:13, lineHeight:1.5,
                  }}>
                    {m.text}
                    <div style={{ fontSize:10, opacity:.6, marginTop:4,
                      textAlign:"right" }}>{m.time}</div>
                  </div>
                ))}
                <div ref={bottomRef}/>
              </div>

              {/* Input — pegado al fondo, sube con el teclado naturalmente */}
              <div style={{
                display:"flex", gap:8,
                padding:"10px 16px",
                paddingBottom:"max(10px, env(safe-area-inset-bottom))",
                borderTop:"1px solid #f3f4f6",
                background:"#fff",
                flexShrink:0,
              }}>
                <input
                  ref={inputRef}
                  style={{
                    flex:1, padding:"10px 14px", borderRadius:24,
                    border:"1.5px solid #e5e7eb", fontSize:16,
                    // fontSize 16 evita el zoom automático en iOS
                    outline:"none", color:"#111827",
                  }}
                  placeholder="Escribí un mensaje..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && send()}
                  enterKeyHint="send"
                />
                <button onClick={send}
                  style={{ width:40, height:40, borderRadius:"50%",
                    background:"#1a4d2e", color:"#fff", border:"none",
                    cursor:"pointer", display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="#fff" strokeWidth="2"
                      strokeLinecap="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // Desktop — igual que antes
  return (
    <div style={{ display:"flex", height:"calc(100vh - 61px)" }}>
      <ContactList />
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {!active ? (
          <div style={{ flex:1, display:"flex", alignItems:"center",
            justifyContent:"center", color:"#9ca3af",
            flexDirection:"column", gap:12 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"
                strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:14 }}>Seleccioná una conversación</span>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column",
            flex:1, minHeight:0 }}>
            <div style={{ padding:"14px 20px",
              borderBottom:"1px solid #f3f4f6", background:"#fff",
              display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
              <div style={avatarStyle(false)}>{active.initial}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>
                  {active.name}
                </div>
                <div style={{ fontSize:12, color:"#1a4d2e", fontWeight:500 }}>
                  En línea
                </div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"20px",
              display:"flex", flexDirection:"column", gap:10,
              background:"#f9fafb", minHeight:0 }}>
              {msgs.length === 0 && (
                <div style={{ textAlign:"center", color:"#9ca3af",
                  fontSize:13, marginTop:20 }}>
                  Enviá un mensaje para empezar.
                </div>
              )}
              {msgs.map(m => (
                <div key={m.id} style={{
                  alignSelf: m.from==="current_user" ? "flex-end" : "flex-start",
                  maxWidth:"75%",
                  background: m.from==="current_user" ? "#1a4d2e" : "#fff",
                  color: m.from==="current_user" ? "#fff" : "#111827",
                  borderRadius: m.from==="current_user"
                    ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  border: m.from==="current_user" ? "none" : "1px solid #e5e7eb",
                  padding:"10px 14px", fontSize:13, lineHeight:1.5,
                }}>
                  {m.text}
                  <div style={{ fontSize:10, opacity:.6, marginTop:4,
                    textAlign:"right" }}>{m.time}</div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
            <div style={{ display:"flex", gap:8, padding:"14px 20px",
              borderTop:"1px solid #f3f4f6", background:"#fff",
              flexShrink:0 }}>
              <input
                style={{ flex:1, padding:"11px 16px", borderRadius:24,
                  border:"1.5px solid #e5e7eb", fontSize:13,
                  outline:"none", color:"#111827" }}
                placeholder="Escribí un mensaje..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key==="Enter" && send()} />
              <button onClick={send}
                style={{ width:40, height:40, borderRadius:"50%",
                  background:"#1a4d2e", color:"#fff", border:"none",
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#fff" strokeWidth="2"
                    strokeLinecap="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}