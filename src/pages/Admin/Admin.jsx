import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const s = {
  page: { maxWidth:900, margin:"0 auto", padding:"40px 24px" },
  header: { display:"flex", justifyContent:"space-between",
    alignItems:"center", marginBottom:28 },
  title: { fontSize:24, fontWeight:800, color:"#111827",
    letterSpacing:"-.5px" },
  sub: { color:"#6b7280", fontSize:14, marginTop:2 },
  alertPill: { background:"#fef2f2", color:"#b91c1c", padding:"6px 14px",
    borderRadius:20, fontSize:12, fontWeight:600,
    border:"1px solid #fecaca" },
  tabs: { display:"flex", gap:4, marginBottom:24,
    borderBottom:"2px solid #f3f4f6", flexWrap:"wrap" },
  tab: { padding:"10px 18px", fontSize:14, fontWeight:500,
    cursor:"pointer", border:"none", background:"transparent",
    color:"#6b7280", borderBottom:"3px solid transparent" },
  tabActive: { color:"#1a4d2e", borderBottom:"3px solid #1a4d2e" },
  statsRow: { display:"grid", gridTemplateColumns:"repeat(4,1fr)",
    gap:14, marginBottom:28 },
  stat: { background:"#fff", borderRadius:12, padding:"16px 20px",
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", textAlign:"center",
    border:"1px solid #f3f4f6" },
  statNum: { fontSize:28, fontWeight:800 },
  statLabel: { fontSize:12, color:"#6b7280", marginTop:4 },
  card: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    border:"1px solid #f3f4f6" },
  cardHeader: { display:"flex", justifyContent:"space-between",
    alignItems:"flex-start", marginBottom:12 },
  typeBadge: { fontSize:11, fontWeight:600, padding:"2px 10px",
    borderRadius:20, marginBottom:6, display:"inline-block" },
  typeCar: { background:"#dbeafe", color:"#1e40af" },
  typeUser: { background:"#f3e8ff", color:"#7e22ce" },
  reason: { fontSize:15, fontWeight:700, color:"#111827", marginBottom:4 },
  detail: { fontSize:13, color:"#4b5563", lineHeight:1.6,
    background:"#f9fafb", borderRadius:8, padding:"10px 14px",
    marginBottom:12, fontStyle:"italic" },
  meta: { fontSize:12, color:"#9ca3af", marginBottom:12 },
  statusBadge: { padding:"4px 12px", borderRadius:20,
    fontSize:12, fontWeight:600 },
  pending: { background:"#fef9c3", color:"#854d0e" },
  resolved: { background:"#dcfce7", color:"#166534" },
  dismissed: { background:"#f3f4f6", color:"#6b7280" },
  banned: { background:"#fef2f2", color:"#b91c1c" },
  btnRow: { display:"flex", gap:8, flexWrap:"wrap" },
  btnResolve: { padding:"8px 18px", background:"#1a4d2e", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer" },
  btnDismiss: { padding:"8px 18px", background:"transparent",
    border:"1.5px solid #e5e7eb", color:"#374151", borderRadius:8,
    fontSize:13, cursor:"pointer" },
  btnSuspend: { padding:"8px 18px", background:"#dc2626", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer" },
  btnTakedown: { padding:"8px 18px", background:"#7c3aed", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer" },
  btnDelete: { padding:"8px 18px", background:"#dc2626", color:"#fff",
    border:"none", borderRadius:8, fontSize:13, fontWeight:600,
    cursor:"pointer" },
  carCard: { background:"#fff", borderRadius:12, padding:20,
    boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:14,
    display:"flex", gap:16, alignItems:"flex-start",
    border:"1px solid #f3f4f6" },
  carImg: { width:90, height:66, borderRadius:8, background:"#f3f4f6",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:12, color:"#9ca3af", flexShrink:0, overflow:"hidden" },
  carInfo: { flex:1 },
  carTitle: { fontWeight:700, fontSize:15, marginBottom:4, color:"#111827" },
  carMeta: { fontSize:13, color:"#6b7280", marginBottom:6 },
  alertBox: { background:"#f0fdf4", border:"1px solid #86efac",
    borderRadius:8, padding:"10px 14px", fontSize:13,
    color:"#166534", marginBottom:16 },
  empty: { textAlign:"center", padding:"40px 0", color:"#9ca3af" },
  accessDenied: { textAlign:"center", padding:"80px 24px" },
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("reportes-usuarios");
  const [reports, setReports] = useState([]);
  const [pendingCars, setPendingCars] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [alert, setAlert] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("fw_reports") || "[]");
    setReports(stored);
    const myCars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    setPendingCars(myCars.filter(c => !c.approved && !c.rejected));
    const all = [
      ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
      ...myCars,
    ];
    setAllCars(all);
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div style={s.accessDenied}>
        <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>
          Acceso restringido
        </div>
        <div style={{ color:"#6b7280", marginBottom:24 }}>
          No tenés permisos para ver esta página.
        </div>
        <button style={{ padding:"10px 24px", background:"#1a4d2e",
          color:"#fff", border:"none", borderRadius:8,
          cursor:"pointer", fontWeight:600 }}
          onClick={() => navigate("/")}>Volver al inicio</button>
      </div>
    );
  }

  const showAlert = (msg) => {
    setAlert(msg);
    setTimeout(() => setAlert(""), 4000);
  };

  const saveReports = (updated) => {
    setReports(updated);
    localStorage.setItem("fw_reports", JSON.stringify(updated));
  };

  const updateReport = (id, status) => {
    saveReports(reports.map(r => r.id === id ? { ...r, status } : r));
  };

  const suspendUser = (report) => {
    saveReports(reports.map(r =>
      r.id === report.id ? { ...r, status:"banned" } : r));
    const users = JSON.parse(localStorage.getItem("fw_users") || "[]");
    localStorage.setItem("fw_users", JSON.stringify(
      users.map(u => u.name === report.target ? { ...u, suspended:true } : u)
    ));
    showAlert(`Usuario "${report.target}" suspendido correctamente.`);
  };

  const takeDownCar = (report) => {
    saveReports(reports.map(r =>
      r.id === report.id ? { ...r, status:"banned" } : r));
    const cars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    localStorage.setItem("fw_my_cars", JSON.stringify(
      cars.map(c => `${c.brand} ${c.model} ${c.year}` === report.target
        ? { ...c, available:false, banned:true } : c)
    ));
    showAlert(`Publicación "${report.target}" dada de baja.`);
  };

  const approveCar = (carId) => {
    const cars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    const updated = cars.map(c =>
      c.id === carId ? { ...c, approved:true, is_verified:true } : c);
    localStorage.setItem("fw_my_cars", JSON.stringify(updated));
    setPendingCars(updated.filter(c => !c.approved && !c.rejected));
    setAllCars([
      ...JSON.parse(localStorage.getItem("fw_all_cars") || "[]"),
      ...updated,
    ]);
    showAlert("Publicación aprobada. Ya es visible para los conductores.");
  };

  const rejectCar = (carId) => {
    const cars = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    const updated = cars.map(c =>
      c.id === carId ? { ...c, rejected:true, available:false } : c);
    localStorage.setItem("fw_my_cars", JSON.stringify(updated));
    setPendingCars(updated.filter(c => !c.approved && !c.rejected));
    showAlert("Publicación rechazada.");
  };

  const deleteCar = (carId, carName) => {
    const allC = JSON.parse(localStorage.getItem("fw_all_cars") || "[]");
    localStorage.setItem("fw_all_cars", JSON.stringify(
      allC.filter(c => c.id !== carId)
    ));
    const myC = JSON.parse(localStorage.getItem("fw_my_cars") || "[]");
    localStorage.setItem("fw_my_cars", JSON.stringify(
      myC.filter(c => c.id !== carId)
    ));
    setAllCars(prev => prev.filter(c => c.id !== carId));
    setPendingCars(prev => prev.filter(c => c.id !== carId));
    showAlert(`Auto "${carName}" eliminado de la plataforma.`);
  };

  const userReports = reports.filter(r => r.targetType === "user");
  const carReports = reports.filter(r => r.targetType === "car");
  const pendingUserReports = userReports.filter(r => r.status === "pending").length;
  const pendingCarReports = carReports.filter(r => r.status === "pending").length;

  const ReportCard = ({ r }) => (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div>
          <span style={{ ...s.typeBadge,
            ...(r.targetType === "car" ? s.typeCar : s.typeUser) }}>
            {r.targetType === "car" ? "Publicación" : "Usuario"}
          </span>
          <div style={s.reason}>{r.reason}</div>
          <div style={s.meta}>
            Reportado por <strong>{r.reporter_name}</strong> ·{" "}
            {new Date(r.created_at).toLocaleDateString("es-AR", {
              day:"numeric", month:"long", year:"numeric"
            })}
            {r.target && <> · Objetivo: <strong>{r.target}</strong></>}
          </div>
        </div>
        <span style={{ ...s.statusBadge, ...s[r.status] }}>
          {r.status === "pending" ? "Pendiente"
            : r.status === "resolved" ? "Resuelto"
            : r.status === "dismissed" ? "Descartado"
            : "Sancionado"}
        </span>
      </div>
      <div style={s.detail}>"{r.detail}"</div>
      {r.status === "pending" && (
        <div style={s.btnRow}>
          <button style={s.btnResolve}
            onClick={() => updateReport(r.id, "resolved")}>
            Resolver
          </button>
          <button style={s.btnDismiss}
            onClick={() => updateReport(r.id, "dismissed")}>
            Descartar
          </button>
          {r.targetType === "user" && (
            <button style={s.btnSuspend} onClick={() => suspendUser(r)}>
              Suspender usuario
            </button>
          )}
          {r.targetType === "car" && (
            <button style={s.btnTakedown} onClick={() => takeDownCar(r)}>
              Dar de baja publicación
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Panel de administración</div>
          <div style={s.sub}>Moderación y gestión de la plataforma</div>
        </div>
        {(pendingUserReports + pendingCarReports + pendingCars.length) > 0 && (
          <span style={s.alertPill}>
            {pendingUserReports + pendingCarReports + pendingCars.length} pendientes
          </span>
        )}
      </div>

      {alert && <div style={s.alertBox}>{alert}</div>}

      <div style={s.statsRow}>
        <div style={s.stat}>
          <div style={{ ...s.statNum, color:"#7e22ce" }}>{pendingUserReports}</div>
          <div style={s.statLabel}>Reportes usuarios</div>
        </div>
        <div style={s.stat}>
          <div style={{ ...s.statNum, color:"#1e40af" }}>{pendingCarReports}</div>
          <div style={s.statLabel}>Reportes publicaciones</div>
        </div>
        <div style={s.stat}>
          <div style={{ ...s.statNum, color:"#854d0e" }}>{pendingCars.length}</div>
          <div style={s.statLabel}>Autos pendientes</div>
        </div>
        <div style={s.stat}>
          <div style={{ ...s.statNum, color:"#374151" }}>{allCars.length}</div>
          <div style={s.statLabel}>Total en plataforma</div>
        </div>
      </div>

      <div style={s.tabs}>
        {[
          ["reportes-usuarios", `Usuarios (${pendingUserReports})`],
          ["reportes-publicaciones", `Publicaciones (${pendingCarReports})`],
          ["publicaciones-pendientes", `Pendientes (${pendingCars.length})`],
          ["todos-los-autos", `Todos los autos (${allCars.length})`],
        ].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "reportes-usuarios" && (
        userReports.length === 0 ? (
          <div style={s.empty}>No hay reportes de usuarios.</div>
        ) : userReports.map(r => <ReportCard key={r.id} r={r} />)
      )}

      {tab === "reportes-publicaciones" && (
        carReports.length === 0 ? (
          <div style={s.empty}>No hay reportes de publicaciones.</div>
        ) : carReports.map(r => <ReportCard key={r.id} r={r} />)
      )}

      {tab === "publicaciones-pendientes" && (
        pendingCars.length === 0 ? (
          <div style={s.empty}>No hay publicaciones pendientes.</div>
        ) : pendingCars.map(car => (
          <div key={car.id} style={s.carCard}>
            <div style={s.carImg}>
              {car.photos?.length > 0
                ? <img src={car.photos[0]} alt=""
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : "Sin foto"}
            </div>
            <div style={s.carInfo}>
              <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
              <div style={s.carMeta}>
                {car.location} · ${Number(car.price_per_day).toLocaleString()}/día
                · {car.transmission} · {car.fuel}
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:10 }}>
                Publicado por <strong>{car.owner_name}</strong> ·{" "}
                {new Date(car.created_at).toLocaleDateString("es-AR", {
                  day:"numeric", month:"long", year:"numeric"
                })}
              </div>
              {car.description && (
                <div style={{ fontSize:13, color:"#6b7280", marginBottom:12,
                  lineHeight:1.5 }}>{car.description}</div>
              )}
              <div style={s.btnRow}>
                <button style={s.btnResolve} onClick={() => approveCar(car.id)}>
                  Aprobar publicación
                </button>
                <button style={s.btnSuspend} onClick={() => rejectCar(car.id)}>
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {tab === "todos-los-autos" && (
        allCars.length === 0 ? (
          <div style={s.empty}>No hay autos en la plataforma.</div>
        ) : allCars.map(car => (
          <div key={car.id} style={s.carCard}>
            <div style={s.carImg}>
              {car.photos?.length > 0
                ? <img src={car.photos[0]} alt=""
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : "Sin foto"}
            </div>
            <div style={s.carInfo}>
              <div style={s.carTitle}>{car.brand} {car.model} {car.year}</div>
              <div style={s.carMeta}>
                {car.location} · ${Number(car.price_per_day).toLocaleString()}/día
              </div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:10 }}>
                {car.owner_name
                  ? <>Publicado por <strong>{car.owner_name}</strong></>
                  : "Auto del sistema"}
                {car.banned && (
                  <span style={{ color:"#dc2626", marginLeft:8,
                    fontWeight:600 }}>· Dado de baja</span>
                )}
                {car.approved && (
                  <span style={{ color:"#16a34a", marginLeft:8,
                    fontWeight:600 }}>· Aprobado</span>
                )}
              </div>
              <div style={s.btnRow}>
                <button style={s.btnDelete}
                  onClick={() => deleteCar(car.id,
                    `${car.brand} ${car.model} ${car.year}`)}>
                  Eliminar de la plataforma
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}