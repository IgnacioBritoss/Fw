import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getListings } from "../../services/api";
import { mockCars } from "../../data/mockData";

const TRANSMISSION_LABELS = { MANUAL:"Manual", AUTOMATIC:"Automático" };
const FUEL_LABELS = { GASOLINE:"Nafta", DIESEL:"Diesel", ELECTRIC:"Eléctrico", OTHER:"GNC" };

const CATEGORIES = [
  { id:"Todos", label:"Todos", icon:"" },
  { id:"Económico", label:"Económico", icon:"" },
  { id:"Berlina", label:"Berlina", icon:"" },
  { id:"SUV", label:"SUV", icon:"" },
  { id:"Pickup", label:"Pickup", icon:"" },
  { id:"Eléctrico", label:"Eléctrico", icon:"" },
  { id:"Premium", label:"Premium", icon:"" },
];

function normalizeListing(l) {
  const v = l.vehicle || {};
  return {
    id:l.id, brand:v.brand||l.brand||"", model:v.model||l.model||"", year:v.year||l.year||"",
    price_per_day:l.pricePerDay||l.price_per_day||0,
    locationText:l.locationText||l.location||"",
    location:l.locationText||l.location||"",
    lat:l.latitude??l.lat, lng:l.longitude??l.lng,
    transmission:TRANSMISSION_LABELS[v.transmission]||v.transmission||l.transmission||"",
    fuel:FUEL_LABELS[v.fuelType]||v.fuelType||l.fuel||"",
    seats:v.seats||l.seats, photos:l.photos||v.photos||[],
    available:l.status==="ACTIVE"||l.available!==false,
    is_verified:l.is_verified||false, rating:l.rating||0,
    category:l.category||v.category||"", description:l.description||"",
    owner_id:l.ownerId||l.owner_id,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Todos");
  const [view, setView] = useState("lista");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [listings, setListings] = useState(mockCars);

  useEffect(() => {
    const myCars = JSON.parse(localStorage.getItem("fw_my_cars")||"[]");
    getListings().then(data => {
      const items = Array.isArray(data) ? data : (data?.data??[]);
      if (items.length>0) {
        const normalized = items.map(normalizeListing);
        const apiIds = new Set(normalized.map(c=>c.id));
        const extra = myCars.filter(c=>!apiIds.has(c.id));
        setListings([...normalized,...extra]);
      } else {
        setListings(prev => { const ids=new Set(prev.map(c=>c.id)); return [...prev,...myCars.filter(c=>!ids.has(c.id))]; });
      }
    }).catch(() => {
      setListings(prev => { const ids=new Set(prev.map(c=>c.id)); return [...prev,...myCars.filter(c=>!ids.has(c.id))]; });
    });
  }, []);

  const filtered = listings.filter(c => {
    const matchSearch = !search ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.locationText?.toLowerCase().includes(search.toLowerCase()) ||
      c.brand?.toLowerCase().includes(search.toLowerCase()) ||
      c.model?.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat==="Todos"||c.category===cat;
    return matchSearch&&matchCat&&c.available!==false;
  });

  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const link=document.createElement("link"); link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    const script=document.createElement("script"); script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.onload=()=>setMapLoaded(true); document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (view==="lista"&&mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current=null; markersRef.current={}; }
  }, [view]);

  useEffect(() => {
    if (view!=="mapa") return;
    const init = () => {
      if (!mapRef.current||mapInstanceRef.current) return;
      const L=window.L; if (!L) return;
      const map=L.map(mapRef.current,{center:[-34.6037,-58.3816],zoom:12});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
      mapInstanceRef.current=map; addMarkers(map,L);
    };
    if (window.L) setTimeout(init,150);
    else { const iv=setInterval(()=>{if(window.L){clearInterval(iv);setTimeout(init,150);}},100); }
  }, [view,mapLoaded]);

  const addMarkers = useCallback((map,L) => {
    if (!map||!L) return;
    Object.values(markersRef.current).forEach(m => { try { map.removeLayer(m.marker||m); if(m.circle) map.removeLayer(m.circle); } catch{} });
    markersRef.current={};
    filtered.forEach(car => {
      if (!car.lat||!car.lng) return;
      const icon=L.divIcon({ className:"", html:`<div style="width:14px;height:14px;background:#2563eb;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`, iconAnchor:[7,7] });
      const circle=L.circle([car.lat,car.lng],{radius:600,color:"#2563eb",fillColor:"#bfdbfe",fillOpacity:.18,weight:1.5,interactive:false}).addTo(map);
      const marker=L.marker([car.lat,car.lng],{icon});
      marker.bindPopup(L.popup({closeButton:false,maxWidth:220}).setContent(`
        <div style="cursor:pointer;font-family:sans-serif" onclick="window.__fwOpen('${car.id}')">
          <div style="width:100%;height:120px;border-radius:10px;overflow:hidden;margin-bottom:10px;background:#e5e7eb;">
            ${car.photos?.length>0?`<img src="${car.photos[0]}" style="width:100%;height:100%;object-fit:cover"/>`:`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af">Sin foto</div>`}
          </div>
          <div style="font-weight:600;font-size:14px;color:#111827">${car.brand} ${car.model} ${car.year}</div>
          <div style="font-weight:700;font-size:15px;color:#2563eb;margin-top:4px">$${Number(car.price_per_day||0).toLocaleString()}<span style="font-weight:400;font-size:12px;color:#6b7280">/día</span></div>
          <div style="margin-top:8px;padding:7px;background:#2563eb;color:#fff;border-radius:8px;text-align:center;font-size:12px;font-weight:600;">Ver auto</div>
        </div>
      `));
      marker.addTo(map);
      markersRef.current[car.id]={marker,circle};
    });
    window.__fwOpen=(id)=>navigate(`/cars/${id}`);
  }, [filtered,navigate]);

  useEffect(() => {
    if (view!=="mapa"||!mapInstanceRef.current||!window.L) return;
    addMarkers(mapInstanceRef.current,window.L);
  }, [filtered,addMarkers,view]);

  const price = (car) => car.price_per_day||car.pricePerDay||0;

  const CarCard = ({ car }) => (
    <div onClick={()=>navigate(`/cars/${car.id}`)} style={{ cursor:"pointer", background:"#fff", borderRadius:14, overflow:"hidden", border:"1px solid #f3f4f6", transition:"box-shadow .2s", boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.04)"}>
      <div style={{ width:"100%", aspectRatio:"4/3", background:"#f3f4f6", position:"relative", overflow:"hidden" }}>
        {car.photos?.length>0
          ? <img src={car.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#9ca3af", fontSize:13 }}>Sin foto</div>}
        {car.is_verified && (
          <div style={{ position:"absolute", top:10, left:10, background:"rgba(37,99,235,.9)", color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>
            Verificado
          </div>
        )}
        {car.rating>0 && (
          <div style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,.55)", color:"#fff", padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>
            ★ {car.rating}
          </div>
        )}
      </div>
      <div style={{ padding:"12px 14px 14px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:2 }}>{car.brand} {car.model} {car.year}</div>
        <div style={{ fontSize:12, color:"#6b7280", marginBottom:8 }}>{car.location||car.locationText}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#111827" }}>
            ${Number(price(car)).toLocaleString()} <span style={{ fontSize:12, fontWeight:400, color:"#6b7280" }}>/día</span>
          </div>
          <button style={{ padding:"6px 14px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Ver más
          </button>
        </div>
      </div>
    </div>
  );

  const steps = [
    { n:"01", title:"Buscá", desc:"Encontrá el auto que se adapte a tus necesidades, fechas y zona de entrega." },
    { n:"02", title:"Reservá", desc:"Elegí las fechas y confirmá la reserva. Podés pagar con Mercado Pago o tarjeta." },
    { n:"03", title:"Retirá", desc:"Coordiná con el dueño, verificá tu identidad y recibí las llaves del auto." },
    { n:"04", title:"Devolvé", desc:"Devolvé el auto limpio, cargado de combustible y sin daños según lo acordado." },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb" }}>

      {/* ── Hero ── */}
      <div style={{
        background:"linear-gradient(160deg,#0a0f1e 0%,#0d1525 55%,#0f1e3d 100%)",
        padding:"72px 40px 64px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse at 20% 80%,rgba(37,99,235,.2) 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,rgba(37,99,235,.1) 0%,transparent 50%)" }}/>
        <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
          <div style={{ display:"inline-block", background:"rgba(37,99,235,.15)", border:"1px solid rgba(37,99,235,.3)", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:600, color:"#60a5fa", marginBottom:20 }}>
            #Movernos en Argentina
          </div>
          <h1 style={{ fontSize:56, fontWeight:900, color:"#fff", lineHeight:1.1, letterSpacing:"-2px", marginBottom:16, maxWidth:520 }}>
            Alquilá tu<br/>auto
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.55)", maxWidth:400, lineHeight:1.7, marginBottom:40 }}>
            La plataforma para alquilar autos entre personas, verificada, segura y sin multas.
          </p>

          {/* Search bar */}
          <div style={{
            background:"#fff", borderRadius:14, padding:"6px 6px 6px 0",
            maxWidth:640, display:"flex", alignItems:"center",
            boxShadow:"0 12px 40px rgba(0,0,0,.25)", marginBottom:24,
          }}>
            <div style={{ display:"flex", flex:1, gap:0 }}>
              {[["Desde","Ciudad o zona..."],["Fecha","dd/mm/aaaa"],["Devolución","dd/mm/aaaa"]].map(([label,ph]) => (
                <div key={label} style={{ flex:1, padding:"10px 16px", borderRight:"1px solid #f3f4f6" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".06em", marginBottom:2 }}>{label}</div>
                  <input placeholder={ph} style={{ width:"100%", border:"none", outline:"none", fontSize:13, color:"#374151", background:"transparent" }}
                    value={label==="Desde"?search:""}
                    onChange={label==="Desde"?e=>setSearch(e.target.value):undefined} />
                </div>
              ))}
            </div>
            <button style={{
              padding:"12px 24px", background:"#2563eb", color:"#fff",
              border:"none", borderRadius:10, fontSize:14, fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap", margin:"0 4px",
            }}>
              Buscar autos
            </button>
          </div>

          {/* Price pill */}
          <div style={{ display:"inline-flex", alignItems:"center", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"8px 16px", gap:8 }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>Desde</span>
            <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>$60.000</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>/día</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 40px" }}>

        {/* ── Categorías ── */}
        <section style={{ paddingTop:56, paddingBottom:40 }}>
          <h2 style={{ fontSize:24, fontWeight:800, color:"#111827", marginBottom:6 }}>Explorá por categoría</h2>
          <p style={{ fontSize:14, color:"#6b7280", marginBottom:28 }}>Seleccioná la categoría que mejor se adapte a lo que buscás</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12 }}>
            {CATEGORIES.filter(c=>c.id!=="Todos").map(c => (
              <div key={c.id} onClick={()=>setCat(c.id)}
                style={{
                  background:cat===c.id?"#eff6ff":"#fff", border:cat===c.id?"1.5px solid #2563eb":"1.5px solid #e5e7eb",
                  borderRadius:12, padding:"20px 16px", cursor:"pointer", textAlign:"center", transition:"all .15s",
                }}
                onMouseEnter={e=>{ if(cat!==c.id) e.currentTarget.style.borderColor="#c7d2fe"; }}
                onMouseLeave={e=>{ if(cat!==c.id) e.currentTarget.style.borderColor="#e5e7eb"; }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, color:cat===c.id?"#2563eb":"#374151" }}>{c.label}</div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>Desde $60.000</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section style={{ paddingBottom:48 }}>
          <h2 style={{ fontSize:24, fontWeight:800, color:"#111827", marginBottom:6 }}>Cómo funciona</h2>
          <p style={{ fontSize:14, color:"#6b7280", marginBottom:28 }}>Alquilar un auto es 4 pasos: simple, rápido y seguro.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ background:"#fff", border:"1.5px solid #f3f4f6", borderRadius:14, padding:"24px 20px" }}>
                <div style={{ fontSize:28, fontWeight:900, color:"#2563eb", marginBottom:12, lineHeight:1 }}>{s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#111827", marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:13, color:"#6b7280", lineHeight:1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Autos destacados ── */}
        <section style={{ paddingBottom:56 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <h2 style={{ fontSize:24, fontWeight:800, color:"#111827" }}>Autos destacados</h2>
            <div style={{ display:"flex", gap:8 }}>
              {[["lista","Lista"],["mapa","Mapa"]].map(([k,l]) => (
                <button key={k} onClick={()=>setView(k === view && k !== "lista" ? "lista" : k)} style={{                  padding:"7px 16px", borderRadius:20, fontSize:13, cursor:"pointer", fontWeight:500,
                  border:view===k?"2px solid #2563eb":"1.5px solid #e5e7eb",
                  background:view===k?"#2563eb":"#fff", color:view===k?"#fff":"#374151",
                }}>{l}</button>
              ))}
            </div>
          </div>
          <p style={{ fontSize:14, color:"#6b7280", marginBottom:24 }}>Los más elegidos por la comunidad esta semana.</p>

          {view==="lista" ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
                {filtered.slice(0,8).map(car => <CarCard key={car.id} car={car}/>)}
              </div>
              {filtered.length===0 && (
                <div style={{ textAlign:"center", padding:60, color:"#9ca3af", fontSize:14 }}>No se encontraron autos.</div>
              )}
              {filtered.length>8 && (
                <div style={{ textAlign:"center", marginTop:32 }}>
                  <button style={{ padding:"12px 32px", background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, color:"#374151", cursor:"pointer" }}>
                    Ver todos →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 45%", gap:24 }}>
              <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 200px)", paddingRight:8 }}>
                <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>{filtered.length} auto{filtered.length!==1?"s":""} disponibles</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                  {filtered.map(car=><CarCard key={car.id} car={car}/>)}
                </div>
              </div>
              <div style={{ position:"sticky", top:24 }}>
                <div ref={mapRef} style={{ height:"calc(100vh - 140px)", borderRadius:14, overflow:"hidden", zIndex:0, border:"1px solid #e5e7eb" }}/>
              </div>
            </div>
          )}
        </section>

        {/* ── CTA Publicar ── */}
        <section style={{ marginBottom:64 }}>
          <div style={{
            background:"linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#3b82f6 100%)",
            borderRadius:20, padding:"48px 52px", display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>PARA DUEÑOS</div>
              <h3 style={{ fontSize:30, fontWeight:800, color:"#fff", letterSpacing:"-0.5px", marginBottom:8, lineHeight:1.2 }}>
                Publicá tu auto.<br/>Empezá a ganar.
              </h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.7)", maxWidth:360, lineHeight:1.6 }}>
                Ganá dinero extra con tu auto cuando no lo usás. Vos ponés el precio, la disponibilidad y las condiciones.
              </p>
              <button onClick={()=>navigate("/publish")} style={{
                marginTop:24, padding:"12px 28px", background:"#fff", color:"#2563eb",
                border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer",
              }}>
                Publicar mi auto →
              </button>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:48, fontWeight:900, color:"#fff", letterSpacing:"-2px" }}>$1.420.000</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginTop:4 }}>Ganancia promedio mensual</div>
              <div style={{ marginTop:20, background:"rgba(255,255,255,.12)", borderRadius:12, padding:"12px 20px", display:"inline-block", textAlign:"left" }}>
                <div style={{ display:"flex", gap:16 }}>
                  {[["8 reservas","este mes"],["4.9 ★","calificación"],["96%","ocupación"]].map(([v,l])=>(
                    <div key={l}><div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{v}</div><div style={{ fontSize:11, color:"rgba(255,255,255,.5)" }}>{l}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer style={{ borderTop:"1px solid #e5e7eb", padding:"32px 40px", textAlign:"center", color:"#9ca3af", fontSize:13, background:"#fff" }}>
        © 2025 Freewheel · Alquiler de autos entre particulares en Argentina
      </footer>
    </div>
  );
}