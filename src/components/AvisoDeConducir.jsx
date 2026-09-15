// ============================================================================
//  AvisoDeConducir — "Hoy no podés alquilar", dicho antes de que lo intente
// ----------------------------------------------------------------------------
//  Estar verificado y poder manejar son dos cosas distintas: la primera se
//  resuelve una vez, la segunda CAMBIA SOLA. Una licencia vence un martes a la
//  mañana y esa cuenta, perfectamente verificada, deja de poder alquilar sin que
//  nadie haya tocado nada.
//
//  Este cartel es eso, y aparece en los dos lugares donde importa: la
//  publicación del auto y la pantalla de reservar. Enterarse recién al apretar
//  "confirmar", con las fechas ya elegidas, es hacerle perder el tiempo a la
//  persona por algo que se sabía desde que entró.
//
//  ── DOS TONOS, PORQUE SON DOS SITUACIONES ─────────────────────────────────
//   · "bloqueo" → no puede alquilar. Firme, con el motivo y el camino para
//     destrabarlo.
//   · "pronto"  → puede, pero la licencia vence dentro de treinta días. Suave:
//     es un aviso, no un freno, y tratarlo como un problema haría que se lo
//     ignore el día que sí lo sea.
//
//  ── LOS TEXTOS SON LOS DEL SERVIDOR ───────────────────────────────────────
//  Cada motivo llega con el mensaje escrito y con la fecha adentro ("vencida
//  desde el 3/3/2026"). Se muestran TAL CUAL. Reescribirlos acá daría una
//  versión peor —sin la fecha— de algo que ya viene listo, y dos textos sobre lo
//  mismo que se van separando con cada cambio del backend.
// ============================================================================
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";

export default function AvisoDeConducir({ aviso, style }) {
  const { t: tr, lang } = useI18n();
  const navigate = useNavigate();
  if (!aviso) return null;

  const bloquea = aviso.tono === "bloqueo";
  const color = bloquea
    ? { fondo: "var(--fw-red-bg)", linea: "var(--fw-red-line)", texto: "var(--fw-red-text-2)", boton: "var(--fw-red)" }
    : { fondo: "var(--fw-amber-bg)", linea: "var(--fw-amber-line)", texto: "var(--fw-amber-text)", boton: "var(--fw-amber)" };

  // El aviso suave no trae motivos del servidor: el motivo ES la fecha.
  const textos = bloquea
    ? aviso.mensajes.map((m) => m.message).filter(Boolean)
    : [tr("driving.soonNote", { date: aviso.vence ? shortDate(aviso.vence, lang) : "" })];

  return (
    <div
      role={bloquea ? "alert" : "status"}
      style={{
        background: color.fondo, border: `1.5px solid ${color.linea}`, borderRadius: 10,
        padding: "12px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12, flexWrap: "wrap", ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: color.texto, marginBottom: textos.length ? 3 : 0 }}>
          {tr(bloquea ? "driving.blockedTitle" : "driving.soonTitle")}
        </div>
        {textos.map((texto, i) => (
          <div key={i} style={{ fontSize: 12.5, color: color.texto, lineHeight: 1.6 }}>{texto}</div>
        ))}
      </div>
      {/* Se destraba subiendo una licencia nueva, que es el mismo trámite de
          verificación de siempre. El botón lleva directo: sin él, "actualizá tu
          licencia" es una instrucción sin lugar a dónde ir. */}
      <button
        type="button"
        onClick={() => navigate("/kyc")}
        style={{
          padding: "9px 16px", background: color.boton, color: "#fff", border: "none",
          borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        {tr("driving.fix")}
      </button>
    </div>
  );
}
