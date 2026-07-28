// ============================================================================
//  FavoritesContext — Los FAVORITOS del usuario, compartidos por toda la app
// ----------------------------------------------------------------------------
//  Mantiene en memoria el conjunto de ids de publicaciones marcadas con el
//  corazón y las funciones para marcar/desmarcar. Se guardan en el backend, así
//  que siguen estando al entrar desde otro dispositivo.
//
//  El estado se actualiza primero en pantalla y después se confirma con el
//  servidor (si el pedido falla, se vuelve atrás). Así el corazón responde al
//  toque sin esperar la respuesta.
// ============================================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { addFavorite, getMyFavoriteIds, removeFavorite } from "../services/api";

const FavoritesContext = createContext(null);

const EMPTY_IDS = new Set();

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const token = user?.accessToken || null;
  // Los favoritos se guardan junto con la sesión a la que pertenecen. Así, al
  // cerrar sesión o cambiar de usuario, dejan de mostrarse sin necesidad de un
  // efecto que los limpie.
  const [loaded, setLoaded] = useState({ token: null, ids: EMPTY_IDS });
  const [loading, setLoading] = useState(false);
  const ids = loaded.token === token ? loaded.ids : EMPTY_IDS;

  // Al iniciar sesión trae los favoritos del usuario.
  useEffect(() => {
    if (!token) return undefined;
    let active = true;

    getMyFavoriteIds()
      .then(list => {
        if (active) setLoaded({ token, ids: new Set(Array.isArray(list) ? list : []) });
      })
      .catch(() => { /* sin favoritos disponibles: se sigue con el set vacío */ })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [token]);

  const isFavorite = useCallback((listingId) => ids.has(listingId), [ids]);

  /**
   * Marca o desmarca un auto. Devuelve el estado nuevo, o null si no se pudo
   * (por ejemplo, sin sesión iniciada).
   */
  const toggleFavorite = useCallback(async (listingId) => {
    if (!token || !listingId) return null;

    const wasFavorite = ids.has(listingId);
    const apply = (add) => setLoaded(prev => {
      const next = new Set(prev.token === token ? prev.ids : EMPTY_IDS);
      if (add) next.add(listingId); else next.delete(listingId);
      return { token, ids: next };
    });

    apply(!wasFavorite);

    try {
      if (wasFavorite) await removeFavorite(listingId);
      else await addFavorite(listingId);
      return !wasFavorite;
    } catch {
      // Falló el guardado: se deja el corazón como estaba.
      apply(wasFavorite);
      return null;
    }
  }, [ids, token]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds: ids, isFavorite, toggleFavorite, loading, count: ids.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Hook de atajo. Devuelve valores neutros si se usa fuera del provider, para que
// un componente aislado no rompa la pantalla.
export const useFavorites = () => useContext(FavoritesContext) || {
  favoriteIds: new Set(), isFavorite: () => false, toggleFavorite: async () => null, loading: false, count: 0,
};
