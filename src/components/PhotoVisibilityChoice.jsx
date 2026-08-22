// ============================================================================
//  PhotoVisibilityChoice — Las dos opciones de quién ve tu foto
// ----------------------------------------------------------------------------
//  Aparece en DOS lugares: al encuadrar una foto nueva (así elegir quién la ve es
//  parte de ponerla, no un ajuste escondido en otra pantalla) y en el perfil, para
//  poder cambiarlo cuando se quiera. Es un solo componente para que las dos digan
//  exactamente lo mismo: si fueran dos copias, mañana una dice "solo quien
//  reservó" y la otra "solo mis contactos", y el ajuste deja de ser claro.
//
//  Las dos opciones se muestran SIEMPRE las dos, con lo que hace cada una escrito
//  abajo. Un interruptor de "foto privada" sí/no obliga a adivinar qué significa
//  cada posición, y de un ajuste de privacidad nadie tiene que adivinar nada.
// ============================================================================
import { useI18n } from "../i18n/core";
import { FOTO_RESERVAS, FOTO_TODOS } from "../services/people";

/** El tilde de la opción elegida. */
const Tilde = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
    strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function PhotoVisibilityChoice({ value, onChange, disabled = false }) {
  const { t: tr } = useI18n();

  const OPCIONES = [
    { id: FOTO_TODOS, title: "profile.photoEveryone", desc: "profile.photoEveryoneSub" },
    { id: FOTO_RESERVAS, title: "profile.photoBooked", desc: "profile.photoBookedSub" },
  ];

  return (
    <div role="radiogroup" aria-label={tr("profile.photoWho")}>
      {OPCIONES.map((opcion) => {
        const elegida = value === opcion.id;
        return (
          <button
            key={opcion.id}
            type="button"
            role="radio"
            aria-checked={elegida}
            disabled={disabled}
            onClick={() => onChange(opcion.id)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 11, width: "100%",
              textAlign: "left", padding: "11px 13px", marginBottom: 8,
              background: elegida ? "var(--fw-blue-bg)" : "var(--fw-surface)",
              border: `1.5px solid ${elegida ? "var(--fw-blue)" : "var(--fw-border)"}`,
              borderRadius: 12, cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.6 : 1, transition: "border-color .15s, background .15s",
            }}
          >
            <span
              style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                background: elegida ? "var(--fw-blue)" : "var(--fw-surface)",
                border: `1.5px solid ${elegida ? "var(--fw-blue)" : "var(--fw-border-2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {elegida && <Tilde />}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>
                {tr(opcion.title)}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--fw-text-3)", marginTop: 2, lineHeight: 1.45 }}>
                {tr(opcion.desc)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
