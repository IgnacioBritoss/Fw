// ============================================================================
//  AutocompleteInput — El campo que va completando lo que se escribe
// ----------------------------------------------------------------------------
//  Se escribe "su" y aparece "su|ran" con el "ran" en gris, atrás del cursor.
//  Con Tab (o con la flecha derecha estando al final) se acepta y el campo queda
//  con "Suran". Es el mismo comportamiento que la barra de direcciones del
//  navegador o la terminal, y no hace falta explicarlo: quien no lo conoce sigue
//  escribiendo y la sugerencia se va sola.
//
//  POR QUÉ ASÍ Y NO CON UNA LISTA DESPLEGABLE: una lista tapa lo que hay abajo,
//  hay que apuntarle con el mouse y en el teléfono se pelea con el teclado. Acá
//  la ayuda aparece en el mismo renglón donde ya se está mirando, y aceptarla es
//  una tecla.
//
//  CÓMO SE DIBUJA: no se puede pintar medio <input> de gris, así que el gris va
//  en una capa ABAJO del campo, con exactamente la misma tipografía y el mismo
//  padding. Esa capa escribe lo tecleado en transparente —para empujar la
//  sugerencia hasta la posición correcta— y el resto en gris. Arriba, el campo
//  de verdad con fondo transparente. Si las dos capas no coincidieran carácter
//  por carácter, el gris quedaría corrido.
//
//  QUÉ NO HACE: no limita lo que se puede escribir. Si lo escrito no está en la
//  lista, no se sugiere nada y la búsqueda sale igual con lo que se haya puesto.
//
//  TAB NO BUSCA, COMPLETA. Buscar con Tab rompería el recorrido con el teclado
//  —Tab es la tecla de "pasar al campo siguiente"— y dejaría a alguien que
//  navega sin mouse encerrado en el buscador. Enter busca.
// ============================================================================
import { useId, useRef, useState } from "react";
import { completar } from "../data/sugerencias";

export default function AutocompleteInput({
  value = "",
  onChange,
  opciones = [],
  onEnter,
  placeholder,
  style,
  inputStyle,
  // Lo que ocupa lugar TIENE que ser igual en las dos capas, si no la
  // sugerencia gris queda corrida de lo escrito. Por eso el relleno y el grosor
  // de la letra entran por acá y se aplican a las dos, en vez de dejarlos
  // sueltos en `inputStyle`, que solo llega a una.
  relleno = 0,
  peso = 600,
  ...resto
}) {
  const id = useId();
  const ref = useRef(null);
  const [enFoco, setEnFoco] = useState(false);

  // El resto de la palabra, o "" si no hay con qué seguir. Solo mientras el
  // campo tiene el foco: una sugerencia en un campo que nadie está usando es
  // ruido, y encima confunde con texto de verdad escrito.
  const { resto: sugerencia, completa } = enFoco
    ? completar(value, opciones)
    : { resto: "", completa: "" };

  const aceptar = () => {
    if (!sugerencia) return false;
    // Se pone la palabra de la lista y no lo tecleado + el resto: así "cordo"
    // queda "Córdoba" y no "cordoba".
    onChange(completa);
    return true;
  };

  const teclas = (e) => {
    if (e.key === "Tab" && sugerencia) {
      // Solo se queda con el Tab cuando hay algo para completar; si no, deja
      // pasar al campo siguiente como siempre.
      e.preventDefault();
      aceptar();
      return;
    }
    // La flecha derecha completa únicamente si el cursor ya está al final: si
    // está en el medio de la palabra, la persona se está moviendo por el texto.
    if (e.key === "ArrowRight" && sugerencia) {
      const el = ref.current;
      if (el && el.selectionStart === value.length && el.selectionEnd === value.length) {
        e.preventDefault();
        aceptar();
      }
      return;
    }
    if (e.key === "Enter") {
      // Si había una sugerencia a la vista, Enter la toma y busca con eso: es lo
      // que la persona está viendo en pantalla al apretar.
      if (sugerencia) { onChange(completa); onEnter?.(completa); return; }
      onEnter?.(value);
    }
  };

  // Las dos capas tienen que compartir TODO lo que ocupa lugar. Se arma una vez
  // y se usa en las dos para que no se puedan desincronizar por descuido.
  const tipografia = {
    fontSize: 14, fontWeight: peso, lineHeight: "20px",
    fontFamily: "inherit", letterSpacing: "normal",
    padding: relleno, border: "none", margin: 0,
  };

  return (
    <div style={{ position: "relative", ...style }}>
      {/* La capa de abajo: lo escrito en transparente y la sugerencia en gris. */}
      <div aria-hidden="true" style={{
        ...tipografia,
        position: "absolute", inset: 0,
        whiteSpace: "pre", overflow: "hidden",
        pointerEvents: "none", color: "var(--fw-text-4)",
        display: "flex", alignItems: "center",
      }}>
        <span style={{ color: "transparent" }}>{value}</span>
        <span>{sugerencia}</span>
      </div>

      <input
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={teclas}
        onFocus={() => setEnFoco(true)}
        onBlur={() => setEnFoco(false)}
        placeholder={placeholder}
        autoComplete="off"
        // El navegador también quiere autocompletar y dibuja su propia lista
        // encima; con dos ayudas al mismo tiempo no se entiende ninguna.
        autoCorrect="off" spellCheck="false"
        // `boxSizing`: con relleno propio, sin esto el campo mide 100% MÁS el
        // relleno y se sale de su columna.
        style={{ ...tipografia, background: "transparent", outline: "none", width: "100%", boxSizing: "border-box", position: "relative", ...inputStyle }}
        {...resto}
      />
    </div>
  );
}
