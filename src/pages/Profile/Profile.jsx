// ============================================================================
//  Profile — Pantalla de PERFIL del usuario
// ----------------------------------------------------------------------------
//  QUÉ CAMBIÓ Y POR QUÉ:
//
//  1. NINGÚN DATO INVENTADO. Antes esta pantalla mostraba "4.9 ★", "3 autos
//     publicados", "< 1h de tiempo de respuesta", "Responde en menos de 1 hora ·
//     98% de aceptación" y "Buenos Aires, Argentina" escritos a mano en el
//     código: los mismos números para todo el mundo, incluso para una cuenta
//     creada hace un minuto. Un puntaje falso es peor que no mostrar nada,
//     porque la otra persona decide si confiar con información que no existe.
//     Ahora todo sale del backend: el promedio y la cantidad de reseñas de
//     /users/me, los autos de /listings/me y las reservas de /bookings/me. Si no
//     hay reseñas no se muestra puntaje, se dice que todavía no hay.
//
//  2. RANGOS por reputación real (RankBadge), como cualquier app que lleva
//     historial. Se calcula con cantidad de reseñas Y promedio.
//
//  3. FOTO DE PERFIL: se puede subir, encuadrar, cambiar y quitar. Se guarda en
//     `profilePhotoUrl`, que el backend ya aceptaba pero el front nunca mandaba.
//     Y se elige QUIÉN LA VE: todo el mundo, o solo la gente con la que hay una
//     reserva. Antes había una sola respuesta posible —se veía siempre—, así que
//     quien no estuviera de acuerdo no tenía más opción que no subir ninguna.
//     La opción aparece en dos lugares: al poner la foto (elegirla es parte de
//     ponerla) y acá abajo, para cambiarla cuando se quiera.
//
//  4. Cada fila de verificación tiene el ICONO de lo que verifica (documento,
//     sobre para el email, teléfono, +18 para la edad) en vez del cuadrado vacío
//     que había de placeholder.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useI18n } from "../../i18n/core";
import { getMyIdentity, getMyListings, getMyBookings, getUserReviews, updateMe } from "../../services/api";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import IdentityDocuments from "../../components/IdentityDocuments";
import EscudoDeRango from "../../components/EscudoDeRango";
import PanelDeReputacion from "../../components/PanelDeReputacion";
import { rankOf } from "../../services/rank";
import Avatar from "../../components/Avatar";
import AvatarEditor from "../../components/AvatarEditor";
import PhotoVisibilityChoice from "../../components/PhotoVisibilityChoice";
import { initialsOf, visibilidadDeFoto } from "../../services/people";
import Spinner from "../../components/Spinner";
import StatusChip from "../../components/StatusChip";

// Círculo verde (tilde) o naranja (signo) según algo esté verificado o pendiente.
const StatusBadge = ({ ok, title }) => (
  <div title={title} style={{ width: 24, height: 24, borderRadius: "50%", background: ok ? "var(--fw-green)" : "var(--fw-amber)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {ok
      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 8v5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="16.5" r="1.2" fill="#fff" /></svg>}
  </div>
);

// ── Iconos de cada verificación ───────────────────────────────────────────────
// Trazo plano, el mismo grosor y el mismo tamaño de caja que los iconos del
// menú lateral, así el perfil no parece dibujado por otra persona. Van sobre un
// cuadrado neutro (no un círculo) para que acompañen a las tarjetas de la app.
const ICON = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

// Documento: la tarjeta con la foto chica a la izquierda y los renglones de datos
const IconDocument = ({ color }) => (
  <svg {...ICON} stroke={color}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <rect x="5.5" y="8.5" width="5" height="5.5" rx="1" />
    <path d="M13.5 9.5h5M13.5 12.5h5M13.5 15.5h3" />
  </svg>
);

// Email: el sobre
const IconEnvelope = ({ color }) => (
  <svg {...ICON} stroke={color}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

// Teléfono: el celular con el auricular arriba
const IconPhone = ({ color }) => (
  <svg {...ICON} stroke={color}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M10.5 5.5h3" />
    <path d="M10.5 18.5h3" />
  </svg>
);

// Edad: literalmente "+18" dentro de un marco, que es como se marca en todos lados
const IconAge = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke={color} strokeWidth="1.7" />
    <text x="12" y="15.2" textAnchor="middle" fontSize="8.4" fontWeight="800" fill={color} fontFamily="system-ui, sans-serif">+18</text>
  </svg>
);

// Qué icono le toca a cada fila de verificación.
const ROW_ICONS = { docs: IconDocument, email: IconEnvelope, phone: IconPhone, age: IconAge };

export default function Profile() {
  const { user, refreshUser, isVerified } = useAuth();
  const { isMobile } = useIsMobile();
  const { t: tr, lang } = useI18n();
  const navigate = useNavigate();

  // Al abrir el perfil se relee el estado real de la cuenta desde el backend,
  // así lo que se muestra acá es lo mismo que el servidor va a exigir al
  // publicar o reservar (y no una marca guardada en el navegador).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshUser(); }, []);

  // Mis propios documentos. Cada uno puede ver las fotos que mandó y los datos
  // que se leyeron de ellas; las de los demás no las ve nadie más que el admin.
  const [myDocs, setMyDocs] = useState([]);
  useEffect(() => {
    getMyIdentity()
      .then(list => setMyDocs(Array.isArray(list) ? list : []))
      .catch(() => setMyDocs([]));
  }, []);
  const lastSubmission = myDocs[0] || null;

  // Las cifras REALES del perfil: cuántos autos publiqué y cuántas reservas
  // terminé. Antes estaban escritas a mano en el código.
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      getMyListings().catch(() => []),
      getMyBookings().catch(() => []),
    ]).then(([listings, bookings]) => {
      if (!active) return;
      const cars = Array.isArray(listings) ? listings : [];
      const all = Array.isArray(bookings) ? bookings : [];
      setStats({
        cars: cars.length,
        trips: all.filter(b => b.status === "COMPLETED").length,
      });
    });
    return () => { active = false; };
  }, []);

  /*
    LAS RESEÑAS QUE RECIBÍ.

    Son el respaldo para contar características cuando el servidor todavía no
    devuelve el conteo hecho. Si falla, la planilla muestra igual todo lo demás:
    no se rompe una pantalla entera por una sección.
  */
  const [misReseñas, setMisReseñas] = useState([]);
  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    getUserReviews(user.id)
      .then(list => { if (active) setMisReseñas(Array.isArray(list) ? list : []); })
      .catch(() => { /* sin reseñas: la planilla no muestra características */ });
    return () => { active = false; };
  }, [user?.id]);

  // Todo se deriva directamente del usuario: lo que se edita en Ajustes se ve acá al instante
  const firstName = user?.firstName || (user?.name || "").split(" ")[0] || "";
  const lastName = user?.lastName || (user?.name || "").split(" ").slice(1).join(" ") || "";
  const phone = user?.phone || "";

  const fullName = `${firstName} ${lastName}`.trim() || tr("profile.userFallback");
  const initials = initialsOf({ firstName, lastName });
  const email = user?.email || "—";

  // ── Foto de perfil pública ────────────────────────────────────────────────
  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // La foto elegida, esperando que la persona la encuadre. Recién cuando confirma
  // el encuadre se sube: antes se subía tal cual y el círculo la recortaba por el
  // centro, así que una foto vertical de celular quedaba cortada por la cabeza.
  const [porEncuadrar, setPorEncuadrar] = useState(null);

  /*
    VOLVER A ENCUADRAR UNA FOTO QUE YA ESTÁ PUESTA.

    Al perfil se entra mil veces y a la foto se le acomoda el zoom una sola,
    cuando se sube. Con el lápiz sobre el círculo se vuelve a abrir el mismo
    editor, sin tener que buscar el archivo de nuevo.

    Cuál foto se abre: lo que está guardado en el perfil es el RECORTE, no la
    foto entera. Si se reencuadrara eso, cada vuelta recortaría sobre el recorte
    anterior y la foto se iría achicando. Por eso, si la persona eligió la foto
    en esta misma visita, se guarda el archivo original y es ese el que se
    reabre. Si entró de nuevo más tarde, se baja la foto publicada: no se puede
    alejar más allá de lo que ya se recortó, pero sí acercar y mover, que es
    para lo que se usa.
  */
  const original = useRef(null);
  const [abriendoEditor, setAbriendoEditor] = useState(false);

  const pickPhoto = (event) => {
    const file = event.target.files?.[0];
    // El input se limpia siempre: si no, elegir la misma foto dos veces no dispara el change.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError(tr("profile.photoNotImage")); return; }
    // 6 MB: una foto de celular entra de sobra y evita esperas de un minuto.
    if (file.size > 6 * 1024 * 1024) { setPhotoError(tr("profile.photoTooBig")); return; }
    setPhotoError("");
    original.current = file;
    setPorEncuadrar(file);
  };

  const reencuadrar = async () => {
    if (photoBusy || abriendoEditor) return;
    setPhotoError("");
    // La foto de esta misma visita: se reabre el original, sin recortar de nuevo.
    if (original.current) { setPorEncuadrar(original.current); return; }
    // Sin foto puesta el lápiz hace lo único que se puede hacer: elegir una.
    if (!user?.profilePhotoUrl) { fileRef.current?.click(); return; }
    setAbriendoEditor(true);
    try {
      const respuesta = await fetch(user.profilePhotoUrl, { mode: "cors" });
      if (!respuesta.ok) throw new Error("no se pudo bajar la foto");
      const blob = await respuesta.blob();
      if (!blob.type.startsWith("image/")) throw new Error("no es una imagen");
      setPorEncuadrar(new File([blob], "foto.jpg", { type: blob.type }));
    } catch {
      // Si el navegador no deja leer la foto de otro dominio, no se rompe nada:
      // se avisa y queda a mano el botón de elegirla de nuevo.
      setPhotoError(tr("profile.reframeFailed"));
    } finally {
      setAbriendoEditor(false);
    }
  };

  /**
   * Sube el recorte que devolvió el editor y lo guarda en el perfil, junto con
   * quién eligió que la vea. Las dos cosas van en el mismo PATCH: si se mandaran
   * por separado y la segunda llamada fallara, la foto quedaría publicada con una
   * visibilidad que la persona no eligió.
   */
  const guardarRecorte = async (recorte, quienLaVe) => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const url = await uploadImageToCloudinary(recorte);
      await updateMe({ profilePhotoUrl: url, profilePhotoVisibility: quienLaVe });
      await refreshUser();
      setPorEncuadrar(null);
    } catch (err) {
      setPhotoError(err?.message || tr("profile.photoFailed"));
    } finally {
      setPhotoBusy(false);
    }
  };

  // ── Cambiar quién ve la foto, ya con la foto puesta ──
  // Se guarda al instante y se muestra elegido antes de que conteste el servidor:
  // es un botón de radio, y esperar medio segundo a que se marque se siente roto.
  // Si falla, vuelve a lo que estaba y lo dice.
  const [quienVeLaFoto, setQuienVeLaFoto] = useState(() => visibilidadDeFoto(user));
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  // El valor que manda es el del backend; esto lo sigue cuando cambia el usuario
  // (al entrar, o después de guardar).
  const visibilidadGuardada = visibilidadDeFoto(user);
  const visibilidadPrevia = useRef(visibilidadGuardada);
  useEffect(() => {
    if (visibilidadPrevia.current !== visibilidadGuardada) {
      visibilidadPrevia.current = visibilidadGuardada;
      setQuienVeLaFoto(visibilidadGuardada);
    }
  }, [visibilidadGuardada]);

  const cambiarQuienVeLaFoto = async (valor) => {
    if (valor === quienVeLaFoto || visibilityBusy) return;
    const anterior = quienVeLaFoto;
    setQuienVeLaFoto(valor);
    setVisibilityBusy(true);
    setPhotoError("");
    try {
      await updateMe({ profilePhotoVisibility: valor });
      await refreshUser();
    } catch (err) {
      setQuienVeLaFoto(anterior);
      setPhotoError(err?.message || tr("profile.photoFailed"));
    } finally {
      setVisibilityBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoError("");
    setPhotoBusy(true);
    try {
      await updateMe({ profilePhotoUrl: null });
      // Sin foto no hay original que reencuadrar: si quedara, el lápiz abriría
      // el editor con una foto que ya no está publicada.
      original.current = null;
      await refreshUser();
    } catch (err) {
      setPhotoError(err?.message || tr("profile.photoFailed"));
    } finally {
      setPhotoBusy(false);
    }
  };

  // Checklist REAL de verificación que devuelve el backend.
  const checklist = user?.verification?.checklist || {};
  const emailVerified = checklist.emailVerified ?? !!user?.emailVerifiedAt;
  const phoneVerified = checklist.phoneVerified ?? !!user?.phoneVerifiedAt;
  const documentsSubmitted = checklist.documentsSubmitted === true;
  const fullyVerified = isVerified;
  // El teléfono es opcional salvo que el backend diga lo contrario.
  const phoneRequired = user?.verification?.phoneRequired === true;

  // Reputación real. `ratingCount === 0` significa que NADIE la calificó todavía:
  // en ese caso no hay promedio que mostrar y se dice así.
  const ratingCount = Number(user?.ratingCount) || 0;
  const ratingAverage = ratingCount > 0 && user?.ratingAverage != null ? Number(user.ratingAverage) : null;

  // El idioma elegido manda también en cómo se escribe la fecha.
  const LOCALES = { es: "es-AR", en: "en-US", pt: "pt-BR", it: "it-IT", zh: "zh-CN" };
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(LOCALES[lang] || "es-AR", { month: "long", year: "numeric" })
    : "—";

  const t = {
    card: { background: "var(--fw-surface)", borderRadius: 18, border: "1px solid var(--fw-line)", marginBottom: 20 },
    statCol: { flex: "1 1 150px", padding: isMobile ? "18px 20px" : "24px 28px", minWidth: 0 },
    statNum: { fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "var(--fw-text)" },
    statLabel: { fontSize: 13, color: "var(--fw-text-4)", marginTop: 4 },
    verifyItem: { display: "flex", alignItems: "center", gap: 14, background: "var(--fw-surface-2)", border: "1px solid var(--fw-line-soft)", borderRadius: 12, padding: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 8, background: "var(--fw-surface)", border: "1px solid var(--fw-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    photoBtn: { background: "var(--fw-surface)", border: "1px solid var(--fw-border-2)", color: "var(--fw-text-2)", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  };

  // Bloque de verificaciones: una tarjeta por documento con su estado, y un
  // aviso con botón "Verificar ahora" si falta completar el DNI o la licencia.
  const verifications = () => (
    <div style={{ ...t.card, padding: isMobile ? 20 : 28, flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fw-text)" }}>{tr("profile.identity")}</div>
      <div style={{ fontSize: 13, color: "var(--fw-text-4)", marginBottom: 20 }}>{tr("profile.identitySub")}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {[
          [
            "docs", tr("profile.docs"),
            documentsSubmitted ? (fullyVerified ? tr("profile.docsValidated") : tr("profile.docsInReview")) : tr("profile.docsMissing"),
            documentsSubmitted,
          ],
          [
            "email", tr("profile.emailVerified"),
            emailVerified ? email : tr("profile.emailPending"),
            emailVerified,
          ],
          [
            "phone",
            `${tr("profile.phoneVerified")}${phoneRequired ? "" : ` (${tr("common.optional")})`}`,
            phoneVerified ? `+54 ${phone.slice(0, 2)} ···· ····` : (phone ? tr("profile.phonePending") : tr("profile.phoneMissing")),
            phoneVerified,
          ],
          [
            "age", tr("profile.birthDate"),
            checklist.dateOfBirthProvided ? tr("profile.ageOk") : tr("profile.pending"),
            checklist.dateOfBirthProvided === true,
          ],
        ].map(([key, title, sub, ok]) => {
          const RowIcon = ROW_ICONS[key];
          return (
          <div key={key} style={t.verifyItem}>
            {/* El icono de lo que se verifica. Antes acá había un cuadrado vacío. */}
            <div style={t.iconBox}>
              <RowIcon color={ok ? "#16a34a" : "#9ca3af"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>{title}</div>
              <div style={{ fontSize: 12, color: ok ? "var(--fw-text-4)" : "#ea580c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
            </div>
            <StatusBadge ok={ok} title={ok ? tr("status.verified") : tr("profile.pending")} />
          </div>
          );
        })}
      </div>
      {/* Las fotos que mandé y lo que se leyó de ellas. Solo las ve el dueño de
          la cuenta (y el panel admin): en el perfil de otra persona nunca
          aparecen, porque un DNI a la vista de cualquiera es material para
          suplantar una identidad. */}
      {lastSubmission && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--fw-line-soft)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fw-text)", marginBottom: 3 }}>
            {tr("profile.myDocs")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fw-text-4)", marginBottom: 12 }}>
            {tr("profile.myDocsNote")}
          </div>
          <IdentityDocuments submission={lastSubmission} />
        </div>
      )}

      {!fullyVerified && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 18, padding: "14px 16px", background: "var(--fw-orange-bg)", border: "1px solid var(--fw-orange-line)", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "var(--fw-orange-text)" }}>
            {tr("profile.blockedNote")}
            {" "}{tr("profile.missing")}: {[
              !emailVerified && tr("profile.missEmail"),
              !documentsSubmitted && tr("profile.missDocs"),
              !checklist.dateOfBirthProvided && tr("profile.missBirth"),
              // El teléfono no bloquea: solo se sugiere si además falta.
              phoneRequired && !phoneVerified && tr("profile.missPhone"),
            ].filter(Boolean).join(", ") || tr("profile.missReview")}.
          </div>
          <button onClick={() => navigate("/kyc")} style={{ background: "var(--fw-orange)", color: "#fff", border: "none", borderRadius: 20, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{tr("profile.verifyNow")}</button>
        </div>
      )}
    </div>
  );

  // El Layout provee el sidebar y la topbar; acá solo el contenido
  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Portada + cabecera */}
      <div style={{ ...t.card, overflow: "hidden" }}>
        <div style={{ height: isMobile ? 100 : 140, background: "linear-gradient(90deg,#0a0f1e 0%,var(--fw-blue-strong) 70%,var(--fw-blue) 100%)" }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, padding: isMobile ? "0 20px" : "0 32px", marginTop: isMobile ? -46 : -60, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Avatar
              src={user?.profilePhotoUrl}
              initials={initials}
              size={isMobile ? 92 : 120}
              ring={5}
              alt={fullName}
            />
            {photoBusy && (
              <div style={{
                position: "absolute", inset: 5, borderRadius: "50%",
                background: "rgba(255,255,255,.82)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Spinner size={26} />
              </div>
            )}
            {/* El lápiz, apoyado en el borde del círculo. `minHeight` va en línea
                a propósito: theme.css le pone 40px de alto mínimo a todos los
                botones en celular y sin esto quedaría un óvalo, el mismo problema
                que tenía el corazón de favoritos. */}
            <button
              type="button"
              onClick={reencuadrar}
              disabled={photoBusy || abriendoEditor}
              aria-label={tr(user?.profilePhotoUrl ? "profile.reframe" : "profile.photo")}
              title={tr(user?.profilePhotoUrl ? "profile.reframe" : "profile.photo")}
              style={{
                position: "absolute", right: 2, bottom: 2,
                width: 34, height: 34, minHeight: 34, padding: 0,
                borderRadius: "50%", background: "var(--fw-surface)", border: "1px solid var(--fw-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,.16)",
                cursor: photoBusy || abriendoEditor ? "default" : "pointer",
                opacity: photoBusy ? 0 : 1,
              }}
            >
              {abriendoEditor ? <Spinner size={15} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              )}
            </button>
          </div>

          {/* Subir / cambiar / quitar la foto pública */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 6 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={pickPhoto}
                style={{ display: "none" }}
              />
              <button type="button" disabled={photoBusy} onClick={() => fileRef.current?.click()}
                style={{ ...t.photoBtn, opacity: photoBusy ? .6 : 1, cursor: photoBusy ? "default" : "pointer" }}>
                {user?.profilePhotoUrl ? tr("profile.changePhoto") : tr("profile.photo")}
              </button>
              {user?.profilePhotoUrl && (
                <button type="button" disabled={photoBusy} onClick={removePhoto}
                  style={{ ...t.photoBtn, color: "var(--fw-red-text-2)", opacity: photoBusy ? .6 : 1, cursor: photoBusy ? "default" : "pointer" }}>
                  {tr("profile.removePhoto")}
                </button>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: photoError ? "var(--fw-red-text-2)" : "var(--fw-text-4)", maxWidth: 320 }}>
              {photoError || tr("profile.photoNote")}
            </div>
          </div>
        </div>

        <div style={{ padding: isMobile ? "16px 20px 22px" : "16px 32px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: isMobile ? 23 : 28, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.5px" }}>{fullName}</span>
            {fullyVerified
              ? <StatusChip tone="verified">{tr("status.verified")}</StatusChip>
              : <StatusChip tone="warn">{tr("profile.verificationPending")}</StatusChip>}
            {/*
              LA MEDALLA VA ARRIBA, AL LADO DEL NOMBRE.

              Es el escudo solo, sin la cajita: al lado de un nombre de 28px una
              etiqueta con borde y fondo compite con él, y lo que se tiene que
              leer primero es el nombre. La medalla acompaña; el rango escrito,
              la escalera y todo lo demás están en la planilla de más abajo, que
              es el lugar donde alguien va a MIRAR su reputación y no a
              cruzársela.

              Solo aparece cuando hay reseñas de verdad detrás: sin reseñas no
              hay rango, y un escudo vacío al lado del nombre sería prometer algo
              que todavía no pasó.
            */}
            {ratingCount > 0 && (() => {
              const tier = rankOf(ratingCount, ratingAverage);
              return (
                <span title={tr(`rank.${tier.key}`)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <EscudoDeRango metal={tier.metal} color={tier.color} size={isMobile ? 18 : 21} />
                  <span style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: ".055em",
                    textTransform: "uppercase", color: tier.color, whiteSpace: "nowrap",
                  }}>
                    {tr(`rank.${tier.key}`)}
                  </span>
                </span>
              );
            })()}
          </div>
          <div style={{ fontSize: 14, color: "var(--fw-text-3)" }}>{tr("profile.memberSince", { date: memberSince })}</div>
        </div>
      </div>

      {/* Cifras reales: promedio, autos publicados y reservas terminadas */}
      <div style={{ ...t.card, display: "flex", flexWrap: "wrap" }}>
        <div style={t.statCol}>
          {ratingAverage === null ? (
            <>
              <div style={{ ...t.statNum, fontSize: isMobile ? 15 : 16, color: "var(--fw-text-3)", fontWeight: 700 }}>
                {tr("profile.noRatingYet")}
              </div>
              <div style={t.statLabel}>{tr("profile.reviewsToRate")}</div>
            </>
          ) : (
            <>
              <div style={t.statNum}>{ratingAverage.toFixed(1)} <span style={{ color: "var(--fw-amber)" }}>★</span></div>
              <div style={t.statLabel}>{tr("profile.ratingAvg", { count: ratingCount })}</div>
            </>
          )}
        </div>
        <div style={{ ...t.statCol, borderLeft: isMobile ? "none" : "1px solid var(--fw-line-soft)", borderTop: isMobile ? "1px solid var(--fw-line-soft)" : "none" }}>
          <div style={t.statNum}>{stats ? stats.cars : <Spinner size={18} />}</div>
          <div style={t.statLabel}>{tr("profile.carsPublished")}</div>
        </div>
        <div style={{ ...t.statCol, borderLeft: isMobile ? "none" : "1px solid var(--fw-line-soft)", borderTop: isMobile ? "1px solid var(--fw-line-soft)" : "none" }}>
          <div style={t.statNum}>{stats ? stats.trips : <Spinner size={18} />}</div>
          <div style={t.statLabel}>{tr("profile.tripsDone")}</div>
        </div>
      </div>

      {/* Quién ve la foto. Solo tiene sentido si hay una foto puesta: sin foto no
          hay nada que mostrar ni que esconder. */}
      {user?.profilePhotoUrl && (
        <div style={{ ...t.card, padding: isMobile ? 20 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fw-text)" }}>{tr("profile.photoWho")}</div>
            {visibilityBusy && <Spinner size={14} />}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fw-text-4)", marginBottom: 14 }}>{tr("profile.photoWhoSub")}</div>
          <PhotoVisibilityChoice
            value={quienVeLaFoto}
            onChange={cambiarQuienVeLaFoto}
            disabled={visibilityBusy || photoBusy}
          />
        </div>
      )}

      {/*
        RANGO: LA MISMA PLANILLA QUE VE TODO EL MUNDO.

        Acá había una etiqueta con la medalla y un renglón con lo que faltaba
        para el rango siguiente. El problema no era que estuviera mal, era que
        NO ERA LO QUE VE EL OTRO: la ficha que se abre desde el chat o desde una
        publicación muestra alquileres terminados, atención, puntualidad y las
        características que le pusieron. Uno miraba su perfil, veía una medalla,
        y no tenía idea de qué estaba mostrando de sí mismo.

        Ahora es el mismo cuadro, con `propio` prendido: lo único que se agrega
        es cuánto falta para el rango siguiente, que a un tercero no le importa.
      */}
      <div style={{ ...t.card, padding: isMobile ? 20 : 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fw-text)" }}>{tr("profile.rank")}</div>
        <div style={{ fontSize: 12.5, color: "var(--fw-text-4)", marginBottom: 14 }}>{tr("profile.rankSub")}</div>
        <PanelDeReputacion
          userId={user?.id}
          reviews={misReseñas}
          ratingCount={ratingCount}
          ratingAverage={ratingAverage}
          propio
        />
      </div>

      {/* Verificaciones */}
      {verifications()}

      {/* El encuadre de la foto, sobre todo lo demás */}
      {porEncuadrar && (
        <AvatarEditor
          file={porEncuadrar}
          busy={photoBusy}
          visibility={quienVeLaFoto}
          onCancel={() => { if (!photoBusy) { setPorEncuadrar(null); setPhotoError(""); } }}
          onConfirm={guardarRecorte}
        />
      )}
    </div>
  );
}
