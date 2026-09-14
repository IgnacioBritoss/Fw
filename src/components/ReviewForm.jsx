// ============================================================================
//  ReviewForm — Dejar una reseña de una reserva terminada
// ----------------------------------------------------------------------------
//  Estrellas de 1 a 5 (obligatorias), qué pasó en cada aspecto (opcional) y un
//  comentario (opcional).
//
//  ── POR QUÉ SE PREGUNTA ALGO MÁS QUE LAS ESTRELLAS ────────────────────────
//  Cinco estrellas dicen CUÁNTO gustó, pero no QUÉ pasó. Dos personas ponen 3
//  estrellas: una porque el dueño tardó dos horas en contestar y la otra porque
//  el auto estaba sucio. Ese 3 no le sirve a nadie: quien lo lee no sabe cuál de
//  las dos cosas le va a tocar, y quien lo recibió no sabe qué corregir.
//
//  Además, el comentario es lo primero que la gente NO escribe. Poner tres
//  estrellas es un clic; contar por qué es un párrafo. Con esto, quien no tiene
//  ganas de escribir igual deja algo que se puede contar, y veinte reseñas se
//  convierten en "contesta rápido, 18 veces" en vez de veinte textos para leer
//  uno por uno.
//
//  ── UN RENGLÓN POR ASPECTO, CON DOS RESPUESTAS ────────────────────────────
//  Antes esto eran quince casillas sueltas repartidas en dos listas, "salió
//  bien" y "salió mal", cada una por su cuenta. Dos problemas, y el segundo es
//  grave:
//
//   · Quince casillas mezcladas no se leen. Se toca lo primero que suena
//     parecido a lo que pasó y el resto queda sin contestar.
//   · Las dos listas no se hablaban, así que se podía marcar "el auto estaba
//     limpio" Y "el auto estaba sucio" en la MISMA reseña. Eso no es una reseña
//     dura: es un dato roto, que después el perfil cuenta dos veces y no dice
//     nada.
//
//  Ahora cada aspecto —puntualidad, limpieza, los cobros— es un renglón con sus
//  dos respuestas, y elegir una apaga la otra. La contradicción ya no se puede
//  escribir, y la pantalla pasó de quince casillas a cinco o seis preguntas
//  claras. Ninguna es obligatoria: se puede contestar una sola, o ninguna.
//
//  ── LO QUE SE PREGUNTA DEPENDE DE A QUIÉN SE ESTÁ RESEÑANDO ───────────────
//  Quien alquiló habla del auto y de la entrega; el dueño habla de cómo lo
//  cuidaron y de cómo lo devolvieron. Preguntarle a un dueño si "el auto estaba
//  como en las fotos" no tiene sentido: las fotos las sacó él. El servidor
//  además lo verifica, así que esto no es solo cosmético.
//
//  Cuándo aparece: solo en las reservas COMPLETADAS y con el pago cerrado, y solo
//  si la persona todavía no dejó la suya. Esa condición la decide el backend
//  (GET /reviews/me/pending): es lo que hace que las puntuaciones signifiquen
//  algo, porque solo puede puntuar quien efectivamente alquiló y pagó.
//
//  Las dos partes se reseñan: quien alquiló puntúa el auto y al dueño, y el dueño
//  puntúa a quien alquiló. El promedio lo recalcula y lo guarda el servidor.
// ============================================================================
import { useMemo, useState } from "react";
import { useI18n } from "../i18n/core";
import { paresPara, MAXIMO } from "../services/atributos";
import { useSacudida } from "../anim";

const LARGO_MAXIMO = 1000;

export default function ReviewForm({ isOwner, onSubmit, onCancel }) {
  const { t: tr } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  // { puntualidad: "PUNTUAL", limpieza: "AUTO_SUCIO", ... } — una respuesta por
  // aspecto como mucho. Guardarlo así es lo que hace imposible la contradicción:
  // no hay lugar donde poner las dos.
  const [respuestas, setRespuestas] = useState({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  /*
    El contador de avisos, para que la sacudida también funcione cuando el
    aviso se repite tal cual. Ver anim/index.js.
  */
  const [avisoNro, setAvisoNro] = useState(0);
  const avisar = (mensaje) => {
    setError(mensaje);
    if (mensaje) setAvisoNro((n) => n + 1);
  };
  const cartelAviso = useSacudida(error ? `${avisoNro}:${error}` : "");

  const shown = hover || rating;

  /*
    `isOwner` dice si QUIEN ESCRIBE es el dueño. Lo que hace falta acá es el
    papel de quien RECIBE, que es el otro: si escribe el dueño, la reseña es
    sobre el conductor.
  */
  const pares = useMemo(
    () => paresPara(isOwner ? "conductor" : "dueño"),
    [isOwner],
  );

  const elegidas = Object.values(respuestas).filter(Boolean);

  const responder = (key, code) => {
    setRespuestas(antes => {
      // Tocar la respuesta que ya estaba la borra: alguien que se equivocó de
      // renglón tiene que poder dejarlo sin contestar, no solo cambiar de lado.
      if (antes[key] === code) {
        const copia = { ...antes };
        delete copia[key];
        return copia;
      }
      /*
        Red de seguridad, no una regla que la persona vaya a ver: hay como mucho
        seis aspectos y cada uno deja elegir una sola respuesta, así que el tope
        del servidor no se puede alcanzar. Está por si algún día se agrega un
        séptimo par: mejor que se ignore el clic a que el servidor rechace la
        reseña entera cuando la persona toca "publicar".
      */
      const nuevas = Object.values({ ...antes, [key]: code }).filter(Boolean);
      if (nuevas.length > MAXIMO) return antes;
      return { ...antes, [key]: code };
    });
  };

  const handleSubmit = async () => {
    if (!rating || sending) return;
    setSending(true);
    avisar("");
    try {
      await onSubmit({ rating, comment: comment.trim(), tags: elegidas });
    } catch (err) {
      avisar(err.message || tr("review.saveFailed"));
      setSending(false);
    }
  };

  /**
   * Una de las dos respuestas de un aspecto.
   *
   * El estado se ve por TRES vías a la vez —el redondel lleno, la letra en
   * negrita y el fondo— porque una sola no alcanza: el color solo deja afuera a
   * quien no lo distingue, y el fondo solo casi no se nota en pantallas malas.
   */
  const Opcion = ({ parKey, code, bueno }) => {
    const puesta = respuestas[parKey] === code;
    const tinta = bueno ? "var(--fw-green)" : "var(--fw-red)";
    return (
      <button
        type="button"
        onClick={() => responder(parKey, code)}
        aria-pressed={puesta}
        style={{
          flex: "1 1 0", minWidth: 0,
          display: "inline-flex", alignItems: "center", gap: 7,
          textAlign: "left", fontFamily: "inherit",
          padding: "9px 11px", border: "none", cursor: "pointer",
          fontSize: 12.5, lineHeight: 1.35, fontWeight: puesta ? 700 : 500,
          background: puesta
            ? (bueno ? "var(--fw-green-bg)" : "var(--fw-red-bg)")
            : "var(--fw-surface)",
          color: puesta
            ? (bueno ? "var(--fw-green-text-2)" : "var(--fw-red-text-2)")
            : "var(--fw-text-2)",
          boxShadow: puesta ? `inset 0 0 0 1.5px ${tinta}` : "none",
          transition: "background .12s, color .12s",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 14, height: 14, flexShrink: 0, borderRadius: 999,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${puesta ? tinta : "var(--fw-border-2)"}`,
            background: puesta ? tinta : "transparent",
            color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1,
          }}
        >
          {puesta ? (bueno ? "✓" : "×") : ""}
        </span>
        <span style={{ minWidth: 0 }}>{tr(`attr.${code}`)}</span>
      </button>
    );
  };

  const puedeEnviar = rating > 0 && !sending;

  return (
    <div style={{
      background: "var(--fw-surface)", border: "1px solid var(--fw-border)",
      borderRadius: 12, padding: 16, marginTop: 10,
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fw-text)", marginBottom: 12 }}>
        {tr(isOwner ? "review.askOwner" : "review.askRenter")}
      </div>

      {/* ── 1 · Las estrellas ────────────────────────────────────────────────
          Son botones de verdad para que se puedan usar con el teclado, y al
          lado va la palabra ("Excelente", "Regular"): el número solo obliga a
          traducir de memoria cuántas estrellas son "bueno". */}
      <div
        role="group"
        aria-label={tr("review.rating")}
        style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 14 }}
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            aria-label={tr("review.outOf5", { value })}
            aria-pressed={rating === value}
            style={{
              background: "none", border: "none", padding: "0 2px", cursor: "pointer",
              fontSize: 30, lineHeight: 1,
              color: value <= shown ? "var(--fw-amber)" : "var(--fw-border-2)",
              transition: "color .12s, transform .12s",
              transform: value <= shown ? "scale(1.04)" : "none",
            }}
          >
            ★
          </button>
        ))}
        <span style={{
          marginLeft: 10, fontSize: 12.5, fontWeight: 600, minHeight: 18,
          color: shown ? "var(--fw-text-2)" : "var(--fw-text-4)",
        }}>
          {shown ? tr(`review.score.${shown}`) : tr("review.ratingHint")}
        </span>
      </div>

      {/* ── 2 · Qué pasó, un renglón por aspecto ─────────────────────────────
          Cada aspecto tiene su título arriba y sus dos respuestas abajo, unidas
          en un solo control. Que estén pegadas no es adorno: es lo que muestra
          que son las dos caras de la MISMA pregunta y que se elige una. */}
      <div style={{ borderTop: "1px solid var(--fw-line-soft)", paddingTop: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--fw-text-4)" }}>
            {tr("review.whatHappened")}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--fw-text-4)" }}>
            {tr("review.optional")}
          </span>
        </div>

        {pares.map(par => (
          <div key={par.key} style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fw-text-3)", marginBottom: 4 }}>
              {tr(`aspect.${par.key}`)}
            </div>
            <div style={{
              display: "flex", alignItems: "stretch",
              border: "1px solid var(--fw-border)", borderRadius: 9, overflow: "hidden",
            }}>
              <Opcion parKey={par.key} code={par.bueno} bueno />
              <div style={{ width: 1, flexShrink: 0, background: "var(--fw-border)" }} />
              <Opcion parKey={par.key} code={par.malo} bueno={false} />
            </div>
          </div>
        ))}
      </div>

      {/* ── 3 · El comentario ────────────────────────────────────────────────*/}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={LARGO_MAXIMO}
          placeholder={tr(isOwner ? "review.phOwner" : "review.phRenter")}
          style={{
            width: "100%", height: 76, padding: "10px 12px 20px", borderRadius: 9,
            border: "1px solid var(--fw-border)", fontSize: 13.5, outline: "none",
            boxSizing: "border-box", resize: "vertical",
            fontFamily: "inherit", color: "var(--fw-text)",
            background: "var(--fw-surface)",
          }}
        />
        {/* El contador solo aparece cuando ya se escribió algo: en blanco sería
            un número al pedo abajo de un campo vacío. */}
        {comment.length > 0 && (
          <span style={{
            // Corrido a la izquierda para no chocar con el tirador con el que se
            // agranda el campo, que el navegador dibuja en la esquina.
            position: "absolute", right: 22, bottom: 8, fontSize: 10.5,
            color: comment.length >= LARGO_MAXIMO ? "var(--fw-red-text-2)" : "var(--fw-text-4)",
            pointerEvents: "none",
          }}>
            {comment.length}/{LARGO_MAXIMO}
          </span>
        )}
      </div>

      {error && (
        <div ref={cartelAviso} style={{ background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 8, padding: "8px 11px", fontSize: 12.5, color: "var(--fw-red-text-2)", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!puedeEnviar}
          style={{
            padding: "10px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700,
            background: "var(--fw-blue)", color: "#fff",
            cursor: puedeEnviar ? "pointer" : "not-allowed",
            opacity: puedeEnviar ? 1 : 0.55,
          }}
        >
          {sending ? tr("common.sending") : tr("review.submit")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "10px 18px", borderRadius: 9, border: "1px solid var(--fw-border)", background: "var(--fw-surface)", color: "var(--fw-text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {tr("common.cancel")}
        </button>
        {/* Por qué el botón está apagado, dicho antes de que lo toque. Un botón
            gris sin explicación se lee como "la página se colgó". */}
        {!rating && (
          <span style={{ fontSize: 11.5, color: "var(--fw-text-4)" }}>
            {tr("review.needStars")}
          </span>
        )}
      </div>
    </div>
  );
}
