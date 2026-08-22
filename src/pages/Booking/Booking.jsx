// ============================================================================
//  Booking — Pantalla de RESERVA (elegir fechas)
// ----------------------------------------------------------------------------
//  Muestra el resumen del auto y el calendario para elegir el rango de fechas.
//  Al confirmar, crea la reserva en el backend y lleva a la pantalla de pago,
//  pasándole todo el detalle (fechas y montos) por el "state" de la navegación.
// ============================================================================
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import BookingCalendar from "../../components/BookingCalendar";
import { getListingById, createBooking } from "../../services/api";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import { useCurrency } from "../../context/CurrencyContext";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  titleMobile: { fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 28 },
  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 32 },
  carCard: { background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #f3f4f6", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)" },
  carImg: { width: "100%", height: 180, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  carImgMobile: { width: "100%", height: 140, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  carBody: { padding: 16 },
  carTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#111827" },
  carMeta: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  carPrice: { fontWeight: 800, fontSize: 18, color: "#0f6ce6" },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, fontSize: 13, color: "#1e40af", lineHeight: 1.6 },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginTop: 12 },
};

// Tarjeta chica con la foto y datos del auto que se está por reservar.
function CarSummaryCard({ car, mobile }) {
  const { t: tr } = useI18n();
  const { precio } = useCurrency();
  return (
    <div style={s.carCard}>
      <div style={mobile ? s.carImgMobile : s.carImg}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ color: "#9ca3af", fontSize: 13 }}>{tr("common.noPhoto")}</div>}
      </div>
      <div style={s.carBody}>
        <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
        <div style={s.carMeta}>{car.location}</div>
        <div style={s.carPrice}>{precio(car.price_per_day)}{tr("common.perDay")}</div>
      </div>
    </div>
  );
}

export default function Booking() {
  const { t: tr } = useI18n();
  const { id } = useParams();
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Al cargar: trae la publicación por su id y arma el objeto del auto.
  useEffect(() => {
    getListingById(id)
      .then((data) => {
        const v = data.vehicle || {};
        setListing({
          id: data.id,
          brand: v.brand || "",
          model: v.model || "",
          year: v.year || "",
          price_per_day: data.pricePerDay || 0,
          location: data.locationText || "",
          photos: data.photos || [],
          ownerId: data.ownerId,
        });
      })
      .catch(() => setError(tr("booking.loadFailed")))
      .finally(() => setLoading(false));
  }, [id, tr]);

  /**
   * Se llama desde el calendario al confirmar. Crea la SOLICITUD de reserva; el
   * pago viene después, cuando el dueño la acepta.
   */
  const handleConfirm = async ({ start, end }) => {
    if (!user) { navigate("/login"); return; }
    setSubmitting(true);
    setError(null);
    setNeedsVerification(false);
    try {
      const booking = await createBooking({
        listingId: id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      // La reserva queda pendiente de que el dueño la acepte: se manda a "Mis
      // reservas", que es donde se ve el estado y el paso siguiente. Antes se
      // iba directo a pagar, algo que el backend todavía no permite.
      navigate("/my-bookings", { state: { justRequested: booking.id } });
    } catch (err) {
      // La cuenta sin verificar es el motivo más común: se explica qué hacer.
      if (err.code === "ACCOUNT_NOT_VERIFIED" || err.status === 403) {
        setNeedsVerification(true);
        setError(tr("booking.needVerified"));
      } else {
        setError(err.message || tr("booking.createFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Aviso de cuenta sin verificar.
   *
   * Se muestra ANTES de intentar reservar, no después del rechazo del servidor.
   * El backend contesta 403 igual —esa es la garantía—, pero enterarse recién al
   * apretar "confirmar", con las fechas ya elegidas, es hacerle perder el tiempo a
   * la persona por algo que se sabía desde que entró a la pantalla.
   */
  const avisoVerificacion = (needsVerification || (user && !isVerified)) && (
    <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontSize: 13, color: "#9a3412" }}>{tr("booking.needVerified")}</div>
      <button style={{ padding: "9px 16px", background: "#ea580c", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        onClick={() => navigate("/kyc")}>{tr("profile.verifyNow")}</button>
    </div>
  );

  if (loading) return <Spinner block label={tr("common.loading")} />;
  if (!listing) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>{tr("booking.notFound")}</div>;

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.titleMobile : s.title}>{tr("booking.title")}</div>
      <div style={s.sub}>{tr("booking.sub")}</div>
      {isMobile && <CarSummaryCard car={listing} mobile />}
      {isMobile ? (
        <div>
          <BookingCalendar listingId={id} car={listing} onConfirm={submitting ? () => {} : handleConfirm} />
          {error && <div style={s.errorBox}>{error}</div>}
          {avisoVerificacion}
          {submitting && <Spinner block label={tr("booking.creating")} />}
          <div style={{ ...s.infoBox, marginTop: 16 }}><strong>{tr("booking.remember")}</strong> {tr("booking.rememberNote")}</div>
        </div>
      ) : (
        <div style={s.grid}>
          <div>
            <BookingCalendar listingId={id} car={listing} onConfirm={submitting ? () => {} : handleConfirm} />
            {error && <div style={s.errorBox}>{error}</div>}
            {avisoVerificacion}
            {submitting && <Spinner block label={tr("booking.creating")} />}
          </div>
          <div>
            <CarSummaryCard car={listing} />
            <div style={s.infoBox}><strong>{tr("booking.remember")}</strong> {tr("booking.rememberNote")}</div>
          </div>
        </div>
      )}
    </div>
  );
}