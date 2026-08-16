// ============================================================================
//  PhoneInput — Teléfono con código de país
// ----------------------------------------------------------------------------
//  ANTES EL "+54" ERA FIJO Y NO SE PODÍA CAMBIAR. La idea era buena para lo que
//  resolvía —el campo aceptaba cualquier cosa, así que "123" pasaba de largo y
//  quedaba guardado un dato con el que después no se puede mandar ningún código
//  de verificación—, pero dejaba afuera a cualquiera que llegue de otro país con
//  su propio teléfono. La app está traducida a cinco idiomas justamente para que
//  la usen extranjeros, y el primer formulario les pedía una línea argentina.
//
//  Ahora el código de país se elige de una lista. Argentina viene puesta de
//  entrada, así que para quien vive acá la pantalla es igual a la de antes: se
//  escribe el número y listo.
//
//  Argentina se sigue validando en serio (9 + área + número, siempre 10 dígitos
//  entre área y número). Del resto de los países se comprueba el largo y nada
//  más: no sabemos el plan de numeración de cada país, y una regla inventada
//  rechaza números buenos, que es peor que aceptar uno malo.
//
//  `value` y `onChange` trabajan con los dígitos crudos DESPUÉS del código de
//  país. El país viaja aparte, en `pais`/`onPaisChange`, para que quien use el
//  componente no tenga que separar el número a mano.
// ============================================================================
import { useId, useState } from "react";
import {
  LOCAL_DIGITS, PAISES, buscarPais, isValidPhone, maxLocalDigits, nombrePais,
} from "../services/phone";
import { useI18n } from "../i18n/core";

/** Muestra `9 11 3289 5416` a partir de los dígitos que van después del 54. */
function groupLocal(rest) {
  if (!rest) return "";
  const mobile = rest.startsWith("9");
  const digits = mobile ? rest.slice(1) : rest;
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 6),
    digits.slice(6, 10),
  ].filter(Boolean);
  return [mobile ? "9" : "", ...parts].filter(Boolean).join(" ");
}

/**
 * Cómo se muestra lo escrito. En Argentina se agrupa como se lee un número de
 * acá; en el resto se deja tal cual, porque agrupar de a cuatro un número
 * italiano o chino lo hace más difícil de leer, no más fácil.
 */
const mostrar = (dial, rest) => (dial === "54" ? groupLocal(rest) : rest);

export default function PhoneInput({
  value = "",
  onChange,
  pais = "AR",
  onPaisChange,
  label,
  showError = false,
  style,
}) {
  const { t: tr, lang } = useI18n();
  const id = useId();
  const [abierto, setAbierto] = useState(false);

  const paisActual = buscarPais(pais);
  const tope = maxLocalDigits(paisActual.dial);
  const rest = String(value).replace(/\D/g, "").slice(0, tope);
  const complete = isValidPhone(paisActual.dial, rest);
  const invalid = showError && rest.length > 0 && !complete;

  const handle = (event) => {
    let digits = event.target.value.replace(/\D/g, "");
    // Si pegan el número entero con el código de país adelante, se saca para no
    // duplicarlo. Sólo cuando sobran dígitos: si no, un número que legítimamente
    // empieza con esos dígitos quedaría mutilado.
    const d = paisActual.dial;
    if (digits.startsWith(d) && digits.length > tope) digits = digits.slice(d.length);
    if (digits.startsWith("0")) digits = digits.slice(1);
    onChange(digits.slice(0, tope));
  };

  const border = invalid ? "1.5px solid #dc2626"
    : complete ? "1.5px solid #16a34a" : "1.5px solid #e5e7eb";

  return (
    <div style={style}>
      {label && (
        <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
          {label}
        </label>
      )}

      <div style={{ display: "flex", alignItems: "stretch", border, borderRadius: 8, background: "#fff", position: "relative" }}>
        {/*
          El selector de país. Es un <button> con una lista propia y no un
          <select> nativo porque adentro va el código ISO y el "+54" en dos
          pesos distintos, y un <select> sólo admite texto plano.
        */}
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          aria-expanded={abierto}
          aria-label={`${tr("phone.country")}: ${nombrePais(paisActual.iso, lang)}`}
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "0 10px 0 12px",
            background: "#f9fafb", border: "none", borderRight: "1px solid #e5e7eb",
            borderRadius: "7px 0 0 7px", cursor: "pointer", flexShrink: 0,
            fontSize: 14, fontWeight: 700, color: "#374151",
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: ".04em", color: "#9ca3af" }}>
            {paisActual.iso}
          </span>
          +{paisActual.dial}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="3" style={{ color: "#9ca3af" }} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {abierto && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
            background: "#fff", border: "1px solid #ececec", borderRadius: 12,
            boxShadow: "0 8px 28px rgba(0,0,0,.12)", padding: 5,
            width: 260, maxHeight: 260, overflowY: "auto",
          }}>
            {PAISES.map((p) => {
              const elegido = p.iso === paisActual.iso;
              return (
                <button
                  key={p.iso}
                  type="button"
                  // `onMouseDown` y no `onClick`: el `onBlur` del botón de arriba
                  // cierra la lista, y con `click` el cierre gana la carrera y la
                  // opción nunca se elige.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPaisChange?.(p.iso);
                    // El número que había escrito era de otro país: dejarlo
                    // pegado al código nuevo arma un teléfono que no existe.
                    onChange("");
                    setAbierto(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 10px", borderRadius: 8, border: "none",
                    background: elegido ? "#eff6ff" : "transparent",
                    color: elegido ? "#0f6ce6" : "#374151",
                    fontSize: 13.5, fontWeight: elegido ? 700 : 500,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", width: 22, flexShrink: 0 }}>
                    {p.iso}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nombrePais(p.iso, lang)}
                  </span>
                  <span style={{ color: "#9ca3af", fontWeight: 600, flexShrink: 0 }}>+{p.dial}</span>
                </button>
              );
            })}
          </div>
        )}

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={mostrar(paisActual.dial, rest)}
          onChange={handle}
          placeholder={paisActual.dial === "54" ? "9 11 3289 5416" : ""}
          style={{
            flex: 1, padding: "11px 14px", border: "none", outline: "none",
            fontSize: 14, color: "#111827", minWidth: 0, background: "transparent",
            borderRadius: "0 7px 7px 0",
          }}
        />
      </div>

      {invalid ? (
        <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
          {paisActual.dial === "54" ? tr("phone.incomplete") : tr("phone.incompleteIntl")}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
          {paisActual.dial === "54" ? tr("phone.hint") : tr("phone.hintIntl")}
        </div>
      )}
    </div>
  );
}

export { LOCAL_DIGITS };
