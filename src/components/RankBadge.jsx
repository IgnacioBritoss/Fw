// ============================================================================
//  RankBadge — El rango de una persona, según sus reseñas reales
// ----------------------------------------------------------------------------
//  QUÉ RESUELVE: hasta ahora el perfil mostraba "4.9 ★" escrito a mano, igual
//  para todo el mundo, incluso para una cuenta recién creada que nunca alquiló
//  nada. Un puntaje inventado es peor que no mostrar nada: la persona que lo lee
//  toma una decisión con información falsa.
//
//  AHORA: el rango se calcula con la cantidad de reseñas y el promedio que
//  devuelve el backend. Sin reseñas no hay rango ni promedio, y se dice
//  explícitamente que todavía no hay.
//
//  EL DISEÑO (a propósito, no es un adorno):
//   · un escudo de lados rectos y base en punta, dibujado con trazo, no una
//     pastilla redonda ni un círculo con degradado —eso es lo que sale por
//     defecto en cualquier librería y se reconoce a un kilómetro;
//   · el rango se lee por CANTIDAD DE BARRAS adentro del escudo (una a cuatro),
//     así se distingue de un vistazo y también sin color (impresión, daltonismo);
//   · un solo color plano por rango, en el trazo y en el texto, con el fondo casi
//     neutro: el mismo criterio que StatusChip usa en el resto de la app;
//   · versalitas espaciadas, la tipografía que la app ya usa para las etiquetas
//     chicas. El badge queda emparentado con los chips de estado en vez de ser
//     una isla visual.
//
//  Los umbrales piden cantidad Y promedio: veinte reseñas de 3 estrellas no son
//  un rango alto. Y el rango nunca baja de "bronce" mientras haya al menos una
//  reseña: no se castiga a alguien por tener pocas.
// ============================================================================
import { useI18n } from "../i18n/core";
import { rankOf, nextRank } from "../services/rank";

/**
 * El escudo. Trazo plano, sin relleno degradado y sin ningún círculo: las barras
 * son rectángulos y la base es una punta recta.
 */
function Shield({ color, bars, size = 20 }) {
  // Alto/ancho 20×24 en el viewBox; la punta de abajo cierra en el centro.
  const height = Math.round(size * 1.2);
  return (
    <svg width={size} height={height} viewBox="0 0 20 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* Escudo: hombros rectos, laterales que se cierran, base en punta */}
      <path
        d="M10 1.4 18.2 3.6V11.4C18.2 16.3 14.9 20.2 10 22.4 5.1 20.2 1.8 16.3 1.8 11.4V3.6L10 1.4Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Las barras del rango, centradas. Una a cuatro, de abajo hacia arriba. */}
      {Array.from({ length: bars }).map((_, i) => (
        <rect
          key={i}
          x="6"
          y={14.6 - i * 3}
          width="8"
          height="1.9"
          rx="0.4"
          fill={color}
        />
      ))}
    </svg>
  );
}

/**
 * Props:
 *  · count / average → los números REALES que devolvió el backend
 *  · size → "sm" (al lado de un nombre) | "md" (bloque propio en el perfil)
 *  · showProgress → agrega la línea "faltan N reseñas para X" (solo en "md")
 */
export default function RankBadge({ count = 0, average = null, size = "md", showProgress = false, style }) {
  const { t: tr } = useI18n();
  const tier = rankOf(count, average);
  const upcoming = showProgress ? nextRank(count, average) : null;
  const small = size === "sm";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 7 : 10,
        borderLeft: `3px solid ${tier.color}`,
        borderTop: "1px solid #ececec",
        borderRight: "1px solid #ececec",
        borderBottom: "1px solid #ececec",
        borderRadius: 4,
        background: tier.bg,
        padding: small ? "4px 9px 4px 7px" : "9px 14px 9px 11px",
        ...style,
      }}
    >
      <Shield color={tier.color} bars={tier.bars} size={small ? 15 : 22} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: small ? 10.5 : 12,
            fontWeight: 800,
            letterSpacing: ".055em",
            textTransform: "uppercase",
            color: tier.color,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {tr(`rank.${tier.key}`)}
        </div>
        {!small && (
          <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>
            {tier.key === "new"
              ? tr("rank.newHint")
              : upcoming
                ? tr("rank.progress", { count, target: upcoming.target, next: tr(`rank.${upcoming.key}`) })
                : tr("rank.maxed")}
          </div>
        )}
      </div>
    </div>
  );
}
