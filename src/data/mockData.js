// ============================================================================
//  mockData.js — Datos de PRUEBA (autos, reseñas, dueños y mensajes de ejemplo)
// ----------------------------------------------------------------------------
//  Estos datos "de mentira" sirven para que la app tenga contenido de ejemplo
//  cuando el backend todavía no tiene ningún auto publicado (para la demo y el
//  desarrollo). En cuanto hay publicaciones reales, dejan de mostrarse.
//
//  Las pantallas los importan directamente desde acá (ver hooks/useListings.js).
//  Antes también se guardaba una copia en el navegador que se mezclaba con los
//  autos reales: por eso aparecían autos duplicados o que ya no existían.
// ============================================================================

// Lista de autos de ejemplo con todos sus datos y especificaciones técnicas.
// `isMock: true` los marca como datos de ejemplo: las pantallas solo los muestran
// cuando el backend todavía no tiene ninguna publicación, y no se pueden reservar.
export const mockCars = [
  {
    id: "1", isMock: true,
    brand: "Toyota", model: "Corolla", year: 2021,
    category: "Sedan", price_per_day: 8500,
    location: "Palermo, CABA", lat: -34.5885, lng: -58.4315,
    // Hasta dónde el dueño lo acerca. Los tres autos de ejemplo tienen valores
    // distintos —y uno no ofrece entrega— para que en el mapa se vea la
    // diferencia: con todos en cero, los círculos salían todos iguales y
    // parecía que la función estaba rota.
    deliveryRadiusKm: 5,
    description: "Auto en excelente estado, muy económico. Nunca tuve incidentes. Ideal para viajes largos o uso diario en la ciudad.",
    photos: [
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1621968175389-f1a0c0692cdc?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1638618164682-12b986ec2a75?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 5, transmission: "Automático", fuel: "Nafta",
    owner_id: "2", owner_name: "Roberto O.", rating: 4.8,
    reviews_count: 12, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 371, puertas: 4, potencia_cv: 122, consumo_mixto: "6.8 l/100km", traccion: "Delantera", largo_mm: 4630, ancho_mm: 1780, peso_kg: 1365, bluetooth: "Sí", camara_reversa: "Sí", sensor_estacionamiento: "Traseros" },
  },
  {
    id: "2", isMock: true,
    brand: "Volkswagen", model: "T-Cross", year: 2022,
    category: "SUV", price_per_day: 12000,
    location: "Belgrano, CABA", lat: -34.5621, lng: -58.4567,
    deliveryRadiusKm: 12,
    description: "SUV familiar, espacioso y cómodo para viajes largos. Acepta mascotas. Equipado con GPS y cámara de reversa.",
    photos: [
      "https://images.unsplash.com/photo-1655286203099-916c6f36da48?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1655286524678-05cfbb2cff18?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1758228664396-9010f6657f41?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 5, transmission: "Automático", fuel: "Nafta",
    owner_id: "2", owner_name: "Roberto O.", rating: 4.6,
    reviews_count: 7, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 373, puertas: 5, potencia_cv: 116, consumo_mixto: "6.5 l/100km", traccion: "Delantera", largo_mm: 4198, ancho_mm: 1760, peso_kg: 1280, bluetooth: "Sí", camara_reversa: "Sí", sensor_estacionamiento: "Delanteros y traseros" },
  },
  {
    id: "3", isMock: true,
    brand: "Fiat", model: "500", year: 2020,
    category: "Sedan", price_per_day: 6000,
    location: "San Isidro, GBA Norte", lat: -34.4731, lng: -58.5270,
    // Este NO ofrece entrega: se retira en el punto y listo.
    deliveryRadiusKm: 0,
    description: "Clásico y estilizado, perfecto para moverse por la ciudad. Económico y muy fácil de estacionar.",
    photos: [
      "https://images.unsplash.com/photo-1536667842290-7602f6a43a2b?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1604410869154-3c16714cd476?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1536196000545-2293bf37f22f?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 4, transmission: "Manual", fuel: "Nafta",
    owner_id: "3", owner_name: "Carmen V.", rating: 4.3,
    reviews_count: 5, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 185, puertas: 3, potencia_cv: 69, consumo_mixto: "5.9 l/100km", traccion: "Delantera", largo_mm: 3546, ancho_mm: 1627, peso_kg: 1035, bluetooth: "Sí", camara_reversa: "No", sensor_estacionamiento: "Traseros" },
  },
];

// Reseñas de ejemplo, agrupadas por id de auto.
export const mockReviews = {
  "1": [
    { id: "r1", author: "Martina G.", rating: 5, comment: "Excelente auto, llegó limpio y puntual. Lo recomiendo.", date: "2024-03-10" },
    { id: "r2", author: "Lucas P.", rating: 5, comment: "Sin problemas, muy cómodo para el viaje a Córdoba.", date: "2024-02-20" },
    { id: "r3", author: "Sofía M.", rating: 4, comment: "Muy bueno, cómodo y económico. El dueño muy atento.", date: "2024-01-15" },
  ],
  "2": [
    { id: "r4", author: "Ana S.", rating: 4, comment: "Muy bueno, espacioso. Tardó un poco en responder.", date: "2024-03-05" },
    { id: "r5", author: "Diego R.", rating: 5, comment: "Perfecto para el viaje familiar. Amplio y confortable.", date: "2024-02-10" },
  ],
  "3": [
    { id: "r6", author: "Carlos M.", rating: 4, comment: "Buen auto para la ciudad, muy económico.", date: "2024-03-01" },
  ],
};

// Datos de ejemplo de los dueños, indexados por id de dueño.
export const mockOwners = {
  "2": { name: "Roberto O.", rating: 4.9, rentals: 19, verified: true, since: "2023" },
  "3": { name: "Carmen V.", rating: 4.5, rentals: 8, verified: true, since: "2024" },
};

// Mensajes de ejemplo para mostrar una conversación en el chat.
export const mockMessages = [
  { id: "msg1", from: "2", to: "current_user", text: "Hola! El auto estará listo a las 10am.", time: "10:32" },
  { id: "msg2", from: "current_user", to: "2", text: "Perfecto, ahí estaré. ¿Traigo algo en particular?", time: "10:35" },
  { id: "msg3", from: "2", to: "current_user", text: "No, solo el DNI y la licencia. Nos vemos!", time: "10:36" },
];

// Se conserva por compatibilidad con las pantallas que la llamaban al arrancar.
// Ya no guarda nada: los autos de ejemplo se leen directamente de este archivo,
// sin copias en el navegador que se desincronicen con el backend.
export const initMockCars = () => {};