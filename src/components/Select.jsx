// ============================================================================
//  Select — Desplegable con el diseño de la app
// ----------------------------------------------------------------------------
//  Por qué no se usa un <select> nativo: al <select> se le puede dar estilo a la
//  CAJA (borde, tipografía, la flechita), pero NO a la lista que se abre. Esa
//  lista la dibuja el sistema operativo, así que en Windows aparecía un menú
//  cuadrado, con el celeste de Windows en la opción marcada y una tipografía que
//  no es la de la página. Eso es exactamente lo que se veía en la foto del
//  desplegable de "Categoría".
//
//  Acá la lista es HTML propio, así que se ve igual en cualquier sistema.
//
//  Se mantiene lo que el nativo hacía bien:
//   · teclado: flechas para moverse, Enter para elegir, Escape para cerrar;
//   · roles de accesibilidad (combobox/listbox/option), para lectores de pantalla;
//   · se cierra al hacer clic afuera o al perder el foco.
//
//  Props:
//   · value / onChange  → como un <select> (onChange recibe el valor, no el event)
//   · options           → [{ value, label }]
//   · plain             → sin caja propia, para las barras de búsqueda que ya
//                         viven dentro de una tarjeta blanca
// ============================================================================
import { useEffect, useId, useRef, useState } from "react";

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Elegir",
  plain = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  const selectedIndex = options.findIndex(o => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Se cierra al hacer clic en cualquier otro lado de la página.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // La opción marcada siempre visible cuando se recorre con las flechas.
  useEffect(() => {
    if (!open || highlighted < 0) return;
    listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  /** Abre la lista dejando marcada la opción que ya estaba elegida. */
  const openList = () => {
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const toggle = () => (open ? setOpen(false) : openList());

  const choose = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") { setOpen(false); return; }

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted(i => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(i => Math.max(i - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (options[highlighted]) choose(options[highlighted]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const boxStyle = plain
    ? {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 8, width: "100%", padding: 0, background: "transparent",
      border: "none", cursor: "pointer", textAlign: "left",
      fontSize: 14, fontWeight: 700, color: "#111827", minHeight: 0,
    }
    : {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 8, width: "100%", padding: "10px 12px", background: "#fff",
      border: `1.5px solid ${open ? "#2563eb" : "#e5e7eb"}`, borderRadius: 8,
      cursor: "pointer", textAlign: "left", fontSize: 14, color: "#111827",
      boxShadow: open ? "0 0 0 3px #eff6ff" : "none",
      transition: "border-color .15s ease, box-shadow .15s ease",
      boxSizing: "border-box",
    };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        onKeyDown={onKeyDown}
        style={boxStyle}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : <span style={{ color: "#9ca3af" }}>{placeholder}</span>}
        </span>
        {/* La flecha gira al abrir: deja claro que el panel de abajo es de este campo */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={id}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            minWidth: "100%", maxHeight: 260, overflowY: "auto",
            margin: 0, padding: 6, listStyle: "none",
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)", zIndex: 60,
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(option)}
                style={{
                  padding: "9px 11px", borderRadius: 7, cursor: "pointer",
                  fontSize: 13.5, whiteSpace: "nowrap",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#1d4ed8" : "#374151",
                  background: isHighlighted
                    ? (isSelected ? "#dbeafe" : "#f3f4f6")
                    : (isSelected ? "#eff6ff" : "transparent"),
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                }}
              >
                {option.label}
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
