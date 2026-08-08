// ============================================================================
//  AvatarEditor — Encuadrar la foto de perfil en el círculo
// ----------------------------------------------------------------------------
//  QUÉ RESUELVE: antes la foto elegida se subía tal cual y el círculo del avatar
//  la recortaba con `object-fit: cover`, o sea por el centro geométrico. En una
//  foto vertical —que es como sale casi cualquier foto de celular— eso corta la
//  cabeza y deja el pecho. La persona no tenía forma de arreglarlo salvo volver a
//  sacar la foto.
//
//  Ahora se elige el encuadre: se arrastra para mover y se acerca o aleja con la
//  barra (o con dos dedos / la rueda del mouse). Lo que se sube ya es el recorte
//  cuadrado, así que se ve bien en TODOS los círculos de la app sin depender de
//  cómo recorte cada uno.
//
//  DECISIONES:
//   · Se sube un cuadrado, no un círculo: el redondeo lo hace el CSS. Así la
//     misma foto sirve para un cuadrado si alguna vez hace falta, y no se
//     desperdicia con un PNG transparente que pesa el triple.
//   · 512×512 y JPEG al 90%: un avatar nunca se ve más grande que ~120 px, y a
//     512 aguanta pantallas retina de sobra. Una foto de celular de 4 MB queda
//     en unos 60 kB, así que sube al instante incluso con datos.
//   · La foto SIEMPRE tapa el cuadro: el arrastre está limitado para que no
//     pueda quedar un borde vacío. La cuenta está probada aparte.
//   · Un solo camino para mouse y dedo (Pointer Events) y `touch-action: none`,
//     que es lo que evita que arrastrar la foto haga scroll de la página en el
//     celular.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import { useIsMobile } from "../hooks/useIsMobile";

/** Lado del archivo que se sube. */
const SALIDA = 512;
const ZOOM_MAX = 4;

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

export default function AvatarEditor({ file, onCancel, onConfirm, busy = false }) {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();
  // El lado del cuadro donde se encuadra. En el celular, lo que entre.
  const lado = isMobile ? Math.min(268, Math.round(window.innerWidth - 88)) : 300;

  const [imagen, setImagen] = useState(null);   // el HTMLImageElement ya cargado
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // esquina de la foto, en px
  const arrastre = useRef(null);

  // Lee el archivo y lo carga como imagen para conocer su tamaño real.
  useEffect(() => {
    if (!file) return undefined;
    let vivo = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!vivo) return;
      setImagen(img);
      // Arranca centrada: es el encuadre que casi siempre sirve.
      const escala = Math.max(lado / img.naturalWidth, lado / img.naturalHeight);
      setPos({
        x: (lado - img.naturalWidth * escala) / 2,
        y: (lado - img.naturalHeight * escala) / 2,
      });
      setZoom(1);
    };
    img.onerror = () => { if (vivo) setError(tr("profile.photoNotImage")); };
    img.src = url;
    return () => { vivo = false; URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, lado]);

  const escala = imagen
    ? Math.max(lado / imagen.naturalWidth, lado / imagen.naturalHeight) * zoom
    : 1;
  const ancho = imagen ? imagen.naturalWidth * escala : 0;
  const alto = imagen ? imagen.naturalHeight * escala : 0;

  /** Deja la posición dentro de los límites: la foto nunca destapa el cuadro. */
  const acomodar = useCallback((p, w = ancho, h = alto) => ({
    x: limitar(p.x, lado - w, 0),
    y: limitar(p.y, lado - h, 0),
  }), [ancho, alto, lado]);

  // Al cambiar el zoom se conserva el CENTRO: si no, la foto se va para un lado
  // y hay que volver a acomodarla en cada paso de la barra.
  const cambiarZoom = (nuevo) => {
    const z = limitar(Number(nuevo), 1, ZOOM_MAX);
    if (!imagen) { setZoom(z); return; }
    const base = Math.max(lado / imagen.naturalWidth, lado / imagen.naturalHeight);
    const anchoNuevo = imagen.naturalWidth * base * z;
    const altoNuevo = imagen.naturalHeight * base * z;
    const centroX = (lado / 2 - pos.x) / ancho;
    const centroY = (lado / 2 - pos.y) / alto;
    setPos(acomodar(
      { x: lado / 2 - centroX * anchoNuevo, y: lado / 2 - centroY * altoNuevo },
      anchoNuevo, altoNuevo,
    ));
    setZoom(z);
  };

  // ── Arrastre: un solo camino para mouse y dedo ──
  const alBajar = (e) => {
    if (busy) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, desde: pos };
  };
  const alMover = (e) => {
    if (!arrastre.current) return;
    const d = arrastre.current;
    setPos(acomodar({
      x: d.desde.x + (e.clientX - d.x),
      y: d.desde.y + (e.clientY - d.y),
    }));
  };
  const alSoltar = () => { arrastre.current = null; };

  /**
   * Dibuja el recorte en un canvas y devuelve el archivo listo para subir.
   * La transformación es la misma que se ve en pantalla, escalada a 512.
   */
  const recortar = () => {
    const canvas = document.createElement("canvas");
    canvas.width = SALIDA;
    canvas.height = SALIDA;
    const ctx = canvas.getContext("2d");
    // Fondo blanco: si la foto es un PNG con transparencia, el JPEG sin esto la
    // rellena de negro.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SALIDA, SALIDA);
    const r = SALIDA / lado;
    ctx.drawImage(imagen, pos.x * r, pos.y * r, ancho * r, alto * r);
    return new Promise((resolver) => {
      canvas.toBlob(
        (blob) => resolver(new File([blob], "avatar.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.9,
      );
    });
  };

  const confirmar = async () => {
    if (!imagen || busy) return;
    onConfirm(await recortar());
  };

  const t = {
    fondo: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 2100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    },
    caja: {
      background: "#fff", borderRadius: 16, padding: isMobile ? 18 : 24,
      width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    },
    marco: {
      position: "relative", width: lado, height: lado, margin: "0 auto",
      overflow: "hidden", background: "#f3f4f6", borderRadius: 12,
      cursor: busy ? "default" : "grab", touchAction: "none", userSelect: "none",
    },
    boton: {
      flex: 1, padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700,
      cursor: busy ? "default" : "pointer", border: "none",
    },
  };

  return (
    <div style={t.fondo} onClick={busy ? undefined : onCancel}>
      <div style={t.caja} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 3 }}>
          {tr("profile.frameTitle")}
        </div>
        <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14 }}>
          {tr("profile.frameHint")}
        </div>

        <div
          style={t.marco}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onWheel={(e) => { e.preventDefault(); cambiarZoom(zoom - e.deltaY * 0.0015); }}
        >
          {imagen && (
            <img
              src={imagen.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute", left: pos.x, top: pos.y,
                width: ancho, height: alto, pointerEvents: "none",
              }}
            />
          )}
          {/*
            La máscara: todo lo de afuera del círculo se oscurece. Es un solo div
            con un borde gigante y `border-radius`, así no hace falta ni SVG ni
            clip-path (que en Safari viejo se porta distinto).
          */}
          <div
            style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              boxShadow: `0 0 0 ${lado}px rgba(255,255,255,.72)`,
              border: "2px solid #2563eb", pointerEvents: "none",
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 10 }}>{error}</div>
        )}

        {/* El zoom. `min=1` porque por debajo la foto no llegaría a tapar el círculo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em" }}>
            {tr("profile.frameZoom")}
          </span>
          <input
            type="range" min="1" max={ZOOM_MAX} step="0.02" value={zoom}
            disabled={busy || !imagen}
            onChange={(e) => cambiarZoom(e.target.value)}
            style={{ flex: 1, accentColor: "#2563eb" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="button" onClick={onCancel} disabled={busy}
            style={{ ...t.boton, background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151" }}
          >
            {tr("common.cancel")}
          </button>
          <button
            type="button" onClick={confirmar} disabled={busy || !imagen}
            style={{ ...t.boton, background: "#2563eb", color: "#fff", opacity: busy || !imagen ? .6 : 1 }}
          >
            {busy ? tr("common.saving") : tr("profile.frameSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
