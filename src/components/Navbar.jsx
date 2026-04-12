import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  links: { display:"flex", gap:24, alignItems:"center" },
  link: { color:"#374151", textDecoration:"none", fontSize:14, fontWeight:500 },
  btn: { padding:"9px 20px", borderRadius:8, fontSize:14,
    cursor:"pointer", fontWeight:600, border:"none" },
  btnPrimary: { background:"#1a4d2e", color:"#fff" },
  btnOutline: { background:"transparent", border:"1.5px solid #d1d5db",
    color:"#374151" },
  avatar: { width:36, height:36, borderRadius:"50%", background:"#1a4d2e",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:700, fontSize:14, color:"#fff", cursor:"pointer" },
  adminBadge: { background:"#fef2f2", color:"#dc2626", padding:"6px 14px",
    borderRadius:20, fontSize:13, fontWeight:700, textDecoration:"none",
    border:"1.5px solid #fecaca" },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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