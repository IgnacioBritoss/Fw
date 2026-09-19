// ============================================================================
//  Billetera — Vincular una tarjeta y verla guardada
// ----------------------------------------------------------------------------
//  La lista de tarjetas guardadas de la sección "Pagos" de Ajustes. La tarjeta
//  con la que se cargan los datos vive en components/TarjetaVirtual y es la
//  MISMA que usa la pantalla de pago: acá no se cobra, así que sus campos son
//  nuestros, pero el dibujo, los colores y el giro son los de allá.
//
//  ── QUÉ HACE Y QUÉ NO HACE ESTA PANTALLA ──────────────────────────────────
//  HACE: reconocer la tarjeta mientras se escribe, avisar en el momento si el
//  número no puede existir, si la fecha ya pasó o si el código tiene los
//  dígitos que no van, y comprobar que el nombre impreso sea el de la cuenta.
//  Todo eso se decide en el navegador, sin preguntarle a nadie, y está en
//  services/tarjeta.js con sus pruebas.
//
//  NO HACE: cobrar. El cobro lo hace Stripe con SUS campos, en el momento del
//  pago (ver TarjetaVirtual). Lo que queda guardado de una tarjeta es la ficha
//  —marca, últimos cuatro, vencimiento y nombre—, que es lo mismo que muestra
//  cualquier aplicación cuando dice "Visa ···· 4242". El número entero no se
//  guarda en ningún lado, y las pruebas de tarjeta.js y billetera.js están
//  escritas para que se pongan en rojo si alguna vez se guarda.
// ============================================================================
import { useState } from "react";
import { useI18n } from "../i18n/core";
import { useAuth } from "../context/AuthContext";
import { comoSeLee, vencimientoComoSeLee, estaVencida } from "../services/tarjeta";
import { TarjetaPropia } from "./TarjetaVirtual";
import {
  leerTarjetas, agregarTarjeta, borrarTarjeta, elegirTarjeta,
} from "../services/billetera";

const s = {
  tarjeta: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 12, border: "1px solid var(--fw-border)",
    background: "var(--fw-surface)", marginBottom: 10,
  },
  botonSuave: {
    padding: "10px 16px", background: "transparent", color: "var(--fw-text-2)",
    border: "1.5px solid var(--fw-border)", borderRadius: 10,
    fontSize: 14, fontFamily: "inherit", cursor: "pointer",
  },
  enlace: {
    background: "none", border: "none", padding: 0, fontFamily: "inherit",
    fontSize: 12.5, color: "var(--fw-text-4)", cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 2,
  },
};

/**
 * EL LOGO DE LA MARCA, DIBUJADO.
 *
 * No son imágenes: son cuatro formas. Una imagen por marca serían cuatro
 * pedidos más a la red para decorar un renglón, y encima se verían recortadas
 * mientras cargan justo cuando alguien está escribiendo su tarjeta. Dibujadas
 * aparecen en el mismo cuadro en que se teclea el primer dígito.
 */
export function MarcaDeTarjeta({ marca, tamaño = 34 }) {
  const alto = Math.round(tamaño * 0.66);
  const caja = { width: tamaño, height: alto, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  if (marca === "visa") {
    return (
      <div style={{ ...caja, background: "#1a1f71" }} aria-label="Visa">
        <span style={{ color: "#fff", fontSize: tamaño * 0.3, fontWeight: 800, fontStyle: "italic", letterSpacing: ".5px" }}>VISA</span>
      </div>
    );
  }
  if (marca === "mastercard") {
    // Los dos círculos que se pisan: es la marca, no una interpretación.
    return (
      <div style={{ ...caja, background: "#16181c" }} aria-label="Mastercard">
        <svg width={tamaño * 0.62} height={alto * 0.72} viewBox="0 0 36 22">
          <circle cx="13" cy="11" r="10" fill="#eb001b" />
          <circle cx="23" cy="11" r="10" fill="#f79e1b" fillOpacity=".85" />
        </svg>
      </div>
    );
  }
  if (marca === "amex") {
    return (
      <div style={{ ...caja, background: "#2e77bc" }} aria-label="American Express">
        <span style={{ color: "#fff", fontSize: tamaño * 0.26, fontWeight: 800, letterSpacing: ".3px" }}>AMEX</span>
      </div>
    );
  }
  return (
    <div style={{ ...caja, background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)" }}>
      <svg width={tamaño * 0.5} height={alto * 0.5} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="var(--fw-text-4)" strokeWidth="1.8" />
        <path d="M2 10h20" stroke="var(--fw-text-4)" strokeWidth="1.8" />
      </svg>
    </div>
  );
}

/** Un renglón de la lista: la tarjeta como la muestra cualquier aplicación. */
function Renglon({ tarjeta, elegida, onElegir, onBorrar }) {
  const { t: tr } = useI18n();
  const vencida = estaVencida(tarjeta);
  return (
    <div style={{
      ...s.tarjeta,
      border: `1px solid ${elegida ? "var(--fw-blue)" : "var(--fw-border)"}`,
      background: elegida ? "var(--fw-blue-bg)" : "var(--fw-surface)",
    }}>
      <MarcaDeTarjeta marca={tarjeta.marca} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>{comoSeLee(tarjeta)}</div>
        <div style={{ fontSize: 12, color: vencida ? "var(--fw-red-text-2)" : "var(--fw-text-4)", marginTop: 2 }}>
          {tarjeta.nombre} · {vencida
            ? tr("tarjeta.vencida", { fecha: vencimientoComoSeLee(tarjeta) })
            : tr("tarjeta.vence", { fecha: vencimientoComoSeLee(tarjeta) })}
        </div>
      </div>
      {elegida
        ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fw-blue-text)", flexShrink: 0 }}>{tr("tarjeta.enUso")}</span>
        : <button type="button" style={s.enlace} onClick={onElegir}>{tr("tarjeta.usarEsta")}</button>}
      <button type="button" style={{ ...s.enlace, flexShrink: 0 }} onClick={onBorrar} aria-label={tr("tarjeta.quitar")}>
        {tr("tarjeta.quitar")}
      </button>
    </div>
  );
}

/**
 * La billetera completa: lo que está guardado, más el formulario para sumar.
 *
 * `onCambio` avisa hacia afuera cuando la lista cambió, para que la pantalla de
 * pago pueda enterarse sin volver a leer el navegador por su cuenta.
 */
export default function Billetera({ onCambio, compacta = false }) {
  const { t: tr } = useI18n();
  const { user } = useAuth();
  const usuarioId = user?.id;
  const [tarjetas, setTarjetas] = useState(() => leerTarjetas(usuarioId));
  // Con la billetera vacía el formulario está abierto de entrada: no tiene
  // sentido pedir un clic en "Agregar" para llegar a la única cosa que se
  // puede hacer en una pantalla vacía.
  const [agregando, setAgregando] = useState(() => leerTarjetas(usuarioId).length === 0);

  const actualizar = (lista) => {
    setTarjetas(lista);
    onCambio?.(lista);
  };

  const guardar = (ficha) => {
    actualizar(agregarTarjeta(usuarioId, ficha));
    setAgregando(false);
  };

  return (
    <div>
      {tarjetas.map((t, i) => (
        <Renglon
          key={t.id}
          tarjeta={t}
          elegida={i === 0}
          onElegir={() => actualizar(elegirTarjeta(usuarioId, t.id))}
          onBorrar={() => actualizar(borrarTarjeta(usuarioId, t.id))}
        />
      ))}

      {agregando ? (
        <div style={{
          border: "1px solid var(--fw-border)", borderRadius: 12,
          padding: compacta ? 14 : 18, marginTop: tarjetas.length ? 12 : 0,
          background: "var(--fw-surface-2)",
        }}>
          {/* La MISMA tarjeta que en la pantalla de pago. Acá no se cobra
              —solo se guarda la ficha— así que los campos son nuestros, pero
              el dibujo, los colores y el giro son los mismos: son la misma
              tarjeta, no dos parecidas. */}
          <TarjetaPropia
            onGuardar={guardar}
            onCancelar={tarjetas.length ? () => setAgregando(false) : null}
            nombreCuenta={user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
          />
        </div>
      ) : (
        <button type="button" style={{ ...s.botonSuave, width: "100%", marginTop: 4 }} onClick={() => setAgregando(true)}>
          {tr("tarjeta.agregarOtra")}
        </button>
      )}
    </div>
  );
}
