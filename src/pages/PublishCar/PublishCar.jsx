import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import LocationPicker from "../../components/LocationPicker";
import { createVehicle, createListing, createMediaAsset } from "../../services/api";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { groqChat, extractJSON, groqVision } from "../../services/groq";

const PRESET_COLORS = [
  { name: "Blanco", hex: "#F5F5F5" },
  { name: "Negro", hex: "#1a1a1a" },
  { name: "Gris", hex: "#808080" },
  { name: "Plata", hex: "#C0C0C0" },
  { name: "Rojo", hex: "#CC2222" },
  { name: "Azul", hex: "#1B4FA0" },
  { name: "Marino", hex: "#0a1f5c" },
  { name: "Verde", hex: "#2D7A2D" },
  { name: "Naranja", hex: "#E87722" },
  { name: "Bordo", hex: "#6B2737" },
  { name: "Beige", hex: "#D4B896" },
  { name: "Amarillo", hex: "#EAC300" },
];

const s = {
  page: { maxWidth: 720, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  card: { background: "#fff", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f3f4f6" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827" },
  select: { width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, background: "#fff", color: "#111827" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2Mobile: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  grid3Mobile: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadArea: { border: "2px dashed #d1d5db", borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", transition: ".15s", background: "#fafafa" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 },
  photoItem: { position: "relative", aspectRatio: "4/3", borderRadius: 8, overflow: "hidden", background: "#e5e7eb" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoRemove: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "22px", textAlign: "center" },
  btnRow: { display: "flex", gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: "13px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnBack: { flex: 1, padding: "13px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 },
  warning: { background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, padding: "10px 14px", color: "#92400e", fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" },
  successSub: { color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" },
  aiBox: { background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "14px 16px", marginBottom: 16 },
  aiBoxTitle: { fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 },
  aiBoxRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  aiBoxLabel: { fontSize: 13, color: "#374151" },
  aiBoxValue: { fontSize: 14, fontWeight: 700, color: "#2563eb" },
  aiBoxNote: { fontSize: 12, color: "#6b7280", marginTop: 8, lineHeight: 1.6 },
};

function validateArgentinePlate(plate) {
  if (!plate) return true;
  const clean = plate.replace(/[\s\-\.]/g, "").toUpperCase();
  const oldFormat = /^[A-Z]{3}[0-9]{3}$/.test(clean);
  const mercosur = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean);
  return oldFormat || mercosur;
}

function getSpecWarnings(form) {
  const checks = [
    ["doors", 2, 7, "Puertas"],
    ["seats", 2, 9, "Asientos"],
    ["horsePower", 40, 1500, "Potencia (HP)"],
    ["engineDisplacementCC", 400, 8000, "Cilindrada (cc)"],
    ["trunkCapacityLiters", 50, 3000, "Baúl (litros)"],
    ["fuelConsumptionLitersPer100Km", 2, 35, "Consumo (l/100km)"],
    ["weightKg", 500, 6000, "Peso (kg)"],
    ["widthMm", 1200, 3000, "Ancho (mm)"],
    ["lengthMm", 2500, 7000, "Largo (mm)"],
  ];
  return checks
    .filter(([key, min, max]) => { const v = Number(form[key]); return form[key] && v && (v < min || v > max); })
    .map(([, , , label, ,], i, arr) => `${arr[i][3]}: ${form[arr[i][0]]} parece fuera del rango normal (${arr[i][1]}–${arr[i][2]})`);
}

const normalizeLoc = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

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
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoValidations, setPhotoValidations] = useState({});
  const [uploadHover, setUploadHover] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    brand: "", model: "", year: "2022",
    transmission: "Manual", fuel: "Nafta", drivetrain: "Delantera",
    seats: "5", doors: "4", color: "", plate: "",
    bluetooth: false, rearCamera: false, parkingSensors: false,
    trunkCapacityLiters: "", fuelConsumptionLitersPer100Km: "",
    horsePower: "", engineDisplacementCC: "",
    widthMm: "", lengthMm: "", weightKg: "", observations: "",
  });

  const [listingForm, setListingForm] = useState({
    title: "", description: "", pricePerDay: "",
    locationText: "", latitude: null, longitude: null,
  });

  const setV = (k, v) => setVehicleForm((f) => ({ ...f, [k]: v }));
  const setL = (k, v) => setListingForm((f) => ({ ...f, [k]: v }));

  const prevLocationRef = useRef("");

  useEffect(() => {
    const prev = prevLocationRef.current;
    const curr = listingForm.locationText;
    if (pricingSuggestion && normalizeLoc(curr) !== normalizeLoc(prev)) {
      setPricingSuggestion(null);
      setL("pricePerDay", "");
    }
    prevLocationRef.current = curr;
  }, [listingForm.locationText]);

  const specWarnings = getSpecWarnings(vehicleForm);

  const fetchSpecs = async () => {
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) {
      setError("Completá marca, modelo y año antes de autocompletar.");
      return;
    }
    setError("");
    const cacheKey = `fw_specs_${vehicleForm.brand.trim().toLowerCase()}_${vehicleForm.model.trim().toLowerCase()}_${vehicleForm.year}`;
    let data;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { data = JSON.parse(cached); } catch { data = null; } }
    if (!data) {
      setAiLoading(true);
      try {
        const prompt = `Devolvé SOLO un objeto JSON válido, sin texto adicional, con las especificaciones técnicas del ${vehicleForm.year} ${vehicleForm.brand} ${vehicleForm.model}. Formato exacto:
{
  "puertas": número,
  "baul_litros": número,
  "peso_kg": número,
  "ancho_mm": número,
  "largo_mm": número,
  "consumo_l100km": número,
  "hp": número,
  "cilindrada_cc": número,
  "bluetooth": "Sí" o "No",
  "camara_reversa": "Sí" o "No",
  "sensor_estacionamiento": "Sí" o "No"
}
Si no sabés un dato, usá null.`;
        const response = await groqChat([{ role: "user", content: prompt }], 0);
        data = extractJSON(response);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setError("No se pudieron obtener las especificaciones. Completalas manualmente.");
        setAiLoading(false);
        return;
      }
      setAiLoading(false);
    }
    if (data.puertas) setV("doors", String(data.puertas));
    if (data.baul_litros) setV("trunkCapacityLiters", String(data.baul_litros));
    if (data.peso_kg) setV("weightKg", String(data.peso_kg));
    if (data.ancho_mm) setV("widthMm", String(data.ancho_mm));
    if (data.largo_mm) setV("lengthMm", String(data.largo_mm));
    if (data.consumo_l100km) setV("fuelConsumptionLitersPer100Km", String(data.consumo_l100km));
    if (data.hp) setV("horsePower", String(data.hp));
    if (data.cilindrada_cc) setV("engineDisplacementCC", String(data.cilindrada_cc));
    if (data.bluetooth === "Sí") setV("bluetooth", true);
    if (data.camara_reversa === "Sí") setV("rearCamera", true);
    if (data.sensor_estacionamiento === "Sí") setV("parkingSensors", true);
  };

  const fetchPricing = async () => {
    setPricingLoading(true);
    setPricingSuggestion(null);
    setError("");
    const location = listingForm.locationText || "Argentina";
    const cacheKey = `fw_price_${vehicleForm.brand.trim().toLowerCase()}_${vehicleForm.model.trim().toLowerCase()}_${vehicleForm.year}_${vehicleForm.transmission}_${vehicleForm.fuel}_${normalizeLoc(location)}`;
    let data;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { try { data = JSON.parse(cached); } catch { data = null; } }
    if (!data) {
      try {
        const prompt = `Sos un experto en el mercado de alquiler de autos entre particulares en Argentina en 2025.
Los precios de alquiler diario en Argentina rondan entre $30.000 y $150.000 ARS por día dependiendo del vehículo.
Un auto compacto cuesta alrededor de $35.000-$50.000 ARS/día. Un SUV o pickup $60.000-$100.000 ARS/día. Autos premium $100.000-$150.000 ARS/día.

Recomendá un precio por día en ARS para: ${vehicleForm.year} ${vehicleForm.brand} ${vehicleForm.model}, transmisión ${vehicleForm.transmission}, combustible ${vehicleForm.fuel}, ubicado en ${location}.

Devolvé SOLO un JSON válido sin texto adicional:
{
  "precio_min": número entero en ARS,
  "precio_max": número entero en ARS,
  "precio_recomendado": número entero en ARS,
  "justificacion": "texto breve de 1-2 oraciones"
}

Importante: los números deben ser valores reales en pesos argentinos, no en dólares ni en valores menores a 10000.`;
        const response = await groqChat([{ role: "user", content: prompt }], 0);
        data = extractJSON(response);
        if (!data.precio_recomendado || data.precio_recomendado < 5000) throw new Error("Precio inválido");
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setError("No se pudo obtener la sugerencia de precio. Ingresalo manualmente.");
        setPricingLoading(false);
        return;
      }
    }
    setPricingSuggestion(data);
    if (data.precio_recomendado) setL("pricePerDay", String(data.precio_recomendado));
    setPricingLoading(false);
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) { setError("Podés subir hasta 6 fotos."); return; }
    const startIdx = photos.length;
    files.forEach((file, fileIdx) => {
      const photoIdx = startIdx + fileIdx;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, name: file.name }]);
        setPhotoValidations(v => ({ ...v, [photoIdx]: "loading" }));
        groqVision(ev.target.result)
          .then(isVehicle => setPhotoValidations(v => ({
            ...v,
            [photoIdx]: isVehicle === true ? "ok" : isVehicle === false ? "invalid" : null,
          })))
          .catch(() => setPhotoValidations(v => ({ ...v, [photoIdx]: null })));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => {
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPhotoValidations(v => {
      const updated = {};
      Object.entries(v).forEach(([k, val]) => {
        const ki = Number(k);
        if (ki < idx) updated[ki] = val;
        else if (ki > idx) updated[ki - 1] = val;
      });
      return updated;
    });
  };

  const validateStep = () => {
    if (step === 0) {
      if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) {
        setError("Completá marca, modelo y año."); return false;
      }
      if (!vehicleForm.color) {
        setError("Seleccioná el color del vehículo."); return false;
      }
      if (!vehicleForm.seats || isNaN(Number(vehicleForm.seats)) || Number(vehicleForm.seats) < 1) {
        setError("Ingresá la cantidad de asientos."); return false;
      }
      if (vehicleForm.plate && !validateArgentinePlate(vehicleForm.plate)) {
        setError("Patente inválida. Formato: ABC123 (viejo) o AB123CD (Mercosur)."); return false;
      }
      if (specWarnings.length > 0) {
        setError("Corregí las especificaciones fuera de rango antes de continuar."); return false;
      }
    }
    if (step === 1) {
      if (photos.length < 4) { setError("Subí al menos 4 fotos del vehículo."); return false; }
      const hasLoading = photos.some((_, i) => photoValidations[i] === "loading");
      if (hasLoading) { setError("Esperá a que terminen de validarse las fotos."); return false; }
      const hasInvalid = photos.some((_, i) => photoValidations[i] === "invalid");
      if (hasInvalid) { setError("Hay fotos que no parecen mostrar un vehículo. Reemplazalas o eliminalas."); return false; }
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
        ...(vehicleForm.horsePower && { horsePower: Number(vehicleForm.horsePower) }),
        ...(vehicleForm.engineDisplacementCC && { engineDisplacementCC: Number(vehicleForm.engineDisplacementCC) }),
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

      const listing = await createListing(listingPayload);

      let photoUrls = photos.map(p => p.url);
      try {
        const uploaded = await Promise.all(photos.map(p => uploadImageToCloudinary(p.url)));
        photoUrls = uploaded;
        await Promise.all(
          photoUrls.map(url =>
            createMediaAsset({ entityType: "vehicle", entityId: vehicle.id, kind: "VEHICLE_PHOTO", url })
          )
        );
      } catch {
        // fallback: urls base64 localmente
      }

      const savedCar = {
        id: listing?.id || `local_${Date.now()}`,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: Number(vehicleForm.year),
        price_per_day: Number(listingForm.pricePerDay),
        locationText: listingForm.locationText,
        location: listingForm.locationText,
        lat: listingForm.latitude,
        lng: listingForm.longitude,
        transmission: vehicleForm.transmission,
        fuel: vehicleForm.fuel,
        seats: Number(vehicleForm.seats),
        doors: Number(vehicleForm.doors),
        color: vehicleForm.color,
        photos: photoUrls,
        available: true,
        owner_id: user?.id,
        description: listingForm.description,
        bluetooth: vehicleForm.bluetooth,
        rearCamera: vehicleForm.rearCamera,
        parkingSensors: vehicleForm.parkingSensors,
        horsePower: vehicleForm.horsePower ? Number(vehicleForm.horsePower) : null,
        engineDisplacementCC: vehicleForm.engineDisplacementCC ? Number(vehicleForm.engineDisplacementCC) : null,
        trunkCapacityLiters: vehicleForm.trunkCapacityLiters ? Number(vehicleForm.trunkCapacityLiters) : null,
        fuelConsumptionLitersPer100Km: vehicleForm.fuelConsumptionLitersPer100Km ? Number(vehicleForm.fuelConsumptionLitersPer100Km) : null,
        weightKg: vehicleForm.weightKg ? Number(vehicleForm.weightKg) : null,
      };
      const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
      localStorage.setItem("fw_my_cars", JSON.stringify([...myCars, savedCar]));

      setDone(true);
    } catch (err) {
      setError(err.message || "Error al publicar.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = isMobile ? s.cardMobile : s.card;

  const colorHex = vehicleForm.color?.startsWith("#")
    ? vehicleForm.color
    : PRESET_COLORS.find(c => c.name === vehicleForm.color)?.hex;

  if (done) return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.success}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={s.successTitle}>Auto publicado correctamente</div>
        <div style={s.successSub}>
          Tu vehículo y listing fueron creados en la plataforma.<br />
          Ya está activo y visible para otros usuarios.
        </div>
        <button style={{ ...s.btn, maxWidth: 200, margin: "0 auto" }} onClick={() => navigate("/")}>
          Ver publicaciones
        </button>
      </div>
    </div>
  );

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>Publicar mi auto</div>
      <div style={s.sub}>Completá los datos del vehículo</div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, transition: "all .3s", background: i < step ? "#1d4ed8" : i === step ? "#2563eb" : "#e5e7eb", color: i <= step ? "#fff" : "#9ca3af", boxShadow: i === step ? "0 0 0 4px #dbeafe" : "none" }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 500, whiteSpace: "nowrap", color: i === step ? "#2563eb" : i < step ? "#1d4ed8" : "#9ca3af" }}>
                {st}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 18, background: i < step ? "#2563eb" : "#e5e7eb", borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* ── PASO 0: VEHÍCULO ── */}
      {step === 0 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Datos del vehículo</div>
          <div style={isMobile ? s.grid3Mobile : s.grid3}>
            <div style={s.field}>
              <label style={s.label}>Marca *</label>
              <input style={s.input} placeholder="Toyota" value={vehicleForm.brand} onChange={(e) => setV("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Modelo *</label>
              <input style={s.input} placeholder="Corolla" value={vehicleForm.model} onChange={(e) => setV("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Año *</label>
              <input style={s.input} type="number" min="2000" max="2025" value={vehicleForm.year} onChange={(e) => setV("year", e.target.value)} />
            </div>
          </div>

          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Transmisión</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Manual", "Automático"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setV("transmission", opt)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm.transmission === opt ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: vehicleForm.transmission === opt ? "#2563eb" : "#fff", color: vehicleForm.transmission === opt ? "#fff" : "#374151" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Combustible</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Nafta", "Diesel", "Eléctrico", "GNC"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setV("fuel", opt)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm.fuel === opt ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: vehicleForm.fuel === opt ? "#2563eb" : "#fff", color: vehicleForm.fuel === opt ? "#fff" : "#374151" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Tracción</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Delantera", "Trasera", "4x4", "AWD"].map((opt) => (
                  <button key={opt} type="button" onClick={() => setV("drivetrain", opt)}
                    style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm.drivetrain === opt ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: vehicleForm.drivetrain === opt ? "#2563eb" : "#fff", color: vehicleForm.drivetrain === opt ? "#fff" : "#374151" }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Asientos *</label>
              <input
                style={{ ...s.input, appearance: "none", MozAppearance: "textfield" }}
                type="number" min="1" max="12"
                value={vehicleForm.seats}
                onChange={(e) => setV("seats", e.target.value)}
                onBlur={(e) => { const v = parseInt(e.target.value); if (isNaN(v) || v < 1) setV("seats", ""); }}
              />
            </div>
          </div>

          {/* ── COLOR PICKER ── */}
          <div style={s.field}>
            <label style={s.label}>Color *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {PRESET_COLORS.map(({ name, hex }) => {
                const sel = vehicleForm.color === name;
                return (
                  <button key={name} type="button" title={name} onClick={() => setV("color", name)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: hex,
                      border: sel ? "3px solid #2563eb" : "2px solid #d1d5db",
                      boxShadow: sel ? "0 0 0 2px #bfdbfe" : "inset 0 0 0 1px rgba(0,0,0,.08)",
                      transition: "all .15s",
                    }} />
                    <span style={{ fontSize: 10, color: sel ? "#2563eb" : "#6b7280", fontWeight: sel ? 700 : 400 }}>{name}</span>
                  </button>
                );
              })}
              <button type="button" title="Otro color"
                onClick={() => document.getElementById("fw-color-picker").click()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: vehicleForm.color?.startsWith("#")
                    ? vehicleForm.color
                    : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                  border: vehicleForm.color?.startsWith("#") ? "3px solid #2563eb" : "2px solid #d1d5db",
                  boxShadow: vehicleForm.color?.startsWith("#") ? "0 0 0 2px #bfdbfe" : "none",
                  transition: "all .15s",
                }} />
                <span style={{ fontSize: 10, color: vehicleForm.color?.startsWith("#") ? "#2563eb" : "#6b7280", fontWeight: vehicleForm.color?.startsWith("#") ? 700 : 400 }}>
                  Otro
                </span>
              </button>
              <input id="fw-color-picker" type="color" style={{ display: "none" }}
                value={vehicleForm.color?.startsWith("#") ? vehicleForm.color : "#ffffff"}
                onChange={(e) => setV("color", e.target.value)} />
            </div>
            {vehicleForm.color && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid #d1d5db", flexShrink: 0 }} />
                <span>Color: <strong style={{ color: "#111827" }}>{vehicleForm.color}</strong></span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Patente</label>
            <input
              style={s.input}
              placeholder="AB123CD"
              value={vehicleForm.plate}
              onChange={(e) => setV("plate", e.target.value.toUpperCase())}
              onBlur={(e) => {
                const clean = e.target.value.replace(/[\s\-\.]/g, "").toUpperCase();
                setV("plate", clean);
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Características</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {[["bluetooth", "Bluetooth"], ["rearCamera", "Cámara de reversa"], ["parkingSensors", "Sensores de estac."]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setV(key, !vehicleForm[key])}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm[key] ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: vehicleForm[key] ? "#eff6ff" : "#fff", color: vehicleForm[key] ? "#2563eb" : "#374151" }}>
                  {vehicleForm[key]
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#d1d5db" strokeWidth="1.5" /></svg>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Especificaciones técnicas</div>
            <button
              style={{ padding: "8px 16px", background: aiLoading ? "#e5e7eb" : "#111827", color: aiLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
              onClick={fetchSpecs} disabled={aiLoading}>
              {aiLoading ? <><span style={s.spinner} /> Completando...</> : "✦ Autocompletar con IA"}
            </button>
          </div>

          <div style={s.specGrid}>
            {[
              ["doors", "Puertas"],
              ["horsePower", "Potencia (HP)"], ["engineDisplacementCC", "Cilindrada (cc)"],
              ["trunkCapacityLiters", "Baúl (litros)"], ["fuelConsumptionLitersPer100Km", "Consumo (l/100km)"],
              ["widthMm", "Ancho (mm)"], ["lengthMm", "Largo (mm)"], ["weightKg", "Peso (kg)"],
            ].map(([key, label]) => (
              <div key={key} style={s.specItem}>
                <div style={s.specLabel}>{label}</div>
                <input style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent" }}
                  placeholder="—" value={vehicleForm[key] || ""} onChange={(e) => setV(key, e.target.value)} />
              </div>
            ))}
          </div>

          {specWarnings.length > 0 && (
            <div style={{ ...s.warning, marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ Revisá estas especificaciones:</div>
              {specWarnings.map((w, i) => <div key={i} style={{ fontSize: 12 }}>· {w}</div>)}
            </div>
          )}

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

      {/* ── PASO 1: FOTOS ── */}
      {step === 1 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Fotos del vehículo</div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Subí entre 4 y 6 fotos del auto. La IA verifica que sean fotos de un vehículo. Se requieren mínimo 4.
          </p>
          <div
            style={{ ...s.uploadArea, ...(uploadHover ? { borderColor: "#2563eb", background: "#eff6ff" } : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotos} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Hacé clic para subir fotos</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>JPG, PNG — entre 4 y 6 fotos ({photos.length}/6)</div>
          </div>
          {photos.length > 0 && (
            <div style={s.photoGrid}>
              {photos.map((p, i) => (
                <div key={i} style={s.photoItem}>
                  <img src={p.url} alt="" style={s.photoImg} />
                  {photoValidations[i] === "loading" && (
                    <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,.5)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ ...s.spinner, width: 10, height: 10 }} />
                      <span style={{ fontSize: 10, color: "#fff" }}>Validando</span>
                    </div>
                  )}
                  {photoValidations[i] === "ok" && (
                    <div style={{ position: "absolute", top: 6, left: 6, background: "#16a34a", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#fff", fontWeight: 600 }}>✓ Auto</div>
                  )}
                  {photoValidations[i] === "invalid" && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,.15)", border: "2px solid #dc2626", borderRadius: 8, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", background: "rgba(220,38,38,.9)", color: "#fff", fontSize: 10, padding: "4px 6px", textAlign: "center", fontWeight: 600 }}>No parece un auto — reemplazá</div>
                    </div>
                  )}
                  {i === 0 && photoValidations[i] !== "invalid" && (
                    <div style={{ position: "absolute", bottom: 6, left: 6, background: "#2563eb", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Principal</div>
                  )}
                  <button style={s.photoRemove} onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 4 && photos.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8, padding: "8px 12px" }}>
              Necesitás {4 - photos.length} foto{4 - photos.length !== 1 ? "s" : ""} más para continuar.
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {/* ── PASO 2: LISTING ── */}
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
          <LocationPicker
            value={listingForm.latitude ? { lat: listingForm.latitude, lng: listingForm.longitude, address: listingForm.locationText } : null}
            onChange={(loc) => {
              const approxLat = Math.round(loc.lat * 100) / 100 + (Math.random() - 0.5) * 0.008;
              const approxLng = Math.round(loc.lng * 100) / 100 + (Math.random() - 0.5) * 0.008;
              setL("locationText", loc.address);
              setL("latitude", approxLat);
              setL("longitude", approxLng);
            }}
          />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            La ubicación se muestra como zona aproximada para proteger tu privacidad
          </div>
          <div style={{ ...s.field, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>Precio por día ($ARS) *</label>
              <button
                style={{ padding: "6px 14px", background: pricingLoading ? "#e5e7eb" : "#111827", color: pricingLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: pricingLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={fetchPricing} disabled={pricingLoading}>
                {pricingLoading ? <><span style={{ ...s.spinner, width: 11, height: 11 }} /> Analizando...</> : "✦ Sugerir precio con IA"}
              </button>
            </div>
            {pricingSuggestion && (
              <div style={s.aiBox}>
                <div style={s.aiBoxTitle}>✦ Sugerencia de precio</div>
                <div style={s.aiBoxRow}>
                  <span style={s.aiBoxLabel}>Rango sugerido</span>
                  <span style={s.aiBoxValue}>${pricingSuggestion.precio_min?.toLocaleString()} – ${pricingSuggestion.precio_max?.toLocaleString()} ARS/día</span>
                </div>
                <div style={s.aiBoxRow}>
                  <span style={s.aiBoxLabel}>Precio recomendado</span>
                  <span style={{ ...s.aiBoxValue, fontSize: 16 }}>${pricingSuggestion.precio_recomendado?.toLocaleString()} ARS/día</span>
                </div>
                {pricingSuggestion.justificacion && <div style={s.aiBoxNote}>{pricingSuggestion.justificacion}</div>}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>El precio fue cargado automáticamente. Podés modificarlo abajo.</div>
              </div>
            )}
            <input style={s.input} type="number" placeholder="45000"
              value={listingForm.pricePerDay}
              onChange={(e) => setL("pricePerDay", e.target.value)} />
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {/* ── PASO 3: CONFIRMAR ── */}
      {step === 3 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Revisá tu publicación</div>
          {photos.length > 0 && (
            <img src={photos[0].url} alt="principal"
              style={{ width: "100%", height: isMobile ? 160 : 200, objectFit: "cover", borderRadius: 10, marginBottom: 20 }} />
          )}
          {[
            ["Vehículo", `${vehicleForm.brand} ${vehicleForm.model} ${vehicleForm.year}`],
            ["Color", vehicleForm.color],
            ["Transmisión", vehicleForm.transmission],
            ["Combustible", vehicleForm.fuel],
            ["Asientos", vehicleForm.seats],
            ...(vehicleForm.plate ? [["Patente", vehicleForm.plate]] : []),
            ...(vehicleForm.horsePower ? [["Potencia", `${vehicleForm.horsePower} HP`]] : []),
            ...(vehicleForm.engineDisplacementCC ? [["Cilindrada", `${vehicleForm.engineDisplacementCC} cc`]] : []),
            ["Título listing", listingForm.title || "(se usará marca + modelo)"],
            ["Ubicación", listingForm.locationText || "No especificada"],
            ["Precio/día", `$${Number(listingForm.pricePerDay || 0).toLocaleString()} ARS`],
            ["Fotos", `${photos.length} foto${photos.length !== 1 ? "s" : ""}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f3f4f6", fontSize: isMobile ? 13 : 14 }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {k === "Color" && colorHex && (
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid #d1d5db" }} />
                )}
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: "#eff6ff", borderRadius: 8, fontSize: 13, color: "#2563eb" }}>
            Se creará el vehículo y el listing activo en la plataforma.
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>Atrás</button>
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handlePublish} disabled={loading}>
              {loading ? <><span style={s.spinner} /> Publicando...</> : "Publicar ahora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}