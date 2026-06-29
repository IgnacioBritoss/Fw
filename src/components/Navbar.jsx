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
      setSuccess("Nombre actualizado."); setEditing(null);
    } catch (err) { setError(err.message || "Error al guardar el nombre."); }
  };

  const savePhone = async () => {
    if (phoneVal.length > 0 && phoneVal.length < 6) { setError("Número inválido."); return; }
    try {
      await updateMe({ phone: phoneVal || undefined });
      saveToStorage({ phone: phoneVal });
      setSuccess("Teléfono actualizado."); setEditing(null);
    } catch (err) { setError(err.message || "Error al guardar el teléfono."); }
  };

  const sendEmailCode = async () => {
    if (!emailVal.includes("@")) { setError("Ingresá un email válido."); return; }
    try {
      await requestEmailChange(emailVal);
      setCodeSent(true); setError("");
      setSuccess("Código enviado al nuevo email. Revisá tu bandeja.");
    } catch (err) { setError(err.message || "Error al enviar el código."); }
  };

  const verifyEmailCode = async () => {
    if (code.length !== 6) { setError("El código tiene 6 dígitos."); return; }
    try {
      await confirmEmailChange(code, emailVal);
      saveToStorage({ email: emailVal });
      setSuccess("Email actualizado correctamente.");
      setEditing(null); setCodeSent(false); setCode("");
    } catch (err) { setError(err.message || "Código incorrecto o expirado."); }
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #2563eb", fontSize:14, outline:"none", color:"#111827", marginBottom:8, boxSizing:"border-box" };
  const labelStyle = { fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6, display:"block" };
  const fieldBox = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:"#f9fafb", borderRadius:8, border:"1px solid #f3f4f6" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:28, width:"90%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>Mi perfil</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{rawUser.role === "owner" ? "Dueño" : "Conductor"}</div>
          </div>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, color:"#fff" }}>
            {userInitial(rawUser)}
          </div>
        </div>

        {error && <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:8, padding:"9px 12px", color:"#b91c1c", fontSize:12, marginBottom:12 }}>{error}</div>}
        {success && <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"9px 12px", color:"#2563eb", fontSize:12, marginBottom:12 }}>{success}</div>}

        {[
          { key:"name", label:"Nombre", val:nameVal, setVal:setNameVal, display:rawUser.name||"Sin nombre", save:saveName, placeholder:"Tu nombre completo" },
          { key:"phone", label:"Teléfono", val:phoneVal, setVal:(v)=>setPhoneVal(v.replace(/\D/g,"")), display:rawUser.phone||"Sin teléfono", save:savePhone, placeholder:"1134567890", maxLength:11 },
        ].map(({ key, label, val, setVal, display, save, placeholder, maxLength }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <label style={labelStyle}>{label}</label>
            {editing === key ? (
              <div>
                <input value={val} onChange={e => setVal(e.target.value)} style={inputStyle} placeholder={placeholder} maxLength={maxLength} />
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={save} style={{ flex:1, padding:"9px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Guardar</button>
                  <button onClick={cancelEdit} style={{ padding:"9px 14px", background:"#f3f4f6", border:"none", borderRadius:8, fontSize:13, color:"#374151", cursor:"pointer" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={fieldBox}>
                <span style={{ fontSize:14, color:"#111827" }}>{display}</span>
                <button onClick={() => startEdit(key)} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cambiar</button>
              </div>
            )}
          </div>
        ))}

        <div style={{ marginBottom:24 }}>
          <label style={labelStyle}>Email</label>
          {editing === "email" ? (
            <div>
              <input value={emailVal} onChange={e => setEmailVal(e.target.value)} style={inputStyle} placeholder="nuevo@email.com" />
              {!codeSent ? (
                <button onClick={sendEmailCode} style={{ width:"100%", padding:"9px", background:"#111827", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:6 }}>Verificar nuevo email</button>
              ) : (
                <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6} style={{ flex:1, padding:"9px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none" }} />
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

        <button onClick={onClose} style={{ width:"100%", padding:"11px", background:"#f3f4f6", color:"#374151", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cerrar</button>
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

  const navLinks = [
    ["/publish", "Publicar"],
    ["/my-bookings", "Mis reservas"],
    ["/chat", "Mensajes"],
    ["/dashboard", "Mi panel"],
  ];

  if (isMobile) return (
    <>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 20px", height:56,
        background:"rgba(10,15,30,.97)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,.07)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <Link to="/" style={{ fontWeight:800, fontSize:17, letterSpacing:"-0.5px", textDecoration:"none" }}>
          <span style={{ color:"#fff" }}>Free</span><span style={{ color:"#2563eb" }}>wheel</span>
        </Link>
        <button onClick={() => setMenuOpen(o => !o)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:6, display:"flex", flexDirection:"column", gap:4.5 }}>
          <span style={{ display:"block", width:20, height:1.5, background:"#fff", borderRadius:2, transition:"all .2s", transform: menuOpen ? "rotate(45deg) translate(4px,4px)" : "none" }}/>
          <span style={{ display:"block", width:20, height:1.5, background:"#fff", borderRadius:2, transition:"all .2s", opacity: menuOpen ? 0 : 1 }}/>
          <span style={{ display:"block", width:20, height:1.5, background:"#fff", borderRadius:2, transition:"all .2s", transform: menuOpen ? "rotate(-45deg) translate(4px,-4px)" : "none" }}/>
        </button>
      </nav>

      {menuOpen && (
        <div style={{ position:"fixed", top:56, left:0, right:0, background:"#0a0f1e", borderBottom:"1px solid rgba(255,255,255,.07)", zIndex:99, padding:"8px 0 16px", boxShadow:"0 16px 40px rgba(0,0,0,.4)" }}>
          {user ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", marginBottom:4 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff", flexShrink:0 }}>
                  {userInitial(user)}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{user.name || user.email}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{user.email}</div>
                </div>
              </div>
              {navLinks.map(([to, label]) => (
                <Link key={to} to={to} onClick={close}
                  style={{ display:"block", padding:"12px 20px", fontSize:14, color:"rgba(255,255,255,.75)", textDecoration:"none", fontWeight:500 }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.04)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  {label}
                </Link>
              ))}
              <div onClick={() => { setProfileOpen(true); close(); }}
                style={{ display:"block", padding:"12px 20px", fontSize:14, color:"rgba(255,255,255,.75)", fontWeight:500, cursor:"pointer" }}>
                Mi perfil
              </div>
              <div style={{ padding:"12px 20px" }}>
                <button onClick={handleLogout} style={{ width:"100%", padding:"10px", background:"rgba(220,38,38,.15)", border:"1px solid rgba(220,38,38,.3)", color:"#f87171", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  Salir
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding:"12px 20px", display:"flex", flexDirection:"column", gap:8 }}>
              <Link to="/login" onClick={close}>
                <button style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid rgba(255,255,255,.2)", color:"#fff", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Iniciar sesión</button>
              </Link>
              <Link to="/register" onClick={close}>
                <button style={{ width:"100%", padding:"11px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Registrarse</button>
              </Link>
            </div>
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
        padding:"0 48px", height:58,
        background:"rgba(10,15,30,.95)",
        backdropFilter:"blur(16px)",
        borderBottom:"1px solid rgba(255,255,255,.06)",
        position:"sticky", top:0, zIndex:100,
      }}>
        {/* Logo */}
        <Link to="/" style={{ fontWeight:800, fontSize:18, letterSpacing:"-0.5px", textDecoration:"none", flexShrink:0 }}>
          <span style={{ color:"#fff" }}>Free</span><span style={{ color:"#2563eb" }}>wheel</span>
        </Link>

        {/* Centro — links de navegación */}
        {user && user.role !== "ADMIN" && (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {navLinks.map(([to, label]) => (
              <Link key={to} to={to} style={{ padding:"6px 14px", borderRadius:8, fontSize:13, fontWeight:500, color:"rgba(255,255,255,.65)", textDecoration:"none", transition:"all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color="#fff"; e.currentTarget.style.background="rgba(255,255,255,.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.color="rgba(255,255,255,.65)"; e.currentTarget.style.background="transparent"; }}>
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Derecha — avatar / botones */}
        <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
          {user ? (
            user.role === "ADMIN" ? (
              <>
                <Link to="/admin" style={{ background:"rgba(220,38,38,.15)", color:"#f87171", padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:700, textDecoration:"none", border:"1px solid rgba(220,38,38,.3)" }}>
                  Panel Admin
                </Link>
                <button onClick={() => { logout(); navigate("/"); }}
                  style={{ padding:"7px 16px", background:"transparent", border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                  Salir
                </button>
              </>
            ) : (
              <div style={{ position:"relative" }} ref={dropdownRef}>
                {/* Avatar */}
                <div onClick={() => setDropdownOpen(o => !o)} style={{
                  width:34, height:34, borderRadius:"50%",
                  background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer",
                  outline: dropdownOpen ? "2px solid rgba(37,99,235,.6)" : "2px solid transparent",
                  outlineOffset:2, transition:"outline .15s",
                }}>
                  {userInitial(user)}
                </div>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position:"absolute", top:44, right:0,
                    background:"#0d1525",
                    borderRadius:12, minWidth:210,
                    boxShadow:"0 16px 48px rgba(0,0,0,.5)",
                    border:"1px solid rgba(255,255,255,.08)",
                    zIndex:200, overflow:"hidden",
                  }}>
                    {/* User info */}
                    <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>
                          {userInitial(user)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name || user.email}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:1 }}>{user.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ padding:"6px 0" }}>
                      <div onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}
                        style={{ padding:"9px 16px", fontSize:13, color:"rgba(255,255,255,.7)", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:10 }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.05)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                        Ver perfil
                      </div>
                      <div onClick={() => { navigate("/dashboard"); setDropdownOpen(false); }}
                        style={{ padding:"9px 16px", fontSize:13, color:"rgba(255,255,255,.7)", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:10 }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.05)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
                        Mi panel
                      </div>
                      <div style={{ height:1, background:"rgba(255,255,255,.06)", margin:"4px 0" }}/>
                      <div onClick={handleLogout}
                        style={{ padding:"9px 16px", fontSize:13, color:"#f87171", cursor:"pointer", fontWeight:500, display:"flex", alignItems:"center", gap:10 }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(220,38,38,.08)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        Salir
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <>
              <Link to="/login">
                <button style={{ padding:"7px 16px", background:"transparent", border:"1px solid rgba(255,255,255,.18)", color:"rgba(255,255,255,.8)", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(255,255,255,.4)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,.18)"}>
                  Iniciar sesión
                </button>
              </Link>
              <Link to="/register">
                <button style={{ padding:"7px 16px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
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