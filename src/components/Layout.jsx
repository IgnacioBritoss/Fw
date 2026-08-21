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
import CarIcon from "./CarIcon";
import Avatar from "./Avatar";
import { useI18n } from "../i18n/core";

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
// El auto ahora vive en su propio componente (components/CarIcon): antes era un
// trapecio con dos círculos apoyados al lado, que no se leía como un auto.
const PlusIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>);
const ShieldIcon = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);

// Estructura del menú lateral, agrupada por secciones. `adminOnly` hace que la
// opción se muestre únicamente a las cuentas administradoras.
const NAV = [
  { group: "nav.section.main", items: [
    { label: "nav.home", path: "/", Icon: HomeIcon },
    { label: "nav.search", path: "/buscar", Icon: SearchIcon },
    { label: "nav.bookings", path: "/my-bookings", Icon: CalendarIcon },
    { label: "nav.favorites", path: "/favoritos", Icon: HeartIcon },
  ]},
  { group: "nav.section.owners", items: [
    { label: "nav.myCars", path: "/dashboard", Icon: CarIcon },
    { label: "nav.publish", path: "/publish", Icon: PlusIcon },
    // El panel de administración es una opción más del menú, debajo de
    // "Publicar auto", y solo aparece si la cuenta es admin.
    { label: "nav.admin", path: "/admin", Icon: ShieldIcon, adminOnly: true },
  ]},
];

// La marca vive en components/Logo.jsx. Estaba copiada acá y en tres pantallas
// más, así que arreglarla en un lado no la arreglaba en los otros.
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", padding: "0 28px 8px" }}>
    <BrandLogo size={17} />
  </div>
);

/**
 * LAS TRES RAYAS QUE SE CONVIERTEN EN X.
 *
 * Se dibuja DOS VECES: una en la barra de arriba y otra adentro del cajón, al
 * costado del logo. Suena raro, pero nunca se ven las dos: cuando el cajón está
 * cerrado vive corrido fuera de la pantalla y sólo se ve la de la barra; cuando
 * se abre, el cajón le pasa por encima a la de la barra y se ve la de adentro.
 *
 * POR QUÉ HIZO FALTA: la animación de rayas a X dura 280ms y antes no se veía
 * nunca. El cajón entra desde la izquierda, mide 248px y le tapa justo el botón,
 * que está pegado al borde izquierdo. La animación corría abajo del cajón.
 *
 * Y por qué no alcanza con subirle el z-index al botón de la barra: la barra de
 * arriba arma su propio contexto de apilamiento, así que el z-index del botón se
 * compara contra sus hermanos de la barra y no contra el cajón. El botón queda
 * atrapado abajo por más alto que sea el número.
 *
 * Las dos copias están SIEMPRE dibujadas, así que ninguna se vuelve a montar al
 * abrir o cerrar y las dos animan de verdad.
 *
 * `oculto` marca a la que en ese momento no se ve. Dibujarlas es necesario para
 * la animación, pero para un lector de pantalla serían dos botones de menú
 * distintos anunciados a la vez, y uno de ellos apuntando a un lugar de la
 * pantalla donde no hay nada. Con esto, en cada momento hay exactamente uno.
 */
const BotonMenu = ({ abierto, onToggle, etiqueta, oculto }) => (
  <button onClick={onToggle} aria-label={etiqueta} aria-expanded={abierto}
    aria-hidden={oculto || undefined} tabIndex={oculto ? -1 : 0}
    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, width: 32, height: 32, position: "relative", flexShrink: 0 }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        position: "absolute", left: 6, width: 20, height: 2,
        background: "#111827", borderRadius: 2,
        transition: "transform .28s cubic-bezier(.4,0,.2,1), opacity .18s ease, top .28s cubic-bezier(.4,0,.2,1)",
        top: abierto ? 15 : 9 + i * 6,
        opacity: abierto && i === 1 ? 0 : 1,
        transform: abierto
          ? (i === 0 ? "rotate(45deg)" : i === 2 ? "rotate(-45deg)" : "scaleX(.4)")
          : "none",
      }} />
    ))}
  </button>
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

/**
 * Un botón de la barra de arriba.
 *
 * Vive acá afuera y no adentro de Layout a propósito: un componente declarado
 * dentro de otro se vuelve a crear en cada dibujado, y React lo trata como un
 * componente distinto cada vez (desmonta y vuelve a montar el botón entero).
 *
 * `dot` es el puntito de "hay algo sin leer".
 */
const TopButton = ({ style, dotStyle, onClick, title, dot = false, children }) => (
  <button type="button" onClick={onClick} title={title} aria-label={title} style={style}
    onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f2f4"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
    <span style={{ position: "relative", display: "flex" }}>
      {children}
      {dot && <span style={dotStyle} />}
    </span>
  </button>
);

export default function Layout({ children }) {
  const { t: tr } = useI18n();
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
    navGroup: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 28px 8px" },
    /*
      EL SELECCIONADO ES UNA FRANJA, NO UN BOTÓN.

      Antes era un rectángulo negro redondeado, flotando con aire a los costados:
      se leía como un botón apretado y no como "estás acá". Ahora es una franja
      azul que cruza la barra lateral de lado a lado, que es como se marca la
      posición en un menú.

      CÓMO LLEGA A LOS BORDES, y por qué NO con márgenes negativos.

      El primer intento fue -16px de cada lado para compensar el padding de la
      barra. Se veía bien al medirlo y estaba mal: el menú vive dentro de un
      contenedor que scrollea, y algo más ancho que él no se sale, se RECORTA.
      Quedaba una franja con margen blanco a los costados y encima aparecía una
      barra de scroll horizontal abajo.

      Y no se notaba midiendo, porque el recorte de un ancestro no cambia las
      medidas del elemento: la caja seguía diciendo 0..248 mientras lo pintado
      iba de 20 a 240. Hay que preguntar qué se dibuja en cada punto.

      Lo correcto es más simple: la barra no lleva padding a los costados, y el
      padding lo pone cada cosa que va adentro. Así la franja ocupa el ancho de
      verdad, sin desbordar nada y sin barra de scroll.
    */
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 28px",
      borderRadius: 0, fontSize: 14, fontWeight: active ? 600 : 500,
      cursor: "pointer", marginBottom: 2,
      background: active ? "#0f6ce6" : "transparent",
      color: active ? "#fff" : "#374151", transition: "background .15s",
    }),
    navIcon: (active) => ({ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flexShrink: 0, color: active ? "#fff" : "#6b7280" }),
    /*
      Los botones de la derecha ocupan el ALTO ENTERO de la franja y se separan
      con una línea, como las columnas de una barra de herramientas.

      Antes eran tres cuadraditos de 40px con fondo gris y borde redondeado,
      flotando en el medio de la barra: tres burbujas más, en una pantalla que ya
      tiene burbujas por todos lados. Y al pasar el mouse se pintaban de celeste,
      que es un color que en esta app significa "seleccionado".

      Ahora no tienen fondo hasta que se los toca, y ahí se ponen un gris apenas
      más oscuro que el blanco de la barra.
    */
    iconBtn: {
      alignSelf: "stretch", width: isMobile ? 46 : 54,
      background: "transparent", border: "none", borderLeft: "1px solid #f1f2f4",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", padding: 0, color: "#374151",
      transition: "background .15s",
    },
    /* El puntito de "hay algo sin leer", pegado al ícono y no a la esquina del
       botón: el botón ahora es alto y la esquina queda lejos del dibujo. */
    dot: {
      position: "absolute", top: -3, right: -4, width: 8, height: 8,
      borderRadius: "50%", background: "#0f6ce6", border: "2px solid #fff",
    },
  };

  // Contenido del menú lateral: logo, links de navegación, tarjeta "Publicar",
  // botón de admin (si corresponde) y bloque de perfil con botón de salir.
  const sidebarInner = () => (
    <>
      {isMobile ? (
        // Al costado del logo: es la copia que se ve mientras el cajón está
        // abierto, y la que muestra la X.
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingRight: 16 }}>
          <Logo />
          <BotonMenu abierto={drawerOpen} onToggle={() => setDrawerOpen(o => !o)}
            etiqueta={tr("nav.closeMenu")} oculto={!drawerOpen} />
        </div>
      ) : <Logo />}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map((g, gi) => (
          <div key={gi}>
            <div style={t.navGroup}>{tr(g.group)}</div>
            {g.items.filter(it => !it.adminOnly || isAdmin).map((it, ii) => (
              <div key={ii} style={t.navItem(isActive(it))} onClick={() => go(it.path)}>
                <span style={t.navIcon(isActive(it))}><it.Icon /></span>
                <span style={{ flex: 1 }}>{tr(it.label)}</span>
                {/* Cantidad de favoritos guardados, al lado del ítem. */}
                {it.path === "/favoritos" && favoritesCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 7px", background: isActive(it) ? "rgba(255,255,255,.22)" : "#eff6ff", color: isActive(it) ? "#fff" : "#0f6ce6" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 16px 0", paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
          <div onClick={() => go("/profile")} style={{ cursor: "pointer", flexShrink: 0 }}>
            <Avatar src={user?.profilePhotoUrl} initials={initials} size={36} alt="" />
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => go("/profile")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{firstName}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{tr("nav.profile")}</div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} title={tr("nav.logout")}
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
    <div style={{ display: "flex", alignItems: "stretch", alignSelf: "stretch", gap: 0 }}>
      {user && (
        /* Mensajes (con puntito azul si hay no leídos) */
        <TopButton style={t.iconBtn} onClick={() => navigate("/chat")} title={tr("nav.messages")}
          dot={hasUnread} dotStyle={t.dot}><MessageIcon /></TopButton>
      )}
      {user && (
        /* Notificaciones */
        <TopButton style={t.iconBtn} onClick={() => navigate("/notificaciones")} title={tr("nav.notifications")}
          dot={hasUnreadNotif} dotStyle={t.dot}><BellIcon /></TopButton>
      )}
      {user && (
        /* Ajustes */
        <TopButton style={t.iconBtn} onClick={() => navigate("/ajustes")} title={tr("nav.settings")}>
          <GearIcon />
        </TopButton>
      )}
      {!user && (
        /*
          Sin cuenta: entrar y crear cuenta, con la MISMA forma que los botones
          de mensajes, notificaciones y ajustes.

          Antes eran dos pastillas redondeadas flotando en el medio de la franja
          —una con borde gris y otra azul— mientras que al lado, para quien sí
          tiene sesión, los tres botones ocupan el alto entero y se separan con
          una línea. Eran dos barras distintas según quién mirara. Ahora es una
          sola: columnas de la misma altura, separadas por la misma línea.

          "Crear cuenta" queda en azul porque es la acción que la barra quiere
          empujar; la diferencia se hace con el color de la letra y no con una
          cápsula, para no volver a meter una forma distinta.

          En un teléfono de 390px los textos van cortos: con los largos, uno se
          partía en dos renglones y el otro quedaba cortado contra el borde.
        */
        <>
          <TopButton
            style={{ ...t.iconBtn, width: "auto", padding: isMobile ? "0 12px" : "0 18px" }}
            onClick={() => navigate("/login")} title={tr("auth.loginBtn")}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              {isMobile ? tr("auth.loginShort") : tr("auth.loginBtn")}
            </span>
          </TopButton>
          <TopButton
            style={{ ...t.iconBtn, width: "auto", padding: isMobile ? "0 12px" : "0 18px" }}
            onClick={() => navigate("/register")} title={tr("auth.registerFree")}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f6ce6", whiteSpace: "nowrap" }}>
              {isMobile ? tr("auth.registerShort") : tr("auth.registerFree")}
            </span>
          </TopButton>
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
          // Sin padding a los costados: lo pone cada cosa de adentro, para que
          // la franja del seleccionado pueda llegar a los bordes.
          background: "#fff", padding: "24px 0", display: "flex", flexDirection: "column",
          boxShadow: "0 0 40px rgba(0,0,0,.2)", overflowY: "auto",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .3s cubic-bezier(.32,.72,0,1)",
        } : {
          width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #ececec",
          padding: "24px 0", display: "flex", flexDirection: "column",
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
        {/* La franja tiene ALTO PROPIO en vez de sacarlo del relleno vertical: es
            lo que les permite a los botones de la derecha ocupar el alto entero.
            El relleno vertical se va a 0 y queda solo el horizontal. */}
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 9 : 16, background: "#fff",
          borderBottom: "1px solid #ececec", position: "sticky", top: 0, zIndex: 20,
          height: isMobile ? 56 : 66,
          padding: isMobile ? "0 0 0 12px" : "0 0 0 32px",
        }}>
          {/* Las tres barritas se convierten en una X: la de arriba y la de abajo
              rotan hasta cruzarse y la del medio se desvanece. Antes cambiaban de
              golpe y no se entendía que el mismo botón cerraba el menú. */}
          {isMobile && (
            <BotonMenu abierto={drawerOpen} onToggle={() => setDrawerOpen(o => !o)}
              etiqueta={tr("nav.openMenu")} oculto={drawerOpen} />
          )}
          {/*
            Con sesión abierta va el símbolo Y la palabra: los botones de entrar y
            crear cuenta ya no están, así que sobra lugar y la barra no puede
            quedar con el logo suelto y un hueco al lado.
            Sin sesión va solo el símbolo, porque con "Freewheel" escrito los dos
            botones no entran en 390px y uno queda cortado contra el borde.
          */}
          {isMobile && (
            <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex" }}>
              <BrandLogo size={user ? 14 : 17} wordmark={Boolean(user)} />
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
