// ============================================================================
//  dates.js — La regla de "desde cuándo se puede alquilar"
// ----------------------------------------------------------------------------
//  EL DÍA DE HOY NO CUENTA. Un alquiler no se toma para el mismo día: si son las
//  16:40 del 29, el primer día que se puede reservar es el 30. No importa la
//  hora, importa el día.
//
//  Antes cada pantalla lo resolvía a su manera: el panel de disponibilidad decía
//  "Libre desde el 29" (hoy), los filtros dejaban elegir hoy como fecha de
//  retiro, y solo el calendario de la reserva lo hacía bien. Resultado: la app
//  ofrecía un día que el servidor después rechazaba.
//
//  Estas funciones son la única fuente de esa regla en el front. El backend la
//  vuelve a aplicar por su cuenta (assertDateRange en availability.service.ts),
//  como corresponde: el front avisa, el servidor decide.
// ============================================================================

/** Una fecha como YYYY-MM-DD, que es el formato que usan los <input type="date">. */
export const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Hoy, en la zona horaria de quien usa la app. */
export const today = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // mediodía: evita corrimientos de día por zona horaria
  return d;
};

/**
 * El primer día que se puede alquilar: mañana.
 *
 * Es el mínimo de todos los selectores de fecha de retiro y el punto de partida
 * para buscar el primer día libre de un auto.
 */
export const firstBookableDay = () => {
  const d = today();
  d.setDate(d.getDate() + 1);
  return d;
};

/** El primer día alquilable en formato YYYY-MM-DD, para el `min` de los inputs. */
export const firstBookableInput = () => toInputDate(firstBookableDay());
