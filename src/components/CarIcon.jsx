// ============================================================================
//  CarIcon — El auto DE FRENTE, en una sola mancha negra
// ----------------------------------------------------------------------------
//  POR QUÉ DE FRENTE Y NO DE PERFIL
//  La marca de Freewheel ya es un auto de perfil (components/Logo). Cuando el
//  menú, las notificaciones y el hueco de una publicación sin foto usaban también
//  un auto de perfil, la misma pantalla mostraba el mismo dibujo cuatro veces con
//  dos significados distintos: uno quería decir "Freewheel" y los otros tres
//  "auto". De frente se distingue de un vistazo y deja de competir con el logo.
//
//  CÓMO ESTÁ HECHO, y por qué es una silueta llena y no un contorno
//   · a 18-20 px —el tamaño al que este icono se usa de verdad— una línea fina se
//     convierte en una manchita gris. Una forma llena se sigue leyendo;
//   · el parabrisas y los dos faros son AGUJEROS de verdad (fill-rule "evenodd"),
//     no círculos blancos pintados encima. Por eso el mismo icono funciona sobre
//     el fondo blanco de una tarjeta y sobre el renglón oscuro del menú, donde un
//     círculo blanco quedaría como una mancha suelta;
//   · los espejos se apoyan en el hombro de la carrocería y la muerden un poco:
//     si quedaran separados se leerían como dos puntos sueltos al costado. Son lo
//     que termina de decir "esto se mira de frente";
//   · las patas arrancan metidas dentro del cuerpo, así no se ve la juntura.
//
//  `strokeWidth` se sigue aceptando y se ignora: había llamadas que lo pasaban y
//  no vale la pena romperlas por un dibujo que ya no tiene trazo.
// ============================================================================

// El techo. La segunda figura del mismo trazado es el parabrisas: con "evenodd",
// lo que queda encerrado dos veces se vacía.
const TECHO =
  "M6.4 10.9 L8.9 4.9 Q9.4 3.4 10.9 3.4 H13.1 Q14.6 3.4 15.1 4.9 L17.6 10.9 Z " +
  "M8.7 9.7 L10.4 5.6 Q10.6 5.2 11.1 5.2 H12.9 Q13.4 5.2 13.6 5.6 L15.3 9.7 Z";

// La carrocería, con los dos faros calados.
const CARROCERIA =
  "M4.6 10.2 H19.4 Q20.9 10.2 20.9 11.7 V15.0 Q20.9 17.0 18.9 17.0 H5.1 " +
  "Q3.1 17.0 3.1 15.0 V11.7 Q3.1 10.2 4.6 10.2 Z " +
  "M6.6 11.8 A1.75 1.75 0 1 0 6.6 15.3 A1.75 1.75 0 1 0 6.6 11.8 Z " +
  "M17.4 11.8 A1.75 1.75 0 1 0 17.4 15.3 A1.75 1.75 0 1 0 17.4 11.8 Z";

export default function CarIcon({
  size = 18,
  color = "currentColor",
  // eslint-disable-next-line no-unused-vars
  strokeWidth,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={TECHO} />
      {/* Los espejos */}
      <circle cx="2.55" cy="11.1" r="1.2" />
      <circle cx="21.45" cy="11.1" r="1.2" />
      {/* Las patas */}
      <rect x="4.5" y="15.3" width="3" height="5.2" rx="0.9" />
      <rect x="16.5" y="15.3" width="3" height="5.2" rx="0.9" />
      <path fillRule="evenodd" clipRule="evenodd" d={CARROCERIA} />
    </svg>
  );
}
