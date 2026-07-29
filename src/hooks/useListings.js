// ============================================================================
//  useListings — Carga de publicaciones para el inicio y el buscador
// ----------------------------------------------------------------------------
//  Un único lugar que resuelve las tres cosas que antes cada pantalla hacía a su
//  manera (y por eso los resultados no coincidían entre inicio y buscador):
//
//   1) Pide las publicaciones al backend CON los filtros que solo el servidor
//      puede resolver (ubicación, precio y, sobre todo, las fechas: hay que
//      mirar las reservas y los bloqueos para saber qué auto está libre).
//   2) Los autos de ejemplo (mockData) SOLO aparecen si el backend no tiene
//      ninguna publicación o si no responde. En ese caso se devuelven TODOS y la
//      pantalla les aplica los filtros por su cuenta: antes, con un filtro
//      puesto, se ocultaban y la pantalla quedaba en "0 autos disponibles".
//   3) Deja un estado claro de carga / error para que la pantalla lo muestre.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { getListings } from "../services/api";
import { itemsOf, normalizeListing } from "../services/listings";
import { mockCars } from "../data/mockData";

// ¿El usuario pidió algo en particular? Sirve para distinguir "no hay autos que
// cumplan el filtro" de "no hay autos publicados".
function hasActiveFilters(filters) {
  return Object.entries(filters).some(([key, value]) => {
    if (["page", "limit", "sort"].includes(key)) return false;
    return value !== undefined && value !== null && value !== "";
  });
}

const MOCK_CARS = mockCars.map(normalizeListing);

export function useListings(filters = {}, { includeMocks = true } = {}) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showingMocks, setShowingMocks] = useState(false);
  const [total, setTotal] = useState(0);

  // Se serializan los filtros para que el efecto se vuelva a disparar cuando
  // cambian de contenido, y no en cada render por ser un objeto nuevo.
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const activeFilters = JSON.parse(filtersKey);
    try {
      const response = await getListings(activeFilters);
      const items = itemsOf(response);

      if (items.length > 0) {
        setCars(items.map(normalizeListing));
        setTotal(response?.total ?? items.length);
        setShowingMocks(false);
        return;
      }

      // Cero resultados. Hay que distinguir dos situaciones bien distintas:
      //   · la base TIENE autos pero ninguno cumple el filtro → "sin resultados"
      //   · la base está VACÍA → recién ahí tienen sentido los de ejemplo
      let databaseIsEmpty = true;
      if (hasActiveFilters(activeFilters)) {
        const probe = await getListings({ limit: 1 }).catch(() => null);
        databaseIsEmpty = itemsOf(probe).length === 0;
      }

      if (databaseIsEmpty && includeMocks) {
        setCars(MOCK_CARS);
        setTotal(MOCK_CARS.length);
        setShowingMocks(true);
      } else {
        setCars([]);
        setTotal(0);
        setShowingMocks(false);
      }
    } catch (err) {
      setError(err.message || "No se pudieron cargar los autos.");
      // El backend no respondió: se muestran los ejemplos para que la pantalla
      // no quede vacía, avisando que son datos de demostración.
      setCars(includeMocks ? MOCK_CARS : []);
      setTotal(includeMocks ? MOCK_CARS.length : 0);
      setShowingMocks(includeMocks);
    } finally {
      setLoading(false);
    }
  }, [filtersKey, includeMocks]);

  useEffect(() => { load(); }, [load]);

  return { cars, loading, error, showingMocks, total, reload: load };
}
