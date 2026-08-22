// ============================================================================
//  UserProfileModal — El perfil de la otra persona, desde el chat
// ----------------------------------------------------------------------------
//  Se abre al tocar el avatar de la persona con la que estás hablando. Muestra lo
//  que sirve para decidir si confiar: desde cuándo está en Freewheel, si tiene la
//  cuenta verificada, cómo la calificaron como conductor y como dueño, y las
//  reseñas que recibió.
//
//  Antes las reseñas se guardaban pero no había ninguna pantalla que las mostrara
//  fuera de la publicación del auto, así que la calificación de una PERSONA no se
//  veía en ningún lado.
//
//  Solo información pública: ni email, ni teléfono, ni documento. Eso lo garantiza
//  el backend (GET /users/:id devuelve únicamente el perfil público).
// ============================================================================
import { useEffect, useState } from "react";
import { monthYear, shortDate } from "../i18n/dates";
import { getPublicProfile, getUserReviews } from "../services/api";
import { useI18n } from "../i18n/core";
import UserReputation from "./UserReputation";
import StatusChip from "./StatusChip";
import RankBadge from "./RankBadge";
import Avatar from "./Avatar";
import { initialsOf } from "../services/people";
import Spinner from "./Spinner";

export default function UserProfileModal({ userId, onClose }) {
  const { t: tr, lang } = useI18n();
  const nameOf = (person) =>
    person?.displayName
    || `${person?.firstName || ""} ${person?.lastName || ""}`.trim()
    || tr("profile.userFallback");
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    Promise.all([
      getPublicProfile(userId).catch(() => null),
      getUserReviews(userId).catch(() => []),
    ]).then(([p, r]) => {
      if (!active) return;
      setProfile(p);
      setReviews(Array.isArray(r) ? r : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const name = nameOf(profile);
  // Sin reseñas no hay promedio ni rango: no se inventa un puntaje.
  const ratingCount = Number(profile?.ratingCount) || 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--fw-surface)", borderRadius: 16, width: "100%", maxWidth: 440,
          maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fw-text)" }}>{tr("profile.title")}</div>
          <button onClick={onClose} aria-label={tr("common.close")}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--fw-text-3)", lineHeight: 1 }}>
            ×
          </button>
        </div>

        {loading ? (
          <Spinner block label={tr("profile.loading")} />
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--fw-text-4)", fontSize: 13 }}>
            {tr("profile.loadFailed")}
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              {/* La foto de perfil pública, o las iniciales si todavía no subió ninguna. */}
              <Avatar src={profile.profilePhotoUrl} initials={initialsOf(profile)} size={56} alt={name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fw-text)" }}>{name}</div>
                <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginTop: 2 }}>
                  {tr("profile.memberSince", { date: monthYear(profile.createdAt, lang) })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
                  {profile.verified && (
                    <StatusChip tone="ok">{tr("profile.identityVerified")}</StatusChip>
                  )}
                  {/* El rango sale de las reseñas reales: sin reseñas no se muestra. */}
                  {ratingCount > 0 && (
                    <RankBadge count={ratingCount} average={profile.ratingAverage} size="sm" />
                  )}
                </div>
                {/*
                  Los últimos cuatro dígitos del documento con el que se verificó.
                  Le da a la otra persona algo concreto para cotejar si alguna vez
                  hay un problema, sin mostrar el número entero ni las fotos del
                  DNI —eso es material con el que se suplanta una identidad y solo
                  lo ven el propio dueño de la cuenta y el equipo de administración.
                */}
                {profile.verified && profile.documentLast4 && (
                  <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", marginTop: 5 }}>
                    {tr("profile.document")} ····{profile.documentLast4}
                  </div>
                )}
              </div>
            </div>

            {/* Las dos reputaciones: como conductor y como dueño */}
            <div style={{
              background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
              borderLeft: "3px solid var(--fw-blue)", borderRadius: 10, padding: "12px 14px", marginBottom: 18,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fw-text)", marginBottom: 8 }}>
                {tr("profile.ratings")}
              </div>
              <UserReputation userId={userId} role="both" />
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fw-text)", marginBottom: 10 }}>
              {tr("profile.reviewsReceived", { count: reviews.length })}
            </div>

            {reviews.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--fw-text-4)", margin: 0, lineHeight: 1.6 }}>
                {tr("profile.noReviewsYet")}
              </p>
            ) : (
              reviews.map(review => (
                <div key={review.id} style={{ borderBottom: "1px solid var(--fw-line-soft)", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)" }}>
                      {nameOf(review.author)}
                    </span>
                    <span style={{ color: "var(--fw-amber)", fontSize: 12.5 }}>
                      {"★".repeat(review.rating)}
                    </span>
                  </div>
                  {/* Aclara desde qué lado se escribió: no es lo mismo que te
                      califique el dueño de un auto que alguien que alquiló el tuyo. */}
                  <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 2 }}>
                    {review.listingId ? tr("profile.asOwner") : tr("profile.asDriver")}
                    {" · "}
                    {shortDate(review.createdAt, lang)}
                  </div>
                  {review.comment && (
                    <div style={{ fontSize: 13, color: "var(--fw-text-2)", marginTop: 6, lineHeight: 1.6 }}>
                      {review.comment}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
