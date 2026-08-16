// ============================================================================
//  LandingCarousel — La franja del final de la home que lleva a la presentación
// ----------------------------------------------------------------------------
//  QUÉ SE HACE ACÁ
//  Una barra al final del inicio que va pasando tres frases sobre el proyecto.
//  Al tocarla se abre la landing.
//
//  POR QUÉ SE DESLIZA Y NO SE FUNDE
//  La primera versión cambiaba de lámina con un fundido: las tres estaban
//  apiladas y se prendía y apagaba la opacidad. Se ve como un parpadeo, no como
//  un carrusel; no hay dirección, no se entiende que hay tres cosas y que van
//  pasando. Ahora son tres paneles en fila que se corren de a uno con
//  `transform: translateX`, que es la única propiedad que el navegador puede
//  animar sin rehacer el dibujo de la página. Se ve el movimiento y se entiende
//  para dónde va.
//
//  POR QUÉ NO SE TOCA SI EL SISTEMA PIDE MENOS MOVIMIENTO
//  Con "reducir movimiento" activado (una preferencia de accesibilidad que existe
//  en Android, en iPhone y en Windows) no se desliza ni se adelanta sola: queda la
//  primera lámina quieta y los puntitos siguen andando a mano.
//
//  EL ENLACE
//  Es un <a> de verdad, no un div con onClick: así se puede abrir en otra
//  pestaña con el botón del medio, se copia con el botón derecho, y un lector de
//  pantalla lo anuncia como un enlace. Los puntitos quedan FUERA del <a>, que si
//  no tocarlos abriría la landing en vez de cambiar de lámina.
//
//  LOS COLORES DE ARGENTINA
//  Entran como una barra celeste-blanco-celeste pegada al borde izquierdo, y en
//  el fondo hay un celeste apenas insinuado que se corta antes de la mitad. Es
//  suficiente para que se lea de dónde es sin pintar la pantalla de celeste.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import { useIsMobile } from "../hooks/useIsMobile";
import { LogoMark } from "./Logo";

/**
 * A dónde va. Sale de una variable de entorno para poder cambiarla sin tocar el
 * código, y el valor de abajo es la dirección donde está publicada hoy.
 *
 * El `#top` del final es a propósito: la landing tiene su propia animación de
 * entrada atada al scroll, y al abrirla sin ancla el navegador a veces recuerda
 * la posición de una visita anterior y aparece por la mitad.
 */
const LANDING_URL =
  import.meta.env.VITE_LANDING_URL || "https://landing-page-free-wheel.vercel.app/#top";

// Celeste de la bandera.
const CELESTE = "#75aadb";

const LAMINAS = [
  { titulo: "home.landing1", sub: "home.landing1Sub" },
  { titulo: "home.landing2", sub: "home.landing2Sub" },
  { titulo: "home.landing3", sub: "home.landing3Sub" },
];

const CADA = 5000; // ms entre lámina y lámina

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
  const [encima, setEncima] = useState(false);

  // El temporizador se arma UNA vez y lee el "quieto" de una referencia. Si
  // dependiera del estado, cada vez que el mouse entra o sale se tiraría el
  // temporizador y se armaría otro, y la lámina duraría de más.
  const quietoRef = useRef(false);
  useEffect(() => { quietoRef.current = quieto; }, [quieto]);

  useEffect(() => {
    if (menosMovimiento()) return undefined;
    const reloj = setInterval(() => {
      if (!quietoRef.current) setActiva((i) => (i + 1) % LAMINAS.length);
    }, CADA);
    return () => clearInterval(reloj);
  }, []);

  // La espera después de tocar un puntito. Se guarda para poder cancelarla: si se
  // toca otro antes de tiempo, o se sale de la pantalla, no puede quedar un
  // temporizador suelto tocando el estado de algo que ya no está.
  const espera = useRef(null);
  useEffect(() => () => clearTimeout(espera.current), []);

  const irA = useCallback((i) => {
    setActiva(i);
    setQuieto(true);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setQuieto(false), CADA);
  }, []);

  const alto = isMobile ? 98 : 108;
  const quieta = menosMovimiento();

  return (
    <div
      onMouseEnter={() => { setQuieto(true); setEncima(true); }}
      onMouseLeave={() => { setQuieto(false); setEncima(false); }}
      style={{
        position: "relative", display: "flex", alignItems: "stretch",
        background: "#fff", border: "1px solid #ececec", borderRadius: 4,
        overflow: "hidden", marginTop: 8,
        // Se levanta apenas al pasarle por encima: es lo que avisa que se puede
        // tocar, sin ponerle un borde de color ni agrandarlo.
        boxShadow: encima ? "0 4px 14px rgba(15,23,42,.10)" : "0 0 0 rgba(0,0,0,0)",
        transition: "box-shadow .2s ease",
      }}
    >
      {/* La bandera: celeste, blanco, celeste. */}
      <div style={{
        width: 4, flexShrink: 0,
        background: `linear-gradient(180deg, ${CELESTE} 0 33.33%, #fff 33.33% 66.66%, ${CELESTE} 66.66% 100%)`,
      }} />

      <a
        href={LANDING_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={tr("home.landingAria")}
        style={{
          flex: 1, minWidth: 0, position: "relative", height: alto,
          textDecoration: "none", display: "block", overflow: "hidden",
          // El celeste del fondo, cortado antes de la mitad para que no le pase
          // por atrás al texto.
          background: `linear-gradient(90deg, rgba(117,170,219,.13) 0%, rgba(117,170,219,0) 42%)`,
        }}
      >
        {/*
          La cinta de tres paneles. Mide el triple del ancho y se corre un tercio
          por lámina; cada panel ocupa exactamente un tercio de la cinta, o sea el
          ancho completo de la franja.
        */}
        <div style={{
          display: "flex", width: "300%", height: "100%",
          transform: `translateX(-${activa * (100 / 3)}%)`,
          transition: quieta ? "none" : "transform .55s cubic-bezier(.4,0,.2,1)",
        }}>
          {LAMINAS.map((l, i) => (
            <div
              key={l.titulo}
              aria-hidden={i !== activa}
              style={{
                width: `${100 / 3}%`, flexShrink: 0, boxSizing: "border-box",
                display: "flex", alignItems: "center", gap: 14,
                // El hueco de la derecha es para el botón del asistente, que se
                // estaciona en esa esquina: sin reservarlo, la pelotita azul le
                // queda justo encima al texto.
                padding: isMobile ? "0 60px 0 16px" : "0 78px 0 24px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: "#9ca3af",
                  letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5,
                }}>
                  {tr("home.landingKicker")}
                </div>
                <div style={{
                  fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#111827",
                  letterSpacing: "-.3px", marginBottom: 3,
                }}>
                  {tr(l.titulo)}
                </div>
                <div style={{
                  fontSize: isMobile ? 12 : 13, color: "#6b7280",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {tr(l.sub)}
                </div>
              </div>
              {/* El auto de la marca, apenas insinuado: es un adorno, no un botón. */}
              {!isMobile && (
                <div style={{ flexShrink: 0, opacity: .14 }}>
                  <LogoMark size={32} accent="#0b55c0" />
                </div>
              )}
              {/* Sin flecha: el texto en azul ya dice que se puede tocar, y toda
                  la franja es el enlace. */}
              <div style={{
                flexShrink: 0, fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700,
                color: "#0f6ce6", whiteSpace: "nowrap",
                borderBottom: `1.5px solid ${encima ? "#0f6ce6" : "transparent"}`,
                paddingBottom: 1, transition: "border-color .2s",
              }}>
                {tr("home.landingGo")}
              </div>
            </div>
          ))}
        </div>
      </a>

      {/*
        Los puntitos. Van afuera del enlace —adentro, tocarlos abriría la
        landing— y son botones de 22 px con el punto dibujado adentro: un blanco
        de 5 px no se puede tocar con el dedo.
      */}
      <div style={{
        position: "absolute", right: isMobile ? 52 : 70, bottom: 2,
        display: "flex", gap: 2,
      }}>
        {LAMINAS.map((l, i) => (
          <button
            key={l.titulo}
            type="button"
            onClick={() => irA(i)}
            aria-label={`${i + 1}`}
            aria-current={i === activa}
            style={{
              width: 22, height: 22, minHeight: 22, padding: 0, border: "none",
              background: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{
              display: "block", height: 5, borderRadius: 3,
              // El de la lámina que se está viendo se estira: se distingue del
              // resto aunque la pantalla se vea en blanco y negro.
              width: i === activa ? 14 : 5,
              background: i === activa ? "#0f6ce6" : "#d8dbe0",
              transition: "width .3s ease, background .3s ease",
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}
