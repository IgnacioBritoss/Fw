// ============================================================================
//  useRevisionDeDocumentos — Esperar a que terminen de leer el DNI y la licencia
// ----------------------------------------------------------------------------
//  El envío de los documentos ya no trae el veredicto: contesta enseguida y la
//  lectura sigue corriendo del lado del servidor unos diez segundos. Así que
//  después de enviar hay que VOLVER A PREGUNTAR hasta que termine.
//
//  Este gancho es esa espera, y nada más: pregunta, decide si sigue, reintenta
//  una vez lo que se pueda reintentar y avisa cuando no queda nada por esperar.
//  Las decisiones de "¿sigo?" y "¿qué significa esto?" viven en
//  services/revisionDocumentos.js, que se prueba sin navegador.
//
//  ── LO QUE HAY QUE HACER BIEN ACÁ ─────────────────────────────────────────
//
//  1. PARAR SIEMPRE. Un intervalo que no se apaga sigue pegándole al servidor
//     después de que la persona se fue de la pantalla. Se corta al desmontar, al
//     terminar y al llegar al tope.
//  2. NO ESCRIBIR DESPUÉS DE IRSE. Si la respuesta llega cuando el componente ya
//     no está, guardar el resultado avisa por consola y no sirve para nada.
//  3. REINTENTAR UNA SOLA VEZ POR DOCUMENTO. El servicio lee de a uno: insistir
//     le saca el turno a otra persona.
//  4. UN TOPE. La lectura ronda los diez segundos; dos minutos es holgadísimo y
//     está para el caso en que el servicio se cuelgue y no conteste nunca. Sin
//     tope, la pantalla giraría para siempre.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { getMyIdentity, retryDocumentAnalysis } from "../services/api";
import { CADA_MS, TOPE_MS, enAnalisis, faltaReintentar } from "../services/revisionDocumentos";

export function useRevisionDeDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [revisando, setRevisando] = useState(false);
  /** Se llegó al tope sin que terminara. No es un error: es "seguí vos". */
  const [agotado, setAgotado] = useState(false);

  const vivo = useRef(true);
  const reloj = useRef(null);
  /*
    La vuelta siguiente se agenda a través de un ref y no llamando a `mirar` por
    su nombre. Es la forma de que una función se vuelva a agendar a sí misma sin
    quedar atrapada en la versión vieja de sí misma: el temporizador guarda el
    ref, no la función, así que siempre corre la última.
  */
  const siguiente = useRef(null);
  const reintentados = useRef([]);
  const desde = useRef(0);

  const parar = useCallback(() => {
    clearTimeout(reloj.current);
    reloj.current = null;
  }, []);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; parar(); };
  }, [parar]);

  /**
   * Una vuelta: preguntar, reintentar lo que corresponda y decidir si sigue.
   *
   * Se encadena con setTimeout y no con setInterval a propósito: así la próxima
   * consulta sale tres segundos DESPUÉS de que contestó la anterior, y no cada
   * tres segundos pase lo que pase. Con un servidor lento, un intervalo apila
   * pedidos encima de pedidos.
   */
  const mirar = useCallback(async () => {
    let docs = [];
    try {
      docs = await getMyIdentity();
    } catch {
      /*
        Una consulta que falló no corta la espera: puede ser un corte de un
        segundo. Se vuelve a intentar en la próxima vuelta, y el tope se encarga
        de que esto no sea para siempre.
      */
      docs = null;
    }
    if (!vivo.current) return;
    if (docs) setDocumentos(docs);

    // El reintento de la lectura, una sola vez por documento.
    for (const documento of faltaReintentar(docs, reintentados.current)) {
      reintentados.current.push(documento.type);
      try {
        await retryDocumentAnalysis(String(documento.type).toLowerCase());
      } catch {
        // Si no se podía reintentar el servidor contesta 400 y ya está: queda el
        // motivo a la vista y el botón de pedir revisión manual.
      }
      if (!vivo.current) return;
    }

    const sigue = docs ? enAnalisis(docs) : true;
    const pasado = Date.now() - desde.current;

    if (!sigue) { setRevisando(false); parar(); return; }
    if (pasado >= TOPE_MS) { setRevisando(false); setAgotado(true); parar(); return; }

    reloj.current = setTimeout(() => siguiente.current?.(), CADA_MS);
  }, [parar]);

  useEffect(() => { siguiente.current = mirar; }, [mirar]);

  /** Arranca la espera. Se llama justo después de enviar los documentos. */
  const empezar = useCallback(() => {
    parar();
    reintentados.current = [];
    desde.current = Date.now();
    setAgotado(false);
    setRevisando(true);
    mirar();
  }, [mirar, parar]);

  /** Trae el estado una sola vez, sin quedarse esperando. */
  const traer = useCallback(async () => {
    try {
      const docs = await getMyIdentity();
      if (vivo.current && docs) {
        setDocumentos(docs);
        // Si se entra a la pantalla con una lectura a medio camino, se espera:
        // es exactamente la misma situación que después de enviar.
        if (enAnalisis(docs)) empezar();
      }
      return docs;
    } catch { return null; }
  }, [empezar]);

  return { documentos, revisando, agotado, empezar, traer };
}
