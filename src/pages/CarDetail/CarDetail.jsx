// ============================================================================
//  CarDetail — Pantalla de DETALLE de un auto (ruta /cars/:id)
// ----------------------------------------------------------------------------
//  Muestra toda la info de un auto: galería de fotos, descripción, specs,
//  equipamiento, reseñas y una tarjeta lateral con el precio.
//  - Si el que mira es el DUEÑO: puede editar el precio/descripción o eliminar.
//  - Si es otro usuario: puede guardarlo en favoritos, reservar o escribirle.
//
//  Qué se arregló acá:
//   · Se buscaba el auto primero en una copia guardada en el navegador, así que
//     podía mostrar datos viejos (o un auto ya borrado). Ahora los datos salen
//     siempre del backend.
//   · El corazón de favoritos no existía en esta pantalla.
//   · Se muestran los días ocupados, para no elegir fechas que van a fallar.
//   · El desglose de precios usaba "3 días" fijos aunque el usuario no hubiera
//     elegido ninguna fecha.
// ============================================================================
import { useState, useEffect, useRef } from "react";
import ReportModal from "../../components/ReportModal";
import { useParams, useNavigate } from "react-router-dom";
import { mockCars } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import {
  getListingById, getListingAvailability, startConversation,
  updateListing, deleteListing, getListingReviews,
  getPriceChangeStatus, requestPriceChange, confirmPriceChange, cancelPriceChange,
  reorderListingPhotos,
} from "../../services/api";
import { useOrdenArrastrando, moverEnLista, indiceTrasMover } from "../../hooks/useOrdenArrastrando";
import FavoriteButton from "../../components/FavoriteButton";
import OccupiedDates from "../../components/OccupiedDates";
import { normalizeListing, transmissionLabel, fuelLabel } from "../../services/listings";
import { addMonths, format } from "date-fns";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";
import Avatar from "../../components/Avatar";
import FlechaFoto from "../../components/FlechaFoto";
import Aviso from "../../components/Aviso";
import { initialsOf, nameOf } from "../../services/people";
import { localeFor, shortDate } from "../../i18n/dates";
import { useCurrency } from "../../context/CurrencyContext";

// Caja, combustible y tracción son texto que el usuario LEE, así que se guardan
// como CÓDIGO del backend y se traducen al dibujar. Antes esta pantalla tenía su
// propia copia de las tablas en castellano y quedaba en castellano en los cinco
// idiomas.
const DRIVETRAIN_KEYS = { FRONT: "drive.FRONT", REAR: "drive.REAR", FOUR_BY_FOUR: "drive.4X4", AWD: "drive.AWD" };

// Arma el nombre visible del dueño a partir de sus datos.
function getName(owner, fallback) {
  if (!owner) return fallback;
  return owner.displayName ||
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    fallback;
}

// Convierte una publicación del backend al formato "car" que usa esta pantalla,
// juntando datos del vehículo, del listing y del dueño en un solo objeto plano.
// `ownerFallback` es el texto de "Dueño" en el idioma elegido: esta función vive
// fuera del componente, así que la traducción se le pasa desde arriba.
function apiListingToCar(listing, ownerFallback = "Dueño") {
  const v = listing.vehicle || {};
  const owner = listing.owner || {};
  return {
    id: listing.id,
    status: listing.status,
    isOwnerFlag: listing.isOwner === true,
    brand: v.brand || "",
    model: v.model || "",
    year: v.year || "",
    price_per_day: listing.pricePerDay || 0,
    // Promedio real de las reseñas, calculado y guardado por el backend.
    ratingAverage: listing.ratingAverage ?? null,
    ratingCount: listing.ratingCount ?? 0,
    location: listing.locationText || "",
    transmissionCode: v.transmission || "",
    drivetrainKey: DRIVETRAIN_KEYS[v.drivetrain] || "",
    fuelCode: v.fuelType || "",
    seats: v.seats,
    doors: v.doors,
    color: v.color,
    photos: listing.photos || [],
    description: listing.description || "",
    bluetooth: v.bluetooth,
    rearCamera: v.rearCamera,
    parkingSensors: v.parkingSensors,
    horsePower: v.horsePower,
    engineDisplacementCC: v.engineDisplacementCC,
    trunkCapacityLiters: v.trunkCapacityLiters,
    fuelConsumptionLitersPer100Km: v.fuelConsumptionLitersPer100Km,
    weightKg: v.weightKg,
    observations: v.observations,
    ownerId: owner.id || "",
    ownerName: getName(owner, ownerFallback),
    ownerInitials: initialsOf(owner),
    ownerPhotoUrl: owner.profilePhotoUrl || null,
  };
}

const s = {
  page: { maxWidth: 860, margin: "0 auto", padding: "32px 24px" },
  pageMobile: { padding: "16px" },
  badge: {
    display: "inline-block", padding: "3px 12px",
    background: "var(--fw-blue-bg-2)", color: "var(--fw-blue-text)",
    borderRadius: 20, fontSize: 12, fontWeight: 600, marginRight: 8,
  },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--fw-text)" },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  spec: {
    background: "var(--fw-surface-2)", borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "var(--fw-text-2)", border: "1px solid var(--fw-line-soft)",
  },
  specLabel: { color: "var(--fw-text-4)", fontSize: 11, marginBottom: 2 },
  review: { borderBottom: "1px solid var(--fw-line-soft)", paddingBottom: 14, marginBottom: 14 },
  reviewAuthor: { fontWeight: 600, fontSize: 14, marginBottom: 2, color: "var(--fw-text)" },
  reviewText: { fontSize: 13, color: "var(--fw-text-2)" },
  stars: { color: "var(--fw-amber)", fontSize: 13 },
  priceCard: {
    background: "var(--fw-surface)", border: "1px solid var(--fw-border)",
    borderRadius: 14, padding: 24, position: "sticky", top: 80,
  },
  priceCardMobile: {
    background: "var(--fw-surface)", border: "1px solid var(--fw-border)",
    borderRadius: 14, padding: 20, marginTop: 24,
  },
  price: { fontSize: 28, fontWeight: 800, color: "var(--fw-blue)", marginBottom: 4 },
  priceSub: { fontSize: 13, color: "var(--fw-text-3)", marginBottom: 20 },
  ownerBox: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 0", borderTop: "1px solid var(--fw-line-soft)", marginTop: 14,
  },
  ownerName: { fontWeight: 700, fontSize: 14, color: "var(--fw-text)" },
  ownerMeta: { fontSize: 12, color: "var(--fw-text-3)" },
  btn: {
    width: "100%", padding: "14px", background: "var(--fw-blue)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
    cursor: "pointer", marginBottom: 10,
  },
  chatBtn: {
    width: "100%", padding: "11px", background: "transparent",
    border: "2px solid var(--fw-blue)", color: "var(--fw-blue)",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  chatBtnLoading: {
    width: "100%", padding: "11px", background: "transparent",
    border: "2px solid var(--fw-border-2)", color: "var(--fw-text-4)",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "default",
  },
  row: {
    display: "flex", justifyContent: "space-between",
    fontSize: 13, color: "var(--fw-text-3)", marginBottom: 6,
  },
  total: {
    display: "flex", justifyContent: "space-between",
    fontWeight: 700, fontSize: 15, color: "var(--fw-text)",
    borderTop: "1px solid var(--fw-border)", paddingTop: 10, marginTop: 6,
  },
  /*
    LAS FLECHAS DE PASAR FOTOS.

    Tenían dos cosas mal. Una: el fondo era un blanco escrito a mano, así que en
    modo oscuro quedaba un botón blanco brillante encima de una foto, sobre una
    pantalla oscura; era lo que más saltaba a la vista de toda la pantalla siendo
    un control secundario. Ahora sale de la paleta y se adapta.

    La otra: la flecha era el CARÁCTER "‹", una comilla angular. No es una
    flecha: no tiene punta, su grosor y su altura dependen de la tipografía del
    sistema, y no queda centrada en el redondel porque los caracteres traen su
    propio espacio arriba y abajo. Ahora es la misma flecha dibujada que usa el
    globo del mapa, así las dos se ven igual en toda la app.
  */
  arrowBtn: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 44, height: 44, borderRadius: "50%",
    background: "var(--fw-vidrio)", color: "var(--fw-vidrio-texto)",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
    boxShadow: "0 2px 10px rgba(0,0,0,.15)",
  },
  /*
    Los puntitos de abajo, que dicen en qué foto vas.

    El activo era `var(--fw-surface)`: en modo claro eso es blanco y se veía, pero
    en oscuro es el gris de las tarjetas, así que quedaba una barrita gris oscura
    encima de una foto y no se distinguía de las inactivas. Los puntitos están
    apoyados sobre una FOTO, no sobre una superficie de la app: ahí lo que se lee
    es el blanco, en los dos modos. La sombra los despega de las fotos claras.
  */
  dot: {
    height: 8, borderRadius: 4, cursor: "pointer",
    transition: "all .2s", background: "rgba(255,255,255,.45)",
    boxShadow: "0 1px 3px rgba(0,0,0,.35)",
  },
  dotActive: { background: "#fff" },
  thumbnail: {
    width: 88, height: 60, objectFit: "cover",
    borderRadius: 8, cursor: "pointer", flexShrink: 0, transition: "all .15s",
    display: "block",
  },
  ordenAviso: {
    fontSize: 12.5, color: "var(--fw-text-3)", margin: "12px 0 0",
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
  },
  ordenEstado: { display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 4 },
  portadaTag: {
    position: "absolute", left: 4, bottom: 4,
    background: "var(--fw-blue)", color: "#fff",
    borderRadius: 20, padding: "2px 7px", fontSize: 9.5, fontWeight: 700,
    letterSpacing: ".02em", pointerEvents: "none",
  },
};

export default function CarDetail() {
  const { t: tr, lang } = useI18n();
  const { precio } = useCurrency();
  const dateLocale = localeFor(lang);
  const { id } = useParams();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const navigate = useNavigate();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  // Si no se puede abrir la conversación se avisa abajo, sin tapar la
  // publicación. Antes era un `alert()`, que congelaba la pestaña entera.
  const [aviso, setAviso] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [showReportUser, setShowReportUser] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [listingReviews, setListingReviews] = useState([]);
  // Cambio de precio: estado del circuito con confirmación por email.
  const [priceStatus, setPriceStatus] = useState(null);
  const [priceStep, setPriceStep] = useState("idle"); // idle | code
  const [priceCode, setPriceCode] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [editError, setEditError] = useState("");
  // Reordenar las fotos: "idle" | "guardando" | "guardado".
  const [estadoOrden, setEstadoOrden] = useState("idle");
  // El orden que está guardado en el servidor. Se llena en el primer movimiento
  // de una tanda y sirve para volver atrás si el guardado falla.
  const ordenPrevio = useRef(null);
  // Las fotos como están AHORA en pantalla. Va por ref y no por el estado porque
  // quien lo lee es el `soltar` del arrastre, y ahí hace falta la lista de este
  // instante, no la del render en el que se armó el manejador.
  const fotosRef = useRef([]);

  // ¿El id corresponde a un auto de ejemplo? En ese caso no se le pregunta nada
  // al backend: no existe ahí, y preguntarle solo generaba errores 404 en la
  // consola.
  const mockCar = mockCars.find(c => c.id === id);

  // Al cargar: pide la publicación al backend, que es la única fuente de verdad.
  useEffect(() => {
    let active = true;

    if (mockCar) {
      setCar({ ...normalizeListing(mockCar), isMock: true });
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    getListingById(id)
      .then(listing => {
        if (!active) return;
        if (listing) setCar(apiListingToCar(listing, tr("car.owner")));
      })
      .catch(() => { /* no existe o no está disponible: se muestra "no encontrado" */ })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Días ya ocupados, para avisar antes de que elija fechas que van a fallar.
  // Los autos de ejemplo no tienen disponibilidad que consultar.
  useEffect(() => {
    if (!id || mockCar) return undefined;
    let active = true;
    const from = new Date();
    getListingAvailability(id, from.toISOString(), addMonths(from, 6).toISOString())
      .then(data => { if (active) setUnavailableDates(data?.unavailableDates || []); })
      .catch(() => { /* sin disponibilidad cargada */ });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reseñas de la publicación. Los autos de ejemplo no tienen ninguna.
  useEffect(() => {
    if (!id || mockCar) return undefined;
    let active = true;
    getListingReviews(id)
      .then(data => { if (active) setListingReviews(Array.isArray(data) ? data : []); })
      .catch(() => { /* sin reseñas */ });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // "Contactar al dueño": abre (o reutiliza) una conversación y va al chat.
  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    setContactLoading(true);
    try {
      const conv = await startConversation(id);
      navigate(`/chat?conv=${conv.id}`);
    } catch (err) {
      setAviso(err.message || tr("car.chatFailed"));
      setContactLoading(false);
    }
  };

  // Abre el modo edición precargando el precio y la descripción actuales, y
  // consulta si el precio se puede cambiar ahora (ver el bloque de más abajo).
  const startEdit = async () => {
    setEditPrice(String(car.price_per_day || ""));
    setEditDesc(car.description || "");
    setEditing(true);
    setPriceStep("idle");
    setPriceCode("");
    setPriceInfo("");
    const status = await getPriceChangeStatus(id).catch(() => null);
    setPriceStatus(status);
    // Si había un cambio pendiente de confirmar, se retoma en el paso del código.
    if (status?.pendingPricePerDay) {
      setEditPrice(String(status.pendingPricePerDay));
      setPriceStep("code");
      setPriceInfo(tr("car.pendingPriceCode"));
    }
  };

  // Guarda los cambios de precio/descripción en el backend. Si falla, se avisa:
  // antes el error se descartaba y parecía guardado cuando no lo estaba.
  const handleSaveEdit = async () => {
    setSavingEdit(true);
    setEditError("");
    setPriceInfo("");
    const pricePerDay = Number(editPrice);
    const priceChanged = pricePerDay && Math.round(pricePerDay) !== Math.round(car.price_per_day);

    if (editPrice !== "" && (!pricePerDay || pricePerDay <= 0)) {
      setEditError(tr("car.errPrice"));
      setSavingEdit(false);
      return;
    }

    try {
      // La descripción se guarda directo.
      if (editDesc !== car.description) {
        await updateListing(id, { description: editDesc });
        setCar(c => ({ ...c, description: editDesc }));
      }

      // El precio no: se pide el código por email y se aplica al confirmarlo.
      if (priceChanged) {
        const result = await requestPriceChange(id, pricePerDay);
        setPriceStep("code");
        setPriceInfo(`Te enviamos un código a ${result.sentTo}. El precio recién cambia cuando lo ingresás.`);
        const status = await getPriceChangeStatus(id).catch(() => null);
        if (status) setPriceStatus(status);
      } else {
        setEditing(false);
      }
    } catch (err) {
      setEditError(err.message || tr("car.errSave"));
    } finally {
      setSavingEdit(false);
    }
  };

  /** Paso 2 del cambio de precio: con el código, el precio nuevo queda aplicado. */
  const handleConfirmPrice = async () => {
    setSavingEdit(true);
    setEditError("");
    try {
      const result = await confirmPriceChange(id, priceCode.trim());
      setCar(c => ({ ...c, price_per_day: result.pricePerDay }));
      setPriceStep("idle");
      setPriceCode("");
      setPriceInfo("");
      setEditing(false);
    } catch (err) {
      setEditError(err.message || tr("car.errConfirm"));
    } finally {
      setSavingEdit(false);
    }
  };

  /** Se descarta el cambio pendiente y el precio queda como estaba. */
  const handleCancelPrice = async () => {
    await cancelPriceChange(id).catch(() => {});
    setPriceStep("idle");
    setPriceCode("");
    setPriceInfo("");
    setEditPrice(String(car.price_per_day || ""));
    setEditError("");
  };

  // Elimina la publicación y vuelve a "Mis autos".
  const handleDelete = async () => {
    setDeleting(true);
    setEditError("");
    try {
      await deleteListing(id);
      navigate("/dashboard");
    } catch (err) {
      setEditError(err.message || tr("car.errDelete"));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  /*
    ─────────── REORDENAR LAS FOTOS DE UNA PUBLICACIÓN YA CREADA ───────────

    La primera foto es la portada: es la que se ve en el buscador, en el inicio,
    en el globo del mapa y en "Mis autos". Hasta acá solo se podía elegir al
    publicar, y quedaba clavada: la única forma de cambiar la portada era borrar
    el aviso y cargarlo de nuevo.

    Ahora, en modo edición, la fila de miniaturas se agarra y se acomoda. La que
    quede primera pasa a ser la portada, y el orden se guarda para todos, no solo
    para el que lo movió: al soltar se manda la lista entera al servidor.

    SE GUARDA AL SOLTAR, no con un botón. Un botón "Guardar orden" aparte del que
    ya guarda precio y descripción es una segunda cosa que se puede olvidar de
    apretar, y el resultado de olvidarse es creer que quedó ordenado.
  */
  const moverFoto = (desde, hasta) => {
    const lista = fotosRef.current;
    if (desde === hasta || !lista[desde] || !lista[hasta]) return;
    if (ordenPrevio.current === null) ordenPrevio.current = lista;
    // El orden se lleva en la ref además de en el estado: un arrastre dispara
    // varios movimientos seguidos y React puede no haber vuelto a dibujar entre
    // uno y otro. Leyendo del estado, el segundo movimiento partiría del orden
    // viejo y desharía el primero.
    const nuevas = moverEnLista(lista, desde, hasta);
    fotosRef.current = nuevas;
    setCar((c) => ({ ...c, photos: nuevas }));
    // La foto grande sigue siendo la misma foto: se la sigue por su posición
    // nueva en vez de dejar el índice quieto apuntando a otra.
    setCurrentPhoto((p) => indiceTrasMover(p, desde, hasta));
  };

  const guardarOrdenDeFotos = async () => {
    const previo = ordenPrevio.current;
    const ahora = fotosRef.current;
    ordenPrevio.current = null;
    // Soltó donde estaba: no hay orden nuevo que guardar.
    if (!previo || previo.join("|") === ahora.join("|")) return;

    setEstadoOrden("guardando");
    try {
      await reorderListingPhotos(id, ahora);
      setEstadoOrden("guardado");
    } catch (err) {
      // No se pudo guardar: se DESHACE lo que se ve. Dejar las fotos dadas
      // vuelta en pantalla sería mentirle al dueño, que se iría convencido de
      // que cambió la portada cuando en el aviso que ven los demás sigue igual.
      setCar((c) => ({ ...c, photos: previo }));
      fotosRef.current = previo;
      setCurrentPhoto(0);
      setEstadoOrden("idle");
      // 404/405 = el servidor todavía no tiene esta ruta. Es un caso distinto de
      // "falló": no hay nada que reintentar, así que se dice eso y no otra cosa.
      setAviso(err?.status === 404 || err?.status === 405
        ? tr("car.orderUnsupported")
        : (err?.message || tr("car.orderFailed")));
    }
  };

  const ordenFotos = useOrdenArrastrando(moverFoto, guardarOrdenDeFotos);

  // "Orden guardado" es un acuse de recibo, no un estado: se muestra un momento
  // y se va solo. Si se quedara fijo, en la próxima visita seguiría ahí diciendo
  // que se guardó algo que se guardó ayer.
  useEffect(() => {
    if (estadoOrden !== "guardado") return undefined;
    const reloj = setTimeout(() => setEstadoOrden("idle"), 2600);
    return () => clearTimeout(reloj);
  }, [estadoOrden]);

  if (loading) return <Spinner block label={tr("common.loading")} />;

  if (!car) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--fw-text-3)" }}>
      {tr("car.notFound")}
    </div>
  );

  // Reseñas reales de la publicación. Antes esta sección mostraba comentarios de
  // ejemplo escritos a mano, iguales para todos los autos.
  const reviews = listingReviews;
  const photos = car.photos || [];
  fotosRef.current = photos;
  // ¿El que mira es el dueño? El backend ya lo informa (isOwner) para no depender
  // de comparar ids que pueden venir vacíos.
  const isOwner = car.isOwnerFlag === true || (!!user?.id && user.id === car.ownerId);

  // Las fotos se acomodan solo en modo edición, y solo el dueño. Fuera de ahí la
  // fila sigue siendo lo que era —miniaturas para mirar—: si arrastrara siempre,
  // cualquier toque que se corra un poco movería la portada del aviso sin que la
  // persona se haya propuesto cambiar nada. Los autos de ejemplo no existen en el
  // servidor, así que no hay orden que guardarles.
  const puedeReordenar = isOwner && editing && !car.isMock && photos.length > 1;

  // Navegación circular de la galería (anterior / siguiente foto).
  const prevPhoto = () =>
    setCurrentPhoto(p => (p === 0 ? photos.length - 1 : p - 1));
  const nextPhoto = () =>
    setCurrentPhoto(p => (p === photos.length - 1 ? 0 : p + 1));

  // Lista de specs técnicas, descartando las que el auto no tenga cargadas.
  const techSpecs = [
    ["spec.color", car.color],
    // La tracción se cargaba al publicar y no se mostraba en ninguna parte.
    ["spec.drivetrain", car.drivetrainKey ? tr(car.drivetrainKey) : null],
    ["spec.doors", car.doors],
    ["spec.power", car.horsePower ? `${car.horsePower} HP` : null],
    ["spec.displacement", car.engineDisplacementCC ? `${car.engineDisplacementCC} cc` : null],
    ["spec.trunk", car.trunkCapacityLiters ? `${car.trunkCapacityLiters} L` : null],
    ["spec.consumption", car.fuelConsumptionLitersPer100Km ? `${car.fuelConsumptionLitersPer100Km} l/100km` : null],
    ["spec.weight", car.weightKg ? `${car.weightKg} kg` : null],
  ].filter(([, val]) => val);

  // Tarjeta lateral de precio. Muestra el desglose (base + comisión + depósito)
  // y, según sea dueño o no, los botones de editar/eliminar o reservar/contactar.
  /**
   * Tarjeta de precio (y, para el dueño, el formulario de edición).
   *
   * OJO: es una función que DEVUELVE JSX, y se usa como `{priceCard()}`, no como
   * `<PriceCard />`. La diferencia no es de estilo, es un bug:
   *
   * Declarar un componente adentro de otro crea una función NUEVA en cada
   * render. React compara los tipos de componente por identidad, así que al ver
   * una función distinta da por muerto el árbol anterior y monta uno nuevo desde
   * cero. Resultado: cada letra escrita en la descripción cambiaba el estado,
   * disparaba un render, y el <textarea> se destruía y volvía a crearse: el
   * cursor se perdía y había que hacer clic otra vez por cada carácter.
   *
   * Llamándola como función, el JSX queda inlineado en el árbol del padre y los
   * campos conservan el foco. Lo mismo pasaba al cambiar de tamaño la ventana,
   * porque la tarjeta se dibuja en dos lugares distintos según isMobile.
   */
  const priceCard = () => (
    <div style={isMobile ? s.priceCardMobile : s.priceCard}>
      <div style={s.price}>{precio(car.price_per_day)}</div>
      <div style={s.priceSub}>{tr("car.perDay")}</div>
      {/* Ejemplo de 3 días, aclarado como tal: el total real depende de las
          fechas que se elijan y lo calcula el servidor al reservar. */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fw-text-4)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
        {tr("car.example3")}
      </div>
      <div style={s.row}>
        <span>{tr("car.rent3")}</span>
        <span>{precio(car.price_per_day * 3)}</span>
      </div>
      <div style={s.row}>
        <span>{tr("car.fee")}</span>
        <span>{precio(Math.round(car.price_per_day * 3 * 0.1))}</span>
      </div>
      <div style={s.row}>
        <span>{tr("car.deposit")}</span>
        <span>{precio(car.price_per_day * 2)}</span>
      </div>
      <div style={s.total}>
        <span>{tr("car.estTotal")}</span>
        <span>
          {precio(Math.round(car.price_per_day * 3 * 1.1 + car.price_per_day * 2))}
        </span>
      </div>

      {/* Disponibilidad: los días tomados, agrupados en tramos, con los colores
          de la app. Ver components/OccupiedDates.jsx. */}
      <OccupiedDates days={unavailableDates} isMobile={isMobile} />
      <br />

      {isOwner ? (
        editing ? (
          <div>
            {/* PASO DEL CÓDIGO: el precio nuevo ya quedó guardado como pendiente y
                se aplica recién cuando se ingresa el código que llegó por email. */}
            {priceStep === "code" ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)", marginBottom: 6 }}>
                  Confirmá el cambio de precio
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fw-text-2)", lineHeight: 1.5, marginBottom: 10 }}>
                  {priceInfo}
                </div>
                <input value={priceCode} onChange={e => setPriceCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric" placeholder="000000"
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "1.5px solid var(--fw-border)", fontSize: 22, fontWeight: 700, letterSpacing: 8, textAlign: "center", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                {editError && <div style={{ background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "var(--fw-red-text-2)", marginBottom: 10 }}>{editError}</div>}
                <button style={{ ...s.btn, opacity: savingEdit || priceCode.length !== 6 ? 0.6 : 1 }}
                  onClick={handleConfirmPrice} disabled={savingEdit || priceCode.length !== 6}>
                  {savingEdit ? tr("car.confirming") : tr("car.confirmNewPrice")}
                </button>
                <button style={s.chatBtn} onClick={handleCancelPrice}>{tr("car.discardChange")}</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 4 }}>{tr("car.pricePerDay")}</div>
                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                  disabled={priceStatus ? !priceStatus.canChange : false}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--fw-border)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 6, background: priceStatus && !priceStatus.canChange ? "var(--fw-surface-2)" : "var(--fw-surface)" }} />

                {/* Por qué el precio está protegido, y si ahora se puede cambiar */}
                <div style={{ fontSize: 11.5, color: "var(--fw-text-3)", lineHeight: 1.5, marginBottom: 10 }}>
                  {priceStatus && priceStatus.blockedByBookings
                    ? `No se puede cambiar el precio con ${priceStatus.activeBookings} reserva${priceStatus.activeBookings === 1 ? "" : "s"} en curso.`
                    : priceStatus && priceStatus.nextAllowedChangeAt
                      ? tr("car.priceCooldown", {
                        hours: priceStatus.cooldownHours,
                        when: `${shortDate(priceStatus.nextAllowedChangeAt, lang)} ${format(new Date(priceStatus.nextAllowedChangeAt), "HH:mm")}`,
                      })
                      : tr("car.priceCodeNote")}
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 4 }}>{tr("car.description")}</div>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  style={{ width: "100%", height: 80, padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--fw-border)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 10 }} />
                {editError && <div style={{ background: "var(--fw-red-bg)", border: "1px solid var(--fw-red-line)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: "var(--fw-red-text-2)", marginBottom: 10 }}>{editError}</div>}
                <button style={{ ...s.btn, opacity: savingEdit ? 0.6 : 1 }} onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? tr("common.saving") : tr("car.saveChanges")}
                </button>
                <button style={s.chatBtn} onClick={() => setEditing(false)}>{tr("common.cancel")}</button>
              </>
            )}
          </div>
        ) : (
          <>
            <button style={s.btn} onClick={startEdit}>{tr("car.editListing")}</button>
            {/* Rojo lleno y letra blanca. Con el fondo transparente y el borde
                rosa claro, en oscuro quedaba una letra roja apagada sobre el gris
                de la tarjeta: se leía mal justo en el botón que borra la
                publicación, que es el que más claro tiene que quedar. */}
            <button
              style={{ width: "100%", padding: "12px", background: "var(--fw-red)", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              {deleting ? tr("car.deleting") : tr("car.deleteListing")}
            </button>
          </>
        )
      ) : (
        <>
          {car.isMock ? (
            <div style={{ background: "var(--fw-amber-bg)", border: "1px solid var(--fw-amber-line)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--fw-amber-text)", marginBottom: 10 }}>
              Este es un auto de ejemplo para mostrar la app: no se puede reservar.
            </div>
          ) : (
            <button
              data-fw-accion
              style={s.btn}
              onClick={() => user ? navigate(`/booking/${car.id}`) : navigate("/login")}
            >
              {user ? tr("car.bookNow") : tr("car.loginToBook")}
            </button>
          )}
          <button
            style={contactLoading ? s.chatBtnLoading : s.chatBtn}
            onClick={handleContact}
            disabled={contactLoading || car.isMock}
          >
            {contactLoading ? tr("car.openingChat") : tr("car.contactOwner")}
          </button>
        </>
      )}

      <div style={s.ownerBox}>
        <Avatar src={car.ownerPhotoUrl} initials={car.ownerInitials} size={44} alt={car.ownerName} />
        <div style={{ flex: 1 }}>
          <div style={s.ownerName}>{car.ownerName}</div>
          <div style={s.ownerMeta}>{tr("car.memberOf")}</div>
        </div>
        {!isOwner && (
          <button
            onClick={() => user ? setShowReportUser(true) : navigate("/login")}
            /*
              Rojo lleno y letra blanca, no un contorno rosa claro.

              Con el borde `#fecaca` sobre fondo blanco, el botón quedaba casi
              invisible al lado del nombre del dueño, y encima el rosa pálido se
              lee como "deshabilitado". Reportar a alguien es una acción seria y
              tiene que verse como tal, aunque no sea la que uno usa todos los
              días.
            */
            style={{
              background: "var(--fw-red)", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 600,
              cursor: "pointer", padding: "5px 12px",
            }}
          >
            {tr("report.action")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ ...s.page, ...(isMobile ? s.pageMobile : {}) }}>

      {/* Galería */}
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{
          width: "100%", height: isMobile ? 240 : 380,
          borderRadius: isMobile ? 10 : 14, overflow: "hidden",
          position: "relative", background: "var(--fw-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {photos.length > 0
            ? <img src={photos[currentPhoto]} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "var(--fw-text-4)", fontSize: 14 }}>{tr("car.noPhotos")}</span>}

          {/* Corazón de favoritos. Va a la IZQUIERDA: arriba a la derecha está
              el contador de fotos ("2 / 4") y se pisaban entre sí. */}
          {!isOwner && <FavoriteButton listingId={car.id} size={38} disabled={car.isMock} side="left" />}

          {photos.length > 1 && (
            <>
              <button
                style={{ ...s.arrowBtn, left: isMobile ? 8 : 16, width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={prevPhoto} aria-label={tr("car.prevPhoto")}
              ><FlechaFoto hacia="izq" size={isMobile ? 15 : 18} /></button>
              <button
                style={{ ...s.arrowBtn, right: isMobile ? 8 : 16, width: isMobile ? 36 : 44, height: isMobile ? 36 : 44 }}
                onClick={nextPhoto} aria-label={tr("car.nextPhoto")}
              ><FlechaFoto hacia="der" size={isMobile ? 15 : 18} /></button>
              <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setCurrentPhoto(i)}
                    style={{ ...s.dot, width: i === currentPhoto ? 22 : 8, ...(i === currentPhoto ? s.dotActive : {}) }} />
                ))}
              </div>
              <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,.55)", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
                {currentPhoto + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <>
            {/* En modo edición la fila se acomoda arrastrando. El cartelito lo
                dice: sin él, nadie descubre que las miniaturas se mueven. */}
            {puedeReordenar && (
              <div style={s.ordenAviso}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 9h14M5 15h14" /><path d="m8 6-3 3 3 3" /><path d="m16 12 3 3-3 3" />
                </svg>
                <span>{tr("car.dragToOrder")}</span>
                {estadoOrden === "guardando" && (
                  <span style={s.ordenEstado}><Spinner size={11} /> {tr("car.savingOrder")}</span>
                )}
                {estadoOrden === "guardado" && (
                  <span style={{ ...s.ordenEstado, color: "var(--fw-green)" }}>✓ {tr("car.orderSaved")}</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
              {photos.map((p, i) => (
                <div
                  key={p}
                  {...(puedeReordenar ? ordenFotos.props(i) : {})}
                  // Un arrastre termina en un clic para el navegador. Sin esta
                  // guarda, acomodar una foto también la elegía como la grande.
                  onClick={() => { if (!ordenFotos.fueArrastre()) setCurrentPhoto(i); }}
                  style={{
                    position: "relative", flexShrink: 0, lineHeight: 0,
                    ...(puedeReordenar ? ordenFotos.estilo(i) : { cursor: "pointer" }),
                  }}
                >
                  <img src={p} alt="" draggable={false}
                    style={{
                      ...s.thumbnail,
                      border: i === currentPhoto ? "2px solid var(--fw-blue)" : "2px solid transparent",
                      opacity: i === currentPhoto ? 1 : 0.6,
                    }} />
                  {/* La primera es la portada: la que ven los demás en el
                      buscador y en el mapa. Se dice acá para que mover una foto
                      al principio sea una decisión y no una casualidad. */}
                  {puedeReordenar && i === 0 && (
                    <span style={s.portadaTag}>{tr("car.coverPhoto")}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: isMobile ? "block" : "grid", gridTemplateColumns: "1fr 340px", gap: 32 }}>
        <div>
          <div style={{ fontSize: isMobile ? 21 : 26, fontWeight: 800, marginBottom: 6, color: "var(--fw-text)", letterSpacing: "-.5px", marginTop: isMobile ? 16 : 0 }}>
            {car.brand} {car.model} {car.year}
          </div>
          <div style={{ color: "var(--fw-text-3)", fontSize: 14, marginBottom: 16 }}>
            {car.location}
          </div>

          {/* En celular la tarjeta de precio va acá, después del nombre y la
              ubicación. Estaba antes del título, así que se veía la foto y
              enseguida una pared de importes sin saber todavía qué auto era. */}
          {isMobile && priceCard()}

          <div style={s.section}>
            <div style={s.sectionTitle}>{tr("car.description")}</div>
            <p style={{ fontSize: 14, color: "var(--fw-text-2)", lineHeight: 1.7 }}>
              {car.description || tr("car.noDescription")}
            </p>
            {car.observations && (
              <p style={{ fontSize: 13, color: "var(--fw-text-3)", marginTop: 8, fontStyle: "italic" }}>
                {car.observations}
              </p>
            )}
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}>{tr("car.specs")}</div>
            <div style={s.specGrid}>
              {[
                ["spec.transmission", transmissionLabel(tr, car.transmissionCode)],
                ["spec.fuel", fuelLabel(tr, car.fuelCode)],
                ["spec.seats", car.seats],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={s.spec}>
                  <div style={s.specLabel}>{tr(label)}</div>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          {techSpecs.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>{tr("spec.techTitle")}</div>
              <div style={s.specGrid}>
                {techSpecs.map(([label, val]) => (
                  <div key={label} style={s.spec}>
                    <div style={s.specLabel}>{tr(label)}</div>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(car.bluetooth || car.rearCamera || car.parkingSensors) && (
            <div style={s.section}>
              <div style={s.sectionTitle}>{tr("spec.equipment")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {car.bluetooth && <span style={s.badge}>Bluetooth</span>}
                {car.rearCamera && <span style={s.badge}>{tr("spec.rearCamera")}</span>}
                {car.parkingSensors && <span style={s.badge}>{tr("spec.parkingSensors")}</span>}
              </div>
            </div>
          )}

          <div style={s.section}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={s.sectionTitle}>{tr("car.reviews", { count: car.ratingCount })}</div>
              {/* Promedio real: sale de las puntuaciones guardadas, no de un número fijo. */}
              {car.ratingAverage !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ ...s.stars, fontSize: 15 }}>{"★".repeat(Math.round(car.ratingAverage))}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>{car.ratingAverage.toFixed(1)}</span>
                </div>
              )}
            </div>
            {reviews.length === 0
              ? (
                <p style={{ color: "var(--fw-text-4)", fontSize: 13 }}>{tr("car.noReviews")}</p>
              )
              : reviews.map(r => (
                <div key={r.id} style={s.review}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    {/* Con la foto de quien la escribió: una reseña con cara
                        atrás pesa distinto que un nombre solo. Si no tiene foto
                        —o eligió que no se vea—, queda su inicial. */}
                    <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <Avatar
                        src={r.author?.profilePhotoUrl}
                        initials={initialsOf(r.author)}
                        size={30}
                        alt=""
                      />
                      <span style={s.reviewAuthor}>
                        {nameOf(r.author, tr("profile.userFallback"))}
                      </span>
                    </span>
                    <span style={s.stars}>{"★".repeat(r.rating)}</span>
                  </div>
                  {r.comment && <div style={s.reviewText}>{r.comment}</div>}
                  <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", marginTop: 4 }}>
                    {format(new Date(r.createdAt), "d MMM yyyy", { locale: dateLocale })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {!isMobile && <div>{priceCard()}</div>}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={() => user ? setShowReport(true) : navigate("/login")}
          style={{ background: "none", border: "none", color: "var(--fw-text-4)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
        >
          Reportar esta publicación
        </button>
      </div>

      {showReport && (
        <ReportModal
          targetId={car.id}
          targetLabel={`${car.brand} ${car.model} ${car.year}`}
          targetType="car"
          onClose={() => setShowReport(false)}
        />
      )}
      {showReportUser && (
        <ReportModal
          targetId={car.ownerId}
          targetLabel={car.ownerName}
          targetType="user"
          onClose={() => setShowReportUser(false)}
        />
      )}

      {confirmDelete && (
        <div
          onClick={() => !deleting && setConfirmDelete(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--fw-surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--fw-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)", marginBottom: 6 }}>{tr("car.deleteListing")}</div>
            <div style={{ fontSize: 14, color: "var(--fw-text-3)", lineHeight: 1.6, marginBottom: 24 }}>
              {tr("car.deleteConfirm")} <strong>{car.brand} {car.model} {car.year}</strong>? {tr("car.cannotUndo")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ flex: 1, padding: "12px", background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {tr("common.cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: "12px", background: "var(--fw-red)", border: "none", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? tr("car.deleting") : tr("car.yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Aviso mensaje={aviso} onCerrar={() => setAviso("")} />
    </div>
  );
}