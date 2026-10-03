// ============================================================================
//  CobrosDelDueno — Si el dueño de un auto puede recibir su plata
// ----------------------------------------------------------------------------
//  Dos rutas del servidor que estaban hechas y el front no llamaba nunca:
//  GET /payments/connect/status y POST /payments/connect/onboarding.
//
//  Lo que resuelven está explicado en services/cobros.js. En corto: sin el
//  alta completa con Stripe, el dueño no puede recibir transferencias, y eso
//  recién se descubre al confirmar la devolución del auto —o sea al final de
//  todo—, cuando la reserva ya está cerrada y no hay nada que hacer.
//
//  ── ESTA PANTALLA NUNCA DICE "NO VAS A COBRAR" SIN SABERLO ────────────────
//  Si la consulta falla —el servidor sin el cobro configurado, la red que se
//  cayó un segundo— se muestra que no se pudo preguntar y nada más. Asustar a
//  alguien sobre su plata por una consulta que no salió es peor que no decir
//  nada, y es la misma regla que el resto de la app: sin dato no se bloquea.
//
//  ── NI PONE EN ROJO UN PROBLEMA QUE NO ES DE QUIEN LO LEE ─────────────────
//  Cuando Connect no está habilitado en la cuenta de Stripe de la plataforma,
//  el servidor contesta STRIPE_CONNECT_NOT_ENABLED. Eso no es un error de
//  quien está mirando la pantalla: es una casilla sin tildar de nuestro lado,
//  y no hay nada que pueda hacer al respecto.
//
//  Así que va en ámbar y no en rojo —el rojo dice "hiciste algo mal"— y el
//  botón desaparece, porque volver a apretarlo falla exactamente igual. Es la
//  misma regla que la revisión de documentos, donde está escrita en una
//  prueba: un problema NUESTRO no genera ningún botón.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/core";
import { getConnectStatus, createConnectOnboarding } from "../services/api";
import { estadoDeCobro } from "../services/cobros";
import Spinner from "./Spinner";

const s = {
  caja: {
    border: "1px solid var(--fw-border)", borderRadius: 12, padding: 18,
    background: "var(--fw-surface)",
  },
  fila: { display: "flex", alignItems: "flex-start", gap: 12 },
  titulo: { fontSize: 14.5, fontWeight: 700, color: "var(--fw-text)", marginBottom: 4 },
  detalle: { fontSize: 13, color: "var(--fw-text-3)", lineHeight: 1.6 },
  boton: {
    marginTop: 14, padding: "12px 18px", background: "var(--fw-blue)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
    fontFamily: "inherit", cursor: "pointer",
  },
  botonQuieto: { opacity: .6, cursor: "not-allowed" },
  error: {
    marginTop: 12, background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)",
    borderRadius: 10, padding: 12, fontSize: 12.5, color: "var(--fw-red-text-2)",
  },
  // Mismo recuadro, otro color: esto no se lee como "algo salió mal".
  aviso: {
    marginTop: 12, background: "var(--fw-amber-bg)", border: "1px solid var(--fw-amber-line)",
    borderRadius: 10, padding: 12, fontSize: 12.5, color: "var(--fw-amber-text)",
  },
};

/** Un punto de color: verde si la plata va a llegar, ámbar si falta algo. */
function Semaforo({ clave }) {
  const color = clave === "listo" ? "var(--fw-green)"
    : clave === "enRevision" ? "var(--fw-amber)"
      : clave === "desconocido" ? "var(--fw-text-4)"
        : "var(--fw-amber)";
  return (
    <span style={{
      width: 9, height: 9, borderRadius: "50%", background: color,
      flexShrink: 0, marginTop: 6,
    }} />
  );
}

export default function CobrosDelDueno({ onEstado }) {
  const { t: tr } = useI18n();
  const [respuesta, setRespuesta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState(null);
  /*
    El alta no está habilitada en la plataforma, no en esta cuenta.

    Se guarda aparte del mensaje porque cambia DOS cosas y no una: el color del
    recuadro y si el botón sigue estando. Guardarlo como un error más obligaba
    a mirar el texto para decidir eso, y el texto cambia el día que alguien lo
    reescribe.
  */
  const [sinConnect, setSinConnect] = useState(false);

  // Igual que en la pantalla de pago: el padre manda una función nueva en cada
  // dibujado, así que se avisa hacia afuera desde acá y no con un efecto que
  // dependa de ella.
  const avisar = useCallback((datos) => { onEstado?.(datos); }, [onEstado]);

  const mirar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await getConnectStatus();
      setRespuesta(datos);
      avisar(datos);
    } catch {
      // A propósito sin mensaje: "no se pudo preguntar" ya lo dice el estado
      // "desconocido", y un cartel rojo acá diría algo que no sabemos.
      setRespuesta(null);
      avisar(null);
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { mirar(); }, [mirar]);

  /**
   * Empieza o retoma el alta.
   *
   * La dirección que devuelve el servidor es de Stripe y dura poco, así que se
   * usa en el momento. Se va en la misma pestaña y no en una nueva: al
   * terminar, Stripe devuelve a /connect/return, que es una pantalla de acá, y
   * una pestaña aparte dejaría a la persona mirando la aplicación vieja sin
   * enterarse de que terminó.
   */
  const empezar = async () => {
    setYendo(true);
    setError(null);
    try {
      const { onboardingUrl } = await createConnectOnboarding();
      if (!onboardingUrl) throw new Error(tr("cobros.sinEnlace"));
      window.location.href = onboardingUrl;
    } catch (fallo) {
      // Se reconoce por el `code` y no por la frase, como en el resto de la
      // app: el texto del servidor cambia el día que alguien lo reescribe.
      setSinConnect(fallo.code === "STRIPE_CONNECT_NOT_ENABLED");
      setError(fallo.code === "PAYMENTS_NOT_CONFIGURED"
        ? tr("pago.servidorSinStripe")
        : fallo.message || tr("cobros.noArranco"));
      setYendo(false);
    }
  };

  if (cargando) return <div style={s.caja}><Spinner label={tr("common.loading")} /></div>;

  const estado = estadoDeCobro(respuesta);
  const puedeEmpezar = estado.clave === "sinCuenta" || estado.clave === "aMedias";

  return (
    <div style={s.caja}>
      <div style={s.fila}>
        <Semaforo clave={estado.clave} />
        <div style={{ minWidth: 0 }}>
          <div style={s.titulo}>{tr(`cobros.${estado.clave}.titulo`)}</div>
          <div style={s.detalle}>{tr(`cobros.${estado.clave}.detalle`)}</div>
        </div>
      </div>

      {/* Sin Connect habilitado el botón no va: apretarlo de nuevo falla igual,
          y dejarlo ahí es ofrecer una salida que no existe. */}
      {puedeEmpezar && !sinConnect && (
        <button type="button" style={{ ...s.boton, ...(yendo ? s.botonQuieto : {}) }}
          disabled={yendo} onClick={empezar}>
          {yendo ? tr("cobros.abriendo") : tr(estado.clave === "aMedias" ? "cobros.retomar" : "cobros.empezar")}
        </button>
      )}
      {estado.clave === "desconocido" && (
        <button type="button" style={{ ...s.boton, background: "transparent", color: "var(--fw-text-2)", border: "1.5px solid var(--fw-border)" }}
          onClick={mirar}>{tr("cobros.reintentar")}</button>
      )}
      {error && <div style={sinConnect ? s.aviso : s.error}>{error}</div>}
    </div>
  );
}
