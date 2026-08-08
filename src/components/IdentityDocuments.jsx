// ============================================================================
//  IdentityDocuments — Las fotos del DNI y la licencia de una solicitud
// ----------------------------------------------------------------------------
//  Se usa en dos lugares y en ningún otro:
//   · el perfil propio, para que cada uno vea qué mandó y qué se leyó de ahí;
//   · el panel de administración, para poder aprobar o rechazar mirando.
//
//  NO se usa en el perfil público. Las fotos de un DNI son material con el que se
//  suplanta una identidad: a los demás usuarios se les muestra el cartel de
//  "Identidad verificada" y los últimos cuatro dígitos del documento, que es lo
//  que sirve para cotejar sin repartir el documento de nadie.
//
//  Props:
//    · submission → una fila de UserVerification (la que devuelve el backend)
//    · compact    → miniaturas más chicas, para la lista del panel admin
// ============================================================================
import StatusChip from "./StatusChip";
import { useI18n } from "../i18n/core";
import { longDate } from "../i18n/dates";

const PHOTOS = [
  { field: "dniFrontUrl", key: "kyc.dniFront" },
  { field: "dniBackUrl", key: "kyc.dniBack" },
  { field: "licenseFrontUrl", key: "kyc.licFront" },
  { field: "licenseBackUrl", key: "kyc.licBack" },
];

/** Cómo se muestra cada estado, con el color que le corresponde. */
const STATUS = {
  VERIFIED: { key: "kyc.approved", tone: "ok" },
  REJECTED: { key: "kyc.rejected", tone: "danger" },
  ID_SUBMITTED: { key: "kyc.waitingReview", tone: "warn" },
};

export default function IdentityDocuments({ submission, compact = false }) {
  const { t: tr, lang } = useI18n();
  const prettyDate = (value) => longDate(value, lang) || null;
  if (!submission) return null;

  const state = STATUS[submission.status]
    ? { label: tr(STATUS[submission.status].key), tone: STATUS[submission.status].tone }
    : { label: submission.status, tone: "neutral" };
  const size = compact ? 96 : 132;

  // Los datos que la IA leyó de las fotos. No se los pide al usuario justamente
  // para que no pueda escribir un número que no es el de su documento.
  const scanned = [
    [tr("kyc.docNumber"), submission.documentNumber],
    [tr("kyc.docName"), submission.fullNameOnDocument],
    [tr("kyc.licExpires"), prettyDate(submission.licenseExpiresAt)],
  ].filter(([, value]) => Boolean(value));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusChip tone={state.tone}>{state.label}</StatusChip>
        {submission.createdAt && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            {tr("kyc.sentOn", { date: prettyDate(submission.createdAt) })}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: scanned.length ? 12 : 0 }}>
        {PHOTOS.map(({ field, key }) => {
          const url = submission[field];
          if (!url) return null;
          return (
            <a key={field} href={url} target="_blank" rel="noopener noreferrer"
              title={tr("kyc.openBig")}
              style={{ textDecoration: "none", color: "inherit" }}>
              <img src={url} alt={tr(key)} style={{
                width: size, height: size * 0.66, objectFit: "cover",
                borderRadius: 8, border: "1px solid #e5e7eb", display: "block", background: "#f3f4f6",
              }} />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, maxWidth: size }}>{tr(key)}</div>
            </a>
          );
        })}
      </div>

      {scanned.length > 0 && (
        <div style={{
          background: "#f8fafc", border: "1px solid #e5e7eb", borderLeft: "3px solid #2563eb",
          borderRadius: 8, padding: "10px 12px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", marginBottom: 6 }}>
            {tr("kyc.readFromPhotos")}
          </div>
          {scanned.map(([label, value]) => (
            <div key={label} style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.7 }}>
              {label}: <strong style={{ color: "#111827" }}>{value}</strong>
            </div>
          ))}
        </div>
      )}

      {submission.notes && (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.6 }}>
          {submission.notes}
        </div>
      )}
    </div>
  );
}
