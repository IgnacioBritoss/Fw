import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { maxWidth:900, margin:"0 auto", padding:"40px 24px" },
  header: { display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:28 },
  title: { fontSize:24, fontWeight:700 },
  btn: { padding:"10px 20px", background:"#1d4ed8", color:"#fff",
    border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" },
  tabs: { display:"flex", gap:4, marginBottom:24,
    borderBottom:"2px solid #f3f4f6" },
  tab: { padding:"10px 18px", fontSize:14, fontWeight:500, cursor:"pointer",
    border:"none", background:"transparent", color:"#6b7280", borderBottom:"3px solid transparent" },
  tabActive: { color:"#1d4ed8", borderBottom:"3px solid #1d4ed8" },
  card: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 2px 10px rgba(0,0,0,.06)", marginBottom:14,
    display:"flex", justifyContent:"space-between", alignItems:"center" },
  carInfo: { flex:1 },
  carName: { fontWeight:600, fontSize:15 },
  carMeta: { color:"#6b7280", fontSize:13, marginTop:2 },
  statusBadge: { padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600 },
  pending: { background:"#fef9c3", color:"#854d0e" },
  verified: { background:"#dcfce7", color:"#166534" },
  solicitud: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 2px 10px rgba(0,0,0,.06)", marginBottom:14 },
  sol_header: { display:"flex", justifyContent:"space-between",
    alignItems:"flex-start", marginBottom:10 },
  sol_name: { fontWeight:600, fontSize:15 },
  sol_dates: { fontSize:13, color:"#6b7280" },
  btnRow: { display:"flex", gap:8, marginTop:12 },
  btnAccept: { padding:"8px 18px", background:"#16a34a", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
  btnReject: { padding:"8px 18px", background:"transparent",
    border:"1px solid #dc2626", color:"#dc2626", borderRadius:8,
    fontSize:13, cursor:"pointer" },
  empty: { textAlign:"center", padding:"40px 0", color:"#9ca3af" },
  statsRow: { display:"grid", gridTemplateColumns:"repeat(3,1fr)",
    gap:14, marginBottom:28 },
  stat: { background:"#fff", borderRadius:12, padding:"18px 20px",
    boxShadow:"0 2px 10px rgba(0,0,0,.06)", textAlign:"center" },
  statNum: { fontSize:28, fontWeight:700, color:"#1d4ed8" },
  statLabel: { fontSize:13, color:"#6b7280", marginTop:4 },
};

const MOCK_REQUESTS = [
  { id:"req1", renter:"Martina González", car:"Toyota Corolla 2021",
    dates:"15-18 Jun 2025", price:"$28.500", rating:4.8, verified:true, status:"pending" },
  { id:"req2", renter:"Lucas Pérez", car:"Toyota Corolla 2021",
    dates:"22-24 Jun 2025", price:"$19.000", rating:4.2, verified:true, status:"pending" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("autos");
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]")
    .filter(c => c.owner_id === user?.id);

  const respond = (id, action) => {
    setRequests(rs => rs.map(r => r.id === id ? {...r, status: action} : r));
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Hola, {user?.name?.split(" ")[0]} 👋</div>
          <div style={{color:"#6b7280",fontSize:14,marginTop:2}}>Panel de control</div>
        </div>
        <button style={s.btn} onClick={() => navigate("/publish")}>+ Publicar auto</button>
      </div>

      <div style={s.statsRow}>
        <div style={s.stat}>
          <div style={s.statNum}>{myCars.length}</div>
          <div style={s.statLabel}>Autos publicados</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>{requests.filter(r=>r.status==="pending").length}</div>
          <div style={s.statLabel}>Solicitudes pendientes</div>
        </div>
        <div style={s.stat}>
          <div style={s.statNum}>$0</div>
          <div style={s.statLabel}>Ganancias del mes</div>
        </div>
      </div>

      <div style={s.tabs}>
        {[["autos","Mis autos"],["solicitudes","Solicitudes"],["historial","Historial"]].map(([k,l]) => (
          <button key={k} style={{...s.tab,...(tab===k?s.tabActive:{})}}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "autos" && (
        myCars.length === 0 ? (
          <div style={s.empty}>
            <div style={{fontSize:48}}>🚗</div>
            <div style={{marginTop:12}}>Todavía no publicaste ningún auto.</div>
            <button style={{...s.btn,marginTop:16}}
              onClick={() => navigate("/publish")}>Publicar mi primer auto</button>
          </div>
        ) : myCars.map(car => (
          <div key={car.id} style={s.card}>
            <div style={{fontSize:36,marginRight:16}}>🚙</div>
            <div style={s.carInfo}>
              <div style={s.carName}>{car.brand} {car.model} {car.year}</div>
              <div style={s.carMeta}>{car.location} · ${Number(car.price_per_day).toLocaleString()}/día</div>
            </div>
            <span style={{...s.statusBadge,...(car.is_verified?s.verified:s.pending)}}>
              {car.is_verified ? "✓ Verificado" : "⏳ Pendiente verificación"}
            </span>
          </div>
        ))
      )}

      {tab === "solicitudes" && requests.map(r => (
        <div key={r.id} style={s.solicitud}>
          <div style={s.sol_header}>
            <div>
              <div style={s.sol_name}>{r.renter}
                {r.verified && <span style={{...s.statusBadge,...s.verified,marginLeft:8}}>✓ Verificado</span>}
              </div>
              <div style={s.sol_dates}>{r.car} · {r.dates}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:16,color:"#1d4ed8"}}>{r.price}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>★ {r.rating}</div>
            </div>
          </div>
          {r.status === "pending" ? (
            <div style={s.btnRow}>
              <button style={s.btnAccept} onClick={() => respond(r.id,"accepted")}>✓ Aceptar</button>
              <button style={s.btnReject} onClick={() => respond(r.id,"rejected")}>✗ Rechazar</button>
            </div>
          ) : (
            <div style={{marginTop:8,fontSize:13,fontWeight:600,
              color: r.status==="accepted" ? "#16a34a" : "#dc2626"}}>
              {r.status === "accepted" ? "✓ Aceptada" : "✗ Rechazada"}
            </div>
          )}
        </div>
      ))}

      {tab === "historial" && (
        <div style={s.empty}>
          <div style={{fontSize:48}}>📋</div>
          <div style={{marginTop:12}}>El historial de alquileres aparecerá acá.</div>
        </div>
      )}
    </div>
  );
}
