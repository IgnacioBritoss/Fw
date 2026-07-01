import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { getMyConversations } from "../services/api";

const NAV = [
  { group: "Navegación", items: [
    { label: "Inicio", path: "/" },
    { label: "Buscar autos", path: "/buscar" },
    { label: "Mis reservas", path: "/my-bookings" },
    { label: "Favoritos", path: "/favoritos" },
  ]},
  { group: "Para dueños", items: [
    { label: "Mis autos", path: "/dashboard" },
    { label: "Publicar auto", path: "/publish" },
  ]},
];

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px" }}>
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="#2563eb" strokeWidth="2" />
      <circle cx="16" cy="16" r="4" fill="#2563eb" />
    </svg>
    <span style={{ fontWeight: 800, fontSize: 17, color: "#111827" }}>Freewheel</span>
  </div>
);

// Ícono de mensajes (burbuja de chat) — profesional, sin emoji
const MessageIcon = ({ size = 18, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    let active = true;
    const check = () => {
      getMyConversations()
        .then(data => {
          const convs = Array.isArray(data) ? data : (data?.data ?? []);
          const unread = convs.some(c => {
            const last = c.messages?.[0];
            return last && last.senderId !== user.id && !last.readAt;
          });
          if (active) setHasUnread(unread);
        })
        .catch(() => {});
    };
    check();
    const iv = setInterval(check, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [user]);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Invitado";
  const initials = `${(user?.firstName || user?.name || "U")[0] || "U"}`.toUpperCase();

  const isActive = (item) => item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

  const go = (path) => { navigate(path); setDrawerOpen(false); };
  const isAdmin = user?.role === "ADMIN";

  const t = {
    navGroup: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 12px 8px" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 2, background: active ? "#111827" : "transparent", color: active ? "#fff" : "#374151", transition: "background .15s" }),
    navDot: (active) => ({ width: 18, height: 18, borderRadius: 5, background: active ? "#fff" : "#d1d5db", flexShrink: 0 }),
    iconBtn: { width: 40, height: 40, borderRadius: 10, background: "#f3f4f6", border: "1px solid #ececec", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", transition: "background .15s, border-color .15s" },
  };

  const SidebarInner = () => (
    <>
      <Logo />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map((g, gi) => (
          <div key={gi}>
            <div style={t.navGroup}>{g.group}</div>
            {g.items.map((it, ii) => (
              <div key={ii} style={t.navItem(isActive(it))} onClick={() => go(it.path)}>
                <span style={t.navDot(isActive(it))} />{it.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ background: "#111827", borderRadius: 14, padding: 16, color: "#fff", marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Ganá con tu auto</div>
        <div style={{ fontSize: 12, opacity: .7, lineHeight: 1.5, marginBottom: 12 }}>Publicá tu vehículo y empezá a generar ingresos este mes.</div>
        <button style={{ background: "#fff", color: "#111827", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => go("/publish")}>Publicar →</button>
      </div>

      {isAdmin && (
        <button onClick={() => go("/admin")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 12, padding: "11px", background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#ddd6fe"}
          onMouseLeave={e => e.currentTarget.style.background = "#ede9fe"}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Panel Admin
        </button>
      )}

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <div onClick={() => go("/profile")} style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer", flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => go("/profile")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{firstName}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Ver perfil</div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} title="Salir"
            style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
    </>
  );

  const TopbarRight = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {user ? (
        /* Mensajes (con puntito azul si hay no leídos) */
        <div style={t.iconBtn} onClick={() => navigate("/chat")} title="Mensajes"
          onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#ececec"; }}>
          <MessageIcon />
          {hasUnread && (
            <span style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: "50%", background: "#2563eb", border: "2px solid #fff" }} />
          )}
        </div>
      ) : (
        /* Sin cuenta: registrarse / iniciar sesión */
        <>
          <button onClick={() => navigate("/login")} style={{ padding: "8px 16px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Iniciar sesión</button>
          <button onClick={() => navigate("/register")} style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Registrarse</button>
        </>
      )}
    </div>
  );

  // ───────────── MOBILE ─────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #ececec", position: "sticky", top: 0, zIndex: 50 }}>
          <button onClick={() => setDrawerOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ width: 20, height: 2, background: "#111827", borderRadius: 2 }} />
            <span style={{ width: 20, height: 2, background: "#111827", borderRadius: 2 }} />
            <span style={{ width: 20, height: 2, background: "#111827", borderRadius: 2 }} />
          </button>
          <Logo />
          <TopbarRight />
        </header>
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setDrawerOpen(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)" }} />
            <aside onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 248, background: "#fff", padding: "24px 16px", display: "flex", flexDirection: "column", boxShadow: "0 0 40px rgba(0,0,0,.2)" }}>
              <SidebarInner />
            </aside>
          </div>
        )}
        <main>{children}</main>
      </div>
    );
  }

  // ───────────── DESKTOP ─────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex" }}>
      <aside style={{ width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #ececec", padding: "24px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <SidebarInner />
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 32px", background: "#fff", borderBottom: "1px solid #ececec", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ flex: 1 }} />
          <TopbarRight />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
