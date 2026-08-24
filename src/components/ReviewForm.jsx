// ============================================================================
//  ReviewForm — Dejar una reseña de una reserva terminada
// ----------------------------------------------------------------------------
//  Estrellas de 1 a 5 (obligatorias), características (opcionales) y un
//  comentario (opcional).
//
//  ── POR QUÉ SE AGREGARON LAS CARACTERÍSTICAS ──────────────────────────────
//  Cinco estrellas dicen CUÁNTO gustó, pero no QUÉ pasó. Dos personas ponen 3
//  estrellas: una porque el dueño tardó dos horas en contestar y la otra porque
//  el auto estaba sucio. Ese 3 no le sirve a nadie: quien lo lee no sabe cuál de
//  las dos cosas le va a tocar, y quien lo recibió no sabe qué corregir.
//
//  Además, el comentario es lo primero que la gente NO escribe. Poner tres
//  estrellas es un clic; contar por qué es un párrafo. Con las características,
//  quien no tiene ganas de escribir igual deja algo que se puede contar, y
//  veinte reseñas se convierten en "contesta rápido, 18 veces" en vez de veinte
//  textos para leer uno por uno.
//
//  ── LO QUE SE OFRECE DEPENDE DE A QUIÉN SE ESTÁ RESEÑANDO ─────────────────
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
import { atributosPara, MAXIMO } from "../services/atributos";

export default function ReviewForm({ isOwner, onSubmit, onCancel }) {
  const { t: tr } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [elegidas, setElegidas] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const shown = hover || rating;

  /*
    `isOwner` dice si QUIEN ESCRIBE es el dueño. Lo que hace falta acá es el
    papel de quien RECIBE, que es el otro: si escribe el dueño, la reseña es
    sobre el conductor.
  */
  const disponibles = useMemo(
    () => atributosPara(isOwner ? "conductor" : "dueño"),
    [isOwner],
  );
  const buenas = disponibles.filter(a => a.bueno);
  const malas = disponibles.filter(a => !a.bueno);
  const lleno = elegidas.length >= MAXIMO;

  const alternar = (code) => {
    setElegidas(antes => antes.includes(code)
      ? antes.filter(x => x !== code)
      // El tope se respeta en silencio: las que sobran ya se ven apagadas, así
      // que un cartel de error acá sería explicarle algo que ya está a la vista.
      : antes.length >= MAXIMO ? antes : [...antes, code]);
  };

  const handleSubmit = async () => {
    if (!rating || sending) return;
    setSending(true);
    setError("");
    try {
      await onSubmit({ rating, comment: comment.trim(), tags: elegidas });
    } catch (err) {
      setError(err.message || tr("review.saveFailed"));
      setSending(false);
    }
  };

  /** Una casilla. Verde si suma, roja si resta; apagada si no está elegida. */
  const Casilla = ({ code, bueno }) => {
    const puesta = elegidas.includes(code);
    const bloqueada = !puesta && lleno;
    return (
      <button
        type="button"
        onClick={() => alternar(code)}
        disabled={bloqueada}
        aria-pressed={puesta}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: puesta ? 700 : 500, lineHeight: 1.5,
          padding: "5px 11px", borderRadius: 999, cursor: bloqueada ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          background: puesta ? (bueno ? "var(--fw-green-bg)" : "var(--fw-red-bg)") : "var(--fw-surface)",
          color: puesta
            ? (bueno ? "var(--fw-green-text-2)" : "var(--fw-red-text-2)")
            : bloqueada ? "var(--fw-text-4)" : "var(--fw-text-2)",
          border: `1px solid ${puesta ? (bueno ? "var(--fw-green)" : "var(--fw-red)") : "var(--fw-border)"}`,
          opacity: bloqueada ? 0.55 : 1,
        }}
      >
        {/* El signo cambia con el estado, así que la casilla elegida se
            distingue sin depender del color. */}
        <span aria-hidden="true" style={{ fontWeight: 800 }}>{puesta ? (bueno ? "✓" : "×") : "+"}</span>
        {tr(`attr.${code}`)}
      </button>
    );
  };

  return (
    <div style={{ background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)", borderRadius: 12, padding: 14, marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)", marginBottom: 8 }}>
        {tr(isOwner ? "review.askOwner" : "review.askRenter")}
      </div>

      {/* Estrellas. Son botones de verdad para que se puedan usar con el teclado. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            aria-label={tr("review.outOf5", { value })}
            aria-pressed={rating === value}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 26, lineHeight: 1,
              color: value <= shown ? "var(--fw-amber)" : "var(--fw-border-2)",
              transition: "color .12s",
            }}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span style={{ alignSelf: "center", marginLeft: 8, fontSize: 12.5, color: "var(--fw-text-3)" }}>
            {tr("review.outOf5", { value: rating })}
          </span>
        )}
      </div>

      {/*
        LAS CARACTERÍSTICAS, EN DOS RENGLONES SEPARADOS.

        Lo bueno y lo malo van aparte y con su título. Mezcladas en una sola
        bolsa hay que leer cada una para saber de qué lado está, y con quince
        casillas eso no lo hace nadie: se toca lo primero que suena parecido a lo
        que pasó. Separadas, la persona elige primero DE QUÉ quiere hablar.

        Y las dos listas están siempre: sin la de abajo, esto sería un formulario
        que solo deja decir cosas lindas.
      */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, color: "var(--fw-text-3)", marginBottom: 6 }}>
          {tr("review.pickTraits", { max: MAXIMO })}
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--fw-green-text-2)", marginBottom: 5 }}>
          {tr("review.wentWell")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
          {buenas.map(a => <Casilla key={a.code} code={a.code} bueno />)}
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--fw-red-text-2)", marginBottom: 5 }}>
          {tr("review.wentWrong")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {malas.map(a => <Casilla key={a.code} code={a.code} bueno={false} />)}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        placeholder={tr(isOwner ? "review.phOwner" : "review.phRenter")}
        style={{
          width: "100%", height: 70, padding: "9px 12px", borderRadius: 8,
          border: "1.5px solid var(--fw-border)", fontSize: 13.5, outline: "none",
          boxSizing: "border-box", resize: "vertical", marginBottom: 8,
          fontFamily: "inherit", color: "var(--fw-text)",
        }}
      />

      {error && (
        <div style={{ background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 8, padding: "8px 11px", fontSize: 12.5, color: "var(--fw-red-text-2)", marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!rating || sending}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
            background: "var(--fw-blue)", color: "#fff",
            cursor: !rating || sending ? "not-allowed" : "pointer",
            opacity: !rating || sending ? 0.6 : 1,
          }}
        >
          {sending ? tr("common.sending") : tr("review.submit")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid var(--fw-border)", background: "var(--fw-surface)", color: "var(--fw-text-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {tr("common.cancel")}
        </button>
      </div>
    </div>
  );
}
