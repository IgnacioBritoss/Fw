// ============================================================================
//  Notifications — Centro de NOTIFICACIONES
// ----------------------------------------------------------------------------
//  Arma la lista de notificaciones a partir de datos reales (reservas y
//  mensajes) usando el servicio notifications.js. Permite filtrarlas por
//  categoría, marcarlas como leídas (una o todas) y las agrupa por día.
//  El estado de "leído" se guarda en localStorage.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { buildNotifications, getReadIds, markRead, markAllRead } from "../../services/notifications";
import { useI18n } from "../../i18n/core";
import { dayMonth, timeOfDay } from "../../i18n/dates";
import Spinner from "../../components/Spinner";

// ── Íconos SVG por categoría (sin emojis) ──
const Icon = ({ name, color = "#374151" }) => {
  const p = { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    // El auto: mismo dibujo que el resto de la app (components/CarIcon), no una
    // copia distinta. Antes acá había su propia versión del trapecio.
    reserva: (
      <>
        <path d="M2.7 15.1v-1.7c0-.5.35-.92.84-1.01l2.7-.5 2.2-2.94c.36-.48.92-.76 1.52-.76h4.3c.5 0 .98.2 1.34.55l3.1 3.06 2.05.42c.55.11.95.6.95 1.16v1.72" {...p} />
        <path d="M2.7 15.1h1.6M9.1 15.1h5.8M19.7 15.1h1.6" {...p} />
        <path d="M4.3 15.1a2.4 2.4 0 0 1 4.8 0M14.9 15.1a2.4 2.4 0 0 1 4.8 0" {...p} />
        <circle cx="6.7" cy="15.6" r="1.9" {...p} />
        <circle cx="17.3" cy="15.6" r="1.9" {...p} />
        <path d="M12.4 8.2v3.9M6.24 11.88h13.06" {...p} />
      </>
    ),
    mensaje: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...p} />,
    sistema: <><rect x="2" y="6" width="20" height="13" rx="2" {...p} /><path d="M2 10h20" {...p} /></>,
    promo: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8z" {...p} /><circle cx="7.5" cy="7.5" r="1.2" {...p} /></>,
    review: <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2z" {...p} />,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24">{paths[name] || paths.sistema}</svg>;
};

const CAT_META = {
  reserva: { key: "notif.catBookings", icon: "reserva", bg: "#eef2ff", fg: "#4f46e5" },
  mensaje: { key: "notif.catMessages", icon: "mensaje", bg: "#f1f5f9", fg: "#475569" },
  sistema: { key: "notif.catSystem", icon: "sistema", bg: "#ecfdf5", fg: "#059669" },
  promo: { key: "notif.catPromos", icon: "promo", bg: "#fef9c3", fg: "#ca8a04" },
  review: { key: "notif.catReviews", icon: "review", bg: "#fff7ed", fg: "#ea580c" },
};

const TABS = [
  { key: "todas", label: "notif.tabAll" },
  { key: "reserva", label: "notif.catBookings" },
  { key: "mensaje", label: "notif.catMessages" },
  { key: "promo", label: "notif.catPromos" },
  { key: "sistema", label: "notif.catSystem" },
];

/** ¿Las dos fechas caen el mismo día? */
const mismoDia = (a, b) => a.toDateString() === b.toDateString();

/** La fecha de ayer. */
function ayer() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * La hora o fecha corta que va al costado de cada notificación: la hora si es de
 * hoy, "Ayer", o el día y el mes si es más vieja.
 *
 * Recibe `tr` y `lang` en vez de resolverlos adentro porque no es un componente.
 * Antes devolvía el texto "notif.yesterday" tal cual —la CLAVE, sin traducir— y
 * eso es lo que se veía en pantalla; y las otras dos ramas formateaban con el
 * locale "es-AR" escrito a mano, así que con la app en inglés o en chino la hora
 * y el mes seguían saliendo en castellano.
 */
function timeLabel(ts, tr, lang) {
  const d = new Date(ts);
  if (mismoDia(d, new Date())) return timeOfDay(d, lang);
  if (mismoDia(d, ayer())) return tr("notif.yesterday");
  return dayMonth(d, lang);
}

/** La CLAVE del título del grupo: Hoy / Ayer / Anteriores. La traduce quien dibuja. */
function groupLabel(ts) {
  const d = new Date(ts);
  if (mismoDia(d, new Date())) return "notif.today";
  if (mismoDia(d, ayer())) return "notif.yesterday";
  return "notif.older";
}

export default function Notifications() {
  const { t: tr, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [notifs, setNotifs] = useState([]);
  const [readIds, setReadIds] = useState(getReadIds());
  const [tab, setTab] = useState("todas");
  const [loading, setLoading] = useState(true);

  // Construye la lista de notificaciones y refresca el estado de leídas.
  const load = useCallback(() => {
    setLoading(true);
    buildNotifications(user?.id)
      .then(list => { setNotifs(list); setReadIds(getReadIds()); })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isRead = (n) => readIds.has(n.id);
  const unreadCount = notifs.filter(n => !isRead(n)).length;
  const countFor = (key) => key === "todas" ? notifs.length : notifs.filter(n => n.cat === key).length;

  // Notificaciones que se muestran según la pestaña (categoría) activa.
  const filtered = tab === "todas" ? notifs : notifs.filter(n => n.cat === tab);

  // Abrir una notificación: la marca como leída y navega a su link (si tiene).
  const openNotif = (n) => {
    markRead([n.id]);
    setReadIds(getReadIds());
    if (n.link) navigate(n.link);
  };
  // Marcar una sola como leída (sin abrirla).
  const markOne = (e, n) => {
    e.stopPropagation();
    markRead([n.id]);
    setReadIds(getReadIds());
  };
  // Marcar todas como leídas.
  const markAll = () => {
    markAllRead(notifs);
    setReadIds(getReadIds());
  };

  // Agrupa las notificaciones filtradas por día (Hoy / Ayer / Anteriores).
  const groups = [];
  const seen = {};
  filtered.forEach(n => {
    const g = groupLabel(n.ts);
    if (!seen[g]) { seen[g] = []; groups.push([g, seen[g]]); }
    seen[g].push(n);
  });

  const s = {
    wrap: { padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1000, margin: "0 auto" },
    title: { fontSize: isMobile ? 26 : 32, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
    sub: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
    /*
      LA PANTALLA ERA UNA PILA DE BURBUJAS.

      Cada notificación era su propia tarjeta con borde y 14px de redondeo,
      separada de la de al lado, y arriba había pestañas con forma de píldora y
      dos botones también redondeados. Ocho formas iguales repetidas para una
      lista, que es la cosa más simple que hay: renglones uno abajo del otro.

      Ahora las notificaciones son UNA lista con líneas divisorias, y las
      pestañas son celdas de una franja, el mismo recurso del buscador y de los
      filtros. Lo único redondeado que queda es el puntito de "sin leer".
    */
    btnGhost: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", color: "#374151", border: "1px solid #ececec", borderRadius: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
    btnDark: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 4, fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
    // La franja de pestañas: celdas separadas por una línea. La activa se marca
    // con una barra abajo, no con un fondo negro que la convierte en un botón.
    tabs: { display: "flex", flexWrap: "wrap", alignItems: "stretch", background: "#fff", border: "1px solid #ececec", borderRadius: 4, marginBottom: 18, overflow: "hidden" },
    tab: (active) => ({
      display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 18px",
      fontSize: 13.5, fontWeight: 600, cursor: "pointer", background: "transparent",
      border: "none", borderLeft: "1px solid #f1f2f4",
      borderBottom: active ? "2px solid #0f6ce6" : "2px solid transparent",
      color: active ? "#0f6ce6" : "#6b7280",
    }),
    tabCount: (active) => ({ fontSize: 12, fontWeight: 700, color: active ? "#0f6ce6" : "#9ca3af" }),
    groupLabel: { fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 2px 8px" },
    // La lista entera es una sola caja; las notificaciones se separan con una
    // línea, como los renglones de una bandeja de entrada.
    lista: { background: "#fff", border: "1px solid #ececec", borderRadius: 4, overflow: "hidden" },
    row: (read, primera) => ({
      display: "flex", alignItems: "center", gap: 14,
      background: read ? "#fff" : "#f7faff",
      borderTop: primera ? "none" : "1px solid #f1f2f4",
      padding: "15px 16px", cursor: "pointer", transition: "background .15s",
    }),
    dot: { width: 8, height: 8, borderRadius: "50%", background: "#0f6ce6", flexShrink: 0 },
    dotGap: { width: 8, flexShrink: 0 },
  };

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={s.title}>{tr("nav.notifications")}</div>
          <div style={s.sub}>{loading ? tr("common.loading") : tr("notif.counts", { unread: unreadCount, total: notifs.length })}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.btnGhost} onClick={markAll} disabled={unreadCount === 0}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#374151" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {tr("notif.markAll")}
          </button>
          <button style={s.btnDark} onClick={() => navigate("/ajustes")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {tr("notif.prefs")}
          </button>
        </div>
      </div>

      {/* Las categorías, como celdas de una franja. La primera no lleva línea a
          la izquierda: quedaría doble contra el borde de la caja. */}
      <div style={{ ...s.tabs, marginTop: 20 }}>
        {TABS.map((t, i) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...s.tab(tab === t.key), ...(i === 0 ? { borderLeft: "none" } : {}) }}>
            {tr(t.label)}<span style={s.tabCount(tab === t.key)}>{countFor(t.key)}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {/* Mientras carga, el círculo: antes la lista aparecía vacía sin ningún aviso. */}
      {loading && <Spinner block label={tr("common.loading")} />}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "70px 20px", color: "#9ca3af" }}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#6b7280" }}>{tr("notif.empty")}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{tr("notif.emptyHint")}</div>
        </div>
      )}

      {groups.map(([label, items]) => (
        <div key={label}>
          <div style={s.groupLabel}>{tr(label)}</div>
          <div style={s.lista}>
          {items.map((n, i) => {
            const meta = CAT_META[n.cat] || CAT_META.sistema;
            const read = isRead(n);
            return (
              <div key={n.id} style={s.row(read, i === 0)} onClick={() => openNotif(n)}
                onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
                onMouseLeave={e => { e.currentTarget.style.background = read ? "#fff" : "#f7faff"; }}>
                {read ? <span style={s.dotGap} /> : <span style={s.dot} />}
                <div style={{ width: 38, height: 38, borderRadius: 4, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={meta.icon} color={meta.fg} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: read ? 600 : 700, color: "#111827" }}>{n.titleKey ? tr(n.titleKey, n.vars) : n.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.bodyKey ? tr(n.bodyKey, n.vars) : n.body}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 12.5, color: "#9ca3af" }}>{timeLabel(n.ts, tr, lang)}</span>
                  {!read && (
                    <button onClick={e => markOne(e, n)} title={tr("notif.markOne")}
                      style={{ width: 28, height: 28, borderRadius: 4, border: "1px solid #ececec", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#6b7280" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ))}
    </div>
  );
}
