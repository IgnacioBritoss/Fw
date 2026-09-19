// ============================================================================
//  MovimientosDelPago — Todo lo que le pasó a la plata de una reserva
// ----------------------------------------------------------------------------
//  GET /payments/bookings/:id/ledger, que el servidor tenía escrito y el front
//  no llamaba nunca.
//
//  ── QUÉ AGREGA SOBRE LO QUE YA SE VEÍA ────────────────────────────────────
//  La pantalla de pago dice en qué estado está cada tramo: pagado o no. Eso
//  alcanza mientras todo sale bien. Cuando algo no sale bien —un cobro que
//  falló y al segundo intento funcionó, un depósito que se retuvo y se soltó,
//  un desconocimiento de cobro— el estado actual NO cuenta lo que pasó, y
//  entonces "¿por qué me cobraron esto?" se queda sin respuesta.
//
//  Esto es esa respuesta: una lista de hechos con su fecha, escrita por el
//  servidor, que no se edita nunca. Lo ven las dos partes; los datos internos
//  —desde qué conexión se pagó, con qué navegador— el servidor solo se los
//  manda a un administrador, así que acá se muestra lo que llegue.
//
//  ── VIENE CERRADO ─────────────────────────────────────────────────────────
//  Porque la mayoría de las veces no hace falta: el alquiler salió bien y no
//  hay nada que investigar. Abierto de entrada, sería una lista de diez
//  renglones técnicos entre el resumen y el botón de pagar, todos los días,
//  para el caso raro. Se abre cuando alguien tiene una pregunta.
// ============================================================================
import { useState } from "react";
import { useI18n } from "../i18n/core";
import { getBookingLedger } from "../services/api";
import { paraMostrar } from "../services/movimientos";
import { longDate } from "../i18n/dates";

const s = {
  abrir: {
    background: "none", border: "none", padding: 0, fontFamily: "inherit",
    fontSize: 12.5, color: "var(--fw-text-3)", cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 2,
  },
  lista: { marginTop: 12, borderTop: "1px solid var(--fw-line-soft)" },
  fila: {
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
    gap: 12, padding: "9px 0", borderBottom: "1px solid var(--fw-line-soft)",
    fontSize: 12.5,
  },
  cuando: { color: "var(--fw-text-4)", fontSize: 11.5, whiteSpace: "nowrap" },
  vacio: { fontSize: 12.5, color: "var(--fw-text-4)", padding: "10px 0" },
};

/*
  EL COLOR DICE PARA QUÉ LADO FUE LA PLATA, SIN ESCRIBIRLO.

  Entró (un cobro), salió (una devolución o la transferencia al dueño), quedó
  retenida, se soltó, o no movió nada (un intento fallido, un desconocimiento).
  Cinco casos que en una lista de fechas y números se confunden entre sí.
*/
const TINTA = {
  entra: "var(--fw-green-text-2)",
  sale: "var(--fw-text-2)",
  retiene: "var(--fw-amber-text)",
  suelta: "var(--fw-text-3)",
  nada: "var(--fw-text-4)",
};

export default function MovimientosDelPago({ bookingId, moneda = "ARS" }) {
  const { t: tr, lang } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [registro, setRegistro] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);

  /*
    Se pide al ABRIR, no al dibujar la pantalla.

    Es un pedido más al servidor en una pantalla que ya hace dos, para algo que
    casi nadie va a mirar. Pedirlo siempre sería pagarlo siempre.
  */
  const alternar = async () => {
    const yendoAAbrir = !abierto;
    setAbierto(yendoAAbrir);
    if (!yendoAAbrir || registro || cargando) return;
    setCargando(true);
    setFallo(false);
    try {
      setRegistro(await getBookingLedger(bookingId));
    } catch {
      setFallo(true);
    } finally {
      setCargando(false);
    }
  };

  const movimientos = paraMostrar(registro);
  const plata = (minor, mon) => (minor == null
    ? ""
    : `$${Number(minor / 100).toLocaleString("es-AR")} ${String(mon || moneda).toUpperCase()}`);

  return (
    <div>
      <button type="button" style={s.abrir} onClick={alternar}>
        {tr(abierto ? "mov.ocultar" : "mov.ver")}
      </button>

      {abierto && (
        <div style={s.lista}>
          {cargando && <div style={s.vacio}>{tr("common.loading")}</div>}
          {fallo && <div style={s.vacio}>{tr("mov.noSePudo")}</div>}
          {!cargando && !fallo && movimientos.length === 0 && (
            <div style={s.vacio}>{tr("mov.vacio")}</div>
          )}
          {movimientos.map(m => (
            <div key={m.id} style={s.fila}>
              <span style={{ color: TINTA[m.signo], minWidth: 0 }}>
                {/* Un hecho que este front no conoce se muestra con su nombre
                    crudo. Esconder un movimiento de plata porque no está
                    traducido sería dejar el registro con un agujero. */}
                {m.clave ? tr(m.clave) : m.crudo}
              </span>
              <span style={{ display: "flex", gap: 10, alignItems: "baseline", flexShrink: 0 }}>
                {m.amountMinor != null && (
                  <strong style={{ color: TINTA[m.signo] }}>{plata(m.amountMinor, m.currency)}</strong>
                )}
                <span style={s.cuando}>{longDate(m.createdAt, lang)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
