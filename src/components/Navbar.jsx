import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const Logo = () => (
  <Link to="/" style={{ display:"flex", alignItems:"center",
    gap:10, textDecoration:"none" }}>
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" stroke="#1a4d2e" strokeWidth="2.5" fill="none"/>
      <circle cx="18" cy="18" r="5.5" fill="#1a4d2e"/>
      <circle cx="18" cy="18" r="2.5" fill="#fff"/>
      {[0,45,90,135,180,225,270,315].map((angle, i) => {
        const rad = angle * Math.PI / 180;
        const x1 = 18 + 7 * Math.cos(rad);
        const y1 = 18 + 7 * Math.sin(rad);
        const x2 = 18 + 14 * Math.cos(rad);
        const y2 = 18 + 14 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#1a4d2e" strokeWidth="1.8" strokeLinecap="round"/>;
      })}
    </svg>
    <span style={{ fontWeight:800, fontSize:20, color:"#1a4d2e",
      letterSpacing:"-0.5px" }}>Freewheel</span>
  </Link>
);

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
    fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer" },
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

  const close = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    close();
  };

  if (isMobile) return (
    <>
      <nav style={styles.navMobile}>
        <Logo />
        <button style={styles.hamburger} onClick={() => setMenuOpen(o => !o)}>
          <span style={{ display:"block", width:22, height:2,
            background:"#374151", borderRadius:2, transition:"all .2s",
            transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
          <span style={{ display:"block", width:22, height:2,
            background:"#374151", borderRadius:2, transition:"all .2s",
            opacity: menuOpen ? 0 : 1 }}/>
          <span style={{ display:"block", width:22, height:2,
            background:"#374151", borderRadius:2, transition:"all .2s",
            transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
        </button>
      </nav>

      {menuOpen && (
        <div style={styles.menuOverlay}>
          <Link to="/" style={styles.linkMobile} onClick={close}>Explorar</Link>
          {user ? (
            user.role === "admin" ? (
              <>
                <Link to="/admin" style={styles.linkMobile} onClick={close}>
                  Panel Admin
                </Link>
                <button style={{...styles.btnMobile, background:"#dc2626",
                  color:"#fff"}} onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/publish" style={styles.linkMobile} onClick={close}>
                  Publicar auto
                </Link>
                <Link to="/my-bookings" style={styles.linkMobile} onClick={close}>
                  Mis reservas
                </Link>
                <Link to="/chat" style={styles.linkMobile} onClick={close}>
                  Mensajes
                </Link>
                <Link to="/dashboard" style={styles.linkMobile} onClick={close}>
                  Mi panel
                </Link>
                <button style={{...styles.btnMobile, background:"#1a4d2e",
                  color:"#fff"}} onClick={handleLogout}>Salir</button>
              </>
            )
          ) : (
            <>
              <Link to="/login" onClick={close}>
                <button style={{...styles.btnMobile,
                  background:"transparent", border:"1.5px solid #d1d5db",
                  color:"#374151"}}>Iniciar sesión</button>
              </Link>
              <Link to="/register" onClick={close}>
                <button style={{...styles.btnMobile,
                  background:"#1a4d2e", color:"#fff"}}>Registrarse</button>
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );

  return (
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
              <div style={styles.avatar} onClick={() => navigate("/dashboard")}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <button style={{...styles.btn,...styles.btnOutline}}
                onClick={() => { logout(); navigate("/"); }}>Salir</button>
            </>
          )
        ) : (
          <>
            <Link to="/login">
              <button style={{...styles.btn,...styles.btnOutline}}>
                Iniciar sesión
              </button>
            </Link>
            <Link to="/register">
              <button style={{...styles.btn,...styles.btnPrimary}}>
                Registrarse
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}