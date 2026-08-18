// ============================================================================
//  PublishCar — Publicar un auto (asistente de 4 PASOS)
// ----------------------------------------------------------------------------
//  Es la pantalla más completa de la app. En 4 pasos (`step`):
//    0 → datos del vehículo (con AUTOCOMPLETAR SPECS con IA)
//    1 → subir fotos (la IA verifica que cada foto sea un auto)
//    2 → título, descripción, ubicación y precio (con SUGERIR PRECIO con IA)
//    3 → revisión final y publicación
//  Al publicar: crea el vehículo, sube las fotos y recién entonces crea el aviso.
//  Usa los 3 servicios de IA, que ahora pasan por el backend (ver groq.js).
//
//  Ya no se guarda una copia del auto en el navegador: esa copia era la que hacía
//  que un mismo auto apareciera duplicado o siguiera visible después de borrarlo.
//  La única fuente de verdad es el backend.
// ============================================================================
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import LocationPicker from "../../components/LocationPicker";
import { createVehicle, createListing, createMediaAsset } from "../../services/api";
<<<<<<< HEAD
import { CATEGORIES } from "../../services/listings";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { groqChat, extractJSON, groqVision } from "../../services/groq";
=======
import { CATEGORIES, categoryLabel, transmissionLabel, fuelLabel } from "../../services/listings";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { groqChat, extractJSON, groqVision } from "../../services/groq";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

// Colores predefinidos que se ofrecen como "chips" al elegir el color del auto.
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
  page: { maxWidth: 720, margin: "0 auto", padding: "48px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  card: { background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05)", marginBottom: 16, border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid #f3f4f6" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", color: "#111827", boxSizing: "border-box", background: "#fff" },
  select: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, background: "#fff", color: "#111827" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2Mobile: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  grid3Mobile: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadArea: { border: "2px dashed #d1d5db", borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer", transition: ".15s", background: "#fafafa" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 },
  photoItem: { position: "relative", aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", background: "#e5e7eb" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoRemove: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "22px", textAlign: "center" },
  btnRow: { display: "flex", gap: 10, marginTop: 20 },
  btn: { flex: 1, padding: "13px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,.3)" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnBack: { flex: 1, padding: "13px", background: "transparent", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#b91c1c", fontSize: 13, marginBottom: 16 },
  warning: { background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "12px 16px", color: "#92400e", fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" },
  successSub: { color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4, fontWeight: 600 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" },
  aiBox: { background: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "16px 18px", marginBottom: 16 },
  aiBoxTitle: { fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 10 },
  aiBoxRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  aiBoxLabel: { fontSize: 13, color: "#374151" },
  aiBoxValue: { fontSize: 14, fontWeight: 700, color: "#2563eb" },
  aiBoxNote: { fontSize: 12, color: "#6b7280", marginTop: 8, lineHeight: 1.6 },
};

// Valida el formato de una patente argentina. Acepta el formato viejo (ABC123)
// y el nuevo Mercosur (AB123CD). Si está vacía, la da por válida (es opcional).
function validateArgentinePlate(plate) {
  if (!plate) return true;
  const clean = plate.replace(/[\s\-\.]/g, "").toUpperCase();
  const oldFormat = /^[A-Z]{3}[0-9]{3}$/.test(clean);
  const mercosur = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean);
  return oldFormat || mercosur;
}

// Revisa las specs numéricas y devuelve avisos si algún valor está fuera de un
// rango razonable (ej: 20 puertas). Evita datos absurdos, sobre todo los que
// completa la IA. No bloquea: solo advierte.
function getSpecWarnings(form) {
  const checks = [
<<<<<<< HEAD
    ["doors", 2, 7, "Puertas"],
    ["seats", 2, 9, "Asientos"],
    ["horsePower", 40, 1500, "Potencia (HP)"],
    ["engineDisplacementCC", 400, 8000, "Cilindrada (cc)"],
    ["trunkCapacityLiters", 50, 3000, "Baúl (litros)"],
    ["fuelConsumptionLitersPer100Km", 2, 35, "Consumo (l/100km)"],
    ["weightKg", 500, 6000, "Peso (kg)"],
  ];
  return checks
    .filter(([key, min, max]) => { const v = Number(form[key]); return form[key] && v && (v < min || v > max); })
    .map(([key, min, max, label]) => `${label}: ${form[key]} parece fuera del rango normal (${min}–${max})`);
=======
    ["doors", 2, 7, "spec.doors"],
    ["seats", 2, 9, "spec.seats"],
    ["horsePower", 40, 1500, "spec.powerHp"],
    ["engineDisplacementCC", 400, 8000, "spec.displacementCc"],
    ["trunkCapacityLiters", 50, 3000, "spec.trunkL"],
    ["fuelConsumptionLitersPer100Km", 2, 35, "spec.consumption100"],
    ["weightKg", 500, 6000, "spec.weightKg"],
  ];
  // Devuelve la clave y los valores; el texto se arma con la traducción al dibujar.
  return checks
    .filter(([key, min, max]) => { const v = Number(form[key]); return form[key] && v && (v < min || v > max); })
    .map(([key, min, max, label]) => ({ label, value: form[key], min, max }));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
}

// Normaliza un texto de ubicación (minúsculas, sin espacios de más) para poder
// comparar dos ubicaciones aunque estén escritas distinto.
const normalizeLoc = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

// Nombres de los pasos y traducciones de las opciones a los códigos del backend.
<<<<<<< HEAD
const STEPS = ["Vehículo", "Fotos", "Listing", "Confirmar"];
const TRANSMISSION_MAP = { Manual: "MANUAL", Automático: "AUTOMATIC" };
const FUEL_MAP = { Nafta: "GASOLINE", Diesel: "DIESEL", Eléctrico: "ELECTRIC", GNC: "OTHER" };
const DRIVETRAIN_MAP = { Delantera: "FRONT", Trasera: "REAR", "4x4": "FOUR_BY_FOUR", AWD: "AWD" };
=======
// Claves: los pasos se traducen al dibujarse.
const STEPS = ["publish.step.vehicle", "publish.step.photos", "publish.step.listing", "publish.step.confirm"];
// Caja, combustible y tracción: el formulario guarda el CÓDIGO del backend y la
// lista muestra el texto traducido. Antes guardaba la palabra en castellano y la
// convertía al enviar, así que la lista quedaba en castellano en los cinco
// idiomas y traducirla habría roto la conversión.
const TRANSMISSION_OPTS = [
  { code: "MANUAL", key: "trans.MANUAL" },
  { code: "AUTOMATIC", key: "trans.AUTOMATIC" },
];
const FUEL_OPTS = [
  { code: "GASOLINE", key: "fuel.GASOLINE" },
  { code: "DIESEL", key: "fuel.DIESEL" },
  { code: "HYBRID", key: "fuel.HYBRID" },
  { code: "ELECTRIC", key: "fuel.ELECTRIC" },
  { code: "OTHER", key: "fuel.OTHER" },
];
const DRIVETRAIN_OPTS = [
  { code: "FRONT", key: "drive.FRONT" },
  { code: "REAR", key: "drive.REAR" },
  { code: "FOUR_BY_FOUR", key: "drive.4X4" },
  { code: "AWD", key: "drive.AWD" },
];
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

/**
 * Borrador de la publicación, guardado en el navegador.
 *
 * Cargar un auto lleva varios pasos y bastante escritura. Si la pantalla se
 * reinicia por cualquier motivo (una recarga, salir a mirar otra cosa y volver,
 * un toque sin querer en "atrás") se perdía todo lo escrito y había que empezar
 * de nuevo desde el paso 1.
 *
 * Las fotos NO se guardan: son imágenes en base64 y llenarían el espacio que el
 * navegador permite guardar. Se vuelven a elegir, que es lo más rápido de rehacer.
 */
const DRAFT_KEY = "fw_publish_draft";

/** Valores iniciales del formulario, también usados al descartar el borrador. */
const EMPTY_VEHICLE = {
  brand: "", model: "", year: "2022",
  // La categoría es la que usa el filtro "Explorá por categoría" del inicio y
  // el buscador. Antes no se cargaba en ninguna parte, así que los autos
  // publicados quedaban afuera de ese filtro.
  category: "",
<<<<<<< HEAD
  transmission: "Manual", fuel: "Nafta", drivetrain: "Delantera",
=======
  // Códigos del backend, no la palabra en castellano.
  transmission: "MANUAL", fuel: "GASOLINE", drivetrain: "FRONT",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  seats: "5", doors: "4", color: "", plate: "",
  bluetooth: false, rearCamera: false, parkingSensors: false,
  trunkCapacityLiters: "", fuelConsumptionLitersPer100Km: "",
  horsePower: "", engineDisplacementCC: "",
  weightKg: "", observations: "",
};

const EMPTY_LISTING = {
  title: "", description: "", pricePerDay: "",
  locationText: "", latitude: null, longitude: null,
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* sin espacio */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* nada que borrar */ }
}

export default function PublishCar() {
<<<<<<< HEAD
=======
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const { isVerified, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  // Lo que hubiera quedado a medio cargar la última vez.
  const draft = useRef(loadDraft()).current;
  const [step, setStep] = useState(() => draft?.step ?? 0);
  const [draftRestored, setDraftRestored] = useState(Boolean(draft));
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState(null);
  const [photos, setPhotos] = useState([]);
  // Se marca cuando la IA no pudo revisar alguna foto y la persona confirma a
  // mano que son del auto. Sin esto no se puede avanzar.
  const [photosConfirmed, setPhotosConfirmed] = useState(false);
  const [photoValidations, setPhotoValidations] = useState({});
  const [uploadHover, setUploadHover] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const [vehicleForm, setVehicleForm] = useState(() => draft?.vehicleForm ?? EMPTY_VEHICLE);

  const [listingForm, setListingForm] = useState(() => draft?.listingForm ?? EMPTY_LISTING);

  // Cada cambio se guarda. No hace falta debounce: es una sola clave chica.
  useEffect(() => {
    saveDraft({ step, vehicleForm, listingForm });
  }, [step, vehicleForm, listingForm]);

  // Atajos para actualizar un campo del formulario de vehículo (setV) o de listing (setL).
  const setV = (k, v) => setVehicleForm((f) => ({ ...f, [k]: v }));
  const setL = (k, v) => setListingForm((f) => ({ ...f, [k]: v }));

  const prevLocationRef = useRef(""); // guarda la ubicación anterior para detectar cambios

  // Estado real de verificación de la cuenta: es lo que el backend va a exigir al
  // publicar, así que se relee al abrir la pantalla.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUser(); }, []);

  // Si el usuario cambia la ubicación después de pedir una sugerencia de precio,
  // la sugerencia deja de ser válida: la borramos para que pida una nueva.
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

  // IA #1 — Autocompletar specs: le pide al modelo las especificaciones técnicas
  // del auto (marca/modelo/año) y rellena el formulario. Cachea el resultado en
  // localStorage para no volver a pedir lo mismo.
  const fetchSpecs = async () => {
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) {
<<<<<<< HEAD
      setError("Completá marca, modelo y año antes de autocompletar.");
=======
      setError(tr("publish.errBeforeAi"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
        setError("No se pudieron obtener las especificaciones. Completalas manualmente.");
=======
        setError(tr("publish.errSpecs"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        setAiLoading(false);
        return;
      }
      setAiLoading(false);
    }
    if (data.puertas) setV("doors", String(data.puertas));
    if (data.baul_litros) setV("trunkCapacityLiters", String(data.baul_litros));
    if (data.peso_kg) setV("weightKg", String(data.peso_kg));
    if (data.consumo_l100km) setV("fuelConsumptionLitersPer100Km", String(data.consumo_l100km));
    if (data.hp) setV("horsePower", String(data.hp));
    if (data.cilindrada_cc) setV("engineDisplacementCC", String(data.cilindrada_cc));
    if (data.bluetooth === "Sí") setV("bluetooth", true);
    if (data.camara_reversa === "Sí") setV("rearCamera", true);
    if (data.sensor_estacionamiento === "Sí") setV("parkingSensors", true);
  };

  // IA #2 — Sugerir precio: le pide al modelo un precio de alquiler por día
  // acorde al auto y a la ubicación, y lo carga en el formulario. También cachea.
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
<<<<<<< HEAD
        if (!data.precio_recomendado || data.precio_recomendado < 5000) throw new Error("Precio inválido");
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setError("No se pudo obtener la sugerencia de precio. Ingresalo manualmente.");
=======
        if (!data.precio_recomendado || data.precio_recomendado < 5000) throw new Error(tr("publish.errBadPrice"));
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setError(tr("publish.errPriceAi"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        setPricingLoading(false);
        return;
      }
    }
    setPricingSuggestion(data);
    if (data.precio_recomendado) setL("pricePerDay", String(data.precio_recomendado));
    setPricingLoading(false);
  };

  // IA #3 — Al subir fotos: las lee, las agrega a la grilla y por cada una llama
  // a groqVision para verificar que muestre un vehículo (marca "ok"/"invalid").
  /**
   * Revisa una foto y guarda el resultado con su motivo.
   *
   * El estado de cada foto es "loading" | {state:"ok"|"invalid"|"unknown", ...}.
   * Antes se guardaba solo "ok"/"invalid"/null, y null —que quiere decir "no se
   * pudo revisar"— no se mostraba en pantalla ni frenaba nada: la foto quedaba sin
   * ningún cartel y el formulario la dejaba pasar. Así se publicó una foto de un
   * perro como foto de un auto.
   */
  const revisarFoto = (dataUrl, photoIdx) => {
    setPhotoValidations(v => ({ ...v, [photoIdx]: "loading" }));
    groqVision(dataUrl)
      .then(res => setPhotoValidations(v => ({
        ...v,
        [photoIdx]: res?.isVehicle === true
          ? { state: "ok", detected: res.detected, reason: res.reason }
          : res?.isVehicle === false
            ? { state: "invalid", detected: res.detected, reason: res.reason }
            : { state: "unknown", code: res?.code, reason: res?.reason },
      })))
      .catch(err => setPhotoValidations(v => ({
        ...v,
        [photoIdx]: { state: "unknown", reason: err?.message },
      })));
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
<<<<<<< HEAD
    if (photos.length + files.length > 6) { setError("Podés subir hasta 6 fotos."); return; }
=======
    if (photos.length + files.length > 6) { setError(tr("publish.errMaxPhotos")); return; }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    const startIdx = photos.length;
    files.forEach((file, fileIdx) => {
      const photoIdx = startIdx + fileIdx;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, name: file.name }]);
        revisarFoto(ev.target.result, photoIdx);
      };
      reader.readAsDataURL(file);
    });
  };

  /** Estado de una foto, en una sola palabra. */
  const estadoFoto = (i) => {
    const v = photoValidations[i];
    if (v === "loading") return "loading";
    return v?.state ?? "unknown";
  };

  // Elimina una foto y reordena los resultados de validación para que sigan
  // apuntando a la foto correcta.
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

  // Valida el paso actual antes de dejar avanzar. Cada paso tiene sus reglas
  // (datos obligatorios, mínimo 4 fotos válidas, precio y ubicación, etc.).
  const validateStep = () => {
    if (step === 0) {
<<<<<<< HEAD
      if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) { setError("Completá marca, modelo y año."); return false; }
      if (!vehicleForm.category) { setError("Elegí la categoría del vehículo (es lo que usa el buscador para filtrarlo)."); return false; }
      if (!vehicleForm.color) { setError("Seleccioná el color del vehículo."); return false; }
      if (!vehicleForm.seats || isNaN(Number(vehicleForm.seats)) || Number(vehicleForm.seats) < 1) { setError("Ingresá la cantidad de asientos."); return false; }
      if (vehicleForm.plate && !validateArgentinePlate(vehicleForm.plate)) { setError("Patente inválida. Formato: ABC123 (viejo) o AB123CD (Mercosur)."); return false; }
      if (specWarnings.length > 0) { setError("Corregí las especificaciones fuera de rango antes de continuar."); return false; }
    }
    if (step === 1) {
      if (photos.length < 4) { setError("Subí al menos 4 fotos del vehículo."); return false; }
      if (photos.some((_, i) => estadoFoto(i) === "loading")) {
        setError("Esperá a que terminen de revisarse las fotos."); return false;
      }
      if (photos.some((_, i) => estadoFoto(i) === "invalid")) {
        setError("Hay fotos que no son de un vehículo real. Reemplazalas o eliminalas."); return false;
=======
      if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) { setError(tr("publish.errBrandModel")); return false; }
      if (!vehicleForm.category) { setError(tr("publish.errCategory")); return false; }
      if (!vehicleForm.color) { setError(tr("publish.errColor")); return false; }
      if (!vehicleForm.seats || isNaN(Number(vehicleForm.seats)) || Number(vehicleForm.seats) < 1) { setError(tr("publish.errSeats")); return false; }
      if (vehicleForm.plate && !validateArgentinePlate(vehicleForm.plate)) { setError(tr("publish.errPlate")); return false; }
      if (specWarnings.length > 0) { setError(tr("publish.errSpecRange")); return false; }
    }
    if (step === 1) {
      if (photos.length < 4) { setError(tr("publish.errMinPhotos")); return false; }
      if (photos.some((_, i) => estadoFoto(i) === "loading")) {
        setError(tr("publish.errWaitReview")); return false;
      }
      if (photos.some((_, i) => estadoFoto(i) === "invalid")) {
        setError(tr("publish.errBadPhotos")); return false;
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      }
      // Las que no se pudieron revisar tampoco pasan solas: hace falta que la
      // persona se haga cargo marcando la casilla. Antes pasaban sin que nada lo
      // dijera, que es como una foto de un perro llegó a una publicación.
      const sinRevisar = photos.filter((_, i) => estadoFoto(i) === "unknown").length;
      if (sinRevisar > 0 && !photosConfirmed) {
<<<<<<< HEAD
        setError(`Hay ${sinRevisar} foto${sinRevisar !== 1 ? "s" : ""} que no pudimos revisar. Volvé a intentar la revisión, o confirmá abajo que son del auto que estás publicando.`);
=======
        setError(tr(sinRevisar === 1 ? "publish.errUnreviewedOne" : "publish.errUnreviewedMany", { count: sinRevisar }));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        return false;
      }
    }
    if (step === 2) {
<<<<<<< HEAD
      if (!listingForm.title) { setError("Ingresá un título para el listing."); return false; }
      if (!listingForm.description) { setError("Ingresá una descripción."); return false; }
      if (!listingForm.pricePerDay) { setError("Ingresá el precio por día."); return false; }
      if (!listingForm.locationText) { setError("Seleccioná una ubicación."); return false; }
=======
      if (!listingForm.title) { setError(tr("publish.errTitle")); return false; }
      if (!listingForm.description) { setError(tr("publish.errDescription")); return false; }
      if (!listingForm.pricePerDay) { setError(tr("publish.errPrice")); return false; }
      if (!listingForm.locationText) { setError(tr("publish.errLocation")); return false; }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    }
    setError(""); return true;
  };

  // Avanza al siguiente paso solo si la validación pasa.
  const next = () => { if (validateStep()) setStep((s) => s + 1); };

  /**
   * Publicación final, en este orden:
   *   1) crea el vehículo,
   *   2) sube las fotos y las registra en el vehículo,
   *   3) recién entonces crea el aviso (listing) y queda visible.
   *
   * El orden importa: antes el aviso se creaba primero y las fotos se subían
   * después, con el error escondido. Si la subida fallaba, el auto quedaba
   * publicado y visible SIN NINGUNA FOTO (esas eran las tarjetas que aparecían
   * como "Sin foto"). Ahora, si las fotos no se pueden subir, se avisa y el aviso
   * no se publica a medias.
   */
  const handlePublish = async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Armamos los datos del vehículo (traduciendo a los códigos del backend
      //    e incluyendo solo los campos que el usuario cargó).
      const vehiclePayload = {
        brand: vehicleForm.brand, model: vehicleForm.model, year: Number(vehicleForm.year),
        ...(vehicleForm.category && { category: vehicleForm.category }),
        ...(vehicleForm.plate && { plate: vehicleForm.plate }),
        ...(vehicleForm.color && { color: vehicleForm.color }),
        seats: Number(vehicleForm.seats) || undefined,
        doors: Number(vehicleForm.doors) || undefined,
<<<<<<< HEAD
        transmission: TRANSMISSION_MAP[vehicleForm.transmission] || "MANUAL",
        fuelType: FUEL_MAP[vehicleForm.fuel] || "GASOLINE",
        drivetrain: DRIVETRAIN_MAP[vehicleForm.drivetrain] || "FRONT",
=======
        transmission: vehicleForm.transmission || "MANUAL",
        fuelType: vehicleForm.fuel || "GASOLINE",
        drivetrain: vehicleForm.drivetrain || "FRONT",
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        bluetooth: vehicleForm.bluetooth, rearCamera: vehicleForm.rearCamera, parkingSensors: vehicleForm.parkingSensors,
        ...(vehicleForm.horsePower && { horsePower: Number(vehicleForm.horsePower) }),
        ...(vehicleForm.engineDisplacementCC && { engineDisplacementCC: Number(vehicleForm.engineDisplacementCC) }),
        ...(vehicleForm.trunkCapacityLiters && { trunkCapacityLiters: Number(vehicleForm.trunkCapacityLiters) }),
        ...(vehicleForm.fuelConsumptionLitersPer100Km && { fuelConsumptionLitersPer100Km: Number(vehicleForm.fuelConsumptionLitersPer100Km) }),
        ...(vehicleForm.weightKg && { weightKg: Number(vehicleForm.weightKg) }),
        ...(vehicleForm.observations && { observations: vehicleForm.observations }),
      };
      const vehicle = await createVehicle(vehiclePayload);

      // 2) Subimos las fotos y las registramos como media del vehículo. Si esto
      //    falla, se corta acá: mejor avisar que publicar un aviso sin fotos.
      try {
        const photoUrls = await Promise.all(photos.map(p => uploadImageToCloudinary(p.url)));
        await Promise.all(photoUrls.map(url => createMediaAsset({
          entityType: "vehicle", entityId: vehicle.id, kind: "VEHICLE_PHOTO", url,
        })));
      } catch (photoError) {
        throw new Error(
<<<<<<< HEAD
          `${photoError.message || "No pudimos subir las fotos"}. Tu vehículo quedó guardado: reintentá la publicación desde "Mis autos".`,
=======
          tr("publish.errUpload", { detail: photoError.message || tr("publish.errUploadShort") }),
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        );
      }

      // 3) Con las fotos ya cargadas, se crea el aviso y queda visible.
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
      // Publicado: el borrador ya no hace falta.
      clearDraft();
      setDone(true);
    } catch (err) {
      // El backend responde con un error identificable cuando la cuenta no está
      // verificada: se explica qué hacer en vez de mostrar el error crudo.
      if (err.code === "ACCOUNT_NOT_VERIFIED" || err.status === 403) {
        setNeedsVerification(true);
<<<<<<< HEAD
        setError("Para publicar un auto necesitás verificar tu cuenta (teléfono, DNI y licencia).");
      } else {
        setError(err.message || "Error al publicar.");
=======
        setError(tr("publish.errNeedVerified"));
      } else {
        setError(err.message || tr("publish.errPublish"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      }
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
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(37,99,235,.3)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
<<<<<<< HEAD
        <div style={s.successTitle}>Auto publicado</div>
        <div style={s.successSub}>
          Tu auto ya está publicado y visible para otros usuarios.<br />
          Desde "Mis autos" podés bloquear las fechas en las que no esté disponible.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ ...s.btn, maxWidth: 220, flex: "none" }} onClick={() => navigate("/dashboard")}>Ir a mis autos</button>
          <button style={{ ...s.btnBack, maxWidth: 160, flex: "none" }} onClick={() => navigate("/")}>Ver el inicio</button>
=======
        <div style={s.successTitle}>{tr("publish.published")}</div>
        <div style={s.successSub}>
          Tu auto ya está publicado y visible para otros usuarios.<br />
          {tr("publish.blockDatesNote")}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ ...s.btn, maxWidth: 220, flex: "none" }} onClick={() => navigate("/dashboard")}>{tr("publish.goToMyCars")}</button>
          <button style={{ ...s.btnBack, maxWidth: 160, flex: "none" }} onClick={() => navigate("/")}>{tr("publish.seeHome")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      </div>
    </div>
  );

  // Botón tipo "chip" reutilizable: se pinta de azul si es la opción seleccionada.
<<<<<<< HEAD
  const chipBtn = (val, current, onClick) => (
    <button key={val} type="button" onClick={() => onClick(val)}
      style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: current === val ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: current === val ? "#2563eb" : "#fff", color: current === val ? "#fff" : "#374151" }}>
      {val}
    </button>
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

=======
  // `val` es el CÓDIGO que se guarda; `label` el texto traducido que se lee.
  const chipBtn = (val, current, onClick, label = val) => (
    <button key={val} type="button" onClick={() => onClick(val)}
      style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: current === val ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: current === val ? "#2563eb" : "#fff", color: current === val ? "#fff" : "#374151" }}>
      {label}
    </button>
  );

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>{tr("publish.title")}</div>
      <div style={s.sub}>{tr("publish.subtitle")}</div>

>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, transition: "all .3s",
                background: i < step ? "#1d4ed8" : i === step ? "#2563eb" : "#e5e7eb",
                color: i <= step ? "#fff" : "#9ca3af",
                boxShadow: i === step ? "0 0 0 4px #dbeafe" : "none",
              }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, whiteSpace: "nowrap", color: i === step ? "#2563eb" : i < step ? "#1d4ed8" : "#9ca3af" }}>
<<<<<<< HEAD
                {st}
=======
                {tr(st)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 18, background: i < step ? "#2563eb" : "#e5e7eb", borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {/* Se avisa cuando se recuperó lo que había quedado a medio cargar, con la
          opción de descartarlo y arrancar de cero. */}
      {draftRestored && !done && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1e40af", marginBottom: 16 }}>
          <span style={{ flex: 1, minWidth: 200 }}>
<<<<<<< HEAD
            Retomamos la carga donde la habías dejado. Las fotos hay que elegirlas de nuevo.
=======
            {tr("publish.draftResumed")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </span>
          <button type="button"
            onClick={() => {
              clearDraft();
              setDraftRestored(false);
              setStep(0);
              setVehicleForm(EMPTY_VEHICLE);
              setListingForm(EMPTY_LISTING);
            }}
            style={{ background: "#fff", border: "1.5px solid #bfdbfe", color: "#1e40af", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
<<<<<<< HEAD
            Empezar de cero
=======
            {tr("publish.startOver")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </button>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {/* La cuenta sin verificar es el motivo más común de que publicar falle:
          se ofrece el camino para resolverlo en vez de dejar solo el error. */}
      {(needsVerification || !isVerified) && (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#9a3412" }}>
<<<<<<< HEAD
            Para publicar un auto tu cuenta tiene que estar verificada (teléfono, DNI y licencia).
          </div>
          <button style={{ padding: "9px 16px", background: "#ea580c", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("/kyc")}>Verificar ahora</button>
=======
            {tr("publish.verifyFirst")}
          </div>
          <button style={{ padding: "9px 16px", background: "#ea580c", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("/kyc")}>{tr("profile.verifyNow")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      )}

      {/* PASO 0 */}
      {step === 0 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>{tr("publish.vehicleData")}</div>
          <div style={isMobile ? s.grid3Mobile : s.grid3}>
            <div style={s.field}>
<<<<<<< HEAD
              <label style={s.label}>Marca *</label>
              <input style={s.input} placeholder="Toyota" value={vehicleForm.brand} onChange={(e) => setV("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Modelo *</label>
              <input style={s.input} placeholder="Corolla" value={vehicleForm.model} onChange={(e) => setV("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Año *</label>
=======
              <label style={s.label}>{tr("publish.brand")} *</label>
              <input style={s.input} placeholder="Toyota" value={vehicleForm.brand} onChange={(e) => setV("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.model")} *</label>
              <input style={s.input} placeholder="Corolla" value={vehicleForm.model} onChange={(e) => setV("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.year")} *</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              <input style={s.input} type="number" min="2000" max="2025" value={vehicleForm.year} onChange={(e) => setV("year", e.target.value)} />
            </div>
          </div>

          {/* Categoría: alimenta el filtro por categoría del inicio y del buscador. */}
          <div style={s.field}>
<<<<<<< HEAD
            <label style={s.label}>Categoría *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {CATEGORIES.map(c => chipBtn(c.label, CATEGORIES.find(x => x.id === vehicleForm.category)?.label, () => setV("category", c.id)))}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
              Es lo que permite encontrar tu auto cuando alguien filtra por tipo de vehículo.
=======
            <label style={s.label}>{tr("publish.category")} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {CATEGORIES.map(c => chipBtn(c.id, vehicleForm.category, () => setV("category", c.id), tr(c.key)))}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
              {tr("publish.categoryHint")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>
          </div>

          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
<<<<<<< HEAD
              <label style={s.label}>Transmisión</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Manual", "Automático"].map(opt => chipBtn(opt, vehicleForm.transmission, v => setV("transmission", v)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Combustible</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Nafta", "Diesel", "Eléctrico", "GNC"].map(opt => chipBtn(opt, vehicleForm.fuel, v => setV("fuel", v)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Tracción</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["Delantera", "Trasera", "4x4", "AWD"].map(opt => chipBtn(opt, vehicleForm.drivetrain, v => setV("drivetrain", v)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Asientos *</label>
=======
              <label style={s.label}>{tr("publish.transmission")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {TRANSMISSION_OPTS.map(o => chipBtn(o.code, vehicleForm.transmission, v => setV("transmission", v), tr(o.key)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.fuel")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {FUEL_OPTS.map(o => chipBtn(o.code, vehicleForm.fuel, v => setV("fuel", v), tr(o.key)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.drivetrain")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {DRIVETRAIN_OPTS.map(o => chipBtn(o.code, vehicleForm.drivetrain, v => setV("drivetrain", v), tr(o.key)))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.seats")} *</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              <input style={{ ...s.input, appearance: "none", MozAppearance: "textfield" }} type="number" min="1" max="12"
                value={vehicleForm.seats} onChange={(e) => setV("seats", e.target.value)}
                onBlur={(e) => { const v = parseInt(e.target.value); if (isNaN(v) || v < 1) setV("seats", ""); }} />
            </div>
          </div>

          <div style={s.field}>
<<<<<<< HEAD
            <label style={s.label}>Color *</label>
=======
            <label style={s.label}>{tr("publish.color")} *</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {PRESET_COLORS.map(({ name, hex }) => {
                const sel = vehicleForm.color === name;
                return (
                  <button key={name} type="button" title={name} onClick={() => setV("color", name)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: hex, border: sel ? "3px solid #2563eb" : "2px solid #d1d5db", boxShadow: sel ? "0 0 0 2px #bfdbfe" : "inset 0 0 0 1px rgba(0,0,0,.08)", transition: "all .15s" }} />
                    <span style={{ fontSize: 10, color: sel ? "#2563eb" : "#6b7280", fontWeight: sel ? 700 : 400 }}>{name}</span>
                  </button>
                );
              })}
              <button type="button" title="Otro color" onClick={() => document.getElementById("fw-color-picker").click()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: vehicleForm.color?.startsWith("#") ? vehicleForm.color : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border: vehicleForm.color?.startsWith("#") ? "3px solid #2563eb" : "2px solid #d1d5db", boxShadow: vehicleForm.color?.startsWith("#") ? "0 0 0 2px #bfdbfe" : "none", transition: "all .15s" }} />
                <span style={{ fontSize: 10, color: vehicleForm.color?.startsWith("#") ? "#2563eb" : "#6b7280", fontWeight: vehicleForm.color?.startsWith("#") ? 700 : 400 }}>Otro</span>
              </button>
              <input id="fw-color-picker" type="color" style={{ display: "none" }}
                value={vehicleForm.color?.startsWith("#") ? vehicleForm.color : "#ffffff"}
                onChange={(e) => setV("color", e.target.value)} />
            </div>
            {vehicleForm.color && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid #d1d5db", flexShrink: 0 }} />
                <span>Color: <strong style={{ color: "#111827" }}>{vehicleForm.color}</strong></span>
              </div>
            )}
          </div>

          <div style={s.field}>
<<<<<<< HEAD
            <label style={s.label}>Patente</label>
=======
            <label style={s.label}>{tr("publish.plate")}</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            <input style={s.input} placeholder="AB123CD" value={vehicleForm.plate}
              onChange={(e) => setV("plate", e.target.value.toUpperCase())}
              onBlur={(e) => { const clean = e.target.value.replace(/[\s\-\.]/g, "").toUpperCase(); setV("plate", clean); }} />
            {/* La patente es el único dato que se pide y NO se publica: hace falta
                para el contrato de alquiler. Se aclara para que no parezca que se
                está pidiendo de más. */}
            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 4 }}>
              No se muestra en la publicación. Se usa solo para el contrato de alquiler.
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
<<<<<<< HEAD
            <label style={s.label}>Características</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {[["bluetooth", "Bluetooth"], ["rearCamera", "Cámara de reversa"], ["parkingSensors", "Sensores de estac."]].map(([key, label]) => (
=======
            <label style={s.label}>{tr("publish.features")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {[["bluetooth", "spec.bluetooth"], ["rearCamera", "spec.rearCamera"], ["parkingSensors", "spec.parkingSensors"]].map(([key, label]) => (
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                <button key={key} type="button" onClick={() => setV(key, !vehicleForm[key])}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm[key] ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb", background: vehicleForm[key] ? "#eff6ff" : "#fff", color: vehicleForm[key] ? "#2563eb" : "#374151" }}>
                  {vehicleForm[key]
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#d1d5db" strokeWidth="1.5" /></svg>}
<<<<<<< HEAD
                  {label}
=======
                  {tr(label)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
<<<<<<< HEAD
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Especificaciones técnicas</div>
            <button style={{ padding: "8px 16px", background: aiLoading ? "#e5e7eb" : "#111827", color: aiLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
              onClick={fetchSpecs} disabled={aiLoading}>
              {aiLoading ? <><span style={s.spinner} /> Completando...</> : "Autocompletar con IA"}
=======
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{tr("publish.specs")}</div>
            <button style={{ padding: "8px 16px", background: aiLoading ? "#e5e7eb" : "#111827", color: aiLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
              onClick={fetchSpecs} disabled={aiLoading}>
              {aiLoading ? <Spinner size={14} label={tr("publish.filling")} /> : tr("publish.autofillAi")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </button>
          </div>

          <div style={s.specGrid}>
            {[
<<<<<<< HEAD
              ["doors", "Puertas"], ["horsePower", "Potencia (HP)"], ["engineDisplacementCC", "Cilindrada (cc)"],
              ["trunkCapacityLiters", "Baúl (litros)"], ["fuelConsumptionLitersPer100Km", "Consumo (l/100km)"],
              ["weightKg", "Peso (kg)"],
            ].map(([key, label]) => (
              <div key={key} style={s.specItem}>
                <div style={s.specLabel}>{label}</div>
=======
              ["doors", "spec.doors"], ["horsePower", "spec.powerHp"], ["engineDisplacementCC", "spec.displacementCc"],
              ["trunkCapacityLiters", "spec.trunkL"], ["fuelConsumptionLitersPer100Km", "spec.consumption100"],
              ["weightKg", "spec.weightKg"],
            ].map(([key, label]) => (
              <div key={key} style={s.specItem}>
                <div style={s.specLabel}>{tr(label)}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                <input style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent" }}
                  placeholder="—" value={vehicleForm[key] || ""} onChange={(e) => setV(key, e.target.value)} />
              </div>
            ))}
          </div>

          {specWarnings.length > 0 && (
            <div style={{ ...s.warning, marginTop: 12 }}>
<<<<<<< HEAD
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Revisá estas especificaciones:</div>
              {specWarnings.map((w, i) => <div key={i} style={{ fontSize: 12 }}>· {w}</div>)}
=======
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tr("publish.checkSpecs")}</div>
              {specWarnings.map((w) => (
                <div key={w.label} style={{ fontSize: 12 }}>
                  · {tr("publish.outOfRange", { label: tr(w.label), value: w.value, min: w.min, max: w.max })}
                </div>
              ))}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>
          )}

          <div style={{ ...s.field, marginTop: 16 }}>
<<<<<<< HEAD
            <label style={s.label}>Observaciones</label>
            <textarea style={{ ...s.input, height: 72, resize: "none" }}
              placeholder="Service al día, cubiertas nuevas..."
=======
            <label style={s.label}>{tr("publish.notes")}</label>
            <textarea style={{ ...s.input, height: 72, resize: "none" }}
              placeholder={tr("publish.phObservations")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              value={vehicleForm.observations}
              onChange={(e) => setV("observations", e.target.value)} />
          </div>

          <div style={s.btnRow}>
<<<<<<< HEAD
            <button style={s.btn} onClick={next}>Siguiente →</button>
=======
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        </div>
      )}

      {/* PASO 1 */}
      {step === 1 && (
        <div style={cardStyle}>
<<<<<<< HEAD
          <div style={s.sectionTitle}>Fotos del vehículo</div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            Subí entre 4 y 6 fotos del auto. Cada foto se revisa automáticamente: tiene que ser un vehículo real, no un juguete, un dibujo ni una foto de catálogo. Se requieren mínimo 4.
=======
          <div style={s.sectionTitle}>{tr("publish.photos")}</div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 }}>
            {tr("publish.photosHint")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </p>
          <div style={{ ...s.uploadArea, ...(uploadHover ? { borderColor: "#2563eb", background: "#eff6ff" } : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotos} />
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a2 2 0 0 0 1.7-.95l.6-1A2 2 0 0 1 10.7 3h2.6a2 2 0 0 1 1.7 1.05l.6 1A2 2 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9z" stroke="#6b7280" strokeWidth="1.6"/><circle cx="12" cy="13" r="3.5" stroke="#6b7280" strokeWidth="1.6"/></svg>
<<<<<<< HEAD
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Hacé clic para subir fotos</div>
=======
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{tr("publish.clickToUpload")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            <div style={{ fontSize: 12, color: "#9ca3af" }}>JPG, PNG — entre 4 y 6 fotos ({photos.length}/6)</div>
          </div>
          {photos.length > 0 && (
            <div style={s.photoGrid}>
              {photos.map((p, i) => (
                <div key={i} style={s.photoItem}>
                  <img src={p.url} alt="" style={s.photoImg} />
                  {/* El resultado de la revisión, con su motivo. Verde = sirve,
                      rojo = no sirve, ámbar = no se pudo revisar (y NO pasa sola). */}
                  {estadoFoto(i) === "loading" && (
                    <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,.55)", borderRadius: 20, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
<<<<<<< HEAD
                      <span style={{ ...s.spinner, width: 10, height: 10 }} />
                      <span style={{ fontSize: 10, color: "#fff" }}>Revisando</span>
=======
                      <Spinner size={10} color="#fff" />
                      <span style={{ fontSize: 10, color: "#fff" }}>{tr("publish.reviewing")}</span>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                    </div>
                  )}
                  {estadoFoto(i) === "ok" && (
                    <div style={{ position: "absolute", inset: 0, border: "2px solid #16a34a", borderRadius: 10, display: "flex", alignItems: "flex-start", pointerEvents: "none" }}>
                      <div style={{ margin: 6, background: "#16a34a", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        {photoValidations[i]?.detected
<<<<<<< HEAD
                          ? `Verificada: ${photoValidations[i].detected}`
                          : "Verificada: es un auto real"}
=======
                          ? `${tr("publish.verified")}: ${photoValidations[i].detected}`
                          : tr("publish.photoOk")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                      </div>
                    </div>
                  )}
                  {estadoFoto(i) === "invalid" && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,.18)", border: "2px solid #dc2626", borderRadius: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                      <div style={{ margin: 6, background: "#dc2626", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, alignSelf: "flex-start" }}>
<<<<<<< HEAD
                        No válida
                      </div>
                      <div style={{ width: "100%", background: "rgba(185,28,28,.94)", color: "#fff", fontSize: 9.5, lineHeight: 1.35, padding: "5px 6px", textAlign: "center", fontWeight: 600 }}>
                        {photoValidations[i]?.reason || "No es la foto de un vehículo real."}
=======
                        {tr("publish.notValid")}
                      </div>
                      <div style={{ width: "100%", background: "rgba(185,28,28,.94)", color: "#fff", fontSize: 9.5, lineHeight: 1.35, padding: "5px 6px", textAlign: "center", fontWeight: 600 }}>
                        {photoValidations[i]?.reasonKey ? tr(photoValidations[i].reasonKey) : (photoValidations[i]?.reason || tr("publish.photoBad"))}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                      </div>
                    </div>
                  )}
                  {estadoFoto(i) === "unknown" && photos[i] && (
                    <div style={{ position: "absolute", inset: 0, border: "2px solid #f59e0b", borderRadius: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ margin: 6, background: "#f59e0b", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, alignSelf: "flex-start", pointerEvents: "none" }}>
<<<<<<< HEAD
                        Sin revisar
=======
                        {tr("publish.unreviewed")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); revisarFoto(photos[i].url, i); }}
                        style={{ width: "100%", background: "rgba(180,83,9,.94)", color: "#fff", fontSize: 10, padding: "5px 6px", fontWeight: 700, border: "none", cursor: "pointer" }}>
<<<<<<< HEAD
                        Reintentar la revisión
=======
                        {tr("publish.retryReview")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                      </button>
                    </div>
                  )}
                  {i === 0 && estadoFoto(i) === "ok" && (
<<<<<<< HEAD
                    <div style={{ position: "absolute", bottom: 6, left: 6, background: "#2563eb", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Principal</div>
=======
                    <div style={{ position: "absolute", bottom: 6, left: 6, background: "#2563eb", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{tr("publish.main")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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

          {/* Cuenta de cómo viene la revisión, para no tener que mirar foto por foto. */}
          {photos.length > 0 && (() => {
            const verificadas = photos.filter((_, i) => estadoFoto(i) === "ok").length;
            const noValidas = photos.filter((_, i) => estadoFoto(i) === "invalid").length;
            const sinRevisar = photos.filter((_, i) => estadoFoto(i) === "unknown").length;
            return (
              <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#374151" }}>
                <span style={{ color: "#166534", fontWeight: 600 }}>{verificadas} verificada{verificadas !== 1 ? "s" : ""}</span>
                {noValidas > 0 && <span style={{ color: "#b91c1c", fontWeight: 600 }}>{noValidas} no válida{noValidas !== 1 ? "s" : ""}</span>}
                {sinRevisar > 0 && <span style={{ color: "#92400e", fontWeight: 600 }}>{sinRevisar} sin revisar</span>}
              </div>
            );
          })()}

          {/* Si algo no se pudo revisar, no se avanza sin que la persona lo confirme.
              Es la alternativa a dejarlo pasar en silencio (lo de antes) y a trabar
              la publicación del todo cuando el servicio de IA está caído. */}
          {photos.some((_, i) => estadoFoto(i) === "unknown") && (
            <label style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
              <input type="checkbox" checked={photosConfirmed}
                onChange={(e) => setPhotosConfirmed(e.target.checked)}
                style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
                No pudimos revisar todas las fotos automáticamente. Confirmo que son
                del auto que estoy publicando. Si no lo son, la publicación se puede
                pausar y la cuenta suspender.
              </span>
            </label>
          )}
          <div style={s.btnRow}>
<<<<<<< HEAD
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>← Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente →</button>
=======
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div style={cardStyle}>
<<<<<<< HEAD
          <div style={s.sectionTitle}>Datos del listing</div>
          <div style={s.field}>
            <label style={s.label}>Título del anuncio *</label>
=======
          <div style={s.sectionTitle}>{tr("publish.listingData")}</div>
          <div style={s.field}>
            <label style={s.label}>{tr("publish.adTitle")} *</label>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            <input style={s.input}
              placeholder={`${vehicleForm.brand} ${vehicleForm.model} en excelente estado`}
              value={listingForm.title}
              onChange={(e) => setL("title", e.target.value)} />
          </div>
          <div style={s.field}>
<<<<<<< HEAD
            <label style={s.label}>Descripción *</label>
            <textarea style={{ ...s.input, height: 90, resize: "none" }}
              placeholder="Contá el estado del auto, extras, condiciones..."
=======
            <label style={s.label}>{tr("car.description")} *</label>
            <textarea style={{ ...s.input, height: 90, resize: "none" }}
              placeholder={tr("publish.phDescription")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
            La ubicación se muestra como zona aproximada para proteger tu privacidad
          </div>
          <div style={{ ...s.field, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>Precio por día ($ARS) *</label>
              <button style={{ padding: "6px 14px", background: pricingLoading ? "#e5e7eb" : "#111827", color: pricingLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: pricingLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={fetchPricing} disabled={pricingLoading}>
                {pricingLoading ? <><span style={{ ...s.spinner, width: 11, height: 11 }} /> Analizando...</> : "Sugerir con IA"}
=======
            {tr("publish.locPrivacy")}
          </div>
          <div style={{ ...s.field, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>{tr("publish.priceArs")} *</label>
              <button style={{ padding: "6px 14px", background: pricingLoading ? "#e5e7eb" : "#111827", color: pricingLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: pricingLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={fetchPricing} disabled={pricingLoading}>
                {pricingLoading ? <Spinner size={11} label={tr("publish.analyzing")} /> : tr("publish.suggestAi")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </button>
            </div>
            {pricingSuggestion && (
              <div style={s.aiBox}>
<<<<<<< HEAD
                <div style={s.aiBoxTitle}>Sugerencia de precio</div>
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
=======
                <div style={s.aiBoxTitle}>{tr("publish.priceSuggestion")}</div>
                <div style={s.aiBoxRow}>
                  <span style={s.aiBoxLabel}>{tr("publish.priceRange")}</span>
                  <span style={s.aiBoxValue}>${pricingSuggestion.precio_min?.toLocaleString()} – ${pricingSuggestion.precio_max?.toLocaleString()} ARS{tr("common.perDay")}</span>
                </div>
                <div style={s.aiBoxRow}>
                  <span style={s.aiBoxLabel}>{tr("publish.priceAdvised")}</span>
                  <span style={{ ...s.aiBoxValue, fontSize: 16 }}>${pricingSuggestion.precio_recomendado?.toLocaleString()} ARS{tr("common.perDay")}</span>
                </div>
                {pricingSuggestion.justificacion && <div style={s.aiBoxNote}>{pricingSuggestion.justificacion}</div>}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>{tr("publish.priceAutoNote")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </div>
            )}
            <input style={s.input} type="number" placeholder="45000"
              value={listingForm.pricePerDay}
              onChange={(e) => setL("pricePerDay", e.target.value)} />
          </div>
          <div style={s.btnRow}>
<<<<<<< HEAD
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>← Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente →</button>
=======
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
        </div>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>{tr("publish.review")}</div>
          {photos.length > 0 && (
            <img src={photos[0].url} alt="principal"
              style={{ width: "100%", height: isMobile ? 160 : 210, objectFit: "cover", borderRadius: 12, marginBottom: 20 }} />
          )}
          {[
<<<<<<< HEAD
            ["Vehículo", `${vehicleForm.brand} ${vehicleForm.model} ${vehicleForm.year}`],
            ["Categoría", CATEGORIES.find(c => c.id === vehicleForm.category)?.label || "—"],
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
=======
            [tr("payment.vehicle"), `${vehicleForm.brand} ${vehicleForm.model} ${vehicleForm.year}`],
            [tr("publish.category"), categoryLabel(tr, vehicleForm.category) || "—"],
            [tr("spec.color"), vehicleForm.color],
            [tr("spec.transmission"), transmissionLabel(tr, vehicleForm.transmission)],
            [tr("spec.fuel"), fuelLabel(tr, vehicleForm.fuel)],
            [tr("spec.seats"), vehicleForm.seats],
            ...(vehicleForm.plate ? [[tr("publish.plate"), vehicleForm.plate]] : []),
            ...(vehicleForm.horsePower ? [[tr("spec.power"), `${vehicleForm.horsePower} HP`]] : []),
            ...(vehicleForm.engineDisplacementCC ? [[tr("spec.displacement"), `${vehicleForm.engineDisplacementCC} cc`]] : []),
            [tr("publish.listingTitle"), listingForm.title || tr("publish.titleAuto")],
            [tr("loc.short"), listingForm.locationText || tr("publish.noLocation")],
            [tr("publish.pricePerDay"), `$${Number(listingForm.pricePerDay || 0).toLocaleString()} ARS`],
            [tr("publish.photos"), tr(photos.length === 1 ? "publish.photoCountOne" : "publish.photoCountMany", { count: photos.length })],
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: isMobile ? 13 : 14 }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
<<<<<<< HEAD
                {k === "Color" && colorHex && (
=======
                {k === tr("spec.color") && colorHex && (
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid #d1d5db" }} />
                )}
                <span style={{ fontWeight: 600, color: "#111827" }}>{v}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#eff6ff", borderRadius: 10, fontSize: 13, color: "#2563eb", fontWeight: 500 }}>
<<<<<<< HEAD
            Se creará el vehículo y el listing activo en la plataforma.
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>← Atrás</button>
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handlePublish} disabled={loading}>
              {loading ? <><span style={s.spinner} /> Publicando...</> : "Publicar ahora"}
=======
            {tr("publish.willCreate")}
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handlePublish} disabled={loading}>
              {loading ? <Spinner size={14} color="#fff" label={tr("publish.publishing")} /> : tr("publish.publishNow")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </button>
          </div>
        </div>  
      )}
    </div>
  );
}