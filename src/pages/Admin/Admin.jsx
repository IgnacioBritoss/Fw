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
<<<<<<< HEAD
=======
import { useIsMobile } from "../../hooks/useIsMobile";
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
import {
  adminGetListings, adminUpdateListingStatus,
  adminGetUsers, adminUpdateUserStatus,
  getAdminReports, resolveReport,
<<<<<<< HEAD
  adminGetVerifications, adminReviewVerification, getAiHealth,
} from "../../services/api";
import IdentityDocuments from "../../components/IdentityDocuments";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6" },
  tab: { padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent" },
=======
  adminGetVerifications, adminGetVerificationDocuments,
  adminReviewVerification, getAiHealth, probeAiModels,
} from "../../services/api";
import IdentityDocuments from "../../components/IdentityDocuments";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import Avatar from "../../components/Avatar";
import { initialsOf } from "../../services/people";
import { shortDate } from "../../i18n/dates";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { maxWidth: 900, margin: "0 auto", padding: "20px 14px" },
  title: { fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-.5px" },
  sub: { color: "#6b7280", fontSize: 14, marginTop: 2 },
  tabs: {
    display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f3f4f6",
    overflowX: "auto", overflowY: "hidden",
    // Sin esto, en Chrome/Safari los hijos con flex se encogen y el texto se
    // parte en dos renglones en vez de dejar desplazar la fila.
    flexWrap: "nowrap", WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  },
  tab: { padding: "10px 14px", fontSize: 13.5, whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "#6b7280", borderBottom: "3px solid transparent" },
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
  const { t: tr, lang } = useI18n();
  const { isMobile } = useIsMobile();
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
  // Reportes de las personas. Antes se guardaban en el navegador de quien
  // reportaba y no llegaban a ninguna parte.
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [openReports, setOpenReports] = useState(0);
  // Verificaciones de identidad: las fotos del DNI y la licencia solo se ven acá
  // y en el perfil de cada dueño. `aiHealth` explica por qué la revisión
  // automática no decidió, cuando no decidió.
  const [verifications, setVerifications] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [aiHealth, setAiHealth] = useState(null);
<<<<<<< HEAD
=======
  // Fotos de identidad firmadas, por solicitud. Los archivos son privados: la URL
  // guardada devuelve 401, así que hay que pedirlas al backend una por una.
  const [docsFirmados, setDocsFirmados] = useState({});
  const [cargandoDocs, setCargandoDocs] = useState(null);
  const [probed, setProbed] = useState(null);
  const [probing, setProbing] = useState(false);
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

  // Portón de seguridad: si no es admin, no muestra el panel.
  if (!user || user.role !== "ADMIN") {
    return (
      <div style={s.accessDenied}>
<<<<<<< HEAD
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Acceso restringido</div>
        <div style={{ color: "#6b7280", marginBottom: 24 }}>No tenés permisos para ver esta página.</div>
        <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          onClick={() => navigate("/")}>Volver al inicio</button>
=======
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{tr("admin.denied")}</div>
        <div style={{ color: "#6b7280", marginBottom: 24 }}>{tr("admin.deniedNote")}</div>
        <button style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          onClick={() => navigate("/")}>{tr("common.goHome")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </div>
    );
  }

  // Muestra un cartel de aviso (éxito o error) que se oculta solo a los 4s.
  const showAlert = (msg, type = "ok") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "ok" }), 4000);
  };

<<<<<<< HEAD
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
    if (tab === "reports") {
      setLoadingReports(true);
      getAdminReports()
        .then(data => setReports(Array.isArray(data) ? data : []))
        .catch(() => showAlert("Error al cargar reportes", "err"))
        .finally(() => setLoadingReports(false));
    }
    if (tab === "verifications") {
      setLoadingVerifications(true);
      adminGetVerifications()
        .then(data => setVerifications(Array.isArray(data) ? data : []))
        .catch(() => showAlert("Error al cargar las verificaciones", "err"))
        .finally(() => setLoadingVerifications(false));
      // Si la IA está caída, las solicitudes quedan esperando a un humano: hay
      // que poder ver el motivo real acá y no en los logs del deploy.
      getAiHealth().then(setAiHealth).catch(() => setAiHealth(null));
    }

    // Cantidad sin resolver, para el número al lado de la pestaña. Se pide en
    // cada cambio de pestaña, que es cuando puede haber cambiado.
    getAdminReports("OPEN")
      .then(data => setOpenReports(Array.isArray(data) ? data.length : 0))
      .catch(() => setOpenReports(0));
    adminGetVerifications()
      .then(data => setPendingVerifications(
        (Array.isArray(data) ? data : []).filter(v => v.status === "ID_SUBMITTED").length,
      ))
      .catch(() => setPendingVerifications(0));
  }, [tab]);

  /** Aprueba o rechaza una verificación y refresca la lista. */
  const doReviewVerification = async (id, status, label) => {
    try {
      await adminReviewVerification(id, status);
      const fresh = await adminGetVerifications();
      setVerifications(Array.isArray(fresh) ? fresh : []);
      setPendingVerifications(
        (Array.isArray(fresh) ? fresh : []).filter(v => v.status === "ID_SUBMITTED").length,
      );
      showAlert(label);
    } catch (err) {
      showAlert(err.message || "No se pudo registrar la decisión", "err");
    }
  };

  /** Resuelve un reporte y refresca la lista. */
  const doResolveReport = async (id, action, label) => {
    try {
      await resolveReport(id, action);
      setReports(prev => prev.filter(r => r.id !== id));
      setOpenReports(prev => Math.max(0, prev - 1));
      showAlert(label);
    } catch (err) {
      showAlert(err.message || "No pudimos resolver el reporte", "err");
    }
  };

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

=======
  /** Prueba cada modelo de visión y muestra cuál contesta. Gasta cuota: a pedido. */
  const runProbe = async () => {
    setProbing(true);
    try {
      const data = await probeAiModels();
      setAiHealth(data);
      setProbed(Array.isArray(data?.probed) ? data.probed : []);
    } catch (err) {
      showAlert(err.message || tr("admin.errModels"), "err");
    } finally {
      setProbing(false);
    }
  };

  // Al cambiar de pestaña, carga las publicaciones o los usuarios según corresponda.
  useEffect(() => {
    if (tab === "listings") {
      setLoadingListings(true);
      adminGetListings()
        .then(data => setListings(data || []))
        .catch(() => showAlert(tr("admin.errListings"), "err"))
        .finally(() => setLoadingListings(false));
    }
    if (tab === "users") {
      setLoadingUsers(true);
      adminGetUsers()
        .then(data => setUsers(data || []))
        .catch(() => showAlert(tr("admin.errUsers"), "err"))
        .finally(() => setLoadingUsers(false));
    }
    if (tab === "reports") {
      setLoadingReports(true);
      getAdminReports()
        .then(data => setReports(Array.isArray(data) ? data : []))
        .catch(() => showAlert(tr("admin.errReports"), "err"))
        .finally(() => setLoadingReports(false));
    }
    if (tab === "verifications") {
      setLoadingVerifications(true);
      adminGetVerifications()
        .then(data => setVerifications(Array.isArray(data) ? data : []))
        .catch(() => showAlert(tr("admin.errVerifications"), "err"))
        .finally(() => setLoadingVerifications(false));
      // Si la IA está caída, las solicitudes quedan esperando a un humano: hay
      // que poder ver el motivo real acá y no en los logs del deploy.
      getAiHealth().then(setAiHealth).catch(() => setAiHealth(null));
    }

    // Cantidad sin resolver, para el número al lado de la pestaña. Se pide en
    // cada cambio de pestaña, que es cuando puede haber cambiado.
    getAdminReports("OPEN")
      .then(data => setOpenReports(Array.isArray(data) ? data.length : 0))
      .catch(() => setOpenReports(0));
    adminGetVerifications()
      .then(data => setPendingVerifications(
        (Array.isArray(data) ? data : []).filter(v => v.status === "ID_SUBMITTED").length,
      ))
      .catch(() => setPendingVerifications(0));
  }, [tab, tr]);

  /** Aprueba o rechaza una verificación y refresca la lista. */
  const doReviewVerification = async (id, status, label) => {
    try {
      await adminReviewVerification(id, status);
      const fresh = await adminGetVerifications();
      setVerifications(Array.isArray(fresh) ? fresh : []);
      setPendingVerifications(
        (Array.isArray(fresh) ? fresh : []).filter(v => v.status === "ID_SUBMITTED").length,
      );
      showAlert(label);
    } catch (err) {
      showAlert(err.message || tr("admin.errDecision"), "err");
    }
  };

  /**
   * Pide las fotos de una solicitud firmadas y con vencimiento.
   *
   * No se piden solas al abrir la pestaña a propósito: cada acceso a los
   * documentos de alguien queda registrado en la auditoría, así que mirar la
   * lista no tiene que significar mirar el DNI de todos.
   */
  const verDocumentos = async (id) => {
    setCargandoDocs(id);
    try {
      const data = await adminGetVerificationDocuments(id);
      setDocsFirmados(prev => ({ ...prev, [id]: data?.documents || {} }));
    } catch (err) {
      showAlert(err.message || tr("admin.errPhotos"), "err");
    } finally {
      setCargandoDocs(null);
    }
  };

  /** Resuelve un reporte y refresca la lista. */
  const doResolveReport = async (id, action, label) => {
    try {
      await resolveReport(id, action);
      setReports(prev => prev.filter(r => r.id !== id));
      setOpenReports(prev => Math.max(0, prev - 1));
      showAlert(label);
    } catch (err) {
      showAlert(err.message || tr("admin.errResolve"), "err");
    }
  };

  // Acciones reales: cambian el estado en el backend y actualizan la lista local.
  const doDeleteListing = async (id, label) => {
    try {
      await adminUpdateListingStatus(id, "DELETED");
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "DELETED" } : l));
      showAlert(tr("admin.listingDeleted", { label }));
    } catch (err) { showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err"); }
  };
  const handleRestoreListing = async (id, label) => {
    try {
      await adminUpdateListingStatus(id, "ACTIVE");
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: "ACTIVE" } : l));
      showAlert(tr("admin.listingRestored", { label }));
    } catch (err) { showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err"); }
  };
  const doSuspendUser = async (id, name) => {
    try {
      await adminUpdateUserStatus(id, "SUSPENDED");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "SUSPENDED" } : u));
      showAlert(tr("admin.userSuspended", { name }));
    } catch (err) { showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err"); }
  };
  const doDeleteUser = async (id, name) => {
    try {
      await adminUpdateUserStatus(id, "DELETED");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "DELETED" } : u));
      showAlert(tr("admin.userDeleted", { name }));
    } catch (err) { showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err"); }
  };

  // Abren el modal de confirmación (en vez de alert nativo). Guardan la acción
  // a ejecutar; recién se corre cuando el usuario confirma en el modal.
  const handleDeleteListing = (id, label) => setConfirmModal({ title: tr("car.deleteListing"), msg: tr("admin.confirmDeleteListing", { label }), confirmLabel: tr("common.delete"), action: () => doDeleteListing(id, label) });
  const handleSuspendUser = (id, name) => setConfirmModal({ title: tr("admin.suspendUser"), msg: tr("admin.confirmSuspend", { name }), confirmLabel: tr("admin.suspend"), action: () => doSuspendUser(id, name) });
  const handleDeleteUser = (id, name) => setConfirmModal({ title: tr("admin.deleteUser"), msg: tr("admin.confirmDeleteUser", { name }), confirmLabel: tr("common.delete"), action: () => doDeleteUser(id, name) });

>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  // Ejecuta la acción guardada en el modal y lo cierra.
  const runConfirm = async () => { const m = confirmModal; setConfirmModal(null); if (m?.action) await m.action(); };

  return (
<<<<<<< HEAD
    <div style={s.page}>
      <div style={{ marginBottom: 28 }}>
        <div style={s.title}>Panel de administración</div>
        <div style={s.sub}>Moderación y gestión de la plataforma</div>
=======
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={{ marginBottom: 28 }}>
        <div style={s.title}>{tr("admin.title")}</div>
        <div style={s.sub}>{tr("admin.sub")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      </div>

      {alert.msg && <div style={alert.type === "err" ? s.alertErr : s.alertOk}>{alert.msg}</div>}

      <div style={s.tabs}>
        {[
<<<<<<< HEAD
          ["listings", "Publicaciones"],
          ["users", "Usuarios"],
          ["reports", openReports > 0 ? `Reportes (${openReports})` : "Reportes"],
          ["verifications", pendingVerifications > 0
            ? `Verificaciones (${pendingVerifications})` : "Verificaciones"],
=======
          ["listings", tr("admin.tabListings")],
          ["users", tr("admin.tabUsers")],
          ["reports", openReports > 0 ? `${tr("admin.tabReports")} (${openReports})` : tr("admin.tabReports")],
          ["verifications", pendingVerifications > 0
            ? `${tr("admin.tabVerifications")} (${pendingVerifications})` : tr("admin.tabVerifications")],
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        ].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* PUBLICACIONES */}
      {tab === "listings" && (
<<<<<<< HEAD
        loadingListings ? <div style={s.empty}>Cargando...</div>
        : listings.length === 0 ? <div style={s.empty}>No hay publicaciones.</div>
=======
        loadingListings ? <Spinner block label={tr("common.loading")} />
        : listings.length === 0 ? <div style={s.empty}>{tr("admin.noListings")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
                  : "Sin foto"}
=======
                  : tr("common.noPhoto")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{label}</span>
                  <span style={{ ...s.badge, ...(listingStatusColors[listing.status] || {}) }}>{listing.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
<<<<<<< HEAD
                  {listing.locationText} · ${Number(listing.pricePerDay).toLocaleString()}/día
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                  {new Date(listing.createdAt).toLocaleDateString("es-AR")}
=======
                  {listing.locationText} · ${Number(listing.pricePerDay).toLocaleString()}{tr("common.perDay")}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                  {shortDate(listing.createdAt, lang)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </div>
                <div style={s.btnRow}>
                  {listing.status !== "DELETED" ? (
                    <button style={s.btnDelete}
                      onClick={e => { e.stopPropagation(); handleDeleteListing(listing.id, label); }}>
<<<<<<< HEAD
                      Eliminar
=======
                      {tr("common.delete")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                    </button>
                  ) : (
                    <button style={s.btnRestore}
                      onClick={e => { e.stopPropagation(); handleRestoreListing(listing.id, label); }}>
<<<<<<< HEAD
                      ↻ Recuperar
=======
                      ↻ {tr("admin.restore")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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
<<<<<<< HEAD
        loadingUsers ? <div style={s.empty}>Cargando...</div>
        : users.length === 0 ? <div style={s.empty}>No hay usuarios.</div>
=======
        loadingUsers ? <Spinner block label={tr("common.loading")} />
        : users.length === 0 ? <div style={s.empty}>{tr("admin.noUsers")}</div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        : users.map(u => (
          <div key={u.id} style={{ ...s.card, cursor: "pointer" }}
            onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
<<<<<<< HEAD
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
=======
              <Avatar src={u.profilePhotoUrl} initials={initialsOf(u) } size={40} alt="" />
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
                <div><strong>{tr("auth.phone")}:</strong> {u.phone || "—"}</div>
                <div><strong>{tr("admin.registered")}:</strong> {shortDate(u.createdAt, lang)}</div>
                {u.id !== user.id && u.status !== "DELETED" && (
                  <div style={{ ...s.btnRow, marginTop: 8 }}>
                    {u.status !== "SUSPENDED" && (
                      <button style={s.btnSuspend}
                        onClick={e => { e.stopPropagation(); handleSuspendUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                        {tr("admin.suspend")}
                      </button>
                    )}
                    <button style={s.btnDelete}
                      onClick={e => { e.stopPropagation(); handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                      {tr("common.delete")}
                    </button>
                  </div>
                )}
              </div>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            )}
          </div>
        ))
      )}

      {/* REPORTES
          Cada reporte trae la lectura de la IA: dice si lo denunciado tiene
          relación con la publicación, así el admin no tiene que leer de cero los
          que no tienen nada que ver. La decisión siempre la toma el admin. */}
      {tab === "reports" && (
<<<<<<< HEAD
        loadingReports ? <div style={s.empty}>Cargando...</div>
        : reports.length === 0 ? <div style={s.empty}>No hay reportes.</div>
        : reports.map(r => {
          const ai = {
            COHERENT: { label: "La IA lo ve coherente con la publicación", bg: "#fef3c7", color: "#92400e" },
            INCOHERENT: { label: "La IA no le ve relación con la publicación", bg: "#f3f4f6", color: "#4b5563" },
            UNCLEAR: { label: "La IA no pudo decidir", bg: "#eff6ff", color: "#1e40af" },
          }[r.aiVerdict];
          const reporterName = r.reporter?.displayName
            || `${r.reporter?.firstName || ""} ${r.reporter?.lastName || ""}`.trim()
            || "Usuario";
=======
        loadingReports ? <Spinner block label={tr("common.loading")} />
        : reports.length === 0 ? <div style={s.empty}>{tr("admin.noReports")}</div>
        : reports.map(r => {
          const ai = {
            COHERENT: { label: tr("admin.aiCoherent"), bg: "#fef3c7", color: "#92400e" },
            INCOHERENT: { label: tr("admin.aiIncoherent"), bg: "#f3f4f6", color: "#4b5563" },
            UNCLEAR: { label: tr("admin.aiUnclear"), bg: "#eff6ff", color: "#1e40af" },
          }[r.aiVerdict];
          const reporterName = r.reporter?.displayName
            || `${r.reporter?.firstName || ""} ${r.reporter?.lastName || ""}`.trim()
            || tr("profile.userFallback");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

          return (
            <div key={r.id} style={{ ...s.card, display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ ...s.badge, background: r.status === "OPEN" ? "#fee2e2" : "#f3f4f6", color: r.status === "OPEN" ? "#991b1b" : "#4b5563" }}>
<<<<<<< HEAD
                  {r.status === "OPEN" ? "SIN RESOLVER" : r.status}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{r.reason}</span>
                <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
                  {new Date(r.createdAt).toLocaleDateString("es-AR")}
=======
                  {r.status === "OPEN" ? tr("admin.unresolved") : r.status}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{r.reason}</span>
                <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
                  {shortDate(r.createdAt, lang)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 8 }}>
                {r.targetType === "LISTING"
<<<<<<< HEAD
                  ? <>Publicación: <strong style={{ color: "#374151" }}>{r.listing?.title || "(eliminada)"}</strong></>
                  : <>Cuenta reportada: <strong style={{ color: "#374151" }}>{r.targetUser?.firstName} {r.targetUser?.lastName}</strong></>}
                {" · "}reportó {reporterName}
=======
                  ? <>{tr("admin.reportedListing")}: <strong style={{ color: "#374151" }}>{r.listing?.title || tr("admin.deletedListing")}</strong></>
                  : <>{tr("admin.reportedAccount")}: <strong style={{ color: "#374151" }}>{r.targetUser?.firstName} {r.targetUser?.lastName}</strong></>}
                {" · "}{tr("admin.reportedBy", { name: reporterName })}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </div>

              <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                {r.details}
              </div>

              {/* PRUEBAS. Es lo que hay que mirar antes de pausar una publicación
                  o suspender una cuenta. Se abren en una pestaña nueva a tamaño
                  completo: en una miniatura no se ve un daño ni se lee una
                  conversación. */}
              {r.evidenceUrls?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
<<<<<<< HEAD
                    PRUEBAS ADJUNTAS ({r.evidenceUrls.length}) · tocá para ver en grande
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {r.evidenceUrls.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                        <img src={url} alt={`Prueba ${i + 1}`}
=======
                    {tr("admin.evidence", { count: r.evidenceUrls.length })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {r.evidenceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                        <img src={url} alt=""
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {ai && (
                <div style={{ background: ai.bg, color: ai.color, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, lineHeight: 1.55, marginBottom: 10 }}>
                  <strong>{ai.label}.</strong>{r.aiSummary ? ` ${r.aiSummary}` : ""}
                </div>
              )}

              {r.status === "OPEN" && (
                <div style={s.btnRow}>
                  {r.listing && (
                    <>
                      <button style={s.btnSuspend}
<<<<<<< HEAD
                        onClick={() => doResolveReport(r.id, "PAUSE_LISTING", "Publicación pausada.")}>
                        Pausar publicación
                      </button>
                      <button style={s.btnDelete}
                        onClick={() => doResolveReport(r.id, "DELETE_LISTING", "Publicación eliminada.")}>
                        Eliminar publicación
=======
                        onClick={() => doResolveReport(r.id, "PAUSE_LISTING", tr("admin.listingPaused"))}>
                        {tr("admin.pauseListing")}
                      </button>
                      <button style={s.btnDelete}
                        onClick={() => doResolveReport(r.id, "DELETE_LISTING", tr("admin.listingDeletedShort"))}>
                        {tr("car.deleteListing")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                      </button>
                    </>
                  )}
                  {r.targetUser && (
                    <button style={s.btnSuspend}
<<<<<<< HEAD
                      onClick={() => doResolveReport(r.id, "SUSPEND_USER", "Cuenta suspendida.")}>
                      Suspender cuenta
                    </button>
                  )}
                  <button style={{ ...s.btnSuspend, background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151" }}
                    onClick={() => doResolveReport(r.id, "DISMISS", "Reporte descartado.")}>
                    Descartar
=======
                      onClick={() => doResolveReport(r.id, "SUSPEND_USER", tr("admin.accountSuspended"))}>
                      {tr("admin.suspendAccount")}
                    </button>
                  )}
                  <button style={{ ...s.btnSuspend, background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151" }}
                    onClick={() => doResolveReport(r.id, "DISMISS", tr("admin.reportDismissed"))}>
                    {tr("admin.dismiss")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* VERIFICACIONES DE IDENTIDAD */}
      {tab === "verifications" && (
        <>
          {/* Si la revisión automática está caída, decirlo acá: es la explicación
              de por qué hay solicitudes esperando a que alguien las mire. */}
          {aiHealth?.problem && (
            <div style={{ ...s.alertErr, lineHeight: 1.6 }}>
<<<<<<< HEAD
              <strong>La revisión automática no está funcionando.</strong> {aiHealth.problem}
              {aiHealth.lastVisionError && (
                <div style={{ fontSize: 11.5, marginTop: 6, opacity: .85 }}>
                  Último error del proveedor: {aiHealth.lastVisionError}
=======
              <strong>{tr("admin.aiDown")}</strong> {aiHealth.problem}
              {aiHealth.lastVisionError && (
                <div style={{ fontSize: 11.5, marginTop: 6, opacity: .85 }}>
                  {tr("admin.lastError")}: {aiHealth.lastVisionError}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </div>
              )}
              {aiHealth.availableVisionModels?.length > 0 && (
                <div style={{ fontSize: 11.5, marginTop: 4, opacity: .85 }}>
<<<<<<< HEAD
                  Modelos disponibles hoy: {aiHealth.availableVisionModels.join(", ")}
=======
                  {tr("admin.modelsToday")}: {aiHealth.availableVisionModels.join(", ")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </div>
              )}
            </div>
          )}

<<<<<<< HEAD
          {loadingVerifications ? <div style={s.empty}>Cargando...</div>
          : verifications.length === 0 ? <div style={s.empty}>No hay solicitudes de verificación.</div>
          : verifications.map(v => {
            const person = v.user || {};
            const name = [person.firstName, person.lastName].filter(Boolean).join(" ")
              || person.displayName || person.email || "Sin nombre";
=======
          {/* Estado de los modelos de visión.
              Antes solo se avisaba cuando algo ya estaba roto, y el aviso decía
              "cargá uno de estos en GROQ_VISION_MODEL" sin poder decir CUÁL
              funciona: la lista de Groq incluye modelos que igual contestan 401 o
              429. Este botón los prueba con una imagen mínima y muestra el
              resultado de cada uno, que es lo que hace falta para configurarlo. */}
          <div style={{ ...s.card, display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#111827" }}>
                  {tr("admin.modelsTitle")}
                </div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                  {aiHealth
                    ? tr("admin.modelsConfigured", { list: (aiHealth.visionModels || []).join(", ") || "—" })
                    : tr("admin.modelsUnknown")}
                </div>
              </div>
              <button style={s.btnRestore} disabled={probing} onClick={runProbe}>
                {probing ? tr("admin.modelsTesting") : tr("admin.modelsTest")}
              </button>
            </div>

            {probed && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {/* TRES estados, no dos. El tercero existe porque hacía falta: qwen
                    contestaba "400 invalid image data" a la imagen de prueba, y
                    mostrarlo como FALLA decía que la revisión estaba rota cuando el
                    modelo existía y la clave funcionaba. Ahora eso se muestra en
                    naranja como "no se pudo probar", que es la verdad. */}
                {probed.map(p => {
                  const tono = p.ok
                    ? { fondo: "#f0fdf4", borde: "#bbf7d0", texto: "#166534", etiqueta: "admin.modelOk" }
                    : p.testImageRejected
                      ? { fondo: "#fff7ed", borde: "#fed7aa", texto: "#9a3412", etiqueta: "admin.modelUntested" }
                      : { fondo: "#fef2f2", borde: "#fecaca", texto: "#b91c1c", etiqueta: "admin.modelBad" };
                  return (
                    <div key={p.model} style={{
                      display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
                      background: tono.fondo,
                      border: `1px solid ${tono.borde}`,
                      borderRadius: 8, padding: "8px 11px",
                    }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: ".06em",
                        color: tono.texto, flexShrink: 0,
                      }}>
                        {tr(tono.etiqueta)}
                      </span>
                      <code style={{ color: "#374151", wordBreak: "break-all" }}>{p.model}</code>
                      {p.error && (
                        <span style={{ color: "#9ca3af", fontSize: 11.5, wordBreak: "break-all" }}>{p.error}</span>
                      )}
                    </div>
                  );
                })}
                {/* Cuando no hay nada roto pero la prueba no fue concluyente, el
                    backend explica qué hacer para saberlo de verdad. */}
                {aiHealth?.note && (
                  <div style={{
                    fontSize: 12, color: "#9a3412", background: "#fff7ed",
                    border: "1px solid #fed7aa", borderRadius: 8,
                    padding: "9px 11px", lineHeight: 1.6,
                  }}>
                    {aiHealth.note}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2, lineHeight: 1.6 }}>
                  {tr("admin.modelsHelp")}
                </div>
              </div>
            )}
          </div>

          {loadingVerifications ? <Spinner block label={tr("common.loading")} />
          : verifications.length === 0 ? <div style={s.empty}>{tr("admin.noVerifications")}</div>
          : verifications.map(v => {
            const person = v.user || {};
            const name = [person.firstName, person.lastName].filter(Boolean).join(" ")
              || person.displayName || person.email || tr("admin.noName");
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            const waiting = v.status === "ID_SUBMITTED";
            return (
              <div key={v.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{name}</div>
                    {person.email && (
                      <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{person.email}</div>
                    )}
                  </div>
                </div>

<<<<<<< HEAD
                <IdentityDocuments submission={v} compact />
=======
                <IdentityDocuments submission={v} compact
                  urls={docsFirmados[v.id] || null}
                  loadingPhotos={cargandoDocs === v.id}
                  onLoadPhotos={() => verDocumentos(v.id)} />
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

                {waiting && (
                  <div style={s.btnRow}>
                    <button style={s.btnRestore}
<<<<<<< HEAD
                      onClick={() => doReviewVerification(v.id, "VERIFIED", "Identidad aprobada")}>
                      Aprobar identidad
                    </button>
                    <button style={s.btnDelete}
                      onClick={() => doReviewVerification(v.id, "REJECTED", "Identidad rechazada")}>
                      Rechazar
=======
                      onClick={() => doReviewVerification(v.id, "VERIFIED", tr("admin.identityApproved"))}>
                      {tr("admin.approveIdentity")}
                    </button>
                    <button style={s.btnDelete}
                      onClick={() => doReviewVerification(v.id, "REJECTED", tr("admin.identityRejected"))}>
                      {tr("bookings.reject")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
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
<<<<<<< HEAD
                Cancelar
=======
                {tr("common.cancel")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
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