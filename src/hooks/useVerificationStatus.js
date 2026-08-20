// ============================================================================
//  useVerificationStatus — el estado real de la verificación, siempre al día
// ----------------------------------------------------------------------------
//  GET /verification/me/status es EL dato que gobierna toda la verificación: dice
//  qué ítems del checklist están cumplidos, si el teléfono es obligatorio hoy y
//  cómo terminó la última revisión. Este hook lo trae y se ocupa de que no quede
//  viejo, que es donde estaban los dos problemas:
//
//  1) EL VEREDICTO PUEDE LLEGAR DESPUÉS. Casi siempre viene en la respuesta del
//     envío, pero cuando la revisión automática no puede decidir, la solicitud
//     queda en la cola de un administrador y el resultado aparece más tarde. Sin
//     consultar de nuevo, la pantalla se queda diciendo "estamos revisando" para
//     siempre aunque la cuenta ya esté aprobada.
//
//  2) CONSULTAR DE MÁS TAMBIÉN ROMPE. El límite de la API es de 120 pedidos por
//     minuto POR IP, compartido con el resto de la app. Un `setInterval` de un
//     segundo se lo come solo y hace fallar la navegación.
//
//  El equilibrio: se consulta al montar, al volver a la pestaña, y cada 30
//  segundos SOLO mientras hay una solicitud pendiente. Si la pestaña está oculta
//  no se consulta nada —nadie está mirando—, y a los 10 minutos sin novedad el
//  reloj se apaga: a esa altura el veredicto depende de una persona y va a tardar
//  horas, no segundos. Volver a la pestaña lo vuelve a encender.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { getVerificationStatus } from "../services/api";

const CADA = 30_000;            // entre consulta y consulta, con algo pendiente
const SE_CANSA_A_LOS = 10 * 60_000;  // deja de insistir solo

/** ¿Hay una solicitud esperando veredicto? Es lo único que justifica el reloj. */
export const estaPendiente = (status) => status?.lastReview?.outcome === "pending";

/**
 * Devuelve { status, cargando, refrescar, aplicar }.
 *
 * `refrescar` vuelve a consultar a mano (después de guardar datos, de enviar los
 * documentos o de confirmar el teléfono). `aplicar` guarda un estado que ya vino
 * en la respuesta de otra llamada —confirm y review-retry devuelven este mismo
 * objeto— y así se evita un pedido de más.
 */
export function useVerificationStatus({ activo = true } = {}) {
  const [status, setStatus] = useState(null);
  const [cargando, setCargando] = useState(activo);

  // Cuándo se empezó a esperar, para poder cansarse. Vive en una ref porque
  // cambiarlo no tiene que redibujar nada, y se inicializa en el efecto de montaje
  // y no acá: leer el reloj durante el dibujado da un valor distinto en cada
  // render y React pide que eso no pase.
  const desde = useRef(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    desde.current = Date.now();
    return () => { vivo.current = false; };
  }, []);

  const refrescar = useCallback(async () => {
    if (!activo) return null;
    // Un fallo de red acá no es una pantalla de error: es un dato que no se pudo
    // refrescar. Se conserva el anterior y se vuelve a intentar en la próxima.
    const fresco = await getVerificationStatus().catch(() => null);
    if (!vivo.current) return null;
    if (fresco) setStatus(fresco);
    setCargando(false);
    return fresco;
  }, [activo]);

  /** Guarda un estado que ya llegó por otra vía, sin pedirlo de nuevo. */
  const aplicar = useCallback((fresco) => {
    if (!fresco || !vivo.current) return;
    setStatus(fresco);
    setCargando(false);
    desde.current = Date.now();
  }, []);

  // Primera carga y vuelta a la pestaña. Volver al foco es el momento más
  // probable de que algo haya cambiado: la persona estuvo en el mail buscando un
  // código, o se fue y volvió al rato.
  useEffect(() => {
    if (!activo) return undefined;
    // La regla apunta a los `setState` que corren en el mismo tick del efecto y
    // encadenan renders. Acá el estado se toca DESPUÉS de que conteste la red, que
    // es el caso que la regla no puede distinguir estáticamente: traer el dato al
    // montar es el motivo de existir del hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refrescar();

    const alVolver = () => {
      if (document.visibilityState === "visible") {
        desde.current = Date.now();   // hay alguien mirando: vale la pena insistir
        refrescar();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [activo, refrescar]);

  // El reloj, solo mientras haya algo pendiente que mirar.
  useEffect(() => {
    if (!activo || !estaPendiente(status)) return undefined;

    const reloj = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - desde.current > SE_CANSA_A_LOS) return;
      refrescar();
    }, CADA);
    return () => clearInterval(reloj);
  }, [activo, status, refrescar]);

  return { status, cargando, refrescar, aplicar };
}
