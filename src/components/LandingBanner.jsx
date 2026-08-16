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
        style={{
          ...aTodoElAncho, position: "relative", lineHeight: 0,
          /*
            `containerType: inline-size` convierte a este enlace en la unidad de
            medida de lo que tiene adentro: las unidades `cqw` de abajo son
            porcentajes de SU ancho.

            Es lo que hace que la frase quede siempre en el mismo lugar del
            dibujo, sea en un monitor de 27 pulgadas o en un teléfono. Con
            tamaños en píxeles, el texto que en la computadora entra en tres
            renglones sobre el fondo azul, en el teléfono le pasa por encima al
            auto; y con `vw` se mediría la ventana entera, que no es lo mismo que
            el ancho de la franja porque a la izquierda está el menú.
          */
          containerType: "inline-size",
        }}
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

        {/*
          LA FRASE, a la izquierda del auto.

          Va como texto y no dentro de la imagen justamente para que cambie con
          el idioma: metida en el JPG habría que dibujar cinco propagandas, una
          por idioma, y volver a dibujarlas todas cada vez que se corrija una
          coma.

          La tipografía es una serif en itálica, que es la de la propaganda y NO
          la del resto de la aplicación. Es a propósito y es la única excepción:
          la frase tiene que leerse como parte del aviso, no como un texto de la
          app apoyado encima. Georgia está en Windows, en Mac, en Android y en
          iOS, así que se ve igual en todos lados sin descargar nada.
        */}
        <span style={{
          position: "absolute", left: "5%", top: "50%",
          transform: "translateY(-50%)",
          width: "21%",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: "italic", fontWeight: 700,
          fontSize: "3.7cqw", lineHeight: 1.08,
          color: "#f4efe2",
          // Una sombra apenas: abajo del texto el fondo pintado tiene manchas
          // claras y oscuras, y sobre las claras la letra crema se pierde.
          textShadow: "0 1px 10px rgba(0,0,0,.45)",
          letterSpacing: "-.01em",
        }}>
          {tr("home.adOverlay")}
        </span>

        {/*
          EL CURSOR, debajo de la última L de FREEWHEEL.

          Está quieto. Antes hacía clic solo cada dos segundos y medio, con tres
          rayitas saltando de la punta; sacado eso, lo que queda dice lo mismo con
          menos ruido: una flecha de mouse apoyada sobre una imagen ya se lee como
          "esto se toca".

          DÓNDE ESTÁ LA ÚLTIMA L. Se midió leyendo los píxeles del archivo, no a
          ojo: buscando las columnas claras sobre el panel oscuro, la última
          letra va del 91.4% al 94.2% del ancho, así que su centro cae en el
          92.8% —o sea a 7.2% del borde derecho—. De ahí sale el `right`: se
          corre media flecha más para que lo que quede centrado bajo la letra sea
          el dibujo y no el borde de su cuadro.

          Hay que buscar el hueco entre letras y no repartir la palabra en nueve
          partes iguales: FREEWHEEL tiene una W, que es casi el doble de ancha
          que una L, y el reparto parejo daba 92.1% —ocho píxeles corrido a la
          izquierda, que a ese tamaño se ve—.

          POR QUÉ VA PEGADO AL BORDE DE ABAJO Y NO JUSTO DEBAJO DE LAS LETRAS.
          El botón del asistente flota sobre toda la aplicación y se estaciona
          en esa misma esquina: ocupa una franja de 50px que termina 80px arriba
          del borde de la ventana. La propaganda es lo último de la página, así
          que con la pantalla abajo del todo su base queda a 28px de ese borde:
          entre el botón y el final de la imagen quedan 52px libres, y ese es el
          único lugar de la esquina derecha donde el cursor no se le encima.
          Midiendo con la ventana en 1600, 1440, 1366, 1280 y 1100, poner la
          flecha más arriba —pegada a las letras, que es donde iría— la deja
          tocando el botón desde los 1300px para abajo, y ahí deja de leerse como
          "tocá la propaganda" y pasa a leerse como "tocá el chat", que es
          justamente lo contrario.

          Por eso también el tamaño va en píxeles y no en `cqw`: tiene que entrar
          en esos 52px sea cual sea el ancho de la pantalla. Y no se pierde nada,
          porque un puntero de mouse es un objeto de tamaño real —en la pantalla
          mide siempre lo mismo, no crece con la ventana—.

          EN EL TELÉFONO NO VA. Ahí la franja mide 95px de alto, el botón del
          asistente se le apoya justo encima de esa esquina y lo tapa entero: no
          quedan 52px libres ni nada parecido. Y aunque quedaran, un puntero de
          mouse en una pantalla táctil está diciendo algo que no existe —no hay
          mouse—, así que en el teléfono el dedo ya sabe que la propaganda se
          toca y la flecha sobra.
        */}
        {!isMobile && (
          <span aria-hidden="true" style={{
            position: "absolute",
            // 7.2% es el centro de la L; los 19px son la mitad de la flecha.
            right: "calc(7.2% - 19px)", bottom: 6,
            width: 38, height: 38,
            display: "block", pointerEvents: "none",
          }}>
            <svg viewBox="0 0 24 24"
              style={{ width: "100%", height: "100%", display: "block" }}>
              <path
                d="M5.5 3.2 L18.3 12.4 L12.2 13.1 L15 19.6 L12.1 20.9 L9.3 14.4 L5.5 18.7 Z"
                fill="#fff" stroke="#0b1220" strokeWidth="1.1" strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
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
