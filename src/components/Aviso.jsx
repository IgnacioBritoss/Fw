// ============================================================================
//  Aviso — El cartelito que aparece abajo cuando algo salió mal
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE
//
//  Había cuatro `alert()` sueltos: al fallar el micrófono, al no poder mandar un
//  audio, al no poder subir un archivo y al no poder abrir una conversación. El
//  `alert` del navegador es lo peor que se puede poner ahí:
//
//   · viene en el idioma del navegador, no en el de la app;
//   · congela la pestaña hasta que alguien lo cierra;
//   · tapa justo la pantalla donde acaba de pasar lo que se está contando;
//   · y hay que apretar "Aceptar" para seguir, cuando no hay nada que aceptar.
//
//  Un aviso no es una pregunta: es información. Aparece abajo, no tapa nada, se
//  va solo y se puede cerrar antes. La pantalla sigue funcionando mientras está.
//
//  SE ANUNCIA SOLO. Lleva `role="status"` con `aria-live="polite"`, así que un
//  lector de pantalla lo lee cuando aparece sin interrumpir lo que esté leyendo.
//  Eso era lo único bueno que tenía el `alert`, y acá no se pierde.
//
//  SE VA SOLO, PERO NO A LOS TRES SEGUNDOS. Ocho: el mensaje explica un fallo y
//  a veces dice qué hacer, y un cartel que se va antes de que se termine de leer
//  es lo mismo que no haberlo puesto.
//
//  Uso:
//    const [aviso, setAviso] = useState("");
//    ...
//    catch { setAviso(tr("chat.micFailed")); }
//    ...
//    <Aviso mensaje={aviso} onCerrar={() => setAviso("")} />
// ============================================================================
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/core";

const DURACION_MS = 8000;

const TONOS = {
  error: { borde: "var(--fw-red-line)", fondo: "var(--fw-red-bg)", texto: "var(--fw-red-text-2)", marca: "var(--fw-red)" },
  ok: { borde: "var(--fw-green-line)", fondo: "var(--fw-green-bg)", texto: "var(--fw-green-text)", marca: "var(--fw-green)" },
};

const s = {
  // Abajo y centrado: es donde no tapa ni la barra de arriba ni lo que la
  // persona estaba mirando, y en el celular queda al alcance del pulgar.
  sitio: {
    position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
    zIndex: 3200, width: "calc(100% - 32px)", maxWidth: 420,
    pointerEvents: "none",
  },
  caja: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "12px 14px", borderRadius: 12,
    border: "1px solid", boxShadow: "0 10px 32px rgba(0,0,0,.18)",
    fontSize: 13.5, lineHeight: 1.55, pointerEvents: "auto",
  },
  texto: { flex: 1, minWidth: 0 },
  cerrar: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 18, lineHeight: 1, padding: "0 2px", flexShrink: 0,
    color: "inherit", opacity: .7,
  },
};

export default function Aviso({ mensaje, tono = "error", onCerrar }) {
  const { t: tr } = useI18n();

  // El reloj se reinicia con cada mensaje nuevo: si llegan dos seguidos, el
  // segundo tiene sus ocho segundos completos y no hereda los que le quedaban
  // al anterior.
  useEffect(() => {
    if (!mensaje) return;
    const id = setTimeout(onCerrar, DURACION_MS);
    return () => clearTimeout(id);
  }, [mensaje, onCerrar]);

  if (!mensaje) return null;

  const color = TONOS[tono] || TONOS.error;

  return createPortal(
    <div style={s.sitio}>
      <div
        role="status" aria-live="polite"
        style={{ ...s.caja, borderColor: color.borde, background: color.fondo, color: color.texto }}
        className="fw-aviso"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}
          stroke={color.marca} strokeWidth="2" strokeLinecap="round">
          {tono === "ok"
            ? <path d="m5 13 4 4L19 7" />
            : <><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16h.01" /></>}
        </svg>
        <div style={s.texto}>{mensaje}</div>
        <button type="button" style={s.cerrar} onClick={onCerrar} aria-label={tr("common.close")}>×</button>
      </div>
    </div>,
    document.body,
  );
}
