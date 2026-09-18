// ============================================================================
//  CodigoQR — El QR de la entrega, dibujado ACÁ
// ----------------------------------------------------------------------------
//  ── POR QUÉ DEJÓ DE PEDIRSELO A OTRO ──────────────────────────────────────
//  El QR se traía como una imagen de api.qrserver.com: se armaba una dirección
//  con el código adentro y el navegador la descargaba. Funcionaba, y era una
//  línea de código.
//
//  El problema es DÓNDE se usa. Este QR es el momento en que el auto cambia de
//  manos: dos personas paradas en la calle, una mostrando la pantalla y la otra
//  apuntándole la cámara. Ahí, un servicio gratuito de un tercero es una
//  dependencia con todas las formas de fallar juntas —puede estar caído, puede
//  tardar, puede estar bloqueado por la red del lugar, puede cambiar sus
//  condiciones— y cuando falla no queda un QR más feo: no queda ninguno, y el
//  escáner que hay del otro lado se queda mirando una pantalla vacía.
//
//  Ahora se dibuja en el navegador. Es el mismo QR, sale instantáneo, funciona
//  sin señal, y no hay un tercero enterándose de los códigos de entrega de
//  todos los alquileres —que es lo que pasaba: cada código viajaba a un
//  servidor ajeno adentro de la dirección de una imagen—.
//
//  La librería se baja aparte y solo en esta pantalla (el `await import`): el
//  resto de la aplicación no la descarga.
//
//  Si algo falla igual, queda el servicio de antes como respaldo, y abajo
//  siempre está el código en texto: esa parte no depende de nada.
// ============================================================================
import { useEffect, useRef, useState } from "react";

const LADO = 190;

export default function CodigoQR({ token }) {
  const lienzo = useRef(null);
  // "propio" mientras se dibuja acá; "ajeno" si hubo que recurrir al respaldo.
  const [origen, setOrigen] = useState("propio");

  useEffect(() => {
    if (!token) return;
    let vivo = true;

    (async () => {
      try {
        const { default: QRCode } = await import("qrcode");
        if (!vivo || !lienzo.current) return;
        await QRCode.toCanvas(lienzo.current, token, {
          width: LADO,
          margin: 1,
          /*
            Blanco y negro puros, y un margen de un módulo.

            No es estética: un QR con poco contraste o pegado al borde de su
            caja no se lee, y del otro lado hay una cámara a medio metro con la
            luz que haya. El "margen" del QR (la zona muda) es parte del código,
            no un espacio decorativo: sin él, el lector no encuentra dónde
            empieza.
          */
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch {
        if (vivo) setOrigen("ajeno");
      }
    })();

    return () => { vivo = false; };
  }, [token]);

  if (!token) return null;

  const comun = { width: LADO, height: LADO, borderRadius: 10, display: "block", margin: "0 auto 12px", background: "#fff" };

  if (origen === "ajeno") {
    return (
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=${LADO}x${LADO}&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=000000&qzone=1`}
        alt=""
        style={comun}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }

  return <canvas ref={lienzo} width={LADO} height={LADO} style={comun} />;
}
