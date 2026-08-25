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
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  adminGetListings, adminUpdateListingStatus,
  adminGetUsers, adminUpdateUserStatus,
  adminGetSettings, adminDeleteUser,
  getAdminReports, resolveReport,
  adminGetVerifications, adminGetVerificationDocuments,
  adminReviewVerification, getAiHealth, probeAiModels,
} from "../../services/api";
import IdentityDocuments from "../../components/IdentityDocuments";
import ConfirmarEscribiendo from "../../components/ConfirmarEscribiendo";
import Spinner from "../../components/Spinner";
import { useI18n } from "../../i18n/core";
import Avatar from "../../components/Avatar";
import { initialsOf } from "../../services/people";
import { shortDate } from "../../i18n/dates";
import { useCurrency } from "../../context/CurrencyContext";

const s = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  pageMobile: { maxWidth: 900, margin: "0 auto", padding: "20px 14px" },
  title: { fontSize: 24, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px" },
  sub: { color: "var(--fw-text-3)", fontSize: 14, marginTop: 2 },
  tabs: {
    display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--fw-line-soft)",
    overflowX: "auto", overflowY: "hidden",
    // Sin esto, en Chrome/Safari los hijos con flex se encogen y el texto se
    // parte en dos renglones en vez de dejar desplazar la fila.
    flexWrap: "nowrap", WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
  },
  tab: { padding: "10px 14px", fontSize: 13.5, whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent", color: "var(--fw-text-3)", borderBottom: "3px solid transparent" },
  tabActive: { color: "var(--fw-blue)", borderBottom: "3px solid var(--fw-blue)" },
  card: { background: "var(--fw-surface)", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14, border: "1px solid var(--fw-line-soft)" },
  carImg: { width: 90, height: 66, borderRadius: 8, background: "var(--fw-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--fw-text-4)", flexShrink: 0, overflow: "hidden" },
  btnDelete: { padding: "8px 18px", background: "var(--fw-red)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSuspend: { padding: "8px 18px", background: "var(--fw-amber)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnRestore: { padding: "8px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  /*
    BORRAR DEFINITIVAMENTE NO PUEDE PARECERSE A SUSPENDER.

    Suspender y borrar son dos cosas distintas —una deja el email tomado y la
    otra lo libera— y en una fila de botones del mismo tamaño y color se eligen
    por descuido. Este va aparte: fondo transparente, borde rojo y letra roja.
    Se ve que es de la familia de lo peligroso pero NO es el botón que la mano
    aprieta sola, que es el lleno.
  */
  btnBorrar: {
    padding: "8px 18px", background: "transparent", color: "var(--fw-red-text-2)",
    border: "1px solid var(--fw-red)", borderRadius: 8, fontSize: 13,
    fontWeight: 700, cursor: "pointer",
  },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  // El cuadro que explica la diferencia entre las dos acciones. Va arriba de la
  // lista, no adentro de cada fila: es una regla del panel, no de una cuenta.
  ayuda: {
    background: "var(--fw-surface-2)", border: "1px solid var(--fw-line)",
    borderLeft: "3px solid var(--fw-blue)", borderRadius: 8,
    padding: "12px 14px", marginBottom: 16, fontSize: 12.5,
    color: "var(--fw-text-2)", lineHeight: 1.65,
  },
  alertOk: { background: "var(--fw-blue-bg)", border: "1px solid var(--fw-green-line)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--fw-blue-text)", marginBottom: 16 },
  alertErr: { background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--fw-red-text-2)", marginBottom: 16 },
  empty: { textAlign: "center", padding: "40px 0", color: "var(--fw-text-4)" },
  accessDenied: { textAlign: "center", padding: "80px 24px" },
  badge: { padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};

const listingStatusColors = {
  ACTIVE: { background: "var(--fw-green-bg)", color: "var(--fw-green-text-2)" },
  DRAFT: { background: "var(--fw-bg)", color: "var(--fw-text-2)" },
  PAUSED: { background: "var(--fw-amber-bg)", color: "var(--fw-amber-text)" },
  DELETED: { background: "var(--fw-red-bg)", color: "var(--fw-red-text-2)" },
};

const userStatusColor = (status) => {
  if (status === "ACTIVE") return { background: "var(--fw-green-bg)", color: "var(--fw-green-text-2)" };
  if (status === "SUSPENDED") return { background: "var(--fw-amber-bg)", color: "var(--fw-amber-text)" };
  if (status === "DELETED") return { background: "var(--fw-red-bg)", color: "var(--fw-red-text-2)" };
  return { background: "var(--fw-bg)", color: "var(--fw-text-2)" };
};

export default function Admin() {
  const { t: tr, lang } = useI18n();
  const { precio } = useCurrency();
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
  // Fotos de identidad firmadas, por solicitud. Los archivos son privados: la URL
  // guardada devuelve 401, así que hay que pedirlas al backend una por una.
  const [docsFirmados, setDocsFirmados] = useState({});
  const [cargandoDocs, setCargandoDocs] = useState(null);
  const [probed, setProbed] = useState(null);
  const [probing, setProbing] = useState(false);
  /*
    ¿ESTE backend deja borrar cuentas de verdad?

    Arranca en `null` —"todavía no sé"— y no en `false`. Con `false` el botón
    aparecería de golpe medio segundo después de abrir la pestaña, que es
    exactamente cuando la mano ya está yendo a hacer clic en otra cosa.
    Mientras es `null` no se muestra nada.
  */
  const [ajustes, setAjustes] = useState(null);
  // La cuenta que se está por borrar definitivamente (pide escribir el email).
  const [borrando, setBorrando] = useState(null);
  const [borrandoAhora, setBorrandoAhora] = useState(false);

  // Portón de seguridad: si no es admin, no muestra el panel.
  if (!user || user.role !== "ADMIN") {
    return (
      <div style={s.accessDenied}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{tr("admin.denied")}</div>
        <div style={{ color: "var(--fw-text-3)", marginBottom: 24 }}>{tr("admin.deniedNote")}</div>
        <button style={{ padding: "10px 24px", background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          onClick={() => navigate("/")}>{tr("common.goHome")}</button>
      </div>
    );
  }

  // Muestra un cartel de aviso (éxito o error) que se oculta solo a los 4s.
  const showAlert = (msg, type = "ok") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "ok" }), 4000);
  };

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
      // Si el servidor no deja borrar cuentas, el botón ni se dibuja. Un backend
      // viejo que no conozca esta ruta se trata como "no deja": esconder un
      // botón de más nunca rompe nada, mostrarlo de más termina en un 403 con
      // la persona convencida de que borró una cuenta.
      adminGetSettings()
        .then(data => setAjustes(data || { hardDeleteAccounts: false }))
        .catch(() => setAjustes({ hardDeleteAccounts: false }));
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
  /*
    CAMBIAR EL ESTADO DE UNA CUENTA (suspender / dar de baja / reactivar).

    Las tres son la MISMA llamada con distinto valor, así que son una sola
    función. Lo que cambia es lo que hay que contar después:

     · Al sacar una cuenta de circulación, el backend además LE DA DE BAJA LAS
       PUBLICACIONES y dice cuántas. Antes se suspendía a alguien y sus autos
       seguían apareciendo en el buscador y se podían reservar: quien reservaba
       no tenía cómo enterarse de que del otro lado no había nadie.
     · Al reactivarla, esas publicaciones NO vuelven, y no es un olvido: un
       aviso dado de baja por la suspensión no se distingue de uno que el dueño
       borró por su cuenta. Hay que decirlo, porque si no el admin la reactiva
       creyendo que deja todo como estaba.
  */
  const doSetUserStatus = async (id, name, status) => {
    try {
      const res = await adminUpdateUserStatus(id, status);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
      // La lista de publicaciones que está en memoria quedó vieja: las de esta
      // cuenta acaban de darse de baja. Se vuelve a pedir al entrar a la pestaña.
      if (status !== "ACTIVE") setListings([]);

      const bajas = Number(res?.listingsTakenDown) || 0;
      if (status === "ACTIVE") {
        showAlert(tr("admin.userReactivated", { name }));
      } else {
        const base = status === "SUSPENDED"
          ? tr("admin.userSuspended", { name })
          : tr("admin.userDeactivated", { name });
        showAlert(bajas > 0 ? `${base} ${tr("admin.listingsTakenDown", { n: bajas })}` : base);
      }
    } catch (err) { showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err"); }
  };

  /*
    BORRAR LA CUENTA DE VERDAD.

    No pasa por el modal de confirmación común: acá hay que ESCRIBIR el email de
    la cuenta. Es la misma protección que usa GitHub para borrar un repositorio,
    y por el mismo motivo: esto no se deshace y además se lleva puestas las
    reservas y los pagos de OTRAS personas que alquilaron con esa cuenta.
  */
  const doHardDeleteUser = async () => {
    const cuenta = borrando;
    if (!cuenta) return;
    setBorrandoAhora(true);
    try {
      const res = await adminDeleteUser(cuenta.id);
      setUsers(prev => prev.filter(u => u.id !== cuenta.id));
      setListings([]);
      setBorrando(null);

      const q = res?.removed || {};
      const email = res?.freed?.email || cuenta.email;
      let msg = tr("admin.userHardDeleted", {
        listings: Number(q.listings) || 0,
        vehicles: Number(q.vehicles) || 0,
        files: Number(q.mediaFiles) || 0,
        email,
      });
      // Cloudinary caído o sin credenciales: la cuenta se borró igual y no hay
      // nada que reintentar desde acá. Se dice, pero como nota al pie: si se
      // mostrara como error, parecería que el borrado no se hizo.
      const fallaron = Number(q.mediaFilesFailed) || 0;
      if (fallaron > 0) msg += ` ${tr("admin.mediaFailed", { n: fallaron })}`;
      showAlert(msg);
    } catch (err) {
      // El backend tiene el borrado apagado (producción). Se esconde el botón
      // para que no vuelva a pasar y se explica qué hacer en su lugar.
      if (err.code === "ACCOUNT_HARD_DELETE_DISABLED") {
        setAjustes({ hardDeleteAccounts: false });
        setBorrando(null);
        showAlert(tr("admin.hardDeleteOff"), "err");
      } else {
        showAlert(`${tr("admin.error")}: ${err.message || ""}`, "err");
      }
    } finally {
      setBorrandoAhora(false);
    }
  };

  // Abren el modal de confirmación (en vez de alert nativo). Guardan la acción
  // a ejecutar; recién se corre cuando el usuario confirma en el modal.
  const handleDeleteListing = (id, label) => setConfirmModal({ title: tr("car.deleteListing"), msg: tr("admin.confirmDeleteListing", { label }), confirmLabel: tr("common.delete"), action: () => doDeleteListing(id, label) });
  const handleSuspendUser = (id, name) => setConfirmModal({ title: tr("admin.suspendUser"), msg: tr("admin.confirmSuspend", { name }), confirmLabel: tr("admin.suspend"), action: () => doSetUserStatus(id, name, "SUSPENDED") });
  const handleDeactivateUser = (id, name) => setConfirmModal({ title: tr("admin.deactivateUser"), msg: tr("admin.confirmDeactivate", { name }), confirmLabel: tr("admin.deactivate"), action: () => doSetUserStatus(id, name, "DELETED") });
  const handleReactivateUser = (id, name) => setConfirmModal({ title: tr("admin.reactivateUser"), msg: tr("admin.confirmReactivate", { name }), confirmLabel: tr("admin.reactivate"), action: () => doSetUserStatus(id, name, "ACTIVE") });

  // Ejecuta la acción guardada en el modal y lo cierra.
  const runConfirm = async () => { const m = confirmModal; setConfirmModal(null); if (m?.action) await m.action(); };

  return (
    <div style={isMobile ? s.pageMobile : s.page}>
      <div style={{ marginBottom: 28 }}>
        <div style={s.title}>{tr("admin.title")}</div>
        <div style={s.sub}>{tr("admin.sub")}</div>
      </div>

      {alert.msg && <div style={alert.type === "err" ? s.alertErr : s.alertOk}>{alert.msg}</div>}

      <div style={s.tabs}>
        {[
          ["listings", tr("admin.tabListings")],
          ["users", tr("admin.tabUsers")],
          ["reports", openReports > 0 ? `${tr("admin.tabReports")} (${openReports})` : tr("admin.tabReports")],
          ["verifications", pendingVerifications > 0
            ? `${tr("admin.tabVerifications")} (${pendingVerifications})` : tr("admin.tabVerifications")],
        ].map(([k, l]) => (
          <button key={k}
            style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* PUBLICACIONES */}
      {tab === "listings" && (
        loadingListings ? <Spinner block label={tr("common.loading")} />
        : listings.length === 0 ? <div style={s.empty}>{tr("admin.noListings")}</div>
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
                  : tr("common.noPhoto")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fw-text)" }}>{label}</span>
                  <span style={{ ...s.badge, ...(listingStatusColors[listing.status] || {}) }}>{listing.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--fw-text-3)", marginBottom: 2 }}>
                  {listing.locationText} · {precio(listing.pricePerDay)}{tr("common.perDay")}
                </div>
                <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginBottom: 8 }}>
                  {shortDate(listing.createdAt, lang)}
                </div>
                <div style={s.btnRow}>
                  {listing.status !== "DELETED" ? (
                    <button style={s.btnDelete}
                      onClick={e => { e.stopPropagation(); handleDeleteListing(listing.id, label); }}>
                      {tr("common.delete")}
                    </button>
                  ) : (
                    <button style={s.btnRestore}
                      onClick={e => { e.stopPropagation(); handleRestoreListing(listing.id, label); }}>
                      ↻ {tr("admin.restore")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* USUARIOS
          Arriba de la lista va la regla del panel: suspender y eliminar NO son
          la misma acción con más o menos fuerza. La que castiga es suspender,
          porque deja el email tomado; eliminar lo libera y esa persona se
          registra de nuevo mañana con el mismo documento. Sin esto escrito, los
          dos botones se eligen por cuál está más a mano. */}
      {tab === "users" && !loadingUsers && users.length > 0 && (
        <div style={s.ayuda}>
          <div style={{ fontWeight: 700, color: "var(--fw-text)", marginBottom: 4 }}>
            {tr("admin.accountsHelpTitle")}
          </div>
          {tr("admin.accountsHelp")}
          {ajustes && !ajustes.hardDeleteAccounts && (
            <div style={{ marginTop: 6, color: "var(--fw-text-3)" }}>
              {tr("admin.hardDeleteOff")}
              {/*
                Y EL MOTIVO QUE DA EL SERVIDOR, TAL CUAL.

                Sin esto, un botón que no aparece es un misterio: la frase de
                arriba dice QUÉ pasa pero no POR QUÉ este servidor lo tiene
                apagado, y desde el panel no hay forma de averiguarlo. El
                servidor manda `hardDeleteDisabledReason` justamente para eso y
                se estaba tirando a la basura.

                Va en tipografía monoespaciada y más chica porque es un mensaje
                técnico, para quien administra: nombra la variable de entorno que
                hay que tocar. No es una explicación para el usuario final.
              */}
              {ajustes.hardDeleteDisabledReason && (
                <div style={{
                  marginTop: 6, padding: "8px 10px", borderRadius: 6,
                  background: "var(--fw-surface-3)", color: "var(--fw-text-2)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 11.5, lineHeight: 1.6, whiteSpace: "pre-wrap",
                }}>
                  {ajustes.hardDeleteDisabledReason}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {tab === "users" && (
        loadingUsers ? <Spinner block label={tr("common.loading")} />
        : users.length === 0 ? <div style={s.empty}>{tr("admin.noUsers")}</div>
        : users.map(u => (
          <div key={u.id} style={{ ...s.card, cursor: "pointer" }}
            onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar src={u.profilePhotoUrl} initials={initialsOf(u) } size={40} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--fw-text)" }}>
                  {u.firstName} {u.lastName}
                  {u.role === "ADMIN" && (
                    <span style={{ marginLeft: 8, ...s.badge, background: "var(--fw-chip)", color: "#fff" }}>ADMIN</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--fw-text-3)" }}>{u.email}</div>
              </div>
              <span style={{ ...s.badge, ...userStatusColor(u.status) }}>{u.status}</span>
            </div>

            {expandedUser === u.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--fw-line-soft)", fontSize: 12, color: "var(--fw-text-3)", display: "flex", flexDirection: "column", gap: 4 }}>
                <div><strong>ID:</strong> {u.id}</div>
                <div><strong>{tr("auth.phone")}:</strong> {u.phone || "—"}</div>
                <div><strong>{tr("admin.registered")}:</strong> {shortDate(u.createdAt, lang)}</div>
                {/*
                  LA PROPIA FILA NO TIENE BOTONES.

                  El backend contesta 400 a las tres acciones sobre uno mismo, y
                  tiene razón: un admin que se suspende o se saca el rol se queda
                  afuera del panel y no hay forma de volver a entrar desde la
                  API. Mejor que no exista el botón a que exista y explote.
                */}
                {u.id === user.id ? (
                  <div style={{ marginTop: 8, color: "var(--fw-text-4)" }}>{tr("admin.selfRow")}</div>
                ) : (
                  <div style={{ ...s.btnRow, marginTop: 8 }}>
                    {u.status !== "SUSPENDED" && (
                      <button style={s.btnSuspend}
                        onClick={e => { e.stopPropagation(); handleSuspendUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                        {tr("admin.suspend")}
                      </button>
                    )}
                    {u.status !== "DELETED" && (
                      <button style={s.btnDelete}
                        onClick={e => { e.stopPropagation(); handleDeactivateUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                        {tr("admin.deactivate")}
                      </button>
                    )}
                    {u.status !== "ACTIVE" && (
                      <button style={s.btnRestore}
                        onClick={e => { e.stopPropagation(); handleReactivateUser(u.id, `${u.firstName} ${u.lastName}`); }}>
                        {tr("admin.reactivate")}
                      </button>
                    )}
                    {/* Solo si el servidor dice que este backend lo permite. */}
                    {ajustes?.hardDeleteAccounts && (
                      <button style={s.btnBorrar}
                        onClick={e => { e.stopPropagation(); setBorrando(u); }}>
                        {tr("admin.hardDelete")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* REPORTES
          Cada reporte trae la lectura de la IA: dice si lo denunciado tiene
          relación con la publicación, así el admin no tiene que leer de cero los
          que no tienen nada que ver. La decisión siempre la toma el admin. */}
      {tab === "reports" && (
        loadingReports ? <Spinner block label={tr("common.loading")} />
        : reports.length === 0 ? <div style={s.empty}>{tr("admin.noReports")}</div>
        : reports.map(r => {
          const ai = {
            COHERENT: { label: tr("admin.aiCoherent"), bg: "#fef3c7", color: "var(--fw-amber-text)" },
            INCOHERENT: { label: tr("admin.aiIncoherent"), bg: "var(--fw-bg)", color: "var(--fw-text-2)" },
            UNCLEAR: { label: tr("admin.aiUnclear"), bg: "var(--fw-blue-bg)", color: "var(--fw-blue-text)" },
          }[r.aiVerdict];
          const reporterName = r.reporter?.displayName
            || `${r.reporter?.firstName || ""} ${r.reporter?.lastName || ""}`.trim()
            || tr("profile.userFallback");

          return (
            <div key={r.id} style={{ ...s.card, display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ ...s.badge, background: r.status === "OPEN" ? "var(--fw-red-bg)" : "var(--fw-bg)", color: r.status === "OPEN" ? "var(--fw-red-text-2)" : "var(--fw-text-2)" }}>
                  {r.status === "OPEN" ? tr("admin.unresolved") : r.status}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fw-text)" }}>{r.reason}</span>
                <span style={{ fontSize: 12, color: "var(--fw-text-4)", marginLeft: "auto" }}>
                  {shortDate(r.createdAt, lang)}
                </span>
              </div>

              <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginBottom: 8 }}>
                {r.targetType === "LISTING"
                  ? <>{tr("admin.reportedListing")}: <strong style={{ color: "var(--fw-text-2)" }}>{r.listing?.title || tr("admin.deletedListing")}</strong></>
                  : <>{tr("admin.reportedAccount")}: <strong style={{ color: "var(--fw-text-2)" }}>{r.targetUser?.firstName} {r.targetUser?.lastName}</strong></>}
                {" · "}{tr("admin.reportedBy", { name: reporterName })}
              </div>

              <div style={{ fontSize: 13.5, color: "var(--fw-text-2)", lineHeight: 1.6, background: "var(--fw-surface-2)", border: "1px solid var(--fw-line-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                {r.details}
              </div>

              {/* PRUEBAS. Es lo que hay que mirar antes de pausar una publicación
                  o suspender una cuenta. Se abren en una pestaña nueva a tamaño
                  completo: en una miniatura no se ve un daño ni se lee una
                  conversación. */}
              {r.evidenceUrls?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--fw-text-3)", marginBottom: 6 }}>
                    {tr("admin.evidence", { count: r.evidenceUrls.length })}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {r.evidenceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid var(--fw-border)" }}>
                        <img src={url} alt=""
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
                        onClick={() => doResolveReport(r.id, "PAUSE_LISTING", tr("admin.listingPaused"))}>
                        {tr("admin.pauseListing")}
                      </button>
                      <button style={s.btnDelete}
                        onClick={() => doResolveReport(r.id, "DELETE_LISTING", tr("admin.listingDeletedShort"))}>
                        {tr("car.deleteListing")}
                      </button>
                    </>
                  )}
                  {r.targetUser && (
                    <button style={s.btnSuspend}
                      onClick={() => doResolveReport(r.id, "SUSPEND_USER", tr("admin.accountSuspended"))}>
                      {tr("admin.suspendAccount")}
                    </button>
                  )}
                  <button style={{ ...s.btnSuspend, background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)" }}
                    onClick={() => doResolveReport(r.id, "DISMISS", tr("admin.reportDismissed"))}>
                    {tr("admin.dismiss")}
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
              <strong>{tr("admin.aiDown")}</strong> {aiHealth.problem}
              {aiHealth.lastVisionError && (
                <div style={{ fontSize: 11.5, marginTop: 6, opacity: .85 }}>
                  {tr("admin.lastError")}: {aiHealth.lastVisionError}
                </div>
              )}
              {aiHealth.availableVisionModels?.length > 0 && (
                <div style={{ fontSize: 11.5, marginTop: 4, opacity: .85 }}>
                  {tr("admin.modelsToday")}: {aiHealth.availableVisionModels.join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Estado de los modelos de visión.
              Antes solo se avisaba cuando algo ya estaba roto, y el aviso decía
              "cargá uno de estos en GROQ_VISION_MODEL" sin poder decir CUÁL
              funciona: la lista de Groq incluye modelos que igual contestan 401 o
              429. Este botón los prueba con una imagen mínima y muestra el
              resultado de cada uno, que es lo que hace falta para configurarlo. */}
          <div style={{ ...s.card, display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fw-text)" }}>
                  {tr("admin.modelsTitle")}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginTop: 2 }}>
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
                      <code style={{ color: "var(--fw-text-2)", wordBreak: "break-all" }}>{p.model}</code>
                      {p.error && (
                        <span style={{ color: "var(--fw-text-4)", fontSize: 11.5, wordBreak: "break-all" }}>{p.error}</span>
                      )}
                    </div>
                  );
                })}
                {/* Cuando no hay nada roto pero la prueba no fue concluyente, el
                    backend explica qué hacer para saberlo de verdad. */}
                {aiHealth?.note && (
                  <div style={{
                    fontSize: 12, color: "var(--fw-orange-text)", background: "var(--fw-orange-bg)",
                    border: "1px solid var(--fw-orange-line)", borderRadius: 8,
                    padding: "9px 11px", lineHeight: 1.6,
                  }}>
                    {aiHealth.note}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", marginTop: 2, lineHeight: 1.6 }}>
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
            const waiting = v.status === "ID_SUBMITTED";
            return (
              <div key={v.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fw-text)" }}>{name}</div>
                    {person.email && (
                      <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginTop: 2 }}>{person.email}</div>
                    )}
                  </div>
                </div>

                <IdentityDocuments submission={v} compact
                  urls={docsFirmados[v.id] || null}
                  loadingPhotos={cargandoDocs === v.id}
                  onLoadPhotos={() => verDocumentos(v.id)} />

                {waiting && (
                  <div style={s.btnRow}>
                    <button style={s.btnRestore}
                      onClick={() => doReviewVerification(v.id, "VERIFIED", tr("admin.identityApproved"))}>
                      {tr("admin.approveIdentity")}
                    </button>
                    <button style={s.btnDelete}
                      onClick={() => doReviewVerification(v.id, "REJECTED", tr("admin.identityRejected"))}>
                      {tr("bookings.reject")}
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
            style={{ background: "var(--fw-surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--fw-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3.5 21 19H3l9-15.5z" stroke="#dc2626" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10v4M12 16.5h.01" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)", marginBottom: 6 }}>{confirmModal.title}</div>
            <div style={{ fontSize: 14, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 24 }}>{confirmModal.msg}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: "12px", background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {tr("common.cancel")}
              </button>
              <button onClick={runConfirm}
                style={{ flex: 1, padding: "12px", background: "var(--fw-red)", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        BORRAR DEFINITIVAMENTE: hay que escribir el email de la cuenta.

        El modal de arriba se contesta con un clic, y para esto no alcanza. Esto
        no se deshace, libera el email —o sea que la persona expulsada se puede
        volver a registrar— y borra reservas y pagos en los que hay OTRA persona
        del otro lado. Escribir el email son tres segundos y garantizan que
        quien lo hace sabe a qué cuenta le está apuntando.
      */}
      <ConfirmarEscribiendo
        abierto={Boolean(borrando)}
        titulo={tr("admin.hardDeleteTitle", { name: `${borrando?.firstName || ""} ${borrando?.lastName || ""}`.trim() })}
        cuerpo={tr("admin.hardDeleteBody")}
        frase={borrando?.email || ""}
        textoBoton={tr("admin.hardDelete")}
        trabajando={borrandoAhora}
        onConfirmar={doHardDeleteUser}
        onCerrar={() => setBorrando(null)}
      />
    </div>
  );
}