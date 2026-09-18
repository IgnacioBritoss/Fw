// ============================================================================
//  BotonDemo — Entrar y salir de la demo, desde la franja de arriba
// ----------------------------------------------------------------------------
//  Un solo botón, en la fila de íconos donde ya están los mensajes, las
//  notificaciones, los ajustes y el asistente. Fuera de la demo entra; adentro,
//  sale.
//
//  ── POR QUÉ UN BOTÓN Y NO UN CARTEL ───────────────────────────────────────
//  La primera versión ponía una franja arriba de todo que decía "estás en la
//  demo". Explicaba de más: se entiende sin que nadie lo escriba, porque quien
//  está en la demo entró a propósito. Y ocupaba un renglón entero de pantalla en
//  TODAS las pantallas, justo en una función que existe para mostrar la app.
//
//  Lo único que de verdad hacía falta era la puerta de salida, y eso es un
//  botón. Va en la misma fila que el resto de las herramientas, que es donde uno
//  las busca, y no encima del contenido.
// ============================================================================
import { useI18n } from "../i18n/core";
import { enDemo, entrarALaDemo, salirDeLaDemo } from "../services/demo";

/** El triángulo de "reproducir": se entiende sin leer. */
const IconoEntrar = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none" />
  </svg>
);

/** La puerta con la flecha saliendo, que es el símbolo de siempre para "salir". */
const IconoSalir = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M9 16l-4-4 4-4" />
    <path d="M5 12h9" />
  </svg>
);

/**
 * El botón, con la misma forma que los demás de la franja.
 *
 * `estilo` y `alPasar` los pone quien lo dibuja, para que sea exactamente igual
 * a los de al lado sin repetir acá los colores ni las medidas: si mañana cambia
 * el alto de la franja, este cambia con ella.
 */
export default function BotonDemo({ estilo }) {
  const { t } = useI18n();
  const adentro = enDemo();
  const titulo = t(adentro ? "demo.exit" : "demo.enter");

  return (
    <button
      type="button"
      onClick={adentro ? salirDeLaDemo : entrarALaDemo}
      title={titulo}
      aria-label={titulo}
      style={{ ...estilo, ...(adentro ? { color: "var(--fw-amber-text)" } : null) }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fw-surface-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ position: "relative", display: "flex" }}>
        {adentro ? <IconoSalir /> : <IconoEntrar />}
      </span>
    </button>
  );
}
