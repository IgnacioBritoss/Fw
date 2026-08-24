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
import { useI18n } from "../i18n/core";
import { rankOf, nextRank } from "../services/rank";
import EscudoDeRango from "./EscudoDeRango";

/*
  EL DIBUJO DEL ESCUDO SE MUDÓ A EscudoDeRango.jsx.

  Estaba escrito acá adentro, y la planilla de reputación necesita la medalla
  SIN la cajita con borde y fondo que dibuja este componente: ahí el nombre del
  rango es el título del cuadro, no una etiqueta pegada al costado. Copiar el
  dibujo hubiera dejado dos escudos que se pueden desincronizar el día que se
  toque uno.
*/

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
        borderTop: "1px solid var(--fw-line)",
        borderRight: "1px solid var(--fw-line)",
        borderBottom: "1px solid var(--fw-line)",
        borderRadius: 4,
        background: tier.bg,
        padding: small ? "4px 9px 4px 7px" : "9px 14px 9px 11px",
        ...style,
      }}
    >
      <EscudoDeRango metal={tier.metal} color={tier.color} size={small ? 15 : 22} />
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
          <div style={{ fontSize: 11.5, color: "var(--fw-text-3)", marginTop: 2 }}>
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
