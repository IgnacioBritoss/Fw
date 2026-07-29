// ============================================================================
//  OccupiedDates — Los días que un auto ya tiene tomados
// ----------------------------------------------------------------------------
//  Antes esto era un recuadro beige con letras marrones y las fechas pegadas una
//  atrás de la otra separadas por puntos ("30 jul · 31 jul · 1 ago · 2 ago…").
//  Dos problemas: el color no era de ningún lado de la app, y la lista de fechas
//  suelta no dice lo único que a alguien le interesa saber, que es DESDE CUÁNDO
//  puede alquilar.
//
//  Cómo queda ahora:
//   · los mismos azules y grises que el resto de la página;
//   · arriba, la respuesta directa: el primer día libre;
//   · abajo, los días tomados como fichas, agrupadas en tramos seguidos
//     ("30 jul → 4 ago" en vez de seis fichas sueltas), que es como uno piensa
//     un alquiler.
// ============================================================================
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Agrupa días sueltos (YYYY-MM-DD) en tramos seguidos.
 * ["2026-07-30","2026-07-31","2026-08-01","2026-08-05"]
 *   → [{from:"2026-07-30", to:"2026-08-01"}, {from:"2026-08-05", to:"2026-08-05"}]
 */
function groupIntoRanges(days) {
  const sorted = [...new Set(days)].sort();
  const ranges = [];

  for (const day of sorted) {
    const last = ranges[ranges.length - 1];
    const isNext = last &&
      new Date(`${day}T00:00:00Z`).getTime() - new Date(`${last.to}T00:00:00Z`).getTime() === MS_DAY;
    if (isNext) last.to = day;
    else ranges.push({ from: day, to: day });
  }

  return ranges;
}

/** El primer día, de hoy en adelante, que no está en la lista de ocupados. */
function firstFreeDay(days) {
  const taken = new Set(days);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  // Se buscan como máximo 120 días para adelante; más lejos no tiene sentido.
  for (let i = 0; i < 120; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!taken.has(key)) return key;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

const short = (day) => format(parseISO(day), "d MMM", { locale: es });

export default function OccupiedDates({ days = [], isMobile = false }) {
  if (days.length === 0) return null;

  const ranges = groupIntoRanges(days);
  const shown = ranges.slice(0, isMobile ? 3 : 5);
  const hidden = ranges.length - shown.length;
  const free = firstFreeDay(days);

  return (
    <div style={{
      marginTop: 14,
      background: "#f8fafc",
      border: "1px solid #e5e7eb",
      borderLeft: "3px solid #2563eb",
      borderRadius: 10,
      padding: isMobile ? "11px 13px" : "12px 14px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 12.5, fontWeight: 700, color: "#111827", marginBottom: 8,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
        Disponibilidad
      </div>

      {/* Lo primero que se quiere saber: desde cuándo se puede alquilar. */}
      {free && (
        <div style={{ fontSize: 13, color: "#374151", marginBottom: 9, lineHeight: 1.5 }}>
          Libre desde el <strong style={{ color: "#111827" }}>{short(free)}</strong>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "#6b7280", marginBottom: 6 }}>
        Días ya tomados
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {shown.map(range => (
          <span key={range.from} style={{
            fontSize: 12, fontWeight: 600, color: "#334155",
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 7, padding: "4px 9px", whiteSpace: "nowrap",
          }}>
            {range.from === range.to
              ? short(range.from)
              : `${short(range.from)} → ${short(range.to)}`}
          </span>
        ))}
        {hidden > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#6b7280",
            padding: "4px 4px", whiteSpace: "nowrap",
          }}>
            +{hidden} más
          </span>
        )}
      </div>
    </div>
  );
}
