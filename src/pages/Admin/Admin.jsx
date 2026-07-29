// ============================================================================
//  Admin — Panel de ADMINISTRACIÓN (moderación de la plataforma)
// ----------------------------------------------------------------------------
//  Solo accesible para usuarios con rol "ADMIN" (si no, muestra "Acceso
//  restringido"). Tiene dos pestañas:
//   - "Publicaciones": ver y eliminar/recuperar avisos.
//   - "Usuarios": ver, suspender o eliminar cuentas.
//  Las acciones sensibles piden confirmación con un modal antes de ejecutarse.
// ============================================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  adminGetListings, adminUpdateListingStatus,
  adminGetUsers, adminUpdateUserStatus,
} from "../../services/api";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6" },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent" },
  tabActive: { color: "#2563eb", borderBottom: "3px solid #2563eb" },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, border: "1px solid #f3f4f6" },
  carImg: { width: 90, height: 66, borderRadius: 8, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af", flexShrink: 0, overflow: "hidden" },
  btnDelete: { padding: "8px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSuspend: { padding: "8px 18px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnRestore: { padding: "8px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  alertOk: { background: "#eff6ff", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1e40af", marginBottom: 16 },
  alertErr: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 16 },
  empty: { textAlign: "center", padding: "40px 0", color: "#9ca3af" },
  accessDenied: { textAlign: "center", padding: "80px 24px" },
  badge: { padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};

const listingStatusColors = {
  ACTIVE: { background: "#dcfce7", color: "#166534" },
  DRAFT: { background: "#f3f4f6", color: "#374151" },
  PAUSED: { background: "#fef9c3", color: "#854d0e" },
  DELETED: { background: "#fee2e2", color: "#991b1b" },
};

const userStatusColor = (status) => {
  if (status === "ACTIVE") return { background: "#dcfce7", color: "#166534" };
  if (status === "SUSPENDED") return { background: "#fef9c3", color: "#854d0e" };
  if (status === "DELETED") return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#f3f4f6", color: "#374151" };
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [alert, setAlert] = useState({ msg: "", type: "ok" });
  const [expandedUser, setExpandedUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Portón de seguridad: si no es admin, no muestra el panel.
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

  // Muestra un cartel de aviso (éxito o error) que se oculta solo a los 4s.
  const showAlert = (msg, type = "ok") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "ok" }), 4000);
  };

  // Al cambiar de pestaña, carga las publicaciones o los usuarios según corresponda.
  useEffect(() => {
    if (tab === "listings") {
      setLoadingListings(true);
      adminGetListings()
        .then(data => setListings(data || []))
        .catch(() => showAlert("Error al cargar publicaciones", "err"))
        .finally(() => setLoadingListings(false));
    }
    if (tab === "users") {
      setLoadingUsers(true);
      adminGetUsers()
        .then(data => setUsers(data || []))
        .catch(() => showAlert("Error al cargar usuarios", "err"))
        .finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  // Acciones reales: cambian el estado en el backend y actualizan la lista local.
  const doDeleteListing = async (id, label) => {
    try {
      await adminUpdateListingStatus(id, "DELETED");
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "DELETED" } : l));
      showAlert(`Publicación "${label}" eliminada.`);
    } catch (err) { showAlert("Error: " + (err.message || ""), "err"); }
  };
  const handleRestoreListing = async (id, label) => {
    try {
      await adminUpdateListingStatus(id, "ACTIVE");
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "ACTIVE" } : l));
      showAlert(`Publicación "${label}" recuperada.`);
    } catch (err) { showAlert("Error: " + (err.message || ""), "err"); }
  };
  const doSuspendUser = async (id, name) => {
    try {
      await adminUpdateUserStatus(id, "SUSPENDED");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "SUSPENDED" } : u));
      showAlert(`Usuario "${name}" suspendido.`);
    } catch (err) { showAlert("Error: " + (err.message || ""), "err"); }
  };
  const doDeleteUser = async (id, name) => {
    try {
      await adminUpdateUserStatus(id, "DELETED");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "DELETED" } : u));
      showAlert(`Usuario "${name}" eliminado.`);
    } catch (err) { showAlert("Error: " + (err.message || ""), "err"); }
  };

  // Abren el modal de confirmación (en vez de alert nativo). Guardan la acción
  // a ejecutar; recién se corre cuando el usuario confirma en el modal.
  const handleDeleteListing = (id, label) => setConfirmModal({ title: "Eliminar publicación", msg: `¿Eliminar "${label}"? Dejará de verse en la plataforma. Podés recuperarla después desde acá.`, confirmLabel: "Eliminar", action: () => doDeleteListing(id, label) });
  const handleSuspendUser = (id, name) => setConfirmModal({ title: "Suspender usuario", msg: `¿Querés suspender a "${name}"? No podrá operar hasta reactivarlo.`, confirmLabel: "Suspender", action: () => doSuspendUser(id, name) });
  const handleDeleteUser = (id, name) => setConfirmModal({ title: "Eliminar usuario", msg: `¿Querés eliminar a "${name}"? Esta acción es delicada.`, confirmLabel: "Eliminar", action: () => doDeleteUser(id, name) });

  // Ejecuta la acción guardada en el modal y lo cierra.
  const runConfirm = async () => { const m = confirmModal; setConfirmModal(null); if (m?.action) await m.action(); };

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 28 }}>
        <div style={s.title}>Panel de administración</div>
        <div style={s.sub}>Moderación y gestión de la plataforma</div>
      </div>

      {alert.msg && <div style={alert.type === "err" ? s.alertErr : s.alertOk}>{alert.msg}</div>}

      <div style={s.tabs}>
        {[["listings", "Publicaciones"], ["users", "Usuarios"]].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* PUBLICACIONES */}
      {tab === "listings" && (
        loadingListings ? <div style={s.empty}>Cargando...</div>
        : listings.length === 0 ? <div style={s.empty}>No hay publicaciones.</div>
        : listings.map(listing => {
          const v = listing.vehicle || {};
          const label = `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim() || listing.title;
          return (
            <div key={listing.id}
              style={{ ...s.card, display: "flex", gap: 16, alignItems: "flex-start", cursor: "pointer" }}
              onClick={() => navigate(`/cars/${listing.id}`)}>
              <div style={s.carImg}>
                {listing.photos?.length > 0
                  ? <img src={listing.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "Sin foto"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{label}</span>
                  <span style={{ ...s.badge, ...(listingStatusColors[listing.status] || {}) }}>{listing.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                  {listing.locationText} · ${Number(listing.pricePerDay).toLocaleString()}/día
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                  {new Date(listing.createdAt).toLocaleDateString("es-AR")}
                </div>
                <div style={s.btnRow}>
                  {listing.status !== "DELETED" ? (
                    <button style={s.btnDelete}
                      onClick={e => { e.stopPropagation(); handleDeleteListing(listing.id, label); }}>
                      Eliminar
                    </button>
                  ) : (
                    <button style={s.btnRestore}
                      onClick={e => { e.stopPropagation(); handleRestoreListing(listing.id, label); }}>
                      ↻ Recuperar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* USUARIOS */}
      {tab === "users" && (
        loadingUsers ? <div style={s.empty}>Cargando...</div>
        : users.length === 0 ? <div style={s.empty}>No hay usuarios.</div>
        : users.map(u => (
          <div key={u.id} style={{ ...s.card, cursor: "pointer" }}
            onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <span style={{ ...s.badge, ...userStatusColor(u.status) }}>{u.status}</span>
            </div>

            {expandedUser === u.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280", display: "flex", flexDirection: "column", gap: 4 }}>
                <div><strong>ID:</strong> {u.id}</div>
                <div><strong>Teléfono:</strong> {u.phone || "—"}</div>
                <div><strong>Registrado:</strong> {new Date(u.createdAt).toLocaleDateString("es-AR")}</div>
                {u.id !== user.id && u.status !== "DELETED" && (
                  <div style={{ ...s.btnRow, marginTop: 8 }}>
                    {u.status !== "SUSPENDED" && (
                      <button style={s.btnSuspend}
                        onClick={e => { e.stopPropagation(); handleSuspendUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                        Suspender
                      </button>
                    )}
                    <button style={s.btnDelete}
                      onClick={e => { e.stopPropagation(); handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {confirmModal && (
        <div onClick={() => setConfirmModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3.5 21 19H3l9-15.5z" stroke="#dc2626" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10v4M12 16.5h.01" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>{confirmModal.title}</div>
            <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>{confirmModal.msg}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: "12px", background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={runConfirm}
                style={{ flex: 1, padding: "12px", background: "#dc2626", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}