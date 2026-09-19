// ============================================================================
//  TarjetaVirtual — UNA sola tarjeta, con la forma de una tarjeta
// ----------------------------------------------------------------------------
//  ── QUÉ ESTABA MAL ────────────────────────────────────────────────────────
//  La pantalla de pago pedía la tarjeta DOS VECES. Primero un formulario
//  nuestro para "vincularla" —que guardaba la marca, los últimos cuatro y el
//  nombre— y abajo los campos de Stripe para cobrarla de verdad. Los dos
//  pedían lo mismo, uno atrás del otro, y el segundo no podía saltearse porque
//  es el único que cobra. Nadie entiende por qué tiene que escribir su tarjeta
//  dos veces seguidas, y tiene razón.
//
//  Ahora hay una sola, y es esta.
//
//  ── CÓMO SE PUEDE TENER NUESTRO DISEÑO Y COBRAR IGUAL ─────────────────────
//  El número de una tarjeta no puede pasar por nuestro JavaScript: Stripe no
//  lo permite, y con razón, porque el día que pasara, este proyecto tendría
//  que cumplir todo lo que le exigen a quien guarda tarjetas. Por eso los
//  campos son de Stripe: cada uno vive adentro de un marco suyo.
//
//  Pero un marco de Stripe es transparente y se le puede dar el tamaño, la
//  tipografía y el color que uno quiera. Así que los tres campos van APOYADOS
//  SOBRE la tarjeta que dibujamos nosotros, en el lugar donde están impresos
//  en una tarjeta real: el número en el medio, el vencimiento abajo, y el
//  código de seguridad ATRÁS.
//
//  De ahí sale el giro: el código no está en el frente porque en una tarjeta
//  no está en el frente. Cuando toca escribirlo, la tarjeta se da vuelta.
//
//  ── DOS MODOS, UNA SOLA TARJETA ───────────────────────────────────────────
//  `TarjetaDeStripe` es la que cobra: sus campos son de Stripe.
//  `TarjetaPropia` es la de Ajustes, donde no se cobra nada y solo se guarda
//  la ficha; ahí los campos son nuestros y la revisión la hace tarjeta.js.
//
//  Las dos usan el mismo dibujo, los mismos colores y el mismo giro, porque
//  son la misma tarjeta. Escrito dos veces, un día serían dos tarjetas
//  distintas.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import { cargarStripe, hayPasarela } from "../services/stripe";
import {
  marcaDeLaTarjeta, numeroConEspacios, soloDigitos, revisarTarjeta,
} from "../services/tarjeta";

/*
  EL COLOR DE CADA MARCA.

  No es decoración: es la señal de que el número se reconoció. Se pinta sola
  apenas hay dígitos suficientes, que es antes de terminar de escribir, y por
  eso se siente que la pantalla está mirando lo que uno hace.
*/
const PINTURA = {
  visa: { fondo: "linear-gradient(135deg, #1a1f71 0%, #2a3a9e 55%, #4055c9 100%)", tinta: "#ffffff", tenue: "rgba(255,255,255,.62)" },
  mastercard: { fondo: "linear-gradient(135deg, #1c1c1e 0%, #2f2a28 50%, #4a3426 100%)", tinta: "#ffffff", tenue: "rgba(255,255,255,.6)" },
  amex: { fondo: "linear-gradient(135deg, #0f6f8f 0%, #2e77bc 60%, #5aa9d6 100%)", tinta: "#ffffff", tenue: "rgba(255,255,255,.66)" },
  otra: { fondo: "linear-gradient(135deg, #2b3440 0%, #3d4856 55%, #55616f 100%)", tinta: "#ffffff", tenue: "rgba(255,255,255,.55)" },
};

const s = {
  escena: { perspective: 1200, width: "100%", maxWidth: 400, margin: "0 auto" },
  // La proporción es la de una tarjeta de verdad (85.6 x 53.98 mm).
  tarjeta: {
    position: "relative", width: "100%", aspectRatio: "1.586",
    transformStyle: "preserve-3d",
    transition: "transform .7s cubic-bezier(.2,.8,.2,1)",
  },
  cara: {
    position: "absolute", inset: 0, borderRadius: 16, padding: "18px 20px",
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    boxShadow: "0 10px 30px rgba(10,14,25,.28)", overflow: "hidden",
  },
  etiqueta: { fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 },
  ranura: { minHeight: 22 },
  chip: {
    width: 38, height: 28, borderRadius: 6,
    background: "linear-gradient(135deg,#e8c87a,#b9902f 45%,#f1dfa8)",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)",
  },
  banda: { position: "absolute", left: 0, right: 0, top: 34, height: 44, background: "#14161a" },
  firma: {
    position: "absolute", left: 20, right: 20, top: 96, height: 34,
    background: "#efefef", borderRadius: 4, display: "flex",
    alignItems: "center", justifyContent: "flex-end", padding: "0 10px", gap: 10,
  },
  error: { fontSize: 12.5, color: "var(--fw-red-text-2)", marginTop: 10, textAlign: "center" },
  nota: { fontSize: 12, color: "var(--fw-text-4)", marginTop: 12, textAlign: "center", lineHeight: 1.6 },
  girar: {
    background: "none", border: "none", padding: 0, fontFamily: "inherit",
    fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
  },
};

/** El logo de la marca, dibujado arriba a la derecha. */
function Marca({ marca, tinta }) {
  if (marca === "mastercard") {
    return (
      <svg width="44" height="28" viewBox="0 0 44 28" aria-label="Mastercard">
        <circle cx="17" cy="14" r="11" fill="#eb001b" />
        <circle cx="27" cy="14" r="11" fill="#f79e1b" fillOpacity=".88" />
      </svg>
    );
  }
  if (marca === "visa") {
    return <span style={{ color: tinta, fontSize: 22, fontWeight: 800, fontStyle: "italic", letterSpacing: ".5px" }}>VISA</span>;
  }
  if (marca === "amex") {
    return <span style={{ color: tinta, fontSize: 15, fontWeight: 800, letterSpacing: ".08em" }}>AMEX</span>;
  }
  // Sin marca todavía: dos rayas, que ocupan el lugar sin anunciar nada.
  return (
    <span style={{ display: "flex", gap: 4, opacity: .45 }}>
      <span style={{ width: 22, height: 4, borderRadius: 2, background: tinta }} />
      <span style={{ width: 12, height: 4, borderRadius: 2, background: tinta }} />
    </span>
  );
}

/**
 * EL DIBUJO Y EL GIRO. Lo único que no sabe es de dónde salen los campos.
 *
 * `numero`, `vence` y `codigo` son nodos: los pone quien la usa. Así el mismo
 * dibujo sirve con los campos de Stripe y con los nuestros.
 */
export function Tarjeta3D({
  marca = "otra", numero, vence, codigo, nombre, dorso, onGirar,
}) {
  const { t: tr } = useI18n();
  const pintura = PINTURA[marca] || PINTURA.otra;

  return (
    <div style={s.escena}>
      <div style={{ ...s.tarjeta, transform: dorso ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        {/* ── FRENTE ── */}
        <div style={{
          ...s.cara, background: pintura.fondo, color: pintura.tinta,
          // La cara de atrás no recibe clics aunque el navegador no respete
          // backface-visibility: sin esto, se puede tocar un campo que no se ve.
          pointerEvents: dorso ? "none" : "auto",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={s.chip} />
            <Marca marca={marca} tinta={pintura.tinta} />
          </div>

          <div style={s.ranura}>{numero}</div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ ...s.etiqueta, color: pintura.tenue }}>{tr("tarjeta.titular")}</div>
              <div style={{ minHeight: 20 }}>{nombre}</div>
            </div>
            <div style={{ flexShrink: 0, minWidth: 92 }}>
              <div style={{ ...s.etiqueta, color: pintura.tenue }}>{tr("tarjeta.vence2")}</div>
              <div style={s.ranura}>{vence}</div>
            </div>
          </div>
        </div>

        {/* ── DORSO ── */}
        <div style={{
          ...s.cara, background: pintura.fondo, color: pintura.tinta,
          transform: "rotateY(180deg)", padding: 0,
          pointerEvents: dorso ? "auto" : "none",
        }}>
          <div style={s.banda} />
          <div style={s.firma}>
            <span style={{ ...s.etiqueta, color: "#6b7280" }}>{tr("tarjeta.codigo")}</span>
            <div style={{ width: 74 }}>{codigo}</div>
          </div>
          <button type="button" onClick={() => onGirar?.(false)}
            style={{ ...s.girar, color: pintura.tenue, position: "absolute", left: 20, bottom: 16 }}>
            {tr("tarjeta.verFrente")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── LA QUE COBRA: campos de Stripe apoyados sobre la tarjeta ───────────────

/**
 * Cómo se ve un campo de Stripe puesto sobre la tarjeta.
 *
 * EL COLOR ENTRA POR PARÁMETRO PORQUE NO TODOS VAN SOBRE EL MISMO FONDO. Los
 * del frente van sobre la tarjeta, que es oscura, y son blancos. El código de
 * seguridad va sobre la banda de la firma, que es BLANCA: con el mismo color
 * que los otros quedaba blanco sobre blanco, o sea un campo donde se escribe y
 * no se ve nada. Lo agarró la prueba del navegador.
 */
function estiloSobreLaTarjeta(tinta, tenue, grande) {
  return {
    base: {
      color: tinta,
      fontFamily: "'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace",
      fontSize: grande ? "21px" : "15px",
      letterSpacing: grande ? "0.08em" : "0.04em",
      "::placeholder": { color: tenue },
      iconColor: tinta,
    },
    invalid: { color: "#ffd1d1", iconColor: "#ffd1d1" },
  };
}

/**
 * @param onListo  `{ stripe, tarjeta }` cuando los campos están montados, o
 *                 null si no se pudieron montar. `tarjeta` es el campo del
 *                 número, que es lo que después usa confirmCardPayment.
 */
export function TarjetaDeStripe({ onListo, nombre = "" }) {
  const { t: tr } = useI18n();
  const cajaNumero = useRef(null);
  const cajaVence = useRef(null);
  const cajaCodigo = useRef(null);
  const [estado, setEstado] = useState(() => (hayPasarela() ? "cargando" : "sinPasarela"));
  const [marca, setMarca] = useState("otra");
  const [dorso, setDorso] = useState(false);
  const [error, setError] = useState("");
  // El campo del código, para poder darle el foco cuando la tarjeta se da
  // vuelta: girarla y dejar el cursor atrás sería dar vuelta una tarjeta para
  // que nadie pueda escribir en ella.
  const campoCodigo = useRef(null);

  const avisar = useRef(onListo);
  useEffect(() => { avisar.current = onListo; });

  useEffect(() => {
    if (!hayPasarela()) { avisar.current?.(null); return; }
    let vivo = true;
    let campos = [];

    cargarStripe().then((stripe) => {
      if (!vivo) return;
      if (!stripe) { setEstado("falloLaCarga"); avisar.current?.(null); return; }

      /*
        LOS COLORES SE ELIGEN UNA VEZ, AL MONTAR, Y NO CAMBIAN CON LA MARCA.

        Tentaba rehacer el estilo cuando la tarjeta cambia de color, pero los
        cuatro fondos son oscuros y el texto es blanco en los cuatro: no hay
        nada que corregir. Y `update({ style })` sobre un campo que se está
        escribiendo es justamente el momento en que no conviene tocarlo.
      */
      const { tinta, tenue } = PINTURA.otra;
      const elements = stripe.elements();
      const numero = elements.create("cardNumber", {
        style: estiloSobreLaTarjeta(tinta, tenue, true),
        showIcon: false,                 // el logo lo dibujamos nosotros, arriba
        placeholder: "•••• •••• •••• ••••",
        /*
          LINK APAGADO, Y NO ES POR ORGULLO.

          Link es la billetera de Stripe: guarda la tarjeta de una persona del
          lado de Stripe y después, en cualquier sitio que cobre con Stripe, la
          deja pagar poniendo un código que le llega al teléfono. Viene
          encendida de fábrica y aparece sola adentro del campo del número.

          Se apaga por dos motivos, en este orden:

          1. CUANDO PIDE EL CÓDIGO ABRE UN CARTEL SUYO, a pantalla completa y
             con su propio diseño, encima de esta tarjeta. Es un iframe de
             Stripe: no se puede mover, ni pintar, ni meter adentro del dibujo.
             O sea que la única forma de tener esta tarjeta entera es que ese
             cartel no exista.

          2. LO QUE RESUELVE LO PODEMOS RESOLVER NOSOTROS, Y MEJOR. Guardar la
             tarjeta para no reescribirla es una capacidad de Stripe que se
             pide desde el servidor (`setup_future_usage`) y queda atada a
             NUESTRO cliente. Hecho así, el saldo y el depósito no piden nada:
             ni la tarjeta ni un código. Link pide un código en cada cobro
             porque su billetera se usa desde cualquier sitio del mundo y
             necesita comprobar quién sos; acá eso ya lo comprobó el login.

          Lo único de Link que no podemos hacer es recordarte la tarjeta en
          sitios de OTROS. Que no es un problema nuestro.
        */
        disableLink: true,
      });
      const vence = elements.create("cardExpiry", { style: estiloSobreLaTarjeta(tinta, tenue, false) });
      // Sobre la banda de la firma, que es blanca: tinta oscura.
      const codigo = elements.create("cardCvc", {
        style: estiloSobreLaTarjeta("#1c1c1e", "#9aa1ab", false),
        placeholder: "•••",
      });
      campos = [numero, vence, codigo];
      campoCodigo.current = codigo;

      numero.mount(cajaNumero.current);
      vence.mount(cajaVence.current);
      codigo.mount(cajaCodigo.current);

      numero.on("change", (e) => {
        if (!vivo) return;
        setMarca(e.brand && e.brand !== "unknown" ? e.brand : "otra");
        setError(e.error?.message || "");
      });
      vence.on("change", (e) => {
        if (!vivo) return;
        setError(e.error?.message || "");
        /*
          AL TERMINAR EL VENCIMIENTO, LA TARJETA SE DA VUELTA SOLA.

          Es el orden en que están impresos los datos: número, vencimiento, y
          el código atrás. Hacerlo solo evita el problema de siempre con las
          tarjetas dibujadas: que el código esté en una cara que nadie sabe
          cómo mostrar.
        */
        if (e.complete) {
          setDorso(true);
          setTimeout(() => { if (vivo) campoCodigo.current?.focus(); }, 380);
        }
      });
      codigo.on("change", (e) => { if (vivo) setError(e.error?.message || ""); });
      // Si alguien vuelve al frente con el teclado, la tarjeta lo acompaña.
      numero.on("focus", () => { if (vivo) setDorso(false); });
      vence.on("focus", () => { if (vivo) setDorso(false); });
      codigo.on("focus", () => { if (vivo) setDorso(true); });

      setEstado("listo");
      avisar.current?.({ stripe, tarjeta: numero });
    });

    return () => {
      vivo = false;
      for (const campo of campos) campo.destroy();
      avisar.current?.(null);
    };
  }, []);

  if (estado === "sinPasarela" || estado === "falloLaCarga") {
    return (
      <div style={{ ...s.nota, border: "1px dashed var(--fw-border)", borderRadius: 12, padding: 18 }}>
        {tr(estado === "sinPasarela" ? "pago.sinPasarela" : "pago.noCargoStripe")}
      </div>
    );
  }

  return (
    <div>
      <Tarjeta3D
        marca={marca}
        dorso={dorso}
        onGirar={setDorso}
        numero={<div ref={cajaNumero} />}
        vence={<div ref={cajaVence} />}
        codigo={<div ref={cajaCodigo} />}
        nombre={<span style={{ fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }}>{nombre}</span>}
      />
      {estado === "cargando" && <div style={s.nota}>{tr("pago.cargandoCampos")}</div>}
      {error && <div style={s.error}>{error}</div>}
      <div style={s.nota}>{tr("pago.porQueDeNuevo")}</div>
    </div>
  );
}

// ── LA DE AJUSTES: los mismos campos, pero nuestros ────────────────────────

/**
 * Un campo propio, sin caja: se apoya sobre la tarjeta como los de Stripe.
 *
 * `style` se saca de las props y se MEZCLA con el estilo de abajo, en vez de
 * dejar que el spread lo pise. Con el spread al final, un `style` de afuera
 * —incluso `undefined`— borraba todo esto y el campo volvía a ser una caja
 * blanca de navegador en el medio de la tarjeta.
 */
function CampoPelado({ valor, onChange, ancho, grande, color = "#fff", style, ...resto }) {
  return (
    <input
      value={valor}
      onChange={onChange}
      {...resto}
      style={{
        width: ancho || "100%", border: "none", outline: "none", background: "transparent",
        color, fontFamily: "'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace",
        fontSize: grande ? 21 : 15, letterSpacing: grande ? ".08em" : ".04em", padding: 0,
        ...style,
      }}
    />
  );
}

/**
 * La tarjeta de Ajustes: acá no se cobra, solo se guarda la ficha.
 *
 * Por eso los campos son nuestros y la revisión la hace services/tarjeta.js:
 * pedirle los campos a Stripe para algo que no va a cobrar sería cargar la
 * librería de una pasarela para guardar cuatro dígitos.
 */
export function TarjetaPropia({ onGuardar, onCancelar, nombreCuenta = "" }) {
  const { t: tr } = useI18n();
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState(nombreCuenta);
  const [dorso, setDorso] = useState(false);
  const [mostrarErrores, setMostrarErrores] = useState(false);

  const marca = marcaDeLaTarjeta(numero);
  const digitosVenc = soloDigitos(vencimiento).slice(0, 4);
  const mes = digitosVenc.slice(0, 2);
  const anio = digitosVenc.slice(2);
  const revisado = revisarTarjeta({ numero, mes, anio, codigo, nombre }, { nombreCuenta });
  const errores = mostrarErrores ? revisado.errores : {};
  const primerError = errores.numero || errores.vencimiento || errores.codigo || errores.nombre;

  const guardar = (evento) => {
    evento.preventDefault();
    setMostrarErrores(true);
    if (revisado.ok) onGuardar(revisado.tarjeta);
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Tarjeta3D
        marca={marca.id}
        dorso={dorso}
        onGirar={setDorso}
        numero={
          <CampoPelado grande inputMode="numeric" autoComplete="cc-number"
            placeholder="•••• •••• •••• ••••"
            valor={numeroConEspacios(numero)}
            onChange={(e) => {
              const limpio = soloDigitos(e.target.value);
              setNumero(limpio);
            }}
            onFocus={() => setDorso(false)} />
        }
        vence={
          <CampoPelado inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" ancho={72}
            valor={anio ? `${mes}/${anio}` : mes}
            onChange={(e) => setVencimiento(e.target.value)}
            onFocus={() => setDorso(false)}
            onBlur={() => { if (digitosVenc.length === 4) setDorso(true); }} />
        }
        codigo={
          <CampoPelado inputMode="numeric" autoComplete="cc-csc"
            placeholder={"•".repeat(marca.codigo)}
            maxLength={marca.codigo}
            valor={soloDigitos(codigo).slice(0, marca.codigo)}
            onChange={(e) => setCodigo(soloDigitos(e.target.value))}
            color="#1c1c1e"
            onFocus={() => setDorso(true)} />
        }
        nombre={
          <CampoPelado autoComplete="cc-name" placeholder={nombreCuenta || "NOMBRE APELLIDO"}
            valor={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onFocus={() => setDorso(false)}
            style={{ fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" }} />
        }
      />

      {/* El nombre y el código no entran en el dibujo con su propio estilo, así
          que el error de cualquiera de los cuatro se dice UNA vez acá abajo:
          con la tarjeta dada vuelta, un cartel adentro de la cara que no se ve
          no lo lee nadie. */}
      {primerError && <div style={s.error}>{tr(primerError, { n: marca.codigo, cuenta: nombreCuenta })}</div>}
      {!primerError && revisado.coincidencia === "parecido" && (
        <div style={s.nota}>{tr("tarjeta.nombreParecido", { cuenta: nombreCuenta })}</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
        {onCancelar && (
          <button type="button" onClick={onCancelar}
            style={{ padding: "11px 18px", background: "transparent", color: "var(--fw-text-2)", border: "1.5px solid var(--fw-border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            {tr("common.cancel")}
          </button>
        )}
        <button type="submit" data-fw-accion
          style={{ padding: "11px 22px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
          {tr("tarjeta.vincular")}
        </button>
      </div>
      <div style={s.nota}>{tr("tarjeta.queSeGuarda")}</div>
    </form>
  );
}
