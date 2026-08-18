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
<<<<<<< HEAD
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getPublicProfile, getUserReviews } from "../services/api";
import UserReputation from "./UserReputation";

const nameOf = (person) =>
  person?.displayName
  || `${person?.firstName || ""} ${person?.lastName || ""}`.trim()
  || "Usuario";

export default function UserProfileModal({ userId, onClose }) {
=======
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
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
=======
  // Sin reseñas no hay promedio ni rango: no se inventa un puntaje.
  const ratingCount = Number(profile?.ratingCount) || 0;
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

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
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440,
          maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
<<<<<<< HEAD
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Perfil</div>
          <button onClick={onClose} aria-label="Cerrar"
=======
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{tr("profile.title")}</div>
          <button onClick={onClose} aria-label={tr("common.close")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>
            ×
          </button>
        </div>

        {loading ? (
<<<<<<< HEAD
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            Cargando perfil...
          </div>
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No pudimos cargar este perfil.
=======
          <Spinner block label={tr("profile.loading")} />
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            {tr("profile.loadFailed")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
<<<<<<< HEAD
              <div style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 21,
              }}>
                {name[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{name}</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                  En Freewheel desde {format(new Date(profile.createdAt), "MMMM yyyy", { locale: es })}
                </div>
                {profile.verified && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6,
                    fontSize: 11.5, fontWeight: 700, color: "#166534",
                    background: "#dcfce7", borderRadius: 20, padding: "3px 10px",
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#166534"
                      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Identidad verificada
                  </span>
                )}
=======
              {/* La foto de perfil pública, o las iniciales si todavía no subió ninguna. */}
              <Avatar src={profile.profilePhotoUrl} initials={initialsOf(profile)} size={56} alt={name} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{name}</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
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
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                {/*
                  Los últimos cuatro dígitos del documento con el que se verificó.
                  Le da a la otra persona algo concreto para cotejar si alguna vez
                  hay un problema, sin mostrar el número entero ni las fotos del
                  DNI —eso es material con el que se suplanta una identidad y solo
                  lo ven el propio dueño de la cuenta y el equipo de administración.
                */}
                {profile.verified && profile.documentLast4 && (
                  <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 5 }}>
<<<<<<< HEAD
                    Documento ····{profile.documentLast4}
=======
                    {tr("profile.document")} ····{profile.documentLast4}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </div>
                )}
              </div>
            </div>

            {/* Las dos reputaciones: como conductor y como dueño */}
            <div style={{
              background: "#f8fafc", border: "1px solid #e5e7eb",
              borderLeft: "3px solid #2563eb", borderRadius: 10, padding: "12px 14px", marginBottom: 18,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
<<<<<<< HEAD
                Calificaciones
=======
                {tr("profile.ratings")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </div>
              <UserReputation userId={userId} role="both" />
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
<<<<<<< HEAD
              Reseñas recibidas ({reviews.length})
=======
              {tr("profile.reviewsReceived", { count: reviews.length })}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>

            {reviews.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
<<<<<<< HEAD
                Todavía no tiene reseñas. Se escriben cuando una reserva termina y
                el pago está completo.
=======
                {tr("profile.noReviewsYet")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </p>
            ) : (
              reviews.map(review => (
                <div key={review.id} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {nameOf(review.author)}
                    </span>
                    <span style={{ color: "#f59e0b", fontSize: 12.5 }}>
                      {"★".repeat(review.rating)}
                    </span>
                  </div>
                  {/* Aclara desde qué lado se escribió: no es lo mismo que te
                      califique el dueño de un auto que alguien que alquiló el tuyo. */}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
<<<<<<< HEAD
                    {review.listingId ? "Como dueño del auto" : "Como conductor"}
                    {" · "}
                    {format(new Date(review.createdAt), "d MMM yyyy", { locale: es })}
=======
                    {review.listingId ? tr("profile.asOwner") : tr("profile.asDriver")}
                    {" · "}
                    {shortDate(review.createdAt, lang)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </div>
                  {review.comment && (
                    <div style={{ fontSize: 13, color: "#4b5563", marginTop: 6, lineHeight: 1.6 }}>
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
