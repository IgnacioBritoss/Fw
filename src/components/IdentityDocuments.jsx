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
//    · submission     → una fila de UserVerification (o su vista pública)
//    · compact        → miniaturas más chicas, para la lista del panel admin
//    · urls           → { dniFront, dniBack, licenseFront, licenseBack } ya
//                       firmadas, cuando alguien las pidió
//    · onLoadPhotos   → si se pasa, aparece el botón para pedirlas firmadas
//    · loadingPhotos  → mientras se están pidiendo
// ============================================================================
import StatusChip from "./StatusChip";
import { useI18n } from "../i18n/core";
import { longDate } from "../i18n/dates";
import { motivoDeRevision } from "../services/identity";

const PHOTOS = [
  { slot: "dniFront", field: "dniFrontUrl", key: "kyc.dniFront" },
  { slot: "dniBack", field: "dniBackUrl", key: "kyc.dniBack" },
  { slot: "licenseFront", field: "licenseFrontUrl", key: "kyc.licFront" },
  { slot: "licenseBack", field: "licenseBackUrl", key: "kyc.licBack" },
];

/** Cómo se muestra cada estado, con el color que le corresponde. */
const STATUS = {
  VERIFIED: { key: "kyc.approved", tone: "ok" },
  REJECTED: { key: "kyc.rejected", tone: "danger" },
  ID_SUBMITTED: { key: "kyc.waitingReview", tone: "warn" },
};

/**
 * ¿Esta URL es de un asset privado? Se reconoce por el tipo de entrega que trae
 * la propia URL. Las solicitudes viejas siguen guardadas como públicas y esas se
 * pueden mostrar directo; una privada sin firmar solo daría una imagen rota.
 */
const esPrivada = (url) => /\/image\/authenticated\//.test(String(url));

export default function IdentityDocuments({
  submission, compact = false, urls = null, onLoadPhotos = null, loadingPhotos = false,
}) {
  const { t: tr, lang } = useI18n();
  const prettyDate = (value) => longDate(value, lang) || null;
  if (!submission) return null;

  const state = STATUS[submission.status]
    ? { label: tr(STATUS[submission.status].key), tone: STATUS[submission.status].tone }
    : { label: submission.status, tone: "neutral" };
  const size = compact ? 96 : 132;

  // Una casilla se puede mostrar si hay una URL usable; se sabe que se envió
  // aunque no haya URL, porque el backend informa qué casillas tienen archivo.
  const fotos = PHOTOS.map((foto) => {
    const firmada = urls?.[foto.slot] || null;
    const guardada = submission[foto.field] || null;
    return {
      ...foto,
      url: firmada || (guardada && !esPrivada(guardada) ? guardada : null),
      enviada: Boolean(firmada || guardada || submission.documents?.[foto.slot]),
    };
  }).filter((foto) => foto.enviada);

  // Hay algo enviado que no se puede mirar todavía.
  const hayPrivadas = fotos.some((foto) => !foto.url);

  // Los datos que la IA leyó de las fotos. No se los pide al usuario justamente
  // para que no pueda escribir un número que no es el de su documento.
  const scanned = [
    [tr("kyc.docNumber"), submission.documentNumber],
    [tr("kyc.docName"), submission.fullNameOnDocument],
    [tr("kyc.licExpires"), prettyDate(submission.licenseExpiresAt)],
  ].filter(([, value]) => Boolean(value));

  // Por qué la revisión no aprobó. Vienen como códigos estables (sin datos
  // personales), así que se traducen; uno que este front no conozca se muestra
  // crudo antes que esconder el motivo.
  const motivos = (submission.reasonCodes ?? []).map(motivoDeRevision);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusChip tone={state.tone}>{state.label}</StatusChip>
        {submission.createdAt && (
          <span style={{ fontSize: 12, color: "var(--fw-text-4)" }}>
            {tr("kyc.sentOn", { date: prettyDate(submission.createdAt) })}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        {fotos.map(({ slot, key, url }) => (
          url ? (
            <a key={slot} href={url} target="_blank" rel="noopener noreferrer"
              title={tr("kyc.openBig")}
              style={{ textDecoration: "none", color: "inherit" }}>
              <img src={url} alt={tr(key)} style={{
                width: size, height: size * 0.66, objectFit: "cover",
                borderRadius: 8, border: "1px solid var(--fw-border)", display: "block", background: "var(--fw-bg)",
              }} />
              <div style={{ fontSize: 11, color: "var(--fw-text-3)", marginTop: 4, maxWidth: size }}>{tr(key)}</div>
            </a>
          ) : (
            <div key={slot}>
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
              <div style={{ fontSize: 11, color: "var(--fw-text-3)", marginTop: 4, maxWidth: size }}>{tr(key)}</div>
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
          {motivos.map(({ code, clave }) => (
            <div key={code} style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
              · {clave ? tr(clave) : code}
            </div>
          ))}
        </div>
      )}

      {submission.notes && (
        <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginTop: 10, lineHeight: 1.6 }}>
          {submission.notes}
        </div>
      )}
    </div>
  );
}
