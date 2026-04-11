import { useState, useRef, useEffect } from "react";
import { mockMessages } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const CONTACTS = [
  { id:"2", name:"Roberto O.", role:"Dueño · Toyota Corolla", avatar:"R" },
  { id:"3", name:"Carmen V.", role:"Dueña · Fiat Cronos", avatar:"C" },
];

const s = {
  page: { display:"flex", height:"calc(100vh - 60px)", maxWidth:900,
    margin:"0 auto" },
  sidebar: { width:280, borderRight:"1px solid #f3f4f6",
    background:"#fff", overflowY:"auto" },
  sideTitle: { padding:"18px 20px 12px", fontWeight:700, fontSize:16,
    borderBottom:"1px solid #f3f4f6" },
  contact: { display:"flex", gap:12, alignItems:"center",
    padding:"14px 18px", cursor:"pointer", borderBottom:"1px solid #f9fafb" },
  contactActive: { background:"#eff6ff" },
  avatar: { width:42, height:42, borderRadius:"50%", background:"#dbeafe",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, color:"#1d4ed8", flexShrink:0 },
  contactName: { fontWeight:600, fontSize:14 },
  contactRole: { fontSize:12, color:"#6b7280" },
  main: { flex:1, display:"flex", flexDirection:"column" },
  chatHeader: { padding:"14px 20px", borderBottom:"1px solid #f3f4f6",
    background:"#fff", display:"flex", alignItems:"center", gap:12 },
  chatHeaderName: { fontWeight:600, fontSize:15 },
  chatHeaderSub: { fontSize:12, color:"#16a34a" },
  messages: { flex:1, overflowY:"auto", padding:"20px",
    display:"flex", flexDirection:"column", gap:10, background:"#f9fafb" },
  msg: { maxWidth:"70%", padding:"10px 14px", borderRadius:12,
    fontSize:14, lineHeight:1.5 },
  msgMe: { alignSelf:"flex-end", background:"#1d4ed8", color:"#fff",
    borderBottomRightRadius:4 },
  msgOther: { alignSelf:"flex-start", background:"#fff",
    border:"1px solid #e5e7eb", borderBottomLeftRadius:4 },
  msgTime: { fontSize:10, opacity:.65, marginTop:4, textAlign:"right" },
  inputRow: { display:"flex", gap:10, padding:"14px 20px",
    borderTop:"1px solid #f3f4f6", background:"#fff" },
  input: { flex:1, padding:"11px 16px", borderRadius:24,
    border:"1px solid #e5e7eb", fontSize:14, outline:"none" },
  sendBtn: { padding:"11px 20px", background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:24, fontWeight:600, cursor:"pointer" },
  empty: { flex:1, display:"flex", alignItems:"center",
    justifyContent:"center", color:"#9ca3af", flexDirection:"column" },
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

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const send = () => {
    if (!text.trim() || !active) return;
    setAllMsgs(ms => [...ms, {
      id: Date.now().toString(),
      from: "current_user",
      to: active.id,
      text: text.trim(),
      time: new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}),
    }]);
    setText("");
  };

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={s.sideTitle}>Mensajes</div>
        {CONTACTS.map(c => (
          <div key={c.id} style={{...s.contact,...(active?.id===c.id?s.contactActive:{})}}
            onClick={() => setActive(c)}>
            <div style={s.avatar}>{c.avatar}</div>
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
            <div style={{fontSize:48}}>💬</div>
            <div style={{marginTop:12}}>Seleccioná una conversación</div>
          </div>
        ) : (
          <>
            <div style={s.chatHeader}>
              <div style={s.avatar}>{active.avatar}</div>
              <div>
                <div style={s.chatHeaderName}>{active.name}</div>
                <div style={s.chatHeaderSub}>● En línea</div>
              </div>
            </div>
            <div style={s.messages}>
              {msgs.length === 0 && (
                <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,marginTop:20}}>
                  Enviá un mensaje para empezar la conversación.
                </div>
              )}
              {msgs.map(m => (
                <div key={m.id} style={{
                  ...s.msg,
                  ...(m.from==="current_user" ? s.msgMe : s.msgOther)
                }}>
                  {m.text}
                  <div style={s.msgTime}>{m.time}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={s.inputRow}>
              <input style={s.input} placeholder="Escribí un mensaje..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()} />
              <button style={s.sendBtn} onClick={send}>Enviar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
