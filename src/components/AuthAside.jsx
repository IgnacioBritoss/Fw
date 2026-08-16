// ============================================================================
//  AuthAside — El panel con la foto de las pantallas de entrada
// ----------------------------------------------------------------------------
//  Antes era un degradado azul dibujado con CSS. Se veía prolijo, pero se veía a
//  "componente de aplicación": el mismo azul que el resto de la pantalla, y sin
//  nada que contara de qué se trata esto. Ahora es una foto de un auto, que es
//  literalmente el producto.
//
//  DÓNDE VAN LOS ARCHIVOS
//  En `public/`, así que desde acá se piden como `/auth-login.jpg`. Todo lo que
//  está en `public/` se copia tal cual al sitio publicado.
//
//  QUÉ PASA SI LA FOTO NO ESTÁ
//  Vuelve el degradado de antes. Importa porque el archivo vive FUERA del
//  código: alguien puede clonar el repositorio sin las fotos, o borrar una sin
//  querer, y la pantalla de entrada —que es la única puerta a la app— no se
//  puede romper por eso. Por eso la foto entra como fondo de un <img> con
//  `onError` y no como `background-image`: una imagen de fondo que no carga no
//  avisa, se queda en blanco y nadie se entera.
//
//  EL VELO OSCURO ENCIMA
//  Las dos fotos son de noche, pero igual llevan un velo: el título va en blanco
//  y sobre un cielo claro o un farol se perdería. El velo es más fuerte abajo,
//  que es donde está el texto, y casi transparente arriba, donde no hay nada:
//  así la foto se sigue viendo y el texto se lee siempre.
// ============================================================================
import { useState } from "react";

const FONDO = "linear-gradient(160deg,#0a0f1e 0%,#0d1525 60%,#0f1e3d 100%)";
const RESPLANDOR = "radial-gradient(ellipse at 30% 70%,rgba(37,99,235,.18) 0%,transparent 60%)";

/**
 * El velo. Oscurece del lado donde está el texto y deja la foto casi limpia del
 * otro, así se ve el auto y la letra se lee igual.
 *
 * Por eso hay dos y no uno: el velo tiene que seguir al texto. Con el texto
 * arriba y el velo oscureciendo abajo, la letra queda sobre la parte clara de la
 * foto y se pierde, que es exactamente el problema que resuelve.
 */
const VELO = {
  abajo: "linear-gradient(to bottom, rgba(8,12,24,.28) 0%, rgba(8,12,24,.42) 45%, rgba(8,12,24,.86) 100%)",
  arriba: "linear-gradient(to top, rgba(8,12,24,.28) 0%, rgba(8,12,24,.42) 45%, rgba(8,12,24,.86) 100%)",
};

export default function AuthAside({
  foto, titulo, texto, ancho = "45%", lado = "izquierda",
  posicion = "abajo", arriba, children,
}) {
  const [sinFoto, setSinFoto] = useState(false);
  const hayFoto = foto && !sinFoto;

  return (
    <div style={{
      /*
        VA FIJO, no como una columna más de la fila.

        Antes era un hijo flex al 42% que se estiraba hasta el alto de la fila.
        El problema es que ese alto no siempre coincide con el de la página: en
        el registro el formulario mide más que la ventana, y la fila se quedaba
        en los 800px del `minHeight:100vh` mientras la página scroleaba unos
        cien píxeles más. Esos cien píxeles quedaban en blanco debajo del panel
        —que es justo lo que se veía—, y no había forma de arreglarlo estirando
        el panel, porque el panel ya estaba estirado al 100% de una fila que
        medía de menos.

        Fijo el problema no existe: el panel mide siempre exactamente la ventana,
        pegado arriba y abajo, scrolee la página lo que scrolee. Y de paso la
        foto se queda quieta mientras el formulario sube, que se ve mejor que
        una foto de 1200px estirada.
      */
      position: "fixed", top: 0, bottom: 0,
      [lado === "derecha" ? "right" : "left"]: 0,
      width: ancho,
      // El degradado queda SIEMPRE puesto de fondo, incluso con la foto: es lo
      // que se ve mientras la foto todavía está bajando, así que en vez de un
      // rectángulo blanco que parpadea se ve el panel de siempre.
      background: FONDO,
      display: "flex", flexDirection: "column",
      // Con el texto abajo, el logo y el texto se reparten a los extremos. Con el
      // texto arriba van los dos juntos arriba y el resto de la foto queda libre.
      justifyContent: posicion === "arriba" ? "flex-start" : "space-between",
      padding: "48px 52px", overflow: "hidden",
    }}>
      {hayFoto ? (
        <>
          <img
            src={foto}
            alt=""
            aria-hidden="true"
            onError={() => setSinFoto(true)}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              // `cover` recorta lo que sobra en vez de deformar el auto. Las dos
              // fotos son verticales y el panel también, así que lo que se
              // recorta es poco.
              objectFit: "cover",
              // El centro de las dos fotos es el auto: encuadrando por el medio
              // queda entero aunque el panel sea más alto o más bajo.
              objectPosition: "center",
            }}
          />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: VELO[posicion] }} />
        </>
      ) : (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: RESPLANDOR }} />
      )}

      {/* El logo (y lo que se le quiera poner al lado). */}
      {arriba && <div style={{ position: "relative" }}>{arriba}</div>}

      {/* El título y la bajada, arriba o abajo según `posicion`. */}
      <div style={{ position: "relative", marginTop: posicion === "arriba" && arriba ? 28 : 0 }}>
        {titulo && (
          <h1 style={{
            fontSize: 38, fontWeight: 800, color: "#fff",
            lineHeight: 1.15, letterSpacing: "-1px", marginBottom: 16,
            // Con la foto atrás la letra necesita un poco de peso propio: el
            // velo resuelve el promedio, no una rama de árbol justo detrás de
            // una letra.
            textShadow: "0 2px 20px rgba(0,0,0,.5)",
          }}>
            {titulo}
          </h1>
        )}
        {texto && (
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,.78)", lineHeight: 1.65,
            maxWidth: 380, textShadow: "0 1px 12px rgba(0,0,0,.5)",
          }}>
            {texto}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
