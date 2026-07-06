// ============================================================================
//  QRFlow — Retiro y devolución del auto con QR / token
// ----------------------------------------------------------------------------
//  Cuando se concreta un alquiler, el dueño y el conductor confirman la entrega
//  (pickup) y la devolución (return) mediante un código QR / token. Esta
//  pantalla muestra el QR a mostrar y un campo para ingresar el token del otro
//  y confirmar la operación. Tiene dos modos: "pickup" (retiro) y "return".
// ============================================================================
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getBookingTokens, confirmPickup, confirmReturn, getBookingById } from "../../services/api";

const s = {
  page: { maxWidth: 480, margin: "0 auto", padding: "40px 24px", textAlign: "center" },
  pageMobile: { maxWidth: 480, margin: "0 auto", padding: "20px 16px", textAlign: "center" },
  title: { fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  qrBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  tokenDisplay: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px", fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: 4, color: "#111827", marginBottom: 12 },
  tokenLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  input: { width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  btn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  btnDisabled: { width: "100%", padding: "14px", background: "#93c5fd", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, fontSize: 13, color: "#b91c1c", marginBottom: 16 },
  tabRow: { display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

// Dibuja el QR a partir del token, usando un servicio externo que genera la
// imagen del código. Si falla la carga, oculta la imagen.
function QRDisplay({ token }) {
  if (!token) return null;
  const size = 180;
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=000000&qzone=1`}
      alt="QR Code"
      style={{ width: size, height: size, borderRadius: 10, display: "block", margin: "0 auto 12px" }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}

export default function QRFlow() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [mode, setMode] = useState(searchParams.get("mode") === "return" ? "return" : "pickup");
  const [booking, setBooking] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);

  // Al cargar: trae la reserva y sus tokens de retiro/devolución en paralelo.
  useEffect(() => {
    Promise.all([getBookingById(bookingId), getBookingTokens(bookingId).catch(() => null)])
      .then(([b, t]) => { setBooking(b); setTokens(t); })
      .catch(() => setError("No se pudo cargar la reserva."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Confirma el retiro o la devolución (según el modo) con el token ingresado.
  const handleConfirm = async () => {
    if (!tokenInput.trim()) { setError("Ingresá el token."); return; }
    setConfirming(true);
    setError(null);
    try {
      if (mode === "pickup") await confirmPickup(bookingId, tokenInput.trim());
      else await confirmReturn(bookingId, tokenInput.trim());
      setConfirmed(true);
    } catch (err) {
      setError(err.message || "Token inválido o expirado.");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>;
  if (!booking && error) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>{error}<br /><button onClick={() => navigate("/my-bookings")} style={{ marginTop: 16, padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Mis reservas</button></div>;

  if (confirmed) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div style={s.title}>{mode === "pickup" ? "Retiro confirmado" : "Devolución confirmada"}</div>
        <div style={s.sub}>{mode === "pickup" ? "El vehículo fue entregado al conductor." : "La devolución fue registrada. Reserva completada."}</div>
        <button style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>Ver mis reservas</button>
      </div>
    );
  }

  const activeToken = mode === "pickup" ? (tokens?.pickupToken || tokens?.pickupTokenPreview) : (tokens?.returnToken || tokens?.returnTokenPreview);

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.title}>{mode === "pickup" ? "Retiro del vehículo" : "Devolución del vehículo"}</div>
      <div style={s.sub}>{mode === "pickup" ? "Mostrá el QR al conductor o ingresá el token." : "Mostrá el QR o ingresá el token para confirmar."}</div>
      <div style={s.tabRow}>
        {[["pickup", "Retiro"], ["return", "Devolución"]].map(([k, l]) => (
          <button key={k} style={{ ...s.tab, background: mode === k ? "#fff" : "transparent", color: mode === k ? "#2563eb" : "#6b7280", boxShadow: mode === k ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}
            onClick={() => { setMode(k); setError(null); setTokenInput(""); }}>{l}</button>
        ))}
      </div>
      {activeToken && (
        <div style={s.qrBox}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>{mode === "pickup" ? "QR de retiro" : "QR de devolución"}</div>
          <QRDisplay token={activeToken} />
          <div style={s.tokenLabel}>Token</div>
          <div style={s.tokenDisplay}>{activeToken}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Mostrá este código al {mode === "pickup" ? "conductor" : "dueño"}.</div>
        </div>
      )}
      <div style={{ ...s.qrBox, textAlign: "left" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>Confirmar con token</div>
        <input style={s.input} placeholder="Ingresá el token..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConfirm()} />
        {error && <div style={s.errorBox}>{error}</div>}
        <button style={confirming ? s.btnDisabled : s.btn} disabled={confirming} onClick={handleConfirm}>
          {confirming ? "Confirmando..." : mode === "pickup" ? "Confirmar retiro" : "Confirmar devolución"}
        </button>
      </div>
      <button style={{ padding: "10px 0", background: "transparent", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>← Volver a mis reservas</button>
    </div>
  );
}