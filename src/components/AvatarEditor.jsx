// ============================================================================
//  AvatarEditor — Encuadrar la foto de perfil
// ----------------------------------------------------------------------------
//  QUÉ RESUELVE: la foto elegida se subía tal cual y el círculo del avatar la
//  recortaba con `object-fit: cover`, o sea por el centro geométrico. En una foto
//  vertical —como sale cualquier foto de celular— eso corta la cabeza y deja el
//  pecho, y la persona no tenía forma de arreglarlo salvo volver a sacarla.
//
//  ── POR QUÉ ESTÁ REESCRITO ─────────────────────────────────────────────────
//  La primera versión de esta pantalla DEFORMABA la foto al acercarla, y el zoom
//  se sentía raro. La causa no estaba en la cuenta del encuadre: era una regla
//  de CSS global, en styles/theme.css:
//
//      img, video, canvas, svg { max-width: 100%; }
//
//  Esa regla existe para que ninguna imagen empuje la página a lo ancho, y está
//  bien que exista. Pero la foto se mostraba con un <img> de `width: ancho` y
//  `height: alto` en píxeles, y al acercar, `ancho` pasaba de los 300 px del
//  marco: el navegador le recortaba el ANCHO a 300 y le dejaba el ALTO como
//  estaba. Resultado: la foto se veía estirada para arriba, cada vez más a medida
//  que se acercaba. Y como el archivo que se subía se calculaba con el ancho
//  real (sin recortar), lo que se guardaba NO era lo que se veía.
//
//  ── CÓMO ESTÁ HECHO AHORA ──────────────────────────────────────────────────
//  1. La vista previa es un <canvas>, no un <img>: se dibuja con la MISMA
//     función y el MISMO recorte con los que después se genera el archivo. Lo
//     único distinto entre la previa y lo que se sube es la cantidad de píxeles.
//     Que la previa sea lo que queda ya no es algo que haya que cuidar: es la
//     misma cuenta corriendo dos veces.
//  2. El recorte es un CUADRADO de la foto original, y se dibuja en un destino
//     CUADRADO. Deformar es imposible por construcción, no por cuidado: no hay
//     ninguna cuenta que pueda estirar un lado sin el otro.
//  3. El encuadre se guarda en fracciones de la foto (centro 0..1 + zoom), no en
//     píxeles de pantalla. Así el tamaño del marco —que en el celular depende del
//     ancho de la pantalla— no puede desincronizarse del encuadre al rotar el
//     teléfono ni al abrir el teclado.
//
//  OTRAS DECISIONES
//   · Se sube un cuadrado y el redondeo lo hace el CSS: la misma foto sirve para
//     un cuadrado si alguna vez hace falta, y no se desperdicia en un PNG
//     transparente que pesa el triple.
//   · Hasta 512 px y JPEG al 90%: un avatar no se ve más grande que ~120 px, y a
//     512 aguanta pantallas retina de sobra. Una foto de celular de 4 MB queda en
//     unos 60 kB. Y NUNCA se agranda: si el recorte tiene 300 px, se guardan 300,
//     porque estirarlo a 512 solo agranda el desenfoque y el archivo.
//   · El zoom tiene un techo que depende de la foto: no se puede acercar tanto
//     que el recorte quede con menos de 160 px del original.
//   · Un solo camino para mouse y dedo (Pointer Events), arrastre y pinza de dos
//     dedos, y `touch-action: none`, que es lo que evita que mover la foto haga
//     scroll de la página en el celular.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import PhotoVisibilityChoice from "./PhotoVisibilityChoice";

/** Lado máximo del archivo que se sube. */
const SALIDA_MAX = 512;
/** Píxeles mínimos del original que tiene que quedar dentro del recorte. */
const MINIMO_ORIGINAL = 160;
/** Lado de la vista previa redonda de al lado (el tamaño real de un avatar). */
const MUESTRA = 44;

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/** Hasta dónde se deja acercar esta foto en particular. */
function zoomMaximo(imagen) {
  const menor = Math.min(imagen.naturalWidth, imagen.naturalHeight);
  return limitar(menor / MINIMO_ORIGINAL, 1.2, 4);
}

/**
 * El recorte, en píxeles de la foto ORIGINAL. Siempre un cuadrado.
 *
 * `centro` viene en fracciones (0..1) y se acota para que el cuadrado no se salga
 * de la foto: así nunca queda un borde vacío.
 */
function recorteDe(imagen, zoom, centro) {
  const menor = Math.min(imagen.naturalWidth, imagen.naturalHeight);
  const lado = menor / zoom;
  const mitad = lado / 2;
  const x = limitar(
    centro.x * imagen.naturalWidth,
    mitad,
    imagen.naturalWidth - mitad,
  );
  const y = limitar(
    centro.y * imagen.naturalHeight,
    mitad,
    imagen.naturalHeight - mitad,
  );
  return { x: x - mitad, y: y - mitad, lado };
}

/** Lleva un centro en píxeles de la foto a fracciones ya acotadas. */
function acomodar(imagen, zoom, centroPx) {
  const menor = Math.min(imagen.naturalWidth, imagen.naturalHeight);
  const mitad = menor / zoom / 2;
  return {
    x:
      limitar(centroPx.x, mitad, imagen.naturalWidth - mitad) /
      imagen.naturalWidth,
    y:
      limitar(centroPx.y, mitad, imagen.naturalHeight - mitad) /
      imagen.naturalHeight,
  };
}

/**
 * Dibuja el recorte en un cuadrado de `size` píxeles.
 *
 * ÉSTA es la única función que dibuja: la usa la vista previa y la usa el archivo
 * que se sube. Los dos argumentos que cambian entre una cosa y la otra son el
 * contexto y el tamaño; el recorte es exactamente el mismo objeto.
 */
function dibujar(ctx, size, imagen, recorte) {
  // Fondo blanco: si la foto es un PNG con transparencia, el JPEG sin esto la
  // rellena de negro.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imagen,
    recorte.x,
    recorte.y,
    recorte.lado,
    recorte.lado,
    0,
    0,
    size,
    size,
  );
}

/**
 * Lado del marco en pantalla. Solo afecta cómo se ve, no el encuadre.
 *
 * Mira el ALTO además del ancho: en un teléfono corto, un marco de 300 px dejaba
 * los botones de Cancelar y Usar esta foto abajo del borde de la pantalla.
 */
function ladoDeVista() {
  if (typeof window === "undefined") return 300;
  return Math.max(
    170,
    Math.min(300, window.innerWidth - 88, window.innerHeight - 400),
  );
}

const medioDe = (puntos) => ({
  x: puntos.reduce((s, p) => s + p.x, 0) / puntos.length,
  y: puntos.reduce((s, p) => s + p.y, 0) / puntos.length,
});

const distanciaDe = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);

export default function AvatarEditor({
  file,
  onCancel,
  onConfirm,
  busy = false,
  visibility = "EVERYONE",
}) {
  const { t: tr } = useI18n();

  const [imagen, setImagen] = useState(null); // el HTMLImageElement ya cargado
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  // El centro del recorte, en fracciones de la foto. Arranca en el medio.
  const [centro, setCentro] = useState({ x: 0.5, y: 0.5 });
  const [lado, setLado] = useState(ladoDeVista);
  // Quién va a poder ver esta foto. Se elige ACÁ, en el mismo momento de ponerla:
  // que la decisión esté escondida en otra pantalla es lo mismo que no darla.
  const [quienLaVe, setQuienLaVe] = useState(visibility);

  const lienzo = useRef(null);
  const muestra = useRef(null);
  // Los dedos (o el mouse) apoyados ahora, y el estado al empezar el gesto.
  const punteros = useRef(new Map());
  const gesto = useRef(null);

  // ── Cargar el archivo ──
  useEffect(() => {
    if (!file) return undefined;
    let vivo = true;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!vivo) return;
      setImagen(img);
      setZoom(1);
      setCentro({ x: 0.5, y: 0.5 });
    };
    img.onerror = () => {
      if (vivo) setError(tr("profile.photoNotImage"));
    };
    img.src = url;
    // La URL no se libera acá: el <img> sigue siendo la fuente de los dibujos
    // mientras el editor esté abierto. Se libera al desmontar.
    return () => {
      vivo = false;
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // El marco se adapta al ancho de la pantalla. Como el encuadre está guardado en
  // fracciones, cambiar de tamaño acá no lo mueve ni un píxel.
  useEffect(() => {
    const alCambiar = () => setLado(ladoDeVista());
    window.addEventListener("resize", alCambiar);
    window.addEventListener("orientationchange", alCambiar);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.removeEventListener("orientationchange", alCambiar);
    };
  }, []);

  const zMax = imagen ? zoomMaximo(imagen) : 4;
  const recorte = useMemo(
    () => (imagen ? recorteDe(imagen, zoom, centro) : null),
    [imagen, zoom, centro],
  );

  // ── Dibujar: el marco grande y la muestra redonda del tamaño real ──
  useEffect(() => {
    if (!imagen || !recorte) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);

    // Se comparan LOS DOS lados antes de asignar: tocar canvas.width o .height
    // borra el dibujo, así que solo se hace cuando de verdad cambió el tamaño.
    // Y hay que mirar el alto además del ancho: un <canvas> sin atributos arranca
    // en 300x150, o sea que con un marco de 300 px el ancho ya coincidía y el alto
    // se quedaba en 150. El recorte cuadrado se dibujaba entonces en un lienzo
    // apaisado y la foto salía estirada para arriba: el mismo síntoma que tenía la
    // versión anterior, por otro motivo.
    const medir = (canvas, px) => {
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      return px;
    };

    const grande = lienzo.current;
    if (grande) {
      const px = medir(grande, Math.round(lado * dpr));
      dibujar(grande.getContext("2d"), px, imagen, recorte);
    }

    const chica = muestra.current;
    if (chica) {
      const px = medir(chica, Math.round(MUESTRA * dpr));
      dibujar(chica.getContext("2d"), px, imagen, recorte);
    }
  }, [imagen, recorte, lado]);

  /**
   * Aplica un gesto: cuánto se movió en pantalla y a qué zoom se llegó.
   * `dx`/`dy` están en píxeles de PANTALLA y se pasan a píxeles de la foto con la
   * proporción del recorte de arranque; mover el dedo a la derecha corre la foto
   * a la derecha, o sea el recorte a la izquierda.
   */
  const aplicarGesto = useCallback(
    (zoomInicial, centroInicial, dx, dy, zoomNuevo) => {
      if (!imagen) return;
      const menor = Math.min(imagen.naturalWidth, imagen.naturalHeight);
      const factor = menor / zoomInicial / lado;
      const centroPx = {
        x: centroInicial.x * imagen.naturalWidth - dx * factor,
        y: centroInicial.y * imagen.naturalHeight - dy * factor,
      };
      setZoom(zoomNuevo);
      setCentro(acomodar(imagen, zoomNuevo, centroPx));
    },
    [imagen, lado],
  );

  /** Toma una foto del estado actual para medir el gesto contra ella. */
  const anclarGesto = useCallback(() => {
    const activos = [...punteros.current.values()];
    if (activos.length === 0) {
      gesto.current = null;
      return;
    }
    gesto.current = {
      zoom,
      centro,
      puntos: activos.map((p) => ({ ...p })),
      medio: medioDe(activos),
      distancia: activos.length >= 2 ? distanciaDe(activos) : 0,
    };
  }, [zoom, centro]);

  const alBajar = (e) => {
    if (busy || !imagen) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anclarGesto();
  };

  const alMover = (e) => {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    const activos = [...punteros.current.values()];

    // Pinza: dos dedos cambian el zoom por la proporción entre las distancias, y
    // el punto medio sigue moviendo la foto.
    if (activos.length >= 2 && g.distancia > 0) {
      const z = limitar(
        (g.zoom * distanciaDe(activos)) / g.distancia,
        1,
        zMax,
      );
      const medio = medioDe(activos);
      aplicarGesto(g.zoom, g.centro, medio.x - g.medio.x, medio.y - g.medio.y, z);
      return;
    }

    const [p] = activos;
    const [q] = g.puntos;
    if (!p || !q) return;
    aplicarGesto(g.zoom, g.centro, p.x - q.x, p.y - q.y, g.zoom);
  };

  const alSoltar = (e) => {
    punteros.current.delete(e.pointerId);
    // Si quedaba un dedo apoyado, el gesto sigue desde donde está: sin volver a
    // anclar, soltar un dedo de la pinza hacía saltar la foto.
    anclarGesto();
  };

  /** Cambia el zoom sin mover el centro (la barra y la rueda del mouse). */
  const cambiarZoom = useCallback(
    (valor) => {
      if (!imagen) return;
      const z = limitar(Number(valor), 1, zMax);
      setZoom(z);
      setCentro(
        acomodar(imagen, z, {
          x: centro.x * imagen.naturalWidth,
          y: centro.y * imagen.naturalHeight,
        }),
      );
    },
    [imagen, zMax, centro],
  );

  // La rueda del mouse, con un listener puesto a mano y NO pasivo.
  //
  // Con `onWheel` de React no alcanza: React registra el listener de la rueda como
  // pasivo, así que `preventDefault()` no tiene efecto (el navegador avisa
  // "Unable to preventDefault inside passive event listener") y acercar la foto
  // con la rueda además hacía scroll de la página de atrás.
  const marcoRef = useRef(null);
  useEffect(() => {
    const nodo = marcoRef.current;
    if (!nodo) return undefined;
    const alGirar = (e) => {
      e.preventDefault();
      cambiarZoom(zoom - e.deltaY * 0.0015);
    };
    nodo.addEventListener("wheel", alGirar, { passive: false });
    return () => nodo.removeEventListener("wheel", alGirar);
  }, [cambiarZoom, zoom]);

  /** Genera el archivo con el mismo recorte que se está viendo. */
  const recortar = () =>
    new Promise((resolver) => {
      // Nunca se agranda: si el recorte tiene menos de 512 px, se guarda como es.
      const salida = Math.max(
        1,
        Math.min(SALIDA_MAX, Math.round(recorte.lado)),
      );
      const canvas = document.createElement("canvas");
      canvas.width = salida;
      canvas.height = salida;
      dibujar(canvas.getContext("2d"), salida, imagen, recorte);
      canvas.toBlob(
        (blob) => resolver(new File([blob], "avatar.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.9,
      );
    });

  const confirmar = async () => {
    if (!imagen || busy) return;
    onConfirm(await recortar(), quienLaVe);
  };

  const s = {
    fondo: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.55)",
      zIndex: 2100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    caja: {
      background: "var(--fw-surface)",
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 380,
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      // Si la pantalla es muy baja, la tarjeta se desplaza en vez de dejar los
      // botones afuera. `overscrollBehavior` evita que al llegar al final se
      // empiece a mover la página de atrás.
      maxHeight: "100%",
      overflowY: "auto",
      overscrollBehavior: "contain",
    },
    marco: {
      position: "relative",
      width: lado,
      height: lado,
      margin: "0 auto",
      overflow: "hidden",
      background: "var(--fw-bg)",
      borderRadius: 12,
      cursor: busy ? "default" : "grab",
      touchAction: "none",
      userSelect: "none",
    },
    boton: {
      flex: 1,
      padding: "11px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 700,
      cursor: busy ? "default" : "pointer",
      border: "none",
    },
  };

  return (
    <div style={s.fondo} onClick={busy ? undefined : onCancel}>
      <div style={s.caja} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fw-text)", marginBottom: 3 }}>
          {tr("profile.frameTitle")}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginBottom: 14 }}>
          {tr("profile.frameHint")}
        </div>

        <div
          ref={marcoRef}
          style={s.marco}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          {/* El lienzo: ya es el recorte final, no la foto entera.
              `maxWidth: none` es a propósito y es LO QUE ARREGLA la deformación
              vieja: la regla global `canvas { max-width: 100% }` no tiene que
              opinar sobre el tamaño de este lienzo. */}
          <canvas
            ref={lienzo}
            style={{
              display: "block",
              width: lado,
              height: lado,
              maxWidth: "none",
              pointerEvents: "none",
            }}
          />
          {/*
            La máscara: se oscurece todo lo que queda afuera del círculo. Es un
            solo div con un borde gigante y `border-radius`, así no hace falta ni
            SVG ni clip-path (que en Safari viejo se porta distinto).
          */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: `0 0 0 ${lado}px rgba(255,255,255,.72)`,
              border: "2px solid var(--fw-blue)",
              pointerEvents: "none",
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12.5, color: "var(--fw-red-text-2)", marginTop: 10 }}>{error}</div>
        )}

        {/* El zoom. `min=1` porque por debajo la foto no llegaría a tapar el círculo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fw-text-4)", letterSpacing: ".06em" }}>
            {tr("profile.frameZoom")}
          </span>
          <input
            type="range"
            min="1"
            max={zMax}
            step="0.01"
            value={zoom}
            disabled={busy || !imagen}
            onChange={(e) => cambiarZoom(e.target.value)}
            style={{ flex: 1, accentColor: "var(--fw-blue)" }}
          />
        </div>

        {/* La muestra del tamaño real. No es una promesa: es el mismo dibujo del
            marco de arriba, con menos píxeles. */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 16 }}>
          <canvas
            ref={muestra}
            style={{
              display: "block",
              width: MUESTRA,
              height: MUESTRA,
              maxWidth: "none",
              borderRadius: "50%",
              flexShrink: 0,
              background: "var(--fw-bg)",
            }}
          />
          <div style={{ fontSize: 12, color: "var(--fw-text-3)", lineHeight: 1.45 }}>
            {tr("profile.framePreview")}
          </div>
        </div>

        {/* Quién la va a ver. Va acá, junto a la foto, y no solo en el perfil:
            poner una foto y elegir quién la ve son la misma decisión. */}
        <div style={{ borderTop: "1px solid var(--fw-line-soft)", marginTop: 16, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fw-text-4)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 9 }}>
            {tr("profile.photoWho")}
          </div>
          <PhotoVisibilityChoice value={quienLaVe} onChange={setQuienLaVe} disabled={busy} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{ ...s.boton, background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)" }}
          >
            {tr("common.cancel")}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={busy || !imagen}
            style={{ ...s.boton, background: "var(--fw-blue)", color: "#fff", opacity: busy || !imagen ? 0.6 : 1 }}
          >
            {busy ? tr("common.saving") : tr("profile.frameSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
