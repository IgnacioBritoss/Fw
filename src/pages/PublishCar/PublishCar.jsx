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
import { CATEGORIES, categoryLabel, transmissionLabel, fuelLabel } from "../../services/listings";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { groqChat, extractJSON, groqVision } from "../../services/groq";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";

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
  title: { fontSize: 24, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "var(--fw-text-3)", fontSize: 14, marginBottom: 32 },
  card: { background: "var(--fw-surface)", borderRadius: 16, padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,.06)", marginBottom: 16, border: "1px solid var(--fw-line-soft)" },
  cardMobile: { background: "var(--fw-surface)", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,.05)", marginBottom: 16, border: "1px solid var(--fw-line-soft)" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--fw-text-4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--fw-line-soft)" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid var(--fw-border)", fontSize: 14, outline: "none", color: "var(--fw-text)", boxSizing: "border-box", background: "var(--fw-surface)" },
  select: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid var(--fw-border)", fontSize: 14, background: "var(--fw-surface)", color: "var(--fw-text)" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2Mobile: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  grid3Mobile: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadArea: { border: "2px dashed var(--fw-border-2)", borderRadius: 12, padding: "36px 20px", textAlign: "center", cursor: "pointer", transition: ".15s", background: "var(--fw-surface-2)" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 },
  photoItem: { position: "relative", aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", background: "var(--fw-surface-3)" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoRemove: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, lineHeight: "22px", textAlign: "center" },
  btnRow: { display: "flex", gap: 10, marginTop: 20 },
  btn: { flex: 1, padding: "13px", background: "linear-gradient(135deg,var(--fw-blue),var(--fw-blue-strong))", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,.3)" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  btnBack: { flex: 1, padding: "13px", background: "transparent", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  error: { background: "var(--fw-red-bg)", border: "1.5px solid var(--fw-red-line)", borderRadius: 10, padding: "12px 16px", color: "var(--fw-red-text-2)", fontSize: 13, marginBottom: 16 },
  warning: { background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 10, padding: "12px 16px", color: "var(--fw-amber-text)", fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--fw-text)" },
  successSub: { color: "var(--fw-text-3)", marginBottom: 24, lineHeight: 1.6 },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "var(--fw-surface-2)", border: "1.5px solid var(--fw-border)", borderRadius: 10, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "var(--fw-text-3)", marginBottom: 4, fontWeight: 600 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" },
  aiBox: { background: "linear-gradient(135deg,var(--fw-blue-bg),var(--fw-blue-bg-2))", border: "1.5px solid var(--fw-blue-line)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 },
  aiBoxTitle: { fontSize: 13, fontWeight: 700, color: "var(--fw-blue-text)", marginBottom: 10 },
  aiBoxRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  aiBoxLabel: { fontSize: 13, color: "var(--fw-text-2)" },
  aiBoxValue: { fontSize: 14, fontWeight: 700, color: "var(--fw-blue)" },
  aiBoxNote: { fontSize: 12, color: "var(--fw-text-3)", marginTop: 8, lineHeight: 1.6 },
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
}

// Normaliza un texto de ubicación (minúsculas, sin espacios de más) para poder
// comparar dos ubicaciones aunque estén escritas distinto.
const normalizeLoc = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

// Nombres de los pasos y traducciones de las opciones a los códigos del backend.
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
  // Códigos del backend, no la palabra en castellano.
  transmission: "MANUAL", fuel: "GASOLINE", drivetrain: "FRONT",
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
  const { t: tr } = useI18n();
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
      setError(tr("publish.errBeforeAi"));
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
        setError(tr("publish.errSpecs"));
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
        if (!data.precio_recomendado || data.precio_recomendado < 5000) throw new Error(tr("publish.errBadPrice"));
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        setError(tr("publish.errPriceAi"));
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
    if (photos.length + files.length > 6) { setError(tr("publish.errMaxPhotos")); return; }
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
      }
      // Las que no se pudieron revisar tampoco pasan solas: hace falta que la
      // persona se haga cargo marcando la casilla. Antes pasaban sin que nada lo
      // dijera, que es como una foto de un perro llegó a una publicación.
      const sinRevisar = photos.filter((_, i) => estadoFoto(i) === "unknown").length;
      if (sinRevisar > 0 && !photosConfirmed) {
        setError(tr(sinRevisar === 1 ? "publish.errUnreviewedOne" : "publish.errUnreviewedMany", { count: sinRevisar }));
        return false;
      }
    }
    if (step === 2) {
      if (!listingForm.title) { setError(tr("publish.errTitle")); return false; }
      if (!listingForm.description) { setError(tr("publish.errDescription")); return false; }
      if (!listingForm.pricePerDay) { setError(tr("publish.errPrice")); return false; }
      if (!listingForm.locationText) { setError(tr("publish.errLocation")); return false; }
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
        transmission: vehicleForm.transmission || "MANUAL",
        fuelType: vehicleForm.fuel || "GASOLINE",
        drivetrain: vehicleForm.drivetrain || "FRONT",
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
          tr("publish.errUpload", { detail: photoError.message || tr("publish.errUploadShort") }),
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
        setError(tr("publish.errNeedVerified"));
      } else {
        setError(err.message || tr("publish.errPublish"));
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
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,var(--fw-blue),var(--fw-blue-strong))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(37,99,235,.3)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={s.successTitle}>{tr("publish.published")}</div>
        <div style={s.successSub}>
          Tu auto ya está publicado y visible para otros usuarios.<br />
          {tr("publish.blockDatesNote")}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ ...s.btn, maxWidth: 220, flex: "none" }} onClick={() => navigate("/dashboard")}>{tr("publish.goToMyCars")}</button>
          <button style={{ ...s.btnBack, maxWidth: 160, flex: "none" }} onClick={() => navigate("/")}>{tr("publish.seeHome")}</button>
        </div>
      </div>
    </div>
  );

  // Botón tipo "chip" reutilizable: se pinta de azul si es la opción seleccionada.
  // `val` es el CÓDIGO que se guarda; `label` el texto traducido que se lee.
  const chipBtn = (val, current, onClick, label = val) => (
    <button key={val} type="button" onClick={() => onClick(val)}
      style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: current === val ? "1.5px solid var(--fw-blue)" : "1.5px solid var(--fw-border)", background: current === val ? "var(--fw-blue)" : "var(--fw-surface)", color: current === val ? "#fff" : "var(--fw-text-2)" }}>
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

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, transition: "all .3s",
                background: i < step ? "var(--fw-blue-strong)" : i === step ? "var(--fw-blue)" : "var(--fw-surface-3)",
                color: i <= step ? "#fff" : "var(--fw-text-4)",
                boxShadow: i === step ? "0 0 0 4px #dbeafe" : "none",
              }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, whiteSpace: "nowrap", color: i === step ? "var(--fw-blue)" : i < step ? "var(--fw-blue-strong)" : "var(--fw-text-4)" }}>
                {tr(st)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 18, background: i < step ? "var(--fw-blue)" : "var(--fw-surface-3)", borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {/* Se avisa cuando se recuperó lo que había quedado a medio cargar, con la
          opción de descartarlo y arrancar de cero. */}
      {draftRestored && !done && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--fw-blue-bg)", border: "1.5px solid var(--fw-blue-line)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 }}>
          <span style={{ flex: 1, minWidth: 200 }}>
            {tr("publish.draftResumed")}
          </span>
          <button type="button"
            onClick={() => {
              clearDraft();
              setDraftRestored(false);
              setStep(0);
              setVehicleForm(EMPTY_VEHICLE);
              setListingForm(EMPTY_LISTING);
            }}
            style={{ background: "var(--fw-surface)", border: "1.5px solid var(--fw-blue-line)", color: "var(--fw-blue-text)", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            {tr("publish.startOver")}
          </button>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {/* La cuenta sin verificar es el motivo más común de que publicar falle:
          se ofrece el camino para resolverlo en vez de dejar solo el error. */}
      {(needsVerification || !isVerified) && (
        <div style={{ background: "var(--fw-orange-bg)", border: "1.5px solid var(--fw-orange-line)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--fw-orange-text)" }}>
            {tr("publish.verifyFirst")}
          </div>
          <button style={{ padding: "9px 16px", background: "var(--fw-orange)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("/kyc")}>{tr("profile.verifyNow")}</button>
        </div>
      )}

      {/* PASO 0 */}
      {step === 0 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>{tr("publish.vehicleData")}</div>
          <div style={isMobile ? s.grid3Mobile : s.grid3}>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.brand")} *</label>
              <input style={s.input} placeholder="Toyota" value={vehicleForm.brand} onChange={(e) => setV("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.model")} *</label>
              <input style={s.input} placeholder="Corolla" value={vehicleForm.model} onChange={(e) => setV("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{tr("publish.year")} *</label>
              <input style={s.input} type="number" min="2000" max="2025" value={vehicleForm.year} onChange={(e) => setV("year", e.target.value)} />
            </div>
          </div>

          {/* Categoría: alimenta el filtro por categoría del inicio y del buscador. */}
          <div style={s.field}>
            <label style={s.label}>{tr("publish.category")} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {CATEGORIES.map(c => chipBtn(c.id, vehicleForm.category, () => setV("category", c.id), tr(c.key)))}
            </div>
            <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 6 }}>
              {tr("publish.categoryHint")}
            </div>
          </div>

          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
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
              <input style={{ ...s.input, appearance: "none", MozAppearance: "textfield" }} type="number" min="1" max="12"
                value={vehicleForm.seats} onChange={(e) => setV("seats", e.target.value)}
                onBlur={(e) => { const v = parseInt(e.target.value); if (isNaN(v) || v < 1) setV("seats", ""); }} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>{tr("publish.color")} *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {PRESET_COLORS.map(({ name, hex }) => {
                const sel = vehicleForm.color === name;
                return (
                  <button key={name} type="button" title={name} onClick={() => setV("color", name)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: hex, border: sel ? "3px solid var(--fw-blue)" : "2px solid var(--fw-border-2)", boxShadow: sel ? "0 0 0 2px #bfdbfe" : "inset 0 0 0 1px rgba(0,0,0,.08)", transition: "all .15s" }} />
                    <span style={{ fontSize: 10, color: sel ? "var(--fw-blue)" : "var(--fw-text-3)", fontWeight: sel ? 700 : 400 }}>{name}</span>
                  </button>
                );
              })}
              <button type="button" title="Otro color" onClick={() => document.getElementById("fw-color-picker").click()}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: vehicleForm.color?.startsWith("#") ? vehicleForm.color : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border: vehicleForm.color?.startsWith("#") ? "3px solid var(--fw-blue)" : "2px solid var(--fw-border-2)", boxShadow: vehicleForm.color?.startsWith("#") ? "0 0 0 2px #bfdbfe" : "none", transition: "all .15s" }} />
                <span style={{ fontSize: 10, color: vehicleForm.color?.startsWith("#") ? "var(--fw-blue)" : "var(--fw-text-3)", fontWeight: vehicleForm.color?.startsWith("#") ? 700 : 400 }}>Otro</span>
              </button>
              <input id="fw-color-picker" type="color" style={{ display: "none" }}
                value={vehicleForm.color?.startsWith("#") ? vehicleForm.color : "#ffffff"}
                onChange={(e) => setV("color", e.target.value)} />
            </div>
            {vehicleForm.color && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--fw-text-3)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid var(--fw-border-2)", flexShrink: 0 }} />
                <span>Color: <strong style={{ color: "var(--fw-text)" }}>{vehicleForm.color}</strong></span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>{tr("publish.plate")}</label>
            <input style={s.input} placeholder="AB123CD" value={vehicleForm.plate}
              onChange={(e) => setV("plate", e.target.value.toUpperCase())}
              onBlur={(e) => { const clean = e.target.value.replace(/[\s\-\.]/g, "").toUpperCase(); setV("plate", clean); }} />
            {/* La patente es el único dato que se pide y NO se publica: hace falta
                para el contrato de alquiler. Se aclara para que no parezca que se
                está pidiendo de más. */}
            <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", marginTop: 4 }}>
              No se muestra en la publicación. Se usa solo para el contrato de alquiler.
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>{tr("publish.features")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {[["bluetooth", "spec.bluetooth"], ["rearCamera", "spec.rearCamera"], ["parkingSensors", "spec.parkingSensors"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setV(key, !vehicleForm[key])}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all .15s", border: vehicleForm[key] ? "1.5px solid var(--fw-blue)" : "1.5px solid var(--fw-border)", background: vehicleForm[key] ? "var(--fw-blue-bg)" : "var(--fw-surface)", color: vehicleForm[key] ? "var(--fw-blue)" : "var(--fw-text-2)" }}>
                  {vehicleForm[key]
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#0f6ce6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#d1d5db" strokeWidth="1.5" /></svg>}
                  {tr(label)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text-2)" }}>{tr("publish.specs")}</div>
            <button style={{ padding: "8px 16px", background: aiLoading ? "var(--fw-surface-3)" : "var(--fw-chip)", color: aiLoading ? "var(--fw-text-4)" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
              onClick={fetchSpecs} disabled={aiLoading}>
              {aiLoading ? <Spinner size={14} label={tr("publish.filling")} /> : tr("publish.autofillAi")}
            </button>
          </div>

          <div style={s.specGrid}>
            {[
              ["doors", "spec.doors"], ["horsePower", "spec.powerHp"], ["engineDisplacementCC", "spec.displacementCc"],
              ["trunkCapacityLiters", "spec.trunkL"], ["fuelConsumptionLitersPer100Km", "spec.consumption100"],
              ["weightKg", "spec.weightKg"],
            ].map(([key, label]) => (
              <div key={key} style={s.specItem}>
                <div style={s.specLabel}>{tr(label)}</div>
                <input style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "var(--fw-text)", background: "transparent" }}
                  placeholder="—" value={vehicleForm[key] || ""} onChange={(e) => setV(key, e.target.value)} />
              </div>
            ))}
          </div>

          {specWarnings.length > 0 && (
            <div style={{ ...s.warning, marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tr("publish.checkSpecs")}</div>
              {specWarnings.map((w) => (
                <div key={w.label} style={{ fontSize: 12 }}>
                  · {tr("publish.outOfRange", { label: tr(w.label), value: w.value, min: w.min, max: w.max })}
                </div>
              ))}
            </div>
          )}

          <div style={{ ...s.field, marginTop: 16 }}>
            <label style={s.label}>{tr("publish.notes")}</label>
            <textarea style={{ ...s.input, height: 72, resize: "none" }}
              placeholder={tr("publish.phObservations")}
              value={vehicleForm.observations}
              onChange={(e) => setV("observations", e.target.value)} />
          </div>

          <div style={s.btnRow}>
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
          </div>
        </div>
      )}

      {/* PASO 1 */}
      {step === 1 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>{tr("publish.photos")}</div>
          <p style={{ fontSize: 13, color: "var(--fw-text-3)", marginBottom: 16, lineHeight: 1.6 }}>
            {tr("publish.photosHint")}
          </p>
          <div style={{ ...s.uploadArea, ...(uploadHover ? { borderColor: "var(--fw-blue)", background: "var(--fw-blue-bg)" } : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotos} />
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a2 2 0 0 0 1.7-.95l.6-1A2 2 0 0 1 10.7 3h2.6a2 2 0 0 1 1.7 1.05l.6 1A2 2 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9z" stroke="#6b7280" strokeWidth="1.6"/><circle cx="12" cy="13" r="3.5" stroke="#6b7280" strokeWidth="1.6"/></svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 4 }}>{tr("publish.clickToUpload")}</div>
            <div style={{ fontSize: 12, color: "var(--fw-text-4)" }}>JPG, PNG — entre 4 y 6 fotos ({photos.length}/6)</div>
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
                      <Spinner size={10} color="#fff" />
                      <span style={{ fontSize: 10, color: "#fff" }}>{tr("publish.reviewing")}</span>
                    </div>
                  )}
                  {estadoFoto(i) === "ok" && (
                    <div style={{ position: "absolute", inset: 0, border: "2px solid #16a34a", borderRadius: 10, display: "flex", alignItems: "flex-start", pointerEvents: "none" }}>
                      <div style={{ margin: 6, background: "var(--fw-green)", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        {photoValidations[i]?.detected
                          ? `${tr("publish.verified")}: ${photoValidations[i].detected}`
                          : tr("publish.photoOk")}
                      </div>
                    </div>
                  )}
                  {estadoFoto(i) === "invalid" && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(220,38,38,.18)", border: "2px solid var(--fw-red)", borderRadius: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                      <div style={{ margin: 6, background: "var(--fw-red)", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, alignSelf: "flex-start" }}>
                        {tr("publish.notValid")}
                      </div>
                      <div style={{ width: "100%", background: "rgba(185,28,28,.94)", color: "#fff", fontSize: 9.5, lineHeight: 1.35, padding: "5px 6px", textAlign: "center", fontWeight: 600 }}>
                        {photoValidations[i]?.reasonKey ? tr(photoValidations[i].reasonKey) : (photoValidations[i]?.reason || tr("publish.photoBad"))}
                      </div>
                    </div>
                  )}
                  {estadoFoto(i) === "unknown" && photos[i] && (
                    <div style={{ position: "absolute", inset: 0, border: "2px solid #f59e0b", borderRadius: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ margin: 6, background: "var(--fw-amber)", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#fff", fontWeight: 700, alignSelf: "flex-start", pointerEvents: "none" }}>
                        {tr("publish.unreviewed")}
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); revisarFoto(photos[i].url, i); }}
                        style={{ width: "100%", background: "rgba(180,83,9,.94)", color: "#fff", fontSize: 10, padding: "5px 6px", fontWeight: 700, border: "none", cursor: "pointer" }}>
                        {tr("publish.retryReview")}
                      </button>
                    </div>
                  )}
                  {i === 0 && estadoFoto(i) === "ok" && (
                    <div style={{ position: "absolute", bottom: 6, left: 6, background: "var(--fw-blue)", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{tr("publish.main")}</div>
                  )}
                  <button style={s.photoRemove} onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 4 && photos.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--fw-amber-text)", background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 8, padding: "8px 12px" }}>
              Necesitás {4 - photos.length} foto{4 - photos.length !== 1 ? "s" : ""} más para continuar.
            </div>
          )}

          {/* Cuenta de cómo viene la revisión, para no tener que mirar foto por foto. */}
          {photos.length > 0 && (() => {
            const verificadas = photos.filter((_, i) => estadoFoto(i) === "ok").length;
            const noValidas = photos.filter((_, i) => estadoFoto(i) === "invalid").length;
            const sinRevisar = photos.filter((_, i) => estadoFoto(i) === "unknown").length;
            return (
              <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--fw-text-2)" }}>
                <span style={{ color: "var(--fw-green-text-2)", fontWeight: 600 }}>{verificadas} verificada{verificadas !== 1 ? "s" : ""}</span>
                {noValidas > 0 && <span style={{ color: "var(--fw-red-text-2)", fontWeight: 600 }}>{noValidas} no válida{noValidas !== 1 ? "s" : ""}</span>}
                {sinRevisar > 0 && <span style={{ color: "var(--fw-amber-text)", fontWeight: 600 }}>{sinRevisar} sin revisar</span>}
              </div>
            );
          })()}

          {/* Si algo no se pudo revisar, no se avanza sin que la persona lo confirme.
              Es la alternativa a dejarlo pasar en silencio (lo de antes) y a trabar
              la publicación del todo cuando el servicio de IA está caído. */}
          {photos.some((_, i) => estadoFoto(i) === "unknown") && (
            <label style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start", background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
              <input type="checkbox" checked={photosConfirmed}
                onChange={(e) => setPhotosConfirmed(e.target.checked)}
                style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
                No pudimos revisar todas las fotos automáticamente. Confirmo que son
                del auto que estoy publicando. Si no lo son, la publicación se puede
                pausar y la cuenta suspender.
              </span>
            </label>
          )}
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>{tr("publish.listingData")}</div>
          <div style={s.field}>
            <label style={s.label}>{tr("publish.adTitle")} *</label>
            <input style={s.input}
              placeholder={`${vehicleForm.brand} ${vehicleForm.model} en excelente estado`}
              value={listingForm.title}
              onChange={(e) => setL("title", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>{tr("car.description")} *</label>
            <textarea style={{ ...s.input, height: 90, resize: "none" }}
              placeholder={tr("publish.phDescription")}
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
          <div style={{ fontSize: 12, color: "var(--fw-text-3)", marginTop: 6, marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {tr("publish.locPrivacy")}
          </div>
          <div style={{ ...s.field, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>{tr("publish.priceArs")} *</label>
              <button style={{ padding: "6px 14px", background: pricingLoading ? "var(--fw-surface-3)" : "var(--fw-chip)", color: pricingLoading ? "var(--fw-text-4)" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: pricingLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
                onClick={fetchPricing} disabled={pricingLoading}>
                {pricingLoading ? <Spinner size={11} label={tr("publish.analyzing")} /> : tr("publish.suggestAi")}
              </button>
            </div>
            {pricingSuggestion && (
              <div style={s.aiBox}>
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
                <div style={{ fontSize: 11, color: "var(--fw-text-4)", marginTop: 6 }}>{tr("publish.priceAutoNote")}</div>
              </div>
            )}
            <input style={s.input} type="number" placeholder="45000"
              value={listingForm.pricePerDay}
              onChange={(e) => setL("pricePerDay", e.target.value)} />
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={s.btn} onClick={next}>{tr("common.next")}</button>
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
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--fw-line-soft)", fontSize: isMobile ? 13 : 14 }}>
              <span style={{ color: "var(--fw-text-3)" }}>{k}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {k === tr("spec.color") && colorHex && (
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "1px solid var(--fw-border-2)" }} />
                )}
                <span style={{ fontWeight: 600, color: "var(--fw-text)" }}>{v}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--fw-blue-bg)", borderRadius: 10, fontSize: 13, color: "var(--fw-blue)", fontWeight: 500 }}>
            {tr("publish.willCreate")}
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep((s) => s - 1)}>{tr("common.back")}</button>
            <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={handlePublish} disabled={loading}>
              {loading ? <Spinner size={14} color="#fff" label={tr("publish.publishing")} /> : tr("publish.publishNow")}
            </button>
          </div>
        </div>  
      )}
    </div>
  );
}