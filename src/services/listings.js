// ============================================================================
//  listings.js — Formato ÚNICO de un auto para toda la app
// ----------------------------------------------------------------------------
//  El backend devuelve una publicación (listing) con el vehículo anidado y los
//  nombres de campo en inglés; los autos de ejemplo (mockData) usan otro
//  formato. Antes cada pantalla tenía su propia copia de la conversión, y por
//  eso los filtros funcionaban distinto (o no funcionaban) en cada una.
//
//  Acá vive una sola versión de:
//   - las etiquetas de categoría / caja / combustible,
//   - normalizeListing(): publicación del backend → objeto plano "car",
//   - los helpers de precio y de filtrado en el navegador.
// ============================================================================

// Categorías: el backend las guarda en el vehículo (enum VehicleCategory) y es
// lo que alimenta el filtro por categoría del inicio y del buscador.
export const CATEGORIES = [
  { id: "SEDAN", label: "Sedan", key: "cat.SEDAN" },
  { id: "SUV", label: "SUV", key: "cat.SUV" },
  { id: "BERLINA", label: "Berlinas", key: "cat.BERLINAS" },
  { id: "PICKUP", label: "Pickup", key: "cat.PICKUP" },
  { id: "ELECTRIC", label: "Eléctricos", key: "cat.ELECTRICS" },
  { id: "PREMIUM", label: "Premium", key: "cat.PREMIUM" },
];

export const CATEGORY_LABELS = {
  SEDAN: "Sedan", SUV: "SUV", BERLINA: "Berlina",
  PICKUP: "Pickup", ELECTRIC: "Eléctrico", PREMIUM: "Premium", OTHER: "Otro",
};

// Traducciones de los códigos del backend (en inglés) al texto que se muestra.
export const TRANSMISSION_LABELS = { MANUAL: "Manual", AUTOMATIC: "Automático" };
export const FUEL_LABELS = { GASOLINE: "Nafta", DIESEL: "Diesel", HYBRID: "Híbrido", ELECTRIC: "Eléctrico", OTHER: "GNC" };

// ── El mismo vocabulario, como CLAVES de traducción ──────────────────────────
// El tipo de auto, la caja y el combustible son texto que el usuario LEE, así que
// también tienen que cambiar de idioma. Antes las tarjetas del inicio mostraban
// "Eléctricos" y "Automático" en castellano incluso con la app en inglés.
// Las tablas de arriba se conservan como respaldo en castellano para el caso en
// que un código nuevo del backend todavía no tenga clave.
export const CATEGORY_KEYS = {
  SEDAN: "cat.SEDAN", SUV: "cat.SUV", BERLINA: "cat.BERLINA",
  PICKUP: "cat.PICKUP", ELECTRIC: "cat.ELECTRIC", PREMIUM: "cat.PREMIUM", OTHER: "cat.OTHER",
};
export const TRANSMISSION_KEYS = { MANUAL: "trans.MANUAL", AUTOMATIC: "trans.AUTOMATIC" };
export const FUEL_KEYS = {
  GASOLINE: "fuel.GASOLINE", DIESEL: "fuel.DIESEL", HYBRID: "fuel.HYBRID",
  ELECTRIC: "fuel.ELECTRIC", OTHER: "fuel.OTHER",
};

/**
 * Texto de un código del backend en el idioma elegido.
 * `tr` es la función de traducción; si el código no tiene clave se cae en la
 * tabla castellana, y si tampoco está ahí se devuelve el código tal cual.
 */
export function labelFor(tr, keys, labels, code) {
  if (!code) return "";
  const key = keys[code];
  if (!key) return labels[code] || code;
  const text = tr(key);
  // translate() devuelve la clave cuando no la encuentra: ahí se usa el respaldo.
  return text === key ? (labels[code] || code) : text;
}
export const categoryLabel = (tr, code) => labelFor(tr, CATEGORY_KEYS, CATEGORY_LABELS, code);
export const transmissionLabel = (tr, code) => labelFor(tr, TRANSMISSION_KEYS, TRANSMISSION_LABELS, code);
export const fuelLabel = (tr, code) => labelFor(tr, FUEL_KEYS, FUEL_LABELS, code);

// Las mismas tablas al revés: de lo que elige el usuario al código del backend.
export const TRANSMISSION_CODES = { Manual: "MANUAL", "Automático": "AUTOMATIC" };
export const FUEL_CODES = { Nafta: "GASOLINE", Diesel: "DIESEL", "Híbrido": "HYBRID", "Eléctrico": "ELECTRIC", GNC: "OTHER" };

// Los autos de ejemplo traen la categoría en castellano; esto la lleva al enum.
const LEGACY_CATEGORY_CODES = {
  sedan: "SEDAN", suv: "SUV", berlina: "BERLINA", berlinas: "BERLINA",
  pickup: "PICKUP", "eléctrico": "ELECTRIC", electrico: "ELECTRIC",
  "eléctricos": "ELECTRIC", premium: "PREMIUM",
};

/**
 * Deduce la categoría de un vehículo que se publicó antes de que el campo
 * existiera, para que no quede afuera de los filtros. Es la misma regla que usa
 * el backfill de la migración en el backend.
 */
function inferCategory(vehicle = {}) {
  if (vehicle.fuelType === "ELECTRIC") return "ELECTRIC";
  if (vehicle.drivetrain === "FOUR_BY_FOUR" && Number(vehicle.lengthMm) >= 4900) return "PICKUP";
  if (Number(vehicle.seats) >= 7 || Number(vehicle.heightMm) >= 1650) return "SUV";
  return "SEDAN";
}

/**
 * Publicación del backend (o auto de ejemplo) → objeto plano que usan todas las
 * pantallas. Tolera los dos juegos de nombres (pricePerDay / price_per_day) para
 * que un auto de mockData y uno real se puedan mezclar en la misma grilla.
 */
export function normalizeListing(listing) {
  const vehicle = listing.vehicle || {};
  const rawCategory = listing.category || vehicle.category;
  const category = rawCategory
    ? (LEGACY_CATEGORY_CODES[String(rawCategory).toLowerCase()] || String(rawCategory).toUpperCase())
    : inferCategory(vehicle);

  return {
    id: listing.id,
    brand: vehicle.brand || listing.brand || "",
    model: vehicle.model || listing.model || "",
    year: vehicle.year || listing.year || "",
    title: listing.title || "",
    price_per_day: Number(listing.pricePerDay ?? listing.price_per_day ?? 0),
    location: listing.locationText || listing.location || "",
    locationText: listing.locationText || listing.location || "",
    lat: listing.latitude ?? listing.lat,
    lng: listing.longitude ?? listing.lng,
    category,
    categoryLabel: CATEGORY_LABELS[category] || "",
    // La clave para traducir la categoría; el label de arriba es el respaldo.
    categoryKey: CATEGORY_KEYS[category] || "",
    // Se guardan el código y la etiqueta: el código sirve para filtrar contra el
    // backend y la etiqueta para mostrar.
    transmissionCode: vehicle.transmission || TRANSMISSION_CODES[listing.transmission] || "",
    fuelCode: vehicle.fuelType || FUEL_CODES[listing.fuel] || "",
    // Estos dos quedan como respaldo en castellano. Las pantallas dibujan
    // `transmissionCode` / `fuelCode` traducidos con transmissionLabel() y
    // fuelLabel(): antes mostraban estos, y con la app en inglés se leía
    // "Automático" y "Nafta" en medio de una pantalla en inglés.
    transmission: TRANSMISSION_LABELS[vehicle.transmission] || listing.transmission || "",
    fuel: FUEL_LABELS[vehicle.fuelType] || listing.fuel || "",
    seats: vehicle.seats ?? listing.seats,
    doors: vehicle.doors ?? listing.doors,
    color: vehicle.color || listing.color || "",
    photos: listing.photos || vehicle.photos || [],
    description: listing.description || "",
    status: listing.status || (listing.available === false ? "PAUSED" : "ACTIVE"),
    available: listing.status ? listing.status === "ACTIVE" : listing.available !== false,
    is_verified: listing.is_verified ?? true,
    // Promedio real de reseñas. El backend lo calcula y lo guarda en la
    // publicación (ratingAverage/ratingCount); los autos de ejemplo traen un
    // `rating` fijo escrito a mano.
    ratingAverage: listing.ratingAverage ?? (listing.rating ? Number(listing.rating) : null),
    ratingCount: Number(listing.ratingCount ?? listing.reviews_count ?? listing.reviewsCount ?? 0),
    rating: Number(listing.ratingAverage ?? listing.rating ?? 0),
    reviews: Number(listing.ratingCount ?? listing.reviews_count ?? listing.reviewsCount ?? 0),
    ownerId: listing.owner?.id || listing.ownerId || listing.owner_id || "",
    ownerName: ownerName(listing),
    isMock: listing.isMock === true,
  };
}

/** Nombre visible del dueño de una publicación. */
function ownerName(listing) {
  const owner = listing.owner;
  if (!owner) return listing.owner_name || "";
  return owner.displayName || `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "";
}

/** Precio por día, tolerando los dos nombres posibles del campo. */
export const priceOf = (car) => Number(car?.price_per_day || car?.pricePerDay || 0);

/**
 * Desarma la respuesta del backend, que según la ruta es un array (`/listings/me`,
 * `/favorites/me`) o viene paginada dentro de `data` (`/listings`).
 */
export function itemsOf(response) {
  if (Array.isArray(response)) return response;
  return response?.data ?? [];
}

/**
 * Filtro en el navegador. El backend ya filtra lo importante; esto se aplica
 * arriba para que la búsqueda por texto y los ajustes finos respondan sin
 * esperar otra vuelta al servidor.
 */
export function filterCars(cars, { text = "", category = "", transmission = "", fuel = "", minPrice, maxPrice, minSeats } = {}) {
  const needle = text.trim().toLowerCase();
  return cars.filter(car => {
    if (car.available === false) return false;
    if (needle) {
      const haystack = `${car.brand} ${car.model} ${car.year} ${car.location} ${car.title}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (category && car.category !== category) return false;
    if (transmission && car.transmissionCode !== transmission) return false;
    if (fuel && car.fuelCode !== fuel) return false;
    if (minPrice != null && priceOf(car) < Number(minPrice)) return false;
    if (maxPrice != null && priceOf(car) > Number(maxPrice)) return false;
    if (minSeats != null && Number(car.seats || 0) < Number(minSeats)) return false;
    return true;
  });
}

/** Orden de resultados, con los mismos criterios que ofrece el buscador. */
export function sortCars(cars, sort) {
  const sorted = [...cars];
  if (sort === "priceAsc") return sorted.sort((a, b) => priceOf(a) - priceOf(b));
  if (sort === "priceDesc") return sorted.sort((a, b) => priceOf(b) - priceOf(a));
  if (sort === "rating") return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return sorted;
}
