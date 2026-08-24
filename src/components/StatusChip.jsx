// ============================================================================
//  StatusChip — Cómo Freewheel muestra un estado
// ----------------------------------------------------------------------------
//  QUÉ REEMPLAZA: cápsulas totalmente redondeadas, verde pastel con letra verde
//  oscura, tipo "verificado". Ese es el chip que trae de fábrica cualquier
//  librería de componentes y que aparece en media internet: no dice nada de esta
//  app y, puesto al lado de cuatro estados distintos, todos se parecen entre sí.
//
//  QUÉ HACE DISTINTO:
//   · esquina apenas redondeada (4px), no una píldora: acompaña las tarjetas y los
//     botones del resto de la app, que tampoco son redondos;
//   · una BARRA DE COLOR a la izquierda, del mismo grosor que la que ya usan los
//     paneles de la app (el de disponibilidad, el de datos leídos del documento).
//     Es la marca visual que se repite en toda la página;
//   · el color vive en la barra y en el texto, no en un fondo pastel: el fondo
//     queda casi neutro, así en una fila con varios estados se lee la jerarquía en
//     vez de un semáforo;
//   · versalitas espaciadas, que es la tipografía que la app ya usa para las
//     etiquetas chicas (DÓNDE, RETIRO, PRUEBAS ADJUNTAS);
//   · un punto lleno solo en los estados que están PASANDO ahora, para que "En
//     curso" se distinga de un vistazo de "Completada".
//
//  Props:
//    · tone → "ok" | "info" | "warn" | "danger" | "neutral" | "live"
//    · children → el texto
//    · title → texto al pasar el mouse (opcional)
// ============================================================================

/*
  TODO SALE DE LA PALETA, NADA ESCRITO A MANO.

  Antes cuatro de estos seis tenían el color puesto acá adentro: un verde oscuro
  sobre un fondo casi blanco (#f6fdf9), un rojo sobre #fff6f6. Escrito así, el
  chip NO SE ENTERA de que la app cambió a modo oscuro: el fondo pálido se queda
  pálido, y lo que se ve al lado del nombre es una etiqueta blanca encima de una
  pantalla negra. Es lo que pasaba con VERIFICADO en el perfil.

  Con las variables, el chip pide un papel —"el verde de fondo"— y el modo se
  encarga de qué color es ese papel en cada caso. Un chip nuevo sale bien en los
  dos modos sin que nadie se acuerde de revisarlo.
*/
const TONES = {
  // ok: algo terminó bien y no requiere nada (pago completo, verificado)
  ok: { bar: "var(--fw-green)", text: "var(--fw-green-text-2)", bg: "var(--fw-green-bg)" },
  // info: un hecho, sin urgencia (completada, aceptada)
  info: { bar: "var(--fw-blue)", text: "var(--fw-blue-text)", bg: "var(--fw-blue-bg)" },
  // warn: falta que alguien haga algo (pendiente, lista para retiro)
  warn: { bar: "var(--fw-amber)", text: "var(--fw-amber-text)", bg: "var(--fw-amber-bg)" },
  // danger: algo salió mal (rechazada, en disputa, pago fallido)
  danger: { bar: "var(--fw-red)", text: "var(--fw-red-text-2)", bg: "var(--fw-red-bg)" },
  // neutral: pasó y ya no importa (cancelada, sin pagar)
  neutral: { bar: "var(--fw-text-4)", text: "var(--fw-text-2)", bg: "var(--fw-surface-2)" },
  // live: está pasando ahora mismo (en curso). Lleva el punto lleno.
  live: { bar: "var(--fw-teal)", text: "var(--fw-teal-text)", bg: "var(--fw-teal-bg)", pulse: true },
};

export default function StatusChip({ tone = "neutral", children, title, style }) {
  const t = TONES[tone] ?? TONES.neutral;

  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        // La barra de color a la izquierda: el mismo recurso que los paneles.
        borderLeft: `3px solid ${t.bar}`,
        borderTop: "1px solid var(--fw-line)",
        borderRight: "1px solid var(--fw-line)",
        borderBottom: "1px solid var(--fw-line)",
        borderRadius: 4,
        background: t.bg,
        color: t.text,
        padding: "3px 9px 3px 7px",
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: ".055em",
        textTransform: "uppercase",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {t.pulse && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: t.bar,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
