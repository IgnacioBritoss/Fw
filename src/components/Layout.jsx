// ============================================================================
//  Layout — Estructura visual común a casi todas las pantallas
// ----------------------------------------------------------------------------
//  Envuelve a cada página con:
//   - Sidebar (menú lateral): navegación, "Publicar auto", acceso admin, perfil.
//   - Topbar (barra superior): íconos de mensajes, notificaciones y ajustes,
//     cada uno con su "puntito" azul cuando hay algo sin leer.
//  Es responsive: en celular el menú se abre como un cajón (drawer) y en
//  escritorio queda fijo a la izquierda.
//
//  Prop: children = el contenido de la página que se está mostrando.
// ============================================================================
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { getMyConversations } from "../services/api";
import { hasUnreadNotifications } from "../services/notifications";
import BrandLogo from "./Logo";

// Iconos del menú. Son SVG, no emojis: un emoji se dibuja distinto en cada
// sistema y desentona con el resto de la interfaz.
const icon = (paths) => ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const HomeIcon = icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>);
const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
const CalendarIcon = icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>);
const HeartIcon = icon(<path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7c0 4.9-7 9.3-7 9.3z" />);
const CarIcon = icon(<><path d="M5 17h14M4 17v-4l2-5h12l2 5v4" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></>);
const PlusIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>);
const ShieldIcon = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);

// Estructura del menú lateral, agrupada por secciones. `adminOnly` hace que la
// opción se muestre únicamente a las cuentas administradoras.
const NAV = [
  { group: "Navegación", items: [
    { label: "Inicio", path: "/", Icon: HomeIcon },
    { label: "Buscar autos", path: "/buscar", Icon: SearchIcon },
    { label: "Mis reservas", path: "/my-bookings", Icon: CalendarIcon },
    { label: "Favoritos", path: "/favoritos", Icon: HeartIcon },
  ]},
  { group: "Para dueños", items: [
    { label: "Mis autos", path: "/dashboard", Icon: CarIcon },
    { label: "Publicar auto", path: "/publish", Icon: PlusIcon },
    // El panel de administración es una opción más del menú, debajo de
    // "Publicar auto", y solo aparece si la cuenta es admin.
    { label: "Panel Admin", path: "/admin", Icon: ShieldIcon, adminOnly: true },
  ]},
];

// La marca vive en components/Logo.jsx. Estaba copiada acá y en tres pantallas
// más, así que arreglarla en un lado no la arreglaba en los otros.
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", padding: "0 12px 8px" }}>
    <BrandLogo size={17} />
  </div>
);

// Ícono de mensajes (burbuja de chat) — profesional, sin emoji
const MessageIcon = ({ size = 18, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Ícono de notificaciones (campana) — profesional, sin emoji
const BellIcon = ({ size = 18, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Ícono de ajustes (engranaje) — profesional, sin emoji
const GearIcon = ({ size = 18, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);       // menú lateral abierto (celular)
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);         // ¿hay mensajes sin leer?
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false); // ¿hay notificaciones sin leer?

  // Revisa cada 20 segundos si hay mensajes/notificaciones sin leer, para
  // mostrar los "puntitos" azules en los íconos de la barra superior.
  useEffect(() => {
    if (!user) { setHasUnread(false); setHasUnreadNotif(false); return; }
    let active = true; // evita actualizar estado si el componente ya se desmontó
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
      hasUnreadNotifications(user.id).then(v => { if (active) setHasUnreadNotif(v); });
    };
    check();
    const iv = setInterval(check, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [user, location.pathname]);

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Invitado";
  const initials = `${(user?.firstName || user?.name || "U")[0] || "U"}`.toUpperCase();

  // Indica si un ítem del menú corresponde a la página actual (para resaltarlo).
  const isActive = (item) => item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

  // Navega a una ruta y cierra el menú lateral (útil en celular).
  const go = (path) => { navigate(path); setDrawerOpen(false); };
  const isAdmin = user?.role === "ADMIN"; // ¿el usuario es administrador?

  const t = {
    navGroup: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 12px 8px" },
    navItem: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 2, background: active ? "#111827" : "transparent", color: active ? "#fff" : "#374151", transition: "background .15s" }),
    navIcon: (active) => ({ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flexShrink: 0, color: active ? "#fff" : "#6b7280" }),
    iconBtn: { width: 40, height: 40, borderRadius: 10, background: "#f3f4f6", border: "1px solid #ececec", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", transition: "background .15s, border-color .15s" },
  };

  // Contenido del menú lateral: logo, links de navegación, tarjeta "Publicar",
  // botón de admin (si corresponde) y bloque de perfil con botón de salir.
  const sidebarInner = () => (
    <>
      <Logo />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map((g, gi) => (
          <div key={gi}>
            <div style={t.navGroup}>{g.group}</div>
            {g.items.filter(it => !it.adminOnly || isAdmin).map((it, ii) => (
              <div key={ii} style={t.navItem(isActive(it))} onClick={() => go(it.path)}>
                <span style={t.navIcon(isActive(it))}><it.Icon /></span>
                <span style={{ flex: 1 }}>{it.label}</span>
                {/* Cantidad de favoritos guardados, al lado del ítem. */}
                {it.path === "/favoritos" && favoritesCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 7px", background: isActive(it) ? "rgba(255,255,255,.22)" : "#eff6ff", color: isActive(it) ? "#fff" : "#2563eb" }}>
                    {favoritesCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Acá había una tarjeta negra "Ganá con tu auto" con un botón "Publicar".
          Se quitó: repetía la opción "Publicar auto" que está justo arriba en el
          menú, y el bloque oscuro se comía la mitad del panel. El acceso al
          panel de administración también estaba suelto acá abajo; ahora es una
          opción más del menú, que es donde se lo busca. */}

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

  // Parte derecha de la barra superior: íconos de mensajes/notificaciones/
  // ajustes si hay sesión, o botones de login/registro si no la hay.
  const topbarRight = () => (
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
      ) : null}
      {user && (
        /* Notificaciones */
        <div style={t.iconBtn} onClick={() => navigate("/notificaciones")} title="Notificaciones"
          onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#ececec"; }}>
          <BellIcon />
          {hasUnreadNotif && (
            <span style={{ position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: "50%", background: "#2563eb", border: "2px solid #fff" }} />
          )}
        </div>
      )}
      {user && (
        /* Ajustes */
        <div style={t.iconBtn} onClick={() => navigate("/ajustes")} title="Ajustes"
          onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#ececec"; }}>
          <GearIcon />
        </div>
      )}
      {!user && (
        /* Sin cuenta: registrarse / iniciar sesión */
        <>
          {/* En un teléfono de 390px, "Iniciar sesión" + "Registrarse" con 16px de
              padding cada uno no entran: uno se partía en dos renglones y el otro
              quedaba cortado contra el borde derecho. Textos cortos y sin envolver. */}
          <button onClick={() => navigate("/login")}
            style={{ padding: isMobile ? "9px 12px" : "8px 16px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {isMobile ? "Entrar" : "Iniciar sesión"}
          </button>
          <button onClick={() => navigate("/register")}
            style={{ padding: isMobile ? "9px 12px" : "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {isMobile ? "Crear cuenta" : "Registrarse"}
          </button>
        </>
      )}
    </div>
  );

  // ───────────── UN SOLO ÁRBOL PARA CELULAR Y ESCRITORIO ─────────────
  //
  // Antes había dos `return` distintos según isMobile. Eso parece inofensivo pero
  // rompía las pantallas con formularios: al cruzar los 768px de ancho —por
  // ejemplo al ABRIR LA CONSOLA del navegador, que angosta la ventana— React se
  // encontraba con un árbol de otra forma, daba por muerto el anterior y volvía a
  // montar la página desde cero. El formulario de publicar un auto volvía al
  // paso 1 y se perdía todo lo cargado.
  //
  // Ahora la estructura es siempre la misma y lo único que cambia son los
  // estilos, así que `children` nunca se desmonta y el estado de la página se
  // conserva al cambiar el tamaño de la ventana.
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex" }}>
      {/* Menú lateral: fijo en escritorio, cajón deslizable en celular */}
      <aside
        style={isMobile ? {
          position: "fixed", top: 0, left: 0, bottom: 0, width: 248, zIndex: 101,
          background: "#fff", padding: "24px 16px", display: "flex", flexDirection: "column",
          boxShadow: "0 0 40px rgba(0,0,0,.2)", overflowY: "auto",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .3s cubic-bezier(.32,.72,0,1)",
        } : {
          width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #ececec",
          padding: "24px 16px", display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
        }}
      >
        {sidebarInner()}
      </aside>

      {/* Fondo oscuro detrás del cajón. Se deja siempre montado y se le cambia la
          opacidad: si se monta y se desmonta, aparece y desaparece de golpe y el
          panel parece deslizarse sobre nada. `pointerEvents` evita que tape los
          clics cuando está invisible. */}
      {isMobile && (
        <div onClick={() => setDrawerOpen(false)} aria-hidden={!drawerOpen}
          style={{
            position: "fixed", inset: 0, background: "rgba(3,7,18,.45)", zIndex: 100,
            opacity: drawerOpen ? 1 : 0,
            pointerEvents: drawerOpen ? "auto" : "none",
            transition: "opacity .3s ease",
          }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 9 : 16, background: "#fff",
          borderBottom: "1px solid #ececec", position: "sticky", top: 0, zIndex: 20,
          padding: isMobile ? "12px 12px" : "14px 32px",
        }}>
          {/* Las tres barritas se convierten en una X: la de arriba y la de abajo
              rotan hasta cruzarse y la del medio se desvanece. Antes cambiaban de
              golpe y no se entendía que el mismo botón cerraba el menú. */}
          {isMobile && (
            <button onClick={() => setDrawerOpen(o => !o)}
              aria-label={drawerOpen ? "Cerrar el menú" : "Abrir el menú"}
              aria-expanded={drawerOpen}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, width: 32, height: 32, position: "relative", flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  position: "absolute", left: 6, width: 20, height: 2,
                  background: "#111827", borderRadius: 2,
                  transition: "transform .28s cubic-bezier(.4,0,.2,1), opacity .18s ease, top .28s cubic-bezier(.4,0,.2,1)",
                  top: drawerOpen ? 15 : 9 + i * 6,
                  opacity: drawerOpen && i === 1 ? 0 : 1,
                  transform: drawerOpen
                    ? (i === 0 ? "rotate(45deg)" : i === 2 ? "rotate(-45deg)" : "scaleX(.4)")
                    : "none",
                }} />
              ))}
            </button>
          )}
          {/* Solo el símbolo: con la palabra "Freewheel" al lado, los botones de
              entrar y crear cuenta no entraban en 390px y quedaban cortados. */}
          {isMobile && (
            <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex" }}>
              <BrandLogo size={17} wordmark={false} />
            </div>
          )}
          <div style={{ flex: 1 }} />
          {topbarRight()}
        </div>
        <div className="fw-content">{children}</div>
      </div>
    </div>
  );
}
