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
//   · Quién la escribió y cuántas estrellas puso.
//   · DESDE QUÉ LADO. No es lo mismo que te califique el dueño de un auto que
//     alguien que alquiló el tuyo: son dos reputaciones distintas.
//   · Las características elegidas. Van ANTES del texto porque muchas reseñas no
//     tienen texto: marcar casillas es un clic y escribir un párrafo no lo hace
//     casi nadie. Sin ellas, esas reseñas eran una fecha y unas estrellas.
//   · El comentario, si lo hay.
//
//  Props:
//   · reviews  → la lista tal como la devuelve el servidor
//   · vacio    → qué decir cuando no hay ninguna (cambia según sea el perfil
//                propio o el de otro)
// ============================================================================
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import { atributo, esBueno } from "../services/atributos";

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
      {reviews.map((review) => (
        <div key={review.id} style={{ borderBottom: "1px solid var(--fw-line-soft)", paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)" }}>
              {nombreDe(review.author)}
            </span>
            <span style={{ color: "var(--fw-amber)", fontSize: 12.5, whiteSpace: "nowrap" }}>
              {"★".repeat(review.rating)}
            </span>
          </div>
          {/* Desde qué lado se escribió, y cuándo. */}
          <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 2 }}>
            {review.listingId ? tr("profile.asOwner") : tr("profile.asDriver")}
            {" · "}
            {shortDate(review.createdAt, lang)}
          </div>
          {Array.isArray(review.tags) && review.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {/* Se saltean los códigos que este front no conozca: si el servidor
                  agrega uno nuevo, la pantalla vieja lo ignora en vez de mostrar
                  un código crudo en pantalla. */}
              {review.tags.filter(atributo).map((code) => (
                <span key={code} style={{
                  fontSize: 11, lineHeight: 1.5, padding: "2px 8px", borderRadius: 999,
                  background: esBueno(code) ? "var(--fw-green-bg)" : "var(--fw-red-bg)",
                  color: esBueno(code) ? "var(--fw-green-text-2)" : "var(--fw-red-text-2)",
                  border: `1px solid ${esBueno(code) ? "var(--fw-green-line)" : "var(--fw-red-line)"}`,
                }}>
                  {tr(`attr.${code}`)}
                </span>
              ))}
            </div>
          )}
          {review.comment && (
            <div style={{ fontSize: 13, color: "var(--fw-text-2)", marginTop: 6, lineHeight: 1.6 }}>
              {review.comment}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
