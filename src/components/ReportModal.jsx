import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  modal: { background: "#fff", borderRadius: 16, padding: 28,
    width: "90%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.2)" },
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

const REASONS = [
  "Seleccioná un motivo...",
  "Información falsa en la publicación",
  "Comportamiento inapropiado",
  "Intento de estafa o fraude",
  "Vehículo en mal estado no declarado",
  "Incumplimiento de condiciones acordadas",
  "Perfil falso o suplantación de identidad",
  "Otro motivo",
];

export default function ReportModal({ target, targetType, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = reason !== REASONS[0] && detail.trim().length >= 30;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const reports = JSON.parse(localStorage.getItem("fw_reports") || "[]");
    reports.push({
      id: Date.now().toString(),
      reporter_id: user.id,
      reporter_name: user.name,
      target,
      targetType,
      reason,
      detail: detail.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("fw_reports", JSON.stringify(reports));
    setDone(true);
  };

  if (done) return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.success}>
          <div style={s.successIcon}>✅</div>
          <div style={s.successTitle}>Reporte enviado correctamente</div>
          <div style={s.successSub}>
            Nuestro equipo va a revisar tu reporte en las próximas 24 horas.
            Gracias por ayudarnos a mantener la comunidad segura.
          </div>
          <button style={{ ...s.btnReport, marginTop: 20, width: "100%" }}
            onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.title}>Reportar {targetType === "car" ? "publicación" : "usuario"}</div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        <label style={s.label}>Motivo del reporte</label>
        <select style={s.select} value={reason} onChange={e => setReason(e.target.value)}>
          {REASONS.map(r => <option key={r}>{r}</option>)}
        </select>

        <label style={s.label}>Descripción detallada</label>
        <textarea
          style={s.textarea}
          placeholder="Describí con detalle qué pasó. Cuanta más información des, más fácil será para el equipo revisar tu reporte. Mínimo 30 caracteres."
          value={detail}
          onChange={e => setDetail(e.target.value)}
          maxLength={500}
        />
        <div style={s.counter}>{detail.length}/500 caracteres · mínimo 30</div>

        <div style={s.warning}>
          ⚠️ Los reportes falsos o malintencionados pueden resultar en la suspensión
          de tu cuenta. Solo reportá situaciones reales.
        </div>

        <div style={s.btnRow}>
          <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button
            style={{ ...s.btnReport, ...(canSubmit ? {} : s.btnReportDisabled) }}
            onClick={handleSubmit}
            disabled={!canSubmit}>
            Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
}