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
//  EL DISEÑO — el mismo escudo que la landing, para que las dos caras del
//  proyecto muestren la misma insignia y no dos parecidas.
//
//  CÓMO SE HACE QUE UN DIBUJO PLANO PAREZCA METAL, SIN DEGRADADOS
//  El truco no es el brillo: es la FACETA. Una pieza de metal tiene caras planas
//  que reciben la luz en ángulos distintos, y el ojo lee esa diferencia de tono
//  como volumen. Acá el escudo está partido al medio en dos tonos del mismo
//  color —la mitad izquierda más clara, la derecha más oscura—, con un borde
//  apenas más profundo. Tres tonos planos, cero degradados, y el escudo deja de
//  ser una silueta para convertirse en un objeto.
//
//  Los tonos salen del metal real: el bronce tira a marrón anaranjado, la plata
//  a gris frío, el oro a amarillo cálido y el platino a un gris con azul, que es
//  lo que lo diferencia de la plata.
//
//  SIN BARRAS. Antes el rango se contaba con una a cuatro rayitas blancas
//  adentro del escudo; ensuciaban la pieza y la hacían ver como un ícono de
//  interfaz en vez de una insignia. El nombre del rango va escrito al lado, así
//  que la información no se pierde ni depende del color.
//
//  Los umbrales piden cantidad Y promedio: veinte reseñas de 3 estrellas no son
//  un rango alto. Y el rango nunca baja de "bronce" mientras haya al menos una
//  reseña: no se castiga a alguien por tener pocas.
// ============================================================================
import { useId } from "react";
import { useI18n } from "../i18n/core";
import { rankOf, nextRank } from "../services/rank";

// El contorno: hombros rectos, laterales que se cierran y base en punta.
const ESCUDO = "M10 1.2 18.4 3.5V11.5C18.4 16.5 15 20.5 10 22.8 5 20.5 1.6 16.5 1.6 11.5V3.5L10 1.2Z";
// La mitad izquierda, la cara que "recibe la luz": recorre el mismo borde solo
// del lado izquierdo y cierra por el eje central.
const CARA = "M10 1.2 1.6 3.5V11.5C1.6 16.5 5 20.5 10 22.8Z";

function Shield({ metal, color, size = 22 }) {
  // El identificador del recorte tiene que ser único: puede haber varios escudos
  // de platino en la misma pantalla (una lista de personas), y con el id repetido
  // todos usarían el recorte del primero.
  const idDestello = useId();
  const alto = Math.round(size * 1.2);

  // Sin metal (todavía sin reseñas): el escudo va hueco, contorneado, y con un
  // signo de pregunta adentro. Vacío del todo se leía como un dibujo a medio
  // hacer; el "?" dice que el rango está por verse.
  if (!metal) {
    return (
      <svg width={size} height={alto} viewBox="0 0 20 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d={ESCUDO} stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
        {/* La línea de base va puesta a mano (y=15.6) en vez de centrar con
            dominant-baseline: esa propiedad la interpretan distinto los
            navegadores y en Safari el signo queda corrido hacia arriba. */}
        <text x="10" y="15.6" textAnchor="middle" fontSize="12" fontWeight="700"
          fontFamily="inherit" fill={color}>?</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={alto} viewBox="0 0 20 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* La cara oscura: el escudo entero. */}
      <path d={ESCUDO} fill={metal.dark} />
      {/* La cara clara, encima, solo la mitad izquierda. */}
      <path d={CARA} fill={metal.light} />
      {/* El borde, un tono más profundo que las dos caras. */}
      <path d={ESCUDO} stroke={metal.rim} strokeWidth="1" strokeLinejoin="round" />

      {/* El destello del platino: una franja clara en diagonal, como el reflejo
          sobre metal pulido. Va recortada con la forma del escudo. */}
      {metal.shine && (
        <>
          <defs>
            <clipPath id={idDestello}><path d={ESCUDO} /></clipPath>
          </defs>
          <g clipPath={`url(#${idDestello})`}>
            <path d="M13.5 -2 20 4 8 24 1.5 18Z" fill="#ffffff" opacity="0.5" />
            <path d="M18.5 1 21 3.4 10.5 24 8 21.6Z" fill="#ffffff" opacity="0.35" />
          </g>
        </>
      )}
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
      <Shield metal={tier.metal} color={tier.color} size={small ? 15 : 22} />
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
