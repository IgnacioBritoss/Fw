// ============================================================================
//  useListings — Carga de publicaciones para el inicio y el buscador
// ----------------------------------------------------------------------------
//  Un único lugar que resuelve las tres cosas que antes cada pantalla hacía a su
//  manera (y por eso los resultados no coincidían entre inicio y buscador):
//
//   1) Pide las publicaciones al backend CON los filtros que solo el servidor
//      puede resolver (ubicación, precio y, sobre todo, las fechas: hay que
//      mirar las reservas y los bloqueos para saber qué auto está libre).
//   2) Los autos de ejemplo (mockData) SOLO aparecen si se confirmó que el
//      backend no tiene NINGUNA publicación. En ese caso se devuelven todos y la
//      pantalla les aplica los filtros por su cuenta: antes, con un filtro
//      puesto, se ocultaban y la pantalla quedaba en "0 autos disponibles".
//   3) Deja un estado claro de carga / error para que la pantalla lo muestre.
//
//  MOCKS Y ERRORES — por qué ya no se mezclan
//  Antes, si el pedido al backend fallaba, se mostraban los autos de ejemplo.
//  Eso era muy confuso: alguien que ya había publicado autos veía en el inicio
//  tres autos que no eran suyos (y con las fotos cortadas, porque son imágenes
//  externas). Ahora un error es un error: se avisa y no se inventan autos. Los de
//  ejemplo quedan solo para la app recién estrenada, con la base realmente vacía.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/core";
import { getListings } from "../services/api";
import { itemsOf, normalizeListing } from "../services/listings";
import { mockCars } from "../data/mockData";

const MOCK_CARS = mockCars.map(normalizeListing);

export function useListings(filters = {}, { includeMocks = true } = {}) {
  const { t: tr } = useI18n();
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
      //
      // Se consulta siempre, sin importar si había filtros puestos: es la única
      // forma de estar seguros, y es un pedido chico (un solo registro).
      const probe = await getListings({ limit: 1 });
      const databaseIsEmpty = itemsOf(probe).length === 0;

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
      // El backend no respondió. Se avisa y NO se muestran autos de ejemplo:
      // inventar autos cuando el servidor falla hace pensar que la app perdió
      // las publicaciones propias.
      setError(err.message || tr("home.errCars"));
      setCars([]);
      setTotal(0);
      setShowingMocks(false);
    } finally {
      setLoading(false);
    }
  }, [filtersKey, includeMocks, tr]);

  useEffect(() => { load(); }, [load]);

  return { cars, loading, error, showingMocks, total, reload: load };
}
