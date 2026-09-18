// ============================================================================
//  EscanerQR — La cámara leyendo el código de entrega
// ----------------------------------------------------------------------------
//  Se abre encima de la pantalla de entrega, lee el QR que la otra persona está
//  mostrando en su teléfono, y se cierra sola cuando lo encontró.
//
//  ── POR QUÉ ESTO NO ES UN AGREGADO LINDO ──────────────────────────────────
//  El código de entrega son cuarenta y ocho caracteres hexadecimales. La
//  pantalla tenía un campo de texto para escribirlo, parado al lado del auto,
//  leyendo del teléfono del otro. Nadie puede hacer eso sin equivocarse, y
//  equivocarse en uno solo de los cuarenta y ocho da exactamente el mismo error
//  que inventarlo. La cámara no es otra manera de entregar el auto: es la
//  única que funciona.
//
//  ── CÓMO LEE, Y POR QUÉ DE DOS MANERAS ────────────────────────────────────
//  Si el navegador trae lector de códigos adentro (BarcodeDetector: Chrome en
//  Android, Edge) se usa ese, que es el del sistema operativo y gasta menos
//  batería. Si no lo trae —Safari, o sea TODOS los navegadores del iPhone, que
//  por dentro son Safari— se baja uno escrito en JavaScript.
//
//  El de repuesto se baja SOLO cuando hace falta y recién cuando alguien
//  aprieta "escanear": es la librería más pesada del proyecto y quien nunca
//  usa la cámara no descarga un byte de ella. Eso es lo que hace el
//  `await import("jsqr")` de más abajo, y es la razón por la que está ahí
//  adentro y no arriba con los demás import.
//
//  La cámara se apaga SIEMPRE al cerrar. Una pestaña que deja la luz verde
//  prendida después de que uno cerró el escáner es lo que hace que la próxima
//  vez nadie le dé permiso.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import {
  restriccionesDeCamara, motorDeLectura, motivoDelFallo,
  tokenDelCodigo, esCodigoNuevo,
} from "../services/escaner";

const s = {
  fondo: {
    /*
      El fondo es OPACO, no una cortina semitransparente.

      Con un 8% de transparencia se seguían viendo la barra de arriba y el
      contenido de atrás como un fantasma, justo encima de una imagen de cámara
      que es lo único que hay que mirar. Y hay un motivo más importante: esto se
      usa parado al lado del auto, muchas veces al sol, donde cualquier cosa que
      le reste contraste a la pantalla se paga en segundos buscando el QR.
    */
    position: "fixed", inset: 0, zIndex: 3000, background: "#0b0d12",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: 16,
  },
  marco: {
    position: "relative", width: "min(88vw, 420px)", aspectRatio: "1",
    borderRadius: 18, overflow: "hidden", background: "#000",
  },
  video: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  /*
    EL RECUADRO DE PUNTERÍA.

    No hace nada técnico: el lector mira el cuadro entero. Está porque sin una
    marca en la pantalla, todo el mundo acerca el teléfono hasta pegarlo al
    otro, y un QR más cerca del foco mínimo se ve borroso y no se lee nunca. El
    recuadro dice "poné el código acá adentro", que es a la distancia a la que
    la cámara enfoca.
  */
  punteria: {
    position: "absolute", inset: "14%", borderRadius: 14,
    boxShadow: "0 0 0 100vmax rgba(8,10,14,.45)", border: "2px solid rgba(255,255,255,.9)",
    pointerEvents: "none",
  },
  texto: { color: "#fff", fontSize: 14, textAlign: "center", marginTop: 18, maxWidth: 420, lineHeight: 1.6 },
  aviso: { color: "#ffd9d9", fontSize: 13, textAlign: "center", marginTop: 10, maxWidth: 420, lineHeight: 1.6 },
  botones: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "center" },
  boton: {
    padding: "11px 20px", borderRadius: 10, border: "none", background: "var(--fw-blue)",
    color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
  },
  botonSuave: {
    padding: "11px 20px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.35)",
    background: "transparent", color: "#fff", fontSize: 14, fontFamily: "inherit", cursor: "pointer",
  },
};

/**
 * @param onLeido   se llama UNA vez con el código, cuando lo encuentra.
 * @param onCerrar  cerrar sin leer nada.
 * @param onAMano   "prefiero escribirlo": la salida para cuando la cámara no
 *                  está disponible. Siempre tiene que haber uno.
 */
export default function EscanerQR({ onLeido, onCerrar, onAMano }) {
  const { t: tr } = useI18n();
  const video = useRef(null);
  const lienzo = useRef(null);
  const [estado, setEstado] = useState("abriendo");   // abriendo | mirando | fallo
  const [motivo, setMotivo] = useState(null);
  // "Estoy leyendo un QR, pero no es un código de entrega": pasa apuntando a
  // cualquier otro QR, y decirlo evita que alguien se quede esperando a que
  // pase algo con un código que no va a servir nunca.
  const [otroQr, setOtroQr] = useState(false);

  // La misma referencia que en CamposDeStripe y por el mismo motivo: el padre
  // manda una función nueva en cada dibujado, y ponerla en las dependencias
  // apagaría y prendería la cámara todo el tiempo.
  const avisar = useRef(onLeido);
  useEffect(() => { avisar.current = onLeido; });

  useEffect(() => {
    /*
      El nodo del video se guarda ACÁ, al arrancar, y no se lee de la
      referencia al limpiar.

      Para cuando corre la limpieza, la referencia puede estar apuntando a otra
      cosa o a nada —React ya desmontó el elemento— así que apagarle el video
      "a la referencia" puede no apagar nada. Lo que hay que soltar es el nodo
      que se prendió, que es este.
    */
    const nodoVideo = video.current;
    let vivo = true;
    let flujo = null;
    let reloj = null;
    let detector = null;
    let leerConLibreria = null;
    let ocupado = false;          // el lector nativo es asincrónico: sin esto
    let ultimo = null;            // se pisan dos lecturas y se lee dos veces

    const mirar = async () => {
      if (ocupado || !vivo) return;
      const v = video.current;
      const c = lienzo.current;
      // `readyState < 2` es la cámara todavía sin el primer cuadro: dibujarla
      // ahí da un rectángulo negro y el lector se pone a buscar un QR adentro.
      if (!v || !c || v.readyState < 2 || !v.videoWidth) return;
      ocupado = true;
      try {
        const ancho = v.videoWidth;
        const alto = v.videoHeight;
        c.width = ancho;
        c.height = alto;
        const pincel = c.getContext("2d", { willReadFrequently: true });
        pincel.drawImage(v, 0, 0, ancho, alto);

        let leido = null;
        if (detector) {
          const encontrados = await detector.detect(c).catch(() => []);
          leido = encontrados[0]?.rawValue || null;
        } else if (leerConLibreria) {
          const imagen = pincel.getImageData(0, 0, ancho, alto);
          leido = leerConLibreria(imagen.data, ancho, alto, { inversionAttempts: "dontInvert" })?.data || null;
        }
        if (!vivo) return;

        const codigo = tokenDelCodigo(leido);
        // Un QR que se lee pero no es de acá: se avisa y se sigue mirando.
        setOtroQr(Boolean(leido) && !codigo);
        if (esCodigoNuevo(codigo, ultimo)) {
          ultimo = codigo;
          avisar.current?.(codigo);
        }
      } finally {
        ocupado = false;
      }
    };

    const arrancar = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) throw new TypeError("sin getUserMedia");
        flujo = await navigator.mediaDevices.getUserMedia(restriccionesDeCamara());
        // Si cerraron mientras el navegador preguntaba por el permiso, la
        // cámara ya está prendida y hay que apagarla acá: si no, queda la luz
        // verde encendida sobre una pantalla que ya no existe.
        if (!vivo) return;
        nodoVideo.srcObject = flujo;
        // `playsInline` está en el JSX: sin eso, iOS abre el video en pantalla
        // completa y tapa la aplicación entera con su propio reproductor.
        await nodoVideo.play();

        if (motorDeLectura() === "nativo") {
          detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        } else {
          const libreria = await import("jsqr");
          leerConLibreria = libreria.default;
        }
        if (!vivo) return;
        setEstado("mirando");
        // Cuatro o cinco miradas por segundo. Más seguido no lee antes —la
        // cámara no entrega cuadros más rápido— y calienta el teléfono.
        reloj = setInterval(mirar, 220);
      } catch (fallo) {
        if (!vivo) return;
        setMotivo(motivoDelFallo(fallo));
        setEstado("fallo");
      }
    };

    arrancar();

    return () => {
      vivo = false;
      if (reloj) clearInterval(reloj);
      // Apagar la cámara es lo único de esta limpieza que se nota desde afuera,
      // y es lo que hace que la próxima vez alguien vuelva a dar permiso.
      for (const pista of flujo?.getTracks() || []) pista.stop();
      if (nodoVideo) nodoVideo.srcObject = null;
    };
  }, []);

  return (
    <div style={s.fondo} role="dialog" aria-modal="true" aria-label={tr("qr.escanear")}>
      {estado !== "fallo" ? (
        <>
          <div style={s.marco}>
            <video ref={video} style={s.video} muted playsInline autoPlay />
            <div style={s.punteria} />
          </div>
          <canvas ref={lienzo} style={{ display: "none" }} />
          <div style={s.texto}>
            {tr(estado === "abriendo" ? "qr.abriendoCamara" : "qr.apuntaAlCodigo")}
          </div>
          {otroQr && <div style={s.aviso}>{tr("qr.otroQr")}</div>}
        </>
      ) : (
        <div style={{ ...s.texto, maxWidth: 380 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{tr("qr.errCamaraTitulo")}</div>
          {tr(motivo || "qr.errCamara")}
        </div>
      )}

      <div style={s.botones}>
        {/* Escribirlo a mano es la salida de emergencia y tiene que estar
            siempre, incluso con la cámara andando: puede no haber luz, el
            teléfono del otro puede tener la pantalla rota, puede pasar
            cualquier cosa. */}
        {onAMano && <button type="button" style={s.botonSuave} onClick={onAMano}>{tr("qr.escribirAMano")}</button>}
        <button type="button" style={s.boton} onClick={onCerrar}>{tr("common.cancel")}</button>
      </div>
    </div>
  );
}
