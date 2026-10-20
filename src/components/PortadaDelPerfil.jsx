// ============================================================================
//  PortadaDelPerfil — La franja de arriba del perfil, y su encuadre
// ----------------------------------------------------------------------------
//  Dibuja la portada (el diseño elegido, o la foto si hay una) y, cuando está
//  abierto el editor, DEJA ARRASTRAR LA FOTO para elegir qué parte se ve.
//
//  ── POR QUÉ UN COMPONENTE Y NO UN DIV EN LA PÁGINA ────────────────────────
//  Porque encuadrar necesita dos medidas que solo existen en pantalla: cuánto
//  mide la franja y cuánto mide la foto de verdad. Con eso se calcula cuánta
//  imagen queda afuera, y recién entonces arrastrar 30px corre la foto 30px.
//  Esa cuenta, metida en Profile.jsx, sería cincuenta líneas de medición en el
//  medio de una página que ya es larga.
//
//  ── POR QUÉ SE ARRASTRA Y NO SE RECORTA CON UN EDITOR ─────────────────────
//  La foto de perfil sí tiene editor de recorte, porque ahí se elige un
//  cuadrado de una foto cualquiera y hace falta ver el antes y el después. Acá
//  la franja ya está a la vista, en su tamaño real y en su lugar: arrastrar
//  sobre ella es ver el resultado mientras se decide. Un editor aparte sería
//  elegir el encuadre mirando una ventana que no es la portada.
//
//  El teclado y el ajuste fino van por los dos deslizadores del editor
//  (EditorDePortada), que mueven exactamente lo mismo.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/core";
import {
  fondoDePortada,
  moverEncuadre,
  sobranteDeLaFoto,
} from "../services/portadaDePerfil";

export default function PortadaDelPerfil({
  dibujo, color, foto, x, y, alto,
  ajustable = false, onMover, onSoltar, children,
}) {
  const { t: tr } = useI18n();
  const caja = useRef(null);
  const arrastre = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  /*
    CUÁNTO MIDE LA FOTO DE VERDAD.

    Se pide con una imagen aparte y no leyendo el elemento, porque la portada es
    un `background-image` y un fondo no tiene medidas que consultar. El
    navegador no la descarga dos veces: es la misma dirección y ya está en su
    caché.

    `vivo` corta la carrera: cambiar de foto dos veces seguidas dejaba que
    contestara primero la vieja y la portada se encuadraba con la medida
    equivocada.

    LA MEDIDA SE GUARDA JUNTO CON LA DIRECCIÓN que midió, y abajo se usa solo
    si es la de la foto de ahora. Así, el rato que va entre cambiar de foto y
    que la nueva termine de cargar no se encuadra con las medidas de la
    anterior: simplemente no se puede arrastrar todavía, que es la verdad.
  */
  const [medido, setMedido] = useState(null);
  useEffect(() => {
    if (!foto) return undefined;
    let vivo = true;
    const img = new Image();
    img.onload = () => {
      if (vivo) setMedido({ foto, ancho: img.naturalWidth, alto: img.naturalHeight });
    };
    // Una foto que no carga deja la portada sin encuadre y con el color de
    // fondo: no se puede encuadrar lo que no se pudo medir, y es mejor que
    // quedar esperando para siempre.
    img.onerror = () => { if (vivo) setMedido(null); };
    img.src = foto;
    return () => { vivo = false; };
  }, [foto]);

  const natural = medido?.foto === foto ? medido : null;

  /*
    CUÁNTO MIDE LA FRANJA.

    En estado y no leyendo la referencia en cada dibujo: React no se entera de
    que una referencia cambió, así que la primera vuelta —cuando todavía no hay
    elemento— se quedaría con cero y nunca volvería a medir. El resultado era
    que el cartel de "arrastrá" no aparecía nunca.

    Se vuelve a medir al cambiar de tamaño la ventana porque la franja es más
    baja en celular, y girar el teléfono cambia las dos medidas de golpe.
  */
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  useEffect(() => {
    const medir = () => {
      const el = caja.current;
      if (el) setMedida({ ancho: el.offsetWidth, alto: el.offsetHeight });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [alto]);

  const sobrante = sobranteDeLaFoto(natural, medida);
  // Una foto que entra justa —o que todavía no se midió— no se puede encuadrar.
  // Sin esta comprobación el cursor diría "arrastrame" y no pasaría nada.
  const sePuede = ajustable && !!foto && (sobrante.x > 0 || sobrante.y > 0);

  const empezar = (e) => {
    if (!sePuede) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastre.current = { px: e.clientX, py: e.clientY, desde: { x, y } };
    setArrastrando(true);
  };

  /*
    El movimiento se mide SIEMPRE CONTRA EL PUNTO DONDE EMPEZÓ, no contra el
    último evento. Sumando pasito a pasito, cada redondeo a entero se queda con
    una fracción, y en un arrastre largo la foto va quedando atrás del dedo.
  */
  const mover = (e) => {
    const desde = arrastre.current;
    if (!desde) return;
    const nuevo = moverEncuadre(
      desde.desde,
      { x: e.clientX - desde.px, y: e.clientY - desde.py },
      sobrante,
    );
    onMover?.(nuevo.x, nuevo.y);
  };

  const terminar = () => {
    if (!arrastre.current) return;
    arrastre.current = null;
    setArrastrando(false);
    onSoltar?.();
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={caja}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        style={{
          ...fondoDePortada(dibujo, color, foto, { x, y }),
          height: alto,
          cursor: sePuede ? (arrastrando ? "grabbing" : "grab") : "default",
          // Sin esto, en el celular el dedo arrastra la PÁGINA y la portada se
          // queda quieta: el navegador se queda con el gesto antes de que
          // lleguen los eventos.
          touchAction: sePuede ? "none" : "auto",
          // Arrastrar sobre una imagen la selecciona y queda celeste.
          userSelect: sePuede ? "none" : "auto",
        }}
      />

      {/*
        EL CARTELITO DE "ARRASTRÁ".

        Que una franja se pueda arrastrar no se ve: no hay ninguna manija, y el
        cursor recién lo dice cuando el mouse ya está encima —y en el celular no
        hay cursor—. Aparece solo con el editor abierto, que es cuando se está
        decidiendo cómo queda, y se va mientras se arrastra para no taparla.

        VA ARRIBA A LA IZQUIERDA. Abajo quedaba justo atrás del círculo de la
        foto de perfil, que se monta 60px por encima de la franja: el cartel
        estaba, pero tapado, que es igual a no estar.
      */}
      {sePuede && !arrastrando && (
        <div style={{
          position: "absolute", left: 12, top: 12, pointerEvents: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(17,24,39,.42)", color: "#fff",
          border: "1px solid rgba(255,255,255,.32)", borderRadius: 999,
          padding: "5px 11px", fontSize: 11.5, fontWeight: 700,
          backdropFilter: "blur(3px)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
            <path d="M2 12h20M12 2v20" />
          </svg>
          {tr("portada.arrastra")}
        </div>
      )}

      {children}
    </div>
  );
}
