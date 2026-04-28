import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import LocationPicker from "../../components/LocationPicker";
import { createVehicle, createListing } from "../../services/api";

const s = {
  page: { maxWidth: 720, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  card: { background: "#fff", borderRadius: 14, padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 14, padding: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16,
    paddingBottom: 10, borderBottom: "1px solid #f3f4f6" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827" },
  select: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14, background: "#fff", color: "#111827" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2Mobile: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  grid3Mobile: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadArea: { border: "2px dashed #d1d5db", borderRadius: 10,
    padding: "32px 20px", textAlign: "center", cursor: "pointer",
    transition: ".15s", background: "#fafafa" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 },
  photoItem: { position: "relative", aspectRatio: "4/3", borderRadius: 8, overflow: "hidden", background: "#e5e7eb" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoRemove: { position: "absolute", top: 6, right: 6, width: 22, height: 22,
    borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff",
    border: "none", cursor: "pointer", fontSize: 14, lineHeight: "22px", textAlign: "center" },
  btnRow: { display: "flex", gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: "13px", background: "#1a4d2e", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnBack: { flex: 1, padding: "13px", background: "transparent",
    border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8,
    padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" },
  successSub: { color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  spinner: { display: "inline-block", width: 14, height: 14,
    border: "2px solid #fff", borderTopColor: "transparent",
    borderRadius: "50%", animation: "spin .7s linear infinite" },
};

const STEPS = ["Vehículo", "Fotos", "Listing", "Confirmar"];

const TRANSMISSION_MAP = { Manual: "MANUAL", Automático: "AUTOMATIC" };
const FUEL_MAP = { Nafta: "GASOLINE", Diesel: "DIESEL", Eléctrico: "ELECTRIC", GNC: "OTHER" };
const DRIVETRAIN_MAP = { Delantera: "FRONT", Trasera: "REAR", "4x4": "FOUR_BY_FOUR", AWD: "AWD" };

export default function PublishCar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadHover, setUploadHover] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    brand: "", model: "", year: "2022",
    transmission: "Manual", fuel: "Nafta", drivetrain: "Delantera",
    seats: "5", doors: "4", color: "", plate: "",
    bluetooth: false, rearCamera: false, parkingSensors: false,
    trunkCapacityLiters: "", fuelConsumptionLitersPer100Km: "",
    widthMm: "", lengthMm: "", weightKg: "", observations: "",
  });

  const [listingForm, setListingForm] = useState({
    title: "", description: "", pricePerDay: "",
    locationText: "", latitude: null, longitude: null,
  });

  const setV = (k, v) => setVehicleForm((f) => ({ ...f, [k]: v }));
  const setL = (k, v) => setListingForm((f) => ({ ...f, [k]: v }));

  const fetchSpecs = async () => {
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) {
      setError("Completá marca, modelo y año antes de autocompletar.");
      return;
    }
    setError("");
    setAiLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: vehicleForm.brand, model: vehicleForm.model, year: vehicleForm.year }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.puertas) setV("doors", String(data.puertas));
      if (data.baul_litros) setV("trunkCapacityLiters", String(data.baul_litros));
      if (data.peso_kg) setV("weightKg", String(data.peso_kg));
      if (data.ancho_mm) setV("widthMm", String(data.ancho_mm));
      if (data.largo_mm) setV("lengthMm", String(data.largo_mm));
      if (data.bluetooth === "Sí") setV("bluetooth", true);
      if (data.camara_reversa === "Sí") setV("rearCamera", true);
      if (data.sensor_estacionamiento && data.sensor_estacionamiento !== "No") setV("parkingSensors", true);
    } catch {
      setError("No se pudieron obtener las especificaciones.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) { setError("Podés subir hasta 6 fotos."); return; }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos((prev) => [...prev, { url: ev.target.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const validateStep = () => {
    if (step === 0 && (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year)) {
      setError("Completá marca, modelo y año."); return false;
    }
    if (step === 1 && photos.length === 0) {
      setError("Subí al menos una foto."); return false;
    }
    if (step === 2) {
      if (!listingForm.title) { setError("Ingresá un título para el listing."); return false; }
      if (!listingForm.description) { setError("Ingresá una descripción."); return false; }
      if (!listingForm.pricePerDay) { setError("Ingresá el precio por día."); return false; }
      if (!listingForm.locationText) { setError("Seleccioná una ubicación."); return false; }
    }
    setError(""); return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };

  const handlePublish = async () => {
    setLoading(true);
    setError("");
    try {
      const vehiclePayload = {
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: Number(vehicleForm.year),
        ...(vehicleForm.plate && { plate: vehicleForm.plate }),
        ...(vehicleForm.color && { color: vehicleForm.color }),
        seats: Number(vehicleForm.seats) || undefined,
        doors: Number(vehicleForm.doors) || undefined,
        transmission: TRANSMISSION_MAP[vehicleForm.transmission] || "MANUAL",
        fuelType: FUEL_MAP[vehicleForm.fuel] || "GASOLINE",
        drivetrain: DRIVETRAIN_MAP[vehicleForm.drivetrain] || "FRONT",
        bluetooth: vehicleForm.bluetooth,
        rearCamera: vehicleForm.rearCamera,
        parkingSensors: vehicleForm.parkingSensors,
        ...(vehicleForm.trunkCapacityLiters && { trunkCapacityLiters: Number(vehicleForm.trunkCapacityLiters) }),
        ...(vehicleForm.fuelConsumptionLitersPer100Km && { fuelConsumptionLitersPer100Km: Number(vehicleForm.fuelConsumptionLitersPer100Km) }),
        ...(vehicleForm.widthMm && { widthMm: Number(vehicleForm.widthMm) }),
        ...(vehicleForm.lengthMm && { lengthMm: Number(vehicleForm.lengthMm) }),
        ...(vehicleForm.weightKg && { weightKg: Number(vehicleForm.weightKg) }),
        ...(vehicleForm.observations && { observations: vehicleForm.observations }),
      };

      const vehicle = await createVehicle(vehiclePayload);

      const listingPayload = {
        vehicleId: vehicle.id,
        title: listingForm.title || `${vehicleForm.brand} ${vehicleForm.model} ${vehicleForm.year}`,
        description: listingForm.description,
        pricePerDay: Number(listingForm.pricePerDay),
        locationText: listingForm.locationText,
        ...(listingForm.latitude && { latitude: listingForm.latitude }),
        ...(listingForm.longitude && { longitude: listingForm.longitude }),
        status: "ACTIVE",
      };

      await createListing(listingPayload);
      setDone(true);
    } catch (err) {
      setError(err.message || "Error al publicar. Verificá que el servidor esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = isMobile ? s.cardMobile : s.card;

  if (done) return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.success}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0f7f2",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#1a4d2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={s.successTitle}>Auto publicado correctamente</div>
        <div style={s.successSub}>
          Tu vehículo y listing fueron creados en la plataforma.<br />
          Ya está activo y visible para otros usuarios.
        </div>
        <button style={{ ...s.btn, maxWidth: 200, margin: "0 auto" }} onClick={() => navigate("/dashboard")}>
          Ver mi panel
        </button>
      </div>
    </div>
  );

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>Publicar mi auto</div>
      <div style={s.sub}>Completá los datos del vehículo</div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, transition: "all .3s",
                background: i < step ? "#16a34a" : i === step ? "#1a4d2e" : "#e5e7eb",
                color: i <= step ? "#fff" : "#9ca3af",
                boxShadow: i === step ? "0 0 0 4px #dcfce7" : "none" }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 500, whiteSpace: "nowrap",
                color: i === step ? "#1a4d2e" : i < step ? "#16a34a" : "#9ca3af" }}>
                {st}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 18,
                background: i < step ? "#1a4d2e" : "#e5e7eb", borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {error && <div style={s.error}>{error}</div>}

      {step === 0 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Datos del vehículo</div>
          <div style={isMobile ? s.grid3Mobile : s.grid3}>
            <div style={s.field}>
              <label style={s.label}>Marca *</label>
              <input style={s.input} placeholder="Toyota"
                value={vehicleForm.brand} onChange={(e) => setV("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Modelo *</label>
              <input style={s.input} placeholder="Corolla"
                value={vehicleForm.model} onChange={(e) => setV("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Año *</label>
              <input style={s.input} type="number" min="2000" max="2025"
                value={vehicleForm.year} onChange={(e) => setV("year", e.target.value)} />
            </div>
          </div>

          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Transmisión</label>
              <select style={s.select} value={vehicleForm.transmission}
                onChange={(e) => setV("transmission", e.target.value)}>
                <option>Manual</option><option>Automático</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Combustible</label>
              <select style={s.select} value={vehicleForm.fuel}
                onChange={(e) => setV("fuel", e.target.value)}>
                <option>Nafta</option><option>Diesel</option>
                <option>Eléctrico</option><option>GNC</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Tracción</label>
              <select style={s.select} value={vehicleForm.drivetrain}
                onChange={(e) => setV("drivetrain", e.target.value)}>
                <option>Delantera</option><option>Trasera</option>
                <option>4x4</option><option>AWD</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Asientos</label>
              <input style={s.input} type="number"
                value={vehicleForm.seats} onChange={(e) => setV("seats", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Color</label>
              <input style={s.input} placeholder="Blanco"
                value={vehicleForm.color} onChange={(e) => setV("color", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Patente</label>
              <input style={s.input} placeholder="AB123CD"
                value={vehicleForm.plate} onChange={(e) => setV("plate", e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["bluetooth", "Bluetooth"], ["rearCamera", "Cámara de reversa"], ["parkingSensors", "Sensores de estacionamiento"]].map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={vehicleForm[key]}
                  onChange={(e) => setV(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Especificaciones técnicas</div>
            <button
              style={{ padding: "8px 16px",
                background: aiLoading ? "#e5e7eb" : "#111827",
                color: aiLoading ? "#9ca3af" : "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: aiLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6 }}
              onClick={fetchSpecs} disabled={aiLoading}>
              {aiLoading ? <><span style={s.spinner} /> Completando...</> : "Autocompletar con IA"}
            </button>
          </div>

          <div style={s.specGrid}>
            {[
              ["doors", "Puertas"], ["trunkCapacityLiters", "Baúl (litros)"],
              ["fuelConsumptionLitersPer100Km", "Consumo (l/100km)"],
              ["widthMm", "Ancho (mm)"], ["lengthMm", "Largo (mm)"], ["weightKg", "Peso (kg)"],
            ].map(([key, label]) => (
              <div key={key} style={s.specItem}>
                <div style={s.specLabel}>{label}</div>
                <input style={{ width: "100%", border: "none", outline: "none",
                  fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent" }}
                  placeholder="—"
                  value={vehicleForm[key] || ""}
                  onChange={(e) => setV(key, e.target.value)} />
              </div>
            ))}
          </div>

          <div style={{ ...s.field, marginTop: 16 }}>
            <label style={s.label}>Observaciones</label>
            <textarea style={{ ...s.input, height: 70, resize: "none" }}
              placeholder="Service al día, cubiertas nuevas..."
              value={vehicleForm.observations}
              onChange={(e) => setV("observations", e.target.value)} />
          </div>

          <div style={s.btnRow}>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Fotos del vehículo</div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Subí hasta 6 fotos. La primera será la principal.
          </p>
          <div
            style={{ ...s.uploadArea, ...(uploadHover ? { borderColor: "#1a4d2e", background: "#f0f7f2" } : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple
              style={{ display: "none" }} onChange={handlePhotos} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Hacé clic para subir fotos
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>JPG, PNG — máximo 6 fotos</div>
          </div>
          {photos.length > 0 && (
            <div style={s.photoGrid}>
              {photos.map((p, i) => (
                <div key={i} style={s.photoItem}>
                  <img src={p.url} alt="" style={s.photoImg} />
                  {i === 0 && (
                    <div style={{ position: "absolute", bottom: 6, left: 6,
                      background: "#1a4d2e", color: "#fff", fontSize: 10,
                      padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                      Principal
                    </div>
                  )}
                  <button style={s.photoRemove} onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Datos del listing</div>
          <div style={s.field}>
            <label style={s.label}>Título del anuncio *</label>
            <input style={s.input}
              placeholder={`${vehicleForm.brand} ${vehicleForm.model} en excelente estado`}
              value={listingForm.title}
              onChange={(e) => setL("title", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Descripción *</label>
            <textarea style={{ ...s.input, height: 90, resize: "none" }}
              placeholder="Contá el estado del auto, extras, condiciones..."
              value={listingForm.description}
              onChange={(e) => setL("description", e.target.value)} />
          </div>
          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Precio por día ($ARS) *</label>
              <input style={s.input} type="number" placeholder="45000"
                value={listingForm.pricePerDay}
                onChange={(e) => setL("pricePerDay", e.target.value)} />
            </div>
          </div>
          <LocationPicker
            value={listingForm.latitude
              ? { lat: listingForm.latitude, lng: listingForm.longitude, address: listingForm.locationText }
              : null}
            onChange={(loc) => {
              setL("locationText", loc.address);
              setL("latitude", loc.lat);
              setL("longitude", loc.lng);
            }}
          />
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Revisá tu publicación</div>
          {photos.length > 0 && (
            <img src={photos[0].url} alt="principal"
              style={{ width: "100%", height: isMobile ? 160 : 200,
                objectFit: "cover", borderRadius: 10, marginBottom: 20 }} />
          )}
          {[
            ["Vehículo", `${vehicleForm.brand} ${vehicleForm.model} ${vehicleForm.year}`],
            ["Transmisión", vehicleForm.transmission],
            ["Combustible", vehicleForm.fuel],
            ["Título listing", listingForm.title || "(se usará marca + modelo)"],
            ["Ubicación", listingForm.locationText || "No especificada"],
            ["Precio/día", `$${Number(listingForm.pricePerDay || 0).toLocaleString()} ARS`],
            ["Fotos", `${photos.length} foto${photos.length !== 1 ? "s" : ""}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between",
              padding: "9px 0", borderBottom: "1px solid #f3f4f6", fontSize: isMobile ? 13 : 14 }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: "#f0f7f2",
            borderRadius: 8, fontSize: 13, color: "#1a4d2e" }}>
            Se creará el vehículo y el listing activo en la plataforma.
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button
              style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
              onClick={handlePublish}
              disabled={loading}>
              {loading ? <><span style={s.spinner} /> Publicando...</> : "Publicar ahora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}