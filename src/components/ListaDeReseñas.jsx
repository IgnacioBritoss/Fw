// ============================================================================
//  ListaDeReseñas — Las reseñas que recibió una persona, para leerlas
// ----------------------------------------------------------------------------
//  POR QUÉ ESTÁ EN SU PROPIO ARCHIVO. Este dibujo vivía adentro del modal que se
//  abre desde el chat, y era el ÚNICO lugar de la app donde se podían leer las
//  reseñas de alguien. O sea que uno podía ver las reseñas de cualquiera menos
//  las propias: para leer lo que le habían escrito había que entrar al chat con
//  otra persona, abrir SU ficha, y no servía. Copiarlo en el perfil hubiera
//  dejado dos listas que se desincronizan el día que se toque una.
//
//  QUÉ MUESTRA CADA RESEÑA, Y EN QUÉ ORDEN
//   · Quién la escribió —con su foto—, cuántas estrellas puso y cuándo.
//   · DESDE QUÉ LADO. No es lo mismo que te califique el dueño de un auto que
//     alguien que alquiló el tuyo: son dos reputaciones distintas.
//   · Las características elegidas. Van ANTES del texto porque muchas reseñas no
//     tienen texto: marcar casillas es un clic y escribir un párrafo no lo hace
//     casi nadie. Sin ellas, esas reseñas eran una fecha y unas estrellas.
//   · El comentario, si lo hay.
//
//  ── POR QUÉ LAS CARACTERÍSTICAS SE DIBUJAN ASÍ ────────────────────────────
//  Eran cápsulas de fondo verde o rojo, una al lado de la otra. Cuatro de esas
//  en una reseña tapaban el comentario: el color más fuerte de la tarjeta se lo
//  llevaba lo accesorio, y lo que la persona se tomó el trabajo de escribir
//  quedaba abajo en gris. Ahora el fondo es neutro y el signo lo lleva un punto
//  chiquito con ✓ o ×: se sigue viendo de un vistazo de qué lado está cada una,
//  sin que la tarjeta parezca un semáforo.
//
//  Es el mismo punto que usan el formulario de reseña y la planilla de
//  reputación. Que sea el mismo en los tres lados es lo que hace que se lea como
//  una sola aplicación y no como tres pantallas parecidas.
//
//  Props:
//   · reviews  → la lista tal como la devuelve el servidor
//   · vacio    → qué decir cuando no hay ninguna (cambia según sea el perfil
//                propio o el de otro)
// ============================================================================
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import { atributo, esBueno } from "../services/atributos";
import { initialsOf } from "../services/people";
import Avatar from "./Avatar";

/**
 * Una característica de una reseña, en modo lectura.
 *
 * Es una función que devuelve JSX y no un componente aparte a propósito: el
 * nombre de este archivo lleva una ñ, y la regla de recarga en caliente no
 * reconoce como componente a nada que tenga letras fuera del inglés, así que un
 * segundo componente acá adentro se marca como error. Un ayudante en minúscula
 * no es un componente para nadie y hace exactamente lo mismo.
 */
const marca = (code, texto) => {
  const bueno = esBueno(code);
  return (
    <span key={code} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, lineHeight: 1.5, padding: "3px 9px",
      borderRadius: 7, background: "var(--fw-surface-2)",
      border: "1px solid var(--fw-line-soft)", color: "var(--fw-text-2)",
    }}>
      <span
        aria-hidden="true"
        style={{
          width: 12, height: 12, flexShrink: 0, borderRadius: 999,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: bueno ? "var(--fw-green)" : "var(--fw-red)",
          color: "#fff", fontSize: 8, fontWeight: 900, lineHeight: 1,
        }}
      >
        {bueno ? "✓" : "×"}
      </span>
      {texto}
    </span>
  );
};

export default function ListaDeReseñas({ reviews = [], vacio }) {
  const { t: tr, lang } = useI18n();

  const nombreDe = (persona) =>
    persona?.displayName
    || `${persona?.firstName || ""} ${persona?.lastName || ""}`.trim()
    || tr("profile.userFallback");

  if (!reviews.length) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--fw-text-4)", margin: 0, lineHeight: 1.6 }}>
        {vacio || tr("profile.noReviewsYet")}
      </p>
    );
  }

  return (
    <div>
      {reviews.map((review) => {
        const nombre = nombreDe(review.author);
        return (
          <div key={review.id} style={{ borderTop: "1px solid var(--fw-line-soft)", padding: "13px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {/* La foto de quien escribió. Una lista de nombres sueltos se lee
                  como un formulario; con la cara se lee como gente. */}
              <Avatar src={review.author?.profilePhotoUrl} initials={initialsOf(review.author)} size={32} alt={nombre} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "var(--fw-text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {nombre}
                  </span>
                  <span style={{ whiteSpace: "nowrap", fontSize: 12.5, letterSpacing: .5 }}>
                    <span style={{ color: "var(--fw-amber)" }}>{"★".repeat(review.rating)}</span>
                    <span style={{ color: "var(--fw-border-2)" }}>{"★".repeat(5 - review.rating)}</span>
                  </span>
                </div>
                {/* Desde qué lado se escribió, y cuándo. */}
                <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 2 }}>
                  {review.listingId ? tr("profile.asOwner") : tr("profile.asDriver")}
                  {" · "}
                  {shortDate(review.createdAt, lang)}
                </div>
              </div>
            </div>

            {Array.isArray(review.tags) && review.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, marginLeft: 42 }}>
                {/* Se saltean los códigos que este front no conozca: si el servidor
                    agrega uno nuevo, la pantalla vieja lo ignora en vez de mostrar
                    un código crudo en pantalla. */}
                {review.tags.filter(atributo).map((code) => marca(code, tr(`attr.${code}`)))}
              </div>
            )}

            {review.comment && (
              <div style={{ fontSize: 13, color: "var(--fw-text-2)", marginTop: 8, marginLeft: 42, lineHeight: 1.6 }}>
                {review.comment}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
