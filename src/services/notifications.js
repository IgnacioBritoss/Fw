// Sistema de notificaciones real: deriva notificaciones de los datos reales
// de la app (reservas y conversaciones) y persiste el estado de "leído".
import { getMyBookings, getMyConversations } from "./api";

const READ_KEY = "fw_notif_read";

export function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
}
export function setReadIds(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}
export function markRead(ids) {
  const s = getReadIds();
  ids.forEach(i => s.add(i));
  setReadIds(s);
}
export function markAllRead(notifs) {
  markRead(notifs.map(n => n.id));
}

const asArray = (d) => (Array.isArray(d) ? d : (d?.data ?? []));

function carLabel(b) {
  const v = b?.listing?.vehicle || b?.vehicle;
  if (v?.brand || v?.model) return `${v.brand || ""} ${v.model || ""}`.trim();
  return b?.listing?.title || "tu reserva";
}

// Genera la lista de notificaciones a partir de datos reales del usuario.
export async function buildNotifications(userId) {
  const [bookingsRaw, convsRaw] = await Promise.all([
    getMyBookings().catch(() => []),
    getMyConversations().catch(() => []),
  ]);

  const list = [];

  // ── Reservas ──
  for (const b of asArray(bookingsRaw)) {
    const car = carLabel(b);
    const status = String(b.status || "").toUpperCase();
    let title, body, cat = "reserva";
    if (status === "CONFIRMED" || status === "ACCEPTED") {
      title = "Reserva confirmada"; body = `Se confirmó tu reserva de ${car}`;
    } else if (status === "PENDING") {
      title = "Reserva pendiente"; body = `Tu reserva de ${car} está esperando confirmación`;
    } else if (status === "REJECTED" || status === "CANCELLED" || status === "CANCELED") {
      title = "Reserva cancelada"; body = `Tu reserva de ${car} fue cancelada`;
    } else {
      title = "Actualización de reserva"; body = car;
    }
    const ts = new Date(b.updatedAt || b.createdAt || Date.now()).getTime();
    list.push({ id: `booking-${b.id}-${status}`, cat, title, body, ts, link: "/my-bookings" });

    if (b.paymentStatus === "PAID" || b.paid === true) {
      list.push({ id: `pay-${b.id}`, cat: "sistema", title: "Pago procesado", body: `Pago confirmado para ${car}`, ts, link: "/my-bookings" });
    }
  }

  // ── Mensajes ──
  for (const c of asArray(convsRaw)) {
    const last = c.messages?.[0];
    if (!last) continue;
    if (userId && last.senderId === userId) continue; // solo mensajes entrantes
    const other = c.otherUser || c.owner || c.renter || last.sender || {};
    const name = other.firstName ? `${other.firstName} ${other.lastName || ""}`.trim() : "un usuario";
    const ts = new Date(last.createdAt || c.updatedAt || Date.now()).getTime();
    list.push({
      id: `msg-${c.id}-${last.id || ts}`,
      cat: "mensaje",
      title: `Nuevo mensaje de ${name}`,
      body: last.content || last.text || "Tenés un mensaje nuevo",
      ts, link: "/chat",
    });
  }

  // Orden: más recientes primero
  list.sort((a, b) => b.ts - a.ts);
  return list;
}

// ¿Hay notificaciones sin leer? (para el puntito del topbar)
export async function hasUnreadNotifications(userId) {
  try {
    const notifs = await buildNotifications(userId);
    const read = getReadIds();
    return notifs.some(n => !read.has(n.id));
  } catch { return false; }
}