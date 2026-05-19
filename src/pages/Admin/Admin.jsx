import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  adminGetListings, adminDeleteListing,
  adminGetUsers, adminDeleteUser, adminUpdateUserRole,
} from "../../services/api";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6", flexWrap: "wrap" },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent" },
  tabActive: { color: "#2563eb", borderBottom: "3px solid #2563eb" },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, border: "1px solid #f3f4f6" },
  carImg: { width: 90, height: 66, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af", flexShrink: 0, overflow: "hidden" },
  btnDelete: { padding: "8px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSuspend: { padding: "8px 18px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnAdmin: { padding: "8px 18px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  alertBox: { background: "#eff6ff", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1e40af", marginBottom: 16 },
  empty: { textAlign: "center", padding: "40px 0", color: "#9ca3af" },
  accessDenied: { textAlign: "center", padding: "80px 24px" },
  badge: { padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [alert, setAlert] = useState("");

  // Fix: role is "ADMIN" (uppercase) from Prisma enum
  if (!user || user.role !== "ADMIN") {
    return (
      <div style={s.accessDenied}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Acceso restringido</div>
        <div style={{ color: "#6b7280", marginBottom: 24 }}>No tenés permisos para ver esta página.</div>
        <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          onClick={() => navigate("/")}>Volver al inicio</button>
      </div>
    );
  }

  const showAlert = (msg) => { setAlert(msg); setTimeout(() => setAlert(""), 4000); };

  useEffect(() => {
    if (tab === "listings") {
      setLoadingListings(true);
      adminGetListings()
        .then(data => setListings(data || []))
        .catch(() => showAlert("Error al cargar publicaciones"))
        .finally(() => setLoadingListings(false));
    }
    if (tab === "users") {
      setLoadingUsers(true);
      adminGetUsers()
        .then(data => setUsers(data || []))
        .catch(() => showAlert("Error al cargar usuarios"))
        .finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  const handleDeleteListing = async (id, label) => {
    if (!confirm(`¿Eliminar permanentemente "${label}"? Esta acción no se puede deshacer.`)) return;
    try {
      await adminDeleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      showAlert(`Publicación "${label}" eliminada de la base de datos.`);
    } catch (err) {
      showAlert("Error al eliminar: " + (err.message || ""));
    }
  };

  const handleDeleteUser = async (id, name) => {
  if (!confirm(`¿Eliminar permanentemente a "${name}" y todos sus datos? Esta acción no se puede deshacer.`)) return;
  try {
    await adminDeleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    showAlert(`Usuario "${name}" eliminado permanentemente.`);
  } catch (err) {
    showAlert("Error: " + (err.message || ""));
  }
};

  const handleMakeAdmin = async (id, name) => {
    if (!confirm(`¿Dar rol ADMIN a "${name}"?`)) return;
    try {
      await adminUpdateUserRole(id, "ADMIN");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: "ADMIN" } : u));
      showAlert(`${name} ahora es ADMIN.`);
    } catch (err) {
      showAlert("Error: " + (err.message || ""));
    }
  };

  const statusColor = (status) => {
    if (status === "ACTIVE") return { background: "#dcfce7", color: "#166534" };
    if (status === "SUSPENDED") return { background: "#fef9c3", color: "#854d0e" };
    if (status === "DELETED") return { background: "#fee2e2", color: "#991b1b" };
    return { background: "#f3f4f6", color: "#374151" };
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Panel de administración</div>
          <div style={s.sub}>Moderación y gestión de la plataforma</div>
        </div>
      </div>

      {alert && <div style={s.alertBox}>{alert}</div>}

      <div style={s.tabs}>
        {[
          ["listings", "Publicaciones"],
          ["users", "Usuarios"],
        ].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* LISTINGS TAB */}
      {tab === "listings" && (
        loadingListings ? (
          <div style={s.empty}>Cargando...</div>
        ) : listings.length === 0 ? (
          <div style={s.empty}>No hay publicaciones.</div>
        ) : listings.map(listing => {
          const v = listing.vehicle || {};
          const owner = listing.owner || {};
          const label = `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim();
          const ownerName = owner.firstName ? `${owner.firstName} ${owner.lastName}` : owner.email || "—";
          const statusColors = {
            ACTIVE: { background: "#dcfce7", color: "#166534" },
            DRAFT: { background: "#f3f4f6", color: "#374151" },
            PAUSED: { background: "#fef9c3", color: "#854d0e" },
            DELETED: { background: "#fee2e2", color: "#991b1b" },
          };
          return (
            <div key={listing.id} style={{ ...s.card, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={s.carImg}>
                {listing.photos?.length > 0
                  ? <img src={listing.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "Sin foto"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{label || listing.title}</span>
                  <span style={{ ...s.badge, ...(statusColors[listing.status] || {}) }}>{listing.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                  {listing.locationText} · ${Number(listing.pricePerDay).toLocaleString()}/día
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                  Publicado por <strong>{ownerName}</strong> · {new Date(listing.createdAt).toLocaleDateString("es-AR")}
                </div>
                <div style={s.btnRow}>
                  <button style={s.btnDelete}
                    onClick={() => handleDeleteListing(listing.id, label || listing.title)}>
                    Eliminar permanentemente
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        loadingUsers ? (
          <div style={s.empty}>Cargando...</div>
        ) : users.length === 0 ? (
          <div style={s.empty}>No hay usuarios.</div>
        ) : users.map(u => (
          <div key={u.id} style={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#2563eb", fontSize: 16 }}>
                {(u.firstName?.[0] || u.email[0]).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                  {u.firstName} {u.lastName}
                  {u.role === "ADMIN" && (
                    <span style={{ marginLeft: 8, ...s.badge, background: "#ede9fe", color: "#6d28d9" }}>ADMIN</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{u.email}</div>
              </div>
              <span style={{ ...s.badge, ...statusColor(u.status) }}>{u.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
              Registrado: {new Date(u.createdAt).toLocaleDateString("es-AR")}
            </div>
            <div style={s.btnRow}>
             {u.id !== user.id && (
  <button style={s.btnDelete}
    onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}>
    Eliminar usuario
  </button>
)}
              {u.role !== "ADMIN" && (
                <button style={s.btnAdmin}
                  onClick={() => handleMakeAdmin(u.id, `${u.firstName} ${u.lastName}`)}>
                  Hacer admin
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}