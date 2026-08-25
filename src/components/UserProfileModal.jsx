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
import { monthYear } from "../i18n/dates";
import { getPublicProfile, getUserReviews } from "../services/api";
import { useI18n } from "../i18n/core";
import PanelDeReputacion from "./PanelDeReputacion";
import ListaDeReseñas from "./ListaDeReseñas";
import StatusChip from "./StatusChip";
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
                {/*
                  ACÁ YA NO VA EL RANGO.

                  Estaba como una etiquetita al lado del "verificado", y el rango
                  volvía a aparecer abajo, adentro de la planilla, en grande. Dos
                  veces la misma medalla en un cuadro de 440px de ancho: la de
                  arriba no agregaba nada y le sacaba lugar al nombre.
                */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
                  {profile.verified && (
                    <StatusChip tone="verified">{tr("profile.identityVerified")}</StatusChip>
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

            {/*
              LA PLANILLA COMPLETA.

              Acá había un renglón con los dos promedios y nada más. El rango
              estaba arriba en una etiquetita, las características no existían y
              los alquileres terminados tampoco: para saber si confiar había que
              bajar y leer las reseñas una por una.

              Es exactamente el mismo cuadro que se ve desde la publicación del
              auto y en el apartado de rango del perfil propio. Que sea EL MISMO
              importa: si lo que ve el otro fuera distinto de lo que uno ve de sí
              mismo, nadie sabría qué está mostrando.
            */}
            <PanelDeReputacion
              userId={userId}
              reviews={reviews}
              ratingCount={ratingCount}
              ratingAverage={profile.ratingAverage}
              style={{ marginBottom: 18 }}
            />

            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fw-text)", marginBottom: 10 }}>
              {tr("profile.reviewsReceived", { count: reviews.length })}
            </div>

            <ListaDeReseñas reviews={reviews} />
          </div>
        )}
      </div>
    </div>
  );
}
