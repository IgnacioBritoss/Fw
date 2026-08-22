// ============================================================================
//  Spinner — "Esto está cargando"
// ----------------------------------------------------------------------------
//  Antes la espera se avisaba con un texto: "Cargando...", "Buscando autos...",
//  y en varias pantallas con nada. Un texto quieto no dice si algo está pasando o
//  si se colgó, y por eso la espera se siente más larga de lo que es.
//
//  Es el círculo de siempre, el mismo que aparece cuando se traba un video: un
//  anillo con un tramo de color que gira. NO es una rueda de auto a propósito —
//  aunque sea la marca—: una rueda girando en cada carga queda de dibujito, y esto
//  tiene que verse serio. El color es el azul de la página.
//
//  Props:
//   · size  → diámetro en px (20 por defecto)
//   · color → color del tramo que gira
//   · label → texto al lado (opcional). Sin texto, igual se anuncia a los
//             lectores de pantalla con role="status".
//   · block → centrado con aire, para cuando ocupa una sección entera
// ============================================================================

export default function Spinner({ size = 20, color = "var(--fw-blue)", label, block = false }) {
  const anillo = (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        // El anillo completo en gris claro y un solo tramo en azul: al girar, ese
        // tramo es lo que se ve moverse.
        border: `${Math.max(2, Math.round(size / 9))}px solid var(--fw-border)`,
        borderTopColor: color,
        animation: "fw-spin .7s linear infinite",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    />
  );

  const contenido = label ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {anillo}
      <span style={{ fontSize: 13.5, color: "var(--fw-text-3)" }}>{label}</span>
    </span>
  ) : anillo;

  if (!block) {
    return <span role="status" aria-live="polite" aria-busy="true" aria-label={label || undefined}>{contenido}</span>;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || undefined}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 12, padding: "48px 20px",
      }}
    >
      {anillo}
      {label && <span style={{ fontSize: 13.5, color: "var(--fw-text-3)" }}>{label}</span>}
    </div>
  );
}
