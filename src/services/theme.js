// ============================================================================
//  theme.js — Modo oscuro
// ----------------------------------------------------------------------------
//  CÓMO FUNCIONA Y POR QUÉ: la app tiene los colores escritos a mano en cada
//  componente (estilos inline con hex fijos, miles de ellos), así que no hay un
//  lugar donde cambiar "el blanco por un gris oscuro". Lo que sí se puede hacer
//  desde un solo lugar es invertir el documento entero y volver a invertir las
//  imágenes, que es lo que se hace acá.
//
//  QUÉ SE ARREGLÓ: la versión anterior usaba `invert(1)` pelado. Eso deja el
//  blanco en NEGRO PURO —la pantalla queda dura de mirar— y encima invierte las
//  sombras, así que cada tarjeta terminaba rodeada de un resplandor blanco. Por
//  eso se veía fea.
//
//  Ahora:
//   · `contrast(.82)` levanta el piso: el blanco no cae a #000 sino a un gris
//     oscuro, que es lo que se pidió (que no se vea TAN oscura);
//   · `saturate(1.2)` devuelve el color que la inversión apaga, así los azules
//     de la marca siguen siendo azules y no un gris azulado;
//   · las sombras se reemplazan por un contorno tenue, para que las tarjetas se
//     sigan distinguiendo del fondo sin el resplandor blanco;
//   · las imágenes, videos y el mapa se vuelven a invertir con exactamente el
//     mismo `invert(1) hue-rotate(180deg)`, que aplicado dos veces devuelve el
//     original tal cual (con un valor intermedio no volvería, quedarían lavadas).
//
//  LÍMITE HONESTO: esto es un filtro sobre lo que ya está pintado, no una paleta
//  oscura de verdad. Para eso habría que sacar los colores de los componentes y
//  llevarlos a variables CSS, que es un trabajo grande y aparte.
// ============================================================================

const STYLE_ID = "fw-dark-style";

// Inserta una sola vez en el <head> la etiqueta <style> con las reglas del modo
// oscuro. Si ya existe, no hace nada (evita duplicados).
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    html.fw-dark { background: #131a26 !important; }
    html.fw-dark, html.fw-dark body { background-color: #131a26; }

    /* La inversión, con el piso levantado y el color recuperado. */
    html.fw-dark {
      filter: invert(1) hue-rotate(180deg) contrast(.82) saturate(1.2);
    }

    /* Todo lo que ya es una imagen se deshace el filtro de arriba ENTERO, para
       verse igual que en modo claro.

       Antes acá decía solo "invert(1) hue-rotate(180deg)", y eso deshace la
       inversión pero NO el contrast(.82) ni el saturate(1.2) de la regla de
       arriba. O sea que cada foto de la aplicación quedaba con el contraste
       bajado y los colores forzados: se veía lavada. En una foto clara casi no
       se nota; en la propaganda, que es una foto oscura, se notaba muchísimo
       —se aclaraba entera y dejaba de leerse—.

       Para deshacer una cadena de filtros hay que aplicar la inversa de cada uno
       EN EL ORDEN CONTRARIO, porque el filtro del elemento se aplica primero y
       el del <html> después, envolviéndolo:

         html   →  invert(1)  hue-rotate(180)  contrast(.82)  saturate(1.2)
         imagen →  saturate(1/1.2)  contrast(1/.82)  hue-rotate(180)  invert(1)

       Así cada operación queda pegada a su inversa y la cadena entera se anula.
       1/1.2 = .8333 y 1/.82 = 1.2195. El hue-rotate es su propia inversa a 180
       grados, y el invert también. */
    html.fw-dark img,
    html.fw-dark video,
    html.fw-dark canvas,
    html.fw-dark [data-no-invert],
    html.fw-dark .leaflet-container,
    html.fw-dark .leaflet-tile {
      filter: saturate(.8333) contrast(1.2195) hue-rotate(180deg) invert(1);
    }

    /* Las sombras invertidas se ven como un halo blanco alrededor de cada
       tarjeta. Se cambian por un contorno, que cumple la misma función de
       separar la tarjeta del fondo. */
    html.fw-dark [style*="box-shadow"] {
      box-shadow: none !important;
      outline: 1px solid rgba(0,0,0,.10);
      outline-offset: -1px;
    }
  `;
  document.head.appendChild(el);
}

// Activa (on=true) o desactiva el modo oscuro agregando/quitando la clase
// "fw-dark" en el <html>, que es la que dispara el filtro de inversión.
export function applyDarkMode(on) {
  ensureStyle();
  const root = document.documentElement;
  if (on) root.classList.add("fw-dark");
  else root.classList.remove("fw-dark");
}

// Lee la preferencia guardada y la aplica (para el arranque de la app).
export function initTheme() {
  let dark = false;
  try { dark = !!(JSON.parse(localStorage.getItem("fw_prefs") || "{}").dark); } catch { dark = false; }
  applyDarkMode(dark);
}
