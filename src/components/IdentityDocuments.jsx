// ============================================================================
//  IdentityDocuments — Las fotos del DNI y la licencia de una solicitud
// ----------------------------------------------------------------------------
//  Se usa en dos lugares y en ningún otro:
//   · el perfil propio, para que cada uno vea qué mandó y cómo salió la revisión;
//   · el panel de administración, para poder aprobar o rechazar mirando.
//
//  NO se usa en el perfil público. Las fotos de un DNI son material con el que se
//  suplanta una identidad: a los demás usuarios se les muestra el cartel de
//  "Identidad verificada" y los últimos cuatro dígitos del documento, que es lo
//  que sirve para cotejar sin repartir el documento de nadie.
//
//  ── LAS FOTOS AHORA SON PRIVADAS ───────────────────────────────────────────
//  Antes la URL guardada se abría con solo saberla. Ahora los archivos se suben
//  como assets PRIVADOS: la URL que quedó en la base devuelve 401 si no está
//  firmada, y el backend ya no se la manda ni al propio titular. Para verlas hay
//  que pedirlas firmadas y con vencimiento, y eso solo puede hacerlo un admin
//  (queda auditado, porque es mirar el documento de otra persona).
//
//  Entonces, acá una casilla puede estar en tres estados: con foto a la vista,
//  enviada pero privada, o vacía. Mostrar el recuadro privado —en vez de no
//  mostrar nada— es lo que deja ver que la foto SÍ se envió.
//
//  Props:
//    · doc            → la vista de UN documento: { type, status, reasons,
//                       documents: { front, back }, analysis, expiresAt, ... }
//    · compact        → miniaturas más chicas, para la lista del panel admin
//    · urls           → { front, back } ya firmadas, cuando alguien las pidió
//    · onLoadPhotos   → si se pasa, aparece el botón para pedirlas firmadas
//    · loadingPhotos  → mientras se están pidiendo
// ============================================================================
import StatusChip from "./StatusChip";
import { useI18n } from "../i18n/core";
import { longDate } from "../i18n/dates";

/** El nombre del documento y de cada uno de sus lados. */
const ETIQUETAS = {
  DNI: { titulo: "kyc.dniTitle", front: "kyc.dniFront", back: "kyc.dniBack" },
  LICENSE: { titulo: "kyc.licTitle", front: "kyc.licFront", back: "kyc.licBack" },
};

/** Cómo se muestra cada estado, con el color que le corresponde. */
const STATUS = {
  APPROVED: { key: "kyc.approved", tone: "verified" },
  REJECTED: { key: "kyc.rejected", tone: "danger" },
  MANUAL_REVIEW: { key: "kyc.waitingReview", tone: "warn" },
  PENDING: { key: "kyc.stPending", tone: "warn" },
  FAILED: { key: "kyc.stFailed", tone: "warn" },
};

export default function IdentityDocuments({
  doc, compact = false, urls = null, onLoadPhotos = null, loadingPhotos = false,
}) {
  const { t: tr, lang } = useI18n();
  const prettyDate = (value) => longDate(value, lang) || null;
  if (!doc) return null;

  const etiquetas = ETIQUETAS[doc.type] ?? ETIQUETAS.DNI;
  const state = STATUS[doc.status]
    ? { label: tr(STATUS[doc.status].key), tone: STATUS[doc.status].tone }
    : { label: doc.status, tone: "neutral" };
  const size = compact ? 96 : 132;

  // Una casilla se puede mostrar si llegó firmada; se sabe que se envió aunque no
  // haya URL, porque el backend informa qué casillas tienen archivo.
  const fotos = ["front", "back"]
    .map((lado) => ({
      lado,
      etiqueta: etiquetas[lado],
      url: urls?.[lado] || null,
      enviada: Boolean(urls?.[lado] || doc.documents?.[lado]),
    }))
    .filter((foto) => foto.enviada);

  // Hay algo enviado que no se puede mirar todavía.
  const hayPrivadas = fotos.some((foto) => !foto.url);

  // Lo que se leyó del documento. No se lo pide al usuario justamente para que no
  // pueda escribir un número que no es el de su documento.
  const scanned = [
    [tr("kyc.expiresOn"), prettyDate(doc.expiresAt)],
  ].filter(([, value]) => Boolean(value));

  // Por qué no quedó aprobado. El texto lo escribe el backend y viene listo para
  // mostrar: trae la fecha y el dato que no coincidía adentro.
  const motivos = doc.reasons ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)" }}>{tr(etiquetas.titulo)}</span>
        <StatusChip tone={state.tone}>{state.label}</StatusChip>
        {doc.createdAt && (
          <span style={{ fontSize: 12, color: "var(--fw-text-4)" }}>
            {tr("kyc.sentOn", { date: prettyDate(doc.createdAt) })}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        {fotos.map(({ lado, etiqueta, url }) => (
          url ? (
            <a key={lado} href={url} target="_blank" rel="noopener noreferrer"
              title={tr("kyc.openBig")}
              style={{ textDecoration: "none", color: "inherit" }}>
              <img src={url} alt={tr(etiqueta)} style={{
                width: size, height: size * 0.66, objectFit: "cover",
                borderRadius: 8, border: "1px solid var(--fw-border)", display: "block", background: "var(--fw-bg)",
              }} />
              <div style={{ fontSize: 11, color: "var(--fw-text-3)", marginTop: 4, maxWidth: size }}>{tr(etiqueta)}</div>
            </a>
          ) : (
            <div key={lado}>
              <div style={{
                width: size, height: size * 0.66, borderRadius: 8,
                border: "1px dashed var(--fw-border-2)", background: "var(--fw-surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: 6,
              }}>
                <span style={{ fontSize: 10.5, color: "var(--fw-text-4)", lineHeight: 1.4 }}>
                  {tr("kyc.photoStored")}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fw-text-3)", marginTop: 4, maxWidth: size }}>{tr(etiqueta)}</div>
            </div>
          )
        ))}
      </div>

      {/* Pedir las fotos firmadas. Es un botón y no una carga automática a
          propósito: cada vez que se miran queda registrado quién lo hizo, así
          que abrir la lista no puede significar mirar el documento de todos. */}
      {hayPrivadas && onLoadPhotos && (
        <button onClick={onLoadPhotos} disabled={loadingPhotos}
          style={{
            background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", borderRadius: 20,
            padding: "8px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--fw-text-2)",
            cursor: loadingPhotos ? "default" : "pointer", marginBottom: 12,
            opacity: loadingPhotos ? 0.6 : 1,
          }}>
          {loadingPhotos ? tr("common.loading") : tr("kyc.loadPhotos")}
        </button>
      )}

      {scanned.length > 0 && (
        <div style={{
          background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)", borderLeft: "3px solid var(--fw-blue)",
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fw-text-3)", letterSpacing: ".04em", marginBottom: 6 }}>
            {tr("kyc.readFromPhotos")}
          </div>
          {scanned.map(([label, value]) => (
            <div key={label} style={{ fontSize: 12.5, color: "var(--fw-text-2)", lineHeight: 1.7 }}>
              {label}: <strong style={{ color: "var(--fw-text)" }}>{value}</strong>
            </div>
          ))}
        </div>
      )}

      {motivos.length > 0 && (
        <div style={{
          background: "var(--fw-amber-bg)", border: "1px solid var(--fw-amber-line)", borderRadius: 8,
          padding: "10px 12px", marginTop: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fw-amber-text)", letterSpacing: ".04em", marginBottom: 6 }}>
            {tr("kyc.reviewNotes")}
          </div>
          {motivos.map((motivo) => (
            <div key={motivo.code} style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
              · {motivo.message || motivo.code}
            </div>
          ))}
        </div>
      )}

      {/* La lectura automática se cayó del lado nuestro. Va aparte de los
          motivos a propósito: no es algo que la persona tenga que arreglar. */}
      {doc.analysis?.error && (
        <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginTop: 10, lineHeight: 1.6 }}>
          {doc.analysis.error}
        </div>
      )}
    </div>
  );
}
