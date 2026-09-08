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
//     que contestan "¿este me va a dejar a pie?". Cada uno dice SOBRE CUÁNTO
//     está dicho (ver más abajo: es lo que estaba mal).
//  4. LAS DOS CALIFICACIONES, separadas. Alguien puede cuidar muy bien los autos
//     que alquila y a la vez tener un auto que no está a la altura de lo que
//     promete. Mezclarlas en un promedio único esconde justo lo que se quiere
//     saber.
//  5. LO QUE MÁS DESTACAN: las características contadas, ordenadas y con una
//     barra proporcional. Convierte veinte reseñas en algo que se lee en cinco
//     segundos.
//
//  ── POR QUÉ LAS CARACTERÍSTICAS YA NO SON ETIQUETAS DE COLORES ────────────
//  Eran quince cápsulas verdes y rojas amontonadas, todas del mismo tamaño, con
//  un numerito adentro. Con eso no se puede comparar: "contesta rápido 8" y
//  "llegó tarde 1" ocupaban lo mismo y gritaban igual, así que el ojo veía una
//  mancha de colores y había que leer los números uno por uno para entender algo.
//
//  Ahora es una lista ordenada con una barra proporcional. Lo más mencionado
//  está arriba y es lo más largo, y una queja aislada se ve chiquita al lado de
//  un elogio repetido, que es exactamente lo que significa. Se entiende sin leer
//  ningún número, y el número igual está.
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
import { contarAtributos, resumenDe, esBueno } from "../services/atributos";
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
function Columna({ etiqueta, valor, resumen, detalle, primera }) {
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
    </div>
  );
}

/**
 * Una característica del resumen: el nombre, cuántas veces la marcaron y una
 * barra proporcional a la más mencionada de todas.
 *
 * El piso del 8% no es decoración: sin él, una característica mencionada una vez
 * al lado de otra mencionada veinte queda con una barra de cero píxeles, o sea
 * invisible, y "aparece pero casi no pasó" se convierte en "no aparece".
 */
function Barra({ nombre, n, bueno, max }) {
  const ancho = Math.max(8, Math.round((n / max) * 100));
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span
          aria-hidden="true"
          style={{
            width: 13, height: 13, flexShrink: 0, borderRadius: 999, alignSelf: "center",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: bueno ? "var(--fw-green)" : "var(--fw-red)",
            color: "#fff", fontSize: 8.5, fontWeight: 900, lineHeight: 1,
          }}
        >
          {bueno ? "✓" : "×"}
        </span>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12, color: "var(--fw-text-2)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {nombre}
        </span>
        <strong style={{ fontSize: 12, color: "var(--fw-text-3)", fontVariantNumeric: "tabular-nums" }}>
          {n}
        </strong>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--fw-surface-3)", overflow: "hidden" }}>
        <div style={{
          width: `${ancho}%`, height: "100%", borderRadius: 2,
          background: bueno ? "var(--fw-green)" : "var(--fw-red)",
        }} />
      </div>
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

  const atencion = resumenDe(contadas, "RESPONDE_RAPIDO", "RESPONDE_TARDE");
  const puntualidad = resumenDe(contadas, "PUNTUAL", "IMPUNTUAL");

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

  // Las más mencionadas primero, buenas y malas mezcladas por cantidad: lo que
  // más le pasó a la gente con esta persona es lo que va arriba, sea del signo
  // que sea. Ordenar por signo sería elegir por el lector qué es lo importante.
  const destacadas = [...contadas].sort((a, b) => b.n - a.n).slice(0, 6);
  /*
    Contra qué se miden las barras: contra la característica más mencionada, con
    un piso de 2.

    El piso es por el perfil recién empezado. Con tres reseñas todas las
    características van una vez, así que la más mencionada vale 1 y TODAS las
    barras salen llenas: seis barras al tope, que se leen como "diez puntos en
    todo" cuando lo que pasó es que nadie repitió nada. Con el piso en 2 se
    quedan a la mitad, que es exactamente lo que significa: está mencionado, y
    todavía no hay nada que se destaque por encima del resto.
  */
  const maximo = Math.max(2, ...destacadas.map(x => x.n));

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
        padding: "13px 0", marginBottom: 13,
      }}>
        <Columna
          primera
          etiqueta={terminados !== null ? tr("rep.rentalsDone") : tr("rep.reviewsGot")}
          valor={terminados !== null ? terminados : ratingCount}
          detalle={terminados ? tr("rep.doneSplit", { owner: comoDueño, driver: comoConductor }) : null}
        />
        <Columna
          etiqueta={tr("rep.attention")}
          valor={atencion.nivel ? tr(`rep.level.${atencion.nivel}`) : tr("rep.noData")}
          resumen={atencion}
          detalle={tr("rep.basis", { good: atencion.bien, total: atencion.total })}
        />
        <Columna
          etiqueta={tr("rep.punctuality")}
          valor={puntualidad.nivel ? tr(`rep.level.${puntualidad.nivel}`) : tr("rep.noData")}
          resumen={puntualidad}
          detalle={tr("rep.basis", { good: puntualidad.bien, total: puntualidad.total })}
        />
      </div>

      {/* 4 · Las dos calificaciones, separadas */}
      {reputacion && (
        <div style={{ marginBottom: destacadas.length ? 13 : 0 }}>
          <Estrellas {...reputacion.asOwner} etiqueta={tr("profile.asOwnerShort")} sinNada={tr("profile.noReviewsShort")} />
          <Estrellas {...reputacion.asDriver} etiqueta={tr("profile.asDriver")} sinNada={tr("profile.noReviewsShort")} />
        </div>
      )}

      {/* 5 · Lo que más destacan. Sin características todavía, la sección no
             aparece: un título sobre una lista vacía es peor que nada. */}
      {destacadas.length > 0 && (
        // La raya de arriba solo cuando hay algo entre medio que separar: sin
        // las dos calificaciones, esta sección queda pegada a la franja de
        // números, que ya trae la suya, y quedaban dos rayas juntas con un
        // hueco vacío en el medio.
        <div style={reputacion
          ? { borderTop: "1px solid var(--fw-line-soft)", paddingTop: 13 }
          : undefined}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--fw-text-4)" }}>
            {tr("rep.whatTheySay")}
          </div>
          {/* Qué es el número de la derecha. Sin esto, "3" puede leerse como una
              nota del uno al cinco, que es justo lo que no es. */}
          <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 2, marginBottom: 9 }}>
            {tr("rep.whatTheySayHint")}
          </div>
          {destacadas.map(({ code, n, bueno }) => (
            <Barra key={code} nombre={tr(`attr.${code}`)} n={n} bueno={bueno} max={maximo} />
          ))}
        </div>
      )}
    </div>
  );
}
