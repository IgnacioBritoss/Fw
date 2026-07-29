// ============================================================================
//  ReviewForm — Dejar una reseña de una reserva terminada
// ----------------------------------------------------------------------------
//  Estrellas de 1 a 5 (obligatorias) y un comentario opcional.
//
//  Cuándo aparece: solo en las reservas COMPLETADAS y con el pago cerrado, y solo
//  si la persona todavía no dejó la suya. Esa condición la decide el backend
//  (GET /reviews/me/pending): es lo que hace que las puntuaciones signifiquen
//  algo, porque solo puede puntuar quien efectivamente alquiló y pagó.
//
//  Las dos partes se reseñan: quien alquiló puntúa el auto y al dueño, y el dueño
//  puntúa a quien alquiló. El promedio lo recalcula y lo guarda el servidor.
// ============================================================================
import { useState } from "react";

export default function ReviewForm({ isOwner, onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const shown = hover || rating;

  const handleSubmit = async () => {
    if (!rating || sending) return;
    setSending(true);
    setError("");
    try {
      await onSubmit({ rating, comment: comment.trim() });
    } catch (err) {
      setError(err.message || "No pudimos guardar tu reseña.");
      setSending(false);
    }
  };

  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
        {isOwner ? "¿Cómo fue con el conductor?" : "¿Cómo fue tu experiencia?"}
      </div>

      {/* Estrellas. Son botones de verdad para que se puedan usar con el teclado. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            aria-label={`${value} de 5`}
            aria-pressed={rating === value}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 26, lineHeight: 1,
              color: value <= shown ? "#f59e0b" : "#d1d5db",
              transition: "color .12s",
            }}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span style={{ alignSelf: "center", marginLeft: 8, fontSize: 12.5, color: "#6b7280" }}>
            {rating} de 5
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        placeholder={isOwner
          ? "Contá cómo cuidó el auto y cómo fue la entrega (opcional)."
          : "Contá cómo estaba el auto y cómo fue el trato (opcional)."}
        style={{
          width: "100%", height: 70, padding: "9px 12px", borderRadius: 8,
          border: "1.5px solid #e5e7eb", fontSize: 13.5, outline: "none",
          boxSizing: "border-box", resize: "vertical", marginBottom: 8,
          fontFamily: "inherit", color: "#111827",
        }}
      />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 11px", fontSize: 12.5, color: "#b91c1c", marginBottom: 8 }}>
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
            background: "#2563eb", color: "#fff",
            cursor: !rating || sending ? "not-allowed" : "pointer",
            opacity: !rating || sending ? 0.6 : 1,
          }}
        >
          {sending ? "Enviando..." : "Publicar reseña"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
