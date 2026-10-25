// ============================================================================
//  TarjetaDeAutoHome — Un auto en la grilla del inicio
// ----------------------------------------------------------------------------
//  POR QUÉ ESTO ES UN ARCHIVO Y NO UNA FUNCIÓN ADENTRO DE Home.
//
//  Estaba declarada adentro del cuerpo de Home, así que era una función NUEVA
//  en cada dibujado. Para React, una función nueva es un TIPO DE COMPONENTE
//  DISTINTO: no actualiza las tarjetas que ya estaban, las DESMONTA Y LAS
//  VUELVE A MONTAR, todas, con su DOM adentro.
//
//  El efecto se veía: cualquier cosa que cambiara en el inicio —mover el mouse
//  por el mapa, escribir en el buscador, que terminara de cargar algo— tiraba
//  abajo y rearmaba la grilla entera. Las <img> se destruían y se volvían a
//  crear, así que las fotos se volvían a pedir y la animación de entrada se
//  repetía desde cero.
//
//  Es el mismo error que tenía la lista de la búsqueda, arreglado igual: el
//  componente afuera y memoizado. Ver components/TarjetaDeBusqueda.jsx, que
//  cuenta la historia completa.
//
//  `onAbrir` entra por propiedad en vez de usar `navigate` acá adentro: tiene
//  que ser la MISMA función entre dibujados para que `memo` sirva, y de eso se
//  ocupa quien la pasa.
// ============================================================================
import { memo } from "react";
import FavoriteButton from "./FavoriteButton";
import { useI18n } from "../i18n/core";
import { useCurrency } from "../context/CurrencyContext";
import {
  categoryLabel, fuelLabel, priceOf, transmissionLabel,
} from "../services/listings";

/** La tarjeta en sí: la foto, el nombre del auto, la ficha corta y el precio. */
function Tarjeta({ car, onAbrir }) {
  const { t: tr } = useI18n();
  const { precio } = useCurrency();

  const st = {
    carCard: { background: "var(--fw-surface)", border: "1px solid var(--fw-line)", borderRadius: 6, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" },
    fichaFila: { display: "flex", border: "1px solid var(--fw-line)", borderRadius: 4, marginBottom: 14, overflow: "hidden" },
    fichaCelda: { flex: 1, fontSize: 11.5, color: "var(--fw-text-2)", padding: "7px 10px", textAlign: "center", borderLeft: "1px solid var(--fw-line)" },
    reservar: { background: "var(--fw-chip)", color: "#fff", border: "none", borderRadius: 4, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  };

  return (

    /*
      LA TARJETA ENTRA AL APARECER Y SE INCLINA HACIA EL MOUSE.

      `data-sc-in` la trae desde abajo la primera vez que se la ve, y nada más
      que la primera: una tarjeta que se vuelve a esconder al subir el scroll es
      un defecto y no un efecto.

      `data-sc-tilt="4"` son CUATRO grados y no ocho como en las tarjetas de los
      pasos. La diferencia es qué hay adentro: los pasos son un número grande y
      dos renglones, y esto es una FOTO con un precio abajo. Una foto inclinada
      ocho grados se lee torcida —el horizonte de la calle deja de estar
      horizontal—, y el precio, que es el dato que se viene a comparar entre una
      tarjeta y la otra, se pone más difícil de leer. Cuatro grados alcanzan para
      que la tarjeta responda al mouse sin que nada se lea peor.

      Los dos juntos no se pisan: se turnan. Ver anim/scrollcraft.js.
    */
    <div style={st.carCard} data-sc-in data-sc-tilt="4" onClick={() => onAbrir(car.id)}>
      {/*
        TODAS LAS FOTOS OCUPAN EXACTAMENTE LO MISMO.

        `aspect-ratio` estaba puesto desde antes, pero no alcanzaba: la foto iba
        DENTRO del flujo con `height: 100%`, y ese 100% no se puede resolver
        contra un alto que a su vez sale de la proporción —es circular—. El
        navegador lo trata como `auto`, dibuja la foto a su tamaño real y la caja
        crece para no cortarla. Con una foto vertical de 400x900, una tarjeta de
        338px de ancho terminaba con 765px de alto en vez de 232: tres veces más
        que la de al lado, y la grilla quedaba escalonada.

        Sacando la foto del flujo (`position: absolute`), la caja no tiene nada
        que la empuje y su alto sale solamente de la proporción. `overflow:
        hidden` recorta lo que sobra, y `object-fit: cover` decide qué parte se
        ve: se pierde un pedazo de las fotos muy verticales, que es lo correcto
        —mejor recortar una foto que romper la grilla entera—.
      */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", overflow: "hidden", background: "var(--fw-surface-3)" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fw-text-4)", fontSize: 13 }}>{tr("common.noPhoto")}</div>}
        {/* La categoría va PEGADA a la esquina de la foto, no flotando a 12px de
            los dos bordes con forma de píldora. Apoyada en la esquina se lee como
            parte de la foto; flotando parecía un globito encima. */}
        {car.category && (
          <div style={{ position: "absolute", top: 0, left: 0, background: "rgba(17,24,39,.9)", color: "#fff", padding: "5px 11px", borderBottomRightRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: ".02em" }}>{categoryLabel(tr, car.category)}</div>
        )}
        {/* Corazón: es un botón que corta el clic, así no abre la publicación. */}
        <FavoriteButton listingId={car.id} disabled={car.isMock} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fw-text)", marginBottom: 3 }}>{car.brand} {car.model} {car.year}</div>
        <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginBottom: 12 }}>
          {car.location && `${car.location} · `}
          {car.rating > 0 && `${car.rating} ★ · `}{transmissionLabel(tr, car.transmissionCode)}
        </div>
        {/* Ficha técnica: celdas de una misma barra, separadas por una línea. La
            primera no lleva línea a la izquierda, que si no queda doble contra el
            borde de la barra. */}
        {(car.fuelCode || car.seats) && (
          <div style={st.fichaFila}>
            {car.fuelCode && (
              <span style={{ ...st.fichaCelda, borderLeft: "none" }}>{fuelLabel(tr, car.fuelCode)}</span>
            )}
            {car.seats && (
              <span style={{ ...st.fichaCelda, ...(car.fuelCode ? {} : { borderLeft: "none" }) }}>
                {tr("common.seats", { count: car.seats })}
              </span>
            )}
          </div>
        )}
        <div style={{ borderTop: "1px solid var(--fw-line-soft)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)" }}>{precio(priceOf(car))}</span><span style={{ fontSize: 12, color: "var(--fw-text-4)" }}>{tr("common.perDay")}</span></div>
          <button style={st.reservar} onClick={(e) => { e.stopPropagation(); onAbrir(car.id); }}>{tr("home.book")}</button>
        </div>
      </div>
    </div>
  );
}

export default memo(Tarjeta);
