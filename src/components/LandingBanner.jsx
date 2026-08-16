// ============================================================================
//  LandingBanner — La propaganda del final del inicio, que lleva a la landing
// ----------------------------------------------------------------------------
//  QUÉ REEMPLAZA, y por qué no alcanzaba
//  Antes esto era un carrusel: una barra blanca, angosta, con tres frases que se
//  iban turnando, un rótulo, un subtítulo y una barrita celeste al costado. El
//  problema no era el detalle sino la categoría: se veía como una fila más de la
//  pantalla —una notificación, un aviso del sistema— y ninguna fila invita a
//  salir de la app. Encima había mucho texto para leer antes de entender qué era.
//
//  Una propaganda funciona al revés: una sola frase, un botón, y algo que se
//  mueva para que el ojo vaya ahí.
//
//  CÓMO SE PLANTÓ
//   · A TODO EL ANCHO. Sale de los márgenes del contenido con márgenes negativos
//     —el mismo recurso que el bloque azul de arriba— y va sin redondeo. Ocupar
//     el ancho completo es lo que la saca de la grilla de tarjetas y la convierte
//     en otra cosa.
//   · FONDO OSCURO. Toda la pantalla es blanca con tarjetas claras; el único otro
//     bloque azul es el de arriba de todo. Repetirlo abajo cierra la página.
//   · EN MOVIMIENTO CONTINUO. Franjas diagonales que cruzan el fondo sin parar,
//     un resplandor que va y viene, y el auto flotando apenas. Los keyframes
//     están en theme.css (fw-ad-*), que es donde tienen que estar: no se pueden
//     declarar en un estilo en línea.
//   · SIN BANDERA. La versión anterior tenía una franja celeste-blanco-celeste
//     al costado. Con el fondo oscuro y el movimiento no hace falta explicar
//     nada más; un tercer elemento decorativo sería ruido.
//
//  Es un <a> de verdad y no un div con onClick: se puede abrir en otra pestaña
//  con el botón del medio, se copia el link con el botón derecho, y un lector de
//  pantalla lo anuncia como lo que es.
// ============================================================================
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

export default function LandingBanner() {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();

  return (
    <a
      href={LANDING_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={tr("home.landingAria")}
      style={{
        display: "block", position: "relative", overflow: "hidden",
        textDecoration: "none", color: "#fff",
        background: "linear-gradient(105deg, #081527 0%, #0b55c0 58%, #0f6ce6 100%)",
        // A todo el ancho: los mismos márgenes negativos que el bloque de arriba.
        marginLeft: isMobile ? -16 : -32,
        marginRight: isMobile ? -16 : -32,
        marginTop: isMobile ? 28 : 36,
        // Más aire a la derecha en escritorio: ahí se estaciona el botón del
        // asistente, y sin reservarle el lugar la pelotita azul le queda pegada
        // al auto de la marca.
        padding: isMobile ? "30px 20px" : "44px 84px 44px 44px",
        minHeight: isMobile ? 0 : 128,
      }}
    >
      {/* Las franjas del asfalto, cruzando sin parar. */}
      <span
        className="fw-ad-rayas"
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,.075) 0 2px, rgba(255,255,255,0) 2px 70px)",
          backgroundSize: "280px 100%",
        }}
      />
      {/* El resplandor que va y viene. */}
      <span
        className="fw-ad-luz"
        aria-hidden="true"
        style={{
          position: "absolute", top: "-70%", right: "-10%",
          width: "70%", height: "240%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(96,165,250,.55) 0%, rgba(96,165,250,0) 68%)",
        }}
      />

      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        gap: isMobile ? 18 : 28, maxWidth: 1180, margin: "0 auto",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 21 : 30, fontWeight: 800, letterSpacing: "-.6px",
            lineHeight: 1.15,
          }}>
            {tr("home.adTitle")}
          </div>
          {/* El botón NO es un botón: es la pinta de uno dentro del enlace. Un
              <button> adentro de un <a> es HTML inválido y además cualquiera de
              los dos se comería el clic del otro. */}
          <span style={{
            display: "inline-block", marginTop: isMobile ? 14 : 18,
            background: "#fff", color: "#0b55c0",
            fontSize: isMobile ? 13.5 : 14.5, fontWeight: 800,
            padding: isMobile ? "10px 20px" : "12px 26px",
            borderRadius: 4,
          }}>
            {tr("home.adCta")}
          </span>
        </div>

        {/* El auto de la marca, grande y flotando. En el teléfono no entra al
            lado del texto sin achicar la frase, así que no se dibuja. */}
        {!isMobile && (
          <div className="fw-ad-auto" aria-hidden="true" style={{ flexShrink: 0, opacity: .9 }}>
            <LogoMark size={62} accent="rgba(255,255,255,.9)" />
          </div>
        )}
      </div>
    </a>
  );
}
