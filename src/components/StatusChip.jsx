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

const TONES = {
  // ok: algo terminó bien y no requiere nada (pago completo, verificado)
  ok: { bar: "#16a34a", text: "#15803d", bg: "#f6fdf9" },
  // info: un hecho, sin urgencia (completada, aceptada)
  info: { bar: "#2563eb", text: "#1d4ed8", bg: "#f5f8ff" },
  // warn: falta que alguien haga algo (pendiente, lista para retiro)
  warn: { bar: "#f59e0b", text: "#b45309", bg: "#fffdf5" },
  // danger: algo salió mal (rechazada, en disputa, pago fallido)
  danger: { bar: "#dc2626", text: "#b91c1c", bg: "#fff6f6" },
  // neutral: pasó y ya no importa (cancelada, sin pagar)
  neutral: { bar: "#9ca3af", text: "#4b5563", bg: "#fafafa" },
  // live: está pasando ahora mismo (en curso). Lleva el punto lleno.
  live: { bar: "#0d9488", text: "#0f766e", bg: "#f4fdfc", pulse: true },
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
        borderTop: "1px solid #ececec",
        borderRight: "1px solid #ececec",
        borderBottom: "1px solid #ececec",
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
