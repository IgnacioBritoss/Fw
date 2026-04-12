import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationPicker from "../../components/LocationPicker";

const s = {
  page: { maxWidth: 720, margin: "0 auto", padding: "40px 24px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827",
    letterSpacing: "-.5px", marginBottom: 6 },
  sub: { color: "#6b7280", fontSize: 14, marginBottom: 32 },
  steps: { display: "flex", marginBottom: 36 },
  step: { flex: 1, textAlign: "center", fontSize: 12, color: "#9ca3af" },
  stepDot: { width: 28, height: 28, borderRadius: "50%",
    background: "#e5e7eb", margin: "0 auto 6px", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#6b7280" },
  stepDotActive: { background: "#1a4d2e", color: "#fff" },
  stepDotDone: { background: "#16a34a", color: "#fff" },
  card: { background: "#fff", borderRadius: 14, padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 16,
    border: "1px solid #f3f4f6" },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#111827",
    marginBottom: 16, paddingBottom: 10,
    borderBottom: "1px solid #f3f4f6" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500,
    color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none",
    color: "#111827" },
  select: { width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 14,
    background: "#fff", color: "#111827" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
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
    cursor: "pointer", fontSize: 14, lineHeight: "22px",
    textAlign: "center" },
  termsBox: { background: "#fffbeb", border: "1px solid #fde68a",
    borderRadius: 10, padding: 16, marginBottom: 18 },
  termsTitle: { fontWeight: 700, fontSize: 14, marginBottom: 8,
    color: "#92400e" },
  termsText: { fontSize: 12, color: "#78350f", lineHeight: 1.6 },
  termsCheck: { display: "flex", gap: 8, alignItems: "center",
    marginTop: 12 },
  btnRow: { display: "flex", gap: 10, marginTop: 8 },
  btn: { flex: 1, padding: "13px", background: "#1a4d2e", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14,
    fontWeight: 700, cursor: "pointer" },
  btnBack: { flex: 1, padding: "13px", background: "transparent",
    border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10,
    fontSize: 14, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca",
    borderRadius: 8, padding: "10px 14px", color: "#b91c1c",
    fontSize: 13, marginBottom: 16 },
  success: { textAlign: "center", padding: "60px 20px" },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8,
    color: "#111827" },
  successSub: { color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  spinner: { display: "inline-block", width: 14, height: 14,
    border: "2px solid #fff", borderTopColor: "transparent",
    borderRadius: "50%", animation: "spin .7s linear infinite" },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  specItem: { background: "#f9fafb", border: "1.5px solid #e5e7eb",
    borderRadius: 8, padding: "10px 14px" },
  specLabel: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
};

const STEPS = ["Datos del auto", "Fotos", "Condiciones", "Confirmar"];

const SPEC_LABELS = {
  baul_litros: "Baúl (litros)",
  aire_acondicionado: "Aire acondicionado",
  puertas: "Puertas",
  potencia_cv: "Potencia (CV)",
  consumo_mixto: "Consumo mixto",
  traccion: "Tracción",
  largo_mm: "Largo (mm)",
  ancho_mm: "Ancho (mm)",
  peso_kg: "Peso (kg)",
  bluetooth: "Bluetooth",
  camara_reversa: "Cámara de reversa",
  sensor_estacionamiento: "Sensores de estac.",
};

export default function PublishCar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ownerTerms, setOwnerTerms] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [specs, setSpecs] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadHover, setUploadHover] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", year: "2022", category: "Sedan",
    price_per_day: "", location: "", lat: null, lng: null,
    description: "", transmission: "Manual", fuel: "Nafta",
    seats: "5", km_limit: "300",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchSpecs = async () => {
    if (!form.brand || !form.model || !form.year) {
      setError("Completá marca, modelo y año antes de autocompletar.");
      return;
    }
    setError("");
    setAiLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: form.brand, model: form.model, year: form.year,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSpecs(data);
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
    if (step === 0 && (!form.brand || !form.model || !form.year)) {
      setError("Completá marca, modelo y año."); return false;
    }
    if (step === 1 && photos.length === 0) {
      setError("Subí al menos una foto."); return false;
    }
    if (step === 2 && !form.price_per_day) {
      setError("Ingresá el precio por día."); return false;
    }
    if (step === 2 && !ownerTerms) {
      setError("Aceptá las condiciones para dueños."); return false;
    }
    setError(""); return true;
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

  if (done) return (
    <div style={s.page}>
      <div style={s.success}>
        <div style={{ width:64, height:64, borderRadius:"50%",
          background:"#f0f7f2", display:"flex", alignItems:"center",
          justifyContent:"center", margin:"0 auto 20px" }}>
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
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={s.title}>Publicar mi auto</div>
      <div style={s.sub}>Completá los datos del vehículo</div>

      <div style={{ display:"flex", alignItems:"center", marginBottom:36 }}>
  {STEPS.map((st, i) => (
    <div key={st} style={{ display:"flex", alignItems:"center",
      flex: i < STEPS.length - 1 ? 1 : "none" }}>
      <div style={{ display:"flex", flexDirection:"column",
        alignItems:"center", gap:6 }}>
        <div style={{
          width:32, height:32, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:700, transition:"all .3s",
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
        <span style={{ fontSize:11, fontWeight:500, whiteSpace:"nowrap",
          color: i === step ? "#1a4d2e" : i < step ? "#16a34a" : "#9ca3af" }}>
          {st}
        </span>
      </div>
      {i < STEPS.length - 1 && (
        <div style={{ flex:1, height:2, margin:"0 8px", marginBottom:18,
          background:"#e5e7eb", position:"relative", overflow:"hidden",
          borderRadius:2 }}>
          <div style={{
            position:"absolute", left:0, top:0, height:"100%",
            borderRadius:2, transition:"width .4s ease",
            background:"#1a4d2e",
            width: i < step ? "100%" : "0%",
          }}/>
          {i >= step && (
            <div style={{
              position:"absolute", left:0, top:0,
              width:"100%", height:"100%",
              backgroundImage:"repeating-linear-gradient(90deg, #d1d5db 0px, #d1d5db 6px, transparent 6px, transparent 12px)",
            }}/>
          )}
        </div>
      )}
    </div>
  ))}
</div>

      {error && <div style={s.error}>{error}</div>}

      {step === 0 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Datos del vehículo</div>
          <div style={s.grid3}>
            <div style={s.field}>
              <label style={s.label}>Marca</label>
              <input style={s.input} placeholder="Toyota"
                value={form.brand} onChange={e => set("brand", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Modelo</label>
              <input style={s.input} placeholder="Corolla"
                value={form.model} onChange={e => set("model", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Año</label>
              <input style={s.input} type="number" min="2000" max="2025"
                value={form.year} onChange={e => set("year", e.target.value)} />
            </div>
          </div>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Categoría</label>
              <select style={s.select} value={form.category}
                onChange={e => set("category", e.target.value)}>
                {["Sedan","SUV","Pickup","Deportivo","Eléctrico","Utilitario"]
                  .map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Asientos</label>
              <input style={s.input} type="number" value={form.seats}
                onChange={e => set("seats", e.target.value)} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Descripción</label>
            <textarea style={{ ...s.input, height: 80, resize: "none" }}
              placeholder="Contá el estado del auto, extras, experiencia de uso..."
              value={form.description}
              onChange={e => set("description", e.target.value)} />
          </div>

          <LocationPicker
            value={form.lat ? { lat:form.lat, lng:form.lng, address:form.location } : null}
            onChange={(loc) => {
              set("location", loc.address);
              set("lat", loc.lat);
              set("lng", loc.lng);
            }}
          />

          <div style={{ marginTop: 8 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>
                Especificaciones técnicas
              </div>
              <button
                style={{ padding:"8px 16px",
                  background: aiLoading ? "#e5e7eb" : "#111827",
                  color: aiLoading ? "#9ca3af" : "#fff",
                  border:"none", borderRadius:8, fontSize:13,
                  fontWeight:600, cursor: aiLoading ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", gap:6 }}
                onClick={fetchSpecs} disabled={aiLoading}>
                {aiLoading
                  ? <><span style={s.spinner}/> Completando...</>
                  : "Autocompletar"}
              </button>
            </div>
            <div style={s.specGrid}>
              {Object.keys(SPEC_LABELS).map(key => (
                <div key={key} style={s.specItem}>
                  <div style={s.specLabel}>{SPEC_LABELS[key]}</div>
                  <input
                    style={{ width:"100%", border:"none", outline:"none",
                      fontSize:14, fontWeight:600, color:"#111827",
                      background:"transparent" }}
                    placeholder="—"
                    value={specs?.[key] !== undefined ? String(specs[key]) : ""}
                    onChange={e => setSpecs(prev => ({
                      ...(prev || {}), [key]: e.target.value
                    }))} />
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
        <div style={s.card}>
          <div style={s.sectionTitle}>Fotos del vehículo</div>
          <p style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>
            Subí hasta 6 fotos. La primera será la foto principal.
          </p>
          <div
            style={{ ...s.uploadArea, ...(uploadHover ? s.uploadAreaHover : {}) }}
            onMouseEnter={() => setUploadHover(true)}
            onMouseLeave={() => setUploadHover(false)}
            onClick={() => document.getElementById("car-photos").click()}>
            <input id="car-photos" type="file" accept="image/*" multiple
              style={{ display:"none" }} onChange={handlePhotos} />
            <div style={{ fontSize:13, fontWeight:600, color:"#374151",
              marginBottom:4 }}>Hacé clic para subir fotos</div>
            <div style={{ fontSize:12, color:"#9ca3af" }}>
              JPG, PNG — máximo 6 fotos
            </div>
          </div>
          {photos.length > 0 && (
            <div style={s.photoGrid}>
              {photos.map((p, i) => (
                <div key={i} style={s.photoItem}>
                  <img src={p.url} alt="" style={s.photoImg} />
                  {i === 0 && (
                    <div style={{ position:"absolute", bottom:6, left:6,
                      background:"#1a4d2e", color:"#fff", fontSize:10,
                      padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
                      Principal
                    </div>
                  )}
                  <button style={s.photoRemove}
                    onClick={() => removePhoto(i)}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnBack}
              onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Precio y condiciones</div>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Precio por día ($ARS)</label>
              <input style={s.input} type="number" placeholder="8500"
                value={form.price_per_day}
                onChange={e => set("price_per_day", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Km diario incluido</label>
              <input style={s.input} type="number" value={form.km_limit}
                onChange={e => set("km_limit", e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Transmisión</label>
              <select style={s.select} value={form.transmission}
                onChange={e => set("transmission", e.target.value)}>
                <option>Manual</option><option>Automático</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Combustible</label>
              <select style={s.select} value={form.fuel}
                onChange={e => set("fuel", e.target.value)}>
                <option>Nafta</option><option>Diesel</option>
                <option>Eléctrico</option><option>GNC</option>
              </select>
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
                onChange={e => setOwnerTerms(e.target.checked)} />
              <span style={{ fontSize:13, color:"#92400e" }}>
                Acepto estas condiciones como dueño del vehículo
              </span>
            </div>
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack}
              onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={next}>Siguiente</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Revisá tu publicación</div>
          {photos.length > 0 && (
            <img src={photos[0].url} alt="principal"
              style={{ width:"100%", height:200, objectFit:"cover",
                borderRadius:10, marginBottom:20 }} />
          )}
          {[
            ["Vehículo", `${form.brand} ${form.model} ${form.year}`],
            ["Categoría", form.category],
            ["Ubicación", form.location || "No especificada"],
            ["Precio/día", `$${Number(form.price_per_day).toLocaleString()} ARS`],
            ["Km incluidos/día", `${form.km_limit} km`],
            ["Transmisión", form.transmission],
            ["Fotos", `${photos.length} foto${photos.length !== 1 ? "s" : ""}`],
            ["Specs", specs ? "Completadas" : "No obtenidas"],
          ].map(([k, v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between",
              padding:"9px 0", borderBottom:"1px solid #f3f4f6", fontSize:14 }}>
              <span style={{ color:"#6b7280" }}>{k}</span>
              <span style={{ fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:16, padding:12, background:"#f0f7f2",
            borderRadius:8, fontSize:13, color:"#1a4d2e" }}>
            Tu auto quedará pendiente de aprobación por el equipo de Freewheel.
          </div>
          <div style={s.btnRow}>
            <button style={s.btnBack}
              onClick={() => setStep(s => s - 1)}>Atrás</button>
            <button style={s.btn} onClick={handlePublish}>
              Publicar ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}