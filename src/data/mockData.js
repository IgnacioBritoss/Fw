export const mockCars = [
  {
    id: "1",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    category: "Sedan",
    price_per_day: 8500,
    location: "Palermo, CABA",
    description: "Auto en excelente estado, muy económico. Nunca tuve incidentes.",
    photos: [],
    seats: 5,
    transmission: "Automático",
    fuel: "Nafta",
    owner_id: "2",
    owner_name: "Roberto O.",
    rating: 4.8,
    reviews_count: 12,
    is_verified: true,
    approved: true,
    available: true,
  },
  {
    id: "2",
    brand: "Volkswagen",
    model: "T-Cross",
    year: 2022,
    category: "SUV",
    price_per_day: 12000,
    location: "Belgrano, CABA",
    description: "SUV familiar, espacioso y cómodo para viajes largos. Acepta mascotas.",
    photos: [],
    seats: 5,
    transmission: "Automático",
    fuel: "Nafta",
    owner_id: "2",
    owner_name: "Roberto O.",
    rating: 4.6,
    reviews_count: 7,
    is_verified: true,
    approved: true,
    available: true,
  },
  {
    id: "3",
    brand: "Fiat",
    model: "Cronos",
    year: 2020,
    category: "Sedan",
    price_per_day: 6000,
    location: "San Isidro, GBA Norte",
    description: "Económico y fácil de estacionar. Ideal para la ciudad.",
    photos: [],
    seats: 5,
    transmission: "Manual",
    fuel: "Nafta",
    owner_id: "3",
    owner_name: "Carmen V.",
    rating: 4.3,
    reviews_count: 5,
    is_verified: true,
    approved: true,
    available: true,
  },
];

export const mockReviews = {
  "1": [
    { id: "r1", author: "Martina G.", rating: 5, comment: "Excelente auto, llegó limpio y puntual. Lo recomiendo.", date: "2024-03-10" },
    { id: "r2", author: "Lucas P.", rating: 5, comment: "Sin problemas, muy cómodo para el viaje a Córdoba.", date: "2024-02-20" },
  ],
  "2": [
    { id: "r3", author: "Ana S.", rating: 4, comment: "Muy bueno, espacioso. Tardó un poco en responder.", date: "2024-03-05" },
  ],
  "3": [],
};

export const mockOwners = {
  "2": { name: "Roberto O.", rating: 4.9, rentals: 19, verified: true, since: "2023" },
  "3": { name: "Carmen V.", rating: 4.5, rentals: 5, verified: true, since: "2024" },
};

export const initMockCars = () => {
  const existing = localStorage.getItem("fw_all_cars");
  if (!existing) {
    localStorage.setItem("fw_all_cars", JSON.stringify(mockCars));
  }
};

export const mockMessages = [
  { id: "msg1", from: "2", to: "current_user", text: "Hola! El auto estará listo a las 10am.", time: "10:32" },
  { id: "msg2", from: "current_user", to: "2", text: "Perfecto, ahí estaré. ¿Traigo algo en particular?", time: "10:35" },
  { id: "msg3", from: "2", to: "current_user", text: "No, solo el DNI y la licencia. ¡Nos vemos!", time: "10:36" },
];