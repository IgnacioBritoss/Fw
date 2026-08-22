// ============================================================================
//  ConfirmarEscribiendo — Confirmar algo que no se puede deshacer
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE
//
//  Cancelar una reserva preguntaba con el cartelito gris del navegador
//  (`window.confirm`). Eso está mal por tres motivos distintos, y ninguno es de
//  gusto:
//
//   1. NO ES LA APP. Aparece con la tipografía del sistema, los botones del
//      sistema y en el idioma del NAVEGADOR: alguien con la app en portugués y
//      Chrome en inglés leía "OK / Cancel". Todo el trabajo de traducir la app
//      se cae en el único cartel donde hay algo que perder.
//   2. FRENA TODO. `confirm` congela la pestaña entera: no se puede mirar la
//      reserva que se está por cancelar, ni ver las fechas, ni cerrar el cartel
//      de otra manera que contestando.
//   3. UN CLIC SE VA CUALQUIERA. "Cancelar" y "Aceptar" están a un centímetro,
//      y cancelar una reserva no se deshace.
//
//  Por eso acá no alcanza con apretar: hay que ESCRIBIR la frase. Es medio
//  segundo de trabajo que garantiza que la persona sabe lo que está haciendo, y
//  es la misma solución que usan GitHub para borrar un repositorio y Stripe para
//  borrar una cuenta. Nadie escribe "cancelar reserva" sin querer.
//
//  LA FRASE ESTÁ TRADUCIDA. Si la frase quedara en castellano, alguien con la
//  app en chino tendría que copiar letras que no entiende. Cada idioma tiene la
//  suya, y se compara sin distinguir mayúsculas ni acentos: la idea es confirmar
//  a conciencia, no ganar un concurso de ortografía en un teclado de celular.
//
//  Props:
//    · abierto     → si se muestra
//    · titulo      → el título del cartel
//    · cuerpo      → la explicación (qué pasa si sigue adelante)
//    · frase       → lo que hay que escribir, ya traducido
//    · textoBoton  → el texto del botón que confirma
//    · trabajando  → mientras corre la acción: bloquea todo y muestra el círculo
//    · onConfirmar / onCerrar
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";

/**
 * Compara lo escrito con la frase pedida sin castigar detalles.
 *
 * Se ignoran mayúsculas, acentos y los espacios de sobra: en un teclado de
 * celular la mayúscula automática y el acento son lotería, y hacer fallar la
 * confirmación por una tilde no protege de nada. Lo que importa —que la persona
 * haya escrito las palabras— se sigue exigiendo.
 */
const simplificar = (x) =>
  String(x)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // los acentos, ya separados por NFD
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const igual = (a, b) => simplificar(a) === simplificar(b);

const s = {
  fondo: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 3000, padding: 16,
  },
  caja: {
    background: "var(--fw-surface)", borderRadius: 16, padding: 24,
    width: "100%", maxWidth: 420,
    border: "1px solid var(--fw-border)",
    boxShadow: "0 20px 60px rgba(0,0,0,.28)",
  },
  fila: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  redondel: {
    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
    background: "var(--fw-red-bg)", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  titulo: { fontSize: 17, fontWeight: 700, color: "var(--fw-text)", lineHeight: 1.3 },
  cuerpo: { fontSize: 13.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginTop: 4 },
  aviso: { fontSize: 13, color: "var(--fw-text-2)", marginBottom: 8, lineHeight: 1.6 },
  frase: {
    fontWeight: 700, color: "var(--fw-text)",
    background: "var(--fw-surface-3)", padding: "1px 7px", borderRadius: 6,
    // Que no se pueda copiar y pegar: copiar no es leer, y todo el sentido del
    // cartel es que la persona se detenga un segundo a mirar qué va a hacer.
    userSelect: "none",
  },
  campo: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px",
    borderRadius: 10, border: "1px solid var(--fw-border-2)",
    background: "var(--fw-surface)", color: "var(--fw-text)",
    fontSize: 14, outline: "none", marginBottom: 16,
  },
  botones: { display: "flex", gap: 10 },
  volver: {
    flex: 1, padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    background: "transparent", border: "1px solid var(--fw-border-2)",
    color: "var(--fw-text-2)", cursor: "pointer",
  },
  hacerlo: {
    flex: 1, padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700,
    border: "none", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  cerrar: {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--fw-text-3)", fontSize: 20, lineHeight: 1,
    padding: 4, marginLeft: "auto",
  },
};

/**
 * Cerrado, el cartel NO existe.
 *
 * Se parte en dos componentes a propósito. Si fuera uno solo que se esconde, lo
 * escrito la vez anterior seguiría guardado adentro: al reabrirlo, la frase ya
 * estaría puesta y el botón habilitado de entrada, o sea que el cartel no
 * confirmaría nada. Habría que borrarlo a mano cada vez que se abre —un efecto
 * más, y uno que es fácil olvidarse de mantener—. Naciendo de cero cada vez, el
 * campo arranca vacío porque nunca existió antes.
 */
export default function ConfirmarEscribiendo({ abierto, ...resto }) {
  if (!abierto) return null;
  return <Cartel {...resto} />;
}

function Cartel({ titulo, cuerpo, frase, textoBoton, trabajando = false, onConfirmar, onCerrar }) {
  const { t: tr } = useI18n();
  const [escrito, setEscrito] = useState("");
  const campoRef = useRef(null);

  // El cursor va al campo al abrir: es lo único que hay para hacer acá, y así no
  // hay que ir a buscarlo con el mouse.
  useEffect(() => {
    const id = setTimeout(() => campoRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, []);

  // Escape cierra, como cualquier ventana que se abre encima de todo. Mientras
  // la acción está corriendo no: cerrar a mitad de camino dejaría la pantalla
  // sin saber cómo terminó.
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape" && !trabajando) onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [trabajando, onCerrar]);

  const listo = igual(escrito, frase) && !trabajando;

  const confirmar = () => { if (listo) onConfirmar(); };

  return createPortal(
    <div
      style={s.fondo}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !trabajando) onCerrar(); }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={titulo}
        style={s.caja}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={s.fila}>
          <div style={s.redondel}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="var(--fw-red)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 9v4" /><path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={s.titulo}>{titulo}</div>
            {cuerpo && <div style={s.cuerpo}>{cuerpo}</div>}
          </div>
          <button type="button" style={s.cerrar} onClick={onCerrar}
            disabled={trabajando} aria-label={tr("common.close")}>×</button>
        </div>

        <div style={s.aviso}>
          {tr("confirm.typeToConfirm")} <span style={s.frase}>{frase}</span>
        </div>

        <input
          ref={campoRef}
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          disabled={trabajando}
          placeholder={frase}
          aria-label={tr("confirm.typeToConfirm")}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          style={{
            ...s.campo,
            borderColor: listo ? "var(--fw-red)" : "var(--fw-border-2)",
          }}
        />

        <div style={s.botones}>
          <button type="button" style={s.volver} onClick={onCerrar} disabled={trabajando}>
            {tr("common.back")}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!listo}
            style={{
              ...s.hacerlo,
              background: listo ? "var(--fw-red)" : "var(--fw-border-2)",
              cursor: listo ? "pointer" : "not-allowed",
            }}
          >
            {trabajando && <Spinner size={14} color="#fff" />}
            {textoBoton}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
