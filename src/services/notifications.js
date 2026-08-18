// Sistema de notificaciones real: deriva notificaciones de los datos reales
// de la app (reservas y conversaciones) y persiste el estado de "leído".
import { getMyBookings, getMyConversations } from "./api";

// Clave de localStorage donde guardamos los IDs de notificaciones ya leídas.
const READ_KEY = "fw_notif_read";

// Devuelve el conjunto (Set) de IDs de notificaciones que el usuario ya leyó.
export function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
}
// Guarda en localStorage el conjunto de IDs leídos.
export function setReadIds(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}
// Marca como leídas las notificaciones cuyos IDs se pasan.
export function markRead(ids) {
  const s = getReadIds();
  ids.forEach(i => s.add(i));
  setReadIds(s);
}
// Marca TODAS las notificaciones de la lista como leídas.
export function markAllRead(notifs) {
  markRead(notifs.map(n => n.id));
}

// El backend a veces devuelve un array directo y a veces { data: [...] }.
// Esta función normaliza ambos casos a un array simple.
const asArray = (d) => (Array.isArray(d) ? d : (d?.data ?? []));

// Arma un nombre legible del auto de una reserva ("Toyota Corolla" o el título).
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
<<<<<<< HEAD
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
=======
    // Se guardan CLAVES de traducción, no texto: este servicio no sabe en qué
    // idioma está la app, y la pantalla que las muestra sí. Antes las armaba en
    // castellano y las notificaciones quedaban en castellano en los cinco idiomas.
    let titleKey, bodyKey, cat = "reserva";
    if (status === "CONFIRMED" || status === "ACCEPTED") {
      titleKey = "notif.bookingConfirmed"; bodyKey = "notif.bookingConfirmedBody";
    } else if (status === "PENDING") {
      titleKey = "notif.bookingPending"; bodyKey = "notif.bookingPendingBody";
    } else if (status === "REJECTED" || status === "CANCELLED" || status === "CANCELED") {
      titleKey = "notif.bookingCancelled"; bodyKey = "notif.bookingCancelledBody";
    } else {
      titleKey = "notif.bookingUpdated"; bodyKey = "";
    }
    const ts = new Date(b.updatedAt || b.createdAt || Date.now()).getTime();
    list.push({ id: `booking-${b.id}-${status}`, cat, titleKey, bodyKey, body: bodyKey ? "" : car, vars: { car }, ts, link: "/my-bookings" });

    if (b.paymentStatus === "PAID" || b.paid === true) {
      list.push({ id: `pay-${b.id}`, cat: "sistema", titleKey: "notif.paid", bodyKey: "notif.paidBody", vars: { car }, ts, link: "/my-bookings" });
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    }
  }

  // ── Mensajes ──
  for (const c of asArray(convsRaw)) {
    const last = c.messages?.[0];
    if (!last) continue;
    if (userId && last.senderId === userId) continue; // solo mensajes entrantes
    const other = c.otherUser || c.owner || c.renter || last.sender || {};
<<<<<<< HEAD
    const name = other.firstName ? `${other.firstName} ${other.lastName || ""}`.trim() : "un usuario";
=======
    const name = other.firstName ? `${other.firstName} ${other.lastName || ""}`.trim() : "";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    const ts = new Date(last.createdAt || c.updatedAt || Date.now()).getTime();
    list.push({
      id: `msg-${c.id}-${last.id || ts}`,
      cat: "mensaje",
<<<<<<< HEAD
      title: `Nuevo mensaje de ${name}`,
      body: last.content || last.text || "Tenés un mensaje nuevo",
=======
      titleKey: name ? "notif.newMessageFrom" : "notif.newMessage",
      vars: { name },
      // El cuerpo es el mensaje real de la otra persona: eso no se traduce.
      // Si el mensaje era un audio o una foto no hay texto, y ahí sí va una frase.
      body: last.content || last.text || "",
      bodyKey: (last.content || last.text) ? "" : "notif.newMessage",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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