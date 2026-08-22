// ============================================================================
//  UserReputation — La calificación de una persona, según el papel que cumplió
// ----------------------------------------------------------------------------
//  Las reseñas se guardaban pero no se veían en ninguna parte donde sirvieran.
//  El momento en que a alguien de verdad le importa la calificación del otro es
//  cuando tiene que DECIDIR: el dueño, al recibir una solicitud y tener que
//  aceptarla o rechazarla; y quien va a alquilar, antes de reservar.
//
//  Se muestran DOS reputaciones separadas y no un promedio único, porque son
//  cosas distintas: alguien puede cuidar muy bien los autos que alquila (buen
//  conductor) y a la vez tener un auto que no está a la altura de lo que promete
//  (mal dueño). Mezclarlas en un solo número esconde justo lo que se quiere saber.
//
//  Props:
//   · userId → de quién es la reputación
//   · role   → "driver" | "owner" | "both". Con "driver" u "owner" muestra solo
//              esa, que es lo que corresponde en una solicitud de reserva.
//   · compact → una línea, para meterlo al lado de un nombre
// ============================================================================
import { useEffect, useState } from "react";
import { getUserReputation } from "../services/api";
import { useI18n } from "../i18n/core";

/** Estrellas llenas según el promedio, más el número al lado. */
function Stars({ average, count, label, noneLabel, compact }) {
  if (!count) {
    return (
      <span style={{ fontSize: compact ? 12 : 12.5, color: "var(--fw-text-4)" }}>
        {label}: {noneLabel}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: compact ? 12 : 12.5, color: "var(--fw-text-3)" }}>{label}:</span>
      <span style={{ color: "var(--fw-amber)", fontSize: compact ? 13 : 14, letterSpacing: 1 }}>
        {"★".repeat(Math.round(average))}
        <span style={{ color: "var(--fw-border)" }}>{"★".repeat(5 - Math.round(average))}</span>
      </span>
      <strong style={{ fontSize: compact ? 12.5 : 13, color: "var(--fw-text)" }}>
        {average.toFixed(1)}
      </strong>
      <span style={{ fontSize: compact ? 11.5 : 12, color: "var(--fw-text-4)" }}>
        ({count})
      </span>
    </span>
  );
}

export default function UserReputation({ userId, role = "both", compact = false, style }) {
  const { t: tr } = useI18n();
  const [reputation, setReputation] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getUserReputation(userId)
      .then(data => { if (active) setReputation(data); })
      .catch(() => { /* sin reputación: simplemente no se muestra */ });
    return () => { active = false; };
  }, [userId]);

  if (!reputation) return null;

  const showDriver = role === "driver" || role === "both";
  const showOwner = role === "owner" || role === "both";

  return (
    <div style={{
      display: "flex", flexDirection: compact ? "row" : "column",
      gap: compact ? 12 : 4, flexWrap: "wrap", alignItems: compact ? "center" : "flex-start",
      ...style,
    }}>
      {showDriver && (
        <Stars {...reputation.asDriver} label={tr("profile.asDriver")} noneLabel={tr("profile.noReviewsShort")} compact={compact} />
      )}
      {showOwner && (
        <Stars {...reputation.asOwner} label={tr("profile.asOwnerShort")} noneLabel={tr("profile.noReviewsShort")} compact={compact} />
      )}
    </div>
  );
}
