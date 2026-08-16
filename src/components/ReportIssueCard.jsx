// ============================================================================
//  ReportIssueCard — "Reportar errores de la página", en Ajustes
// ----------------------------------------------------------------------------
//  Para qué está: hay avisos en la app que terminan en "si hay un error,
//  escribinos" y no dicen por dónde. Este es el por dónde.
//
//  ── A DÓNDE VA, Y POR QUÉ HOY NO SALE NINGÚN MAIL ─────────────────────────
//  La dirección de destino es `soporte@freewheel.invalid`. El `.invalid` no es
//  un descuido: es un dominio que la norma (RFC 2606) reserva para que NUNCA
//  pueda existir. Elegirlo a propósito garantiza que ningún reporte se le pueda
//  escapar por mail a una casilla de verdad, ni por un error de tipeo ni el día
//  que alguien conecte esto a un servidor sin mirar bien.
//
//  Y esto es lo importante de decir: MANDAR UN MAIL NO LO PUEDE HACER EL
//  NAVEGADOR. Hace falta un servidor con las credenciales del correo, que en
//  este proyecto es el backend. Así que por ahora el reporte se guarda en el
//  navegador de quien lo escribe y no viaja a ninguna parte.
//
//  Lo que sí está entero y funcionando es todo lo demás: el formulario, las
//  validaciones, el límite de uno por día y el agradecimiento. Cuando haya que
//  recibirlos de verdad, lo único que cambia es el cuerpo de `enviarReporte()`:
//  un POST al backend en vez del guardado local. Está escrito como una función
//  aparte justamente para que ese cambio sea de tres líneas y en un solo lugar.
//
//  ── UNO POR DÍA ───────────────────────────────────────────────────────────
//  No es para ahorrar espacio: es para que el canal siga sirviendo. Un formulario
//  sin límite, con un botón de enviar y adjuntos, es el lugar donde alguien
//  enojado manda cuarenta reportes iguales en cinco minutos, y ahí los cuarenta
//  dejan de leerse. La marca se guarda por DÍA de calendario y no como "faltan
//  24 horas": quien reportó algo a las once de la noche puede volver a la mañana
//  siguiente, que es cuando de verdad se acordó del segundo problema.
// ============================================================================
import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";

/** Un dominio que no puede existir. Ver el comentario de arriba. */
const DESTINO = "soporte@freewheel.invalid";

const CLAVE = "fw_reporte_pagina";
const MAX_ARCHIVOS = 3;
const MAX_PESO = 6 * 1024 * 1024;
const MINIMO_TEXTO = 20;

/** El día de hoy como "2026-08-16", en la zona horaria de quien usa la app. */
function hoy() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** El último reporte guardado, o null si no hay (o si quedó ilegible). */
function ultimoReporte() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    localStorage.removeItem(CLAVE);
    return null;
  }
}

/**
 * Guarda el reporte.
 *
 * ES EL ÚNICO LUGAR que hay que cambiar para que los reportes salgan de verdad:
 * en vez de escribir en localStorage, un POST al backend con el mensaje y los
 * archivos. Todo lo demás —el formulario, el límite, el agradecimiento— ya
 * funciona igual.
 */
async function enviarReporte({ mensaje, archivos, usuario }) {
  const reporte = {
    fecha: hoy(),
    enviadoEl: new Date().toISOString(),
    destino: DESTINO,
    de: usuario?.email ?? null,
    // Se guarda dónde estaba la persona y con qué navegador: la mitad de los
    // errores de una pantalla no se entienden sin saber en qué pantalla fue.
    pantalla: typeof window !== "undefined" ? window.location.pathname : "",
    navegador: typeof navigator !== "undefined" ? navigator.userAgent : "",
    mensaje,
    // De los archivos se guarda el nombre y el peso, no el contenido:
    // localStorage tiene unos 5 MB en total y tres fotos de celular no entran.
    archivos: archivos.map((a) => ({ nombre: a.name, peso: a.size })),
  };
  localStorage.setItem(CLAVE, JSON.stringify(reporte));
  return reporte;
}

const pesoLegible = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function ReportIssueCard() {
  const { t: tr, lang } = useI18n();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();

  const archivoRef = useRef(null);
  const [mensaje, setMensaje] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  // El reporte de hoy, si ya hay uno. Se lee una sola vez al montar y después se
  // actualiza al enviar: no hace falta volver a mirar el navegador.
  const [reporte, setReporte] = useState(() => {
    const previo = ultimoReporte();
    return previo?.fecha === hoy() ? previo : null;
  });
  const [reciénEnviado, setReciénEnviado] = useState(false);

  const agregarArchivos = (event) => {
    const elegidos = [...(event.target.files || [])];
    // El input se limpia siempre: sin esto, elegir el mismo archivo dos veces
    // seguidas no dispara el cambio y parece que no pasó nada.
    event.target.value = "";
    if (elegidos.length === 0) return;

    const grande = elegidos.find((a) => a.size > MAX_PESO);
    if (grande) { setError(tr("report.errBig", { name: grande.name })); return; }
    if (archivos.length + elegidos.length > MAX_ARCHIVOS) {
      setError(tr("report.errMany", { max: MAX_ARCHIVOS })); return;
    }
    setError("");
    setArchivos([...archivos, ...elegidos]);
  };

  const quitar = (i) => setArchivos(archivos.filter((_, j) => j !== i));

  const enviar = async () => {
    if (mensaje.trim().length < MINIMO_TEXTO) {
      setError(tr("report.errShort", { min: MINIMO_TEXTO })); return;
    }
    setEnviando(true);
    setError("");
    try {
      const guardado = await enviarReporte({ mensaje: mensaje.trim(), archivos, usuario: user });
      setReporte(guardado);
      setReciénEnviado(true);
      setMensaje("");
      setArchivos([]);
    } catch (err) {
      setError(err?.message || tr("report.errSend"));
    } finally {
      setEnviando(false);
    }
  };

  const e = {
    card: { background: "#fff", border: "1px solid #ececec", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,0,0,.04)", padding: isMobile ? 20 : 26 },
    titulo: { fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: 4 },
    sub: { fontSize: 13, color: "#9ca3af", marginBottom: 18 },
    rotulo: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 },
    area: {
      width: "100%", boxSizing: "border-box", minHeight: 120, resize: "vertical",
      border: "1px solid #ececec", borderRadius: 4, padding: "12px 14px",
      fontSize: 14, color: "#111827", fontFamily: "inherit", lineHeight: 1.6,
      outline: "none", background: "#fff",
    },
    adjuntar: {
      display: "inline-flex", alignItems: "center", gap: 8,
      border: "1px solid #ececec", background: "#fff", borderRadius: 4,
      padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "#374151",
      cursor: "pointer",
    },
    fila: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10, borderTop: "1px solid #f1f2f4", padding: "9px 0", fontSize: 13,
    },
    enviar: {
      background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 4,
      padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
      ...(isMobile ? { width: "100%" } : {}),
    },
    aviso: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, padding: "11px 14px", fontSize: 13, color: "#b91c1c", marginBottom: 14 },
  };

  // ── Ya se envió uno hoy ──
  if (reporte) {
    return (
      <div style={e.card}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* El tilde, en el azul de Freewheel y no en verde: es el estado de
              algo que ya pasó, no una alarma ni una felicitación. */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "#f0f6ff",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="#0f6ce6" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 5 }}>
              {reciénEnviado ? tr("report.thanks") : tr("report.alreadyToday")}
            </div>
            <div style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.65 }}>
              {reciénEnviado ? tr("report.thanksBody") : tr("report.alreadyTodayBody")}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 12, borderTop: "1px solid #f1f2f4", paddingTop: 12 }}>
              {tr("report.sentOn", { date: shortDate(reporte.enviadoEl, lang) })}
              {reporte.archivos?.length > 0
                ? ` · ${tr("report.withFiles", { count: reporte.archivos.length })}`
                : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── El formulario ──
  return (
    <div style={e.card}>
      <div style={e.titulo}>{tr("report.title")}</div>
      <div style={e.sub}>{tr("report.sub")}</div>

      {error && <div style={e.aviso}>{error}</div>}

      <label style={e.rotulo} htmlFor="reporte-mensaje">{tr("report.what")}</label>
      <textarea
        id="reporte-mensaje"
        style={e.area}
        placeholder={tr("report.whatPh")}
        value={mensaje}
        maxLength={1500}
        onChange={(ev) => setMensaje(ev.target.value)}
      />
      <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 6, textAlign: "right" }}>
        {mensaje.length}/1500
      </div>

      <div style={{ ...e.rotulo, marginTop: 16 }}>{tr("report.files")}</div>
      <input
        ref={archivoRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.log"
        onChange={agregarArchivos}
        style={{ display: "none" }}
      />
      <button type="button" style={e.adjuntar}
        onClick={() => archivoRef.current?.click()}
        disabled={archivos.length >= MAX_ARCHIVOS}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19l-8.49 8.49a1.83 1.83 0 0 1-2.6-2.6l7.78-7.78" />
        </svg>
        {tr("report.attach")}
      </button>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, lineHeight: 1.6 }}>
        {tr("report.filesNote", { max: MAX_ARCHIVOS })}
      </div>

      {archivos.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {archivos.map((a, i) => (
            <div key={`${a.name}-${i}`} style={e.fila}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151" }}>
                {a.name}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{pesoLegible(a.size)}</span>
                <button type="button" onClick={() => quitar(i)}
                  style={{ background: "none", border: "none", color: "#b91c1c", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  {tr("report.remove")}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid #f1f2f4", marginTop: 18, paddingTop: 18 }}>
        <button type="button" style={{ ...e.enviar, opacity: enviando ? .65 : 1 }}
          onClick={enviar} disabled={enviando}>
          {enviando ? tr("report.sending") : tr("report.send")}
        </button>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 12, lineHeight: 1.6 }}>
          {tr("report.oneADay")}
        </div>
      </div>
    </div>
  );
}
