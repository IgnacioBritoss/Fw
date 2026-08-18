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
//  Ahora las seis pantallas usan esta carcasa:
//   · en computadora, el panel oscuro a la izquierda y el formulario a la derecha;
//   · en celular, el panel se convierte en una franja compacta arriba (logo y una
//     línea) y el formulario ocupa todo el ancho.
//
//  Props:
//   · hero      → { eyebrow, title, text } lo que dice el panel oscuro
//   · title     → título del formulario
//   · subtitle  → renglón debajo del título (puede llevar un link)
//   · footer    → algo opcional al final de la tarjeta
//   · maxWidth  → ancho del formulario en computadora (400 por defecto)
// ============================================================================
import { Link } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
<<<<<<< HEAD

const Logo = ({ light = true, size = 20 }) => (
  <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", position: "relative" }}>
    <svg width={size + 8} height={size + 8} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="#2563eb" strokeWidth="2" />
      <circle cx="16" cy="16" r="4" fill="#2563eb" />
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return (
          <line key={i} x1={16 + 5 * Math.cos(r)} y1={16 + 5 * Math.sin(r)}
            x2={16 + 11 * Math.cos(r)} y2={16 + 11 * Math.sin(r)}
            stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
        );
      })}
    </svg>
    <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.5px" }}>
      <span style={{ color: light ? "#fff" : "#111827" }}>Free</span>
      <span style={{ color: "#2563eb" }}>wheel</span>
    </span>
  </Link>
);

=======
import { useThemeColor } from "../hooks/useThemeColor";
import BrandLogo from "./Logo";

const Logo = ({ light = true, size = 20 }) => (
  <Link to="/" style={{ textDecoration: "none", position: "relative" }}>
    <BrandLogo size={size} light={light} />
  </Link>
);


>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
const HERO_BG = "linear-gradient(160deg,#0a0f1e 0%,#0d1525 60%,#0f1e3d 100%)";
const HERO_GLOW = "radial-gradient(ellipse at 30% 70%,rgba(37,99,235,.18) 0%,transparent 60%)";

export default function AuthShell({ hero, title, subtitle, footer, maxWidth = 400, children }) {
  const { isMobile } = useIsMobile();
<<<<<<< HEAD
=======
  // La barra del navegador acompaña la franja oscura: sin esto, en iPhone quedaba
  // una banda blanca de Safari encima y la franja no llegaba al borde de arriba.
  useThemeColor("#0a0f1e");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

  // ── CELULAR: una sola columna, el panel oscuro reducido a una franja ──
  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
<<<<<<< HEAD
        <div style={{ background: HERO_BG, padding: "22px 20px 24px", position: "relative", overflow: "hidden" }}>
=======
        <div style={{
          background: HERO_BG,
          // El área segura es el espacio que ocupan la barra de estado y el notch:
          // se le suma al padding para que la franja pinte hasta arriba de todo sin
          // que el logo quede tapado.
          padding: "calc(22px + env(safe-area-inset-top)) 20px 24px",
          position: "relative", overflow: "hidden",
        }}>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          <div style={{ position: "absolute", inset: 0, backgroundImage: HERO_GLOW }} />
          <Logo size={18} />
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

  // ── COMPUTADORA: panel oscuro + formulario ──
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{
        flex: "0 0 45%", background: HERO_BG,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px 52px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: HERO_GLOW }} />
        <Logo size={20} />

        <div style={{ position: "relative" }}>
          {hero?.eyebrow && (
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#2563eb", textTransform: "uppercase",
              letterSpacing: ".06em", marginBottom: 16,
            }}>
              {hero.eyebrow}
            </div>
          )}
          {hero?.title && (
            <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 16 }}>
              {hero.title}
            </h1>
          )}
          {hero?.text && (
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.6)", lineHeight: 1.6, maxWidth: 320 }}>
              {hero.text}
            </p>
          )}
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)", position: "relative" }}>© 2025 Freewheel</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 56px", background: "#fff" }}>
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
  );
}
