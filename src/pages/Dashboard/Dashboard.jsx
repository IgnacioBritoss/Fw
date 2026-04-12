import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const s = {
  page: { maxWidth:900, margin:"0 auto", padding:"40px 24px" },
  pageMobile: { padding:"20px 16px" },
  header: { display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:28 },
  headerMobile: { display:"flex", justifyContent:"space-between",
    alignItems:"flex-start", marginBottom:20 },
  title: { fontSize:24, fontWeight:800, color:"#111827", letterSpacing:"-.5px" },
  titleMobile: { fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-.5px" },
  sub: { color:"#6b7280", fontSize:14, marginTop:2 },
  btn: { padding:"10px 20px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:8, fontSize:14, fontWeight:600,
    cursor:"pointer", whiteSpace:"nowrap" },
  btnMobile: { padding:"8px 14px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer", whiteSpace:"nowrap" },
  tabs: { display:"flex", gap:4, marginBottom:24,
    borderBottom:"2px solid #f3f4f6", overflowX:"auto" },
  tab: { padding:"10px 18px", fontSize:14, fontWeight:500,
    cursor:"pointer", border:"none", background:"transparent",
    color:"#6b7280", borderBottom:"3px solid transparent",
    whiteSpace:"nowrap" },
  tabMobile: { padding:"8px 12px", fontSize:13, fontWeight:500,
    cursor:"pointer", border:"none", background:"transparent",
    color:"#6b7280", borderBottom:"3px solid transparent",
    whiteSpace:"nowrap" },
  tabActive: { color:"#1a4d2e", borderBottom:"3px solid #1a4d2e" },
  statsRow: { display:"grid", gridTemplateColumns:"repeat(3,1fr)",
    gap:14, marginBottom:28 },
  statsRowMobile: { display:"grid", gridTemplateColumns:"repeat(3,1fr)",
    gap:8, marginBottom:20 },
  stat: { background:"#fff", borderRadius:12, padding:"18px 20px",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", textAlign:"center",
    border:"1px solid #f3f4f6" },
  statMobile: { background:"#fff", borderRadius:10, padding:"12px 8px",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", textAlign:"center",
    border:"1px solid #f3f4f6" },
  statNum: { fontSize:28, fontWeight:800, color:"#1a4d2e" },
  statNumMobile: { fontSize:20, fontWeight:800, color:"#1a4d2e" },
  statLabel: { fontSize:13, color:"#6b7280", marginTop:4 },
  statLabelMobile: { fontSize:10, color:"#6b7280", marginTop:2 },
  card: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    display:"flex", justifyContent:"space-between", alignItems:"center",
    border:"1px solid #f3f4f6" },
  cardMobile: { background:"#fff", borderRadius:12, padding:14,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:10,
    border:"1px solid #f3f4f6" },
  carInfo: { flex:1 },
  carName: { fontWeight:600, fontSize:15, marginBottom:4 },
  carMeta: { color:"#6b7280", fontSize:13, marginBottom:6 },
  statusBadge: { display:"inline-block", padding:"4px 12px",
    borderRadius:20, fontSize:12, fontWeight:600 },
  statusBadgeMobile: { display:"inline-block", padding:"3px 8px",
    borderRadius:20, fontSize:11, fontWeight:600 },
  verified: { background:"#dcfce7", color:"#166534" },
  pending: { background:"#fef9c3", color:"#854d0e" },
  solicitud: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    border:"1px solid #f3f4f6" },
  solicitudMobile: { background:"#fff", borderRadius:12, padding:14,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:10,
    border:"1px solid #f3f4f6" },
  solHeader: { display:"flex", justifyContent:"space-between",
    alignItems:"flex-start", marginBottom:10 },
  solName: { fontWeight:600, fontSize:15 },
  solDates: { fontSize:13, color:"#6b7280" },
  btnRow: { display:"flex", gap:8, marginTop:12 },
  btnAccept: { padding:"8px 18px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer" },
  btnReject: { padding:"8px 18px", background:"transparent",
    border:"1.5px solid #fecaca", color:"#dc2626", borderRadius:8,
    fontSize:13, cursor:"pointer" },
  empty: { textAlign:"center", padding:"40px 0", color:"#9ca3af" },
};

const MOCK_REQUESTS = [
  { id:"req1", renter:"Martina González", car:"Toyota Corolla 2021",
    dates:"15-18 Jun 2025", price:"$28.500", rating:4.8,
    verified:true, status:"pending" },
  { id:"req2", renter:"Lucas Pérez", car:"Toyota Corolla 2021",
    dates:"22-24 Jun 2025", price:"$19.000", rating:4.2,
    verified:true, status:"pending" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("autos");
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]")
    .filter(c => c.owner_id === user?.id);

  const respond = (id, action) => {
    setRequests(rs => rs.map(r => r.id === id ? {...r, status:action} : r));
  };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={isMobile ? s.headerMobile : s.header}>
        <div>
          <div style={isMobile ? s.titleMobile : s.title}>
            Hola, {user?.name?.split(" ")[0]}
          </div>
          <div style={s.sub}>Panel de control</div>
        </div>
        <button style={isMobile ? s.btnMobile : s.btn}
          onClick={() => navigate("/publish")}>
          + Publicar
        </button>
      </div>

      <div style={isMobile ? s.statsRowMobile : s.statsRow}>
        {[
          [myCars.length, "Autos publicados"],
          [requests.filter(r => r.status === "pending").length, "Solicitudes"],
          ["$0", "Ganancias"],
        ].map(([num, label]) => (
          <div key={label} style={isMobile ? s.statMobile : s.stat}>
            <div style={isMobile ? s.statNumMobile : s.statNum}>{num}</div>
            <div style={isMobile ? s.statLabelMobile : s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.tabs}>
        {[["autos","Mis autos"],["solicitudes","Solicitudes"],
          ["historial","Historial"]].map(([k,l]) => (
          <button key={k}
            style={{
              ...(isMobile ? s.tabMobile : s.tab),
              ...(tab===k ? s.tabActive : {})
            }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "autos" && (
        myCars.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize:13, marginBottom:16, color:"#9ca3af" }}>
              Todavía no publicaste ningún auto.
            </div>
            <button style={s.btn} onClick={() => navigate("/publish")}>
              Publicar mi primer auto
            </button>
          </div>
        ) : myCars.map(car => (
          isMobile ? (
            <div key={car.id} style={s.cardMobile}>
              <div style={{ display:"flex", gap:12, alignItems:"center",
                marginBottom:8 }}>
                <div style={{ width:56, height:42, borderRadius:8,
                  overflow:"hidden", background:"#f3f4f6", flexShrink:0 }}>
                  {car.photos?.length > 0
                    ? <img src={car.photos[0]} alt=""
                        style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex",
                        alignItems:"center", justifyContent:"center",
                        color:"#9ca3af", fontSize:10 }}>Sin foto</div>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {car.brand} {car.model} {car.year}
                  </div>
                  <div style={{ color:"#6b7280", fontSize:12 }}>
                    {car.location}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center" }}>
                <div style={{ fontSize:13, color:"#1a4d2e", fontWeight:600 }}>
                  ${Number(car.price_per_day).toLocaleString()}/día
                </div>
                <span style={{
                  ...s.statusBadgeMobile,
                  ...(car.approved ? s.verified : s.pending)
                }}>
                  {car.approved ? "Verificado" : "Pendiente"}
                </span>
              </div>
            </div>
          ) : (
            <div key={car.id} style={s.card}>
              <div style={{ width:60, height:44, borderRadius:8,
                overflow:"hidden", background:"#f3f4f6",
                marginRight:16, flexShrink:0 }}>
                {car.photos?.length > 0
                  ? <img src={car.photos[0]} alt=""
                      style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <div style={{ width:"100%", height:"100%", display:"flex",
                      alignItems:"center", justifyContent:"center",
                      color:"#9ca3af", fontSize:11 }}>Sin foto</div>}
              </div>
              <div style={s.carInfo}>
                <div style={s.carName}>{car.brand} {car.model} {car.year}</div>
                <div style={s.carMeta}>
                  {car.location} · ${Number(car.price_per_day).toLocaleString()}/día
                </div>
              </div>
              <span style={{...s.statusBadge,
                ...(car.approved ? s.verified : s.pending)}}>
                {car.approved ? "Verificado" : "Pendiente verificación"}
              </span>
            </div>
          )
        ))
      )}

      {tab === "solicitudes" && requests.map(r => (
        <div key={r.id} style={isMobile ? s.solicitudMobile : s.solicitud}>
          <div style={s.solHeader}>
            <div>
              <div style={{ ...s.solName, fontSize: isMobile ? 14 : 15 }}>
                {r.renter}
                {r.verified && (
                  <span style={{...s.statusBadgeMobile,...s.verified,
                    marginLeft:8}}>Verificado</span>
                )}
              </div>
              <div style={{ ...s.solDates, fontSize: isMobile ? 12 : 13 }}>
                {r.car} · {r.dates}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:700, fontSize: isMobile ? 14 : 16,
                color:"#1a4d2e" }}>{r.price}</div>
              <div style={{ fontSize:12, color:"#6b7280" }}>
                {r.rating} pts
              </div>
            </div>
          </div>
          {r.status === "pending" ? (
            <div style={s.btnRow}>
              <button style={{ ...s.btnAccept,
                padding: isMobile ? "7px 14px" : "8px 18px",
                fontSize: isMobile ? 12 : 13 }}
                onClick={() => respond(r.id,"accepted")}>
                Aceptar
              </button>
              <button style={{ ...s.btnReject,
                padding: isMobile ? "7px 14px" : "8px 18px",
                fontSize: isMobile ? 12 : 13 }}
                onClick={() => respond(r.id,"rejected")}>
                Rechazar
              </button>
            </div>
          ) : (
            <div style={{ marginTop:8, fontSize:13, fontWeight:600,
              color: r.status==="accepted" ? "#16a34a" : "#dc2626" }}>
              {r.status === "accepted" ? "Aceptada" : "Rechazada"}
            </div>
          )}
        </div>
      ))}

      {tab === "historial" && (
        <div style={s.empty}>
          <div style={{ fontSize:13, color:"#9ca3af" }}>
            El historial de alquileres aparecerá acá.
          </div>
        </div>
      )}
    </div>
  );
}