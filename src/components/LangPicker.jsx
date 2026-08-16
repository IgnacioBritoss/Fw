// ============================================================================
//  LangPicker — El botón de idioma de las pantallas de entrada
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE: el idioma se podía cambiar únicamente desde Ajustes, y a
//  Ajustes se llega estando adentro. Alguien que entra por primera vez y no lee
//  castellano se encontraba con el registro entero en un idioma que no eligió y
//  sin ninguna forma de cambiarlo: la app está traducida a cinco idiomas y en la
//  única pantalla donde eso importa de verdad no había manera de elegir.
//
//  Es el mismo selector que la landing: el globo, el código del idioma actual y
//  abajo la lista de los cinco.
//
//  Cada opción está escrita EN SU PROPIO IDIOMA —"Português", no "Portugués"—
//  porque quien busca su idioma en una lista busca la palabra que conoce, no su
//  traducción al castellano. Es la regla que siguen todos los selectores de
//  idioma que funcionan.
//
//  La lista SE DIBUJA SOLO CUANDO ESTÁ ABIERTA, no se esconde con CSS: así los
//  cinco botones no quedan en el orden de tabulación de una lista invisible,
//  que es el error clásico de los menús desplegables.
//
//  Se cierra de las tres maneras que la gente intenta: eligiendo, tocando
//  afuera y con Escape.
//
//  `tono` es sobre qué fondo se apoya: "claro" para la columna blanca del
//  formulario, "oscuro" para la franja de arriba del teléfono.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useI18n } from "../i18n/core";

const Globo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    {/* El meridiano y los paralelos: con dos curvas y una línea el globo se lee
        a 15px. Con los continentes de verdad, no. */}
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
  </svg>
);

export default function LangPicker({ tono = "claro", style }) {
  const { t: tr, lang, setLang } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    // `pointerdown` y no `click`: si se escucha el clic, tocar el botón que abre
    // el menú lo cierra en el mismo gesto y parece que no pasa nada.
    const afuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    window.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      window.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const actual = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const oscuro = tono === "oscuro";

  const colorTexto = oscuro ? "rgba(255,255,255,.85)" : "#6b7280";
  const borde = oscuro ? "rgba(255,255,255,.22)" : "#e5e7eb";

  return (
    <div ref={caja} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${tr("settings.language")}: ${actual.label}`}
        title={tr("settings.language")}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 10px", borderRadius: 9,
          border: `1px solid ${borde}`,
          background: oscuro ? "rgba(255,255,255,.08)" : "#fff",
          color: colorTexto, cursor: "pointer",
          fontSize: 12.5, fontWeight: 700, letterSpacing: ".03em",
        }}
      >
        <Globo />
        {actual.flagless}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
          background: "#fff", border: "1px solid #ececec", borderRadius: 12,
          boxShadow: "0 8px 28px rgba(0,0,0,.12)", padding: 5, minWidth: 168,
        }}>
          {LANGUAGES.map((l) => {
            const elegido = l.code === lang;
            return (
              <button
                key={l.code}
                lang={l.code}
                aria-current={elegido}
                onClick={() => { setLang(l.code); setAbierto(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 10px", borderRadius: 8, border: "none",
                  background: elegido ? "#eff6ff" : "transparent",
                  color: elegido ? "#0f6ce6" : "#374151",
                  fontSize: 13.5, fontWeight: elegido ? 700 : 500,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                  color: elegido ? "#0f6ce6" : "#9ca3af", width: 20, flexShrink: 0,
                }}>
                  {l.flagless}
                </span>
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
