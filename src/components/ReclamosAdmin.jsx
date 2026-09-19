// ============================================================================
//  ReclamosAdmin — Los reclamos por daño sin resolver
// ----------------------------------------------------------------------------
//  Va arriba de la lista de reservas del panel, porque es lo único de esa
//  pantalla que tiene a alguien esperando del otro lado: mientras un reclamo
//  está abierto, el depósito de quien alquiló sigue retenido y el dueño no
//  cobró su daño. Las dos partes están frenadas hasta que esto se resuelve.
//
//  ── LO QUE SE DECIDE ACÁ ──────────────────────────────────────────────────
//  Aceptar cobra del depósito; rechazar lo libera entero. El importe se puede
//  bajar: quien resuelve mira las fotos y decide, no firma lo que le pidieron.
//  Las dos cosas le avisan por mail a las dos partes, con el motivo entero.
//
//  Las fotos se abren en otra pestaña en vez de agrandarse acá: decidir sobre
//  plata ajena con una miniatura de 68 píxeles no es decidir.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { adminGetReclamos, adminResolverReclamo } from "../services/api";
import { revisarCaptura } from "../services/movimientos";
import { comoSeLeeElReclamo } from "../services/reclamo";
import { useI18n } from "../i18n/core";
import { shortDate } from "../i18n/dates";
import Spinner from "./Spinner";

const s = {
  caja: {
    background: "var(--fw-surface)", border: "1px solid var(--fw-amber-line, var(--fw-border))",
    borderRadius: 14, padding: 18, marginBottom: 18,
  },
  titulo: { fontWeight: 800, fontSize: 15, color: "var(--fw-text)", marginBottom: 4 },
  bajada: { fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 14 },
  reclamo: {
    border: "1px solid var(--fw-border)", borderRadius: 11, padding: 14, marginBottom: 12,
    background: "var(--fw-surface-2)",
  },
  fila: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 },
  auto: { fontWeight: 700, fontSize: 14, color: "var(--fw-text)" },
  meta: { fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6 },
  texto: { fontSize: 13.5, color: "var(--fw-text-2)", lineHeight: 1.7, margin: "8px 0" },
  fotos: { display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" },
  foto: { width: 68, height: 68, borderRadius: 8, objectFit: "cover", border: "1px solid var(--fw-border)", display: "block" },
  etiqueta: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--fw-text-3)", marginBottom: 5, marginTop: 10 },
  entrada: {
    width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 14, fontFamily: "inherit",
    background: "var(--fw-surface)", color: "var(--fw-text)", border: "1.5px solid var(--fw-border)",
    outline: "none", boxSizing: "border-box",
  },
  area: {
    width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 14, fontFamily: "inherit",
    background: "var(--fw-surface)", color: "var(--fw-text)", border: "1.5px solid var(--fw-border)",
    outline: "none", boxSizing: "border-box", height: 76, resize: "none",
  },
  error: { fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 5 },
  botones: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  cobrar: {
    padding: "10px 16px", background: "var(--fw-amber, #d97706)", color: "#fff", border: "none",
    borderRadius: 9, fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
  },
  rechazar: {
    padding: "10px 16px", background: "transparent", color: "var(--fw-text-2)",
    border: "1.5px solid var(--fw-border-2)", borderRadius: 9, fontSize: 13.5, fontWeight: 600,
    fontFamily: "inherit", cursor: "pointer",
  },
  apagado: { opacity: .55, cursor: "not-allowed" },
  vacio: { fontSize: 13, color: "var(--fw-text-4)" },
};

const plata = (valor, moneda = "USD") =>
  `$${Number(valor || 0).toLocaleString("es-AR")} ${String(moneda).toUpperCase()}`;

const persona = (p) =>
  p?.displayName || `${p?.firstName || ""} ${p?.lastName || ""}`.trim() || p?.email || "";

/** Un reclamo, con lo que hace falta para resolverlo sin salir de acá. */
function Reclamo({ claim, onResuelto }) {
  const { t: tr, lang } = useI18n();
  const leido = comoSeLeeElReclamo(claim);
  const moneda = claim.booking?.currency || "USD";
  const topeMinor = Math.round(Number(claim.booking?.depositSnapshot || 0) * 100);

  // Arranca con lo reclamado, que es lo que se acepta en la mayoría de los
  // casos; bajarlo es escribir otro número, no rehacer el formulario.
  const [monto, setMonto] = useState(String(leido.monto));
  const [nota, setNota] = useState("");
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [mandando, setMandando] = useState(false);
  const [fallo, setFallo] = useState("");

  const revisado = revisarCaptura({ monto, motivo: nota, topeMinor });

  const resolver = async (aceptar) => {
    setMostrarErrores(true);
    // Rechazar no necesita importe, pero sí la nota: las dos partes van a leer
    // por qué se resolvió así, y una resolución sin explicación sobre la plata
    // de otro no es una resolución.
    if (mandando) return;
    if (revisado.errores.motivo) return;
    if (aceptar && revisado.errores.monto) return;

    setMandando(true);
    setFallo("");
    try {
      await adminResolverReclamo(claim.id, {
        aceptar,
        ...(aceptar ? { amountMinor: revisado.montoMinor } : {}),
        nota: revisado.motivo,
      });
      onResuelto?.();
    } catch (err) {
      setFallo(err.message || tr("reclamo.noSePudo"));
    } finally {
      setMandando(false);
    }
  };

  const auto = claim.booking?.vehicle;
  const nombreDelAuto = [auto?.brand, auto?.model, auto?.year].filter(Boolean).join(" ");

  return (
    <div style={s.reclamo}>
      <div style={s.fila}>
        <span style={s.auto}>{nombreDelAuto || tr("reclamo.sinAuto")}</span>
        <span style={{ ...s.meta, marginLeft: "auto" }}>
          {shortDate(claim.createdAt, lang)}
        </span>
      </div>
      <div style={s.meta}>
        {tr("reclamo.reclama")}: <strong>{persona(claim.owner)}</strong>
        {" · "}{tr("reclamo.contra")}: <strong>{persona(claim.booking?.renter)}</strong>
        {" · "}{tr("reclamo.pide")}: <strong>{plata(leido.monto, moneda)}</strong>
        {topeMinor > 0 && <> {tr("reclamo.deTope", { tope: plata(topeMinor / 100, moneda) })}</>}
      </div>

      <div style={s.texto}>{claim.description}</div>

      {leido.fotos.length > 0 && (
        <div style={s.fotos}>
          {leido.fotos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" style={s.foto} />
            </a>
          ))}
        </div>
      )}

      <label style={s.etiqueta}>{tr("reclamo.cuantoCobrar")}</label>
      <input style={s.entrada} value={monto} inputMode="decimal"
        onChange={(e) => setMonto(e.target.value)} />
      {mostrarErrores && revisado.errores.monto && (
        <div style={s.error}>{tr(revisado.errores.monto)}</div>
      )}

      <label style={s.etiqueta}>{tr("reclamo.notaResolucion")}</label>
      <textarea style={s.area} value={nota} maxLength={500}
        placeholder={tr("reclamo.notaEjemplo")}
        onChange={(e) => setNota(e.target.value)} />
      {mostrarErrores && revisado.errores.motivo && (
        <div style={s.error}>{tr(revisado.errores.motivo)}</div>
      )}

      <div style={s.botones}>
        <button type="button" disabled={mandando}
          style={mandando ? { ...s.cobrar, ...s.apagado } : s.cobrar}
          onClick={() => resolver(true)}>
          {mandando ? tr("common.loading") : tr("reclamo.aceptar")}
        </button>
        <button type="button" disabled={mandando}
          style={mandando ? { ...s.rechazar, ...s.apagado } : s.rechazar}
          onClick={() => resolver(false)}>
          {tr("reclamo.rechazar")}
        </button>
      </div>
      {fallo && <div style={s.error}>{fallo}</div>}
    </div>
  );
}

export default function ReclamosAdmin() {
  const { t: tr } = useI18n();
  const [reclamos, setReclamos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await adminGetReclamos();
      setReclamos(Array.isArray(datos) ? datos : []);
    } catch {
      // Sin reclamos que mostrar, el panel de reservas sigue sirviendo entero.
      setReclamos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <Spinner block label={tr("common.loading")} />;
  // Sin reclamos no se dibuja nada: un recuadro vacío arriba de todo, todos los
  // días, es ruido que después se deja de mirar.
  if (reclamos.length === 0) return null;

  return (
    <div style={s.caja}>
      <div style={s.titulo}>{tr("reclamo.panelTitulo", { n: reclamos.length })}</div>
      <div style={s.bajada}>{tr("reclamo.panelBajada")}</div>
      {reclamos.map(claim => (
        <Reclamo key={claim.id} claim={claim} onResuelto={cargar} />
      ))}
    </div>
  );
}
