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
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { getMyConversations } from "../services/api";
import { hasUnreadNotifications } from "../services/notifications";
import BrandLogo from "./Logo";
import CarIcon from "./CarIcon";
import Avatar from "./Avatar";
import { useAsistente } from "../context/AssistantContext";
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
/**
 * El alto de la franja de arriba. Vive acá y no escrito en cada lugar porque lo
 * usan DOS cosas que tienen que medir exactamente lo mismo: la franja y el
 * encabezado de la barra lateral. Si se separan, sus líneas de abajo dejan de
 * encontrarse en la esquina.
 */
const ALTO_FRANJA = { movil: 56, escritorio: 66 };

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
 * Es el mismo botón en las dos partes: en el teléfono abre y cierra el cajón, y
 * en computadora abre y cierra la barra lateral. Antes en computadora había
 * otro que se convertía en una flecha, y no hacía falta: una cruz es lo que
 * todo el mundo busca para cerrar algo, y la flecha además obligaba a explicar
 * hacia dónde apuntaba.
 *
 * EN EL TELÉFONO se dibuja DOS VECES: una en la barra de arriba y otra adentro
 * del cajón, al costado del logo. Suena raro, pero nunca se ven las dos: cuando
 * el cajón está cerrado vive corrido fuera de la pantalla y sólo se ve la de la
 * barra; cuando se abre, el cajón le pasa por encima a la de la barra y se ve
 * la de adentro.
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
        // Del color del texto, no de las etiquetas oscuras: en modo oscuro el
        // gris de las etiquetas casi no se despega del fondo de la barra.
        background: "var(--fw-text)", borderRadius: 2,
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

/**
 * WILI, el asistente: una cara de robot.
 *
 * NO SE PARECE A NINGÚN OTRO de la franja, que es justo lo que hacía falta: el
 * asistente ES un chat, así que dibujarlo con una burbuja lo dejaba idéntico al
 * botón de mensajes que tiene al lado, y eran dos cosas distintas con el mismo
 * símbolo. Una cara de robot dice "esto contesta una máquina" y además le pone
 * cara a Wili, que es el nombre con el que se presenta.
 *
 * Está armado con lo mínimo que se lee a 18 píxeles: la cabeza redondeada, la
 * antenita arriba, dos ojos y la boca. Con orejas, cuello o tornillos, a ese
 * tamaño se convierte en una mancha.
 */
const RobotIcon = ({ size = 18, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v3" />
    <rect x="3.5" y="7" width="17" height="13" rx="4" />
    <path d="M9 12.5v1.5M15 12.5v1.5" />
    <path d="M9.5 17h5" />
  </svg>
);

// Ícono de mensajes (burbuja de chat) — profesional, sin emoji.
// Los grises van escritos como número y no como variable: terminan en un
// atributo de SVG (`stroke=`), donde `var()` no es seguro en todos los
// navegadores. El modo oscuro los cambia desde theme.js, con una regla que
// apunta a ese valor exacto.
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
    /* El gris del hover sale de la paleta y no de un número escrito acá: con
       "#f1f2f4" fijo, en modo oscuro pasar el mouse encendía un rectángulo casi
       blanco en medio de la franja. Ahora es un escalón sobre el fondo de la
       franja, que en claro aclara y en oscuro aclara también, pero poquito. */
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fw-surface-2)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
    <span style={{ position: "relative", display: "flex" }}>
      {children}
      {dot && <span style={dotStyle} />}
    </span>
  </button>
);

/**
 * El símbolo de incógnito: el sombrero y los anteojos de siempre.
 *
 * Es el dibujo que todo el mundo asocia con "estás sin identificar", así que no
 * hace falta explicarlo. Va dibujado con los mismos trazos que el resto de los
 * iconos del menú —no es un emoji— para que no desentone.
 */
const IconoIncognito = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.4 10.4 8.7 5.7a1.6 1.6 0 0 1 2-1.1l1.3.4 1.3-.4a1.6 1.6 0 0 1 2 1.1l1.3 4.7" />
    <path d="M3.5 11.4h17" />
    <circle cx="7.6" cy="16.4" r="2.9" />
    <circle cx="16.4" cy="16.4" r="2.9" />
    <path d="M10.5 16.1c.9-.6 2.1-.6 3 0" />
  </svg>
);

/**
 * PieIncognito — El pie de la barra lateral cuando NO hay sesión iniciada
 * --------------------------------------------------------------------------
 *  Con la sesión abierta, abajo de todo está el avatar con el nombre. Sin
 *  sesión no había nada: la barra terminaba en el aire y ese rincón —donde uno
 *  ya aprendió que está "quién sos"— quedaba mudo.
 *
 *  Ahora está el símbolo de incógnito, que dice exactamente eso: estás mirando
 *  sin nombre. Y al tocarlo se abre un globo que cuenta qué se está perdiendo y
 *  ofrece los dos caminos, en vez de mandar a la pantalla de entrar de una: no
 *  es un botón de login disfrazado, es una explicación con la puerta al lado.
 *
 *  EL GLOBO VA POR FUERA DE LA BARRA. La barra lateral recorta lo que se sale
 *  (`overflow: hidden`, que es lo que hace que la animación de abrir y cerrar se
 *  vea limpia). Un globo dibujado adentro quedaría cortado justo cuando la barra
 *  está angosta, que es cuando más falta hace. Por eso se dibuja pegado al
 *  `body` y se ubica a partir de dónde quedó el botón.
 */
const PieIncognito = ({ angosta, tr, onEntrar, onCrearCuenta }) => {
  const [abierto, setAbierto] = useState(false);
  const [donde, setDonde] = useState(null);
  const botonRef = useRef(null);

  const alternar = () => {
    if (abierto) { setAbierto(false); return; }
    const r = botonRef.current?.getBoundingClientRect();
    if (!r) return;
    setDonde({
      // A la derecha del botón y alineado con su base: el botón está abajo a la
      // izquierda de la pantalla, así que para arriba y hacia adentro es el
      // único lado donde el globo entra entero.
      izquierda: r.right + 10,
      abajo: Math.max(12, window.innerHeight - r.bottom - 6),
    });
    setAbierto(true);
  };

  // Escape lo cierra, y también moverse o cambiar el tamaño de la ventana: el
  // globo está ubicado con las medidas del momento en que se abrió, así que si
  // el botón se corre, lo que se ve queda flotando en cualquier lado.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [abierto]);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      justifyContent: angosta ? "center" : "flex-start",
      margin: angosta ? "16px 8px 0" : "16px 16px 0",
      paddingTop: 16, borderTop: "1px solid var(--fw-line-soft)",
    }}>
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={tr("nav.incognito")}
        title={angosta ? tr("nav.incognito") : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: angosta ? 36 : "100%", height: 36,
          justifyContent: angosta ? "center" : "flex-start",
          padding: angosta ? 0 : "0 6px",
          background: abierto ? "var(--fw-surface-2)" : "transparent",
          border: "none", borderRadius: 8, cursor: "pointer",
          color: "var(--fw-text-3)", textAlign: "left",
        }}
      >
        <IconoIncognito />
        {!angosta && (
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--fw-text-2)" }}>
              {tr("nav.incognito")}
            </span>
            <span style={{ display: "block", fontSize: 11, color: "var(--fw-text-4)" }}>
              {tr("nav.incognitoHint")}
            </span>
          </span>
        )}
      </button>

      {abierto && donde && createPortal(
        <>
          {/* Una capa invisible que ocupa todo: tocar en cualquier lado cierra el
              globo. Es lo que uno espera de algo que se abrió al tocar. */}
          <div style={{ position: "fixed", inset: 0, zIndex: 2400 }}
            onMouseDown={() => setAbierto(false)} />
          <div
            role="dialog" aria-label={tr("nav.incognito")}
            className="fw-aviso"
            style={{
              position: "fixed", left: donde.izquierda, bottom: donde.abajo,
              zIndex: 2401, width: 250, maxWidth: "calc(100vw - 32px)",
              background: "var(--fw-surface)", color: "var(--fw-text)",
              border: "1px solid var(--fw-border)", borderRadius: 12,
              boxShadow: "0 12px 36px rgba(0,0,0,.22)", padding: 14,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <IconoIncognito size={17} color="var(--fw-text-3)" />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{tr("nav.incognito")}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 12 }}>
              {tr("nav.incognitoBody")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onEntrar}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                  background: "var(--fw-blue)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {tr("auth.loginBtn")}
              </button>
              <button type="button" onClick={onCrearCuenta}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8,
                  border: "1px solid var(--fw-border-2)", background: "transparent",
                  color: "var(--fw-text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {tr("auth.registerShort")}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

export default function Layout({ children }) {
  const { t: tr } = useI18n();
  const { user, logout } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  // Wili vive en components/ChatBot, que se dibuja fuera de las rutas: lo único
  // que comparten es si está abierto, y eso viaja por el contexto.
  const { abierto: asistenteAbierto, alternar: alternarAsistente } = useAsistente();
  const [drawerOpen, setDrawerOpen] = useState(false);       // menú lateral abierto (celular)
  /*
    LA BARRA LATERAL SE PUEDE CERRAR EN COMPUTADORA.

    Cerrada no desaparece: queda una franja angosta con los íconos solos. Es lo
    que hace falta —los 248px de la barra son bastante pantalla, y en una
    grilla de autos o en el mapa ese ancho se nota— sin perder la navegación,
    que es lo que pasaría si se escondiera del todo.

    La elección se recuerda: si alguien la cerró es porque quiere la pantalla
    ancha, y volver a abrirla en cada visita sería desandarlo.
  */
  const [barraCerrada, setBarraCerrada] = useState(() => {
    try { return localStorage.getItem("fw_barra") === "cerrada"; } catch { return false; }
  });
  const cambiarBarra = () => setBarraCerrada((v) => {
    try { localStorage.setItem("fw_barra", v ? "abierta" : "cerrada"); } catch { /* almacenamiento bloqueado */ }
    return !v;
  });
  // En el teléfono manda el cajón: la franja angosta no aplica.
  const angosta = !isMobile && barraCerrada;
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
    navGroup: { fontSize: 11, fontWeight: 700, color: "var(--fw-text-4)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 28px 8px" },
    /* Con la barra angosta no entra el título del grupo: en su lugar va una
       línea, que separa igual sin necesitar ancho. */
    navSeparador: { height: 1, background: "var(--fw-bg)", margin: "14px 14px 10px" },
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
      // Angosta: el ícono va centrado y sin relleno a los costados, para que la
      // franja azul siga cruzando de borde a borde.
      justifyContent: angosta ? "center" : "flex-start",
      padding: angosta ? "11px 0" : "10px 28px",
      borderRadius: 0, fontSize: 14, fontWeight: active ? 600 : 500,
      cursor: "pointer", marginBottom: 2,
      background: active ? "var(--fw-blue)" : "transparent",
      color: active ? "#fff" : "var(--fw-text-2)", transition: "background .15s",
    }),
    navIcon: (active) => ({ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flexShrink: 0, color: active ? "#fff" : "var(--fw-text-3)" }),
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
      background: "transparent", border: "none", borderLeft: "1px solid var(--fw-line-soft)",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", padding: 0, color: "var(--fw-text-2)",
      transition: "background .15s",
    },
    /* El puntito de "hay algo sin leer", pegado al ícono y no a la esquina del
       botón: el botón ahora es alto y la esquina queda lejos del dibujo. */
    dot: {
      position: "absolute", top: -3, right: -4, width: 8, height: 8,
      borderRadius: "50%", background: "var(--fw-blue)", border: "2px solid #fff",
    },
  };

  // Contenido del menú lateral: logo, links de navegación, tarjeta "Publicar",
  // botón de admin (si corresponde) y bloque de perfil con botón de salir.
  let turno = 0;
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
      ) : (
        /*
          EL ENCABEZADO DE LA BARRA, SIN NINGUNA LÍNEA ABAJO.

          Tenía una, para que se encontrara con la de la franja de arriba y las
          dos se leyeran como una sola. No funcionó: adentro de la barra esa
          línea corta la marca de la navegación y se ve como si fueran dos
          cajas apiladas. La única línea que queda es la vertical del costado,
          que corre entera de arriba abajo —también con la barra cerrada— y es
          lo único que hace falta para separar la barra del contenido.

          El alto igual se conserva: es lo que hace que el primer ítem del menú
          arranque justo donde arranca el bloque azul de la pantalla.

          ABIERTA: la marca a la izquierda y la cruz de cerrar a la derecha, que
          es donde se cierra cualquier cosa. CERRADA: las tres rayas solas,
          centradas, porque no hay lugar para más.
        */
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          height: ALTO_FRANJA.escritorio, flexShrink: 0, boxSizing: "border-box",
          justifyContent: angosta ? "center" : "space-between",
          padding: angosta ? 0 : "0 16px 0 20px",
        }}>
          {!angosta && (
            <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex" }}>
              <BrandLogo size={17} />
            </div>
          )}
          <BotonMenu abierto={!barraCerrada} onToggle={cambiarBarra}
            etiqueta={tr(barraCerrada ? "nav.openMenu" : "nav.closeMenu")} />
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingTop: isMobile ? 8 : 0 }}>
        {/*
          El desfase de la animación: cada nombre entra un poco después que el
          anterior. `turno` cuenta los renglones que ya se dibujaron, títulos de
          grupo incluidos, así el escalonado no se corta al pasar de un grupo al
          otro.
        */}
        {(() => { turno = 0; return null; })()}
        {NAV.map((g, gi) => (
          <div key={gi}>
            {/* Angosta y en el primer grupo no va NADA arriba del primer ítem:
                así su franja azul arranca justo donde arranca el bloque azul de
                la pantalla, del otro lado de la línea, y los dos quedan
                parejos. Un espacio de diez píxeles los desalineaba. */}
            {angosta
              ? (gi > 0 ? <div style={t.navSeparador} /> : null)
              : <div className="fw-menu-texto" style={{ ...t.navGroup, animationDelay: `${(turno++) * 40}ms` }}>
                  {tr(g.group)}
                </div>}
            {g.items.filter(it => !it.adminOnly || isAdmin).map((it, ii) => (
              // `title`: angosta el nombre no está escrito, así que el globito
              // del navegador es lo único que dice a dónde lleva cada dibujo.
              <div key={ii} style={t.navItem(isActive(it))} onClick={() => go(it.path)}
                title={angosta ? tr(it.label) : undefined}>
                <span style={t.navIcon(isActive(it))}><it.Icon /></span>
                {!angosta && (
                  <span className="fw-menu-texto"
                    style={{ flex: 1, animationDelay: `${(turno++) * 40}ms` }}>
                    {tr(it.label)}
                  </span>
                )}
                {/* Cantidad de favoritos guardados, al lado del ítem. */}
                {!angosta && it.path === "/favoritos" && favoritesCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 7px", background: isActive(it) ? "rgba(255,255,255,.22)" : "var(--fw-blue-bg)", color: isActive(it) ? "#fff" : "var(--fw-blue)" }}>
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
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          justifyContent: angosta ? "center" : "flex-start",
          margin: angosta ? "16px 8px 0" : "16px 16px 0",
          paddingTop: 16, borderTop: "1px solid var(--fw-line-soft)",
        }}>
          <div onClick={() => go("/profile")} title={angosta ? firstName : undefined}
            style={{ cursor: "pointer", flexShrink: 0 }}>
            <Avatar src={user?.profilePhotoUrl} initials={initials} size={36} alt="" />
          </div>
          {!angosta && <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => go("/profile")}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)" }}>{firstName}</div>
            <div style={{ fontSize: 11, color: "var(--fw-text-4)" }}>{tr("nav.profile")}</div>
          </div>}
          {!angosta && <button onClick={() => { logout(); navigate("/"); }} title={tr("nav.logout")}
            style={{ background: "none", border: "none", color: "var(--fw-red-text)", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>}
        </div>
      )}

      {/* Sin sesión, el mismo rincón lo ocupa el incógnito. Ver PieIncognito. */}
      {!user && (
        <PieIncognito
          angosta={angosta}
          tr={tr}
          onEntrar={() => go("/login")}
          onCrearCuenta={() => go("/register")}
        />
      )}
      </div>
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
      {/*
        WILI, EL ASISTENTE. Antes era un redondel azul flotando encima del
        contenido: el único elemento de toda la app que tapaba lo que hubiera
        abajo. Había que arrastrarlo cuando molestaba, y en el chat de verdad se
        le venía encima al botón de mandar.

        Acá es un botón más de la franja, en el lugar donde ya se buscan las
        herramientas de la app. Abre y cierra la misma ventana de siempre.

        Solo con la sesión iniciada. Sin cuenta, la franja tiene los botones de
        entrar y crear cuenta, que es lo único que hay para hacer ahí: meter un
        tercer botón al lado desdibuja esos dos, que son los que importan.
      */}
      {user && (
        <TopButton style={t.iconBtn} onClick={alternarAsistente}
          title={tr(asistenteAbierto ? "chat.closeAssistant" : "chat.openAssistant")}>
          <RobotIcon color={asistenteAbierto ? "var(--fw-blue)" : undefined} />
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fw-text-2)", whiteSpace: "nowrap" }}>
              {isMobile ? tr("auth.loginShort") : tr("auth.loginBtn")}
            </span>
          </TopButton>
          <TopButton
            style={{ ...t.iconBtn, width: "auto", padding: isMobile ? "0 12px" : "0 18px" }}
            onClick={() => navigate("/register")} title={tr("auth.registerFree")}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-blue)", whiteSpace: "nowrap" }}>
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
    <div style={{ minHeight: "100vh", background: "var(--fw-bg)", display: "flex" }}>
      {/* Menú lateral: fijo en escritorio, cajón deslizable en celular */}
      <aside
        style={isMobile ? {
          position: "fixed", top: 0, left: 0, bottom: 0, width: 248, zIndex: 101,
          // Sin padding a los costados: lo pone cada cosa de adentro, para que
          // la franja del seleccionado pueda llegar a los bordes.
          background: "var(--fw-surface)", padding: "24px 0", display: "flex", flexDirection: "column",
          boxShadow: "0 0 40px rgba(0,0,0,.2)", overflowY: "auto",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .3s cubic-bezier(.32,.72,0,1)",
        } : {
          /*
            El ancho es lo único que cambia, y por eso se puede animar: el
            contenido de al lado es un `flex: 1`, así que se estira solo para
            ocupar lo que la barra deja libre, y las pantallas ya venían
            centradas con `margin: 0 auto`. No hay nada más que mover.

            `overflow: hidden` es para la animación: mientras la barra se cierra
            los nombres todavía están escritos y sin esto asomarían por el
            costado durante el tercio de segundo que dura.
          */
          width: angosta ? 68 : 248,
          transition: "width .3s cubic-bezier(.32,.72,0,1)",
          overflow: "hidden",
          // La única línea de la barra: la del costado, de arriba abajo y
          // también con la barra cerrada. Un pelo, del gris más suave que hay.
          borderRight: "1px solid var(--fw-line)",
          flexShrink: 0, background: "var(--fw-surface)",
          // Sin relleno arriba: el encabezado ya mide lo que tiene que medir, y
          // cualquier relleno acá lo correría hacia abajo y desalinearía la
          // línea de la esquina.
          padding: "0 0 24px", display: "flex", flexDirection: "column",
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
          display: "flex", alignItems: "center", gap: isMobile ? 9 : 16, background: "var(--fw-surface)",
          borderBottom: "1px solid var(--fw-line)", position: "sticky", top: 0, zIndex: 20,
          height: isMobile ? ALTO_FRANJA.movil : ALTO_FRANJA.escritorio,
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
          {/*
            LA MARCA NO DESAPARECE NUNCA.

            Con la barra lateral cerrada, "Freewheel" y el auto se iban con
            ella: quedaba una pantalla sin marca por ningún lado. Acá vuelven,
            en el hueco que la franja tiene libre justo a la izquierda.

            Y solo con la barra cerrada, porque abierta ya está en su
            encabezado: dibujarla en los dos lados sería la misma marca dos
            veces, una al lado de la otra.
          */}
          {angosta && (
            <div onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex" }}>
              <BrandLogo size={17} />
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
