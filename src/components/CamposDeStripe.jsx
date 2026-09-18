// ============================================================================
//  CamposDeStripe — Los tres campos de la tarjeta, que son de Stripe
// ----------------------------------------------------------------------------
//  Esto parece un formulario y no lo es. Cada campo es un marco (un iframe) que
//  pertenece a Stripe: lo que se teclea ahí adentro NUNCA entra en el
//  JavaScript de esta aplicación. Nosotros no podemos leer el número aunque
//  quisiéramos, y por eso es la única manera razonable de cobrar sin quedar
//  obligado a todo lo que implica guardar tarjetas.
//
//  Lo que sí llega de vuelta son dos datos: qué MARCA es (para poder avisar si
//  no es la tarjeta que había vinculada) y si el campo está completo. El número
//  no, el código tampoco.
//
//  ── POR QUÉ SE PIDEN LOS DATOS EN CADA COBRO ──────────────────────────────
//  Porque la tarjeta vinculada de esta aplicación es una FICHA —marca, últimos
//  cuatro, vencimiento, nombre— y no un medio de pago guardado. Para que
//  alquilar se pudiera pagar con un solo toque, la tarjeta tendría que quedar
//  guardada EN STRIPE, atada al cliente, y eso lo hace el servidor con su clave
//  secreta: el navegador no puede, y fingir que puede sería peor que pedir los
//  datos.
//
//  Así que se piden, y la pantalla lo dice en una línea en vez de dejar a
//  alguien preguntándose por qué vinculó una tarjeta si igual la tiene que
//  escribir. Los tres cobros de un alquiler son tres momentos distintos, no
//  tres veces el mismo.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { cargarStripe, aparienciaDeLosCampos, hayPasarela } from "../services/stripe";
import { useI18n } from "../i18n/core";

const s = {
  campo: { marginBottom: 12 },
  etiqueta: { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fw-text-3)", marginBottom: 6 },
  caja: {
    padding: "12px", borderRadius: 10, border: "1.5px solid var(--fw-border)",
    background: "var(--fw-surface)", minHeight: 20,
  },
  fila: { display: "flex", gap: 12 },
  error: { fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 6 },
  aviso: { fontSize: 12, color: "var(--fw-text-4)", marginTop: 6 },
};

/**
 * @param onListo  se llama con `{ stripe, tarjeta }` cuando los campos están
 *                 montados, o con `null` si no se pudieron montar. `tarjeta` es
 *                 el campo del número, que es lo que después se le pasa a
 *                 `confirmCardPayment`.
 * @param marcaEsperada  la marca de la tarjeta vinculada, para poder avisar si
 *                 se está pagando con otra.
 */
export default function CamposDeStripe({ onListo, marcaEsperada }) {
  const { t: tr } = useI18n();
  const cajaNumero = useRef(null);
  const cajaVence = useRef(null);
  const cajaCodigo = useRef(null);
  /*
    cargando | listo | sinPasarela | falloLaCarga

    "No hay clave cargada" se sabe ANTES de dibujar: es una variable de
    compilación, no algo que haya que ir a averiguar. Por eso sale del estado
    inicial y no de un efecto que corrige el estado después del primer dibujado
    —que además es lo que la regla react-hooks/set-state-in-effect marca, y con
    razón: sería dibujar "cargando" un instante para nada—.
  */
  const [estado, setEstado] = useState(() => (hayPasarela() ? "cargando" : "sinPasarela"));
  const [errorDelCampo, setErrorDelCampo] = useState("");
  const [marcaEscrita, setMarcaEscrita] = useState("");

  /*
    `onListo` a propósito NO está en las dependencias del montaje: llega como
    una función nueva en cada dibujado del padre, así que incluirla desmontaría
    y volvería a montar los campos de Stripe con cada tecla que se toque afuera,
    perdiendo lo que la persona ya escribió. Se guarda en una referencia y se
    usa siempre la última versión.

    La referencia se actualiza en un efecto y no durante el dibujado: cambiar
    una referencia mientras React dibuja es una de las cosas que React no
    garantiza, y el linter la marca con razón.
  */
  const avisar = useRef(onListo);
  useEffect(() => { avisar.current = onListo; });

  useEffect(() => {
    if (!hayPasarela()) {
      avisar.current?.(null);
      return;
    }
    let vivo = true;
    let campos = [];

    cargarStripe().then((stripe) => {
      if (!vivo) return;
      if (!stripe) {
        setEstado("falloLaCarga");
        avisar.current?.(null);
        return;
      }
      /*
        Los colores se leen del tema AL MONTAR. Los campos viven adentro de un
        marco de Stripe, así que el CSS de la página no los alcanza: sin esto
        quedan con el negro de fábrica, que en modo oscuro es negro sobre negro.
        Cambiar el tema con la pantalla de pago abierta los deja con los colores
        anteriores; es un caso raro y el arreglo sería rehacer los campos, o sea
        borrar lo que la persona estaba escribiendo.
      */
      const style = aparienciaDeLosCampos();
      const elements = stripe.elements();
      const numero = elements.create("cardNumber", { style, showIcon: true, placeholder: "4242 4242 4242 4242" });
      const vence = elements.create("cardExpiry", { style });
      const codigo = elements.create("cardCvc", { style });
      campos = [numero, vence, codigo];

      numero.mount(cajaNumero.current);
      vence.mount(cajaVence.current);
      codigo.mount(cajaCodigo.current);

      // Stripe avisa la marca apenas hay dígitos suficientes, igual que el
      // formulario propio de la billetera.
      numero.on("change", (evento) => {
        if (!vivo) return;
        setMarcaEscrita(evento.brand && evento.brand !== "unknown" ? evento.brand : "");
        setErrorDelCampo(evento.error?.message || "");
      });
      for (const campo of [vence, codigo]) {
        campo.on("change", (evento) => {
          if (!vivo) return;
          setErrorDelCampo(evento.error?.message || "");
        });
      }

      setEstado("listo");
      avisar.current?.({ stripe, tarjeta: numero });
    });

    return () => {
      vivo = false;
      for (const campo of campos) campo.destroy();
      avisar.current?.(null);
    };
  }, []);

  /*
    LA MARCA QUE SE ESTÁ ESCRIBIENDO CONTRA LA QUE ESTABA VINCULADA.

    Es un aviso y no un impedimento: pagar con otra tarjeta es perfectamente
    válido —se rompió una, se usa la del trabajo— y bloquearlo sería inventar
    una regla que no existe. Lo que no puede pasar es que alguien crea que está
    pagando con la que vinculó y esté pagando con otra.

    Solo se compara la MARCA porque es lo único que Stripe deja ver desde acá:
    los últimos cuatro dígitos no salen del marco. Alcanza para el error común,
    que es agarrar otro plástico de la billetera.
  */
  const otraMarca = Boolean(marcaEsperada && marcaEscrita && marcaEscrita !== marcaEsperada);

  if (estado === "sinPasarela" || estado === "falloLaCarga") {
    return (
      <div style={{ ...s.caja, borderStyle: "dashed", textAlign: "center", color: "var(--fw-text-3)", fontSize: 13, padding: 18 }}>
        {tr(estado === "sinPasarela" ? "pago.sinPasarela" : "pago.noCargoStripe")}
      </div>
    );
  }

  return (
    <div>
      <div style={s.campo}>
        <label style={s.etiqueta}>{tr("tarjeta.numero")}</label>
        <div ref={cajaNumero} style={s.caja} />
      </div>
      <div style={s.fila}>
        <div style={{ ...s.campo, flex: 1 }}>
          <label style={s.etiqueta}>{tr("tarjeta.vencimiento")}</label>
          <div ref={cajaVence} style={s.caja} />
        </div>
        <div style={{ ...s.campo, flex: 1 }}>
          <label style={s.etiqueta}>{tr("tarjeta.codigo")}</label>
          <div ref={cajaCodigo} style={s.caja} />
        </div>
      </div>
      {estado === "cargando" && <div style={s.aviso}>{tr("pago.cargandoCampos")}</div>}
      {errorDelCampo && <div style={s.error}>{errorDelCampo}</div>}
      {otraMarca && !errorDelCampo && <div style={s.aviso}>{tr("pago.otraMarca")}</div>}
    </div>
  );
}
