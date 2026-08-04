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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getPublicProfile, getUserReviews } from "../services/api";
import UserReputation from "./UserReputation";
import StatusChip from "./StatusChip";

const nameOf = (person) =>
  person?.displayName
  || `${person?.firstName || ""} ${person?.lastName || ""}`.trim()
  || "Usuario";

export default function UserProfileModal({ userId, onClose }) {
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
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Perfil</div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280", lineHeight: 1 }}>
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            Cargando perfil...
          </div>
        ) : !profile ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
            No pudimos cargar este perfil.
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
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
                  <div style={{ marginTop: 7 }}>
                    <StatusChip tone="ok">Identidad verificada</StatusChip>
                  </div>
                )}
                {/*
                  Los últimos cuatro dígitos del documento con el que se verificó.
                  Le da a la otra persona algo concreto para cotejar si alguna vez
                  hay un problema, sin mostrar el número entero ni las fotos del
                  DNI —eso es material con el que se suplanta una identidad y solo
                  lo ven el propio dueño de la cuenta y el equipo de administración.
                */}
                {profile.verified && profile.documentLast4 && (
                  <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 5 }}>
                    Documento ····{profile.documentLast4}
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
                Calificaciones
              </div>
              <UserReputation userId={userId} role="both" />
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
              Reseñas recibidas ({reviews.length})
            </div>

            {reviews.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
                Todavía no tiene reseñas. Se escriben cuando una reserva termina y
                el pago está completo.
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
                    {review.listingId ? "Como dueño del auto" : "Como conductor"}
                    {" · "}
                    {format(new Date(review.createdAt), "d MMM yyyy", { locale: es })}
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
