// ============================================================================
//  CurrencyPicker — El botón de moneda, al lado del de idioma
// ----------------------------------------------------------------------------
//  Va pegado al de idioma porque resuelven lo mismo: alguien de afuera que entra
//  a la app. El idioma le deja leerla; la moneda le deja entender los precios.
//  Airbnb los tiene juntos por esa razón y no por decoración.
//
//  DICE QUE EL COBRO ES EN PESOS, siempre. Cambiar la moneda es cambiar cómo se
//  LEE el precio, no en qué se paga: dejar eso a la imaginación sería prometer
//  algo que la app no hace.
//
//  Está armado igual que LangPicker —mismo tamaño, mismo desplegable, se cierra
//  eligiendo, tocando afuera o con Escape— para que los dos se vean como un solo
//  control de dos partes y no como dos botones que quedaron al lado.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { useI18n } from "../i18n/core";

/** Un billete. El símbolo $ no sirve: es el de varias de las monedas de la lista. */
const Billete = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" strokeLinecap="round" />
  </svg>
);

export default function CurrencyPicker({ tono = "claro", style }) {
  const { t: tr } = useI18n();
  const { moneda, monedas, setMoneda } = useCurrency();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    // `pointerdown` y no `click`: ver la nota en LangPicker.
    const afuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    window.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      window.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const oscuro = tono === "oscuro";
  const colorTexto = oscuro ? "rgba(255,255,255,.85)" : "#6b7280";
  const borde = oscuro ? "rgba(255,255,255,.22)" : "#e5e7eb";

  return (
    <div ref={caja} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${tr("settings.currency")}: ${moneda}`}
        title={tr("settings.currency")}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 10px", borderRadius: 9,
          border: `1px solid ${borde}`,
          background: oscuro ? "rgba(255,255,255,.08)" : "#fff",
          color: colorTexto, cursor: "pointer",
          fontSize: 12.5, fontWeight: 700, letterSpacing: ".03em",
        }}
      >
        <Billete />
        {moneda}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30,
          background: "#fff", border: "1px solid #ececec", borderRadius: 12,
          boxShadow: "0 8px 28px rgba(0,0,0,.12)", padding: 5, minWidth: 196,
        }}>
          {monedas.map((m) => {
            const elegida = m.code === moneda;
            return (
              <button
                key={m.code}
                aria-current={elegida}
                onClick={() => { setMoneda(m.code); setAbierto(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 10px", borderRadius: 8, border: "none",
                  background: elegida ? "#eff6ff" : "transparent",
                  color: elegida ? "#0f6ce6" : "#374151",
                  fontSize: 13.5, fontWeight: elegida ? 700 : 500,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                  color: elegida ? "#0f6ce6" : "#9ca3af", width: 30, flexShrink: 0,
                }}>
                  {m.code}
                </span>
                {tr(`currency.${m.code}`)}
              </button>
            );
          })}
          <div style={{
            padding: "8px 10px 4px", fontSize: 11, lineHeight: 1.45, color: "#9ca3af",
            borderTop: "1px solid #f1f1f1", marginTop: 4,
          }}>
            {tr("currency.note")}
          </div>
        </div>
      )}
    </div>
  );
}
