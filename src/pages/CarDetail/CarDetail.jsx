// ============================================================================
//  CarDetail — Pantalla de DETALLE de un auto (ruta /cars/:id)
// ----------------------------------------------------------------------------
//  Muestra toda la info de un auto: galería de fotos, descripción, specs,
//  equipamiento, reseñas y una tarjeta lateral con el precio.
//  - Si el que mira es el DUEÑO: puede editar el precio/descripción o eliminar.
//  - Si es otro usuario: puede guardarlo en favoritos, reservar o escribirle.
//
//  Qué se arregló acá:
//   · Se buscaba el auto primero en una copia guardada en el navegador, así que
//     podía mostrar datos viejos (o un auto ya borrado). Ahora los datos salen
//     siempre del backend.
//   · El corazón de favoritos no existía en esta pantalla.
//   · Se muestran los días ocupados, para no elegir fechas que van a fallar.
//   · El desglose de precios usaba "3 días" fijos aunque el usuario no hubiera
//     elegido ninguna fecha.
// ============================================================================
import { useState, useEffect } from "react";
import ReportModal from "../../components/ReportModal";
import { useParams, useNavigate } from "react-router-dom";
import { mockCars, mockReviews } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getListingById, getListingAvailability, startConversation,
  updateListing, deleteListing,
} from "../../services/api";
import FavoriteButton from "../../components/FavoriteButton";
import { normalizeListing } from "../../services/listings";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";

const TRANSMISSION_LABELS = { MANUAL: "Manual", AUTOMATIC: "Automático" };
const FUEL_LABELS = { GASOLINE: "Nafta", DIESEL: "Diesel", ELECTRIC: "Eléctrico", OTHER: "GNC" };

// Arma el nombre visible del dueño a partir de sus datos.
function getName(owner) {
  if (!owner) return "Dueño";
  return owner.displayName ||
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Dueño";
}

// Convierte una publicación del backend al formato "car" que usa esta pantalla,
// juntando datos del vehículo, del listing y del dueño en un solo objeto plano.
function apiListingToCar(listing) {
  const v = listing.vehicle || {};
  const owner = listing.owner || {};
  return {
    id: listing.id,
    status: listing.status,
    isOwnerFlag: listing.isOwner === true,
    brand: v.brand || "",
    model: v.model || "",
    year: v.year || "",
    price_per_day: listing.pricePerDay || 0,
    location: listing.locationText || "",
    transmission: TRANSMISSION_LABELS[v.transmission] || v.transmission || "",
    fuel: FUEL_LABELS[v.fuelType] || v.fuelType || "",
    seats: v.seats,
    doors: v.doors,
    color: v.color,
    photos: listing.photos || [],
    description: listing.description || "",
    bluetooth: v.bluetooth,
    rearCamera: v.rearCamera,
    parkingSensors: v.parkingSensors,
    horsePower: v.horsePower,
    engineDisplacementCC: v.engineDisplacementCC,
    trunkCapacityLiters: v.trunkCapacityLiters,
    fuelConsumptionLitersPer100Km: v.fuelConsumptionLitersPer100Km,
    weightKg: v.weightKg,
    observations: v.observations,
    ownerId: owner.id || "",
    ownerName: getName(owner),
    ownerInitial: getName(owner)[0]?.toUpperCase() || "D",
  };
}

const s = {
  page: { maxWidth: 860, margin: "0 auto", padding: "32px 24px" },
  pageMobile: { padding: "16px" },
  badge: {
    display: "inline-block", padding: "3px 12px",
    background: "#dbeafe", color: "#1e40af",
    borderRadius: 20, fontSize: 12, fontWeight: 600, marginRight: 8,
  },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#111827" },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  spec: {
    background: "#f9fafb", borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#374151", border: "1px solid #f3f4f6",
  },
  specLabel: { color: "#9ca3af", fontSize: 11, marginBottom: 2 },
  review: { borderBottom: "1px solid #f3f4f6", paddingBottom: 14, marginBottom: 14 },
  reviewAuthor: { fontWeight: 600, fontSize: 14, marginBottom: 2, color: "#111827" },
  reviewText: { fontSize: 13, color: "#4b5563" },
  stars: { color: "#f59e0b", fontSize: 13 },
  priceCard: {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 14, padding: 24, position: "sticky", top: 80,
  },
  priceCardMobile: {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 14, padding: 20, marginTop: 24,
  },
  price: { fontSize: 28, fontWeight: 800, color: "#2563eb", marginBottom: 4 },
  priceSub: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  ownerBox: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 0", borderTop: "1px solid #f3f4f6", marginTop: 14,
  },
  ownerAvatar: {
    width: 44, height: 44, borderRadius: "50%", background: "#eff6ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 18, color: "#2563eb",
  },
  ownerName: { fontWeight: 700, fontSize: 14, color: "#111827" },
  ownerMeta: { fontSize: 12, color: "#6b7280" },
  btn: {
    width: "100%", padding: "14px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
    cursor: "pointer", marginBottom: 10,
  },
  chatBtn: {
    width: "100%", padding: "11px", background: "transparent",
    border: "2px solid #2563eb", color: "#2563eb",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  chatBtnLoading: {
    width: "100%", padding: "11px", background: "transparent",
    border: "2px solid #d1d5db", color: "#9ca3af",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "default",
  },
  row: {
    display: "flex", justifyContent: "space-between",
    fontSize: 13, color: "#6b7280", marginBottom: 6,
  },
  total: {
    display: "flex", justifyContent: "space-between",
    fontWeight: 700, fontSize: 15, color: "#111827",
    borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 6,
  },
  arrowBtn: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 44, height: 44, borderRadius: "50%",
    background: "rgba(255,255,255,.92)", border: "none", cursor: "pointer",
    fontSize: 22, fontWeight: 700, display: "flex",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,.15)",
  },
  dot: {
    height: 8, borderRadius: 4, cursor: "pointer",
    transition: "all .2s", background: "rgba(255,255,255,.5)",
  },
  dotActive: { background: "#fff" },
  thumbnail: {
    width: 88, height: 60, objectFit: "cover",
    borderRadius: 8, cursor: "pointer", flexShrink: 0, transition: "all .15s",
  },
};

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showReportUser, setShowReportUser] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [editError, setEditError] = useState("");

  // Al cargar: pide la publicación al backend (única fuente de verdad). Solo si
  // el id es de un auto de ejemplo se usa mockData, para que la demo sin autos
  // publicados siga navegable.
  useEffect(() => {
    let active = true;
    setLoading(true);

    getListingById(id)
      .then(listing => {
        if (!active) return;
        if (listing) setCar(apiListingToCar(listing));
      })
      .catch(() => {
        if (!active) return;
        const mock = mockCars.find(c => c.id === id);
        if (mock) setCar({ ...normalizeListing(mock), isMock: true });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [id]);

  // Días ya ocupados, para avisar antes de que elija fechas que van a fallar.
  useEffect(() => {
    if (!id) return;
    let active = true;
    const from = new Date();
    getListingAvailability(id, from.toISOString(), addMonths(from, 3).toISOString())
      .then(data => { if (active) setUnavailableDates(data?.unavailableDates || []); })
      .catch(() => { /* auto de ejemplo o sin disponibilidad cargada */ });
    return () => { active = false; };
  }, [id]);

  // "Contactar al dueño": abre (o reutiliza) una conversación y va al chat.
  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    setContactLoading(true);
    try {
      const conv = await startConversation(id);
      navigate(`/chat?conv=${conv.id}`);
    } catch (err) {
      alert(err.message || "Error al iniciar la conversación");
      setContactLoading(false);
    }
  };

  // Abre el modo edición precargando el precio y la descripción actuales.
  const startEdit = () => {
    setEditPrice(String(car.price_per_day || ""));
    setEditDesc(car.description || "");
    setEditing(true);
  };

  // Guarda los cambios de precio/descripción en el backend. Si falla, se avisa:
  // antes el error se descartaba y parecía guardado cuando no lo estaba.
  const handleSaveEdit = async () => {
    setSavingEdit(true);
    setEditError("");
    const pricePerDay = Number(editPrice);
    if (!pricePerDay || pricePerDay <= 0) {
      setEditError("Ingresá un precio por día válido.");
      setSavingEdit(false);
      return;
    }
    try {
      await updateListing(id, { pricePerDay, description: editDesc });
      setCar(c => ({ ...c, price_per_day: pricePerDay, description: editDesc }));
      setEditing(false);
    } catch (err) {
      setEditError(err.message || "No pudimos guardar los cambios.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Elimina la publicación y vuelve a "Mis autos".
  const handleDelete = async () => {
    setDeleting(true);
    setEditError("");
    try {
      await deleteListing(id);
      navigate("/dashboard");
    } catch (err) {
      setEditError(err.message || "No pudimos eliminar la publicación.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
      Cargando...
    </div>
  );

  if (!car) return (
    <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
      Auto no encontrado.
    </div>
  );

  const reviews = mockReviews[id] || [];
  const photos = car.photos || [];
  // ¿El que mira es el dueño? El backend ya lo informa (isOwner) para no depender
  // de comparar ids que pueden venir vacíos.
  const isOwner = car.isOwnerFlag === true || (!!user?.id && user.id === car.ownerId);

  // Navegación circular de la galería (anterior / siguiente foto).
  const prevPhoto = () =>
    setCurrentPhoto(p => (p === 0 ? photos.length - 1 : p - 1));
  const nextPhoto = () =>
    setCurrentPhoto(p => (p === photos.length - 1 ? 0 : p + 1));

  // Lista de specs técnicas, descartando las que el auto no tenga cargadas.
  const techSpecs = [
    ["Color", car.color],
    ["Puertas", car.doors],
    ["Potencia", car.horsePower ? `${car.horsePower} HP` : null],
    ["Cilindrada", car.engineDisplacementCC ? `${car.engineDisplacementCC} cc` : null],
    ["Baúl", car.trunkCapacityLiters ? `${car.trunkCapacityLiters} L` : null],
    ["Consumo", car.fuelConsumptionLitersPer100Km ? `${car.fuelConsumptionLitersPer100Km} l/100km` : null],
    ["Peso", car.weightKg ? `${car.weightKg} kg` : null],
  ].filter(([, val]) => val);

  // Tarjeta lateral de precio. Muestra el desglose (base + comisión + depósito)
  // y, según sea dueño o no, los botones de editar/eliminar o reservar/contactar.
  const PriceCard = () => (
    <div style={isMobile ? s.priceCardMobile : s.priceCard}>
      <div style={s.price}>${Number(car.price_per_day).toLocaleString()}</div>
      <div style={s.priceSub}>por día</div>
      {/* Ejemplo de 3 días, aclarado como tal: el total real depende de las
          fechas que se elijan y lo calcula el servidor al reservar. */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
        Ejemplo para 3 días
      </div>
      <div style={s.row}>
        <span>Alquiler (3 días)</span>
        <span>${(car.price_per_day * 3).toLocaleString()}</span>
      </div>
      <div style={s.row}>
        <span>Comisión Freewheel</span>
        <span>${Math.round(car.price_per_day * 3 * 0.1).toLocaleString()}</span>
      </div>
      <div style={s.row}>
        <span>Depósito garantía (se devuelve)</span>
        <span>${(car.price_per_day * 2).toLocaleString()}</span>
      </div>
      <div style={s.total}>
        <span>Total estimado</span>
        <span>
          ${Math.round(car.price_per_day * 3 * 1.1 + car.price_per_day * 2).toLocaleString()}
        </span>
      </div>

      {/* Disponibilidad: los días que ya están tomados. */}
      {unavailableDates.length > 0 && (
        <div style={{ marginTop: 14, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>
            Fechas ya ocupadas
          </div>
          <div style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}>
            {unavailableDates.slice(0, 6).map(day => format(new Date(`${day}T12:00:00`), "d MMM", { locale: es })).join(" · ")}
            {unavailableDates.length > 6 ? ` y ${unavailableDates.length - 6} más` : ""}
          </div>
        </div>
      )}
      <br />

      {isOwner ? (
        editing ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Precio por día ($)</div>
            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Descripción</div>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
              style={{ width: "100%", height: 80, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", marginBottom: 10 }} />
            {editError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "#b91c1c", marginBottom: 10 }}>{editError}</div>}
            <button style={{ ...s.btn, opacity: savingEdit ? 0.6 : 1 }} onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
            <button style={s.chatBtn} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        ) : (
          <>
            <button style={s.btn} onClick={startEdit}>Editar publicación</button>
            <button
              style={{ width: "100%", padding: "11px", background: "transparent", border: "2px solid #fecaca", color: "#dc2626", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar publicación"}
            </button>
          </>
        )
      ) : (
        <>
          {car.isMock ? (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#92400e", marginBottom: 10 }}>
              Este es un auto de ejemplo para mostrar la app: no se puede reservar.
            </div>
          ) : (
            <button
              style={s.btn}
              onClick={() => user ? navigate(`/booking/${car.id}`) : navigate("/login")}
            >
              {user ? "Reservar ahora" : "Iniciá sesión para reservar"}
            </button>
          )}
          <button
            style={contactLoading ? s.chatBtnLoading : s.chatBtn}
            onClick={handleContact}
            disabled={contactLoading || car.isMock}
          >
            {contactLoading ? "Abriendo chat..." : "Contactar al dueño"}
          </button>
        </>
      )}

      <div style={s.ownerBox}>
        <div style={s.ownerAvatar}>{car.ownerInitial}</div>
        <div style={{ flex: 1 }}>
          <div style={s.ownerName}>{car.ownerName}</div>
          <div style={s.ownerMeta}>Miembro de Freewheel</div>
        </div>
        {!isOwner && (
          <button
            onClick={() => user ? setShowReportUser(true) : navigate("/login")}
            style={{
              background: "none", border: "1px solid #fecaca",
              borderRadius: 8, color: "#dc2626", fontSize: 11,
              cursor: "pointer", padding: "4px 10px",
            }}
          >
            Reportar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ ...s.page, ...(isMobile ? s.pageMobile : {}) }}>

      {/* Galería */}
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{
          width: "100%", height: isMobile ? 240 : 380,
          borderRadius: isMobile ? 10 : 14, overflow: "hidden",
          position: "relative", background: "#f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {photos.length > 0
            ? <img src={photos[currentPhoto]} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "#9ca3af", fontSize: 14 }}>Sin fotos</span>}

          {/* Corazón de favoritos, también en el detalle. */}
          {!isOwner && <FavoriteButton listingId={car.id} size={38} disabled={car.isMock} />}

          {photos.length > 1 && (
            <>
              <button
                style={{ ...s.arrowBtn, left: isMobile ? 8 : 16, width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={prevPhoto}
              >‹</button>
              <button
                style={{ ...s.arrowBtn, right: isMobile ? 8 : 16, width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={nextPhoto}
              >›</button>
              <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)}
                    style={{ ...s.dot, width: i === currentPhoto ? 22 : 8, ...(i === currentPhoto ? s.dotActive : {}) }} />
                ))}
              </div>
              <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,.55)", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
                {currentPhoto + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" onClick={() => setCurrentPhoto(i)}
                style={{
                  ...s.thumbnail,
                  border: i === currentPhoto ? "2px solid #2563eb" : "2px solid transparent",
                  opacity: i === currentPhoto ? 1 : 0.6,
                }} />
            ))}
          </div>
        )}
      </div>

      {isMobile && <PriceCard />}

      <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
        <div>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 6, color: "#111827", letterSpacing: "-.5px", marginTop: isMobile ? 20 : 0 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
            {car.location}
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Descripción</div>
            <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
              {car.description || "Sin descripción."}
            </p>
            {car.observations && (
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, fontStyle: "italic" }}>
                {car.observations}
              </p>
            )}
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>Especificaciones</div>
            <div style={s.specGrid}>
              {[
                ["Transmisión", car.transmission],
                ["Combustible", car.fuel],
                ["Asientos", car.seats],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={s.spec}>
                  <div style={s.specLabel}>{label}</div>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          {techSpecs.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Especificaciones técnicas</div>
              <div style={s.specGrid}>
                {techSpecs.map(([label, val]) => (
                  <div key={label} style={s.spec}>
                    <div style={s.specLabel}>{label}</div>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(car.bluetooth || car.rearCamera || car.parkingSensors) && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Equipamiento</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {car.bluetooth && <span style={s.badge}>Bluetooth</span>}
                {car.rearCamera && <span style={s.badge}>Cámara de reversa</span>}
                {car.parkingSensors && <span style={s.badge}>Sensores de estac.</span>}
              </div>
            </div>
          )}

          <div style={s.section}>
            <div style={s.sectionTitle}>Reseñas ({reviews.length})</div>
            {reviews.length === 0
              ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Aún sin reseñas.</p>
              : reviews.map(r => (
                <div key={r.id} style={s.review}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={s.reviewAuthor}>{r.author}</span>
                    <span style={s.stars}>{"★".repeat(r.rating)}</span>
                  </div>
                  <div style={s.reviewText}>{r.comment}</div>
                </div>
              ))}
          </div>
        </div>

        {!isMobile && <div><PriceCard /></div>}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={() => user ? setShowReport(true) : navigate("/login")}
          style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
        >
          Reportar esta publicación
        </button>
      </div>

      {showReport && (
        <ReportModal
          target={`${car.brand} ${car.model} ${car.year}`}
          targetType="car"
          onClose={() => setShowReport(false)}
        />
      )}
      {showReportUser && (
        <ReportModal
          target={car.ownerName}
          targetType="user"
          onClose={() => setShowReportUser(false)}
        />
      )}

      {confirmDelete && (
        <div
          onClick={() => !deleting && setConfirmDelete(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>🗑️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Eliminar publicación</div>
            <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
              ¿Seguro que querés eliminar <strong>{car.brand} {car.model} {car.year}</strong>? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ flex: 1, padding: "12px", background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: "12px", background: "#dc2626", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}