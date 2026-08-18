// ============================================================================
//  Favorites — Los autos que el usuario guardó con el corazón
// ----------------------------------------------------------------------------
//  El menú lateral ya tenía el link "Favoritos", pero la pantalla no existía: al
//  entrar quedaba en blanco. Esta es la pantalla que faltaba.
//
//  Lee los favoritos del backend (GET /favorites/me), así que son los mismos
//  desde cualquier dispositivo, y desde acá se pueden quitar tocando el corazón.
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getMyFavorites } from "../../services/api";
<<<<<<< HEAD
import { itemsOf, normalizeListing, priceOf } from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";

export default function Favorites() {
=======
import { itemsOf, normalizeListing, priceOf, categoryLabel, transmissionLabel } from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";

export default function Favorites() {
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favoriteIds } = useFavorites();
  const { isMobile } = useIsMobile();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trae los favoritos al abrir la pantalla. `active` evita actualizar el estado
  // si el usuario se fue a otra pantalla antes de que llegue la respuesta.
  useEffect(() => {
    let active = true;
    getMyFavorites()
      .then(data => { if (active) setCars(itemsOf(data).map(normalizeListing)); })
<<<<<<< HEAD
      .catch(err => { if (active) setError(err.message || "No pudimos cargar tus favoritos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
=======
      .catch(err => { if (active) setError(err.message || tr("favorites.loadFailed")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tr]);
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

  // Al quitar un favorito desde el corazón, el auto sale de la lista sin
  // necesidad de recargar la pantalla.
  const visible = cars.filter(car => favoriteIds.has(car.id));

  const t = {
    page: { padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1320, margin: "0 auto" },
    title: { fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
    sub: { color: "#6b7280", fontSize: 14, marginTop: 4, marginBottom: 28 },
    card: { background: "#fff", border: "1px solid #ececec", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" },
    tag: { fontSize: 11, color: "#6b7280", border: "1px solid #ececec", borderRadius: 20, padding: "3px 10px" },
    btn: { padding: "11px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
    empty: { textAlign: "center", padding: "60px 20px", color: "#9ca3af" },
  };

  if (!user) {
    return (
      <div style={t.page}>
<<<<<<< HEAD
        <div style={t.title}>Favoritos</div>
        <div style={t.empty}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Iniciá sesión para guardar tus autos favoritos.</div>
          <button style={t.btn} onClick={() => navigate("/login")}>Iniciar sesión</button>
=======
        <div style={t.title}>{tr("favorites.title")}</div>
        <div style={t.empty}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>{tr("favorites.needLogin")}</div>
          <button style={t.btn} onClick={() => navigate("/login")}>{tr("auth.loginBtn")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      </div>
    );
  }

  return (
    <div style={t.page}>
<<<<<<< HEAD
      <div style={t.title}>Favoritos</div>
      <div style={t.sub}>
        {loading ? "Cargando tus favoritos..." : `${visible.length} auto${visible.length !== 1 ? "s" : ""} guardado${visible.length !== 1 ? "s" : ""}`}
=======
      <div style={t.title}>{tr("favorites.title")}</div>
      <div style={t.sub}>
        {loading ? tr("favorites.loading") : tr(visible.length === 1 ? "favorites.countOne" : "favorites.countMany", { count: visible.length })}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#b91c1c", marginBottom: 20 }}>{error}</div>
      )}

      {loading ? (
<<<<<<< HEAD
        <div style={t.empty}>Cargando...</div>
      ) : visible.length === 0 ? (
        <div style={t.empty}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block" }}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" stroke="#d1d5db" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Todavía no guardaste ningún auto</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Tocá el corazón de cualquier auto para tenerlo a mano acá.</div>
          <button style={t.btn} onClick={() => navigate("/buscar")}>Buscar autos</button>
=======
        <Spinner block label={tr("common.loading")} />
      ) : visible.length === 0 ? (
        <div style={t.empty}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block" }}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" stroke="#d1d5db" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{tr("favorites.empty")}</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>{tr("favorites.emptyHint")}</div>
          <button style={t.btn} onClick={() => navigate("/buscar")}>{tr("favorites.explore")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(250px,1fr))", gap: 16 }}>
          {visible.map(car => (
            <div key={car.id} style={t.card} onClick={() => navigate(`/cars/${car.id}`)}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", background: "#e5e7eb" }}>
                {car.photos?.length > 0
                  ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<<<<<<< HEAD
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>}
=======
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>{tr("common.noPhoto")}</div>}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                <FavoriteButton listingId={car.id} />
                {car.status !== "ACTIVE" && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(17,24,39,.82)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 10px", textAlign: "center" }}>
                    No disponible por ahora
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{car.brand} {car.model} {car.year}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{car.location}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
<<<<<<< HEAD
                  {car.categoryLabel && <span style={t.tag}>{car.categoryLabel}</span>}
                  {car.transmission && <span style={t.tag}>{car.transmission}</span>}
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${priceOf(car).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>/día</span></div>
                  <button style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>Ver auto</button>
=======
                  {car.category && <span style={t.tag}>{categoryLabel(tr, car.category)}</span>}
                  {car.transmissionCode && <span style={t.tag}>{transmissionLabel(tr, car.transmissionCode)}</span>}
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>${priceOf(car).toLocaleString()}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{tr("common.perDay")}</span></div>
                  <button style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>{tr("favorites.viewCar")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
