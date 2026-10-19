// ============================================================================
//  AlertasDeFraude — Las cuentas que podrían estar inflando su reputación
// ----------------------------------------------------------------------------
//  POR QUÉ ESTA PANTALLA EXISTE.
//
//  La reputación es lo único que hace que un desconocido le preste su auto a
//  otro desconocido. Si se puede fabricar, todo lo demás da igual: alguien arma
//  dos o tres cuentas, se las alquila entre sí, se deja cinco estrellas, y en
//  un fin de semana tiene un perfil Platino con el que estafar a alguien de
//  verdad. La reseña falsa no es la estafa: es la herramienta.
//
//  El servidor detecta los patrones y actúa solo donde puede hacerlo sin
//  equivocarse (ver src/antifraude/limites.ts allá). Esta es la otra mitad: lo
//  que NO se puede automatizar sin riesgo llega acá para que alguien lo mire.
//
//  ── LAS DOS COSAS QUE ESTA PANTALLA TIENE QUE DEJAR CLARAS ───────────────
//
//  1. SI LA CUENTA YA ESTÁ CERRADA O NO. Una señal sobre una cuenta suspendida
//     —el anillo de reseñas la cierra solo— se lee al revés que una sobre una
//     cuenta activa: en la primera lo que hay que decidir es si LEVANTARLA.
//  2. CON QUÉ NÚMEROS SE ENCENDIÓ. Guardados de cuando pasó, no recalculados:
//     para cuando alguien la mire, los datos de esa cuenta van a ser otros.
//
//  ── Y UNA QUE NO HACE ─────────────────────────────────────────────────────
//  "Revisar" no castiga a nadie: solo saca la señal de la bandeja. Suspender o
//  reactivar es el otro botón, a propósito. La mayoría de las señales se miran
//  y se descartan, y si "ya la vi" y "cerrale la cuenta" fueran el mismo botón,
//  la bandeja se dejaría de usar en una semana.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import {
  adminGetFraudSignals,
  adminResolveFraudSignal,
  adminUpdateUserStatus,
} from "../services/api";
import { nameOf } from "../services/people";
import Spinner from "./Spinner";

const s = {
  card: {
    background: "var(--fw-surface)", borderRadius: 12, padding: 18,
    marginBottom: 12, border: "1px solid var(--fw-line-soft)",
  },
  cardGrave: { borderColor: "var(--fw-red-line)", background: "var(--fw-red-bg)" },
  fila: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  titulo: { fontWeight: 800, fontSize: 14.5, color: "var(--fw-text)" },
  sub: { fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6 },
  etiqueta: {
    fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em",
    textTransform: "uppercase", padding: "3px 8px", borderRadius: 999,
  },
  numeros: {
    marginTop: 10, padding: "10px 12px", borderRadius: 8,
    background: "var(--fw-surface-2)", border: "1px solid var(--fw-line-soft)",
    fontSize: 12, color: "var(--fw-text-2)", lineHeight: 1.7,
    fontVariantNumeric: "tabular-nums",
  },
  boton: {
    padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
    fontFamily: "inherit", cursor: "pointer", border: "1px solid var(--fw-border-2)",
    background: "var(--fw-surface)", color: "var(--fw-text-2)",
  },
  botonRojo: { background: "var(--fw-red)", color: "#fff", border: "none" },
  botonVerde: { background: "var(--fw-green)", color: "#fff", border: "none" },
  campo: {
    width: "100%", boxSizing: "border-box", marginTop: 10, padding: "9px 11px",
    borderRadius: 8, border: "1px solid var(--fw-border-2)", fontSize: 13,
    fontFamily: "inherit", background: "var(--fw-surface)", color: "var(--fw-text)",
  },
  vacio: {
    padding: 40, textAlign: "center", color: "var(--fw-text-4)", fontSize: 13.5,
    background: "var(--fw-surface)", borderRadius: 12,
    border: "1px solid var(--fw-line-soft)",
  },
};

/**
 * Los números de cada patrón, en castellano.
 *
 * Se arma acá y no en el servidor porque es texto de pantalla, y porque el
 * servidor guarda los datos crudos a propósito: dentro de un año, el texto
 * puede cambiar y los números tienen que seguir diciendo lo mismo.
 */
function detalleLegible(tipo, detalle, tr) {
  const d = detalle || {};
  switch (tipo) {
    case "ANILLO_DE_RESENAS":
    case "RESENAS_CRUZADAS":
      return tr("fraude.detalle.cruce", {
        escritas: d.leEscribio ?? "?",
        recibidas: d.recibioDeElla ?? "?",
        dias: d.enDias ?? "?",
        cuenta: d.conLaCuenta ?? "?",
      });
    case "RESENAS_CONCENTRADAS":
      return tr("fraude.detalle.concentradas", {
        porcentaje: d.porcentaje ?? "?",
        deDos: d.deLasDosQueMas ?? "?",
        total: d.recibidas ?? "?",
      });
    case "REPUTACION_DEMASIADO_RAPIDA":
      return tr("fraude.detalle.rapida", {
        dias: d.diasDeAntiguedad ?? "?",
        recibidas: d.recibidas ?? "?",
      });
    case "PUBLICACIONES_EN_RAFAGA":
      return tr("fraude.detalle.rafaga", {
        hoy: d.hoy ?? "?",
        semana: d.enLaSemana ?? "?",
      });
    default:
      return JSON.stringify(d);
  }
}

export default function AlertasDeFraude({ onAviso }) {
  const { t: tr, lang } = useI18n();
  const [senales, setSenales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(null);
  // Qué señal se está revisando, y con qué nota.
  const [revisando, setRevisando] = useState(null);
  const [nota, setNota] = useState("");

  const cargar = useCallback(() => {
    setCargando(true);
    adminGetFraudSignals()
      .then((data) => setSenales(Array.isArray(data) ? data : []))
      .catch(() => onAviso?.(tr("fraude.errCargar"), "err"))
      .finally(() => setCargando(false));
  }, [onAviso, tr]);

  useEffect(() => { cargar(); }, [cargar]);

  const resolver = async (id) => {
    setTrabajando(id);
    try {
      await adminResolveFraudSignal(id, nota.trim());
      setRevisando(null);
      setNota("");
      cargar();
    } catch (err) {
      onAviso?.(err?.message || tr("fraude.errResolver"), "err");
    } finally {
      setTrabajando(null);
    }
  };

  const cambiarEstado = async (userId, estado) => {
    setTrabajando(userId);
    try {
      await adminUpdateUserStatus(userId, estado);
      onAviso?.(tr(estado === "SUSPENDED" ? "fraude.suspendida" : "fraude.reactivada"), "ok");
      cargar();
    } catch (err) {
      onAviso?.(err?.message || tr("fraude.errEstado"), "err");
    } finally {
      setTrabajando(null);
    }
  };

  if (cargando) return <Spinner block label={tr("common.loading")} />;

  if (senales.length === 0) {
    return (
      <div style={s.vacio}>
        <div style={{ fontWeight: 700, color: "var(--fw-text-2)", marginBottom: 6 }}>
          {tr("fraude.vacioTitulo")}
        </div>
        {tr("fraude.vacioSub")}
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...s.sub, marginBottom: 14 }}>{tr("fraude.intro")}</div>
      {senales.map((senal) => {
        const cerrada = senal.user?.status === "SUSPENDED";
        const persona = nameOf(senal.user, tr("profile.userFallback"));
        return (
          <div key={senal.id} style={{ ...s.card, ...(senal.autoSuspended ? s.cardGrave : {}) }}>
            <div style={{ ...s.fila, justifyContent: "space-between" }}>
              <div style={{ minWidth: 0 }}>
                <div style={s.titulo}>{tr(`fraude.tipo.${senal.kind}`)}</div>
                <div style={s.sub}>
                  {persona} · {senal.user?.email} · {shortDate(senal.createdAt, lang)}
                </div>
              </div>
              <div style={s.fila}>
                {/*
                  Lo primero que hace falta saber: si la cuenta sigue abierta.
                  Una señal sobre una cuenta ya cerrada se lee al revés que una
                  sobre una activa, y la acción que corresponde es la opuesta.
                */}
                {senal.autoSuspended && (
                  <span style={{ ...s.etiqueta, background: "var(--fw-red)", color: "#fff" }}>
                    {tr("fraude.cerradaSola")}
                  </span>
                )}
                <span style={{
                  ...s.etiqueta,
                  background: cerrada ? "var(--fw-red-bg)" : "var(--fw-green-bg)",
                  color: cerrada ? "var(--fw-red-text-2)" : "var(--fw-green-text-2)",
                }}>
                  {tr(cerrada ? "fraude.cuentaCerrada" : "fraude.cuentaActiva")}
                </span>
              </div>
            </div>

            <div style={s.numeros}>
              {detalleLegible(senal.kind, senal.detail, tr)}
            </div>

            <div style={{ ...s.sub, marginTop: 8 }}>
              {tr(`fraude.quehacer.${senal.kind}`)}
            </div>

            {revisando === senal.id ? (
              <div style={{ marginTop: 12 }}>
                <textarea
                  rows={2}
                  value={nota}
                  autoFocus
                  onChange={(e) => setNota(e.target.value)}
                  placeholder={tr("fraude.notaPlaceholder")}
                  style={s.campo}
                />
                <div style={{ ...s.fila, marginTop: 8 }}>
                  <button
                    type="button"
                    style={{ ...s.boton, ...(nota.trim().length >= 5 ? s.botonVerde : {}) }}
                    disabled={nota.trim().length < 5 || trabajando === senal.id}
                    onClick={() => resolver(senal.id)}
                  >
                    {trabajando === senal.id ? tr("common.loading") : tr("fraude.confirmarRevision")}
                  </button>
                  <button type="button" style={s.boton}
                    onClick={() => { setRevisando(null); setNota(""); }}>
                    {tr("common.back")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ ...s.fila, marginTop: 12 }}>
                {/*
                  Suspender y reactivar son el MISMO lugar y botones distintos:
                  es la misma decisión mirada desde los dos lados, y una
                  suspensión automática que no se pueda levantar desde acá sería
                  una trampa y no un control.
                */}
                {cerrada ? (
                  <button type="button" style={{ ...s.boton, ...s.botonVerde }}
                    disabled={trabajando === senal.userId}
                    onClick={() => cambiarEstado(senal.userId, "ACTIVE")}>
                    {tr("fraude.reactivar")}
                  </button>
                ) : (
                  <button type="button" style={{ ...s.boton, ...s.botonRojo }}
                    disabled={trabajando === senal.userId}
                    onClick={() => cambiarEstado(senal.userId, "SUSPENDED")}>
                    {tr("fraude.suspender")}
                  </button>
                )}
                <button type="button" style={s.boton} onClick={() => setRevisando(senal.id)}>
                  {tr("fraude.revisar")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
