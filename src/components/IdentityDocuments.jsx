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
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import StatusChip from "./StatusChip";

const PHOTOS = [
  { field: "dniFrontUrl", label: "Frente del DNI" },
  { field: "dniBackUrl", label: "Dorso del DNI" },
  { field: "licenseFrontUrl", label: "Frente de la licencia" },
  { field: "licenseBackUrl", label: "Dorso de la licencia" },
];

/** Cómo se muestra cada estado, en castellano y con el color que le corresponde. */
const STATUS = {
  VERIFIED: { label: "Aprobada", tone: "ok" },
  REJECTED: { label: "Rechazada", tone: "danger" },
  ID_SUBMITTED: { label: "Esperando revisión", tone: "warn" },
};

const prettyDate = (value) => {
  if (!value) return null;
  try {
    return format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return null;
  }
};

export default function IdentityDocuments({ submission, compact = false }) {
  if (!submission) return null;

  const state = STATUS[submission.status] ?? {
    label: submission.status, tone: "neutral",
  };
  const size = compact ? 96 : 132;

  // Los datos que la IA leyó de las fotos. No se los pide al usuario justamente
  // para que no pueda escribir un número que no es el de su documento.
  const scanned = [
    ["Número de documento", submission.documentNumber],
    ["Nombre en el documento", submission.fullNameOnDocument],
    ["Vence la licencia", prettyDate(submission.licenseExpiresAt)],
  ].filter(([, value]) => Boolean(value));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusChip tone={state.tone}>{state.label}</StatusChip>
        {submission.createdAt && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Enviada el {prettyDate(submission.createdAt)}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: scanned.length ? 12 : 0 }}>
        {PHOTOS.map(({ field, label }) => {
          const url = submission[field];
          if (!url) return null;
          return (
            <a key={field} href={url} target="_blank" rel="noopener noreferrer"
              title="Abrir en grande"
              style={{ textDecoration: "none", color: "inherit" }}>
              <img src={url} alt={label} style={{
                width: size, height: size * 0.66, objectFit: "cover",
                borderRadius: 8, border: "1px solid #e5e7eb", display: "block", background: "#f3f4f6",
              }} />
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, maxWidth: size }}>{label}</div>
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
            LEÍDO DE LAS FOTOS
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
