// ============================================================================
//  LandingBanner — La propaganda del final del inicio, que lleva a la landing
// ----------------------------------------------------------------------------
//  ES UNA IMAGEN, no un bloque dibujado con CSS.
//
//  La versión anterior armaba la propaganda con código: un fondo azul con
//  degradado, unas franjas moviéndose, una frase y un botón. Se veía prolija,
//  pero se veía a "componente de aplicación": el mismo azul y la misma tipografía
//  que el resto de la pantalla. Una propaganda de verdad tiene otra cosa —una
//  foto, una tipografía propia, una composición— y eso no se dibuja con CSS: es
//  una pieza de diseño y entra como archivo.
//
//  DÓNDE VA EL ARCHIVO
//  En `public/propaganda.jpg`. Todo lo que está en `public/` se copia tal cual al
//  sitio publicado, así que desde acá se lo pide como `/propaganda.jpg`.
//
//  QUÉ PASA SI EL ARCHIVO NO ESTÁ
//  No se ve un recuadro roto con el ícono de imagen partida. Si la imagen no
//  carga, `onError` prende el respaldo y se dibuja la versión de antes —el bloque
//  azul con la frase y el botón—, que funciona sola. Importa porque el archivo
//  vive fuera del código: alguien puede clonar el repositorio, o borrar el
//  archivo sin querer, y la home no se puede romper por eso.
//
//  A TODO EL ANCHO
//  Sale de los márgenes del contenido con márgenes negativos, el mismo recurso
//  que el bloque azul de arriba, y la imagen ocupa el 100% de ese ancho. El alto
//  lo pone la imagen con su propia proporción (`height: auto`): así no se recorta
//  ni se deforma en ninguna pantalla, que en una pieza de diseño donde el texto
//  es parte del dibujo es lo único aceptable.
//
//  Es un <a> de verdad y no un div con onClick: se abre en otra pestaña con el
//  botón del medio, se copia el link con el derecho, y un lector de pantalla lo
//  anuncia como enlace. Por eso también lleva `alt` con el texto de la imagen:
//  quien no la ve tiene que recibir lo mismo que dice el dibujo.
// ============================================================================
import { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useI18n } from "../i18n/core";
import { LogoMark } from "./Logo";

/**
 * A dónde va. Sale de una variable de entorno para poder cambiarla sin tocar el
 * código, y el valor de abajo es donde está publicada hoy.
 *
 * El `#top` del final es a propósito: la landing tiene su propia animación de
 * entrada atada al scroll, y sin ancla el navegador a veces recuerda la posición
 * de una visita anterior y la página aparece por la mitad.
 */
const LANDING_URL =
  import.meta.env.VITE_LANDING_URL || "https://landing-page-free-wheel.vercel.app/#top";

const IMAGEN = "/propaganda.jpg";

export default function LandingBanner() {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();
  const [sinImagen, setSinImagen] = useState(false);
  const [encima, setEncima] = useState(false);

  // Los márgenes que la sacan del contenido y la llevan de borde a borde.
  const aTodoElAncho = {
    display: "block",
    marginLeft: isMobile ? -16 : -32,
    marginRight: isMobile ? -16 : -32,
    marginTop: isMobile ? 28 : 36,
    textDecoration: "none",
  };

  if (!sinImagen) {
    return (
      /*
        El <a> es `position: relative` y la imagen va adentro a propósito: lo que
        se le quiera poner ENCIMA a la propaganda —un texto, un botón— entra como
        un hijo posicionado de este mismo enlace, y queda dentro del área que ya
        es clickeable. Si se agregara al lado, habría que volver a resolver el
        clic y la superposición.
      */
      <a
        href={LANDING_URL}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
        style={{ ...aTodoElAncho, position: "relative", lineHeight: 0 }}
      >
        <img
          src={IMAGEN}
          alt={tr("home.landingAria")}
          onError={() => setSinImagen(true)}
          style={{
            display: "block", width: "100%", height: "auto",
            // Sin redondeo: una propaganda con las puntas redondeadas se lee
            // como una tarjeta más de la pantalla.
            borderRadius: 0,
            // Se aclara apenas al pasarle por encima. La imagen no dice "tocá
            // acá" en ninguna parte, así que hace falta alguna señal de que es
            // un enlace; el cursor solo no alcanza, y menos en una pantalla
            // táctil donde no hay cursor.
            filter: encima ? "brightness(1.06)" : "none",
            transition: "filter .2s ease",
          }}
        />
      </a>
    );
  }

  /*
    RESPALDO — la propaganda dibujada, para cuando la imagen no está.

    Es la versión anterior, con el fondo en movimiento (los keyframes viven en
    theme.css, fw-ad-*). No es un cartel de error: alguien que entre sin el
    archivo tiene que ver una propaganda que funciona, no un aviso de que falta
    algo.
  */
  return (
    <a
      href={LANDING_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={tr("home.landingAria")}
      style={{
        ...aTodoElAncho,
        position: "relative", overflow: "hidden", color: "#fff",
        background: "linear-gradient(105deg, #081527 0%, #0b55c0 58%, #0f6ce6 100%)",
        padding: isMobile ? "30px 20px" : "44px 84px 44px 44px",
      }}
    >
      <span className="fw-ad-rayas" aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(115deg, rgba(255,255,255,.075) 0 2px, rgba(255,255,255,0) 2px 70px)",
        backgroundSize: "280px 100%",
      }} />
      <span className="fw-ad-luz" aria-hidden="true" style={{
        position: "absolute", top: "-70%", right: "-10%",
        width: "70%", height: "240%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(96,165,250,.55) 0%, rgba(96,165,250,0) 68%)",
      }} />

      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        gap: isMobile ? 18 : 28, maxWidth: 1180, margin: "0 auto",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 21 : 30, fontWeight: 800,
            letterSpacing: "-.6px", lineHeight: 1.15,
          }}>
            {tr("home.adTitle")}
          </div>
          <span style={{
            display: "inline-block", marginTop: isMobile ? 14 : 18,
            background: "#fff", color: "#0b55c0",
            fontSize: isMobile ? 13.5 : 14.5, fontWeight: 800,
            padding: isMobile ? "10px 20px" : "12px 26px", borderRadius: 4,
          }}>
            {tr("home.adCta")}
          </span>
        </div>
        {!isMobile && (
          <div className="fw-ad-auto" aria-hidden="true" style={{ flexShrink: 0, opacity: .9 }}>
            <LogoMark size={62} accent="rgba(255,255,255,.9)" />
          </div>
        )}
      </div>
    </a>
  );
}
