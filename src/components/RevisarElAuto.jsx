// ============================================================================
//  RevisarElAuto — El dueño mira el auto que volvió y decide
// ----------------------------------------------------------------------------
//  Se abre desde "Mis reservas", en las reservas devueltas, y es el único lugar
//  donde el depósito en garantía significa algo.
//
//  ── POR QUÉ ESTA PANTALLA EXISTE ──────────────────────────────────────────
//  El depósito ya no se libera en el instante en que se confirma la devolución:
//  queda retenido unas horas para que el dueño tenga tiempo de acercarse al
//  auto y mirarlo. Sin esa ventana el reclamo llegaría siempre tarde, porque la
//  retención ya estaría soltada y no habría nada que capturar.
//
//  Son dos caminos y el primero es el normal:
//
//   · "Está todo bien" → la garantía se libera en el acto. Sin este botón, la
//     plata de alguien que devolvió el auto impecable queda bloqueada dos días
//     por las dudas, y el dueño no tiene forma de destrabarla aunque quiera.
//   · "Reclamar un daño" → fotos, un importe y qué pasó. NO cobra: abre un
//     reclamo que resuelve un administrador. El dueño nunca cobra solo, porque
//     es plata de otra persona y las dos partes tienen intereses opuestos
//     exactamente acá.
//
//  Las reglas del formulario están en services/reclamo.js, con pruebas, y son
//  las mismas que las del servidor.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import {
  getEstadoDelDano, crearReclamoDeDano, confirmarRevisionOk,
} from "../services/api";
import { uploadImageToCloudinary } from "../services/cloudinary";
import {
  revisarReclamo, comoSeLeeLaRevision, comoSeLeeElReclamo, comoSalioLaRevision,
  MAX_FOTOS,
} from "../services/reclamo";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";
import { useCelebracion, useSacudida } from "../anim";

const MAX_BYTES = 5 * 1024 * 1024;

const s = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16,
  },
  modal: {
    background: "var(--fw-surface)", borderRadius: 16, padding: 26,
    width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
    maxHeight: "90vh", overflowY: "auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  title: { fontSize: 18, fontWeight: 700, color: "var(--fw-text)" },
  cerrar: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--fw-text-3)", lineHeight: 1 },
  plazo: {
    background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)",
    borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--fw-blue-text)",
    lineHeight: 1.6, marginBottom: 18,
  },
  cerrada: {
    background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
    borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--fw-text-2)",
    lineHeight: 1.6, marginBottom: 18,
  },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 6 },
  textarea: {
    width: "100%", padding: "11px 14px", borderRadius: 9, boxSizing: "border-box",
    border: "1.5px solid var(--fw-border)", background: "var(--fw-surface)", color: "var(--fw-text)",
    fontSize: 14, fontFamily: "inherit", height: 110, resize: "none", outline: "none",
  },
  entrada: {
    width: "100%", padding: "11px 14px", borderRadius: 9, boxSizing: "border-box",
    border: "1.5px solid var(--fw-border)", background: "var(--fw-surface)", color: "var(--fw-text)",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  },
  contador: { fontSize: 11, color: "var(--fw-text-4)", textAlign: "right", marginTop: 4 },
  campo: { marginBottom: 16 },
  error: { fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 5 },
  fotos: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  foto: { position: "relative", width: 68, height: 68, borderRadius: 8, overflow: "hidden", border: "1px solid var(--fw-border)" },
  fotoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  sacar: {
    position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%",
    border: "none", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1,
  },
  agregar: {
    width: 68, height: 68, borderRadius: 8, border: "1.5px dashed var(--fw-border-2)",
    background: "transparent", color: "var(--fw-text-3)", fontSize: 22, cursor: "pointer",
  },
  fila: { display: "flex", gap: 10, marginTop: 20 },
  btnOk: {
    flex: 1, padding: "12px", background: "var(--fw-green, #16a34a)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
  },
  btnReclamo: {
    flex: 1, padding: "12px", background: "transparent", color: "var(--fw-text-2)",
    border: "1.5px solid var(--fw-border-2)", borderRadius: 10, fontSize: 14, fontWeight: 600,
    fontFamily: "inherit", cursor: "pointer",
  },
  btnMandar: {
    width: "100%", padding: "13px", background: "var(--fw-amber, #d97706)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
  },
  btnApagado: { opacity: .55, cursor: "not-allowed" },
  volver: {
    display: "block", margin: "12px auto 0", background: "none", border: "none",
    color: "var(--fw-text-3)", fontFamily: "inherit", fontSize: 12.5, cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 2,
  },
  reclamo: {
    background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
    borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-text-2)", lineHeight: 1.6, marginBottom: 14,
  },
  hecho: { textAlign: "center", padding: "10px 0" },
  icono: {
    width: 64, height: 64, borderRadius: "50%", background: "var(--fw-blue-bg-2)",
    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
  },
  nota: { fontSize: 12, color: "var(--fw-text-4)", lineHeight: 1.6, marginTop: 10 },
};

const plata = (valor, moneda = "USD") =>
  `$${Number(valor || 0).toLocaleString("es-AR")} ${String(moneda).toUpperCase()}`;

export default function RevisarElAuto({ bookingId, moneda, onCerrar, onListo }) {
  const { t: tr } = useI18n();
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState("elegir");      // elegir | reclamar | hecho
  /*
    CÓMO TERMINÓ, con la clave del texto que corresponde.

    Los dos caminos llegan a la misma pantalla de "listo" y no dicen lo mismo,
    y el de "está todo bien" tiene además tres finales: la garantía se liberó,
    no había nada retenido que liberar (una reserva vieja), o hay un reclamo
    abierto que la mantiene. Decir "garantía liberada" en los tres sería
    anunciar una devolución de plata que no se movió.
  */
  const [comoTermino, setComoTermino] = useState("reclamo.listoOk");
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [avisoNro, setAvisoNro] = useState(0);

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fotos, setFotos] = useState([]);           // { id, dataUrl }
  const [mostrarErrores, setMostrarErrores] = useState(false);

  const avisar = (mensaje) => {
    setFallo(mensaje);
    if (mensaje) setAvisoNro(n => n + 1);
  };
  const cartel = useSacudida(fallo ? `${avisoNro}:${fallo}` : "");
  const { icono } = useCelebracion(modo === "hecho", { tono: "verde" });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setEstado(await getEstadoDelDano(bookingId));
    } catch (err) {
      avisar(err.message || tr("reclamo.noSePudoLeer"));
    } finally {
      setCargando(false);
    }
  }, [bookingId, tr]);

  useEffect(() => { cargar(); }, [cargar]);

  const topeMinor = Math.round(Number(estado?.depositoRetenido || 0) * 100);
  const revision = comoSeLeeLaRevision(estado || {});
  const revisado = revisarReclamo({ descripcion, monto, fotos, topeMinor });

  /** Agrega fotos, avisando lo que no entra en vez de descartarlo callado. */
  const agregarFotos = (lista) => {
    const archivos = Array.from(lista || []);
    if (archivos.length === 0) return;
    avisar("");
    const libres = MAX_FOTOS - fotos.length;
    if (libres <= 0) { avisar(tr("reclamo.maxFotos", { max: MAX_FOTOS })); return; }

    for (const archivo of archivos.slice(0, libres)) {
      if (!archivo.type.startsWith("image/")) { avisar(tr("reclamo.soloImagenes")); continue; }
      if (archivo.size > MAX_BYTES) { avisar(tr("reclamo.muyPesada", { name: archivo.name })); continue; }
      const lector = new FileReader();
      lector.onload = (ev) => {
        setFotos(prev => prev.length >= MAX_FOTOS
          ? prev
          : [...prev, { id: `${archivo.name}-${Date.now()}-${Math.random()}`, dataUrl: ev.target.result }]);
      };
      lector.readAsDataURL(archivo);
    }
  };

  const todoBien = async () => {
    setMandando(true);
    avisar("");
    try {
      const r = await confirmarRevisionOk(bookingId);
      setComoTermino(comoSalioLaRevision(r));
      setModo("hecho");
      onListo?.();
    } catch (err) {
      avisar(err.message || tr("reclamo.noSePudo"));
    } finally {
      setMandando(false);
    }
  };

  const mandarReclamo = async () => {
    setMostrarErrores(true);
    if (!revisado.ok || mandando) return;
    setMandando(true);
    avisar("");
    try {
      /*
        Las fotos se suben RECIÉN ACÁ y no al elegirlas: si la persona se
        arrepiente a mitad de camino, no quedan archivos colgados en la nube de
        un reclamo que nunca existió.
      */
      const evidenceUrls = await Promise.all(
        fotos.map(foto => uploadImageToCloudinary(foto.dataUrl)),
      );
      await crearReclamoDeDano(bookingId, {
        description: revisado.descripcion,
        claimedAmountMinor: revisado.montoMinor,
        evidenceUrls,
      });
      setComoTermino("reclamo.listoReclamo");
      setModo("hecho");
      onListo?.();
    } catch (err) {
      avisar(err.message || tr("reclamo.noSePudo"));
    } finally {
      setMandando(false);
    }
  };

  const cuerpo = () => {
    if (cargando) return <Spinner block label={tr("common.loading")} />;

    if (modo === "hecho") {
      return (
        <div style={s.hecho}>
          <div ref={icono} style={s.icono}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="#0f6ce6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--fw-text)" }}>
            {tr(comoTermino)}
          </div>
          <div style={{ fontSize: 13, color: "var(--fw-text-3)", lineHeight: 1.6 }}>
            {tr(`${comoTermino}Nota`)}
          </div>
        </div>
      );
    }

    const yaReclamado = (estado?.claims || []).map(c => ({ ...c, leido: comoSeLeeElReclamo(c) }));

    return (
      <>
        {/* El plazo primero: es lo que decide si hay algo que hacer acá. */}
        {revision.clave && (
          <div style={estado?.puedeReclamar ? s.plazo : s.cerrada}>
            {tr(revision.clave, { horas: revision.horas })}
          </div>
        )}

        {yaReclamado.map(c => (
          <div key={c.id} style={s.reclamo}>
            <strong>{tr(`reclamo.estado.${c.status}`)}</strong>
            {" · "}{plata(c.leido.monto, moneda)}
            <div style={{ marginTop: 6 }}>{c.description}</div>
            {c.resolutionNote && (
              <div style={{ marginTop: 6, color: "var(--fw-text-3)" }}>
                {tr("reclamo.resolucion")}: {c.resolutionNote}
              </div>
            )}
            {c.leido.cobrado != null && c.status === "ACCEPTED" && (
              <div style={{ marginTop: 6 }}>
                {tr("reclamo.seCobro")}: <strong>{plata(c.leido.cobrado, moneda)}</strong>
              </div>
            )}
          </div>
        ))}

        {estado?.puedeReclamar && modo === "elegir" && (
          <>
            <div style={{ fontSize: 13.5, color: "var(--fw-text-2)", lineHeight: 1.7 }}>
              {tr("reclamo.pregunta")}
            </div>
            <div style={s.fila}>
              <button type="button" style={mandando ? { ...s.btnOk, ...s.btnApagado } : s.btnOk}
                disabled={mandando} onClick={todoBien}>
                {mandando ? tr("common.loading") : tr("reclamo.todoBien")}
              </button>
              <button type="button" style={s.btnReclamo} disabled={mandando}
                onClick={() => { setModo("reclamar"); avisar(""); }}>
                {tr("reclamo.hayUnDano")}
              </button>
            </div>
            <div style={s.nota}>{tr("reclamo.comoSigue")}</div>
          </>
        )}

        {estado?.puedeReclamar && modo === "reclamar" && (
          <>
            <div style={s.campo}>
              <label style={s.label}>{tr("reclamo.quePaso")}</label>
              <textarea style={s.textarea} value={descripcion} maxLength={1000}
                placeholder={tr("reclamo.quePasoEjemplo")}
                onChange={(e) => setDescripcion(e.target.value)} />
              <div style={s.contador}>{descripcion.trim().length}/30</div>
              {mostrarErrores && revisado.errores.descripcion && (
                <div style={s.error}>{tr(revisado.errores.descripcion)}</div>
              )}
            </div>

            <div style={s.campo}>
              <label style={s.label}>
                {tr("reclamo.cuanto")}
                {topeMinor > 0 && (
                  <span style={{ fontWeight: 400, color: "var(--fw-text-4)" }}>
                    {" "}· {tr("reclamo.tope", { tope: plata(topeMinor / 100, moneda) })}
                  </span>
                )}
              </label>
              <input style={s.entrada} value={monto} inputMode="decimal"
                placeholder="0" onChange={(e) => setMonto(e.target.value)} />
              {mostrarErrores && revisado.errores.monto && (
                <div style={s.error}>{tr(revisado.errores.monto)}</div>
              )}
            </div>

            <div style={s.campo}>
              <label style={s.label}>{tr("reclamo.fotos")}</label>
              <div style={s.fotos}>
                {fotos.map(foto => (
                  <div key={foto.id} style={s.foto}>
                    <img src={foto.dataUrl} alt="" style={s.fotoImg} />
                    <button type="button" style={s.sacar}
                      onClick={() => setFotos(prev => prev.filter(f => f.id !== foto.id))}>×</button>
                  </div>
                ))}
                {fotos.length < MAX_FOTOS && (
                  <label style={{ ...s.agregar, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    +
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={(e) => { agregarFotos(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {mostrarErrores && revisado.errores.fotos && (
                <div style={s.error}>{tr(revisado.errores.fotos)}</div>
              )}
              <div style={s.nota}>{tr("reclamo.porQueFotos")}</div>
            </div>

            <button type="button" disabled={mandando}
              style={mandando ? { ...s.btnMandar, ...s.btnApagado } : s.btnMandar}
              onClick={mandarReclamo}>
              {mandando ? tr("reclamo.mandando") : tr("reclamo.mandar")}
            </button>
            <button type="button" style={s.volver} onClick={() => setModo("elegir")}>
              {tr("common.back")}
            </button>
          </>
        )}
      </>
    );
  };

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div className="fw-modal" style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.title}>{tr("reclamo.titulo")}</div>
          <button type="button" style={s.cerrar} onClick={onCerrar}>×</button>
        </div>
        {fallo && <div ref={cartel} style={{ ...s.error, marginBottom: 12 }}>{fallo}</div>}
        {cuerpo()}
      </div>
    </div>
  );
}
