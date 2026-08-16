// ============================================================================
//  AvailabilityManager — DISPONIBILIDAD POR FECHAS de un auto publicado
// ----------------------------------------------------------------------------
//  Panel para el dueño, desde "Mis autos": marca los períodos en los que su auto
//  NO está disponible (viaje, service, uso personal) y ve las reservas que ya lo
//  tienen ocupado.
//
//  Es la pieza que le faltaba al filtro de fechas: estos bloqueos son los que
//  hacen que un auto no aparezca cuando alguien busca esas fechas, y los que se
//  pintan en gris en el calendario de reserva. El backend ya tenía las rutas,
//  pero no había ninguna pantalla que las usara.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { addMonths } from "date-fns";
import {
  createAvailabilityBlock, deleteAvailabilityBlock,
  getAvailabilityBlocks, getListingAvailability,
} from "../services/api";
import { today, toInputDate } from "../services/dates";
import Spinner from "./Spinner";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";

const s = {
  panel: { background: "#f9fafb", border: "1px solid #ececec", borderRadius: 12, padding: 16, marginTop: 12 },
  title: { fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 12.5, color: "#6b7280", marginBottom: 14 },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".05em", textTransform: "uppercase" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none", color: "#111827" },
  btn: { padding: "10px 18px", background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  item: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fff", border: "1px solid #ececec", borderRadius: 10, padding: "10px 12px", marginBottom: 8, flexWrap: "wrap" },
  del: { background: "none", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, fontSize: 12, cursor: "pointer", padding: "5px 10px" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#b91c1c", marginBottom: 12 },
  info: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#1e40af", marginBottom: 12 },
  booked: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "9px 12px", marginBottom: 8, fontSize: 12.5, color: "#9a3412" },
};

// El dueño SÍ puede bloquear el día de hoy: bloquear no es reservar, es avisar
// que su auto no está disponible. La regla de "no se alquila el mismo día" aplica
// a las reservas, no a esto.
// Se usa el helper compartido porque `toISOString()` devuelve la fecha en UTC, y
// para alguien en Argentina (UTC-3) eso significaba que después de las 21:00 el
// mínimo saltaba al día siguiente.
const todayInput = () => toInputDate(today());
export default function AvailabilityManager({ listingId }) {
  const { t: tr, lang } = useI18n();
  // La fecha se escribe en el idioma elegido.
  const fmt = (date) => shortDate(date, lang);
  const [blocks, setBlocks] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Carga en paralelo: los bloqueos que puso el dueño y las reservas que ya
  // ocupan el auto (para que vea el panorama completo).
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      const [blockList, availability] = await Promise.all([
        getAvailabilityBlocks(listingId),
        getListingAvailability(listingId, now.toISOString(), addMonths(now, 12).toISOString()).catch(() => null),
      ]);
      setBlocks(Array.isArray(blockList) ? blockList : []);
      setBookedRanges(availability?.blockingBookings || []);
    } catch (err) {
      setError(err.message || tr("avail.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [listingId, tr]);

  useEffect(() => { load(); }, [load]);

  // Agrega un período no disponible. El backend exige fecha futura, fin después
  // del inicio y que no se pise con otro bloqueo.
  const addBlock = async () => {
    setError(""); setInfo("");
    if (!from || !to) { setError(tr("avail.errDates")); return; }
    if (new Date(to) <= new Date(from)) { setError(tr("avail.errOrder")); return; }

    setSaving(true);
    try {
      await createAvailabilityBlock(listingId, {
        // Se manda con hora para que el rango cubra el día completo.
        startDate: new Date(`${from}T00:00:00`).toISOString(),
        endDate: new Date(`${to}T23:59:00`).toISOString(),
        reason: reason.trim() || undefined,
      });
      setFrom(""); setTo(""); setReason("");
      setInfo(tr("avail.added"));
      await load();
    } catch (err) {
      setError(err.message || tr("avail.errSave"));
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (blockId) => {
    setError(""); setInfo("");
    try {
      await deleteAvailabilityBlock(listingId, blockId);
      await load();
    } catch (err) {
      setError(err.message || tr("avail.errDelete"));
    }
  };

  return (
    <div style={s.panel}>
      <div style={s.title}>{tr("avail.title")}</div>
      <div style={s.sub}>
        {tr("avail.sub")}
      </div>

      {error && <div style={s.error}>{error}</div>}
      {info && <div style={s.info}>{info}</div>}

      {/* Alta de un período */}
      <div style={s.row}>
        <div style={s.field}>
          <span style={s.label}>{tr("payment.from")}</span>
          <input type="date" style={s.input} min={todayInput()} value={from}
            onChange={e => { setFrom(e.target.value); if (to && new Date(to) <= new Date(e.target.value)) setTo(""); }} />
        </div>
        <div style={s.field}>
          <span style={s.label}>{tr("payment.to")}</span>
          <input type="date" style={s.input} min={from || todayInput()} value={to}
            onChange={e => setTo(e.target.value)} />
        </div>
        <div style={{ ...s.field, flex: 1, minWidth: 160 }}>
          <span style={s.label}>{tr("avail.reason")}</span>
          <input style={s.input} placeholder={tr("avail.phReason")} value={reason} maxLength={120}
            onChange={e => setReason(e.target.value)} />
        </div>
        <button style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={addBlock}>
          {saving ? tr("common.saving") : tr("avail.block")}
        </button>
      </div>

      {/* Períodos bloqueados por el dueño */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          {tr("avail.yourBlocks")}
        </div>
        {loading ? (
          <Spinner size={16} />
        ) : blocks.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#9ca3af" }}>{tr("avail.none")}</div>
        ) : blocks.map(block => (
          <div key={block.id} style={s.item}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                {fmt(block.startDate)} → {fmt(block.endDate)}
              </div>
              {block.reason && <div style={{ fontSize: 12, color: "#6b7280" }}>{block.reason}</div>}
            </div>
            <button style={s.del} onClick={() => removeBlock(block.id)}>{tr("avail.remove")}</button>
          </div>
        ))}
      </div>

      {/* Reservas que ya ocupan el auto (no se pueden quitar desde acá) */}
      {bookedRanges.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            {tr("avail.bookedBy")}
          </div>
          {bookedRanges.map(booking => (
            <div key={booking.id} style={s.booked}>
              <span>{fmt(booking.startDate)} → {fmt(booking.endDate)}</span>
              <span style={{ fontWeight: 700 }}>{tr("avail.booked")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
