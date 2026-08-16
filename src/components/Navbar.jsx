// ============================================================================
//  Navbar — Barra superior con el botón "Volver" y el menú de perfil
// ----------------------------------------------------------------------------
//  Muestra a la izquierda un botón para volver atrás y a la derecha, según el
//  usuario esté logueado o no, el menú desplegable del perfil (Ver perfil /
//  Salir) o los botones de Iniciar sesión / Registrarse.
// ============================================================================
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Devuelve la inicial del usuario (para el círculo del avatar). Ej: "Ana" → "A".
const userInitial = (u) => (u?.name?.[0] || u?.email?.[0] || "?").toUpperCase();

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false); // ¿menú de perfil abierto?
  const dropdownRef = useRef(null); // referencia al menú, para detectar clics afuera

  // Cierra el menú desplegable si el usuario hace clic fuera de él.
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cierra sesión, vuelve al inicio y cierra el menú.
  const handleLogout = () => { logout(); navigate("/"); setDropdownOpen(false); };

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: 58,
      background: "rgba(10,15,30,.95)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,.06)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Volver atrás */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
          color: "rgba(255,255,255,.85)", borderRadius: 10, padding: "8px 16px",
          fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </button>

      {/* Perfil */}
      {user ? (
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            onClick={() => setDropdownOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg,#0f6ce6,#0b55c0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#fff",
              outline: dropdownOpen ? "2px solid rgba(37,99,235,.6)" : "2px solid transparent",
              outlineOffset: 2, transition: "outline .15s",
            }}>
              {userInitial(user)}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>Mi perfil</span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: "absolute", top: 46, right: 0,
              background: "#0d1525", borderRadius: 12, minWidth: 200,
              boxShadow: "0 16px 48px rgba(0,0,0,.5)", border: "1px solid rgba(255,255,255,.08)",
              zIndex: 200, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || user.email}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{user.email}</div>
              </div>
              <div style={{ padding: "6px 0" }}>
                <div onClick={() => { navigate("/profile"); setDropdownOpen(false); }}
                  style={{ padding: "10px 16px", fontSize: 13, color: "rgba(255,255,255,.7)", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></svg>
                  Ver perfil
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "4px 0" }} />
                <div onClick={handleLogout}
                  style={{ padding: "10px 16px", fontSize: 13, color: "#f87171", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Salir
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/login">
            <button style={{ padding: "7px 16px", background: "transparent", border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.8)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Iniciar sesión</button>
          </Link>
          <Link to="/register">
            <button style={{ padding: "7px 16px", background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Registrarse</button>
          </Link>
        </div>
      )}
    </nav>
  );
}
