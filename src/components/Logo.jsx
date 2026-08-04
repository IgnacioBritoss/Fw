// ============================================================================
//  Logo — La marca de Freewheel, en un solo lugar
// ----------------------------------------------------------------------------
//  ANTES: había cuatro copias distintas del logo (en Layout, en AuthShell, en
//  Register y en KYC), y todas dibujaban lo mismo: un círculo, un punto en el
//  medio y ocho rayitas iguales alrededor. Eso a 20px se ve como un engranaje o un
//  sol, no como una rueda, y a cualquier tamaño se parece a un icono de ajustes.
//  Además, al estar copiado cuatro veces, arreglarlo en un lado no arreglaba los
//  otros tres.
//
//  AHORA: una sola rueda, dibujada como una llanta de verdad:
//   · la LLANTA es un anillo grueso, no una línea fina, así el contorno sigue
//     leyéndose a 18px;
//   · cinco RAYOS en vez de ocho rayitas: es el número que usan las llantas
//     deportivas y, siendo impar, la figura no queda simétrica como un engranaje;
//   · un BUJE lleno en el centro, que le da peso al medio;
//   · el anillo tiene un CORTE arriba a la derecha y dos LÍNEAS DE VELOCIDAD
//     detrás: es lo que convierte una rueda quieta en una rueda que va, y es la
//     parte que hace que el logo sea de esta app y no de cualquiera.
//
//  Props:
//   · size      → alto del símbolo en px (20 por defecto)
//   · light     → true en fondos oscuros (el "Free" va blanco)
//   · wordmark  → false para mostrar solo el símbolo
//   · accent    → color de la rueda y de "wheel"
// ============================================================================

export function LogoMark({ size = 26, accent = "#2563eb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      {/* Líneas de velocidad: van detrás y por izquierda, como el aire que queda.
          Debajo de 24px se sacan: a ese tamaño no se leen como movimiento, se ven
          como dos manchitas sueltas al costado de la rueda. */}
      {size >= 24 && (
        <path d="M2.5 11.5h5.2M0.8 16h4.2" stroke={accent} strokeWidth="1.8"
          strokeLinecap="round" opacity=".45" />
      )}

      {/* La llanta: anillo grueso con un corte arriba a la derecha. El corte se
          hace con un arco que no cierra, no con una máscara: así se mantiene
          nítido en cualquier tamaño. */}
      <path d="M25.9 8.6a11 11 0 1 1-3.4-3.1" stroke={accent} strokeWidth="2.6"
        strokeLinecap="round" />

      {/* Los cinco rayos, desde el buje hacia la llanta. */}
      {[-90, -18, 54, 126, 198].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={deg}
            x1={16 + 4.4 * Math.cos(rad)} y1={16 + 4.4 * Math.sin(rad)}
            x2={16 + 9.4 * Math.cos(rad)} y2={16 + 9.4 * Math.sin(rad)}
            stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
        );
      })}

      {/* El buje. */}
      <circle cx="16" cy="16" r="3.4" fill={accent} />
    </svg>
  );
}

export default function Logo({ size = 20, light = false, wordmark = true, accent = "#2563eb" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <LogoMark size={size + 6} accent={accent} />
      {wordmark && (
        <span style={{
          fontWeight: 800, fontSize: size, letterSpacing: "-0.4px", lineHeight: 1,
        }}>
          <span style={{ color: light ? "#fff" : "#111827" }}>Free</span>
          <span style={{ color: accent }}>wheel</span>
        </span>
      )}
    </span>
  );
}
