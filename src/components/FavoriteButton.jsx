// ============================================================================
//  FavoriteButton — El CORAZÓN para guardar un auto en favoritos
// ----------------------------------------------------------------------------
//  Antes el corazón era un simple ícono dibujado adentro de la tarjeta: al
//  tocarlo, el clic "atravesaba" el ícono y llegaba a la tarjeta, que abría la
//  publicación. Por eso no se podía marcar nada.
//
//  Acá es un <button> de verdad que corta la propagación del clic
//  (stopPropagation + preventDefault), así el toque queda en el corazón y no
//  navega. Sin sesión iniciada, manda al login.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useI18n } from "../i18n/core";

/**
 * En pantalla táctil el corazón mide 40 y no 30.
 *
 * POR QUÉ: hay una regla en theme.css que le pone `min-height: 40px` a TODOS los
 * botones en celular, para que se puedan tocar con el dedo. Con 30 de ancho y ese
 * mínimo de alto, este botón quedaba de 30×40: un óvalo. Se veía deformado.
 *
 * La salida no es esquivar la regla —30px es chico de verdad para un dedo— sino
 * cumplirla en las dos medidas: un círculo de 40, que es el tamaño de toque que
 * recomiendan Apple y Google.
 */
const LADO_TACTIL = 40;

/**
 * `side` dice de qué lado se ubica el corazón. En el detalle del auto va a la
 * IZQUIERDA porque arriba a la derecha está el contador de fotos del carrusel
 * ("2 / 4") y los dos se pisaban. En las tarjetas del listado no hay contador,
 * así que sigue arriba a la derecha.
 */
export default function FavoriteButton({ listingId, size = 30, disabled = false, side = "right" }) {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();
  const lado = isMobile ? Math.max(size, LADO_TACTIL) : size;
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  const active = isFavorite(listingId);

  const handleClick = async (event) => {
    // Clave: el clic muere acá y no llega a la tarjeta que envuelve al corazón.
    event.stopPropagation();
    event.preventDefault();
    if (disabled || busy) return;
    if (!user) { navigate("/login"); return; }
    setBusy(true);
    await toggleFavorite(listingId);
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={tr(active ? "fav.remove" : "fav.add")}
      aria-pressed={active}
      title={disabled ? tr("fav.mockOnly") : tr(active ? "fav.remove" : "fav.add")}
      style={{
        position: "absolute", top: 12, ...(side === "left" ? { left: 12 } : { right: 12 }),
        width: lado, height: lado,
        // `minHeight` va acá adentro a propósito: un estilo en línea le gana a la
        // regla de theme.css, así el botón no puede volver a estirarse solo.
        minHeight: lado,
        borderRadius: "50%", background: "var(--fw-surface)", border: "none", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hover ? "0 3px 10px rgba(0,0,0,.20)" : "0 1px 4px rgba(0,0,0,.12)",
        cursor: disabled ? "not-allowed" : "pointer", opacity: busy || disabled ? 0.65 : 1,
        transform: hover && !disabled ? "scale(1.08)" : "scale(1)",
        transition: "transform .15s ease, box-shadow .15s ease",
        zIndex: 2,
      }}
    >
      <svg width={lado * 0.55} height={lado * 0.55} viewBox="0 0 24 24"
        fill={active ? "#dc2626" : "none"} stroke={active ? "#dc2626" : "#6b7280"} strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
