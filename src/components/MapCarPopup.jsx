// ============================================================================
//  MapCarPopup — La tarjetita que se abre al tocar un punto del mapa
// ----------------------------------------------------------------------------
//  QUÉ CAMBIÓ Y POR QUÉ: antes esto era una cadena de HTML que se le pasaba a
//  Leaflet como texto. Funcionaba para mostrar, pero no para tocar: el corazón
//  de favoritos no se podía poner —es un componente de React que necesita saber
//  quién entró y qué tiene guardado— y de las fotos del auto se veía una sola,
//  la primera. Para ir a la publicación había que dejar una función colgada en
//  `window`, porque desde una cadena de HTML no hay otra forma de llamar a nada.
//
//  Ahora es un componente de verdad. Leaflet sigue encargándose de dónde va el
//  globo —eso lo hace bien y sigue el mapa cuando se arrastra—, pero lo de
//  adentro lo dibuja React con un portal, así que hereda la sesión, los
//  favoritos y el idioma como cualquier otra pantalla.
//
//  Las fotos se pasan con las flechas, como en Airbnb: la mayoría de los autos
//  tiene varias y de una sola no se entiende si vale la pena entrar.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import { priceOf } from "../services/listings";
import { useI18n } from "../i18n/core";

const ALTO_FOTO = 132;

/** La flecha de pasar fotos. Dibujada, para que se vea igual en todos lados. */
const Flecha = ({ hacia }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={hacia === "izq" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
);

const botonFlecha = (lado) => ({
  position: "absolute", top: "50%", [lado]: 6, transform: "translateY(-50%)",
  width: 26, height: 26, minHeight: 26, borderRadius: "50%",
  border: "none", padding: 0, background: "rgba(255,255,255,.92)", color: "var(--fw-text-2)",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 1px 5px rgba(0,0,0,.25)", cursor: "pointer", zIndex: 3,
});

export default function MapCarPopup({ car, precio }) {
  const { t: tr } = useI18n();
  const navigate = useNavigate();
  // Arranca en la primera foto. Quien la monta le pone `key={car.id}`, así que
  // al abrir otro auto este componente se rehace entero y no hay nada que
  // reiniciar a mano.
  const [i, setI] = useState(0);

  const fotos = Array.isArray(car?.photos) ? car.photos.filter(Boolean) : [];
  const varias = fotos.length > 1;

  if (!car) return null;

  // Las flechas están ADENTRO de la tarjeta, que entera navega al auto: sin
  // cortar el clic, pasar una foto abriría la publicación.
  const pasar = (paso) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setI((n) => (n + paso + fotos.length) % fotos.length);
  };

  const abrir = () => navigate(`/cars/${car.id}`);

  return (
    <div
      onClick={abrir}
      style={{ width: 208, cursor: "pointer", fontFamily: "inherit" }}
    >
      <div style={{
        position: "relative", width: "100%", height: ALTO_FOTO,
        borderRadius: 10, overflow: "hidden", marginBottom: 10, background: "var(--fw-surface-3)",
      }}>
        {fotos.length > 0 ? (
          <img src={fotos[i]} alt={`${car.brand} ${car.model}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 30, color: "var(--fw-text-4)",
          }}>—</div>
        )}

        {/* El corazón se posiciona solo (top/right absolutos). */}
        <FavoriteButton listingId={car.id} size={28} />

        {varias && (
          <>
            <button type="button" onClick={pasar(-1)} style={botonFlecha("left")}
              aria-label={tr("car.prevPhoto")}><Flecha hacia="izq" /></button>
            <button type="button" onClick={pasar(1)} style={botonFlecha("right")}
              aria-label={tr("car.nextPhoto")}><Flecha hacia="der" /></button>
            {/* Los puntitos: dicen cuántas fotos hay sin ocupar lugar. */}
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 7,
              display: "flex", justifyContent: "center", gap: 4, zIndex: 3,
            }}>
              {fotos.slice(0, 6).map((_, n) => (
                <span key={n} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: n === i % 6 ? "var(--fw-surface)" : "rgba(255,255,255,.5)",
                  boxShadow: "0 1px 2px rgba(0,0,0,.4)",
                }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: "var(--fw-text)" }}>
        {car.brand} {car.model} {car.year}
      </div>
      <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginBottom: 4 }}>
        {car.location} <span style={{ color: "var(--fw-text-4)", fontSize: 10 }}>{tr("map.approxArea")}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fw-blue)" }}>
        {precio(priceOf(car))}
        <span style={{ fontWeight: 400, fontSize: 12, color: "var(--fw-text-3)" }}> {tr("common.perDay")}</span>
      </div>
      <div style={{
        marginTop: 8, padding: 7, background: "var(--fw-blue)", color: "#fff",
        borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 600,
      }}>{tr("car.bookNow")}</div>
    </div>
  );
}
