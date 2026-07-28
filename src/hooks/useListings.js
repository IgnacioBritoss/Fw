// ============================================================================
//  useListings — Carga de publicaciones para el inicio y el buscador
// ----------------------------------------------------------------------------
//  Un único lugar que resuelve las tres cosas que antes cada pantalla hacía a su
//  manera (y por eso los resultados no coincidían entre inicio y buscador):
//
//   1) Pide las publicaciones al backend CON los filtros aplicados del lado del
//      servidor (ubicación, precio, categoría, caja, combustible y fechas), así
//      el filtro de fechas descarta de verdad los autos ya reservados.
//   2) Los autos de ejemplo (mockData) SOLO aparecen si el backend no devolvió
//      ninguna publicación y tampoco hay filtros puestos: en cuanto hay autos
//      publicados, dejan de mezclarse.
//   3) Deja un estado claro de carga / error para que la pantalla lo muestre.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { getListings } from "../services/api";
import { itemsOf, normalizeListing } from "../services/listings";
import { mockCars } from "../data/mockData";

// ¿El usuario pidió algo en particular? Con filtros puestos, "no hay resultados"
// es la respuesta correcta: no corresponde rellenar con autos de ejemplo.
function hasActiveFilters(filters) {
  return Object.entries(filters).some(([key, value]) => {
    if (["page", "limit", "sort"].includes(key)) return false;
    return value !== undefined && value !== null && value !== "";
  });
}

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
      setTotal(response?.total ?? items.length);

      if (items.length > 0) {
        setCars(items.map(normalizeListing));
        setShowingMocks(false);
        return;
      }

      // Sin publicaciones: recién acá entran los autos de ejemplo.
      const useMocks = includeMocks && !hasActiveFilters(activeFilters);
      setCars(useMocks ? mockCars.map(normalizeListing) : []);
      setShowingMocks(useMocks);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los autos.");
      // El backend no respondió: se muestran los ejemplos para que la pantalla
      // no quede vacía, avisando que son datos de demostración.
      const useMocks = includeMocks && !hasActiveFilters(activeFilters);
      setCars(useMocks ? mockCars.map(normalizeListing) : []);
      setShowingMocks(useMocks);
    } finally {
      setLoading(false);
    }
  }, [filtersKey, includeMocks]);

  useEffect(() => { load(); }, [load]);

  return { cars, loading, error, showingMocks, total, reload: load };
}
