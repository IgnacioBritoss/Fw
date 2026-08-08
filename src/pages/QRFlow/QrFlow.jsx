// ============================================================================
//  QRFlow — Retiro y devolución del auto con QR / token
// ----------------------------------------------------------------------------
//  Es el momento en que el auto cambia de manos, y funciona como el código de
//  un envío: uno MUESTRA su código y el otro lo CONFIRMA.
//
//   · RETIRO:     el conductor muestra su QR  →  el DUEÑO lo confirma.
//   · DEVOLUCIÓN: el dueño muestra su QR      →  el CONDUCTOR lo confirma.
//
//  Cada uno ve solo lo que le toca, porque el backend entrega a cada parte
//  únicamente su token y solo en el estado correcto de la reserva.
//
//  Qué se arregló acá: la pantalla existía pero no estaba enlazada en la app (la
//  ruta /qr/:id no existía, así que el botón de "Mis reservas" no llevaba a
//  ninguna parte), leía los tokens con nombres de campo que el backend no
//  devuelve, y le mostraba a los dos usuarios el mismo formulario.
// ============================================================================
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getBookingTokens, confirmPickup, confirmReturn, getBookingById } from "../../services/api";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";

const s = {
  page: { maxWidth: 480, margin: "0 auto", padding: "40px 24px", textAlign: "center" },
  pageMobile: { maxWidth: 480, margin: "0 auto", padding: "20px 16px", textAlign: "center" },
  title: { fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  qrBox: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  tokenDisplay: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px", fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: 1.5, color: "#111827", marginBottom: 12, wordBreak: "break-all" },
  tokenLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  input: { width: "100%", padding: "12px 16px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  btn: { width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  btnDisabled: { width: "100%", padding: "14px", background: "#93c5fd", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "not-allowed", marginBottom: 10 },
  successIcon: { width: 72, height: 72, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, fontSize: 13, color: "#b91c1c", marginBottom: 16 },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 12, fontSize: 13, color: "#1e40af", marginBottom: 16 },
  tabRow: { display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

// Dibuja el QR a partir del token con un servicio que genera la imagen. Si no
// carga, queda el token en texto, que sirve igual.
function QRDisplay({ token }) {
  if (!token) return null;
  const size = 180;
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(token)}&bgcolor=ffffff&color=000000&qzone=1`}
      alt=""
      style={{ width: size, height: size, borderRadius: 10, display: "block", margin: "0 auto 12px" }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}

export default function QRFlow() {
  const { t: tr } = useI18n();
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const [mode, setMode] = useState(searchParams.get("mode") === "return" ? "return" : "pickup");
  const [booking, setBooking] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);

  // Trae la reserva y los tokens que le corresponden a este usuario.
  const load = () => {
    setLoading(true);
    Promise.all([getBookingById(bookingId), getBookingTokens(bookingId).catch(() => null)])
      .then(([b, t]) => { setBooking(b); setTokens(t); })
      .catch((err) => setError(err.message || tr("qr.loadFailed")))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [bookingId]);

  const isOwner = booking?.ownerId === user?.id;

  // Quién confirma cada paso: el retiro lo confirma el dueño (con el token del
  // conductor) y la devolución la confirma el conductor (con el token del dueño).
  const iConfirm = mode === "pickup" ? isOwner : !isOwner;

  // El token propio a mostrar: el conductor tiene el de retiro y el dueño el de
  // devolución. El backend solo lo entrega en el estado correcto de la reserva.
  const myToken = mode === "pickup" ? tokens?.pickupQrToken : tokens?.returnQrToken;

  const handleConfirm = async () => {
    if (!tokenInput.trim()) { setError(tr("qr.errEmpty")); return; }
    setConfirming(true);
    setError(null);
    try {
      if (mode === "pickup") await confirmPickup(bookingId, tokenInput.trim());
      else await confirmReturn(bookingId, tokenInput.trim());
      setConfirmed(true);
    } catch (err) {
      setError(err.message || tr("qr.errBadCode"));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <Spinner block label={tr("common.loading")} />;

  if (!booking) return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
      {error || tr("qr.notFound")}
      <br />
      <button onClick={() => navigate("/my-bookings")} style={{ marginTop: 16, padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>{tr("nav.bookings")}</button>
    </div>
  );

  if (confirmed) {
    return (
      <div style={isMobile ? s.pageMobile : s.page}>
        <div style={s.successIcon}><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div style={s.title}>{tr(mode === "pickup" ? "qr.pickupDone" : "qr.returnDone")}</div>
        <div style={s.sub}>
          {tr(mode === "pickup" ? "qr.pickupDoneNote" : "qr.returnDoneNote")}
        </div>
        <button style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("payment.seeBookings")}</button>
      </div>
    );
  }

  const vehicle = booking?.listing?.vehicle || booking?.vehicle || {};

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.title}>{tr(mode === "pickup" ? "qr.pickupTitle" : "qr.returnTitle")}</div>
      <div style={s.sub}>
        {`${vehicle.brand || ""} ${vehicle.model || ""}`.trim()}
        {" — "}
        {tr(iConfirm ? "qr.askCode" : "qr.showCode")}
      </div>

      <div style={s.tabRow}>
        {[["pickup", "qr.pickup"], ["return", "qr.return"]].map(([k, l]) => (
          <button key={k} style={{ ...s.tab, background: mode === k ? "#fff" : "transparent", color: mode === k ? "#2563eb" : "#6b7280", boxShadow: mode === k ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}
            onClick={() => { setMode(k); setError(null); setTokenInput(""); }}>{tr(l)}</button>
        ))}
      </div>

      {/* MI CÓDIGO — solo para quien tiene que mostrarlo */}
      {!iConfirm && (
        myToken ? (
          <div style={s.qrBox}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, fontWeight: 600 }}>
              {tr(mode === "pickup" ? "qr.myPickupQr" : "qr.myReturnQr")}
            </div>
            <QRDisplay token={myToken} />
            <div style={s.tokenLabel}>{tr("qr.code")}</div>
            <div style={s.tokenDisplay}>{myToken}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              {tr(mode === "pickup" ? "qr.showToOwner" : "qr.showToDriver")}
            </div>
          </div>
        ) : (
          <div style={s.infoBox}>
            {tr("qr.noCodeYet")}
            {" "}{tr(mode === "pickup" ? "qr.noCodePickup" : "qr.noCodeReturn")}
          </div>
        )
      )}

      {/* CONFIRMAR — solo para quien tiene que confirmar */}
      {iConfirm && (
        <div style={{ ...s.qrBox, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 6 }}>
            {tr(mode === "pickup" ? "qr.confirmPickup" : "qr.confirmReturn")}
          </div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 12 }}>
            {tr(mode === "pickup" ? "qr.enterDriverCode" : "qr.enterOwnerCode")}
          </div>
          <input style={s.input} placeholder={tr("qr.phCode")} value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()} />
          {error && <div style={s.errorBox}>{error}</div>}
          <button style={confirming ? s.btnDisabled : s.btn} disabled={confirming} onClick={handleConfirm}>
            {confirming ? tr("car.confirming") : tr(mode === "pickup" ? "qr.confirmPickup" : "qr.confirmReturn")}
          </button>
        </div>
      )}

      {!iConfirm && error && <div style={s.errorBox}>{error}</div>}

      <button style={{ padding: "10px 0", background: "transparent", border: "none", color: "#2563eb", fontSize: 13, fontWeight: 600, cursor: "pointer" }} onClick={load}>
        {tr("qr.refresh")}
      </button>
      <br />
      <button style={{ padding: "10px 0", background: "transparent", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer" }} onClick={() => navigate("/my-bookings")}>{tr("qr.backToBookings")}</button>
    </div>
  );
}
