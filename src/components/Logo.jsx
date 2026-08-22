// ============================================================================
//  Logo — La marca de Freewheel, en un solo lugar
// ----------------------------------------------------------------------------
//  UN AUTO, NO UNA RUEDA.
//
//  Antes el símbolo era una llanta: un anillo con rayos y un buje. El problema
//  de una rueda como marca es que a tamaño chico —18 o 20px, que es como se ve
//  en la barra— cualquier círculo con rayitas alrededor se lee como un engranaje
//  o como el ícono de ajustes. Y es lo primero que aparece cuando se busca "logo
//  de alquiler de autos": no distingue a esta app de ninguna otra.
//
//  Ahora es el mismo auto que usa la landing, así las dos caras del proyecto
//  tienen una sola marca en vez de dos parecidas.
//
//  CÓMO ESTÁ HECHO EL SÍMBOLO
//   · el CUERPO es una sola forma llena: el perfil de un sedán reducido a lo
//     mínimo que todavía se lee como auto. Bajo y largo (48 × 22 unidades), con
//     el parabrisas inclinado. Las proporciones importan: con la cabina más alta
//     y las curvas más redondas se vuelve un autito de juguete;
//   · las RUEDAS no están dibujadas con líneas. El cuerpo tiene dos muescas
//     semicirculares —los pasos de rueda— y las ruedas son dos círculos apoyados
//     adentro, separados por un aire mínimo. Ese aire es lo que hace que la marca
//     funcione en UN SOLO color: no hay contornos, hay formas y espacios.
//
//  Por qué relleno y no contorno: una línea fina a 16px —el tamaño real del
//  ícono de una pestaña— se convierte en una mancha gris. Una forma llena con
//  huecos se sigue leyendo.
//
//  Props:
//   · size      → ALTO del símbolo en px, y tamaño de la palabra
//   · light     → true en fondos oscuros (el "Free" va blanco)
//   · wordmark  → false para mostrar solo el símbolo
//   · accent    → color del auto y de "wheel"
// ============================================================================

// El trazado del cuerpo. Los dos arcos ("A") del final son las muescas de los
// pasos de rueda: muerden el borde de abajo hacia arriba.
const CUERPO =
  "M1 12.4C1 11.2 1.8 10.2 3 9.9L13.2 7.6L18.6 3.2C19.4 2.6 20.3 2.3 21.3 " +
  "2.3H29.5C30.8 2.3 32 2.8 32.9 3.7L38.4 9.2L45 10.6C46.2 10.9 47 11.9 47 " +
  "13.1V15.3C47 16 46.4 16.5 45.7 16.5H40.5A4.3 4.3 0 0 0 31.9 16.5H16.1A4.3 " +
  "4.3 0 0 0 7.5 16.5H2.3C1.6 16.5 1 16 1 15.3V12.4Z";

// El auto es bajo y largo: 48 de ancho por 22 de alto. `size` es el ALTO, y el
// ancho sale de esa proporción. Si se forzara un cuadrado, el auto quedaría
// estirado o con aire muerto a los costados.
const PROPORCION = 48 / 22;

export function LogoMark({ size = 20, accent = "#0f6ce6" }) {
  return (
    <svg width={Math.round(size * PROPORCION)} height={size} viewBox="0 0 48 22"
      fill="none" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <path d={CUERPO} fill={accent} />
      <circle cx="11.8" cy="16.5" r="3" fill={accent} />
      <circle cx="36.2" cy="16.5" r="3" fill={accent} />
    </svg>
  );
}

export default function Logo({ size = 20, light = false, wordmark = true, accent = "#0f6ce6" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      {/* Un empujón mínimo hacia abajo: el auto tiene las ruedas colgando por
          debajo de su masa principal, así que centrado exacto se ve flotando al
          lado de la palabra. */}
      <span style={{ display: "flex", transform: "translateY(1px)" }}>
        <LogoMark size={size} accent={accent} />
      </span>
      {wordmark && (
        <span style={{
          fontWeight: 800, fontSize: size, letterSpacing: "-0.4px", lineHeight: 1,
        }}>
          <span style={{ color: light ? "#fff" : "var(--fw-text)" }}>Free</span>
          <span style={{ color: accent }}>wheel</span>
        </span>
      )}
    </span>
  );
}
