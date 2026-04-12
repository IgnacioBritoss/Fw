import { useState, useRef, useEffect } from "react";
import { mockMessages } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const CONTACTS = [
  { id:"2", name:"Roberto O.", role:"Dueño · Toyota Corolla", initial:"R" },
  { id:"3", name:"Carmen V.", role:"Dueña · Fiat 500", initial:"C" },
];

const s = {
  page: { display:"flex", height:"calc(100vh - 61px)" },
  sidebar: { width:280, borderRight:"1px solid #f3f4f6",
    background:"#fff", overflowY:"auto", flexShrink:0 },
  sideHeader: { padding:"18px 20px", fontWeight:700, fontSize:15,
    borderBottom:"1px solid #f3f4f6", color:"#111827" },
  contact: { display:"flex", gap:12, alignItems:"center",
    padding:"14px 18px", cursor:"pointer",
    borderBottom:"1px solid #f9fafb", transition:"background .1s" },
  contactActive: { background:"#f0f7f2" },
  avatar: { width:42, height:42, borderRadius:"50%", background:"#1a4d2e",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, color:"#fff", fontSize:16, flexShrink:0 },
  contactName: { fontWeight:600, fontSize:14, color:"#111827" },
  contactRole: { fontSize:12, color:"#6b7280" },
  main: { flex:1, display:"flex", flexDirection:"column" },
  chatHeader: { padding:"14px 20px", borderBottom:"1px solid #f3f4f6",
    background:"#fff", display:"flex", alignItems:"center", gap:12 },
  chatHeaderName: { fontWeight:700, fontSize:15, color:"#111827" },
  chatHeaderStatus: { fontSize:12, color:"#1a4d2e", fontWeight:500 },
  messages: { flex:1, overflowY:"auto", padding:20,
    display:"flex", flexDirection:"column", gap:10, background:"#f9fafb" },
  msgMe: { alignSelf:"flex-end", maxWidth:"70%", background:"#1a4d2e",
    color:"#fff", borderRadius:"12px 12px 2px 12px",
    padding:"10px 14px", fontSize:13, lineHeight:1.5 },
  msgOther: { alignSelf:"flex-start", maxWidth:"70%", background:"#fff",
    border:"1px solid #e5e7eb", borderRadius:"12px 12px 12px 2px",
    padding:"10px 14px", fontSize:13, lineHeight:1.5, color:"#111827" },
  msgTime: { fontSize:10, opacity:.6, marginTop:4, textAlign:"right" },
  inputRow: { display:"flex", gap:8, padding:"14px 20px",
    borderTop:"1px solid #f3f4f6", background:"#fff" },
  input: { flex:1, padding:"11px 16px", borderRadius:24,
    border:"1.5px solid #e5e7eb", fontSize:13, outline:"none",
    color:"#111827" },
  sendBtn: { width:40, height:40, borderRadius:"50%",
    background:"#1a4d2e", color:"#fff", border:"none",
    cursor:"pointer", display:"flex", alignItems:"center",
    justifyContent:"center", flexShrink:0 },
  empty: { flex:1, display:"flex", alignItems:"center",
    justifyContent:"center", color:"#9ca3af",
    flexDirection:"column", gap:12 },
};

export default function Chat() {
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [allMsgs, setAllMsgs] = useState(mockMessages);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const msgs = allMsgs.filter(m =>
    (m.from === active?.id && m.to === "current_user") ||
    (m.from === "current_user" && m.to === active?.id)
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

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
  };

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={s.sideHeader}>Mensajes</div>
        {CONTACTS.map(c => (
          <div key={c.id}
            style={{...s.contact,...(active?.id===c.id?s.contactActive:{})}}
            onMouseEnter={e => { if(active?.id!==c.id)
              e.currentTarget.style.background="#f9fafb"; }}
            onMouseLeave={e => { if(active?.id!==c.id)
              e.currentTarget.style.background=""; }}
            onClick={() => setActive(c)}>
            <div style={s.avatar}>{c.initial}</div>
            <div>
              <div style={s.contactName}>{c.name}</div>
              <div style={s.contactRole}>{c.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.main}>
        {!active ? (
          <div style={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"
                strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:14 }}>Seleccioná una conversación</span>
          </div>
        ) : (
          <>
            <div style={s.chatHeader}>
              <div style={s.avatar}>{active.initial}</div>
              <div>
                <div style={s.chatHeaderName}>{active.name}</div>
                <div style={s.chatHeaderStatus}>En línea</div>
              </div>
            </div>

            <div style={s.messages}>
              {msgs.length === 0 && (
                <div style={{ textAlign:"center", color:"#9ca3af",
                  fontSize:13, marginTop:20 }}>
                  Enviá un mensaje para empezar la conversación.
                </div>
              )}
              {msgs.map(m => (
                <div key={m.id}
                  style={m.from==="current_user" ? s.msgMe : s.msgOther}>
                  {m.text}
                  <div style={s.msgTime}>{m.time}</div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>

            <div style={s.inputRow}>
              <input style={s.input}
                placeholder="Escribí un mensaje..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key==="Enter" && send()} />
              <button style={s.sendBtn} onClick={send}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#fff" strokeWidth="2"
                    strokeLinecap="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff"
                    strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}