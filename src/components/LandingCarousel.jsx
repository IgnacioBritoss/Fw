// ============================================================================
//  LandingCarousel — La franja del final de la home que lleva a la presentación
// ----------------------------------------------------------------------------
//  Qué es: una barra chica, abajo de todo en el inicio, que va rotando tres
//  frases sobre el proyecto. Al tocarla se abre la landing en otra pestaña.
//
//  POR QUÉ ES TAN SOBRIA
//  Es lo último de una pantalla que ya tiene el bloque azul arriba, la grilla de
//  categorías y la de autos. Un carrusel con fotos grandes, flechas y texto
//  enorme ahí abajo compite con los autos, que son a lo que se entró. Entonces:
//  el alto de un renglón doble, fondo blanco, una línea de 1px alrededor y el
//  mismo redondeo de 4 que el resto de la app.
//
//  LOS COLORES DE ARGENTINA, SIN DISFRAZ
//  La bandera entra como una barra vertical de 4px pegada al borde izquierdo:
//  celeste, blanco, celeste. Es suficiente para que se lea de dónde es sin
//  pintar media pantalla de celeste. El azul de Freewheel queda para el texto
//  que se puede tocar y para el auto de la marca.
//
//  ACCESIBILIDAD Y MOVIMIENTO
//  · el bloque entero es un enlace de verdad (<a>), no un div con onClick: se
//    puede abrir en otra pestaña con el botón del medio y se anuncia bien;
//  · los puntitos quedan FUERA del enlace, que si no tocarlos navegaría;
//  · se detiene solo al pasar el mouse por arriba y cuando el sistema pide
//    "menos movimiento" (prefers-reduced-motion), donde directamente no rota.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import { useIsMobile } from "../hooks/useIsMobile";
import { LogoMark } from "./Logo";

/**
 * A dónde va. Sale de una variable de entorno para poder cambiarla sin tocar el
 * código; el valor de abajo es el nombre por defecto que le pone Vercel al
 * repositorio de la landing.
 */
const LANDING_URL =
  import.meta.env.VITE_LANDING_URL || "https://landing-page-freewheel.vercel.app/";

// Celeste de la bandera. El mismo que usa la landing.
const CELESTE = "#75aadb";

const LAMINAS = [
  { titulo: "home.landing1", sub: "home.landing1Sub" },
  { titulo: "home.landing2", sub: "home.landing2Sub" },
  { titulo: "home.landing3", sub: "home.landing3Sub" },
];

const CADA = 5200; // ms entre lámina y lámina

/** ¿El sistema pidió menos animaciones? */
function menosMovimiento() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LandingCarousel() {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();
  const [activa, setActiva] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const quietoRef = useRef(false);

  // El temporizador se arma UNA vez y lee el "quieto" de la referencia. Si
  // dependiera del estado, cada vez que el mouse entra o sale se tiraría el
  // temporizador y se armaría otro, y la lámina se quedaría más de lo debido.
  useEffect(() => { quietoRef.current = quieto; }, [quieto]);

  useEffect(() => {
    if (menosMovimiento()) return undefined;
    const reloj = setInterval(() => {
      if (!quietoRef.current) setActiva((i) => (i + 1) % LAMINAS.length);
    }, CADA);
    return () => clearInterval(reloj);
  }, []);

  // La espera después de tocar un puntito. Se guarda para poder cancelarla: si
  // se toca otro antes de tiempo, o se sale de la pantalla, no puede quedar un
  // temporizador suelto tocando el estado de algo que ya no está.
  const espera = useRef(null);
  useEffect(() => () => clearTimeout(espera.current), []);

  const irA = useCallback((i) => {
    setActiva(i);
    // Al elegir una a mano se le da su tiempo completo antes de seguir sola.
    setQuieto(true);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setQuieto(false), CADA);
  }, []);

  const alto = isMobile ? 96 : 104;

  return (
    <div
      onMouseEnter={() => setQuieto(true)}
      onMouseLeave={() => setQuieto(false)}
      style={{
        position: "relative", display: "flex", alignItems: "stretch",
        background: "#fff", border: "1px solid #ececec", borderRadius: 4,
        overflow: "hidden", marginTop: 8,
      }}
    >
      {/* La bandera: celeste, blanco, celeste. */}
      <div style={{ width: 4, flexShrink: 0, background: `linear-gradient(180deg, ${CELESTE} 0 33.33%, #fff 33.33% 66.66%, ${CELESTE} 66.66% 100%)` }} />

      <a
        href={LANDING_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={tr("home.landingAria")}
        style={{
          flex: 1, minWidth: 0, position: "relative", height: alto,
          textDecoration: "none", display: "block",
        }}
      >
        {LAMINAS.map((l, i) => (
          <div
            key={l.titulo}
            aria-hidden={i !== activa}
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", gap: 14,
              // El hueco de la derecha es para el botón del asistente, que se
              // estaciona en esa esquina: sin reservarlo, la pelotita azul le
              // queda justo encima al "Conocer más" y se come la flecha.
              padding: isMobile ? "0 62px 0 14px" : "0 76px 0 20px",
              opacity: i === activa ? 1 : 0,
              transition: "opacity .5s ease",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5 }}>
                {tr("home.landingKicker")}
              </div>
              <div style={{ fontSize: isMobile ? 14.5 : 16, fontWeight: 800, color: "#111827", letterSpacing: "-.2px", marginBottom: 3 }}>
                {tr(l.titulo)}
              </div>
              <div style={{ fontSize: isMobile ? 12 : 12.5, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tr(l.sub)}
              </div>
            </div>
            {/* El auto de la marca, apenas insinuado: es un adorno, no un botón. */}
            {!isMobile && (
              <div style={{ flexShrink: 0, opacity: .16, paddingRight: 8 }}>
                <LogoMark size={30} accent="#0b55c0" />
              </div>
            )}
            <div style={{ flexShrink: 0, fontSize: isMobile ? 12.5 : 13, fontWeight: 700, color: "#0f6ce6", whiteSpace: "nowrap" }}>
              {tr("home.landingGo")} →
            </div>
          </div>
        ))}
      </a>

      {/* Los puntitos van afuera del enlace: adentro, tocarlos abriría la landing
          en vez de cambiar de lámina. */}
      <div style={{ position: "absolute", right: isMobile ? 62 : 76, bottom: 8, display: "flex", gap: 5 }}>
        {LAMINAS.map((l, i) => (
          <button
            key={l.titulo}
            type="button"
            onClick={() => irA(i)}
            aria-label={`${i + 1}`}
            aria-current={i === activa}
            style={{
              width: 5, height: 5, minHeight: 5, padding: 0, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: i === activa ? "#0f6ce6" : "#d8dbe0",
              transition: "background .25s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
