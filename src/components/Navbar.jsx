import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { requestEmailChange, confirmEmailChange, updateMe } from "../services/api";

const userInitial = (u) =>
  (u?.name?.[0] || u?.email?.[0] || "?").toUpperCase();

function ProfileModal({ onClose }) {
  const rawUser = JSON.parse(localStorage.getItem("fw_user") || "{}");
  const [editing, setEditing] = useState(null);
  const [nameVal, setNameVal] = useState(rawUser.name || "");
  const [emailVal, setEmailVal] = useState(rawUser.email || "");
  const [phoneVal, setPhoneVal] = useState(rawUser.phone || "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const saveToStorage = (patch) => {
    const updated = { ...rawUser, ...patch };
    localStorage.setItem("fw_user", JSON.stringify(updated));
  };

  const startEdit = (field) => {
    setEditing(field); setCode(""); setCodeSent(false); setError(""); setSuccess("");
  };

  const cancelEdit = () => {
    setEditing(null); setCode(""); setCodeSent(false); setError("");
  };

  const saveName = async () => {
    if (!nameVal.trim()) { setError("Ingresá un nombre."); return; }
    const parts = nameVal.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "-";
    try {
      await updateMe({ firstName, lastName, displayName: nameVal.trim() });
      saveToStorage({ name: nameVal.trim() });
      setSuccess("Nombre actualizado.");
      setEditing(null);
    } catch (err) {
      setError(err.message || "Error al guardar el nombre.");
    }
  };

  const savePhone = async () => {
    if (phoneVal.length > 0 && phoneVal.length < 6) { setError("Número inválido."); return; }
    try {
      await updateMe({ phone: phoneVal || undefined });
      saveToStorage({ phone: phoneVal });
      setSuccess("Teléfono actualizado.");
      setEditing(null);
    } catch (err) {
      setError(err.message || "Error al guardar el teléfono.");
    }
  };

  const sendEmailCode = async () => {
    if (!emailVal.includes("@")) { setError("Ingresá un email válido."); return; }
    try {
      await requestEmailChange(emailVal);
      setCodeSent(true); setError("");
      setSuccess("Código enviado al nuevo email. Revisá tu bandeja.");
    } catch (err) {
      setError(err.message || "Error al enviar el código.");
    }
  };

  const verifyEmailCode = async () => {
    if (code.length !== 6) { setError("El código tiene 6 dígitos."); return; }
    try {
      await confirmEmailChange(code, emailVal);
      saveToStorage({ email: emailVal });
      setSuccess("Email actualizado correctamente.");
      setEditing(null); setCodeSent(false); setCode("");
    } catch (err) {
      setError(err.message || "Código incorrecto o expirado.");
    }
  };

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:8,
    border:"1.5px solid #2563eb", fontSize:14, outline:"none",
    color:"#111827", marginBottom:8, boxSizing:"border-box",
  };
  const labelStyle = {
    fontSize:11, fontWeight:700, color:"#9ca3af",
    textTransform:"uppercase", letterSpacing:".06em", marginBottom:6, display:"block",
  };
  const fieldBox = {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"11px 14px", background:"#f9fafb", borderRadius:8, border:"1px solid #f3f4f6",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:28, width:"90%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>Mi perfil</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
              {rawUser.role === "owner" ? "Dueño" : "Conductor"}
            </div>
          </div>
          <div style={{
            width:48, height:48, borderRadius:"50%",
            background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:18, color:"#fff",
          }}>
            {userInitial(rawUser)}
          </div>
        </div>

        {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"9px 12px", color:"#b91c1c", fontSize:12, marginBottom:12 }}>{error}</div>}
        {success && <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"9px 12px", color:"#2563eb", fontSize:12, marginBottom:12 }}>{success}</div>}

        <div style={{ marginBottom:14 }}>
          <label style={labelStyle}>Nombre</label>
          {editing === "name" ? (
            <div>
              <input value={nameVal} onChange={e => setNameVal(e.target.value)} style={inputStyle} placeholder="Tu nombre completo" />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveName} style={{ flex:1, padding:"9px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Guardar</button>
                <button onClick={cancelEdit} style={{ padding:"9px 14px", background:"#f3f4f6", border:"none", borderRadius:8, fontSize:13, color:"#374151", cursor:"pointer" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={fieldBox}>
              <span style={{ fontSize:14, color:"#111827" }}>{rawUser.name || "Sin nombre"}</span>
              <button onClick={() => startEdit("name")} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cambiar</button>
            </div>
          )}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={labelStyle}>Email</label>
          {editing === "email" ? (
            <div>
              <input value={emailVal} onChange={e => setEmailVal(e.target.value)} style={inputStyle} placeholder="nuevo@email.com" />
              {!codeSent ? (
                <button onClick={sendEmailCode} style={{ width:"100%", padding:"9px", background:"#111827", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:6 }}>
                  Verificar nuevo email
                </button>
              ) : (
                <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6}
                    style={{ flex:1, padding:"9px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none" }} />
                  <button onClick={verifyEmailCode} style={{ padding:"9px 16px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Verificar</button>
                </div>
              )}
              <button onClick={cancelEdit} style={{ background:"none", border:"none", color:"#9ca3af", fontSize:12, cursor:"pointer" }}>Cancelar</button>
            </div>
          ) : (
            <div style={fieldBox}>
              <span style={{ fontSize:14, color:"#111827" }}>{rawUser.email}</span>
              <button onClick={() => { setEmailVal(rawUser.email); startEdit("email"); }} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cambiar</button>
            </div>
          )}
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={labelStyle}>Teléfono</label>
          {editing === "phone" ? (
            <div>
              <input value={phoneVal} onChange={e => setPhoneVal(e.target.value.replace(/\D/g,""))} maxLength={11} placeholder="1134567890" style={inputStyle} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={savePhone} style={{ flex:1, padding:"9px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Guardar</button>
                <button onClick={cancelEdit} style={{ padding:"9px 14px", background:"#f3f4f6", border:"none", borderRadius:8, fontSize:13, color:"#374151", cursor:"pointer" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={fieldBox}>
              <span style={{ fontSize:14, color:"#111827" }}>{rawUser.phone || "Sin teléfono"}</span>
              <button onClick={() => { setPhoneVal(rawUser.phone || ""); startEdit("phone"); }} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cambiar</button>
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ width:"100%", padding:"11px", background:"#f3f4f6", color:"#374151", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const close = () => setMenuOpen(false);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout(); navigate("/"); close(); setDropdownOpen(false);
  };

  const navLink = {
    color:"rgba(255,255,255,.75)", textDecoration:"none",
    fontSize:14, fontWeight:500, transition:"color .15s",
  };

  if (isMobile) return (
    <>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 20px",
        background:"rgba(10,15,30,.95)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,.08)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", flexDirection:"column", gap:5 }}>
          <span style={{ display:"block", width:22, height:2, background:"#fff", borderRadius:2, transition:"all .2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
          <span style={{ display:"block", width:22, height:2, background:"#fff", borderRadius:2, transition:"all .2s", opacity: menuOpen ? 0 : 1 }}/>
          <span style={{ display:"block", width:22, height:2, background:"#fff", borderRadius:2, transition:"all .2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
        </button>
      </nav>

      {menuOpen && (
        <div style={{
          position:"fixed", top:57, left:0, right:0,
          background:"#0d1525", borderBottom:"1px solid rgba(255,255,255,.08)",
          zIndex:99, padding:"12px 20px 24px",
          boxShadow:"0 12px 32px rgba(0,0,0,.3)",
        }}>
          <Link to="/" style={{ ...navLink, color:"rgba(255,255,255,.8)", padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.06)", display:"block" }} onClick={close}>Explorar</Link>
          {user ? (
            user.role === "ADMIN" ? (
              <>
                <Link to="/admin" style={{ ...navLink, color:"#f87171", padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.06)", display:"block" }} onClick={close}>Panel Admin</Link>
                <button style={{ width:"100%", marginTop:12, padding:"13px", background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <>
                {[
                  ["/publish", "Publicar auto"],
                  ["/my-bookings", "Mis reservas"],
                  ["/chat", "Mensajes"],
                  ["/dashboard", "Mi panel"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} style={{ ...navLink, color:"rgba(255,255,255,.8)", padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.06)", display:"block" }} onClick={close}>{label}</Link>
                ))}
                <div style={{ padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.06)", fontSize:14, fontWeight:500, color:"rgba(255,255,255,.8)", cursor:"pointer" }}
                  onClick={() => { setProfileOpen(true); close(); }}>
                  Mi perfil
                </div>
                <button style={{ width:"100%", marginTop:12, padding:"13px", background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={handleLogout}>Salir</button>
              </>
            )
          ) : (
            <>
              <Link to="/login" onClick={close}>
                <button style={{ width:"100%", marginTop:12, padding:"13px", background:"transparent", border:"1.5px solid rgba(255,255,255,.2)", color:"#fff", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Iniciar sesión</button>
              </Link>
              <Link to="/register" onClick={close}>
                <button style={{ width:"100%", marginTop:8, padding:"13px", background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Registrarse</button>
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 48px", height:60,
        background:"rgba(10,15,30,.92)",
        backdropFilter:"blur(16px)",
        borderBottom:"1px solid rgba(255,255,255,.07)",
        position:"sticky", top:0, zIndex:100,
        boxShadow:"0 1px 0 rgba(255,255,255,.04)",
      }}>
        <div style={{ display:"flex", gap:28, alignItems:"center" }}>
          <Link to="/" style={navLink}
            onMouseEnter={e => e.currentTarget.style.color="#fff"}
            onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.75)"}>
            Explorar
          </Link>

          {user ? (
            user.role === "ADMIN" ? (
              <>
                <Link to="/admin" style={{ background:"rgba(220,38,38,.15)", color:"#f87171", padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:700, textDecoration:"none", border:"1px solid rgba(220,38,38,.3)" }}>
                  Panel Admin
                </Link>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff" }}>
                  {userInitial(user)}
                </div>
                <button onClick={() => { logout(); navigate("/"); }}
                  style={{ padding:"8px 18px", background:"transparent", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.8)", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Salir
                </button>
              </>
            ) : (
              <>
                {[
                  ["/publish", "Publicar auto"],
                  ["/my-bookings", "Mis reservas"],
                  ["/chat", "Mensajes"],
                  ["/dashboard", "Mi panel"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} style={navLink}
                    onMouseEnter={e => e.currentTarget.style.color="#fff"}
                    onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.75)"}>
                    {label}
                  </Link>
                ))}

                <div style={{ position:"relative" }} ref={dropdownRef}>
                  <div onClick={() => setDropdownOpen(o => !o)} style={{
                    width:36, height:36, borderRadius:"50%",
                    background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer",
                    boxShadow: dropdownOpen ? "0 0 0 3px rgba(37,99,235,.4)" : "none",
                    transition:"box-shadow .15s",
                  }}>
                    {userInitial(user)}
                  </div>

                  {dropdownOpen && (
                    <div style={{
                      position:"absolute", top:46, right:0,
                      background:"#0d1525", borderRadius:14,
                      minWidth:200, boxShadow:"0 16px 48px rgba(0,0,0,.4)",
                      border:"1px solid rgba(255,255,255,.08)", zIndex:200, overflow:"hidden",
                    }}>
                      <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                            {userInitial(user)}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name || user.email}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:1 }}>{user.email}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding:"6px 0" }}>
                        {[
                          {
                            label:"Ver perfil",
                            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>,
                            action: () => { setProfileOpen(true); setDropdownOpen(false); },
                          },
                          {
                            label:"Mi panel",
                            icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>,
                            action: () => { navigate("/dashboard"); setDropdownOpen(false); },
                          },
                        ].map(({ label, icon, action }) => (
                          <div key={label} onClick={action}
                            style={{ padding:"10px 16px", fontSize:13, color:"rgba(255,255,255,.75)", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:10 }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.06)"}
                            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                            {icon} {label}
                          </div>
                        ))}

                        <div style={{ height:1, background:"rgba(255,255,255,.07)", margin:"4px 0" }}/>

                        <div onClick={handleLogout}
                          style={{ padding:"10px 16px", fontSize:13, color:"#f87171", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:10 }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(220,38,38,.1)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Salir
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <>
              <Link to="/login">
                <button style={{ padding:"8px 18px", background:"transparent", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.85)", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(255,255,255,.5)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,.2)"}>
                  Iniciar sesión
                </button>
              </Link>
              <Link to="/register">
                <button style={{ padding:"8px 18px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Registrarse
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}