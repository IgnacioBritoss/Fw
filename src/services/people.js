// ============================================================================
//  people.js — Cómo se nombra a una persona en la interfaz
// ----------------------------------------------------------------------------
//  Dos ayudas chicas que usan varias pantallas. Viven acá y no junto al
//  componente Avatar porque un archivo que exporta un componente de React no
//  debe exportar además funciones sueltas: rompe la recarga en caliente de Vite.
// ============================================================================

/** Iniciales de una persona: primera letra del nombre y del apellido. */
export function initialsOf(person) {
  const first = person?.firstName || (person?.displayName || person?.name || "").split(" ")[0] || "";
  const last = person?.lastName || (person?.displayName || person?.name || "").split(" ").slice(1).join(" ") || "";
  return `${first[0] || "U"}${last[0] || ""}`.toUpperCase();
}

/**
 * Nombre visible de una persona. `fallback` es el texto traducido para cuando no
 * hay ningún nombre cargado (la traducción la pasa quien llama, porque esto no
 * es un componente y no tiene acceso al hook de idioma).
 */
export function nameOf(person, fallback = "") {
  return person?.displayName
    || `${person?.firstName || ""} ${person?.lastName || ""}`.trim()
    || person?.email
    || fallback;
}
