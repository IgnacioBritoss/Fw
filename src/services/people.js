// ============================================================================
//  people.js — Cómo se nombra a una persona en la interfaz
// ----------------------------------------------------------------------------
//  Dos ayudas chicas que usan varias pantallas. Viven acá y no junto al
//  componente Avatar porque un archivo que exporta un componente de React no
//  debe exportar además funciones sueltas: rompe la recarga en caliente de Vite.
// ============================================================================

/*
  ── EL NOMBRE, CON LA MAYÚSCULA PUESTA ───────────────────────────────────────

  El perfil decía "ignacio britos". No era un error de la pantalla: la cuenta se
  creó escribiendo el nombre en minúscula —como escribe cualquiera en el teclado
  de un celular— y lo que se guardó fue eso. Ese texto aparece en el perfil, en
  el chat, en la ficha que mira la otra persona antes de prestarle su auto y en
  los mails.

  El servidor ya lo guarda bien de acá en adelante y corrige las cuentas viejas
  al publicar. Esto es la otra mitad: lo que YA está cargado se ve bien desde el
  momento en que se abre la pantalla, sin esperar a ningún arreglo de la base. Y
  cubre los nombres que no pasan por ahí.

  LAS DOS COSAS QUE NO HACE, iguales a las del servidor:
   · no toca una palabra que ya tenga una mayúscula adentro ("McDonald",
     "DiCaprio", "O'Brien"): su dueño la escribió así;
   · no levanta las partículas del medio ("Juan de la Cruz", no "Juan De La
     Cruz"), salvo que sean la primera palabra ("Da Silva").
*/
const PARTICULAS = new Set([
  "de", "del", "la", "las", "los", "da", "das", "do", "dos", "di",
  "van", "von", "der", "y", "e",
]);

/** El nombre de una persona, como se escribe. */
export function conMayusculas(texto) {
  if (typeof texto !== "string") return "";
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (!limpio) return "";

  let primera = true;
  return limpio
    .split(" ")
    .map(parte => parte.split("-").map(trozo => {
      if (!trozo) return trozo;
      // Ya tiene una mayúscula: está escrito como su dueño quiso.
      const intacto = trozo !== trozo.toLowerCase();
      const salida = intacto || (!primera && PARTICULAS.has(trozo))
        ? trozo
        : trozo[0].toUpperCase() + trozo.slice(1);
      primera = false;
      return salida;
    }).join("-"))
    .join(" ");
}

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
  const nombre = person?.displayName
    || `${person?.firstName || ""} ${person?.lastName || ""}`.trim();
  // El email NO pasa por conMayusculas: una dirección es un identificador y se
  // escribe como es. "Juan@Gmail.com" no es el mail de nadie.
  return conMayusculas(nombre) || person?.email || fallback;
}

// ── Quién ve la foto de perfil ───────────────────────────────────────────────
// Los dos valores del enum PhotoVisibility del backend. Están acá y no escritos
// a mano en cada pantalla para que no haya un "BOOKED" mal tipeado que el backend
// rechace con un 400 imposible de entender.
export const FOTO_TODOS = "EVERYONE";
export const FOTO_RESERVAS = "BOOKED";

/**
 * El ajuste de una persona, tolerando que no venga.
 *
 * El front y el backend se publican por separado: mientras el backend viejo siga
 * arriba, `/users/me` no devuelve este campo. En ese caso vale "todo el mundo",
 * que es cómo se venía comportando la app hasta ahora.
 */
export const visibilidadDeFoto = (user) =>
  user?.profilePhotoVisibility === FOTO_RESERVAS ? FOTO_RESERVAS : FOTO_TODOS;
