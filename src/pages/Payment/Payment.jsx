// ============================================================================
//  Payment — Pantalla de PAGO de una reserva
// ----------------------------------------------------------------------------
//  El pago está partido en tres tramos, como en un alquiler real:
//    · Seña      → confirma la reserva.
//    · Saldo     → el resto del alquiler.
//    · Depósito  → se retiene como garantía y se devuelve al entregar el auto.
//
//  El detalle de montos lo calcula el BACKEND al aceptarse la reserva (comisión,
//  seguro, seña y depósito), así que acá se muestra ese detalle y no una cuenta
//  hecha en el navegador.
//
//  ─────────────────────────────────────────────────────────────────────────
//  LOS TRES TRAMOS SE PAGAN DE A UNO, Y EN ESTE ORDEN.
//
//  Esta pantalla decía que el pago estaba partido en tres, dibujaba los tres
//  renglones... y abajo tenía UN botón que decía "Pagar $TOTAL" y los cobraba a
//  los tres juntos en una sola llamada. O sea: el alquiler se contaba en etapas
//  y se cobraba de una. La seña no señaba nada, porque en el mismo clic se iba
//  el alquiler entero.
//
//  Ahora cada tramo es su propio paso. El botón cobra SOLO el que sigue y
//  después la pantalla se vuelve a leer del servidor:
//
//    1. Seña      → confirma la reserva. La reserva pasa a "Seña paga".
//    2. Saldo     → el resto del alquiler. Recién acá queda "Pago completo",
//                   que es lo único que habilita el retiro del auto.
//    3. Depósito  → no es un gasto: se AUTORIZA y queda retenido hasta que se
//                   devuelve el auto.
//
//  El orden no es un gusto de esta pantalla: el backend rechaza el saldo si la
//  seña no está paga ("Pay the deposit (seña) before the balance"). Lo que
//  cambió acá es que la interfaz ahora hace lo mismo que dice.
//
//  QUÉ TRAMO ESTÁ CUBIERTO se lee de `records`, la lista de cobros que devuelve
//  el servidor, y no de una cuenta local: si alguien pagó la seña desde otro
//  dispositivo, esta pantalla lo ve al recargar.
//
//  ─────────────────────────────────────────────────────────────────────────
//  ACÁ SE COBRA DE VERDAD, CON STRIPE.
//
//  Esta pantalla llamaba a `mock-confirm`, que le pide al servidor que dé el
//  cobro por hecho sin que pase plata. Eso solo funciona con el servidor puesto
//  en modo simulación, que es como corren las pruebas automáticas; el servidor
//  desplegado contesta 403 y la pantalla mostraba un error que no explicaba
//  nada. O sea: el pago estaba roto por diseño y no por un error.
//
//  El camino de ahora es el que va a correr siempre:
//
//    1. Se le pide al servidor el intento de cobro DEL TRAMO que sigue. El
//       servidor calcula el importe —el navegador no elige cuánto se paga— y
//       devuelve un `clientSecret`, que sirve para pagar ese cobro y nada más.
//    2. El navegador confirma con Stripe, con los datos de la tarjeta puestos
//       en campos que son de Stripe (ver CamposDeStripe).
//    3. SE ESPERA AL SERVIDOR. Este es el paso que no se ve y que hay que
//       hacer: cuando Stripe le contesta "listo" al navegador, el servidor
//       todavía no sabe nada. Se entera por un aviso aparte que Stripe le
//       manda por atrás, y ese aviso tarda. Refrescar una sola vez justo ahí
//       muestra la reserva impaga con la plata ya debitada, y quien lo ve
//       vuelve a apretar "Pagar". La espera está en services/pago.js, con sus
//       pruebas.
//
//  Sin la clave pública de Stripe cargada (VITE_STRIPE_PUBLISHABLE_KEY) la
//  pantalla lo dice y vuelve al camino simulado, que es el que sirve para
//  desarrollar contra un servidor en modo simulación.
// ============================================================================
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getBookingById, getBookingPaymentStatus, crearIntentoDePago,
  mockConfirmPayment, mockFailPayment,
} from "../../services/api";
import { tramosDelPago, esperarElCobro } from "../../services/pago";
import { hayPasarela, esModoPrueba } from "../../services/stripe";
import { tarjetaElegida, agregarTarjeta } from "../../services/billetera";
import { comoSeLee, vencimientoComoSeLee } from "../../services/tarjeta";
import { FormularioTarjeta, MarcaDeTarjeta } from "../../components/Billetera";
import CamposDeStripe from "../../components/CamposDeStripe";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import { longDate } from "../../i18n/dates";
import { useCelebracion, useSacudida } from "../../anim";

const s = {
  page: { maxWidth: 600, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { maxWidth: 600, margin: "0 auto", padding: "20px 16px" },
  title: { fontSize: 22, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { fontSize: 14, color: "var(--fw-text-3)", marginBottom: 28 },
  card: { background: "var(--fw-surface)", border: "1px solid var(--fw-border)", borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)" },
  row: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--fw-text-2)", marginBottom: 8 },
  totalRow: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "var(--fw-text)", borderTop: "1px solid var(--fw-border)", paddingTop: 12, marginTop: 4 },
  payBtn: { width: "100%", padding: "15px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  payBtnDisabled: { width: "100%", padding: "15px", background: "var(--fw-blue-line)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  /*
    FORZAR EL RECHAZO ES UNA HERRAMIENTA DE DEMOSTRACIÓN, NO UNA OPCIÓN.

    Estuvo primero transparente con borde rosa (parecía deshabilitado) y después
    rojo lleno a todo el ancho. Rojo lleno tampoco estaba bien: ahí abajo, del
    mismo tamaño que el botón de pagar, se leía como si fuera la otra mitad de
    una decisión. Nadie quiere "pagar" o "que le rechacen el pago": lo segundo
    existe nada más que para poder mostrar cómo se ve la pantalla cuando falla.

    Ahora es un renglón chico y centrado, del color de un texto secundario, con
    el rojo puesto solo al pasar el mouse. Está para quien lo va a buscar y no le
    compite al botón de verdad.
  */
  failBtn: {
    display: "block", margin: "0 auto", background: "none", border: "none",
    color: "var(--fw-text-4)", fontFamily: "inherit", fontSize: 12,
    cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
    padding: "6px 10px",
  },
  successBox: { textAlign: "center", padding: "48px 0" },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-blue-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  failIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  secureNote: { display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12, color: "var(--fw-text-4)", marginTop: 16 },
  error: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  info: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 },
  /*
    "SE PAGÓ Y EL SERVIDOR TODAVÍA NO SE ENTERÓ" NO VA EN ROJO.

    El rojo dice "algo salió mal, hacé algo". Acá no salió nada mal: la plata
    se cobró y el aviso viene en camino. En rojo, quien ya pagó vuelve a pagar,
    que es justamente lo que esta pantalla tiene que evitar.
  */
  aviso: { background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)", borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-text-2)", marginBottom: 16 },
  tarjetaFila: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--fw-border)", background: "var(--fw-surface-2)", marginBottom: 14 },
  cambiar: { background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12.5, color: "var(--fw-blue-text)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2, flexShrink: 0 },
  step: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "9px 12px", borderRadius: 8, marginBottom: 8 },
  // El numerito del paso. Redondo y con borde, como una viñeta numerada: dice
  // "esto es una secuencia" antes de que nadie lea una palabra.
  paso: {
    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
    border: "1px solid", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 11, fontWeight: 800,
  },
};

// Fila "etiqueta ─ valor" reutilizable del resumen.
function Row({ label, value }) {
  return (
    <div style={s.row}>
      <span style={{ color: "var(--fw-text-3)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/*
  ACÁ NO SE CONVIERTE LA MONEDA, A PROPÓSITO.

  En el resto de la app el precio se muestra en la moneda que eligió cada uno,
  para poder dimensionarlo. Pero esta es la pantalla del cobro: lo que se debita
  son pesos argentinos, y escribir "US$ 26" al lado del botón de pagar sería
  decir que se cobra en dólares. Los números de acá son los de la operación.
*/
const money = (value) => `$${Number(value || 0).toLocaleString("es-AR")} ARS`;

/** Esperar de verdad. Se pasa a `esperarElCobro`, que no sabe de relojes. */
const dormir = (ms) => new Promise(listo => setTimeout(listo, ms));

export default function Payment() {
  const { t: tr, lang } = useI18n();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useIsMobile();
  const { user } = useAuth();
  const stateData = location.state || {};

  const [booking, setBooking] = useState(stateData.booking || null);
  const [payment, setPayment] = useState(null);   // detalle de montos del backend
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  /*
    CUÁNTAS VECES SE INTENTÓ COBRAR.

    No es para mostrarlo: es la señal que hace que el cartel de error se sacuda
    también cuando el error es EL MISMO que la vez anterior. El texto del error
    solo no alcanza: si alguien aprieta "Pagar" con la tarjeta vencida dos
    veces, el mensaje es idéntico las dos veces, el estado no cambia, y el
    cartel se quedaría quieto justo cuando más falta hace que reaccione —quien
    apretó de nuevo está esperando que pase ALGO—. Con el contador, cada intento
    es distinto del anterior. Ver anim/index.js.
  */
  const [intento, setIntento] = useState(0);

  /*
    LA PASARELA: `{ stripe, tarjeta }`, o null mientras los campos no estén.

    Lo manda CamposDeStripe cuando termina de montarlos. Null no es un error: es
    "todavía no", y también es lo que llega cuando no hay clave cargada. El
    botón de pagar mira esto para no salir a cobrar con campos que no existen.
  */
  const [pasarela, setPasarela] = useState(null);
  /*
    "SE PAGÓ, PERO EL SERVIDOR TODAVÍA NO LO REGISTRÓ" NO ES UN ERROR.

    Por eso tiene su propio cartel y no usa el rojo. Es el caso en que Stripe
    aceptó el cobro y el aviso al servidor tardó más de lo que esta pantalla
    esperó: la plata está cobrada, la reserva se va a actualizar sola, y lo
    único que corresponde es decirlo. Pintarlo de rojo haría que alguien que ya
    pagó vuelva a pagar.
  */
  const [aviso, setAviso] = useState(null);
  // Se levanta mientras se espera el aviso de Stripe al servidor, para poder
  // decir en el botón qué está pasando: "procesando" y "esperando la
  // confirmación" son dos momentos distintos y uno de los dos puede tardar.
  const [esperando, setEsperando] = useState(false);

  /*
    LA TARJETA VINCULADA, LEÍDA SIN EFECTO.

    Un `useEffect` que llama a `setState` es exactamente lo que la regla
    react-hooks/set-state-in-effect prohíbe, y con razón: dibuja una vez con el
    dato viejo y otra con el nuevo. Acá no hace falta ninguno —la billetera es
    una lectura síncrona del navegador— así que se calcula, y el contador es lo
    que la vuelve a leer cuando se vincula o se cambia una tarjeta.
  */
  const [cambiosDeTarjeta, setCambiosDeTarjeta] = useState(0);
  const tarjeta = useMemo(
    () => tarjetaElegida(user?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, cambiosDeTarjeta],
  );
  const [cambiandoTarjeta, setCambiandoTarjeta] = useState(false);

  // Trae la reserva y el estado del pago (montos ya calculados por el backend).
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingData, paymentData] = await Promise.all([
        getBookingById(bookingId),
        getBookingPaymentStatus(bookingId).catch(() => null),
      ]);
      setBooking(bookingData);
      setPayment(paymentData);
    } catch (err) {
      setError(err.message || tr("payment.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, tr]);

  useEffect(() => { load(); }, [load]);

  /**
   * El cobro de UN tramo, de punta a punta.
   *
   * Los tres pasos están arriba, en el comentario de la pantalla. Lo que hay
   * que mirar acá es que NINGUNO de los tres se saltea, y sobre todo el
   * tercero: sin esperar al servidor, la pantalla contesta antes de que el
   * cobro exista para la reserva.
   */
  const cobrarConStripe = async (kind) => {
    // El importe lo decide el servidor. El navegador pide "el cobro de este
    // tramo" y recibe cuánto es: si el precio pudiera viajar desde acá, el
    // control de precios del servidor no serviría para nada.
    const cobro = await crearIntentoDePago(bookingId, kind);
    if (!cobro?.clientSecret) {
      // Pasa cuando el servidor reutiliza un intento anterior y no lo puede
      // recuperar de Stripe. Es raro y tiene arreglo —volver a intentar crea
      // uno nuevo— así que se dice eso y no "falló el pago".
      const err = new Error(tr("pago.sinClientSecret"));
      err.reintentable = true;
      throw err;
    }

    const { error: rechazo, paymentIntent } = await pasarela.stripe.confirmCardPayment(
      cobro.clientSecret,
      {
        payment_method: {
          card: pasarela.tarjeta,
          billing_details: {
            // El nombre de la tarjeta vinculada, que ya se comprobó contra el
            // de la cuenta al vincularla (services/tarjeta.js).
            name: tarjeta?.nombre || user?.name || undefined,
            email: user?.email || undefined,
          },
        },
      },
    );

    /*
      EL MENSAJE DE STRIPE SE MUESTRA TAL CUAL, Y ES LO CORRECTO.

      "Tu tarjeta fue rechazada", "el código de seguridad es incorrecto", "no
      hay fondos suficientes": son tres cosas distintas y quien está pagando
      necesita saber cuál le pasó. Reemplazarlas por un "no se pudo procesar el
      pago" propio sería tirar a la basura la única información útil. Stripe los
      manda traducidos al idioma del navegador.
    */
    if (rechazo) {
      const err = new Error(rechazo.message || tr("payment.failed"));
      err.reintentable = true;
      throw err;
    }

    /*
      QUÉ ESTADOS SON "SALIÓ BIEN".

      `succeeded` es el cobro común. `requires_capture` es el depósito en
      garantía: la plata quedó RETENIDA y se cobra solo si hay un daño, así que
      tratarlo como un fracaso sería marcar como fallida justo la operación que
      funcionó. `processing` es un cobro que el banco todavía está resolviendo:
      tampoco es un fracaso, y el servidor se va a enterar igual por el aviso
      de Stripe. Cualquier otra cosa sí quedó a mitad de camino.
    */
    const bien = ["succeeded", "requires_capture", "processing"];
    if (paymentIntent && !bien.includes(paymentIntent.status)) {
      const err = new Error(tr("pago.quedoAMedias"));
      err.reintentable = true;
      throw err;
    }

    // El paso que no se ve: esperar a que Stripe le avise al servidor.
    setEsperando(true);
    return esperarElCobro({
      kind,
      pedirEstado: () => getBookingPaymentStatus(bookingId),
      dormir,
    });
  };

  /**
   * Paga UN tramo: el que sigue, y nada más.
   *
   * Antes esta función llamaba a mockConfirmPayment(bookingId) SIN decir cuál,
   * y el backend entiende eso como "cobrame los tres": seña, saldo y depósito
   * en una sola vuelta. Pasarle el tramo es lo que hace que el pago sea por
   * partes de verdad.
   *
   * El camino simulado quedó para desarrollar contra un servidor en modo
   * simulación: el servidor desplegado lo rechaza, y es correcto que lo haga.
   */
  const handlePay = async (kind) => {
    if (!kind) return;
    setPaying(true);
    setError(null);
    setAviso(null);
    try {
      if (!hayPasarela()) {
        await mockConfirmPayment(bookingId, kind);
      } else {
        if (!tarjeta) { setCambiandoTarjeta(true); return; }
        if (!pasarela) throw new Error(tr("pago.camposNoListos"));
        const resultado = await cobrarConStripe(kind);
        if (resultado.motivo === "rechazado") {
          setError(tr("payment.failed"));
          setIntento(n => n + 1);
        } else if (resultado.motivo === "demora") {
          setAviso(tr("pago.demora"));
        }
      }
      // Se relee todo del servidor en vez de creerle a la respuesta: el estado
      // de la reserva cambia junto con el cobro y hay tramos que dependen de él.
      await load();
    } catch (err) {
      // El 503 del servidor sin Stripe configurado es el único error del que se
      // puede decir qué hacer, así que se dice: no es un problema de la tarjeta
      // ni de quien paga, y no se arregla volviendo a intentar.
      setError(err.code === "PAYMENTS_NOT_CONFIGURED"
        ? tr("pago.servidorSinStripe")
        : err.message || tr("payment.failed"));
      setIntento(n => n + 1);
    } finally {
      setPaying(false);
      setEsperando(false);
    }
  };

  // Botón de demo para ver la pantalla de pago rechazado. Rechaza el tramo que
  // está en juego, no siempre la seña: rechazar la seña cuando ya está paga y
  // lo que se está pagando es el saldo mostraba un error que no era el de nadie.
  const handleFail = async (kind) => {
    if (!kind) return;
    setPaying(true);
    setError(null);
    try {
      await mockFailPayment(bookingId, kind);
      await load();
    } catch (err) {
      setError(err.message || tr("payment.simFailed"));
      setIntento(n => n + 1);
    } finally {
      setPaying(false);
    }
  };

  const vehicle = booking?.listing?.vehicle || booking?.vehicle || {};
  const vehicleLabel = `${vehicle.brand || ""} ${vehicle.model || ""} ${vehicle.year || ""}`.trim();
  const startDate = booking?.startDate;
  const endDate = booking?.endDate;
  const days = startDate && endDate
    ? Math.max(Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000), 1)
    : 1;

  // Montos: los del backend si están; si no, los del snapshot de la reserva.
  const total = payment?.total ?? booking?.totalPriceSnapshot ?? 0;
  const sena = payment?.sena ?? booking?.senaAmountSnapshot;
  const balance = payment?.balance ?? booking?.balanceAmountSnapshot;
  const deposit = payment?.deposit ?? booking?.depositSnapshot;
  const commission = payment?.commission ?? booking?.platformFeeSnapshot;
  const insurance = payment?.insurance ?? booking?.insuranceSnapshot;
  const paymentStatus = payment?.paymentStatus ?? booking?.paymentStatus;
  const hasFailed = paymentStatus === "FAILED";

  /*
    QUÉ TRAMO YA ESTÁ CUBIERTO.

    La regla vive en services/pago.js y no acá, porque "Mis reservas" necesita
    la misma respuesta y no tiene los mismos datos a mano: esta pantalla pide el
    estado al servidor y recibe `records` —la lista de cobros, uno por tramo, que
    es el dato exacto—, y la otra solo tiene los montos guardados en la reserva.
    Escrita dos veces, las dos pantallas se contradecían.
  */
  const tramos = tramosDelPago({
    paymentStatus, sena, balance, deposit,
    records: payment?.records,
    depositPaymentIntentId: booking?.depositPaymentIntentId,
  });

  // El que sigue: el primero sin cubrir. Es el único que se puede pagar.
  const tramoActual = tramos.find(t => !t.hecho) || null;
  const isPaid = tramos.length > 0 && tramoActual === null;

  /*
    LA CELEBRACIÓN Y LA SACUDIDA, ATADAS AL ESTADO DEL COBRO.

    Los ganchos van ACÁ ARRIBA, antes de cualquier `return`, porque los ganchos
    de React tienen que llamarse siempre y en el mismo orden: puestos abajo, en
    el dibujado en que la pantalla devuelve el spinner no se llamarían y React
    corta con un error. Por eso el spinner de "cargando" bajó unos renglones,
    hasta después de esta línea: los datos de arriba se calculan igual sin
    reserva cargada —`tramosDelPago` con todo en null devuelve una lista vacía,
    así que `isPaid` es falso— y no cuesta nada.

    POR QUÉ ESTAS DOS Y NO UNA SOLA. Son los dos finales posibles de la misma
    acción, y las dos existen por la misma razón: entre que se aprieta "Pagar" y
    que la pantalla cambia, la única diferencia visible es que el texto de
    adentro es otro. Quien apretó no mira el texto: mira si pasó algo. El tilde
    que se dibuja y la sacudida contestan esa pregunta antes de que nadie lea.
  */
  const { icono: iconoPago, detalle: detallePago } = useCelebracion(isPaid);
  const cartelError = useSacudida(error ? `${intento}:${error}` : "");

  if (loading) return <Spinner block label={tr("common.loading")} />;

  // La reserva se paga recién cuando el dueño la aceptó.
  if (booking && booking.status !== "ACCEPTED" && !isPaid) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.title}>{tr("payment.notYet")}</div>
        <div style={s.sub}>
          {booking.status === "REQUESTED"
            ? tr("payment.notAcceptedYet")
            : tr("payment.notPayable")}
        </div>
        <button style={s.payBtn} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.successBox}>
          <div ref={iconoPago} style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#0f6ce6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          {/* Lo que sube detrás del tilde: el título, la nota, el resumen y los
              botones, en ese orden y de a 70 milisegundos. El orden no es
              decorativo: es el orden en que se lee. */}
          <div ref={detallePago} style={{ display: "contents" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--fw-text)" }}>{tr("payment.confirmed")}</div>
          <div style={{ color: "var(--fw-text-3)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
            {tr("payment.confirmedNote")}
          </div>
          <div style={{ ...s.card, textAlign: "left" }}>
            {vehicleLabel && <Row label={tr("payment.vehicle")} value={vehicleLabel} />}
            {startDate && <Row label={tr("payment.from")} value={longDate(startDate, lang)} />}
            {endDate && <Row label={tr("payment.to")} value={longDate(endDate, lang)} />}
            <Row label={tr("payment.days")} value={days} />
            {deposit != null && <Row label={tr("payment.heldDeposit")} value={money(deposit)} />}
            <div style={s.totalRow}><span>{tr("payment.totalPaid")}</span><span>{money(total)}</span></div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ padding: "12px 28px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
            <button style={{ padding: "12px 28px", background: "transparent", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)", borderRadius: 10, fontSize: 14, cursor: "pointer" }} onClick={() => navigate("/")}>{tr("common.goHome")}</button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.title}>{tr("payment.title")}</div>
      <div style={s.sub}>{tr("payment.sub")}</div>

      {hasFailed && (
        <div style={s.error}>{tr("payment.lastRejected")}</div>
      )}
      {error && <div ref={cartelError} style={s.error}>{error}</div>}
      {aviso && <div style={s.aviso}>{aviso}</div>}

      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "var(--fw-text)" }}>{tr("payment.summary")}</div>
        {vehicleLabel && <Row label={tr("payment.vehicle")} value={vehicleLabel} />}
        {startDate && <Row label={tr("payment.from")} value={longDate(startDate, lang)} />}
        {endDate && <Row label={tr("payment.to")} value={longDate(endDate, lang)} />}
        <Row label={tr("payment.days")} value={days} />
        {booking?.pricePerDaySnapshot != null && (
          <Row label={`${money(booking.pricePerDaySnapshot)} x ${days} ${tr(days === 1 ? "common.day" : "common.days")}`}
            value={money(booking.rentalSubtotalSnapshot ?? booking.pricePerDaySnapshot * days)} />
        )}
        {commission != null && <Row label={tr("car.fee")} value={money(commission)} />}
        {insurance != null && <Row label={tr("payment.insurance")} value={money(insurance)} />}
        <div style={s.totalRow}><span>Total</span><span style={{ color: "var(--fw-blue)" }}>{money(total)}</span></div>
      </div>

      {/*
        LOS TRES TRAMOS, CON EL TURNO MARCADO.

        Cada renglón dice en qué está: pagado (verde con tilde), EL QUE SIGUE
        (azul, resaltado, el único que el botón de abajo va a cobrar) o todavía
        no le toca (gris apagado). Antes los tres se veían iguales hasta que se
        pagaba todo junto y los tres se ponían verdes a la vez, así que el
        renglón no informaba nada: era una lista de lo que decía la factura.
      */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "var(--fw-text)" }}>{tr("payment.howToPay")}</div>
        <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 14 }}>
          {tr("payment.orderNote")}
        </div>
        {tramos.map((t, i) => {
          const esElTurno = tramoActual?.kind === t.kind;
          const fondo = t.hecho ? "var(--fw-green-bg)" : esElTurno ? "var(--fw-blue-bg)" : "var(--fw-surface-2)";
          const linea = t.hecho ? "var(--fw-green-line)" : esElTurno ? "var(--fw-blue-line)" : "var(--fw-line-soft)";
          const tinta = t.hecho ? "var(--fw-green-text-2)" : esElTurno ? "var(--fw-blue-text)" : "var(--fw-text-4)";
          return (
            <div key={t.kind} style={{ ...s.step, background: fondo, border: `1px solid ${linea}` }}>
              <span style={{ color: tinta, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {/* El número del paso: dice que hay un orden, sin escribirlo. */}
                <span style={{ ...s.paso, borderColor: linea, color: tinta }}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  {tr(t.label)}
                  {esElTurno && <strong style={{ display: "block", fontSize: 11.5 }}>{tr("payment.stepNow")}</strong>}
                  {!t.hecho && !esElTurno && <span style={{ display: "block", fontSize: 11.5 }}>{tr("payment.stepLater")}</span>}
                  {t.rechazado && <span style={{ display: "block", fontSize: 11.5, color: "var(--fw-red-text-2)" }}>{tr("payment.stepRejected")}</span>}
                </span>
              </span>
              <strong style={{ color: tinta, flexShrink: 0 }}>
                {money(t.monto)}{t.hecho ? " ✓" : ""}
              </strong>
            </div>
          );
        })}
        <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 10 }}>
          {tr("payment.depositNote")}
        </div>
      </div>

      {/*
        CON QUÉ SE PAGA.

        Tres estados y no uno: sin tarjeta vinculada se vincula acá mismo —no
        tiene sentido mandar a otra pantalla a quien ya está pagando—, con
        tarjeta se muestra cuál es y abajo los campos de Stripe, y si no hay
        clave cargada la pantalla lo dice en vez de dibujar un formulario que no
        lleva a ningún lado.
      */}
      {hayPasarela() && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "var(--fw-text)" }}>{tr("pago.conQuePagas")}</div>

          {tarjeta && !cambiandoTarjeta && (
            <div style={s.tarjetaFila}>
              <MarcaDeTarjeta marca={tarjeta.marca} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>{comoSeLee(tarjeta)}</div>
                <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 2 }}>
                  {tarjeta.nombre} · {tr("tarjeta.vence", { fecha: vencimientoComoSeLee(tarjeta) })}
                </div>
              </div>
              <button type="button" style={s.cambiar} onClick={() => setCambiandoTarjeta(true)}>{tr("pago.cambiarTarjeta")}</button>
            </div>
          )}

          {(!tarjeta || cambiandoTarjeta) ? (
            <>
              <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 14 }}>
                {tr("pago.vinculaPrimero")}
              </div>
              <FormularioTarjeta
                textoBoton={tr("tarjeta.vincular")}
                onCancelar={tarjeta ? () => setCambiandoTarjeta(false) : null}
                onGuardar={(ficha) => {
                  agregarTarjeta(user?.id, ficha);
                  setCambiosDeTarjeta(n => n + 1);
                  setCambiandoTarjeta(false);
                }}
              />
            </>
          ) : (
            <>
              <CamposDeStripe onListo={setPasarela} marcaEsperada={tarjeta?.marca} />
              {/* Por qué se piden los datos en cada cobro, explicado donde
                  aparece la pregunta y no en un archivo de ayuda. */}
              <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 10, lineHeight: 1.6 }}>
                {tr("pago.porQueDeNuevo")}
              </div>
            </>
          )}
        </div>
      )}

      <div style={s.info}>
        {/* Con la clave de prueba cargada se dice CÓMO probar: sin la tarjeta
            de prueba a mano, "modo de prueba" no le sirve a nadie. */}
        {tr(hayPasarela()
          ? (esModoPrueba() ? "pago.modoPrueba" : "pago.cobroReal")
          : "payment.demoNote")}
      </div>

      {/*
        UN BOTÓN, UN TRAMO. Dice cuál está por pagar y cuánto, no el total: el
        total es lo que va a costar el alquiler entero, no lo que se debita al
        apretar. El depósito se AUTORIZA, no se cobra, y por eso tiene su propio
        verbo: decir "Pagar el depósito" sería mentir sobre a dónde va la plata.
      */}
      <button data-fw-accion
        style={paying || !tramoActual ? s.payBtnDisabled : s.payBtn}
        disabled={paying || !tramoActual}
        onClick={() => handlePay(tramoActual?.kind)}>
        {/* "Procesando" y "esperando la confirmación" son dos momentos
            distintos, y el segundo puede tardar unos segundos con la tarjeta ya
            debitada: decir siempre "procesando" haría pensar que se colgó. */}
        {esperando ? tr("pago.esperandoConfirmacion") : paying ? tr("payment.processing") : tramoActual
          ? `${tr(tramoActual.kind === "DEPOSIT_HOLD" ? "payment.holdIt" : "bookings.pay")} ${tr(tramoActual.label)} · ${money(tramoActual.monto)}`
          : tr("payment.nothingDue")}
      </button>
      <div style={s.secureNote}>{tr("payment.serverAmounts")}</div>
      {/*
        Forzar el rechazo solo existe contra un servidor en modo simulación.
        Con Stripe configurado el servidor lo rechaza con un 403, así que el
        botón sería una trampa: se aprieta, sale un error, y el error no tiene
        nada que ver con lo que se quiso hacer. Para probar un rechazo de verdad
        están las tarjetas de prueba de Stripe, que rechazan de verdad.
      */}
      {!hayPasarela() && (
        <button style={s.failBtn} disabled={paying || !tramoActual}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--fw-red-text-2)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--fw-text-4)"; }}
          onClick={() => handleFail(tramoActual?.kind)}>{tr("payment.simulateReject")}</button>
      )}
    </div>
  );
}
