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
//  3. TRES COLUMNAS. Los alquileres terminados, y los DOS ASPECTOS MÁS VOTADOS
//     de esta persona. Cada uno dice el veredicto, sobre cuántas menciones está
//     dicho, y cuál fue la característica que la gente marcó.
//  4. LAS DOS CALIFICACIONES, separadas. Alguien puede cuidar muy bien los autos
//     que alquila y a la vez tener un auto que no está a la altura de lo que
//     promete. Mezclarlas en un promedio único esconde justo lo que se quiere
//     saber.
//
//  ── POR QUÉ YA NO HAY UNA LISTA DE CARACTERÍSTICAS ────────────────────────
//  Abajo de todo había una sección con TODAS las características contadas, en
//  cápsulas de colores primero y en barras proporcionales después. Cambiarle el
//  dibujo no arreglaba el problema de fondo: era una segunda forma de decir lo
//  mismo que ya decían las columnas de arriba, peleándose con ellas por el mismo
//  cuadro. Y las columnas, encima, eran siempre las mismas dos —Atención y
//  Puntualidad— así que lo que de alguien más se destacaba terminaba en esa
//  lista de abajo, como un dato de segunda.
//
//  Ahora hay una sola cosa. Las columnas se arman con los aspectos que MÁS
//  VOTARON de esa persona, y adentro de cada una va la característica concreta
//  que ganó: "Buena" es la palabra que elegimos nosotros para resumir, "Contesta
//  rápido" es lo que marcaron las personas, y las dos juntas dicen algo que
//  ninguna dice sola.
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
import { contarAtributos, aspectosDestacados, aspectoSinDatos, esBueno } from "../services/atributos";
import EscudoDeRango from "./EscudoDeRango";

/** El color de un nivel. El null es "todavía no se sabe", que no es malo. */
const TINTA = {
  bien: { texto: "var(--fw-green-text-2)", barra: "var(--fw-green)" },
  regular: { texto: "var(--fw-amber-text)", barra: "var(--fw-amber)" },
  mal: { texto: "var(--fw-red-text-2)", barra: "var(--fw-red)" },
};
const SIN_NIVEL = { texto: "var(--fw-text-4)", barra: "var(--fw-border-2)" };

/** Estrellas llenas según el promedio, más el número al lado. */
function Estrellas({ average, count, etiqueta, sinNada }) {
  const llenas = count ? Math.round(average) : 0;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 10,
      alignItems: "center", fontSize: 12.5, padding: "3px 0",
    }}>
      <span style={{ color: "var(--fw-text-3)" }}>{etiqueta}</span>
      {!count ? (
        <span style={{ color: "var(--fw-text-4)" }}>{sinNada}</span>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--fw-amber)", letterSpacing: 1, fontSize: 13 }}>
            {"★".repeat(llenas)}<span style={{ color: "var(--fw-border-2)" }}>{"★".repeat(5 - llenas)}</span>
          </span>
          <strong style={{ color: "var(--fw-text)", fontVariantNumeric: "tabular-nums" }}>
            {average.toFixed(1)}
          </strong>
          <span style={{ color: "var(--fw-text-4)" }}>({count})</span>
        </span>
      )}
    </div>
  );
}

/**
 * Una de las tres columnas de números.
 *
 * `resumen` es lo que devuelve `resumenDe`: el nivel más SOBRE CUÁNTAS
 * menciones está dicho. Los dos se muestran juntos y a propósito.
 *
 * ── EL ERROR QUE ARREGLA ──────────────────────────────────────────────────
 * Esta columna decía "Sin datos" mientras, tres centímetros más abajo y en la
 * misma tarjeta, se leía "Puntual · 1". El dato estaba, pero se escondía hasta
 * que hubiera dos menciones para no proclamar "buena puntualidad" por un solo
 * comentario. La precaución era razonable; esconder el dato, no: quien lo lee no
 * deduce que faltaba una mención, deduce que la pantalla miente.
 *
 * La forma correcta de no exagerar no es tapar el dato: es decir sobre cuánto
 * está dicho. "Buena · 1 de 1" no exagera nada y no se contradice con nada.
 *
 * El null (nadie lo mencionó todavía) NO se dibuja como algo malo: pintar de
 * rojo a alguien por ser nuevo sería acusarlo de algo que no hizo.
 */
function Columna({ etiqueta, valor, resumen, detalle, destacada, primera }) {
  /*
    Tres casos, tres colores, y hay que distinguirlos:
     · hay veredicto        → el color del nivel
     · hay muestra vacía    → gris apagado, porque dice "todavía nada"
     · no es un veredicto   → tinta normal: los alquileres terminados son un
       número, no una nota, y ponerlo en gris lo haría parecer un dato flojo.
  */
  const tinta = resumen
    ? (resumen.nivel ? TINTA[resumen.nivel] : SIN_NIVEL)
    : { texto: "var(--fw-text)" };
  const proporcion = resumen && resumen.total > 0 ? resumen.bien / resumen.total : 0;
  return (
    <div style={{
      flex: "1 1 0", minWidth: 92, padding: "0 12px",
      borderLeft: primera ? "none" : "1px solid var(--fw-line-soft)",
    }}>
      {/* Dos renglones de alto fijo: "Alquileres terminados" ocupa dos y
          "Atención" uno, y sin esto los tres números quedaban a distinta
          altura, que es lo primero que hace ver desprolija una planilla. */}
      <div style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
        color: "var(--fw-text-4)", lineHeight: 1.3, marginBottom: 4, minHeight: 25,
      }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: tinta.texto, lineHeight: 1.25 }}>
        {valor}
      </div>
      {/* Debajo del valor: sobre qué está dicho. Alto fijo para que las tres
          columnas queden alineadas aunque una no tenga barra. */}
      <div style={{ minHeight: 24, marginTop: 5 }}>
        {resumen && resumen.total > 0 && (
          <>
            <div style={{ height: 3, borderRadius: 2, background: "var(--fw-surface-3)", overflow: "hidden" }}>
              <div style={{
                width: `${Math.round(proporcion * 100)}%`, height: "100%",
                borderRadius: 2, background: tinta.barra,
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--fw-text-4)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
              {detalle}
            </div>
          </>
        )}
        {!resumen && detalle && (
          <div style={{ fontSize: 10.5, color: "var(--fw-text-4)", lineHeight: 1.4 }}>{detalle}</div>
        )}
      </div>
      {/*
        LO QUE LA GENTE MARCÓ DE VERDAD.

        "Buena" es la palabra que elegimos nosotros para resumir; "Contesta
        rápido" es lo que marcaron las personas. Las dos cosas juntas dicen algo
        que ninguna dice sola: cuál es el veredicto, y de dónde sale.

        Va acá adentro y no en una lista aparte: la lista de abajo repetía en
        chiquito lo que estas columnas ya decían arriba, y era lo que hacía que
        la planilla se viera como un montón de etiquetas de colores.
      */}
      {destacada && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5, marginTop: 7,
          fontSize: 11.5, lineHeight: 1.35, color: "var(--fw-text-2)", fontWeight: 600,
        }}>
          <span
            aria-hidden="true"
            style={{
              width: 13, height: 13, flexShrink: 0, borderRadius: 999,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: destacada.bueno ? "var(--fw-green)" : "var(--fw-red)",
              color: "#fff", fontSize: 8.5, fontWeight: 900, lineHeight: 1,
            }}
          >
            {destacada.bueno ? "✓" : "×"}
          </span>
          <span style={{ minWidth: 0 }}>{destacada.texto}</span>
        </div>
      )}
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
  const contadas = useMemo(() => {
    const delServidor = reputacion?.tagCounts;
    if (delServidor && Object.keys(delServidor).length > 0) {
      return Object.entries(delServidor)
        .map(([code, n]) => ({ code, n: Number(n) || 0, bueno: esBueno(code) }))
        .filter(x => x.n > 0)
        .sort((a, b) => b.n - a.n);
    }
    return contarAtributos(Array.isArray(reviews) ? reviews : []).todas;
  }, [reputacion, reviews]);

  /*
    LAS DOS COLUMNAS DE VEREDICTO YA NO SON FIJAS.

    Eran siempre Atención y Puntualidad. No era una decisión sobre esta persona:
    era una decisión nuestra, tomada de antemano, igual para todo el mundo. Y
    dejaba afuera lo que de alguien más se destaca —cómo cuidó el auto, el
    trato— que terminaba abajo, en una lista de etiquetas de colores, como un
    dato de segunda.

    Ahora las columnas son LOS DOS ASPECTOS MÁS VOTADOS de esta persona. Si de
    alguien lo que más marcaron es cómo devolvió el auto, esa es la columna.

    Sin ninguna reseña con características se muestran Atención y Puntualidad
    vacías: es lo que había, y dos columnas en blanco explican mejor que el
    cuadro se llena con las reseñas que no mostrar nada.
  */
  const columnas = useMemo(() => {
    const votados = aspectosDestacados(contadas, 2);
    if (votados.length === 2) return votados;
    // Se completa con los de siempre, salteando el que ya esté puesto.
    const relleno = ["atencion", "puntualidad"]
      .filter(key => !votados.some(a => a.key === key))
      .map(aspectoSinDatos);
    return [...votados, ...relleno].slice(0, 2);
  }, [contadas]);

  /*
    ALQUILERES TERMINADOS vs. RESEÑAS RECIBIDAS.

    No son lo mismo y no se pueden usar uno por el otro: se puede terminar un
    alquiler y que la otra parte nunca reseñe. Si el servidor sabe contar los
    alquileres, se muestran esos, que es el número que de verdad dice si alguien
    tiene recorrido. Si no lo sabe, se muestran las reseñas CON LA ETIQUETA DE
    RESEÑAS. Lo que no se hace es poner el número de reseñas abajo de la palabra
    "alquileres".
  */
  const comoDueño = Number(reputacion?.completed?.asOwner) || 0;
  const comoConductor = Number(reputacion?.completed?.asDriver) || 0;
  const terminados = reputacion?.completed ? comoDueño + comoConductor : null;

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

      {/*
        2 · La escalera. Un rango solo no dice nada si no se ve contra qué.

        TODO LO GANADO VA DEL COLOR DEL RANGO ACTUAL, y todos los escalones
        miden lo mismo. Antes cada escalón se pintaba de SU propio metal y el
        actual se agrandaba a lo alto: al subir de rango quedaba un tramo bronce
        y otro plata, como si fueran dos cosas distintas, y uno más gordo que el
        resto, que se leía como un desperfecto. Lo que se quiere mostrar es una
        sola cosa —hasta dónde llegó, y de qué metal es hoy—, así que se dibuja
        como una sola cosa.
      */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }} aria-hidden="true">
        {escalones.map((escalon, i) => (
          <div key={escalon.key} style={{
            flex: 1, height: 7, borderRadius: 3,
            background: alcanzado >= 0 && i <= alcanzado ? tier.color : "var(--fw-surface-3)",
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
        display: "flex", flexWrap: "wrap", rowGap: 14,
        borderTop: "1px solid var(--fw-line-soft)", borderBottom: "1px solid var(--fw-line-soft)",
        // Sin las dos calificaciones debajo, el margen dejaba una raya y después
        // un hueco vacío hasta el borde de la tarjeta.
        padding: "13px 0", marginBottom: reputacion ? 13 : 0,
      }}>
        <Columna
          primera
          etiqueta={terminados !== null ? tr("rep.rentalsDone") : tr("rep.reviewsGot")}
          valor={terminados !== null ? terminados : ratingCount}
          detalle={terminados ? tr("rep.doneSplit", { owner: comoDueño, driver: comoConductor }) : null}
        />
        {columnas.map((aspecto) => (
          <Columna
            key={aspecto.key}
            etiqueta={tr(`aspect.${aspecto.key}`)}
            valor={aspecto.nivel ? tr(`rep.level.${aspecto.nivel}`) : tr("rep.noData")}
            resumen={aspecto}
            detalle={tr("rep.basis", { good: aspecto.bien, total: aspecto.total })}
            destacada={aspecto.gana && {
              texto: tr(`attr.${aspecto.gana}`),
              bueno: esBueno(aspecto.gana),
            }}
          />
        ))}
      </div>

      {/* 4 · Las dos calificaciones, separadas */}
      {reputacion && (
        <div>
          <Estrellas {...reputacion.asOwner} etiqueta={tr("profile.asOwnerShort")} sinNada={tr("profile.noReviewsShort")} />
          <Estrellas {...reputacion.asDriver} etiqueta={tr("profile.asDriver")} sinNada={tr("profile.noReviewsShort")} />
        </div>
      )}

    </div>
  );
}
