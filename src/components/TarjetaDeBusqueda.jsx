// ============================================================================
//  TarjetaDeBusqueda — Un auto en la lista de resultados
// ----------------------------------------------------------------------------
//  ── POR QUÉ ESTO ES UN ARCHIVO APARTE Y NO UNA FUNCIÓN ADENTRO DE Search ──
//
//  EL ERROR QUE ESTO ARREGLA, Y ERA GRAVE. Esta tarjeta estaba declarada
//  ADENTRO del cuerpo de Search:
//
//      export default function Search() {
//        ...
//        const Card = ({ car }) => ( ... );        // ← acá
//        return ... filtered.map(car => <Card ... />)
//      }
//
//  Eso crea una función NUEVA en cada dibujado de Search. Para React, una
//  función nueva es un TIPO DE COMPONENTE DISTINTO, así que no actualiza las
//  tarjetas que ya estaban: las DESMONTA Y LAS VUELVE A MONTAR, todas, con todo
//  su DOM adentro.
//
//  En la pantalla se veía exactamente como lo describió quien lo encontró: al
//  pasar el mouse por un auto —o al tocar un punto del mapa— se "recargaban"
//  todos. No era una sensación: las etiquetas <img> se destruían y se volvían a
//  crear, así que las fotos se volvían a pedir y a decodificar, la animación de
//  entrada se repetía desde cero, y cualquier estado interno de la tarjeta se
//  perdía. Con veinte autos en pantalla, mover el mouse de una tarjeta a la de
//  al lado tiraba abajo y rearmaba cuarenta tarjetas.
//
//  Y es justo lo contrario de para lo que se usa React: el trabajo de React es
//  tocar lo mínimo que cambió. Declarando el componente afuera, el tipo es
//  siempre el mismo y React compara y actualiza en vez de rehacer.
//
//  ── Y ADEMÁS VA MEMOIZADA ────────────────────────────────────────────────
//  Con el tipo estable, React ya no rehace el DOM, pero igual volvería a
//  EJECUTAR las veinte tarjetas en cada movimiento del mouse para comparar. Con
//  `memo`, una tarjeta cuyas props no cambiaron ni siquiera se ejecuta: al
//  pasar de un auto al de al lado se dibujan DOS —el que se apaga y el que se
//  prende— y las otras dieciocho no hacen nada.
//
//  Para que eso funcione, las funciones que recibe tienen que ser las MISMAS
//  entre dibujados (useCallback del lado de Search) y `activo` tiene que ser un
//  booleano de ESTA tarjeta, no el id resaltado de la lista entera. Si acá
//  llegara `hovered`, las veinte volverían a ejecutarse en cada movimiento y la
//  memoización no serviría de nada.
// ============================================================================
import { memo } from "react";
import FavoriteButton from "./FavoriteButton";
import { useI18n } from "../i18n/core";
import { useCurrency } from "../context/CurrencyContext";
import {
  categoryLabel, fuelLabel, priceOf, transmissionLabel,
} from "../services/listings";

function Tarjeta({ car, activo, isMobile, onEntrar, onSalir, onAbrir }) {
  const { t: tr } = useI18n();
  const { precio } = useCurrency();

  const st = {
    card: {
      display: "flex", flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 12 : 16, background: "var(--fw-surface)",
      border: "1px solid var(--fw-line)", borderRadius: 16,
      padding: isMobile ? 12 : 14, cursor: "pointer",
      transition: "box-shadow .2s, transform .2s, border-color .2s",
    },
    ph: {
      width: isMobile ? "100%" : 150, height: isMobile ? 170 : 118,
      borderRadius: 12, background: "var(--fw-surface-3)", flexShrink: 0,
      overflow: "hidden", position: "relative",
    },
    /*
      LA FICHA TÉCNICA — la misma que la tarjeta del inicio.

      Caja, combustible y asientos eran tres píldoras sueltas, cada una con su
      borde. La tarjeta del inicio ya lo resolvió de otra manera: una sola barra
      con las celdas separadas por una línea, que se lee como una ficha y no
      como tres etiquetas decorativas. Es el mismo dato en las dos pantallas, así
      que no hay motivo para que se vea distinto en cada una.

      La primera celda no lleva línea a la izquierda: quedaría doble contra el
      borde de la barra.
    */
    fichaFila: {
      display: "flex", border: "1px solid var(--fw-line)", borderRadius: 4,
      marginTop: 10, overflow: "hidden",
    },
    fichaCelda: {
      flex: 1, fontSize: 11.5, color: "var(--fw-text-2)", padding: "7px 10px",
      textAlign: "center", borderLeft: "1px solid var(--fw-line)",
    },
    // La categoría del auto. Antes esto se llamaba "verif" y era verde, así que
    // "Sedan" parecía un sello de verificación.
    categoria: {
      fontSize: 11, fontWeight: 700, color: "var(--fw-text-2)",
      background: "var(--fw-bg)", border: "1px solid var(--fw-border)",
      borderRadius: 6, padding: "3px 9px", letterSpacing: ".02em",
    },
    detail: {
      background: "var(--fw-chip)", color: "#fff", border: "none",
      borderRadius: 22, padding: "9px 18px", fontSize: 13, fontWeight: 700,
      cursor: "pointer", whiteSpace: "nowrap",
    },
  };

  const celdas = [
    car.transmissionCode && transmissionLabel(tr, car.transmissionCode),
    car.fuelCode && fuelLabel(tr, car.fuelCode),
    car.seats && tr("common.seats", { count: car.seats }),
  ].filter(Boolean);

  return (
    /*
      `data-sc-in`: la tarjeta entra desde abajo la primera vez que se la ve.
      Acá NO va la inclinación hacia el mouse que sí llevan las del inicio, y no
      es un olvido: esta tarjeta es apaisada —la foto a la izquierda y la ficha a
      la derecha— y ocupa el ancho entero de la lista. Inclinar una pieza de 900
      píxeles mueve sus dos puntas en direcciones opuestas, y lo que en una
      tarjeta chica se lee como que responde al mouse, en esta se lee como que la
      lista entera se dobla.

      Lo que sí hace al pasar el mouse es acercarse: `translateZ`. Es el mismo
      gesto que las categorías del inicio, así que las dos pantallas se sienten
      del mismo sistema.
    */
    <div
      data-sc-in
      style={{
        ...st.card,
        borderColor: activo ? "var(--fw-blue)" : "var(--fw-line)",
        boxShadow: activo ? "0 8px 26px rgba(37,99,235,.14)" : "none",
      }}
      onClick={() => onAbrir(car.id)}
      onMouseEnter={(e) => {
        onEntrar(car.id);
        e.currentTarget.style.transform = "perspective(1000px) translate3d(0,-3px,16px)";
        if (!activo) e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.10)";
      }}
      onMouseLeave={(e) => {
        onSalir();
        e.currentTarget.style.transform = "none";
        if (!activo) e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={st.ph}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fw-text-4)", fontSize: 12 }}>{tr("common.noPhoto")}</div>}
        <FavoriteButton listingId={car.id} size={28} disabled={car.isMock} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.3px" }}>
          {car.brand} {car.model} {car.year}
        </div>
        <div style={{ fontSize: 13, color: "var(--fw-text-3)", marginTop: 2 }}>
          {car.location}{car.rating > 0 ? ` · ${car.rating} ★${car.reviews ? ` (${car.reviews})` : ""}` : ""}
        </div>
        {car.category && (
          <div style={{ marginTop: 10 }}>
            <span style={st.categoria}>{categoryLabel(tr, car.category)}</span>
          </div>
        )}
        {/* Se arma con los datos que el auto tenga; sin ninguno no se dibuja una
            barra vacía. */}
        {celdas.length > 0 && (
          <div style={st.fichaFila}>
            {celdas.map((texto, i) => (
              <span key={texto} style={{ ...st.fichaCelda, ...(i === 0 ? { borderLeft: "none" } : {}) }}>
                {texto}
              </span>
            ))}
          </div>
        )}
        <div style={{
          marginTop: "auto", paddingTop: 12, display: "flex", gap: 10,
          ...(isMobile
            ? { flexDirection: "column", alignItems: "stretch" }
            : { justifyContent: "space-between", alignItems: "flex-end" }),
        }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--fw-text)" }}>{precio(priceOf(car))}</span>
            <span style={{ fontSize: 13, color: "var(--fw-text-4)" }}>{tr("common.perDay")}</span>
          </div>
          <button
            style={{ ...st.detail, ...(isMobile ? { width: "100%" } : {}) }}
            onClick={(e) => { e.stopPropagation(); onAbrir(car.id); }}
          >
            {tr("search.viewDetail")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(Tarjeta);
