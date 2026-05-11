export const mockCars = [
  {
    id: "1",
    brand: "Toyota", model: "Corolla", year: 2021,
    category: "Sedan", price_per_day: 8500,
    location: "Palermo, CABA", lat: -34.5885, lng: -58.4315,
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
    id: "2",
    brand: "Volkswagen", model: "T-Cross", year: 2022,
    category: "SUV", price_per_day: 12000,
    location: "Belgrano, CABA", lat: -34.5621, lng: -58.4567,
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
    id: "3",
    brand: "Fiat", model: "500", year: 2020,
    category: "Sedan", price_per_day: 6000,
    location: "San Isidro, GBA Norte", lat: -34.4731, lng: -58.5270,
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
  {
    id: "4",
    brand: "Ford", model: "Ranger", year: 2023,
    category: "Pickup", price_per_day: 18000,
    location: "Tigre, GBA Norte", lat: -34.4260, lng: -58.5796,
    description: "Pickup 4x4 ideal para aventuras o trabajo. Gran capacidad de carga. Apta para caminos de tierra.",
    photos: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 5, transmission: "Automático", fuel: "Diesel",
    owner_id: "3", owner_name: "Carmen V.", rating: 4.9,
    reviews_count: 3, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 0, puertas: 4, potencia_cv: 213, consumo_mixto: "9.2 l/100km", traccion: "4x4", largo_mm: 5359, ancho_mm: 1860, peso_kg: 2030, bluetooth: "Sí", camara_reversa: "Sí", sensor_estacionamiento: "Traseros" },
  },
  {
    id: "5",
    brand: "Tesla", model: "Model 3", year: 2023,
    category: "Eléctrico", price_per_day: 22000,
    location: "Puerto Madero, CABA", lat: -34.6131, lng: -58.3631,
    description: "Eléctrico de última generación. Autopilot, pantalla táctil y carga rápida incluida. Experiencia única.",
    photos: [
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 5, transmission: "Automático", fuel: "Eléctrico",
    owner_id: "2", owner_name: "Roberto O.", rating: 5.0,
    reviews_count: 4, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 682, puertas: 4, potencia_cv: 351, consumo_mixto: "14.9 kWh/100km", traccion: "Trasera", largo_mm: 4694, ancho_mm: 1850, peso_kg: 1830, bluetooth: "Sí", camara_reversa: "Sí", sensor_estacionamiento: "360°" },
  },
  {
    id: "6",
    brand: "Chevrolet", model: "Tracker", year: 2022,
    category: "SUV", price_per_day: 10500,
    location: "Caballito, CABA", lat: -34.6194, lng: -58.4523,
    description: "SUV compacta ideal para la ciudad. Excelente consumo, cómodo para 5 personas con equipaje.",
    photos: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop&q=60",
    ],
    seats: 5, transmission: "Automático", fuel: "Nafta",
    owner_id: "3", owner_name: "Carmen V.", rating: 4.5,
    reviews_count: 9, is_verified: true, approved: true, available: true,
    specs: { baul_litros: 393, puertas: 5, potencia_cv: 133, consumo_mixto: "7.1 l/100km", traccion: "Delantera", largo_mm: 4270, ancho_mm: 1780, peso_kg: 1355, bluetooth: "Sí", camara_reversa: "Sí", sensor_estacionamiento: "Traseros" },
  },
];

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
  "4": [
    { id: "r7", author: "Pablo T.", rating: 5, comment: "Increíble para el campo, una bestia.", date: "2024-04-01" },
  ],
  "5": [
    { id: "r8", author: "Valentina R.", rating: 5, comment: "Experiencia increíble, el autopilot es una locura.", date: "2024-04-10" },
    { id: "r9", author: "Facundo L.", rating: 5, comment: "El mejor auto que alquilé en mi vida.", date: "2024-03-22" },
  ],
  "6": [
    { id: "r10", author: "Lucía M.", rating: 4, comment: "Muy cómoda para la ciudad, perfecta para el fin de semana.", date: "2024-03-15" },
  ],
};

export const mockOwners = {
  "2": { name: "Roberto O.", rating: 4.9, rentals: 19, verified: true, since: "2023" },
  "3": { name: "Carmen V.", rating: 4.5, rentals: 8, verified: true, since: "2024" },
};

export const mockMessages = [
  { id: "msg1", from: "2", to: "current_user", text: "Hola! El auto estará listo a las 10am.", time: "10:32" },
  { id: "msg2", from: "current_user", to: "2", text: "Perfecto, ahí estaré. ¿Traigo algo en particular?", time: "10:35" },
  { id: "msg3", from: "2", to: "current_user", text: "No, solo el DNI y la licencia. Nos vemos!", time: "10:36" },
];

export const initMockCars = () => {
  localStorage.setItem("fw_all_cars", JSON.stringify(mockCars));
};