// ============================================================================
//  PanelDeReputacion — Quién es esta persona, en un solo cuadro
// ----------------------------------------------------------------------------
//  QUÉ REEMPLAZA. La reputación de alguien estaba repartida en tres lugares que
//  no se hablaban: una etiquetita con el rango al lado del nombre, un renglón
//  con dos promedios adentro del modal del chat, y una tarjeta aparte en el
//  perfil propio. Ninguno de los tres alcanzaba para lo único que a alguien le
//  importa cuando abre el perfil del otro: DECIDIR SI CONFÍA. Y en la
//  publicación del auto directamente no había nada: el dueño era un nombre y la
//  palabra "miembro".
//
//  AHORA ES UNA SOLA PIEZA, y la misma en los tres lugares: el modal que se abre
//  desde el chat, el que se abre desde la publicación, y el apartado de rango
//  del perfil propio. Que sea LA MISMA importa: si el cuadro que ve el otro es
//  distinto del que ve uno, nadie sabe qué está mostrando de sí mismo.
//
//  ── QUÉ TIENE, Y POR QUÉ EN ESE ORDEN ─────────────────────────────────────
//
//  1. LA MEDALLA Y EL RANGO, grandes. Es el resumen de todo lo demás y lo único
//     que se retiene de un vistazo.
//  2. LA ESCALERA. Cuatro escalones con el actual encendido. Un rango solo no
//     dice nada si no se ve contra qué: "Oro" es una palabra hasta que se ve que
//     arriba hay uno más y abajo hay dos.
//  3. TRES NÚMEROS. Alquileres terminados, atención y puntualidad. Son los tres
//     que contestan "¿este me va a dejar a pie?".
//  4. LAS DOS CALIFICACIONES, separadas. Alguien puede cuidar muy bien los autos
//     que alquila y a la vez tener un auto que no está a la altura de lo que
//     promete. Mezclarlas en un promedio único esconde justo lo que se quiere
//     saber.
//  5. LO QUE MÁS DESTACAN: las características contadas. Es la parte que antes
//     no existía y la que convierte veinte reseñas en algo que se lee en cinco
//     segundos.
//
//  ── LO QUE ESTE CUADRO NO HACE ────────────────────────────────────────────
//  No inventa nada. Sin reseñas no hay rango, sin características no aparece la
//  sección, y si el servidor todavía no sabe contar alquileres terminados se
//  muestra el número de reseñas CON SU NOMBRE, no el de alquileres con un dato
//  que no es. Un cuadro de confianza que exagera es peor que no tenerlo.
//
//  Props:
//   · userId          → de quién es (se pide la reputación al servidor)
//   · reviews         → las reseñas ya cargadas, si quien llama las tiene. Sirven
//                       de respaldo para contar características cuando el
//                       servidor todavía no devuelve el conteo hecho.
//   · ratingCount / ratingAverage → para el rango
//   · propio          → true en el perfil de uno: agrega qué falta para el rango
//                       siguiente, que a un tercero no le interesa
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { getUserReputation } from "../services/api";
import { useI18n } from "../i18n/core";
import { rankOf, nextRank, TIERS } from "../services/rank";
import { contarAtributos, comoLeFue, esBueno } from "../services/atributos";
import EscudoDeRango from "./EscudoDeRango";

/** Estrellas llenas según el promedio, más el número al lado. */
function Estrellas({ average, count, etiqueta, sinNada }) {
  if (!count) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: "var(--fw-text-3)" }}>{etiqueta}</span>
        <span style={{ color: "var(--fw-text-4)" }}>{sinNada}</span>
      </div>
    );
  }
  const llenas = Math.round(average);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", fontSize: 12.5, marginBottom: 4 }}>
      <span style={{ color: "var(--fw-text-3)" }}>{etiqueta}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "var(--fw-amber)", letterSpacing: 1, fontSize: 13 }}>
          {"★".repeat(llenas)}<span style={{ color: "var(--fw-border)" }}>{"★".repeat(5 - llenas)}</span>
        </span>
        <strong style={{ color: "var(--fw-text)" }}>{average.toFixed(1)}</strong>
        <span style={{ color: "var(--fw-text-4)" }}>({count})</span>
      </span>
    </div>
  );
}

/**
 * Una de las tres columnas de números.
 *
 * `estado` es "bien" | "regular" | "mal" | null. El null NO se dibuja como algo
 * malo: es "todavía no hay con qué decirlo", y pintar eso de rojo sería acusar a
 * alguien por ser nuevo.
 */
function Columna({ valor, etiqueta, estado }) {
  const tinta = estado === "bien" ? "var(--fw-green-text-2)"
    : estado === "mal" ? "var(--fw-red-text-2)"
      : estado === "regular" ? "var(--fw-amber-text)"
        : "var(--fw-text-3)";
  return (
    <div style={{ flex: "1 1 0", minWidth: 96, padding: "0 10px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: tinta, lineHeight: 1.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        {valor}
        {estado === "bien" && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 3, lineHeight: 1.4 }}>{etiqueta}</div>
    </div>
  );
}

export default function PanelDeReputacion({
  userId, reviews = null, ratingCount = 0, ratingAverage = null, propio = false, style,
}) {
  const { t: tr } = useI18n();
  const [reputacion, setReputacion] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let vivo = true;
    getUserReputation(userId)
      .then(data => { if (vivo) setReputacion(data); })
      .catch(() => { /* sin reputación: el cuadro muestra lo que sí tiene */ });
    return () => { vivo = false; };
  }, [userId]);

  const tier = rankOf(ratingCount, ratingAverage);
  const siguiente = propio ? nextRank(ratingCount, ratingAverage) : null;

  /*
    EL CONTEO DE CARACTERÍSTICAS, CON RESPALDO.

    Lo normal es que lo haga el servidor: cuenta TODAS las reseñas, no solo las
    cincuenta últimas que viajan al front. Pero un servidor que todavía no tenga
    este campo dejaría la sección vacía sin motivo, y las reseñas que ya llegaron
    traen sus características adentro. Así que si no viene el conteo hecho, se
    cuenta con lo que hay.
  */
  const cuenta = useMemo(() => {
    const delServidor = reputacion?.tagCounts;
    if (delServidor && Object.keys(delServidor).length > 0) {
      const todas = Object.entries(delServidor)
        .map(([code, n]) => ({ code, n: Number(n) || 0, bueno: esBueno(code) }))
        .filter(x => x.n > 0)
        .sort((a, b) => b.n - a.n);
      return {
        buenas: todas.filter(x => x.bueno),
        malas: todas.filter(x => !x.bueno),
        todas,
      };
    }
    const contado = contarAtributos(Array.isArray(reviews) ? reviews : []);
    return { ...contado, todas: [...contado.buenas, ...contado.malas] };
  }, [reputacion, reviews]);

  const atencion = comoLeFue(cuenta.todas, "RESPONDE_RAPIDO", "RESPONDE_TARDE");
  const puntualidad = comoLeFue(cuenta.todas, "PUNTUAL", "IMPUNTUAL");

  /*
    ALQUILERES TERMINADOS vs. RESEÑAS RECIBIDAS.

    No son lo mismo y no se pueden usar uno por el otro: se puede terminar un
    alquiler y que la otra parte nunca reseñe. Si el servidor sabe contar los
    alquileres, se muestran esos, que es el número que de verdad dice si alguien
    tiene recorrido. Si no lo sabe, se muestran las reseñas CON LA ETIQUETA DE
    RESEÑAS. Lo que no se hace es poner el número de reseñas abajo de la palabra
    "alquileres".
  */
  const terminados = reputacion?.completed
    ? (Number(reputacion.completed.asOwner) || 0) + (Number(reputacion.completed.asDriver) || 0)
    : null;

  // La escalera va de menor a mayor, al revés que TIERS (que está ordenado de
  // mayor a menor porque así se busca el rango).
  const escalones = [...TIERS].reverse();
  const alcanzado = escalones.findIndex(t => t.key === tier.key);

  return (
    <div style={{
      background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
      borderRadius: 12, padding: 16, ...style,
    }}>
      {/* 1 · La medalla y el rango. Sin cajita: acá el rango es el título del
             cuadro, no una etiqueta pegada al costado de otra cosa. */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <EscudoDeRango metal={tier.metal} color={tier.color} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: tier.color, lineHeight: 1.25 }}>
            {tr(`rank.${tier.key}`)}
          </div>
          <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginTop: 1 }}>
            {tr(`rank.claim.${tier.key}`)}
          </div>
        </div>
      </div>

      {/* 2 · La escalera. Un rango solo no dice nada si no se ve contra qué. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }} aria-hidden="true">
        {escalones.map((escalon, i) => (
          <div key={escalon.key} style={{
            flex: 1, height: 7, borderRadius: 3,
            background: i <= alcanzado && alcanzado >= 0 ? escalon.color : "var(--fw-surface-3)",
            // El escalón actual, más alto: se ve dónde está parado sin leer.
            transform: i === alcanzado ? "scaleY(1.6)" : "none",
          }} />
        ))}
      </div>
      {siguiente && (
        <div style={{ fontSize: 11.5, color: "var(--fw-text-3)", marginTop: -8, marginBottom: 14 }}>
          {tr("rank.progress", { count: ratingCount, target: siguiente.target, next: tr(`rank.${siguiente.key}`) })}
        </div>
      )}

      {/* 3 · Los tres números */}
      <div style={{
        display: "flex", flexWrap: "wrap", rowGap: 12,
        borderTop: "1px solid var(--fw-line-soft)", borderBottom: "1px solid var(--fw-line-soft)",
        padding: "12px 0", marginBottom: 12,
      }}>
        <Columna
          valor={terminados !== null ? terminados : ratingCount}
          etiqueta={terminados !== null ? tr("rep.rentalsDone") : tr("rep.reviewsGot")}
        />
        <Columna
          valor={atencion ? tr(`rep.level.${atencion}`) : tr("rep.noData")}
          etiqueta={tr("rep.attention")}
          estado={atencion}
        />
        <Columna
          valor={puntualidad ? tr(`rep.level.${puntualidad}`) : tr("rep.noData")}
          etiqueta={tr("rep.punctuality")}
          estado={puntualidad}
        />
      </div>

      {/* 4 · Las dos calificaciones, separadas */}
      {reputacion && (
        <div style={{ marginBottom: cuenta.todas.length ? 12 : 0 }}>
          <Estrellas {...reputacion.asOwner} etiqueta={tr("profile.asOwnerShort")} sinNada={tr("profile.noReviewsShort")} />
          <Estrellas {...reputacion.asDriver} etiqueta={tr("profile.asDriver")} sinNada={tr("profile.noReviewsShort")} />
        </div>
      )}

      {/* 5 · Lo que más destacan. Sin características todavía, la sección no
             aparece: un título sobre una lista vacía es peor que nada. */}
      {cuenta.todas.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--fw-text-4)", marginBottom: 7 }}>
            {tr("rep.whatTheySay")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {/* Las buenas primero y las malas después, pero LAS MALAS ESTÁN. Un
                resumen que solo muestra elogios no es un resumen, es un cartel. */}
            {[...cuenta.buenas, ...cuenta.malas].slice(0, 8).map(({ code, n, bueno }) => (
              <span key={code} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11.5, lineHeight: 1.5, padding: "3px 9px", borderRadius: 999,
                background: bueno ? "var(--fw-green-bg)" : "var(--fw-red-bg)",
                color: bueno ? "var(--fw-green-text-2)" : "var(--fw-red-text-2)",
                border: `1px solid ${bueno ? "var(--fw-green-line)" : "var(--fw-red-line)"}`,
              }}>
                {tr(`attr.${code}`)}
                <strong>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
