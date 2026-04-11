import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const styles = {
  nav: { display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 32px", borderBottom:"1px solid #e5e7eb",
    background:"#fff", position:"sticky", top:0, zIndex:100 },
  logo: { fontWeight:700, fontSize:20, color:"#1d4ed8", textDecoration:"none" },
  links: { display:"flex", gap:20, alignItems:"center" },
  link: { color:"#374151", textDecoration:"none", fontSize:14 },
  btn: { padding:"8px 18px", borderRadius:8, fontSize:14, cursor:"pointer",
    fontWeight:500, border:"none" },
  btnPrimary: { background:"#1d4ed8", color:"#fff" },
  btnOutline: { background:"transparent", border:"1px solid #d1d5db", color:"#374151" },
  avatar: { width:34, height:34, borderRadius:"50%", background:"#dbeafe",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontWeight:600, fontSize:13, color:"#1d4ed8", cursor:"pointer" },
  adminBadge: { background:"#fef2f2", color:"#dc2626", padding:"4px 12px",
    borderRadius:20, fontSize:12, fontWeight:700, textDecoration:"none" },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>🚗 Freewheel</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Explorar</Link>
        {user ? (
          <>
            {user.role === "admin" ? (
              <>
                <Link to="/admin" style={styles.adminBadge}>
                  🔧 Panel Admin
                </Link>
                <div style={styles.avatar} title={user.name}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <button style={{...styles.btn,...styles.btnOutline}}
                  onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/publish" style={styles.link}>Publicar auto</Link>
                <Link to="/chat" style={styles.link}>Mensajes</Link>
                <Link to="/dashboard" style={styles.link}>Mi panel</Link>
                <div style={styles.avatar} title={user.name}
                  onClick={() => navigate("/dashboard")}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <button style={{...styles.btn,...styles.btnOutline}}
                  onClick={handleLogout}>Salir</button>
              </>
            )}
          </>
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
  );
}