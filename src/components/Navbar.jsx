import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const Logo = () => (
  <Link to="/" style={{ display:"flex", alignItems:"center",
    gap:10, textDecoration:"none" }}>
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="16" stroke="#1a4d2e" strokeWidth="2.5" fill="none"/>
      <circle cx="18" cy="18" r="5.5" fill="#1a4d2e"/>
      <circle cx="18" cy="18" r="2.5" fill="#fff"/>
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const rad = angle * Math.PI / 180;
        return <line key={i}
          x1={18 + 7*Math.cos(rad)} y1={18 + 7*Math.sin(rad)}
          x2={18 + 14*Math.cos(rad)} y2={18 + 14*Math.sin(rad)}
          stroke="#1a4d2e" strokeWidth="1.8" strokeLinecap="round"/>;
      })}
    </svg>
    <span style={{ fontWeight:800, fontSize:20, color:"#1a4d2e",
      letterSpacing:"-0.5px" }}>Freewheel</span>
  </Link>
);

function ProfileModal({ user, onClose }) {
  const rawUser = JSON.parse(localStorage.getItem("fw_user") || "{}");
  const [email, setEmail] = useState(rawUser.email || "");
  const [phone, setPhone] = useState(rawUser.phone || "");
  const [editing, setEditing] = useState(null); // "email" | "phone" | null
  const [code, setCode] = useState("");
  const [sentCode] = useState("1234"); // simulado
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleEdit = (field) => {
    setEditing(field);
    setCode("");
    setCodeSent(false);
    setVerified(false);
    setError("");
    setSuccess("");
  };

  const handleSendCode = () => {
    setCodeSent(true);
    setError("");
    setSuccess(`Código enviado (simulado). Usá: 1234`);
  };

  const handleVerify = () => {
    if (code === sentCode) {
      const updated = { ...rawUser,
        email: editing === "email" ? email : rawUser.email,
        phone: editing === "phone" ? phone : rawUser.phone,
      };
      localStorage.setItem("fw_user", JSON.stringify(updated));
      setVerified(true);
      setSuccess("Dato actualizado correctamente.");
      setEditing(null);
      setCodeSent(false);
    } else {
      setError("Código incorrecto. Intentá con 1234.");
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:28,
        width:"90%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,.15)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#111827" }}>
              Mi perfil
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>
              {rawUser.role === "owner" ? "Dueño" : "Conductor"} · DNI {rawUser.dni}
            </div>
          </div>
          <div style={{ width:44, height:44, borderRadius:"50%",
            background:"#1a4d2e", display:"flex", alignItems:"center",
            justifyContent:"center", fontWeight:800, fontSize:18, color:"#fff" }}>
            {rawUser.name?.[0]?.toUpperCase()}
          </div>
        </div>

        {/* Nombre (solo lectura) */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
            Nombre
          </div>
          <div style={{ fontSize:14, color:"#111827", fontWeight:600,
            padding:"10px 14px", background:"#f9fafb", borderRadius:8,
            border:"1.5px solid #f3f4f6" }}>
            {rawUser.name}
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
            Email
          </div>
          {editing === "email" ? (
            <div>
              <input value={email} onChange={e => setEmail(e.target.value)}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8,
                  border:"1.5px solid #1a4d2e", fontSize:14, outline:"none",
                  color:"#111827", marginBottom:8 }} />
              {!codeSent ? (
                <button onClick={handleSendCode}
                  style={{ width:"100%", padding:"9px", background:"#111827",
                    color:"#fff", border:"none", borderRadius:8, fontSize:13,
                    fontWeight:600, cursor:"pointer" }}>
                  Enviar código de verificación
                </button>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <input value={code} onChange={e => setCode(e.target.value)}
                    placeholder="Código de 4 dígitos"
                    style={{ flex:1, padding:"9px 12px", borderRadius:8,
                      border:"1.5px solid #e5e7eb", fontSize:14, outline:"none" }} />
                  <button onClick={handleVerify}
                    style={{ padding:"9px 16px", background:"#1a4d2e",
                      color:"#fff", border:"none", borderRadius:8, fontSize:13,
                      fontWeight:600, cursor:"pointer" }}>
                    Verificar
                  </button>
                </div>
              )}
              <button onClick={() => setEditing(null)}
                style={{ marginTop:6, background:"none", border:"none",
                  color:"#9ca3af", fontSize:12, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"10px 14px",
              background:"#f9fafb", borderRadius:8, border:"1.5px solid #f3f4f6" }}>
              <span style={{ fontSize:14, color:"#111827" }}>{rawUser.email}</span>
              <button onClick={() => handleEdit("email")}
                style={{ background:"none", border:"none", color:"#1a4d2e",
                  fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Teléfono */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af",
            textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
            Teléfono
          </div>
          {editing === "phone" ? (
            <div>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))}
                maxLength={11} placeholder="1134567890"
                style={{ width:"100%", padding:"10px 14px", borderRadius:8,
                  border:"1.5px solid #1a4d2e", fontSize:14, outline:"none",
                  color:"#111827", marginBottom:8 }} />
              {!codeSent ? (
                <button onClick={handleSendCode}
                  style={{ width:"100%", padding:"9px", background:"#111827",
                    color:"#fff", border:"none", borderRadius:8, fontSize:13,
                    fontWeight:600, cursor:"pointer" }}>
                  Enviar código de verificación
                </button>
              ) : (
                <div style={{ display:"flex", gap:8 }}>
                  <input value={code} onChange={e => setCode(e.target.value)}
                    placeholder="Código de 4 dígitos"
                    style={{ flex:1, padding:"9px 12px", borderRadius:8,
                      border:"1.5px solid #e5e7eb", fontSize:14, outline:"none" }} />
                  <button onClick={handleVerify}
                    style={{ padding:"9px 16px", background:"#1a4d2e",
                      color:"#fff", border:"none", borderRadius:8, fontSize:13,
                      fontWeight:600, cursor:"pointer" }}>
                    Verificar
                  </button>
                </div>
              )}
              <button onClick={() => setEditing(null)}
                style={{ marginTop:6, background:"none", border:"none",
                  color:"#9ca3af", fontSize:12, cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"10px 14px",
              background:"#f9fafb", borderRadius:8, border:"1.5px solid #f3f4f6" }}>
              <span style={{ fontSize:14, color:"#111827" }}>{rawUser.phone}</span>
              <button onClick={() => handleEdit("phone")}
                style={{ background:"none", border:"none", color:"#1a4d2e",
                  fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Cambiar
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca",
            borderRadius:8, padding:"8px 12px", color:"#b91c1c",
            fontSize:12, marginBottom:10 }}>{error}</div>
        )}
        {success && (
          <div style={{ background:"#f0f7f2", border:"1.5px solid #bbf7d0",
            borderRadius:8, padding:"8px 12px", color:"#1a4d2e",
            fontSize:12, marginBottom:10 }}>{success}</div>
        )}

        <button onClick={onClose}
          style={{ width:"100%", padding:"11px", background:"#f3f4f6",
            color:"#374151", border:"none", borderRadius:10, fontSize:14,
            fontWeight:600, cursor:"pointer", marginTop:4 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

const styles = {
  nav: { display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 40px", borderBottom:"1px solid #e5e7eb", background:"#fff",
    position:"sticky", top:0, zIndex:100,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  navMobile: { display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 20px", borderBottom:"1px solid #e5e7eb", background:"#fff",
    position:"sticky", top:0, zIndex:100,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  links: { display:"flex", gap:24, alignItems:"center" },
  link: { color:"#374151", textDecoration:"none", fontSize:14, fontWeight:500 },
  linkMobile: { color:"#374151", textDecoration:"none", fontSize:15,
    fontWeight:500, padding:"14px 0", borderBottom:"1px solid #f3f4f6",
    display:"block" },
  btn: { padding:"9px 20px", borderRadius:8, fontSize:14,
    cursor:"pointer", fontWeight:600, border:"none" },
  btnPrimary: { background:"#1a4d2e", color:"#fff" },
  btnOutline: { background:"transparent", border:"1.5px solid #d1d5db",
    color:"#374151" },
  btnMobile: { width:"100%", padding:"13px", borderRadius:8, fontSize:15,
    cursor:"pointer", fontWeight:600, border:"none", marginTop:8 },
  avatar: { width:36, height:36, borderRadius:"50%", background:"#1a4d2e",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer",
    position:"relative" },
  adminBadge: { background:"#fef2f2", color:"#dc2626", padding:"6px 14px",
    borderRadius:20, fontSize:13, fontWeight:700, textDecoration:"none",
    border:"1.5px solid #fecaca" },
  hamburger: { background:"none", border:"none", cursor:"pointer",
    padding:4, display:"flex", flexDirection:"column",
    gap:5, alignItems:"center" },
  menuOverlay: { position:"fixed", top:62, left:0, right:0,
    background:"#fff", borderBottom:"1px solid #e5e7eb",
    zIndex:99, padding:"8px 24px 20px",
    boxShadow:"0 8px 24px rgba(0,0,0,.1)" },
};

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
    logout();
    navigate("/");
    close();
    setDropdownOpen(false);
  };

  if (isMobile) return (
    <>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      <nav style={styles.navMobile}>
        <Logo />
        <button style={styles.hamburger} onClick={() => setMenuOpen(o => !o)}>
          <span style={{ display:"block", width:22, height:2, background:"#374151",
            borderRadius:2, transition:"all .2s",
            transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
          <span style={{ display:"block", width:22, height:2, background:"#374151",
            borderRadius:2, transition:"all .2s", opacity: menuOpen ? 0 : 1 }}/>
          <span style={{ display:"block", width:22, height:2, background:"#374151",
            borderRadius:2, transition:"all .2s",
            transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
        </button>
      </nav>

      {menuOpen && (
        <div style={styles.menuOverlay}>
          <Link to="/" style={styles.linkMobile} onClick={close}>Explorar</Link>
          {user ? (
            user.role === "admin" ? (
              <>
                <Link to="/admin" style={styles.linkMobile} onClick={close}>Panel Admin</Link>
                <button style={{...styles.btnMobile, background:"#dc2626", color:"#fff"}}
                  onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/publish" style={styles.linkMobile} onClick={close}>Publicar auto</Link>
                <Link to="/my-bookings" style={styles.linkMobile} onClick={close}>Mis reservas</Link>
                <Link to="/chat" style={styles.linkMobile} onClick={close}>Mensajes</Link>
                <Link to="/dashboard" style={styles.linkMobile} onClick={close}>Mi panel</Link>
                <div style={{ padding:"14px 0", borderBottom:"1px solid #f3f4f6",
                  fontSize:15, fontWeight:500, color:"#374151", cursor:"pointer" }}
                  onClick={() => { setProfileOpen(true); close(); }}>
                  Mi perfil
                </div>
                <button style={{...styles.btnMobile, background:"#1a4d2e", color:"#fff"}}
                  onClick={handleLogout}>Salir</button>
              </>
            )
          ) : (
            <>
              <Link to="/login" onClick={close}>
                <button style={{...styles.btnMobile, background:"transparent",
                  border:"1.5px solid #d1d5db", color:"#374151"}}>Iniciar sesión</button>
              </Link>
              <Link to="/register" onClick={close}>
                <button style={{...styles.btnMobile, background:"#1a4d2e",
                  color:"#fff"}}>Registrarse</button>
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      <nav style={styles.nav}>
        <Logo />
        <div style={styles.links}>
          <Link to="/" style={styles.link}>Explorar</Link>
          {user ? (
            user.role === "admin" ? (
              <>
                <Link to="/admin" style={styles.adminBadge}>Panel Admin</Link>
                <div style={styles.avatar}>{user.name?.[0]?.toUpperCase()}</div>
                <button style={{...styles.btn,...styles.btnOutline}}
                  onClick={() => { logout(); navigate("/"); }}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/publish" style={styles.link}>Publicar auto</Link>
                <Link to="/my-bookings" style={styles.link}>Mis reservas</Link>
                <Link to="/chat" style={styles.link}>Mensajes</Link>
                <Link to="/dashboard" style={styles.link}>Mi panel</Link>

                {/* Avatar con dropdown */}
                <div style={{ position:"relative" }} ref={dropdownRef}>
                  <div style={styles.avatar}
                    onClick={() => setDropdownOpen(o => !o)}>
                    {user.name?.[0]?.toUpperCase()}
                  </div>

                  {dropdownOpen && (
                    <div style={{ position:"absolute", top:44, right:0,
                      background:"#fff", borderRadius:12, minWidth:180,
                      boxShadow:"0 8px 32px rgba(0,0,0,.12)",
                      border:"1px solid #f3f4f6", zIndex:200, overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>
                          {user.email}
                        </div>
                      </div>
                      <div style={{ padding:"6px 0" }}>
                        <div
                          onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}
                          style={{ padding:"10px 16px", fontSize:13, color:"#374151",
                            cursor:"pointer", fontWeight:500,
                            display:"flex", alignItems:"center", gap:8 }}
                          onMouseEnter={e => e.currentTarget.style.background="#f9fafb"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                              stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="7" r="4" stroke="#374151" strokeWidth="2"/>
                          </svg>
                          Ver perfil
                        </div>
                        <div
                          onClick={() => { navigate("/dashboard"); setDropdownOpen(false); }}
                          style={{ padding:"10px 16px", fontSize:13, color:"#374151",
                            cursor:"pointer", fontWeight:500,
                            display:"flex", alignItems:"center", gap:8 }}
                          onMouseEnter={e => e.currentTarget.style.background="#f9fafb"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1"
                              stroke="#374151" strokeWidth="2"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"
                              stroke="#374151" strokeWidth="2"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"
                              stroke="#374151" strokeWidth="2"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"
                              stroke="#374151" strokeWidth="2"/>
                          </svg>
                          Mi panel
                        </div>
                        <div style={{ height:1, background:"#f3f4f6", margin:"4px 0" }}/>
                        <div
                          onClick={handleLogout}
                          style={{ padding:"10px 16px", fontSize:13, color:"#dc2626",
                            cursor:"pointer", fontWeight:500,
                            display:"flex", alignItems:"center", gap:8 }}
                          onMouseEnter={e => e.currentTarget.style.background="#fef2f2"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                              stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="16 17 21 12 16 7"
                              stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="21" y1="12" x2="9" y2="12"
                              stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
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
                <button style={{...styles.btn,...styles.btnOutline}}>Iniciar sesión</button>
              </Link>
              <Link to="/register">
                <button style={{...styles.btn,...styles.btnPrimary}}>Registrarse</button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}