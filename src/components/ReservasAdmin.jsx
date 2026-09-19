// ============================================================================
//  ReservasAdmin — Las reservas de toda la plataforma, y cobrar una garantía
// ----------------------------------------------------------------------------
//  Tres rutas que el servidor tenía escritas y el panel no usaba:
//
//      GET  /admin/bookings
//      GET  /admin/bookings/:id
//      POST /payments/bookings/:id/deposit-capture
//
//  ── POR QUÉ ES EL ADMINISTRADOR Y NO EL DUEÑO QUIEN COBRA UN DAÑO ─────────
//  El comentario del servidor lo dice mejor de lo que lo diría yo: "es plata de
//  otra persona y hay dos partes con intereses opuestos: si el dueño pudiera
//  capturar solo, el depósito sería un botón para quedarse con la garantía de
//  quien alquiló sin que nadie mire. El dueño reclama, la plataforma resuelve".
//
//  Esta pantalla es el lado "la plataforma resuelve", que hasta ahora no
//  existía en ninguna parte: el reclamo llegaba por un reporte y no había
//  forma de actuar sobre la garantía.
//
//  ── LO QUE ESTA PANTALLA NO PUEDE SABER ───────────────────────────────────
//  Si la retención SIGUE viva. El estado de pagos de una reserva el servidor
//  solo se lo entrega a las dos partes, así que un administrador que lo pida
//  recibe un 403 —y está bien que sea así—. Acá se decide con lo que trae la
//  reserva: que se haya pedido la retención y que no se haya cobrado todavía.
//  Si mientras tanto se soltó, el servidor lo dice al intentar y ese mensaje se
//  muestra tal cual. Es preferible a esconder el botón por las dudas: el
//  momento en que hace falta es justo cuando no se puede estar sin él.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import { adminGetBookings, captureDeposit, settleBooking } from "../services/api";
import { garantiaDeLaReserva, revisarCaptura, liquidacionPendiente } from "../services/movimientos";
import Spinner from "./Spinner";
import ReclamosAdmin from "./ReclamosAdmin";

const s = {
  card: { background: "var(--fw-surface)", borderRadius: 12, padding: 18, marginBottom: 12, border: "1px solid var(--fw-line-soft)" },
  fila: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  titulo: { fontWeight: 700, fontSize: 14, color: "var(--fw-text)" },
  chip: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "var(--fw-bg)", color: "var(--fw-text-2)" },
  meta: { fontSize: 12.5, color: "var(--fw-text-3)", marginTop: 6, lineHeight: 1.6 },
  enlace: { background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12.5, color: "var(--fw-blue-text)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 },
  caja: { marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--fw-line-soft)" },
  etiqueta: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--fw-text-3)", marginBottom: 5 },
  entrada: { width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 14, fontFamily: "inherit", background: "var(--fw-surface)", color: "var(--fw-text)", border: "1.5px solid var(--fw-border)", outline: "none", boxSizing: "border-box" },
  error: { fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 5 },
  aviso: { fontSize: 12, color: "var(--fw-text-4)", marginTop: 6, lineHeight: 1.6 },
  cobrar: { marginTop: 12, padding: "10px 18px", background: "var(--fw-amber)", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
  hecho: { marginTop: 10, fontSize: 12.5, color: "var(--fw-green-text-2)" },
  liquidar: { marginTop: 10, padding: "9px 16px", background: "transparent", color: "var(--fw-blue-text)", border: "1.5px solid var(--fw-blue-line)", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
  vacio: { textAlign: "center", padding: "40px 0", color: "var(--fw-text-4)" },
};

const plata = (valor, moneda = "ARS") =>
  `$${Number(valor || 0).toLocaleString("es-AR")} ${String(moneda).toUpperCase()}`;

/**
 * REINTENTAR LA LIQUIDACIÓN DE UNA RESERVA DEVUELTA.
 *
 * Aparece solo donde hace falta: una reserva devuelta, con plata para el dueño,
 * y sin la transferencia hecha (services/movimientos.js). Es el caso en que la
 * devolución salió bien y la plata no, que el servidor ya no trata como un
 * error de la devolución —el auto volvió igual— pero que hay que poder
 * terminar, porque confirmar la devolución otra vez no se puede.
 *
 * No duplica nada: el servidor suelta el depósito solo si sigue retenido y
 * transfiere solo si no transfirió antes.
 */
function Liquidar({ reserva, onListo }) {
  const { t: tr } = useI18n();
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState(null);
  const [listo, setListo] = useState(false);

  if (!liquidacionPendiente(reserva)) return null;
  if (listo) return <div style={s.hecho}>{tr("admin.settleDone")}</div>;

  const mandar = async () => {
    setMandando(true);
    setFallo(null);
    try {
      await settleBooking(reserva.id);
      setListo(true);
      onListo?.();
    } catch (err) {
      // El mensaje del servidor tal cual: dice QUÉ rechazó Stripe, que es lo
      // único que permite saber si falta el alta del dueño o es otra cosa.
      setFallo(err.message || tr("admin.settleFailed"));
    } finally {
      setMandando(false);
    }
  };

  return (
    <div>
      <div style={s.aviso}>{tr("admin.settlePending")}</div>
      <button type="button" style={s.liquidar} disabled={mandando} onClick={mandar}>
        {mandando ? tr("common.loading") : tr("admin.settleRetry")}
      </button>
      {fallo && <div style={s.error}>{fallo}</div>}
    </div>
  );
}

/** El formulario de cobro de la garantía, para UNA reserva. */
function CobrarGarantia({ reserva, onCobrado }) {
  const { t: tr } = useI18n();
  const garantia = garantiaDeLaReserva(reserva);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState(null);

  if (!garantia) {
    return (
      <div style={s.aviso}>
        {tr(reserva.depositCapturedAmount != null
          ? "captura.yaCobrada"
          : "captura.sinGarantia", { monto: plata(reserva.depositCapturedAmount, reserva.currency) })}
      </div>
    );
  }

  const revisado = revisarCaptura({ monto, motivo, topeMinor: garantia.topeMinor });
  const errores = mostrarErrores ? revisado.errores : {};

  const enviar = async (evento) => {
    evento.preventDefault();
    setMostrarErrores(true);
    setFallo(null);
    if (!revisado.ok) return;
    setMandando(true);
    try {
      await captureDeposit(reserva.id, revisado.montoMinor, revisado.motivo);
      onCobrado?.();
    } catch (error) {
      // El mensaje del servidor se muestra tal cual: "ya se soltó o nunca se
      // autorizó" es exactamente lo que hay que leer, y un texto propio que
      // diga "no se pudo" taparía el único dato útil.
      setFallo(error.message || tr("captura.noSePudo"));
    } finally {
      setMandando(false);
    }
  };

  return (
    <form onSubmit={enviar} style={s.caja}>
      <div style={{ ...s.titulo, marginBottom: 4 }}>{tr("captura.titulo")}</div>
      <div style={s.aviso}>
        {tr("captura.explicacion", { total: plata(garantia.total, garantia.moneda) })}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label style={s.etiqueta} htmlFor={`monto-${reserva.id}`}>
            {tr("captura.monto", { tope: plata(garantia.total, garantia.moneda) })}
          </label>
          <input id={`monto-${reserva.id}`} inputMode="decimal" value={monto}
            onChange={(e) => setMonto(e.target.value)}
            style={{ ...s.entrada, ...(errores.monto ? { border: "1.5px solid var(--fw-red)" } : {}) }} />
          {errores.monto && <div style={s.error}>{tr(errores.monto)}</div>}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={s.etiqueta} htmlFor={`motivo-${reserva.id}`}>{tr("captura.motivo")}</label>
        <textarea id={`motivo-${reserva.id}`} rows={3} value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={tr("captura.motivoEjemplo")}
          style={{ ...s.entrada, resize: "vertical", ...(errores.motivo ? { border: "1.5px solid var(--fw-red)" } : {}) }} />
        {errores.motivo
          ? <div style={s.error}>{tr(errores.motivo)}</div>
          : <div style={s.aviso}>{tr("captura.motivoNota")}</div>}
      </div>

      {fallo && <div style={s.error}>{fallo}</div>}

      <button type="submit" style={s.cobrar} disabled={mandando}>
        {mandando ? tr("captura.cobrando") : tr("captura.cobrar")}
      </button>
    </form>
  );
}

export default function ReservasAdmin() {
  const { t: tr, lang } = useI18n();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(null);
  const [cobrada, setCobrada] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await adminGetBookings();
      setReservas(Array.isArray(datos) ? datos : []);
    } catch {
      setReservas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <Spinner block label={tr("common.loading")} />;
  if (reservas.length === 0) return <div style={s.vacio}>{tr("admin.noBookings")}</div>;

  const persona = (p) => p?.displayName || `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || p?.email || "";
  const auto = (r) => {
    const v = r.vehicle || r.listing?.vehicle || {};
    return `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim() || r.listing?.title || "";
  };

  return (
    <div>
      {/* Los reclamos primero: es lo único de esta pantalla que tiene a alguien
          esperando del otro lado. Mientras un reclamo está abierto, el depósito
          de quien alquiló sigue retenido y el dueño no cobró su daño. */}
      <ReclamosAdmin />
      {reservas.map(r => (
        <div key={r.id} style={s.card}>
          <div style={s.fila}>
            {/* Los estados ya están traducidos en el diccionario con el prefijo
                `status.`: el mismo que usa "Mis reservas". Inventar otro juego
                de textos para lo mismo sería tener dos nombres para un estado. */}
            <span style={s.chip}>{tr(`status.${r.status}`)}</span>
            <span style={s.titulo}>{auto(r)}</span>
            <span style={{ ...s.meta, marginTop: 0, marginLeft: "auto" }}>
              {shortDate(r.startDate, lang)} - {shortDate(r.endDate, lang)}
            </span>
          </div>
          <div style={s.meta}>
            {tr("admin.bookingOwner")}: <strong>{persona(r.owner)}</strong>
            {" · "}{tr("admin.bookingRenter")}: <strong>{persona(r.renter)}</strong>
            {r.totalPriceSnapshot != null && <> · {plata(r.totalPriceSnapshot, r.currency)}</>}
          </div>

          <button type="button" style={{ ...s.enlace, marginTop: 8 }}
            onClick={() => { setAbierta(abierta === r.id ? null : r.id); setCobrada(null); }}>
            {tr(abierta === r.id ? "admin.bookingHide" : "admin.bookingDeposit")}
          </button>

          {abierta === r.id && (
            cobrada === r.id
              ? <div style={s.hecho}>{tr("captura.listo")}</div>
              : <CobrarGarantia reserva={r} onCobrado={() => { setCobrada(r.id); cargar(); }} />
          )}

          {/* Fuera del desplegable de la garantía, porque no es lo mismo: la
              garantía se cobra cuando hay un daño y es una decisión; esto es un
              trabajo que quedó a medias y hay que terminar. */}
          <Liquidar reserva={r} onListo={cargar} />
        </div>
      ))}
    </div>
  );
}
