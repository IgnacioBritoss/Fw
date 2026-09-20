// ============================================================================
//  Comprobante — El ticket del alquiler, saliendo de la impresora
// ----------------------------------------------------------------------------
//  Es lo que aparece cuando el alquiler queda pagado. No es un resumen más: es
//  LA constancia, y por eso tiene forma de papel y no de tarjeta.
//
//  ── POR QUÉ UN TICKET Y NO OTRO RECUADRO ──────────────────────────────────
//  Todo lo que se paga en el mundo real termina en un papel. Un recuadro más,
//  del mismo color que los otros seis de la pantalla, se lee como "otra sección
//  de la página"; un ticket con tipografía de máquina, renglones de puntos y el
//  borde de abajo cortado se lee como "esto es el comprobante". Es la misma
//  información y significa otra cosa.
//
//  Y sale IMPRIMIÉNDOSE. La animación no es un adorno pegado encima: el papel
//  asoma de la ranura y se va descubriendo a saltos, renglón por renglón, como
//  el rollo de una impresora térmica. Ese movimiento dice "se acaba de emitir",
//  que es justo lo que pasó.
//
//  ── EL PAPEL ES BLANCO TAMBIÉN DE NOCHE ───────────────────────────────────
//  El resto de la app cambia con el tema. Esto no: el papel es papel. Un ticket
//  gris oscuro con letras claras no se parece a ningún comprobante que alguien
//  haya tenido en la mano, y en modo oscuro que el papel sea lo único claro de
//  la pantalla es exactamente lo que hace que se vea como un objeto apoyado
//  encima y no como otra caja de la interfaz.
//
//  Qué renglones tiene y en qué orden lo decide services/comprobante.js, que se
//  prueba con `npm test`. Acá solamente se dibuja.
// ============================================================================
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import { lineasDelComprobante, numeroDeComprobante } from "../services/comprobante";

const PAPEL = "#f7f5ef";
const TINTA = "#1c1c1e";
const TINTA_TENUE = "#6b6b70";

/*
  EL DIENTE DEL BORDE ARRANCADO
  ----------------------------------------------------------------------------
  Antes era UN número —catorce— y el diente salía cuadrado por consecuencia: el
  mismo valor hacía de ancho y de hondo. Catorce de ancho son veintisiete
  dientes a lo largo del ticket, grandes y en ángulo de cuarenta y cinco grados,
  y eso no se lee como un papel arrancado: se lee como un borde decorativo de
  guirnalda pegado abajo del comprobante.

  Un corte de verdad lo hace una sierra chica, y la muesca que deja es más ANCHA
  que HONDA. Por eso ahora son dos medidas: diez de ancho por seis de hondo, o
  sea unos treinta y cuatro dientes chatos. Se ve que está cortado y no se ve un
  adorno, que es exactamente la diferencia que hay que conseguir.
*/
const DIENTE_ANCHO = 10;
const DIENTE_HONDO = 6;

/*
  La cuña del `conic-gradient` es la que dibuja cada diente, y su apertura tiene
  que salir de las dos medidas o el diente no cierra: demasiado angosta deja la
  punta sin llegar a la esquina del mosaico y quedan dientes separados por una
  franja recta; demasiado ancha se pasa de largo, el navegador la recorta contra
  el mosaico y la punta sale cortada al ras, que es un trapecio y no un diente.

  El ángulo que las hace coincidir es el de la diagonal del medio diente, y eso
  es una arcotangente. El `from 135deg` deja el centro de la cuña en 45.
*/
const MEDIA_CUNA = (Math.atan((DIENTE_ANCHO / 2) / DIENTE_HONDO) * 180) / Math.PI;
const CUNA_DESDE = (45 - MEDIA_CUNA).toFixed(2);
const CUNA_HASTA = (45 + MEDIA_CUNA).toFixed(2);

const MASCARA_DENTADA = [
  `linear-gradient(#000 0 0) 0 0 / 100% calc(100% - ${DIENTE_HONDO}px) no-repeat`,
  `conic-gradient(from 135deg at top, #0000 ${CUNA_DESDE}deg, #000 ${CUNA_DESDE}deg ${CUNA_HASTA}deg, #0000 ${CUNA_HASTA}deg) 0 100% / ${DIENTE_ANCHO}px ${DIENTE_HONDO}px repeat-x`,
].join(", ");

/** Lo que tarda la impresora en sacar un renglón. */
const MS_POR_RENGLON = 88;

/**
 * Cuántos renglones va a tener este ticket.
 *
 * ── POR QUÉ ESTO NO PUEDE SER UN NÚMERO FIJO ──────────────────────────────
 * La animación avanza a saltos, y antes eran veintidós saltos siempre. Pero el
 * alto del ticket depende de cuántas líneas tenga la reserva, así que veintidós
 * saltos repartían un ticket corto en saltitos de seis píxeles —que no se ven, y
 * ahí la impresión parecía un panel que se abre de una— y uno largo en tirones
 * de treinta, que se saltean un renglón entero por paso.
 *
 * Contando los renglones, el salto mide siempre más o menos lo mismo: un
 * renglón. Y la impresión dura lo que tiene que durar, que es más en un ticket
 * con más cosas.
 *
 * No hace falta que el número sea exacto —los cortes de puntos y el sello no
 * miden lo mismo que una línea de texto— sino que sea PROPORCIONAL. Los ocho de
 * más son los renglones que no son líneas: el encabezado con la marca, el
 * subtítulo y el número, el sello —que ocupa dos—, el pie, y el aire de arriba
 * y de abajo.
 */
const renglonesDelTicket = (cuantasLineas) => cuantasLineas + 8;

const s = {
  /*
    LA SOMBRA DE TODO EL CONJUNTO VA ACÁ ARRIBA, Y NO ES UN CAPRICHO.

    El papel lleva una máscara para que el borde de abajo quede dentado, y una
    `box-shadow` no la respeta: dibuja la sombra del rectángulo entero, así que
    abajo de los dientes quedaba una línea recta y el corte no se veía. Un
    `filter: drop-shadow` sí sigue la forma recortada.

    Pero el filtro no puede ir en el papel —aplicado al mismo elemento corre
    antes que la máscara y se recorta con ella— ni en su padre inmediato, que es
    el que recorta la impresión y le cortaba la sombra al ras, dejando una raya
    gris recta justo abajo del corte dentado: exactamente lo que el corte venía
    a evitar.

    Acá afuera no lo recorta nadie, y de paso es una sola sombra para la
    impresora y el papel, que es lo correcto: son un objeto apoyado sobre la
    pantalla, no dos.
  */
  marco: {
    maxWidth: 400, margin: "0 auto", width: "100%",
    /*
      Son DOS sombras y cada una hace un trabajo distinto. La abierta despega el
      conjunto de la pantalla; la corta y dura de adelante es la que dibuja el
      contorno de los dientes, que con ocho píxeles de ancho quedaban
      completamente disueltos dentro de la otra y se veían planos, pegados.
    */
    filter: [
      "drop-shadow(0 1px 1px rgba(10,14,25,.34))",
      "drop-shadow(0 7px 16px rgba(10,14,25,.22))",
    ].join(" "),
  },
  /*
    LA IMPRESORA: una barra oscura con una ranura. Con cuatro elementos alcanza
    —el cuerpo, la ranura, la sombra de adentro y un punto de encendido— y de
    hecho es mejor que alcance: lo que tiene que mirarse es el papel.
  */
  impresora: {
    position: "relative", height: 26, borderRadius: "8px 8px 4px 4px",
    background: "linear-gradient(180deg,#3a3f47 0%,#23272d 70%,#171a1f 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  ranura: {
    width: "90%", height: 6, borderRadius: 3, background: "#0c0e11",
    boxShadow: "inset 0 2px 3px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.07)",
  },
  luz: {
    position: "absolute", right: 10, top: 9, width: 6, height: 6,
    borderRadius: "50%", background: "#3ddc84",
    boxShadow: "0 0 6px rgba(61,220,132,.9)",
  },
  /*
    EL PAPEL ES MÁS ANGOSTO QUE LA MÁQUINA, Y ESO SOLO ES MEDIO CENTÍMETRO.

    Antes los dos medían exactamente lo mismo y arrancaban en la misma línea
    vertical, y esa coincidencia era la que arruinaba todo: dos rectángulos del
    mismo ancho, uno oscuro arriba y uno claro abajo, se leen como UNA caja de
    dos colores que crece. Ningún rollo de papel es tan ancho como la impresora
    que lo escupe, y el ojo lo sabe sin que nadie se lo explique.

    Por eso la ranura también se agrandó: el papel tiene que salir de adentro de
    ella, no de sus costados.
  */
  salida: { width: "86%", margin: "0 auto" },
  /*
    LA VENTANA por la que va apareciendo el papel. Es `relative` para que la
    sombra de la ranura y el borde libre se cuelguen de sus bordes: los dos
    tienen que quedarse quietos mientras la ventana crece, que es justamente lo
    que los convierte en partes de la máquina y no en partes del ticket.
  */
  ventana: { position: "relative" },
  /*
    LA SOMBRA QUE LA RANURA TIRA SOBRE EL PAPEL. Un papel que sale de una
    abertura no está iluminado parejo en el borde: los primeros milímetros
    todavía están adentro. Sin esto, la juntura entre la barra oscura y el papel
    es una línea recta perfecta, y una línea recta perfecta es lo que separa dos
    rectángulos apilados, no lo que une una máquina con lo que está saliendo de
    ella.
  */
  sombraDeLaRanura: {
    position: "absolute", top: 0, left: 0, right: 0, height: 16,
    pointerEvents: "none",
    /*
      EL z-index NO ES DECORATIVO Y SIN ÉL ESTO NO SE VE.

      El papel lleva una `mask`, y un elemento enmascarado abre su propio
      contexto de apilado: el navegador lo pinta como si tuviera z-index 0, o
      sea en la misma tanda que estos dos avisos, que están posicionados y
      también valen 0. Empatados, gana el que va después en el documento... y el
      papel va después. Resultado: las dos sombras quedaban pintadas DEBAJO del
      papel, o sea invisibles, y el ticket se veía exactamente igual que antes.
    */
    zIndex: 1,
    background: "linear-gradient(180deg, rgba(12,14,17,.36), rgba(12,14,17,.07) 58%, rgba(12,14,17,0))",
  },
  /*
    EL BORDE LIBRE, el filo del papel que todavía está saliendo.

    Mientras imprime, la ventana corta el papel con una línea recta que a veces
    parte un renglón por la mitad. Esa raya es el defecto más visible de toda la
    animación: se lee como un recorte, no como una hoja. Una sombrita finita
    pegada al borde de abajo la convierte en el canto del papel.

    Y se apaga en el último paso —ver fw-ticket-borde en motion.css— porque al
    terminar ese borde ya no es un filo que avanza: es el corte dentado, que
    tiene su propia sombra y no quiere una barra gris rellenándole los huecos.
  */
  bordeLibre: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 10,
    pointerEvents: "none", zIndex: 1,
    background: "linear-gradient(0deg, rgba(12,14,17,.20), rgba(12,14,17,0))",
  },
  papel: {
    backgroundColor: PAPEL,
    /*
      Una sombra tenue sobre la franja del corte: el papel arrancado no queda
      plano, y sin nada de sombra los dientes se ven como un dibujo impreso
      sobre el papel en vez de como el final del papel.
    */
    backgroundImage: `linear-gradient(0deg, rgba(28,28,30,.10), rgba(28,28,30,0) ${DIENTE_HONDO + 9}px)`,
    color: TINTA,
    fontFamily: "'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace",
    fontSize: 12.5, lineHeight: 1.75, textAlign: "left",
    padding: "18px 16px 20px",
    /*
      EL BORDE DE ABAJO, CORTADO. Es el detalle que convierte un rectángulo
      claro en un ticket: el papel se arranca del rollo y queda dentado.

      Son dos máscaras superpuestas y hacen falta las dos: la primera deja
      pasar el papel entero menos la franja de abajo, y la segunda dibuja los
      dientes en esa franja, un cono por diente, repetidos a lo ancho. Con una
      sola, o se pierde el papel o se pierden los dientes.

      Donde el navegador no soporte máscaras queda un borde recto: el mismo
      papel, un poco menos creíble y nada roto.
    */
    WebkitMask: MASCARA_DENTADA,
    mask: MASCARA_DENTADA,
  },
  marca: { textAlign: "center", fontWeight: 800, letterSpacing: ".22em", fontSize: 13 },
  subtitulo: { textAlign: "center", fontSize: 10.5, letterSpacing: ".14em", color: TINTA_TENUE, marginBottom: 2 },
  numero: { textAlign: "center", fontSize: 11, color: TINTA_TENUE, marginBottom: 10 },
  // Los puntos que separan: son los que hacen que la columna de números se lea
  // de un saque, sin tener que ir y venir con el ojo entre la etiqueta y el
  // importe.
  corte: { borderTop: "1px dashed #c9c5b8", margin: "8px 0" },
  fila: { display: "flex", justifyContent: "space-between", gap: 12 },
  etiqueta: { color: TINTA_TENUE, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  valor: { fontWeight: 600, flexShrink: 0 },
  total: { display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 800, fontSize: 14.5, letterSpacing: ".02em" },
  retenido: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, color: TINTA_TENUE },
  sello: {
    margin: "14px auto 0", width: "fit-content", transform: "rotate(-7deg)",
    border: "2px solid #0f6ce6", color: "#0f6ce6", borderRadius: 6,
    padding: "4px 14px", fontWeight: 800, letterSpacing: ".2em", fontSize: 13,
    opacity: .85, boxShadow: "inset 0 0 0 1px rgba(15,108,230,.35)",
  },
  pie: { textAlign: "center", fontSize: 10.5, color: TINTA_TENUE, marginTop: 12, letterSpacing: ".04em" },
};

/**
 * @param booking  la reserva
 * @param payment  el estado de pago del servidor (manda él si está)
 * @param dias     los días, ya calculados por la pantalla
 * @param moneda   la moneda de la reserva
 * @param money    cómo se escribe un importe: entra de afuera porque la que
 *                 sabe formatear la plata de ESTA reserva es la pantalla de
 *                 pago, que no convierte nada (los montos vienen del servidor
 *                 en la moneda de la reserva, no en la que eligió quien mira).
 */
export default function Comprobante({ booking, payment, dias, moneda, money, fecha = new Date() }) {
  const { t: tr, lang } = useI18n();
  const lineas = lineasDelComprobante({ booking, payment, dias });
  const numero = numeroDeComprobante(booking?.id);
  // Cuántos saltos tiene la impresión y cuánto dura cada uno. Los lee
  // motion.css: el alto del ticket lo sabe el navegador, pero cuántos renglones
  // tiene lo sabe esto.
  const pasos = renglonesDelTicket(lineas.length);

  /*
    Los dos números de la impresión se publican en el marco de afuera y no en la
    caja del papel, porque el que tiembla es la barra de la máquina: es hermana
    del papel, no hija, y desde ahí abajo nunca los habría visto. Puestos arriba
    los heredan los dos, que es la única forma de que golpeen juntos.
  */
  return (
    <div
      style={{
        ...s.marco,
        "--fw-ticket-pasos": pasos,
        "--fw-ticket-paso": `${MS_POR_RENGLON}ms`,
      }}
    >
      <div className="fw-impresora-vibra" style={s.impresora}>
        <div style={s.ranura} />
        <div style={s.luz} />
      </div>

      {/*
        LA SALIDA DEL PAPEL: la caja crece con el papel recortado adentro, así
        que el ticket se va descubriendo de arriba hacia abajo —el encabezado
        primero, el sello al final—, que es el orden en que una impresora
        imprime. Los saltos los da un `steps()`, que es lo que suena a rollo
        avanzando, y son tantos como renglones tenga ESTE ticket. Ver
        styles/motion.css.
      */}
      <div className="fw-ticket-salida" style={s.salida}>
        <div style={s.ventana}>
          <div style={s.sombraDeLaRanura} />
          <div className="fw-ticket-borde" style={s.bordeLibre} />
          <div style={s.papel}>
            <div style={s.marca}>FREEWHEEL</div>
            <div style={s.subtitulo}>{tr("comprobante.titulo")}</div>
            {numero && <div style={s.numero}>{numero}</div>}

            {lineas.map((l, i) => {
              if (l.tipo === "corte") return <div key={`c${i}`} style={s.corte} />;

              if (l.tipo === "total") {
                return (
                  <div key={l.clave} style={s.total}>
                    <span>{tr(l.clave)}</span>
                    <span>{money(l.monto, moneda)}</span>
                  </div>
                );
              }

              if (l.tipo === "retenido") {
                return (
                  <div key={l.clave} style={s.retenido}>
                    <span>{tr(l.clave)}</span>
                    <span>{money(l.monto, moneda)}</span>
                  </div>
                );
              }

              const etiqueta = l.multiplicador
                // "Alquiler x 7 días": el renglón dice de dónde sale el número.
                ? `${tr(l.clave)} x ${l.multiplicador}`
                : tr(l.clave);
              const valor = l.tipo === "fecha"
                ? shortDate(l.valor, lang)
                : l.tipo === "monto" ? money(l.monto, moneda) : l.valor;

              return (
                <div key={`${l.clave}${i}`} style={s.fila}>
                  <span style={s.etiqueta}>{etiqueta}</span>
                  <span style={s.valor}>{valor}</span>
                </div>
              );
            })}

            <div style={s.sello}>{tr("comprobante.sello")}</div>
            <div style={s.pie}>{shortDate(fecha, lang)} · {tr("comprobante.pie")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
