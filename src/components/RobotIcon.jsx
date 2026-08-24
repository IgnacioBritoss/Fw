// ============================================================================
//  RobotIcon — La cara de Wili
// ----------------------------------------------------------------------------
//  Una cara de robot dice "esto contesta una máquina" y además le pone cara a
//  Wili, que es el nombre con el que se presenta.
//
//  Está armado con lo mínimo que se lee a 18 píxeles: la cabeza redondeada, la
//  antenita arriba, dos ojos y la boca. Con orejas, cuello o tornillos, a ese
//  tamaño se convierte en una mancha.
//
//  POR QUÉ ESTÁ ACÁ Y NO ADENTRO DE UNA PANTALLA. Lo usan el botón flotante de
//  la barra y el encabezado del chat. Estaba escrito adentro de Layout.jsx, así
//  que el chat no podía usarlo y tenía otro dibujo —una rueda de auto—: el mismo
//  asistente con dos caras distintas según dónde lo mirabas.
// ============================================================================

export default function RobotIcon({ size = 18, color = "#374151" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 2v3" />
      <rect x="3.5" y="7" width="17" height="13" rx="4" />
      <path d="M9 12.5v1.5M15 12.5v1.5" />
      <path d="M9.5 17h5" />
    </svg>
  );
}
