// ============================================================================
//  ReportModal — Ventana emergente para reportar una publicación o un usuario
// ----------------------------------------------------------------------------
//  Muestra un formulario (motivo + descripción) para denunciar contenido o
//  comportamiento indebido. Exige elegir un motivo y escribir al menos 30
//  caracteres. Al enviar, lo guarda EN EL BACKEND y muestra la confirmación.
//
//  Antes el reporte se guardaba en localStorage del propio navegador de quien
//  reportaba: quedaba en su computadora y nadie lo veía nunca. Ahora va a la base,
//  la IA lo compara con la publicación denunciada para decir si tiene relación, y
//  aparece en el panel de las cuentas administradoras, que pueden pausar o
//  eliminar el aviso.
//
//  Props:
//    · targetId    → el ID de la publicación o de la persona (es lo que se manda)
//    · targetLabel → cómo se llama, solo para mostrarlo en el título
//    · targetType  → "car" (publicación) o "user" (persona)
//    · onClose
// ============================================================================
import { useState } from "react";
import { createReport } from "../services/api";
import { uploadImageToCloudinary } from "../services/cloudinary";
<<<<<<< HEAD
=======
import { useI18n } from "../i18n/core";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
import Select from "./Select";

// Estilos en línea de la ventana modal.
const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  // maxHeight + scroll propio: con las pruebas adjuntas el formulario creció, y
  // en un celular con 5 miniaturas el botón de enviar quedaba abajo del borde de
  // la pantalla sin manera de llegar.
  modal: { background: "#fff", borderRadius: 16, padding: 28,
    width: "90%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
    maxHeight: "90vh", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 700, color: "#111827" },
  closeBtn: { background: "none", border: "none", fontSize: 22,
    cursor: "pointer", color: "#6b7280" },
  label: { display: "block", fontSize: 13, fontWeight: 500,
    color: "#374151", marginBottom: 6 },
  select: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 14, marginBottom: 16, background: "#fff" },
  textarea: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 14, height: 120,
    resize: "none", outline: "none", marginBottom: 6 },
  counter: { fontSize: 11, color: "#9ca3af", textAlign: "right", marginBottom: 16 },
  warning: { background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px", fontSize: 12,
    color: "#b91c1c", marginBottom: 16, lineHeight: 1.6 },
  btnRow: { display: "flex", gap: 10 },
  btnCancel: { flex: 1, padding: "11px", background: "transparent",
    border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14,
    cursor: "pointer", color: "#374151" },
  btnReport: { flex: 1, padding: "11px", background: "#dc2626", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnReportDisabled: { background: "#fca5a5", cursor: "not-allowed" },
  success: { textAlign: "center", padding: "20px 0" },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  successSub: { fontSize: 13, color: "#6b7280" },
};

// Motivos sugeridos. La última opción abre un campo libre: ninguna lista cerrada
// cubre todo lo que puede pasar, y forzar a elegir "Otro motivo" sin poder
// explicar el motivo real deja al admin sin la información que necesita.
const OTHER = "__otro__";

/** Tope de archivos y de peso por archivo (el backend valida lo mismo). */
const MAX_EVIDENCE = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
<<<<<<< HEAD
const REASONS = [
  "Información falsa en la publicación",
  "Comportamiento inapropiado",
  "Intento de estafa o fraude",
  "Vehículo en mal estado no declarado",
  "Incumplimiento de condiciones acordadas",
  "Perfil falso o suplantación de identidad",
];

export default function ReportModal({ targetId, targetLabel, targetType, onClose }) {
=======
// Los motivos se guardan como CLAVES: el reporte que llega al admin lleva el
// texto en el idioma en que lo eligió la persona, y la lista se lee traducida.
const REASON_KEYS = [
  "report.r1", "report.r2", "report.r3", "report.r4", "report.r5", "report.r6",
];

export default function ReportModal({ targetId, targetLabel, targetType, onClose }) {
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const [reason, setReason] = useState("");          // motivo elegido de la lista
  const [customReason, setCustomReason] = useState(""); // motivo escrito a mano
  const [detail, setDetail] = useState("");          // descripción escrita
  const [done, setDone] = useState(false);           // ¿ya se envió?
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // Pruebas: cada una es { id, dataUrl, file }. Se suben a Cloudinary al enviar,
  // no al elegirlas, para no dejar archivos colgados si la persona se arrepiente.
  const [evidence, setEvidence] = useState([]);

  // El motivo que se manda: el elegido de la lista, o el escrito a mano.
  const finalReason = reason === OTHER ? customReason.trim() : reason;

  // Para enviar hacen falta las tres cosas: motivo, descripción y AL MENOS UNA
  // PRUEBA. Sin prueba es la palabra de uno contra la del otro, y el admin no
  // tiene con qué decidir si pausar una publicación o suspender una cuenta.
  const canSubmit =
    finalReason.length >= 3 && detail.trim().length >= 30 && evidence.length > 0;

  /** Agrega los archivos elegidos, hasta 5, avisando si alguno no sirve. */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setError("");

    const libres = MAX_EVIDENCE - evidence.length;
    if (libres <= 0) {
<<<<<<< HEAD
      setError(`Podés adjuntar hasta ${MAX_EVIDENCE} archivos.`);
=======
      setError(tr("report.maxFiles", { max: MAX_EVIDENCE }));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      return;
    }

    for (const file of files.slice(0, libres)) {
      if (!file.type.startsWith("image/")) {
<<<<<<< HEAD
        setError("Solo se pueden adjuntar imágenes (foto o captura de pantalla).");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" pesa más de 5MB. Probá con una foto más liviana.`);
=======
        setError(tr("report.onlyImages"));
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(tr("report.tooBig", { name: file.name }));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEvidence(prev => prev.length >= MAX_EVIDENCE
          ? prev
          : [...prev, { id: `${file.name}-${Date.now()}-${Math.random()}`, dataUrl: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    }
    if (files.length > libres) {
      setError(`Solo se agregaron ${libres}: el máximo es ${MAX_EVIDENCE} archivos.`);
    }
  };

  const removeEvidence = (id) =>
    setEvidence(prev => prev.filter(item => item.id !== id));

  // Manda el reporte al backend y muestra la pantalla de éxito.
  const handleSubmit = async () => {
    if (!canSubmit || sending) return;
    setSending(true);
    setError("");
    try {
      // Primero las pruebas: si alguna falla, el reporte no se crea a medias.
      const evidenceUrls = await Promise.all(
        evidence.map(item => uploadImageToCloudinary(item.dataUrl)),
      );

      await createReport({
        targetType: targetType === "car" ? "LISTING" : "USER",
        ...(targetType === "car" ? { listingId: targetId } : { targetUserId: targetId }),
        reason: finalReason,
        details: detail.trim(),
        evidenceUrls,
      });
      setDone(true);
    } catch (err) {
<<<<<<< HEAD
      setError(err.message || "No pudimos enviar el reporte. Intentá de nuevo.");
=======
      setError(err.message || tr("report.sendFailed"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    } finally {
      setSending(false);
    }
  };

  if (done) return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.success}>
          <div style={s.successIcon}><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
<<<<<<< HEAD
          <div style={s.successTitle}>Reporte enviado correctamente</div>
          <div style={s.successSub}>
            Ya quedó registrado y le llega al equipo de administración.
            Gracias por ayudarnos a mantener la comunidad segura.
=======
          <div style={s.successTitle}>{tr("report.sent")}</div>
          <div style={s.successSub}>
            {tr("report.sentNote")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
          <button style={{ ...s.btnReport, marginTop: 20, width: "100%" }}
            onClick={onClose}>{tr("common.close")}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.title}>
<<<<<<< HEAD
            Reportar {targetType === "car" ? "publicación" : "usuario"}
=======
            {tr(targetType === "car" ? "report.titleListing" : "report.titleUser")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            {targetLabel ? <span style={{ fontWeight: 500, color: "#6b7280" }}>: {targetLabel}</span> : null}
          </div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

<<<<<<< HEAD
        <label style={s.label}>Motivo del reporte</label>
=======
        <label style={s.label}>{tr("report.reason")}</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        {/* Desplegable propio: el <select> nativo abre la lista del sistema
            operativo, que no respeta nada del diseño de la página. */}
        <Select
          value={reason}
          onChange={setReason}
<<<<<<< HEAD
          placeholder="Seleccioná un motivo..."
          options={[
            ...REASONS.map(r => ({ value: r, label: r })),
            { value: OTHER, label: "Otro motivo (lo escribo yo)" },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* Motivo propio: aparece solo al elegir "Otro motivo". */}
        {reason === OTHER && (
          <input
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            maxLength={160}
            placeholder="Escribí el motivo en pocas palabras"
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 8,
              border: "1.5px solid #d1d5db", fontSize: 14, marginBottom: 16,
              outline: "none", boxSizing: "border-box", color: "#111827",
            }}
          />
        )}
=======
          placeholder={tr("report.pickReason")}
          options={[
            ...REASON_KEYS.map(k => ({ value: tr(k), label: tr(k) })),
            { value: OTHER, label: tr("report.other") },
          ]}
          style={{ marginBottom: 16 }}
        />
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

        {/* Motivo propio: aparece solo al elegir "Otro motivo". */}
        {reason === OTHER && (
          <input
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            maxLength={160}
            placeholder={tr("report.phOwnReason")}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 8,
              border: "1.5px solid #d1d5db", fontSize: 14, marginBottom: 16,
              outline: "none", boxSizing: "border-box", color: "#111827",
            }}
          />
        )}

        <label style={s.label}>{tr("report.detail")}</label>
        <textarea
          style={s.textarea}
          placeholder={tr("report.phDetail")}
          value={detail}
          onChange={e => setDetail(e.target.value)}
          maxLength={500}
        />
        <div style={s.counter}>{tr("report.counter", { count: detail.length })}</div>

        {/* PRUEBAS — obligatorias.
            Un reporte sin evidencia es la palabra de uno contra la del otro: el
            admin no tiene con qué decidir si pausar una publicación o suspender
            una cuenta, y abre la puerta a reportes hechos por despecho. */}
        <label style={s.label}>
          {tr("report.proof")} <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, lineHeight: 1.5 }}>
          {tr("report.proofNote", { max: MAX_EVIDENCE })}
        </div>

        <input
          id="report-evidence"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {evidence.map(item => (
            <div key={item.id} style={{ position: "relative", width: 74, height: 74 }}>
              <img src={item.dataUrl} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <button
                type="button"
                onClick={() => removeEvidence(item.id)}
                aria-label={tr("report.removeProof")}
                style={{
                  position: "absolute", top: -6, right: -6, width: 22, height: 22,
                  minHeight: 22, borderRadius: "50%", background: "#111827", color: "#fff",
                  border: "2px solid #fff", cursor: "pointer", fontSize: 13, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}

          {evidence.length < MAX_EVIDENCE && (
            <button
              type="button"
              onClick={() => document.getElementById("report-evidence")?.click()}
              style={{
                width: 74, height: 74, minHeight: 74, borderRadius: 8,
                border: `1.5px dashed ${evidence.length === 0 ? "#fca5a5" : "#d1d5db"}`,
                background: evidence.length === 0 ? "#fef2f2" : "#f9fafb",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: "#6b7280", fontSize: 11, fontWeight: 600, padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {tr("report.add")}
            </button>
          )}
        </div>

        {/* PRUEBAS — obligatorias.
            Un reporte sin evidencia es la palabra de uno contra la del otro: el
            admin no tiene con qué decidir si pausar una publicación o suspender
            una cuenta, y abre la puerta a reportes hechos por despecho. */}
        <label style={s.label}>
          Pruebas <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, lineHeight: 1.5 }}>
          Adjuntá al menos una foto o captura que respalde lo que contás (el auto,
          el daño, la conversación). Hasta {MAX_EVIDENCE} imágenes de 5MB cada una.
        </div>

        <input
          id="report-evidence"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {evidence.map(item => (
            <div key={item.id} style={{ position: "relative", width: 74, height: 74 }}>
              <img src={item.dataUrl} alt="Prueba adjuntada"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <button
                type="button"
                onClick={() => removeEvidence(item.id)}
                aria-label="Quitar esta prueba"
                style={{
                  position: "absolute", top: -6, right: -6, width: 22, height: 22,
                  minHeight: 22, borderRadius: "50%", background: "#111827", color: "#fff",
                  border: "2px solid #fff", cursor: "pointer", fontSize: 13, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}

          {evidence.length < MAX_EVIDENCE && (
            <button
              type="button"
              onClick={() => document.getElementById("report-evidence")?.click()}
              style={{
                width: 74, height: 74, minHeight: 74, borderRadius: 8,
                border: `1.5px dashed ${evidence.length === 0 ? "#fca5a5" : "#d1d5db"}`,
                background: evidence.length === 0 ? "#fef2f2" : "#f9fafb",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                color: "#6b7280", fontSize: 11, fontWeight: 600, padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar
            </button>
          )}
        </div>

        <div style={s.warning}>
<<<<<<< HEAD
          Importante: los reportes falsos o malintencionados pueden resultar en la suspensión
          de tu cuenta. Solo reportá situaciones reales.
=======
          {tr("report.warning")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>

        <div style={s.btnRow}>
          <button style={s.btnCancel} onClick={onClose}>{tr("common.cancel")}</button>
          <button
            style={{ ...s.btnReport, ...(canSubmit && !sending ? {} : s.btnReportDisabled) }}
            onClick={handleSubmit}
            disabled={!canSubmit || sending}>
<<<<<<< HEAD
            {sending ? "Enviando..." : "Enviar reporte"}
=======
            {sending ? tr("common.sending") : tr("report.submit")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        </div>
        {error && (
          <div style={{ ...s.warning, marginTop: 12, marginBottom: 0 }}>{error}</div>
        )}
      </div>
    </div>
  );
}