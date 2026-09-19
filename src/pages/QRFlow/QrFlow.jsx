// ============================================================================
//  QRFlow — Retiro y devolución del auto con QR / token
// ----------------------------------------------------------------------------
//  Es el momento en que el auto cambia de manos, y funciona como el código de
//  un envío: uno MUESTRA su código y el otro lo CONFIRMA.
//
//   · RETIRO:     el conductor muestra su QR  →  el DUEÑO lo confirma.
//   · DEVOLUCIÓN: el dueño muestra su QR      →  el CONDUCTOR lo confirma.
//
//  Cada uno ve solo lo que le toca, porque el backend entrega a cada parte
//  únicamente su token y solo en el estado correcto de la reserva.
//
//  Qué se arregló acá: la pantalla existía pero no estaba enlazada en la app (la
//  ruta /qr/:id no existía, así que el botón de "Mis reservas" no llevaba a
//  ninguna parte), leía los tokens con nombres de campo que el backend no
//  devuelve, y le mostraba a los dos usuarios el mismo formulario.
//
//  ─────────────────────────────────────────────────────────────────────────
//  Y SE ARREGLÓ LO QUE HACÍA QUE ESTO NO SE PUDIERA USAR.
//
//  El código de entrega son CUARENTA Y OCHO caracteres hexadecimales: el
//  servidor lo arma con 24 bytes al azar. Algo así:
//
//      9f3c7a12bd48e05f6c2a19b7e4d30f8a5c61be27d94af083
//
//  Y la única forma de pasarlo de una persona a la otra era este campo de
//  texto: parados al lado del auto, uno leyendo del teléfono del otro,
//  escribiendo cuarenta y ocho caracteres sin equivocarse en ninguno. Porque
//  equivocarse en uno solo da el mismo error que inventarlo entero.
//
//  Había un QR dibujado ahí arriba, que era la respuesta a ese problema... y
//  nada que lo leyera. Ahora sí: se abre la cámara, se apunta, y se confirma
//  solo (components/EscanerQR). El campo de texto sigue estando como salida de
//  emergencia —puede no haber luz, la pantalla del otro puede estar rota—, y
//  al lado del código hay un botón para copiarlo y mandarlo por el chat, que es
//  lo que hace que esa salida sirva para algo.
// ============================================================================
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getBookingTokens, confirmPickup, confirmReturn, getBookingById } from "../../services/api";
import { normalizarCodigoEscrito } from "../../services/escaner";
import EscanerQR from "../../components/EscanerQR";
import CodigoQR from "../../components/CodigoQR";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import { useCelebracion, useSacudida } from "../../anim";

const s = {
  page: { maxWidth: 480, margin: "0 auto", padding: "40px 24px", textAlign: "center" },
  pageMobile: { maxWidth: 480, margin: "0 auto", padding: "20px 16px", textAlign: "center" },
  title: { fontSize: 22, fontWeight: 800, color: "var(--fw-text)", marginBottom: 6 },
  sub: { fontSize: 14, color: "var(--fw-text-3)", marginBottom: 28 },
  qrBox: { background: "var(--fw-surface)", border: "1px solid var(--fw-border)", borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  tokenDisplay: { background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)", borderRadius: 10, padding: "10px 16px", fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 1.5, color: "var(--fw-text)", marginBottom: 12, wordBreak: "break-all" },
  tokenLabel: { fontSize: 12, color: "var(--fw-text-4)", marginBottom: 6 },
  // Gris y no rojo, a propósito: el rojo dice "algo salió mal, hacé algo", y
  // acá no hay nada que hacer ni nada que salió mal. El auto volvió.
  pendiente: {
    background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
    borderRadius: 10, padding: 14, fontSize: 13, color: "var(--fw-text-2)",
    marginBottom: 20, textAlign: "left", lineHeight: 1.6,
  },
  input: { width: "100%", padding: "12px 16px", border: "1.5px solid var(--fw-border)", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  btn: { width: "100%", padding: "14px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  btnDisabled: { width: "100%", padding: "14px", background: "var(--fw-blue-line)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "var(--fw-blue-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  errorBox: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 10, padding: 12, fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  infoBox: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-blue-line)", borderRadius: 10, padding: 12, fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 },
  tabRow: { display: "flex", gap: 4, marginBottom: 20, background: "var(--fw-bg)", borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  /*
    EL BOTÓN DE LA CÁMARA ES EL BOTÓN PRINCIPAL, Y EL DE CONFIRMAR A MANO PASÓ
    A SER EL SECUNDARIO.

    Los dos hacen lo mismo, pero uno funciona y el otro pide escribir cuarenta y
    ocho caracteres hexadecimales. Que el que funciona sea el azul lleno no es
    una preferencia estética: es lo que hace que la gente lo use.
  */
  btnCamara: {
    width: "100%", padding: "14px", background: "var(--fw-blue)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
    fontFamily: "inherit", cursor: "pointer", marginBottom: 12,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  },
  btnSuave: {
    width: "100%", padding: "13px", background: "transparent", color: "var(--fw-text-2)",
    border: "1.5px solid var(--fw-border)", borderRadius: 10, fontSize: 14,
    fontFamily: "inherit", fontWeight: 600, cursor: "pointer", marginBottom: 10,
  },
  oSino: {
    fontSize: 12, color: "var(--fw-text-4)", textAlign: "center", marginBottom: 10,
  },
  copiar: {
    background: "none", border: "none", padding: "0 0 12px", fontFamily: "inherit",
    fontSize: 12.5, color: "var(--fw-blue-text)", cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 2,
  },
};

export default function QRFlow() {
  const { t: tr } = useI18n();
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [mode, setMode] = useState(searchParams.get("mode") === "return" ? "return" : "pickup");
  const [booking, setBooking] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  /*
    LA DEVOLUCIÓN QUEDÓ HECHA Y LA PLATA NO. No es un error y no se pinta como
    uno: el auto volvió, el alquiler terminó, y lo que falta es que se suelte
    el depósito y que le llegue al dueño. Callarlo sería peor, porque quien
    devolvió el auto se queda esperando un depósito que no aparece.
  */
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState(null);
  /*
    LA ENTREGA DEL AUTO ES EL MOMENTO MÁS FÍSICO DE TODO EL ALQUILER: las dos
    personas están una frente a la otra, una mostrando el código en su teléfono
    y la otra escribiéndolo. El tilde que se dibuja es lo que las dos miran para
    saber que quedó hecho, y a un brazo de distancia un texto que cambia no se
    ve.

    La sacudida del código equivocado va por lo mismo: un código mal copiado es
    lo más común que puede pasar ahí, y el mensaje de error es siempre el mismo,
    así que sin el contador el segundo intento fallido no movería nada. Ver
    anim/index.js.
  */
  const [intento, setIntento] = useState(0);
  // La cámara abierta encima de la pantalla. Se cierra sola al leer.
  const [escaneando, setEscaneando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const cartelError = useSacudida(error ? `${intento}:${error}` : "");
  const { icono: iconoEntrega } = useCelebracion(confirmed);

  // Trae la reserva y los tokens que le corresponden a este usuario.
  const load = () => {
    setLoading(true);
    Promise.all([getBookingById(bookingId), getBookingTokens(bookingId).catch(() => null)])
      .then(([b, t]) => { setBooking(b); setTokens(t); })
      .catch((err) => setError(err.message || tr("qr.loadFailed")))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [bookingId]);

  const isOwner = booking?.ownerId === user?.id;

  // Quién confirma cada paso: el retiro lo confirma el dueño (con el token del
  // conductor) y la devolución la confirma el conductor (con el token del dueño).
  const iConfirm = mode === "pickup" ? isOwner : !isOwner;

  // El token propio a mostrar: el conductor tiene el de retiro y el dueño el de
  // devolución. El backend solo lo entrega en el estado correcto de la reserva.
  const myToken = mode === "pickup" ? tokens?.pickupQrToken : tokens?.returnQrToken;

  /**
   * Confirma la entrega con un código.
   *
   * El código entra por parámetro y no se lee del estado, porque el escáner
   * confirma en el mismo momento en que lee: guardarlo primero y confirmar
   * después mandaría el valor ANTERIOR —React no actualiza el estado en el
   * acto— y el primer escaneo siempre fallaría.
   */
  const handleConfirm = async (codigo = tokenInput) => {
    // Se limpia antes de mandarlo: un código pegado del chat se trae espacios y
    // saltos de línea, y rechazarlo por eso sería inventar un error.
    const limpio = normalizarCodigoEscrito(codigo);
    if (!limpio) { setError(tr("qr.errEmpty")); setIntento(n => n + 1); return; }
    setEscaneando(false);
    setConfirming(true);
    setError(null);
    try {
      if (mode === "pickup") {
        await confirmPickup(bookingId, limpio);
      } else {
        /*
          LA DEVOLUCIÓN Y LA PLATA SON DOS COSAS.

          Al confirmar la devolución el servidor también suelta el depósito y
          le transfiere al dueño, y eso puede fallar por su cuenta —el caso
          más común es el dueño que todavía no terminó el alta de cobros—.
          Antes eso volvía como un error y esta pantalla mostraba "error del
          servidor" sobre una devolución que YA había quedado hecha: se
          recargaba y estaba todo listo. Dos pantallas diciendo cosas
          distintas sobre lo mismo.

          Ahora el servidor contesta bien y avisa aparte que la liquidación
          quedó pendiente. El auto volvió; lo que falta es plata, y eso se
          dice sin llamarlo error.
        */
        const r = await confirmReturn(bookingId, limpio);
        if (r?.settlement && r.settlement.ok === false) setPendiente(true);
      }
      setConfirmed(true);
    } catch (err) {
      setError(err.message || tr("qr.errBadCode"));
      setIntento(n => n + 1);
    } finally {
      setConfirming(false);
    }
  };

  /**
   * Copiar el código propio, para mandarlo por el chat.
   *
   * Es lo que hace que escribirlo a mano deje de ser imposible: cuarenta y ocho
   * caracteres no se dictan, pero pegados en el chat llegan enteros. Es la
   * salida cuando la cámara no está disponible.
   */
  const copiarCodigo = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles —o sin HTTPS— el código sigue estando
      // a la vista para seleccionarlo a mano. No hay nada que avisar.
    }
  };

  if (loading) return <Spinner block label={tr("common.loading")} />;

  if (!booking) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--fw-text-3)" }}>
      {error || tr("qr.notFound")}
      <br />
      <button onClick={() => navigate("/my-bookings")} style={{ marginTop: 16, padding: "10px 24px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>{tr("nav.bookings")}</button>
    </div>
  );

  if (confirmed) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div ref={iconoEntrega} style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#0f6ce6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div style={s.title}>{tr(mode === "pickup" ? "qr.pickupDone" : "qr.returnDone")}</div>
        <div style={s.sub}>
          {tr(mode === "pickup" ? "qr.pickupDoneNote" : "qr.returnDoneNote")}
        </div>
        {pendiente && <div style={s.pendiente}>{tr("qr.liquidacionPendiente")}</div>}
        <button style={{ padding: "12px 28px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
      </div>
    );
  }

  const vehicle = booking?.listing?.vehicle || booking?.vehicle || {};

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      {/*
        LA CÁMARA, ENCIMA DE TODO.

        Se dibuja acá y no adentro de la tarjeta de confirmar porque ocupa la
        pantalla entera: adentro de un contenedor con `overflow` quedaría
        recortada. Al leer confirma en el mismo momento —handleConfirm recibe el
        código, no lo busca en el estado— y eso es lo que hace que escanear sea
        un solo gesto y no "escanear y después apretar confirmar".
      */}
      {escaneando && (
        <EscanerQR
          onLeido={(codigo) => handleConfirm(codigo)}
          onCerrar={() => setEscaneando(false)}
          onAMano={() => setEscaneando(false)}
        />
      )}

      <div style={s.title}>{tr(mode === "pickup" ? "qr.pickupTitle" : "qr.returnTitle")}</div>
      <div style={s.sub}>
        {`${vehicle.brand || ""} ${vehicle.model || ""}`.trim()}
        {" — "}
        {tr(iConfirm ? "qr.askCode" : "qr.showCode")}
      </div>

      <div style={s.tabRow}>
        {[["pickup", "qr.pickup"], ["return", "qr.return"]].map(([k, l]) => (
          <button key={k} style={{ ...s.tab, background: mode === k ? "var(--fw-surface)" : "transparent", color: mode === k ? "var(--fw-blue)" : "var(--fw-text-3)", boxShadow: mode === k ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}
            onClick={() => { setMode(k); setError(null); setTokenInput(""); }}>{tr(l)}</button>
        ))}
      </div>

      {/* MI CÓDIGO — solo para quien tiene que mostrarlo */}
      {!iConfirm && (
        myToken ? (
          <div style={s.qrBox}>
            <div style={{ fontSize: 13, color: "var(--fw-text-3)", marginBottom: 12, fontWeight: 600 }}>
              {tr(mode === "pickup" ? "qr.myPickupQr" : "qr.myReturnQr")}
            </div>
            <CodigoQR token={myToken} />
            <div style={s.tokenLabel}>{tr("qr.code")}</div>
            <div style={s.tokenDisplay}>{myToken}</div>
            {/* Cuarenta y ocho caracteres no se dictan. Pegados en el chat
                llegan enteros, y por eso este botón es lo que hace que
                escribirlo a mano sea una salida de verdad y no un adorno. */}
            <button type="button" style={s.copiar} onClick={() => copiarCodigo(myToken)}>
              {tr(copiado ? "qr.copiado" : "qr.copiar")}
            </button>
            <div style={{ fontSize: 12, color: "var(--fw-text-4)" }}>
              {tr(mode === "pickup" ? "qr.showToOwner" : "qr.showToDriver")}
            </div>
          </div>
        ) : (
          <div style={s.infoBox}>
            {tr("qr.noCodeYet")}
            {" "}{tr(mode === "pickup" ? "qr.noCodePickup" : "qr.noCodeReturn")}
          </div>
        )
      )}

      {/* CONFIRMAR — solo para quien tiene que confirmar */}
      {iConfirm && (
        <div style={{ ...s.qrBox, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--fw-text)", marginBottom: 6 }}>
            {tr(mode === "pickup" ? "qr.confirmPickup" : "qr.confirmReturn")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginBottom: 12 }}>
            {tr(mode === "pickup" ? "qr.enterDriverCode" : "qr.enterOwnerCode")}
          </div>

          {/*
            LA CÁMARA VA PRIMERO, Y ARRIBA.

            Es el camino que funciona: el de abajo pide escribir cuarenta y ocho
            caracteres. Al revés —el campo de texto arriba y la cámara como un
            enlace al pie— todo el mundo empieza a tipear, se equivoca, y recién
            entonces busca otra forma.
          */}
          <button type="button" style={s.btnCamara} disabled={confirming} onClick={() => { setError(null); setEscaneando(true); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M3 9V7a2 2 0 0 1 2-2h2M3 15v2a2 2 0 0 0 2 2h2M21 9V7a2 2 0 0 0-2-2h-2M21 15v2a2 2 0 0 1-2 2h-2M7 12h10"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tr("qr.escanear")}
          </button>
          <div style={s.oSino}>{tr("qr.oEscribilo")}</div>

          <input style={s.input} placeholder={tr("qr.phCode")} value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()} />
          {error && <div ref={cartelError} style={s.errorBox}>{error}</div>}
          <button style={confirming ? s.btnDisabled : s.btnSuave} disabled={confirming} onClick={() => handleConfirm()}>
            {confirming ? tr("car.confirming") : tr(mode === "pickup" ? "qr.confirmPickup" : "qr.confirmReturn")}
          </button>
        </div>
      )}

      {/* El mismo ref que el de arriba: los dos carteles nunca se dibujan a la
          vez —uno es para quien confirma y el otro para quien muestra el
          código—, así que siempre apunta al único que existe. */}
      {!iConfirm && error && <div ref={cartelError} style={s.errorBox}>{error}</div>}

      <button style={{ padding: "10px 0", background: "transparent", border: "none", color: "var(--fw-blue)", fontSize: 13, fontWeight: 600, cursor: "pointer" }} onClick={load}>
        {tr("qr.refresh")}
      </button>
      <br />
      <button style={{ padding: "10px 0", background: "transparent", border: "none", color: "var(--fw-text-4)", fontSize: 13, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("qr.backToBookings")}</button>
    </div>
  );
}
