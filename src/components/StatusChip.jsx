// ============================================================================
//  StatusChip — Cómo Freewheel muestra un estado
// ----------------------------------------------------------------------------
//  QUÉ REEMPLAZA: una etiqueta con caja. Fondo de color, borde por los cuatro
//  lados, esquina redondeada y una barrita al costado. Ese objeto es el "chip"
//  que trae de fábrica cualquier librería de componentes: se reconoce a la
//  primera porque está en media internet, y puesto al lado del nombre de una
//  persona parece un cartelito pegado encima de la página, no parte de ella.
//
//  QUÉ HACE AHORA: no hay caja. Es la palabra, en el color del estado, con una
//  LÍNEA ABAJO del mismo color —el mismo subrayado grueso que la app ya usa
//  para marcar la pestaña activa y el renglón que importa— y, cuando el estado
//  es "esto ya está bien", el tilde azul.
//
//  POR QUÉ ASÍ:
//   · el tilde azul no es nuevo: es exactamente el que ya aparecía al lado del
//     mail verificado en el teléfono. Estaba dibujado adentro de ChangeEmailCard
//     y lo veía solo esa pantalla; ahora es el mismo signo en toda la app;
//   · sin caja, dos estados seguidos ("Pago completo · Aceptada") se leen como
//     dos datos de la misma fila y no como dos stickers;
//   · el color queda en la letra y en la línea. No hay fondo pastel que haya que
//     acordarse de cambiar cuando la app pasa a modo oscuro: era justo lo que
//     dejaba VERIFICADO blanco sobre negro en el perfil;
//   · versalitas espaciadas, que es la tipografía que la app ya usa para las
//     etiquetas chicas (DÓNDE, RETIRO, PRUEBAS ADJUNTAS).
//
//  Props:
//    · tone → "verified" | "ok" | "info" | "warn" | "danger" | "neutral" | "live"
//    · children → el texto
//    · title → texto al pasar el mouse (opcional)
// ============================================================================

/*
  TODO SALE DE LA PALETA, NADA ESCRITO A MANO.

  Cada tono es UN color y nada más: con él se pinta la letra, la línea de abajo
  y el tilde. Se usa el token de texto —no el vivo— porque es el que está
  calibrado para leerse en los dos modos: en claro es oscuro (#166534) y en
  oscuro es claro (#56d364). El vivo sirve para un fondo, no para una palabra
  de once píxeles.

  Un tono nuevo se agrega acá y sale bien en claro, en oscuro y en daltonismo
  sin que nadie tenga que revisarlo de nuevo.
*/
const TONES = {
  // verified: la marca de confianza. Azul de la app + tilde. Es lo que se pone
  // al lado de un nombre o de un mail: "esta persona es quien dice ser".
  verified: { color: "var(--fw-blue-text)", tick: true },
  // ok: algo terminó bien y no requiere nada (pago completo, completada)
  ok: { color: "var(--fw-green-text-2)", tick: true },
  // info: un hecho, sin urgencia (aceptada)
  info: { color: "var(--fw-blue-text)" },
  // warn: falta que alguien haga algo (pendiente, lista para retiro). Sin tilde,
  // justamente porque todavía no está hecho.
  warn: { color: "var(--fw-amber-text)" },
  // danger: algo salió mal (rechazada, en disputa, pago fallido)
  danger: { color: "var(--fw-red-text-2)" },
  // neutral: pasó y ya no importa (cancelada, sin pagar)
  neutral: { color: "var(--fw-text-3)" },
  // live: está pasando ahora mismo (en curso). Lleva el punto lleno adelante
  // para que se distinga de un vistazo de un estado ya cerrado.
  live: { color: "var(--fw-teal-text)", dot: true },
};

export default function StatusChip({ tone = "neutral", children, title, style }) {
  const t = TONES[tone] ?? TONES.neutral;

  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        color: t.color,
        // El subrayado. 2px es el mismo grosor que la marca de pestaña activa:
        // se ve a la distancia sin convertirse en una barra.
        borderBottom: `2px solid ${t.color}`,
        // Aire entre la palabra y la línea, para que no la toque.
        paddingBottom: 2,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        lineHeight: 1.35,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {t.dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: "currentColor",
          flexShrink: 0,
        }} />
      )}
      {t.tick && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          style={{ flexShrink: 0, display: "block" }}>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </span>
  );
}
