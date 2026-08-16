// ============================================================================
//  AuthShell — La carcasa de todas las pantallas de entrada
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE: Login tenía dos columnas hechas con `display:flex` y un panel
//  oscuro fijo al 45% del ancho. En una computadora se ve bien; en un iPhone 13
//  esas dos columnas se siguen poniendo una al lado de la otra, así que el panel
//  oscuro se comía casi la mitad de los 390px y el formulario quedaba apretado en
//  una franja de 200px, con el texto partido y los botones amontonados. Ninguna de
//  las pantallas de esta carpeta tenía una sola línea de adaptación al celular: la
//  ronda de mobile pasó por el resto de la app y se salteó entera la parte de
//  registrarse e iniciar sesión, que es justo lo primero que ve alguien nuevo.
//
//  Ahora las pantallas usan esta carcasa:
//   · en computadora, el panel con la foto a la izquierda y el formulario a la
//     derecha;
//   · en celular, el panel se convierte en una franja compacta arriba (logo y una
//     línea) y el formulario ocupa todo el ancho. EN EL CELULAR NO VA LA FOTO:
//     la franja mide unos 120px de alto contra todo el ancho, y una foto vertical
//     de un auto ahí adentro se recorta hasta que no se entiende qué es.
//
//  EL BOTÓN DE IDIOMA va en las dos, y es lo primero de la pantalla en el orden
//  de tabulación: quien no lee castellano tiene que poder cambiarlo antes de
//  empezar a leer el formulario, no después.
//
//  Props:
//   · hero      → { title, text } lo que dice el panel
//   · foto      → ruta de la imagen del panel (opcional; sin ella, el degradado)
//   · title     → título del formulario
//   · subtitle  → renglón debajo del título (puede llevar un link)
//   · footer    → algo opcional al final de la tarjeta
//   · maxWidth  → ancho del formulario en computadora (400 por defecto)
// ============================================================================
import { Link } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { useThemeColor } from "../hooks/useThemeColor";
import BrandLogo from "./Logo";
import AuthAside from "./AuthAside";
import LangPicker from "./LangPicker";

const Logo = ({ light = true, size = 20 }) => (
  <Link to="/" style={{ textDecoration: "none", position: "relative" }}>
    <BrandLogo size={size} light={light} />
  </Link>
);

const HERO_BG = "linear-gradient(160deg,#0a0f1e 0%,#0d1525 60%,#0f1e3d 100%)";
const HERO_GLOW = "radial-gradient(ellipse at 30% 70%,rgba(37,99,235,.18) 0%,transparent 60%)";

/** Cuánto ocupa el panel de la foto. Va en dos lados: el panel y el margen que
 *  le reserva la columna del formulario, así que se escribe una sola vez. */
const PANEL = "45%";

export default function AuthShell({ hero, foto, title, subtitle, footer, maxWidth = 400, children }) {
  const { isMobile } = useIsMobile();
  // La barra del navegador acompaña la franja oscura: sin esto, en iPhone quedaba
  // una banda blanca de Safari encima y la franja no llegaba al borde de arriba.
  useThemeColor("#0a0f1e");

  // ── CELULAR: una sola columna, el panel oscuro reducido a una franja ──
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: HERO_BG,
          // El área segura es el espacio que ocupan la barra de estado y el notch:
          // se le suma al padding para que la franja pinte hasta arriba de todo sin
          // que el logo quede tapado.
          padding: "calc(22px + env(safe-area-inset-top)) 20px 24px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: HERO_GLOW }} />
          <div style={{
            position: "relative", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12,
          }}>
            <Logo size={18} />
            <LangPicker tono="oscuro" />
          </div>
          {hero?.title && (
            <div style={{
              position: "relative", marginTop: 14, fontSize: 20, fontWeight: 800,
              color: "#fff", lineHeight: 1.25, letterSpacing: "-.4px",
            }}>
              {hero.title}
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: "26px 20px 40px" }}>
          <h2 style={{ fontSize: 23, fontWeight: 800, color: "#111827", letterSpacing: "-.4px", marginBottom: 6 }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>{subtitle}</p>
          )}
          {children}
          {footer && <div style={{ marginTop: 22 }}>{footer}</div>}
        </div>
      </div>
    );
  }

  // ── COMPUTADORA: panel con la foto + formulario ──
  // El panel va fijo (ver AuthAside), así que la columna del formulario le
  // reserva el lugar con un margen del mismo ancho en vez de ponerse al lado.
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <AuthAside
        foto={foto}
        titulo={hero?.title}
        texto={hero?.text}
        ancho={PANEL}
        lado="izquierda"
        arriba={<Logo size={20} />}
      />

      <div style={{
        marginLeft: PANEL, minHeight: "100vh",
        display: "flex", flexDirection: "column", background: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "22px 28px 0" }}>
          <LangPicker />
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 56px 48px",
        }}>
          <div style={{ width: "100%", maxWidth }}>
            <div style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px", marginBottom: 6 }}>
                {title}
              </h2>
              {subtitle && <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{subtitle}</p>}
            </div>
            {children}
            {footer && <div style={{ marginTop: 22 }}>{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
