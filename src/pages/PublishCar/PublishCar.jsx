import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import LocationPicker from "../../components/LocationPicker";

const s = {
  page: { maxWidth: 720, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { padding: "20px 16px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827",
    letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  card: { background: "#fff", borderRadius: 14, padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16,
    border: "1px solid #f3f4f6" },
  cardMobile: { background: "#fff", borderRadius: 14, padding: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16,
    border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111827",
    marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #f3f4f6" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500,
    color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
    color: "#111827" },
  inputError: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #fca5a5", fontSize: 14, outline: "none",
    color: "#111827" },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  hintError: { fontSize: 11, color: "#dc2626", marginTop: 4 },
  select: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14,
    background: "#fff", color: "#111827" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid2Mobile: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  grid3Mobile: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadArea: { border: "2px dashed #d1d5db", borderRadius: 10,
    padding: "32px 20px", textAlign: "center", cursor: "pointer",
    transition: ".15s", background: "#fafafa" },
  uploadAreaHover: { borderColor: "#1a4d2e", background: "#f0f7f2" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)",
    gap: 10, marginTop: 14 },
  photoItem: { position: "relative", aspectRatio: "4/3",
    borderRadius: 8, overflow: "hidden", background: "#e5e7eb" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover" },
  photoRemove: { position: "absolute", top: 6, right: 6,
    width: 22, height: 22, borderRadius: "50%",
    background: "rgba(0,0,0,.6)", color: "#fff", border: "none",
    cursor: "pointer", fontSize: 14, lineHeight: "22px", textAlign: "center" },
  termsBox: { background: "#fffbeb", border: "1px solid #fde68a",
    borderRadius: 10, padding: 16, marginBottom: 18 },
  termsTitle: { fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#92400e" },
  termsText: { fontSize: 12, color: "#78350f", lineHeight: 1.6 },
  termsCheck: { display: "flex", gap: 8, alignItems: "center", marginTop: 12 },
  btnRow: { display: "flex", gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: "13px", background: "#1a4d2e", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: "pointer" },
  btnBack: { flex: 1, padding: "13px", background: "transparent",
    border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10,
    fontSize: 14, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca",
    borderRadius: 8, padding: "10px 14px", color: "#b91c1c",
    fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#111827" },
  successSub: { color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  spinner: { display: "inline-block", width: 14, height: 14,
    border: "2px solid #fff", borderTopColor: "transparent",
    borderRadius: "50%", animation: "spin .7s linear infinite" },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "#f9fafb", border: "1.5px solid #e5e7eb",
    borderRadius: 8, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
};

const STEPS = ["Datos", "Fotos", "Condiciones", "Confirmar"];
const CURRENT_YEAR = new Date().getFullYear();

const SPEC_CONFIG = {
  baul_litros: {
    label: "Baúl (litros)",
    type: "number", min: 50, max: 1000,
    hint: "Entre 50 y 1000 litros",
  },
  aire_acondicionado: {
    label: "Aire acondicionado",
    type: "select", options: ["Sí", "No", "Climatizador"],
  },
  puertas: {
    label: "Puertas",
    type: "number", min: 2, max: 5,
    hint: "Entre 2 y 5 puertas",
  },
  potencia_cv: {
    label: "Potencia (CV)",
    type: "number", min: 50, max: 1000,
    hint: "Entre 50 y 1000 CV",
  },
  consumo_mixto: {
    label: "Consumo mixto",
    type: "text",
    placeholder: "ej: 7.5 l/100km",
    hint: "Formato: X.X l/100km",
  },
  traccion: {
    label: "Tracción",
    type: "select", options: ["Delantera", "Trasera", "4x4", "AWD"],
  },
  largo_mm: {
    label: "Largo (mm)",
    type: "number", min: 2500, max: 6000,
    hint: "Entre 2500 y 6000 mm",
  },
  ancho_mm: {
    label: "Ancho (mm)",
    type: "number", min: 1400, max: 2500,
    hint: "Entre 1400 y 2500 mm",
  },
  peso_kg: {
    label: "Peso (kg)",
    type: "number", min: 500, max: 5000,
    hint: "Entre 500 y 5000 kg",
  },
  bluetooth: {
    label: "Bluetooth",
    type: "select", options: ["Sí", "No"],
  },
  camara_reversa: {
    label: "Cámara de reversa",
    type: "select", options: ["Sí", "No"],
  },
  sensor_estacionamiento: {
    label: "Sensores de estac.",
    type: "select",
    options: ["No", "Traseros", "Delanteros", "Delanteros y traseros"],
  },
};

const onlyLetters = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");

export default function PublishCar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [step, setStep] = useState(0);
  const [ownerTerms, setOwnerTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [specs, setSpecs] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadHover, setUploadHover] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", year: String(CURRENT_YEAR - 1),
    category: "Sedan", price_per_day: "", location: "",
    lat: null, lng: null, description: "",
    transmission: "Manual", fuel: "Nafta", seats: "5", km_limit: "300",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setSpec = (key, val) => {
    const config = SPEC_CONFIG[key];
    if (config?.type === "number" && val !== "") {
      const num = Number(val);
      if (num < config.min) return;
      if (num > config.max) return;
    }
    setSpecs(prev => ({ ...(prev || {}), [key]: val }));
  };

  const cycleSpec = (key) => {
    const config = SPEC_CONFIG[key];
    if (config.type !== "select") return;
    const options = config.options;
    const current = specs?.[key];
    const currentIdx = options.indexOf(current);
    const nextIdx = (currentIdx + 1) % options.length;
    setSpecs(prev => ({ ...(prev || {}), [key]: options[nextIdx] }));
  };

  const fetchSpecs = async () => {
  if (!form.brand || !form.model || !form.year) {
    setError("Completá marca, modelo y año antes de autocompletar.");
    return;
  }
  setError("");
  setAiLoading(true);
  try {
    const res = await fetch(import.meta.env.VITE_N8N_SPECS_URL, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "X-Freewheel-Key": import.meta.env.VITE_N8N_KEY,
  },
  body: JSON.stringify({
    message: `${form.brand} ${form.model} ${form.year}`
  }),
});

if (res.status === 429) {
  throw new Error("Demasiadas consultas, esperá un minuto");
}
    const data = await res.json();
    const raw = Array.isArray(data) ? data[0]?.output : data?.output;
    if (!raw) throw new Error("Sin respuesta");
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON no encontrado");
    const parsed = JSON.parse(match[0]);
    setSpecs(parsed);
  } catch {
    setError("No se pudieron obtener las especificaciones.");
  } finally {
    setAiLoading(false);
  }
};

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) {
      setError("Podés subir hasta 6 fotos.");
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => setPhotos(p => p.filter((_, i) => i !== idx));

  const validateStep = () => {
    setError("");
    if (step === 0) {
      if (!form.brand || form.brand.trim().length < 2)
        return setError("Ingresá la marca del vehículo (mínimo 2 caracteres)."), false;
      if (!form.model || form.model.trim().length < 2)
        return setError("Ingresá el modelo del vehículo (mínimo 2 caracteres)."), false;
      const yearNum = parseInt(form.year);
      if (!form.year || yearNum < 1990 || yearNum > CURRENT_YEAR)
        return setError(`El año debe estar entre 1990 y ${CURRENT_YEAR}.`), false;
      const seatsNum = parseInt(form.seats);
      if (!form.seats || seatsNum < 2 || seatsNum > 9)
        return setError("La cantidad de asientos debe ser entre 2 y 9."), false;
      if (!form.description || form.description.trim().length < 20)
        return setError("La descripción debe tener al menos 20 caracteres."), false;
      if (!form.lat || !form.lng)
        return setError("Seleccioná la ubicación del auto en el mapa."), false;
      if (specs) {
        for (const [key, config] of Object.entries(SPEC_CONFIG)) {
          if (config.type === "number" && specs[key] !== undefined && specs[key] !== "") {
            const num = Number(specs[key]);
            if (isNaN(num) || num < config.min || num > config.max)
              return setError(`${config.label}: ${config.hint}.`), false;
          }
        }
      }
    }
    if (step === 1 && photos.length === 0)
      return setError("Subí al menos una foto del vehículo."), false;
    if (step === 2) {
      const price = Number(form.price_per_day);
      if (!form.price_per_day || price < 1000 || price > 500000)
        return setError("El precio por día debe estar entre $1.000 y $500.000 ARS."), false;
      const km = Number(form.km_limit);
      if (!form.km_limit || km < 50 || km > 2000)
        return setError("El límite de km diario debe estar entre 50 y 2000 km."), false;
      if (!ownerTerms)
        return setError("Aceptá las condiciones para dueños."), false;
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };

  const handlePublish = () => {
    const cars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    cars.push({
      ...form, specs: specs || {},
      photos: photos.map(p => p.url),
      id: Date.now().toString(),
      owner_id: user.id, owner_name: user.name,
      is_verified: false, approved: false,
      lat: form.lat, lng: form.lng,
      rating: 0, reviews_count: 0,
      available: true, created_at: new Date().toISOString(),
    });
    localStorage.setItem("fw_my_cars", JSON.stringify(cars));
    setDone(true);
  };

  const cardStyle = isMobile ? s.cardMobile : s.card;

  // ← ÚNICO CAMBIO: select → botón que cicla opciones
  const SpecInput = ({ specKey }) => {
    const config = SPEC_CONFIG[specKey];
    const val = specs?.[specKey] !== undefined ? String(specs[specKey]) : "";

    if (config.type === "select") {
      const hasValue = val !== "";
      return (
        <button
          onClick={() => cycleSpec(specKey)}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: hasValue ? "#e8f5ee" : "#f3f4f6",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
            fontWeight: 700,
            color: hasValue ? "#1a4d2e" : "#9ca3af",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background .15s",
          }}
        >
          <span>{hasValue ? val : "Tocar para elegir"}</span>
          <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 400 }}>
            {hasValue
              ? `${config.options.indexOf(val) + 1}/${config.options.length}`
              : "↺"}
          </span>
        </button>
      );
    }

    return (
      <>
        <input
          type={config.type}
          min={config.min}
          max={config.max}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 14,
            fontWeight: 600, color: "#111827", background: "transparent" }}
          placeholder={config.placeholder || "—"}
          value={val}
          onChange={e => setSpec(specKey, e.target.value)}
        />
        {config.hint && (
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
            {config.hint}
          </div>
        )}
      </>
    );
  };

  if (done) return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={s.success}>
        <div style={{ width: 64, height: 64, borderRadius: "50%",
          background: "#f0f7f2", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="#1a4d2e" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={s.successTitle}>Auto publicado correctamente</div>
        <div style={s.successSub}>
          Tu publicación está pendiente de aprobación.<br/>
          El equipo de Freewheel la revisará en las próximas horas.
        </div>
        <button style={{ ...s.btn, maxWidth: 200, margin: "0 auto" }}
          onClick={() => navigate("/dashboard")}>Ver mi panel</button>
      </div>
    </div>
  );

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...s.title, fontSize: isMobile ? 20 : 24 }}>Publicar mi auto</div>
      <div style={s.sub}>Completá los datos del vehículo</div>

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {STEPS.map((st, i) => (
          <div key={st} style={{ display: "flex", alignItems: "center",
            flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column",
              alignItems: "center", gap: 6 }}>
              <div style={{
                width: isMobile ? 28 : 32, height: isMobile ? 28 : 32,
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, fontWeight: 700,
                transition: "all .3s",
                background: i < step ? "#16a34a" : i === step ? "#1a4d2e" : "#e5e7eb",
                color: i <= step ? "#fff" : "#9ca3af",
                boxShadow: i === step ? "0 0 0 4px #dcfce7" : "none",
              }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 500,
                whiteSpace: "nowrap",
                color: i === step ? "#1a4d2e" : i < step ? "#16a34a" : "#9ca3af" }}>
                {st}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 18,
                background: "#e5e7eb", position: "relative", overflow: "hidden",
                borderRadius: 2 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%",
                  borderRadius: 2, transition: "width .4s ease", background: "#1a4d2e",
                  width: i < step ? "100%" : "0%",
                }}/>
                {i >= step && (
                  <div style={{ position: "absolute", left: 0, top: 0,
                    width: "100%", height: "100%",
                    backgroundImage: "repeating-linear-gradient(90deg, #d1d5db 0px, #d1d5db 6px, transparent 6px, transparent 12px)",
                  }}/>
                )}
              </div>
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
                value={form.brand}
                onChange={e => set("brand", onlyLetters(e.target.value))} />
              <div style={s.hint}>Solo letras</div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Modelo *</label>
              <input style={s.input} placeholder="Corolla"
                value={form.model}
                onChange={e => set("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Año * (1990-{CURRENT_YEAR})</label>
              <input style={s.input} type="number"
                min="1990" max={CURRENT_YEAR}
                value={form.year}
                onChange={e => {
                  const v = e.target.value;
                  if (v.length <= 4) set("year", v);
                }} />
            </div>
          </div>
          <div style={isMobile ? s.grid2Mobile : s.grid2}>
          <div style={s.field}>
  <label style={s.label}>Categoría</label>
  <button
    onClick={() => {
      const opts = ["Sedan","SUV","Pickup","Deportivo","Eléctrico","Utilitario"];
      const idx = opts.indexOf(form.category);
      set("category", opts[(idx + 1) % opts.length]);
    }}
    style={{
      width: "100%",
      padding: "11px 14px",
      borderRadius: 8,
      border: "1.5px solid #e5e7eb",
      fontSize: 14,
      background: "#rgb(250, 250, 250)",
      color: "##rgb(0, 0, 0)",
      fontWeight: 700,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <span>{form.category}</span>
    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
      {["Sedan","SUV","Pickup","Deportivo","Eléctrico","Utilitario"].indexOf(form.category) + 1} / 6
    </span>
  </button>
</div>
            <div style={s.field}>
              <label style={s.label}>Asientos * (2-9)</label>
              <input style={s.input} type="number" min="2" max="9"
                value={form.seats}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!e.target.value || (v >= 1 && v <= 9))
                    set("seats", e.target.value);
                }} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>
              Descripción * — {form.description.length} / 20 mínimos
            </label>
            <textarea style={{ ...s.input, height: 80, resize: "none" }}
              placeholder="Contá el estado del auto, extras, experiencia de uso..."
              value={form.description}
              onChange={e => set("description", e.target.value)} />
          </div>

          <LocationPicker
            value={form.lat ? { lat: form.lat, lng: form.lng, address: form.location } : null}
            onChange={(loc) => {
              set("location", loc.address);
              set("lat", loc.lat);
              set("lng", loc.lng);
            }}
          />

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                Especificaciones técnicas
              </div>
              <button
                style={{ padding: "8px 16px",
                  background: aiLoading ? "#e5e7eb" : "#111827",
                  color: aiLoading ? "#9ca3af" : "#fff",
                  border: "none", borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: aiLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6 }}
                onClick={fetchSpecs} disabled={aiLoading}>
                {aiLoading ? <><span style={s.spinner}/> Completando...</> : "Autocompletar"}
              </button>
            </div>
            <div style={s.specGrid}>
              {Object.keys(SPEC_CONFIG).map(key => (
                <div key={key} style={s.specItem}>
                  <div style={s.specLabel}>{SPEC_CONFIG[key].label}</div>
                  <SpecInput specKey={key} />
                </div>
              ))}
            </div>
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
            Subí hasta 6 fotos. La primera será la foto principal.
          </p>
          <div
            style={{ ...s.uploadArea, ...(uploadHover ? s.uploadAreaHover : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple
              style={{ display: "none" }} onChange={handlePhotos} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151",
              marginBottom: 4 }}>Hacé clic para subir fotos</div>
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
            <button style={s.btnBack} onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={cardStyle}>
          <div style={s.sectionTitle}>Precio y condiciones</div>
          <div style={isMobile ? s.grid2Mobile : s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Precio por día ($ARS) *</label>
              <input style={s.input} type="number"
                placeholder="8500" min="1000" max="500000"
                value={form.price_per_day}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (e.target.value === "" || (v >= 0 && v <= 500000))
                    set("price_per_day", e.target.value);
                }} />
              <div style={s.hint}>Entre $1.000 y $500.000 ARS</div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Km diario incluido *</label>
              <input style={s.input} type="number"
                min="50" max="2000"
                value={form.km_limit}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (e.target.value === "" || (v >= 0 && v <= 2000))
                    set("km_limit", e.target.value);
                }} />
              <div style={s.hint}>Entre 50 y 2000 km</div>
            </div>
            <div style={s.field}>
  <label style={s.label}>Transmisión</label>
  <button
    onClick={() => {
      const opts = ["Manual", "Automático"];
      const idx = opts.indexOf(form.transmission);
      set("transmission", opts[(idx + 1) % opts.length]);
    }}
    style={{
      width: "100%", padding: "11px 14px", borderRadius: 8,
      border: "1.5px solid #e5e7eb", fontSize: 14, background: "#e8f5ee",
      color: "#1a4d2e", fontWeight: 700, cursor: "pointer", textAlign: "left",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}
  >
    <span>{form.transmission}</span>
    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
      {["Manual", "Automático"].indexOf(form.transmission) + 1} / 2
    </span>
  </button>
</div>
<div style={s.field}>
  <label style={s.label}>Combustible</label>
  <button
    onClick={() => {
      const opts = ["Nafta", "Diesel", "Eléctrico", "GNC"];
      const idx = opts.indexOf(form.fuel);
      set("fuel", opts[(idx + 1) % opts.length]);
    }}
    style={{
      width: "100%", padding: "11px 14px", borderRadius: 8,
      border: "1.5px solid #e5e7eb", fontSize: 14, background: "#e8f5ee",
      color: "#1a4d2e", fontWeight: 700, cursor: "pointer", textAlign: "left",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}
  >
    <span>{form.fuel}</span>
    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
      {["Nafta", "Diesel", "Eléctrico", "GNC"].indexOf(form.fuel) + 1} / 4
    </span>
  </button>
</div>
          </div>
          <div style={s.termsBox}>
            <div style={s.termsTitle}>Condiciones para dueños</div>
            <div style={s.termsText}>
              Al publicar tu auto en Freewheel aceptás que: (1) El vehículo debe
              contar con seguro vigente. (2) Debés subir la cédula verde/azul para
              verificación. (3) Freewheel retiene el pago hasta que el alquiler se
              complete sin incidentes. (4) Ante daños, el depósito actúa como
              primera cobertura.
            </div>
            <div style={s.termsCheck}>
              <input type="checkbox" checked={ownerTerms}
                onChange={e => setOwnerTerms(e.target.checked)}
                style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#92400e" }}>
                Acepto estas condiciones como dueño del vehículo
              </span>
            </div>
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep(s => s - 1)}>Atrás</button>
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
            ["Vehículo", `${form.brand} ${form.model} ${form.year}`],
            ["Categoría", form.category],
            ["Ubicación", form.location || "No especificada"],
            ["Precio/día", `$${Number(form.price_per_day).toLocaleString()} ARS`],
            ["Km incluidos/día", `${form.km_limit} km`],
            ["Transmisión", form.transmission],
            ["Combustible", form.fuel],
            ["Asientos", form.seats],
            ["Fotos", `${photos.length} foto${photos.length !== 1 ? "s" : ""}`],
            ["Specs", specs ? "Completadas" : "No obtenidas"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between",
              padding: "9px 0", borderBottom: "1px solid #f3f4f6",
              fontSize: isMobile ? 13 : 14 }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: "#f0f7f2",
            borderRadius: 8, fontSize: 13, color: "#1a4d2e" }}>
            Tu auto quedará pendiente de aprobación por el equipo de Freewheel.
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack} onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={handlePublish}>Publicar ahora</button>
          </div>
        </div>
      )}
    </div>
  );
}