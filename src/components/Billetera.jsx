// ============================================================================
//  Billetera — Vincular una tarjeta y verla guardada
// ----------------------------------------------------------------------------
//  Dos cosas en un archivo porque son la misma: el formulario donde se carga
//  una tarjeta (`FormularioTarjeta`) y la lista de las que ya están
//  (`Billetera`, que es la sección "Pagos" de Ajustes y también aparece dentro
//  de la pantalla de pago).
//
//  ── QUÉ HACE Y QUÉ NO HACE ESTA PANTALLA ──────────────────────────────────
//  HACE: reconocer la tarjeta mientras se escribe, avisar en el momento si el
//  número no puede existir, si la fecha ya pasó o si el código tiene los
//  dígitos que no van, y comprobar que el nombre impreso sea el de la cuenta.
//  Todo eso se decide en el navegador, sin preguntarle a nadie, y está en
//  services/tarjeta.js con sus pruebas.
//
//  NO HACE: cobrar. El cobro lo hace Stripe con SUS campos, en el momento del
//  pago (ver CamposDeStripe). Lo que queda guardado de una tarjeta es la ficha
//  —marca, últimos cuatro, vencimiento y nombre—, que es lo mismo que muestra
//  cualquier aplicación cuando dice "Visa ···· 4242". El número entero no se
//  guarda en ningún lado, y las pruebas de tarjeta.js y billetera.js están
//  escritas para que se pongan en rojo si alguna vez se guarda.
// ============================================================================
import { useState } from "react";
import { useI18n } from "../i18n/core";
import { useAuth } from "../context/AuthContext";
import {
  marcaDeLaTarjeta, numeroConEspacios, soloDigitos, revisarTarjeta,
  comoSeLee, vencimientoComoSeLee, estaVencida,
} from "../services/tarjeta";
import {
  leerTarjetas, agregarTarjeta, borrarTarjeta, elegirTarjeta,
} from "../services/billetera";

const s = {
  campo: { marginBottom: 14 },
  etiqueta: { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fw-text-3)", marginBottom: 6 },
  entrada: {
    width: "100%", padding: "11px 12px", borderRadius: 10, fontSize: 15,
    fontFamily: "inherit", background: "var(--fw-surface)", color: "var(--fw-text)",
    border: "1.5px solid var(--fw-border)", outline: "none", boxSizing: "border-box",
  },
  error: { fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 5 },
  aviso: { fontSize: 12, color: "var(--fw-text-4)", marginTop: 5 },
  fila: { display: "flex", gap: 12 },
  tarjeta: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 12, border: "1px solid var(--fw-border)",
    background: "var(--fw-surface)", marginBottom: 10,
  },
  boton: {
    width: "100%", padding: "13px", background: "var(--fw-blue)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 700, cursor: "pointer",
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

/**
 * El vencimiento se escribe en UN campo, no en dos.
 *
 * En el plástico está escrito así —04/28— y dos campos separados obligan a
 * saltar de uno al otro con el dedo o con el tabulador en el medio de un número
 * que se lee de corrido. La barra se pone sola cuando se pasa el segundo
 * dígito, así que se teclea "0428" y aparece "04/28".
 */
function partirVencimiento(texto) {
  const d = soloDigitos(texto).slice(0, 4);
  return { mes: d.slice(0, 2), anio: d.slice(2) };
}
function vencimientoEscrito(texto) {
  const { mes, anio } = partirVencimiento(texto);
  return anio ? `${mes}/${anio}` : mes;
}

/**
 * El formulario para vincular una tarjeta.
 *
 * `onGuardar` recibe la FICHA ya revisada (sin número). Quien lo use decide qué
 * hacer con ella: Ajustes la guarda en la billetera, la pantalla de pago la
 * guarda y sigue con el cobro.
 */
export function FormularioTarjeta({ onGuardar, onCancelar, textoBoton }) {
  const { t: tr } = useI18n();
  const { user } = useAuth();
  const nombreCuenta = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [codigo, setCodigo] = useState("");
  // El nombre viene puesto con el de la cuenta: es el caso normal —la tarjeta
  // es de quien la está cargando— y se puede corregir si el plástico dice otra
  // cosa. Empezar con el campo vacío sería pedir que escriba su propio nombre.
  const [nombre, setNombre] = useState(nombreCuenta);
  // Los errores aparecen recién cuando se intenta guardar. Marcar en rojo un
  // número mientras se escribe es marcarlo en rojo siempre, porque hasta el
  // último dígito está incompleto.
  const [mostrarErrores, setMostrarErrores] = useState(false);

  const marca = marcaDeLaTarjeta(numero);
  const { mes, anio } = partirVencimiento(vencimiento);
  const revisado = revisarTarjeta({ numero, mes, anio, codigo, nombre }, { nombreCuenta });
  const errores = mostrarErrores ? revisado.errores : {};

  /*
    El borde rojo se escribe ENTERO y no solo el color.

    React avisa —y tiene razón— cuando un estilo pisa una propiedad corta con
    una larga: `s.entrada` trae `border` y agregarle `borderColor` deja al
    navegador decidiendo cuál gana según el orden en que se apliquen, que no
    está garantizado. Se reemplaza el borde completo y listo.
  */
  const borde = (campo) => (errores[campo]
    ? { border: "1.5px solid var(--fw-red)" }
    : {});

  const guardar = (evento) => {
    evento.preventDefault();
    setMostrarErrores(true);
    if (!revisado.ok) return;
    onGuardar(revisado.tarjeta);
  };

  return (
    <form onSubmit={guardar} noValidate>
      <div style={s.campo}>
        <label style={s.etiqueta} htmlFor="fw-tarjeta-numero">{tr("tarjeta.numero")}</label>
        <div style={{ position: "relative" }}>
          <input
            id="fw-tarjeta-numero"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={numeroConEspacios(numero)}
            onChange={(e) => setNumero(soloDigitos(e.target.value))}
            style={{ ...s.entrada, paddingRight: 56, ...borde("numero") }}
          />
          {/* El logo aparece con el PRIMER dígito. Ver tarjeta.js: los primeros
              números son el emisor, así que no hace falta el número entero. */}
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <MarcaDeTarjeta marca={marca.id} tamaño={32} />
          </div>
        </div>
        {errores.numero && <div style={s.error}>{tr(errores.numero)}</div>}
      </div>

      <div style={s.fila}>
        <div style={{ ...s.campo, flex: 1 }}>
          <label style={s.etiqueta} htmlFor="fw-tarjeta-vence">{tr("tarjeta.vencimiento")}</label>
          <input
            id="fw-tarjeta-vence"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={vencimientoEscrito(vencimiento)}
            onChange={(e) => setVencimiento(e.target.value)}
            style={{ ...s.entrada, ...borde("vencimiento") }}
          />
          {errores.vencimiento && <div style={s.error}>{tr(errores.vencimiento)}</div>}
        </div>
        <div style={{ ...s.campo, flex: 1 }}>
          <label style={s.etiqueta} htmlFor="fw-tarjeta-codigo">{tr("tarjeta.codigo")}</label>
          <input
            id="fw-tarjeta-codigo"
            inputMode="numeric"
            autoComplete="cc-csc"
            // Amex pide cuatro dígitos y el resto tres: el tope sale de la
            // marca, así que quien tiene una Amex puede escribir el suyo entero.
            placeholder={"0".repeat(marca.codigo)}
            maxLength={marca.codigo}
            value={soloDigitos(codigo).slice(0, marca.codigo)}
            onChange={(e) => setCodigo(soloDigitos(e.target.value))}
            style={{ ...s.entrada, ...borde("codigo") }}
          />
          {errores.codigo && <div style={s.error}>{tr(errores.codigo, { n: marca.codigo })}</div>}
        </div>
      </div>

      <div style={s.campo}>
        <label style={s.etiqueta} htmlFor="fw-tarjeta-nombre">{tr("tarjeta.nombre")}</label>
        <input
          id="fw-tarjeta-nombre"
          autoComplete="cc-name"
          placeholder={nombreCuenta || "NOMBRE APELLIDO"}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ ...s.entrada, textTransform: "uppercase", ...borde("nombre") }}
        />
        {errores.nombre
          ? <div style={s.error}>{tr(errores.nombre, { cuenta: nombreCuenta })}</div>
          /* Un nombre recortado —"M REY" por "Martina Gabriela Rey"— es la misma
             persona y pasa. Se avisa igual, porque quien lo ve tiene que poder
             darse cuenta si se equivocó de tarjeta. */
          : revisado.coincidencia === "parecido"
            ? <div style={s.aviso}>{tr("tarjeta.nombreParecido", { cuenta: nombreCuenta })}</div>
            : null}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {onCancelar && (
          <button type="button" style={s.botonSuave} onClick={onCancelar}>{tr("common.cancel")}</button>
        )}
        <button type="submit" data-fw-accion style={{ ...s.boton, flex: 1 }}>
          {textoBoton || tr("tarjeta.vincular")}
        </button>
      </div>
      <div style={{ ...s.aviso, textAlign: "center", marginTop: 12 }}>{tr("tarjeta.queSeGuarda")}</div>
    </form>
  );
}

/** Un renglón de la lista: la tarjeta como la muestra cualquier aplicación. */
function Renglon({ tarjeta, elegida, onElegir, onBorrar }) {
  const { t: tr } = useI18n();
  const vencida = estaVencida(tarjeta);
  return (
    <div style={{
      ...s.tarjeta,
      // El borde entero, no solo el color: ver `borde()`, más arriba.
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
          <FormularioTarjeta
            onGuardar={guardar}
            onCancelar={tarjetas.length ? () => setAgregando(false) : null}
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
