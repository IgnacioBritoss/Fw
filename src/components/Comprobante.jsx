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

/** El diente del borde arrancado, en píxeles. */
const DIENTE = 14;
const MASCARA_DENTADA = [
  `linear-gradient(#000 0 0) 0 0 / 100% calc(100% - ${DIENTE}px) no-repeat`,
  `conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 0 100% / ${DIENTE}px ${DIENTE}px repeat-x`,
].join(", ");

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
    maxWidth: 380, margin: "0 auto", width: "100%",
    filter: "drop-shadow(0 6px 14px rgba(10,14,25,.22))",
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
    width: "86%", height: 6, borderRadius: 3, background: "#0c0e11",
    boxShadow: "inset 0 2px 3px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.07)",
  },
  luz: {
    position: "absolute", right: 10, top: 9, width: 6, height: 6,
    borderRadius: "50%", background: "#3ddc84",
    boxShadow: "0 0 6px rgba(61,220,132,.9)",
  },
  papel: {
    background: PAPEL, color: TINTA,
    fontFamily: "'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace",
    fontSize: 12.5, lineHeight: 1.75, textAlign: "left",
    padding: "18px 18px 26px",
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

  return (
    <div style={s.marco}>
      <div className="fw-impresora-vibra" style={s.impresora}>
        <div style={s.ranura} />
        <div style={s.luz} />
      </div>

      {/*
        LA SALIDA DEL PAPEL: la caja crece con el papel recortado adentro, así
        que el ticket se va descubriendo de arriba hacia abajo —el encabezado
        primero, el sello al final—, que es el orden en que una impresora
        imprime. Los saltos los da un `steps()`, que es lo que suena a rollo
        avanzando. Ver styles/motion.css.
      */}
      <div className="fw-ticket-salida">
        <div>
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
