import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import BookingCalendar from "../../components/BookingCalendar";
import { getListingById, createBooking } from "../../services/api";

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
  carPrice: { fontWeight: 800, fontSize: 18, color: "#2563eb" },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, fontSize: 13, color: "#1e40af", lineHeight: 1.6 },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14, fontSize: 13, color: "#b91c1c", marginTop: 12 },
};

function CarSummaryCard({ car, mobile }) {
  return (
    <div style={s.carCard}>
      <div style={mobile ? s.carImgMobile : s.carImg}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ color: "#9ca3af", fontSize: 13 }}>Sin foto</div>}
      </div>
      <div style={s.carBody}>
        <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
        <div style={s.carMeta}>{car.location}</div>
        <div style={s.carPrice}>${Number(car.price_per_day).toLocaleString()}/día</div>
      </div>
    </div>
  );
}

export default function Booking() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      .catch(() => setError("No se pudo cargar el listing."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirm = async ({ start, end, days, total, commission, deposit, totalFinal }) => {
    if (!user) { navigate("/login"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({
        listingId: id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      navigate(`/payment/${booking.id}`, {
        state: { booking, car: listing, days, total, commission, deposit, totalFinal, startDate: start.toISOString(), endDate: end.toISOString() },
      });
    } catch (err) {
      setError(err.message || "Error al crear la reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Cargando...</div>;
  if (!listing) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Listing no encontrado.</div>;

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.titleMobile : s.title}>Reservar auto</div>
      <div style={s.sub}>Elegí las fechas y confirmá tu reserva</div>
      {isMobile && <CarSummaryCard car={listing} mobile />}
      {isMobile ? (
        <div>
          <BookingCalendar listingId={id} car={listing} onConfirm={submitting ? () => {} : handleConfirm} />
          {error && <div style={s.errorBox}>{error}</div>}
          {submitting && <div style={{ textAlign: "center", padding: "16px 0", color: "#2563eb", fontSize: 14 }}>Creando reserva...</div>}
          <div style={{ ...s.infoBox, marginTop: 16 }}><strong>Recordá:</strong> El pago se procesa solo cuando el dueño confirma la reserva.</div>
        </div>
      ) : (
        <div style={s.grid}>
          <div>
            <BookingCalendar listingId={id} car={listing} onConfirm={submitting ? () => {} : handleConfirm} />
            {error && <div style={s.errorBox}>{error}</div>}
            {submitting && <div style={{ textAlign: "center", padding: "16px 0", color: "#2563eb", fontSize: 14 }}>Creando reserva...</div>}
          </div>
          <div>
            <CarSummaryCard car={listing} />
            <div style={s.infoBox}><strong>Recordá:</strong> El pago se procesa solo cuando el dueño confirma la reserva.</div>
          </div>
        </div>
      )}
    </div>
  );
}