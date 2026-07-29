// ============================================================================
//  PhoneInput — Teléfono argentino, completo y con formato
// ----------------------------------------------------------------------------
//  El servicio funciona solo en Argentina, así que el número tiene que estar en
//  formato internacional y empezar con el código de país 54:
//
//        54  9   11      3289 5416
//        ↑   ↑   ↑       ↑
//        país│   área    número
//            └ el 9 identifica que es un celular
//
//  Después del 54 van siempre 10 dígitos entre área y número (11 + 8 en CABA,
//  351 + 7 en Córdoba, 2954 + 6 en La Pampa: cambia el reparto, no el total).
//
//  Por qué existe este componente: el campo aceptaba cualquier cosa, así que
//  escribir "123" pasaba de largo y quedaba guardado un dato con el que después
//  no se puede mandar ningún código de verificación. Acá el "+54" está fijo
//  (no se puede borrar), se van agrupando los dígitos mientras se escribe y no
//  se puede continuar hasta que el número esté completo.
// ============================================================================
import { useId } from "react";
import { isArgentinePhone, LOCAL_DIGITS } from "../services/phone";


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
 * `value` y `onChange` trabajan siempre con los dígitos crudos que siguen al 54
 * (por ejemplo "91132895416"). Así quien usa el componente no tiene que pensar
 * en el formato: al guardar, normalizeArgentinePhone() arma el número final.
 */
export default function PhoneInput({
  value = "",
  onChange,
  label = "Teléfono",
  showError = false,
  style,
}) {
  const id = useId();
  const rest = String(value).replace(/\D/g, "").slice(0, LOCAL_DIGITS + 1);
  const complete = isArgentinePhone(`54${rest}`);
  const invalid = showError && rest.length > 0 && !complete;

  const handle = (event) => {
    let digits = event.target.value.replace(/\D/g, "");
    // Si pegan el número entero con el 54 adelante, se saca para no duplicarlo.
    if (digits.startsWith("54") && digits.length > LOCAL_DIGITS + 1) {
      digits = digits.slice(2);
    }
    if (digits.startsWith("0")) digits = digits.slice(1);
    onChange(digits.slice(0, LOCAL_DIGITS + 1));
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

      <div style={{ display: "flex", alignItems: "stretch", border, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
        {/* El código de país es fijo: no se puede borrar ni cambiar */}
        <span style={{
          display: "flex", alignItems: "center", padding: "0 12px", background: "#f9fafb",
          borderRight: "1px solid #e5e7eb", fontSize: 14, fontWeight: 700, color: "#374151",
        }}>
          +54
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={groupLocal(rest)}
          onChange={handle}
          placeholder="9 11 3289 5416"
          style={{
            flex: 1, padding: "11px 14px", border: "none", outline: "none",
            fontSize: 14, color: "#111827", minWidth: 0, background: "transparent",
          }}
        />
      </div>

      {invalid ? (
        <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
          Falta completar el número. Tiene que ser un celular argentino: 9 + código de área + número (10 dígitos en total).
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
          Solo Argentina. Ejemplo: 9 11 3289 5416
        </div>
      )}
    </div>
  );
}
