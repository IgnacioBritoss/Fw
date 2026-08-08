// ============================================================================
//  CarIcon — El auto de perfil, dibujado como un auto
// ----------------------------------------------------------------------------
//  QUÉ REEMPLAZA: el icono anterior era `M4 17v-4l2-5h12l2 5v4` más dos
//  círculos sueltos abajo. O sea: un trapecio isósceles con dos ruedas apoyadas
//  al lado. No se leía como un auto, se leía como una figura geométrica, y era el
//  icono que más se repite en la app (menú "Mis autos", notificaciones de
//  reserva, el hueco de una publicación sin foto).
//
//  QUÉ TIENE AHORA, y por qué cada cosa:
//   · el capó y el baúl a distinta altura, con el parabrisas inclinado y la luneta
//     más parada: es lo que hace que un auto se lea como un auto y no como una
//     caja, y de paso da la orientación (mira a la derecha);
//   · los PASARRUEDAS recortados en la carrocería, con las ruedas metidas
//     adentro. Antes las ruedas eran dos círculos abajo del trapecio, sin
//     relación con el cuerpo;
//   · el parante que separa las dos ventanillas, que a este tamaño es lo que
//     distingue un auto de una camioneta;
//  SIN punto de llanta a propósito: lo probé y a 18-20 px —el tamaño al que este
//  icono se usa de verdad— el punto y el trazo de la rueda se tocan y la rueda
//  queda como una manchita. A 40 px quedaba mejor con el punto, pero a 40 px este
//  icono no se usa en ninguna parte.
//
//  La línea de cintura sí se queda: sin ella la carrocería queda vacía y el
//  parante de la ventanilla parece flotar.
// ============================================================================

export default function CarIcon({
  size = 20,
  color = "currentColor",
  strokeWidth = 1.7,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/*
        La carrocería, de una sola línea y en sentido horario desde el paragolpes
        delantero: capó → parabrisas → techo → luneta → baúl → cola, y la panza
        vuelve con los dos pasarruedas recortados.
      */}
      <path d="M2.7 15.1v-1.7c0-.5.35-.92.84-1.01l2.7-.5 2.2-2.94c.36-.48.92-.76 1.52-.76h4.3c.5 0 .98.2 1.34.55l3.1 3.06 2.05.42c.55.11.95.6.95 1.16v1.72" />
      {/* La panza: se corta en cada pasarruedas para que las ruedas queden metidas
          en la carrocería y no colgando debajo. */}
      <path d="M2.7 15.1h1.6" />
      <path d="M9.1 15.1h5.8" />
      <path d="M19.7 15.1h1.6" />
      {/* Los pasarruedas */}
      <path d="M4.3 15.1a2.4 2.4 0 0 1 4.8 0" />
      <path d="M14.9 15.1a2.4 2.4 0 0 1 4.8 0" />
      {/* Las ruedas, centradas en su pasarruedas */}
      <circle cx="6.7" cy="15.6" r="1.9" />
      <circle cx="17.3" cy="15.6" r="1.9" />
      {/* El parante entre las dos ventanillas: a 20 px es lo que separa un auto de
          una camioneta. */}
      <path d="M12.4 8.2v3.9" />
      {/* La línea de las ventanillas */}
      <path d="M6.24 11.88h13.06" />
    </svg>
  );
}
