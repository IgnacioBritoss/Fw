// ============================================================================
//  IdentityVerification — Verificación de la cuenta DE VERDAD (KYC)
// ----------------------------------------------------------------------------
//  Para publicar un auto o reservar, el backend exige la cuenta VERIFICADA.
//  Esta pantalla es la que la consigue:
//    1) sube las fotos del DNI y la licencia a Cloudinary,
//    2) las manda a POST /verification/identity/submit, donde un modelo de visión
//       revisa cada una y RECHAZA la que no sea el documento pedido,
//    3) permite confirmar el teléfono (opcional),
//    4) relee el estado real desde GET /verification/me/status.
//
//  Antes solo escribía una marca en el navegador: se veía "Verificado" pero el
//  servidor seguía rechazando publicar y reservar con un 403.
//
<<<<<<< HEAD
//  SOBRE LAS FOTOS: al elegir cada una se la revisa en el momento (POST
//  /ai/document) y se avisa si no corresponde, así el problema se ve antes de
//  enviar y no se puede usar una imagen cualquiera como documento.
=======
//  SOBRE LOS DATOS: la revisión del servidor no mira las fotos por separado, las
//  COTEJA contra el DNI, el CUIL y el domicilio de la cuenta. Si esos datos no
//  están cargados no hay con qué comparar y la solicitud nunca puede aprobarse
//  sola. Por eso se piden acá, en el mismo paso que el DNI, y se validan antes de
//  mandarlos (el CUIL lleva el DNI adentro y un dígito verificador).
//
//  SOBRE LAS FOTOS: al elegir cada una se la revisa en el momento (POST
//  /ai/document) y se avisa si no corresponde, así el problema se ve antes de
//  enviar y no se puede usar una imagen cualquiera como documento. Cada foto se
//  sube con una firma PROPIA de su casilla (DNI frente, DNI dorso, licencia
//  frente, licencia dorso): el servidor rechaza el envío si un archivo no está en
//  la casilla que le corresponde.
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
//
//  SOBRE EL TELÉFONO: mandar un SMS a un número real es un servicio pago, así
//  que el código llega al EMAIL de la persona. Por eso el teléfono no bloquea la
//  verificación: es un paso extra que se puede completar cuando quiera.
//
//  Se usa en el registro (últimos pasos) y en la pantalla /kyc.
//  Props: onDone() al terminar, onCancel() para salir.
// ============================================================================
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
<<<<<<< HEAD
import { uploadImageToCloudinary } from "../services/cloudinary";
import { checkDocument } from "../services/groq";
import PhoneInput from "./PhoneInput";
import { normalizeArgentinePhone } from "../services/phone";
import {
  confirmPhoneCode, getVerificationStatus,
  requestPhoneCode, submitIdentity, updateMe,
} from "../services/api";

const STEPS = ["Identidad", "Licencia", "Teléfono", "Confirmación"];
=======
import { uploadIdentityDocument } from "../services/cloudinary";
import { checkDocument } from "../services/groq";
import PhoneInput from "./PhoneInput";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";
import { normalizeArgentinePhone } from "../services/phone";
import {
  claveDelError, cuilCoincideConDni, dniDelCuil, motivoDeRevision,
  normalizarCuil, normalizarDni, problemaDeIdentidad,
} from "../services/identity";
import {
  confirmPhoneCode, getVerificationStatus, requestPhoneCode,
  retryIdentityReview, submitIdentity, updateMe,
} from "../services/api";

// Los pasos se guardan como CLAVES y se traducen al dibujar el Stepper.
const STEPS = ["kyc.stepIdentity", "kyc.stepLicense", "kyc.stepPhone", "kyc.stepDone"];
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

// En celular: menos aire, campos de 16px (con menos, Safari en iPhone hace zoom
// solo al tocarlos) y botones de ancho completo, alcanzables con el pulgar.
const styles = (isMobile) => ({
  card: { maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 18, padding: isMobile ? 18 : 32, boxShadow: "0 4px 24px rgba(0,0,0,.06)", border: "1px solid #f0f0f0" },
  title: { fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  btnPrimary: { padding: isMobile ? "14px 22px" : "12px 22px", width: isMobile ? "100%" : undefined, background: "#2563eb", color: "#fff", border: "none", borderRadius: 24, fontSize: isMobile ? 15 : 14, fontWeight: 700, cursor: "pointer" },
  btnGhost: { padding: isMobile ? "14px 22px" : "12px 22px", width: isMobile ? "100%" : undefined, background: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 24, fontSize: isMobile ? 15 : 14, fontWeight: 600, cursor: "pointer" },
  skip: { display: "block", width: "100%", marginTop: 16, padding: 6, background: "none", border: "none", color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center", textDecoration: "underline" },
  error: { background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 16 },
  info: { background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", color: "#1e40af", fontSize: 13, marginBottom: 16 },
  input: { width: "100%", padding: isMobile ? "13px 14px" : "11px 14px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: isMobile ? 16 : 14, outline: "none", color: "#111827", boxSizing: "border-box" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  codeInput: { width: "100%", padding: 14, borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: isMobile ? 23 : 26, fontWeight: 700, letterSpacing: isMobile ? 8 : 10, textAlign: "center", outline: "none", color: "#111827", boxSizing: "border-box", marginBottom: 12 },
  codeBox: { background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#374151", marginBottom: 16, lineHeight: 1.6 },
  /** Fila de botones: en celular se apilan y ocupan todo el ancho. */
  actions: isMobile
    ? { display: "flex", flexDirection: "column-reverse", gap: 10 }
    : { display: "flex", justifyContent: "flex-end", gap: 12 },
});

/**
 * Tarjeta para subir una foto de documento. Al elegir el archivo pide la revisión
 * automática y muestra el resultado: "corresponde", "no corresponde" (con el
 * motivo) o "no se pudo revisar".
 */
function PhotoCard({ id, label, hint, kind, value, review, onChange }) {
<<<<<<< HEAD
=======
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const border =
    review?.state === "invalid" ? "1.5px solid #dc2626"
      : review?.state === "ok" ? "1.5px solid #16a34a"
        : value ? "1.5px solid #2563eb" : "1px solid #e5e7eb";

  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div onClick={() => document.getElementById(id)?.click()}
        style={{ border, borderRadius: 14, padding: 14, cursor: "pointer", background: "#fff" }}>
        <input id={id} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
<<<<<<< HEAD
            if (file.size > 5 * 1024 * 1024) { onChange(null, "La foto no puede pesar más de 5MB.", kind); return; }
=======
            if (file.size > 5 * 1024 * 1024) { onChange(null, tr("kyc.errTooBig"), kind); return; }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            const reader = new FileReader();
            reader.onload = (ev) => onChange(ev.target.result, null, kind);
            reader.readAsDataURL(file);
          }} />
        <div style={{ position: "relative", width: "100%", height: 120, borderRadius: 10, overflow: "hidden", background: value ? "#1f2937" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          {value ? (
            <img src={value} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
<<<<<<< HEAD
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Elegir foto</span>
=======
            <span style={{ fontSize: 13, color: "#9ca3af" }}>{tr("kyc.pickPhoto")}</span>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{hint}</div>
      </div>

      {/* Resultado de la revisión automática de esta foto */}
      {review?.state === "checking" && (
<<<<<<< HEAD
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Revisando la foto...</div>
      )}
      {review?.state === "ok" && (
        <div style={{ fontSize: 12, color: "#166534", marginTop: 6, fontWeight: 600 }}>
          Verificada: es el documento correcto
=======
        <Spinner size={13} label={tr("kyc.checkingPhoto")} />
      )}
      {review?.state === "ok" && (
        <div style={{ fontSize: 12, color: "#166534", marginTop: 6, fontWeight: 600 }}>
          {tr("kyc.photoOk")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      )}
      {review?.state === "invalid" && (
        <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
<<<<<<< HEAD
          No corresponde. {review.reason}
=======
          {tr("kyc.photoBad")} {review.reasonKey ? tr(review.reasonKey) : review.reason}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      )}
      {/*
        No se pudo revisar. Antes acá decía "se envía igual", y eso terminó
        significando que la foto quedaba APROBADA sin que nadie la mirara: así una
        foto de un perro pasó como DNI el día que el modelo de la IA se dio de
        baja. Ahora se dice lo que realmente va a pasar: la manda, pero la cuenta
        no queda verificada hasta que un administrador revise la foto a mano.
      */}
      {review?.state === "unknown" && (
        <div style={{ fontSize: 12, color: "#92400e", marginTop: 6, lineHeight: 1.5 }}>
<<<<<<< HEAD
          No pudimos revisar esta foto automáticamente. La podés enviar igual, pero
          la cuenta no queda verificada hasta que un administrador la revise a mano.
          {review.reason ? ` (${review.reason})` : ""}
=======
          {tr("kyc.photoUnknown")}
          {review.reasonKey ? ` (${tr(review.reasonKey)})` : review.reason ? ` (${review.reason})` : ""}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        </div>
      )}
    </div>
  );
}

// Barra de pasos de arriba.
function Stepper({ current, steps, isMobile }) {
<<<<<<< HEAD
=======
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 26 : 40, flexWrap: "wrap" }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              background: i < current ? "#16a34a" : i === current ? "#2563eb" : "#fff",
              color: i <= current ? "#fff" : "#9ca3af",
              border: i > current ? "1.5px solid #e5e7eb" : "none",
            }}>{i < current ? "✓" : i + 1}</div>
<<<<<<< HEAD
            <span style={{ fontSize: 12, fontWeight: 600, color: i === current ? "#111827" : "#9ca3af" }}>{label}</span>
=======
            <span style={{ fontSize: 12, fontWeight: 600, color: i === current ? "#111827" : "#9ca3af" }}>{tr(label)}</span>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: isMobile ? 22 : 90, height: 2, margin: isMobile ? "0 4px" : "0 10px", marginBottom: 24, background: i < current ? "#16a34a" : i === current ? "#2563eb" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function IdentityVerification({ onDone, onCancel }) {
<<<<<<< HEAD
=======
  const { t: tr } = useI18n();
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const { isMobile } = useIsMobile();
  const st = styles(isMobile);
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);       // 0=DNI, 1=licencia, 2=teléfono, 3=confirmación
<<<<<<< HEAD
=======
  // Los datos que la revisión coteja contra los documentos.
  //
  // Se guarda SOLO lo que la persona escribió, y lo que no escribió se lee de la
  // cuenta. Es a propósito: el perfil llega del servidor un instante después de
  // que se dibuja la pantalla, así que copiarlo al estado inicial dejaba los tres
  // campos vacíos aunque estuvieran cargados (y hacía retipear el DNI). Al
  // derivarlos, se completan solos en cuanto el perfil llega, y desde el primer
  // tecleo manda lo que está en pantalla.
  const [editado, setEditado] = useState({});
  const datos = {
    dni: editado.dni ?? user?.dni ?? "",
    cuil: editado.cuil ?? user?.cuil ?? "",
    address: editado.address ?? user?.address ?? "",
  };
  const setDatos = (actualizar) =>
    setEditado((previo) => actualizar({
      dni: previo.dni ?? user?.dni ?? "",
      cuil: previo.cuil ?? user?.cuil ?? "",
      address: previo.address ?? user?.address ?? "",
    }));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  const [docs, setDocs] = useState({ dniFront: null, dniBack: null, licFront: null, licBack: null });
  const [reviews, setReviews] = useState({}); // resultado de la revisión por foto
  const [docsConfirmed, setDocsConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // checklist real del backend
  // Solo los dígitos que van DESPUÉS del 54 (el "+54" lo pone PhoneInput).
  const [phone, setPhone] = useState(() => String(user?.phone || "").replace(/\D/g, "").replace(/^54/, ""));
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeHint, setCodeHint] = useState(null); // por dónde llegó y, en demo, cuál es

  // Estado real de la verificación al abrir la pantalla.
  const loadStatus = async () => {
    const fresh = await getVerificationStatus().catch(() => null);
    if (fresh) setStatus(fresh);
    return fresh;
  };
<<<<<<< HEAD
  useEffect(() => { loadStatus(); }, []);
=======
  // También se relee el perfil: el DNI, el CUIL y el domicilio salen de ahí, y la
  // sesión guardada en el navegador puede ser de antes de que esos campos
  // existieran. Sin esto los campos aparecían vacíos aunque estuvieran cargados.
  useEffect(() => { loadStatus(); refreshUser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a

  const checklist = status?.checklist || {};
  // El backend informa si el teléfono es obligatorio. Hoy no lo es, porque el
  // envío por SMS es un servicio pago.
  const phoneRequired = status?.phoneRequired === true;

<<<<<<< HEAD
=======
  // Con la identidad ya verificada estos datos quedan inmutables del lado del
  // servidor (cambiarlos rompería la garantía de que la cuenta es de la persona
  // de los documentos). Se muestran, pero de solo lectura: mandarlos daría 403.
  const datosBloqueados =
    status?.fullyVerified === true || user?.verificationStatus === "VERIFIED";

  // El CUIL lleva el DNI adentro, así que en cuanto los dos están escritos se
  // puede avisar sin esperar al servidor. Se muestra el DNI que el CUIL contiene
  // porque casi siempre el tipeado mal es uno de los dos, y verlo dice cuál.
  const cuilLimpio = normalizarCuil(datos.cuil);
  const dniLimpio = normalizarDni(datos.dni);
  const sugerenciaCuil =
    cuilLimpio && dniLimpio.length >= 7 && !cuilCoincideConDni(dniLimpio, cuilLimpio)
      ? String(Number(dniDelCuil(cuilLimpio)))
      : null;

  // Motivos de la última revisión, ya traducidos. Sin esto, una solicitud queda
  // "en revisión" sin decir qué le faltó, y la persona no sabe qué corregir.
  const motivos = (status?.lastReview?.reasonCodes ?? []).map(motivoDeRevision);
  // Un código que este front todavía no conoce se muestra tal cual: es feo, pero
  // es información, y es mejor que esconder el motivo del rechazo.
  const textoDeMotivo = ({ code, clave }) => (clave ? tr(clave) : code);
  // Reintentar solo tiene sentido con una solicitud pendiente: con veredicto, el
  // backend contesta 400 REVIEW_NOT_PENDING. Que el campo exista es además la
  // señal de que este backend tiene el endpoint.
  const puedeReintentar = status?.lastReview?.outcome === "pending";

>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
  /** Guarda la foto elegida y dispara su revisión automática. */
  const handlePhoto = (key) => async (value, err, kind) => {
    if (err) { setError(err); return; }
    setError("");
    setDocs(d => ({ ...d, [key]: value }));
    setReviews(r => ({ ...r, [key]: { state: "checking" } }));

    const result = await checkDocument(value, kind).catch(() => null);
    setReviews(r => ({
      ...r,
      [key]: result?.matches === true ? { state: "ok" }
<<<<<<< HEAD
        : result?.matches === false ? { state: "invalid", reason: result.reason || "" }
          // No se pudo revisar: se muestra el motivo real. Si el servidor no
          // tiene la clave de la IA no es lo mismo que si la foto era ilegible,
          // y antes las dos cosas llegaban como el mismo aviso genérico.
          : { state: "unknown", code: result?.code, reason: result?.reason || "" },
=======
        : result?.matches === false ? { state: "invalid", reason: result.reason || "", reasonKey: result.reasonKey }
          // No se pudo revisar: se muestra el motivo real. Si el servidor no
          // tiene la clave de la IA no es lo mismo que si la foto era ilegible,
          // y antes las dos cosas llegaban como el mismo aviso genérico.
          : { state: "unknown", code: result?.code, reason: result?.reason || "", reasonKey: result?.reasonKey },
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    }));
  };

  /**
<<<<<<< HEAD
   * Sube las cuatro fotos y las manda al backend, que vuelve a revisarlas del
   * lado del servidor antes de aprobar (el chequeo del navegador es solo para
   * avisar antes).
=======
   * Guarda el DNI, el CUIL y el domicilio. Devuelve si se puede seguir.
   *
   * Se valida acá antes de mandar porque el servidor contesta con un código
   * (CUIL_DNI_MISMATCH) recién al final del pedido, y un dígito mal tipeado tiene
   * que avisarse en el campo, en el momento.
   */
  const guardarDatos = async () => {
    if (datosBloqueados) return true;

    const problema = problemaDeIdentidad(datos);
    if (problema) { setError(tr(problema)); return false; }

    setBusy(true); setError(""); setInfo("");
    try {
      const perfil = await updateMe({
        dni: normalizarDni(datos.dni),
        cuil: normalizarCuil(datos.cuil),
        address: datos.address.trim(),
      });
      await refreshUser();

      // Backend anterior, sin estos campos: se avisa y se sigue. Antes de que
      // existiera el cotejo documental la verificación funcionaba sin ellos, así
      // que trabar el trámite acá sería peor que decir lo que va a pasar.
      if (perfil && perfil.dni == null) setInfo(tr("kyc.dataNotYet"));
      return true;
    } catch (err) {
      const clave = claveDelError(err);
      setError(clave ? tr(clave) : err.message || tr("kyc.errSaveData"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /**
   * Sube las cuatro fotos y las manda al backend, que vuelve a revisarlas del
   * lado del servidor antes de aprobar (el chequeo del navegador es solo para
   * avisar antes).
   *
   * Cada foto va con la firma de SU casilla: el servidor comprueba que el archivo
   * esté en la carpeta de esta cuenta y que su nombre empiece con el slot que le
   * toca. Subirlas todas con la firma genérica hacía que el envío terminara en un
   * 400 DOCUMENT_SLOT_MISMATCH y nadie pudiera verificarse.
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
   */
  const submitDocuments = async () => {
    setBusy(true); setError(""); setInfo("");
    try {
      const [dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl] = await Promise.all([
<<<<<<< HEAD
        uploadImageToCloudinary(docs.dniFront),
        uploadImageToCloudinary(docs.dniBack),
        uploadImageToCloudinary(docs.licFront),
        uploadImageToCloudinary(docs.licBack),
=======
        uploadIdentityDocument(docs.dniFront, { document: "dni", side: "front" }),
        uploadIdentityDocument(docs.dniBack, { document: "dni", side: "back" }),
        uploadIdentityDocument(docs.licFront, { document: "license", side: "front" }),
        uploadIdentityDocument(docs.licBack, { document: "license", side: "back" }),
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      ]);
      const submission = await submitIdentity({ dniFrontUrl, dniBackUrl, licenseFrontUrl, licenseBackUrl });
      const fresh = await loadStatus();
      await refreshUser();

<<<<<<< HEAD
      // El backend puede rechazar la documentación al revisarla.
      if (submission?.status === "REJECTED") {
        setError(submission.notes || "La documentación no pasó la revisión. Revisá las fotos y volvé a enviarlas.");
=======
      // El backend puede rechazar la documentación al revisarla. Los motivos
      // vienen en códigos: se traducen, porque "REJECTED" a secas no dice qué
      // corregir. (`notes` es el texto del backend anterior.)
      if (submission?.status === "REJECTED") {
        const porQue = (submission.reasonCodes ?? []).map(motivoDeRevision).map(textoDeMotivo);
        setError(
          porQue.length
            ? `${tr("kyc.rejectedNote")} ${porQue.join(" ")}`
            : submission.notes || tr("kyc.rejectedNote"),
        );
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
        setBusy(false);
        return;
      }

      // Si no quedó verificada en el momento, es porque la revisión automática no
      // pudo decidir y la solicitud está esperando a un administrador. Decirlo,
      // en vez de un "enviada correctamente" que deja pensando si falta algo.
      setInfo(
        fresh?.fullyVerified
<<<<<<< HEAD
          ? "Documentación aprobada: tu cuenta quedó verificada."
          : "Documentación enviada. Un administrador va a revisar las fotos y te avisamos cuando la cuenta quede verificada.",
      );
      setStep(2);
    } catch (err) {
      setError(err.message || "No pudimos enviar la documentación. Probá de nuevo.");
=======
          ? tr("kyc.approvedNote")
          : tr("kyc.pendingNote"),
      );
      setStep(2);
    } catch (err) {
      const clave = claveDelError(err);
      setError(clave ? tr(clave) : err.message || tr("kyc.errSend"));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Vuelve a correr la revisión de la solicitud pendiente.
   *
   * Hace falta porque la revisión corre dentro del pedido y puede quedar sin
   * veredicto por algo pasajero (el proveedor tardó de más, se cayó la lectura).
   * Sin este botón, la única salida era mandar las cuatro fotos otra vez. También
   * sirve después de corregir el DNI o el CUIL: la revisión los vuelve a cotejar.
   */
  const reintentarRevision = async () => {
    setBusy(true); setError(""); setInfo("");
    try {
      const fresh = await retryIdentityReview();
      if (fresh) setStatus(fresh);
      await refreshUser();
      setInfo(fresh?.fullyVerified ? tr("kyc.approvedNote") : tr("kyc.retryPending"));
    } catch (err) {
      const clave = claveDelError(err);
      setError(clave ? tr(clave) : err.message || tr("kyc.errRetry"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    } finally {
      setBusy(false);
    }
  };

  // Guarda el teléfono (si cambió) y pide el código de verificación.
  const sendPhoneCode = async () => {
    setPhoneTouched(true);
    const full = normalizeArgentinePhone(`54${phone}`);
    if (!full) {
<<<<<<< HEAD
      setError("El teléfono tiene que ser un celular argentino completo: 9 + código de área + número (ejemplo 9 11 3289 5416). El servicio funciona solo en Argentina.");
=======
      setError(tr("kyc.errPhone"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
      return;
    }
    setBusy(true); setError(""); setInfo("");
    try {
      if (full !== user?.phone) await updateMe({ phone: full });
      const result = await requestPhoneCode();
      setCodeSent(true);
      setCodeHint(result || null);
      setInfo(
        result?.channel === "email"
<<<<<<< HEAD
          ? `Te enviamos el código a ${result.sentTo}. El envío por SMS todavía no está habilitado, así que llega por email.`
          : "Te enviamos el código por SMS.",
      );
    } catch (err) {
      setError(err.message || "No pudimos enviar el código.");
=======
          ? tr("kyc.codeToEmail", { email: result.sentTo })
          : tr("kyc.codeBySms"),
      );
    } catch (err) {
      setError(err.message || tr("email.errSend"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    } finally {
      setBusy(false);
    }
  };

  // Confirma el código del teléfono.
  const verifyPhone = async () => {
<<<<<<< HEAD
    if (code.length !== 6) { setError("El código tiene 6 dígitos."); return; }
=======
    if (code.length !== 6) { setError(tr("reg.errCode")); return; }
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    setBusy(true); setError(""); setInfo("");
    try {
      await confirmPhoneCode(code);
      await loadStatus();
      await refreshUser();
      setStep(3);
    } catch (err) {
<<<<<<< HEAD
      setError(err.message || "El código no es correcto.");
=======
      setError(err.message || tr("kyc.errBadCode"));
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await refreshUser();
    onDone?.();
  };

  const docsReady = docs.dniFront && docs.dniBack;
  const licenseReady = docs.licFront && docs.licBack;
  // Una foto que la revisión marcó como "no corresponde" bloquea el envío.
  const hasInvalid = Object.values(reviews).some(r => r?.state === "invalid");
  const isChecking = Object.values(reviews).some(r => r?.state === "checking");
  // Fotos que la IA no pudo revisar. NO pasan solas: hace falta que la persona
  // marque la casilla. Antes pasaban sin que nada lo dijera, y así una foto de un
  // perro llegó a quedar como DNI el día que el modelo de Groq se dio de baja.
  const sinRevisar = Object.values(reviews).filter(r => r?.state === "unknown").length;
  const faltaConfirmar = sinRevisar > 0 && !docsConfirmed;

  return (
    <div>
      <Stepper current={step} steps={STEPS} isMobile={isMobile} />
      <div style={st.card}>
        {error && <div style={st.error}>{error}</div>}
        {info && <div style={st.info}>{info}</div>}

        {/* PASO 0: DNI */}
        {step === 0 && (
          <>
<<<<<<< HEAD
            <h2 style={st.title}>Verificá tu identidad</h2>
            <p style={st.sub}>
              Subí las fotos de tu DNI. Cada foto se revisa automáticamente: si no
              es un documento, te lo avisamos antes de enviarla.
            </p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-dni-front" label="Frente del DNI" hint="Cara visible, sin reflejo"
                kind="DNI_FRONT" value={docs.dniFront} review={reviews.dniFront} onChange={handlePhoto("dniFront")} />
              <PhotoCard id="iv-dni-back" label="Dorso del DNI" hint="Número y fecha legibles"
                kind="DNI_BACK" value={docs.dniBack} review={reviews.dniBack} onChange={handlePhoto("dniBack")} />
            </div>
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Consejos para tus fotos</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Buena iluminación", "Sin cortes ni reflejos", "JPG o PNG hasta 5MB"].map(tip => (
                  <div key={tip} style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f4f6", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#374151" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a" }} />{tip}
=======
            <h2 style={st.title}>{tr("kyc.identityTitle")}</h2>
            <p style={st.sub}>{tr("kyc.identitySub")}</p>

            {/* Ya hay documentos esperando revisión.
                Esto es lo que hace que corregir un dato sirva: la revisión coteja
                los datos de la cuenta contra los documentos ya enviados, así que
                si lo que falló fue el CUIL o el domicilio se arregla acá y se
                vuelve a revisar. Sin este botón habría que sacar y subir otra vez
                las cuatro fotos para cambiar un dígito. */}
            {puedeReintentar && (
              <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: isMobile ? 13 : 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                  {tr("kyc.alreadySent")}
                </div>
                {motivos.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {motivos.map((motivo) => (
                      <div key={motivo.code} style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
                        · {textoDeMotivo(motivo)}
                      </div>
                    ))}
                  </div>
                )}
                <button style={{ ...st.btnGhost, opacity: busy ? 0.6 : 1 }} disabled={busy}
                  onClick={async () => {
                    if (!(await guardarDatos())) return;
                    await reintentarRevision();
                    setStep(3);
                  }}>
                  {busy ? tr("verify.checking") : tr("kyc.saveAndRetry")}
                </button>
              </div>
            )}

            {/* Los datos que la revisión COTEJA contra los documentos.
                Van antes de las fotos porque es el orden en que se piensan: primero
                quién sos, después la prueba. Y sin ellos la revisión no puede
                aprobar: el backend compara lo que se escribe acá con lo que lee del
                DNI y de la licencia. Una vez verificada la cuenta quedan
                bloqueados, así que se muestran de solo lectura. */}
            <div style={{ background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 12, padding: isMobile ? 14 : 18, marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>
                {tr("kyc.dataTitle")}
              </div>
              <div style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14, lineHeight: 1.5 }}>
                {datosBloqueados ? tr("kyc.dataLocked") : tr("kyc.dataSub")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={st.label} htmlFor="iv-dni">{tr("kyc.dniNumber")}</label>
                  <input id="iv-dni" style={st.input} inputMode="numeric" autoComplete="off"
                    placeholder={tr("kyc.dniPlaceholder")} value={datos.dni} disabled={datosBloqueados}
                    onChange={(e) => setDatos(d => ({ ...d, dni: e.target.value.replace(/\D/g, "").slice(0, 8) }))} />
                </div>
                <div>
                  <label style={st.label} htmlFor="iv-cuil">{tr("kyc.cuil")}</label>
                  <input id="iv-cuil" style={st.input} inputMode="numeric" autoComplete="off"
                    placeholder={tr("kyc.cuilPlaceholder")} value={datos.cuil} disabled={datosBloqueados}
                    onChange={(e) => setDatos(d => ({ ...d, cuil: e.target.value.replace(/[^\d-]/g, "").slice(0, 13) }))} />
                  {/* El CUIL lleva el DNI adentro: en cuanto los dos están
                      escritos se puede decir si no se corresponden, sin esperar
                      al servidor. */}
                  {sugerenciaCuil && (
                    <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 5, lineHeight: 1.5 }}>
                      {tr("kyc.cuilHintDni", { dni: sugerenciaCuil })}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                  <label style={st.label} htmlFor="iv-address">{tr("kyc.address")}</label>
                  <input id="iv-address" style={st.input} autoComplete="street-address"
                    placeholder={tr("kyc.addressPlaceholder")} value={datos.address} disabled={datosBloqueados}
                    onChange={(e) => setDatos(d => ({ ...d, address: e.target.value }))} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-dni-front" label={tr("kyc.dniFront")} hint={tr("kyc.dniFrontHint")}
                kind="DNI_FRONT" value={docs.dniFront} review={reviews.dniFront} onChange={handlePhoto("dniFront")} />
              <PhotoCard id="iv-dni-back" label={tr("kyc.dniBack")} hint={tr("kyc.dniBackHint")}
                kind="DNI_BACK" value={docs.dniBack} review={reviews.dniBack} onChange={handlePhoto("dniBack")} />
            </div>
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{tr("kyc.tips")}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["kyc.tip1", "kyc.tip2", "kyc.tip3"].map(tip => (
                  <div key={tip} style={{ display: "flex", alignItems: "center", gap: 7, background: "#f3f4f6", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "#374151" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a" }} />{tr(tip)}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </div>
                ))}
              </div>
            </div>
            {/* Si la IA no pudo revisar una foto, no se avanza sin que la persona
                lo confirme. Es la alternativa a dejarlo pasar en silencio (lo de
                antes) y a trabar la verificación del todo cuando el servicio de IA
                está caído. */}
            {sinRevisar > 0 && (
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "11px 13px", marginBottom: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={docsConfirmed}
                  onChange={(e) => setDocsConfirmed(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
<<<<<<< HEAD
                  No pudimos revisar {sinRevisar === 1 ? "una foto" : `${sinRevisar} fotos`} automáticamente.
                  Confirmo que son de mis documentos reales. Un administrador las va a
                  mirar antes de verificar la cuenta.
                </span>
              </label>
            )}
            <div style={st.actions}>
              {onCancel && <button style={st.btnGhost} onClick={onCancel}>Cancelar</button>}
              <button style={{ ...st.btnPrimary, opacity: docsReady && !hasInvalid && !isChecking && !faltaConfirmar ? 1 : 0.5, cursor: docsReady && !hasInvalid && !isChecking && !faltaConfirmar ? "pointer" : "not-allowed" }}
                disabled={!docsReady || hasInvalid || isChecking || faltaConfirmar}
                onClick={() => { setError(""); setStep(1); }}>Continuar →</button>
=======
                  {tr(sinRevisar === 1 ? "kyc.confirmOne" : "kyc.confirmMany", { count: sinRevisar })}
                </span>
              </label>
            )}
            {/* El botón NO se deshabilita por los datos, solo por las fotos: un
                dígito verificador mal no se ve mirando la pantalla, así que al
                apretar se explica qué está mal en vez de dejar un botón gris sin
                motivo. Los datos se guardan acá, al pasar de paso, para que la
                revisión del envío ya los tenga. */}
            <div style={st.actions}>
              {onCancel && <button style={st.btnGhost} onClick={onCancel}>{tr("common.cancel")}</button>}
              <button style={{ ...st.btnPrimary, opacity: docsReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? 1 : 0.5, cursor: docsReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? "pointer" : "not-allowed" }}
                disabled={!docsReady || hasInvalid || isChecking || busy || faltaConfirmar}
                onClick={async () => { if (await guardarDatos()) setStep(1); }}>
                {busy ? tr("common.saving") : tr("common.continue")}
              </button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>
          </>
        )}

        {/* PASO 1: LICENCIA */}
        {step === 1 && (
          <>
<<<<<<< HEAD
            <h2 style={st.title}>Tu licencia de conducir</h2>
            <p style={st.sub}>Subí ambos lados de tu licencia vigente. Al continuar enviamos los cuatro documentos a validar.</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-lic-front" label="Frente de la licencia" hint="Foto y datos visibles"
                kind="LICENSE_FRONT" value={docs.licFront} review={reviews.licFront} onChange={handlePhoto("licFront")} />
              <PhotoCard id="iv-lic-back" label="Dorso de la licencia" hint="Categorías y vencimiento"
                kind="LICENSE_BACK" value={docs.licBack} review={reviews.licBack} onChange={handlePhoto("licBack")} />
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>
              Tus datos se usan únicamente para validar tu identidad. Del documento
              se registran el número, el nombre y el vencimiento.
=======
            <h2 style={st.title}>{tr("kyc.licenseTitle")}</h2>
            <p style={st.sub}>{tr("kyc.licenseSub")}</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-lic-front" label={tr("kyc.licFront")} hint={tr("kyc.licFrontHint")}
                kind="LICENSE_FRONT" value={docs.licFront} review={reviews.licFront} onChange={handlePhoto("licFront")} />
              <PhotoCard id="iv-lic-back" label={tr("kyc.licBack")} hint={tr("kyc.licBackHint")}
                kind="LICENSE_BACK" value={docs.licBack} review={reviews.licBack} onChange={handlePhoto("licBack")} />
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>
              {tr("kyc.dataNote")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>
                        {/* Si la IA no pudo revisar una foto, no se avanza sin que la persona
                lo confirme. Es la alternativa a dejarlo pasar en silencio (lo de
                antes) y a trabar la verificación del todo cuando el servicio de IA
                está caído. */}
            {sinRevisar > 0 && (
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "11px 13px", marginBottom: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={docsConfirmed}
                  onChange={(e) => setDocsConfirmed(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
<<<<<<< HEAD
                  No pudimos revisar {sinRevisar === 1 ? "una foto" : `${sinRevisar} fotos`} automáticamente.
                  Confirmo que son de mis documentos reales. Un administrador las va a
                  mirar antes de verificar la cuenta.
=======
                  {tr(sinRevisar === 1 ? "kyc.confirmOne" : "kyc.confirmMany", { count: sinRevisar })}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                </span>
              </label>
            )}
            <div style={st.actions}>
<<<<<<< HEAD
              <button style={st.btnGhost} onClick={() => setStep(0)}>Atrás</button>
              <button style={{ ...st.btnPrimary, opacity: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? 1 : 0.5, cursor: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? "pointer" : "not-allowed" }}
                disabled={!licenseReady || hasInvalid || isChecking || busy || faltaConfirmar} onClick={submitDocuments}>
                {busy ? "Enviando documentación..." : "Enviar y continuar →"}
=======
              <button style={st.btnGhost} onClick={() => setStep(0)}>{tr("common.back")}</button>
              <button style={{ ...st.btnPrimary, opacity: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? 1 : 0.5, cursor: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? "pointer" : "not-allowed" }}
                disabled={!licenseReady || hasInvalid || isChecking || busy || faltaConfirmar} onClick={submitDocuments}>
                {busy ? tr("kyc.sending") : tr("kyc.sendAndContinue")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
              </button>
            </div>
          </>
        )}

        {/* PASO 2: TELÉFONO (opcional) */}
        {step === 2 && (
          <>
<<<<<<< HEAD
            <h2 style={st.title}>Verificá tu teléfono</h2>
            <p style={st.sub}>
              {phoneRequired
                ? "Es el último dato que falta para habilitar tu cuenta."
                : "Es un paso opcional: tu cuenta ya queda habilitada sin esto. Sirve para que el dueño o el conductor puedan contactarte."}
            </p>

            {checklist.phoneVerified ? (
              <div style={{ ...st.info, marginBottom: 20 }}>Tu teléfono ya está verificado.</div>
            ) : !codeSent ? (
              <>
                <PhoneInput label="Teléfono" value={phone} showError={phoneTouched}
                  onChange={setPhone} style={{ marginBottom: 16 }} />
                <div style={st.codeBox}>
                  El código de confirmación llega a <strong>tu email</strong>, no por
                  SMS: enviar mensajes a un número es un servicio pago que todavía
                  no está contratado. El número igual queda registrado y confirmado.
                </div>
                <div style={st.actions}>
                  <button style={st.btnGhost} onClick={() => setStep(1)}>Atrás</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={sendPhoneCode}>
                    {busy ? "Enviando..." : "Enviarme el código"}
=======
            <h2 style={st.title}>{tr("kyc.phoneTitle")}</h2>
            <p style={st.sub}>
              {tr(phoneRequired ? "kyc.phoneRequired" : "kyc.phoneOptional")}
            </p>

            {checklist.phoneVerified ? (
              <div style={{ ...st.info, marginBottom: 20 }}>{tr("kyc.phoneDone")}</div>
            ) : !codeSent ? (
              <>
                <PhoneInput label={tr("auth.phone")} value={phone} showError={phoneTouched}
                  onChange={setPhone} style={{ marginBottom: 16 }} />
                <div style={st.codeBox}>
                  {tr("kyc.smsNote")}
                </div>
                <div style={st.actions}>
                  <button style={st.btnGhost} onClick={() => setStep(1)}>{tr("common.back")}</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={sendPhoneCode}>
                    {busy ? tr("common.sending") : tr("email.sendCode")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Modo demostración: el backend devuelve el código y se muestra
                    acá, para poder completar el circuito sin esperar el mail. */}
                {codeHint?.code && (
                  <div style={st.codeBox}>
<<<<<<< HEAD
                    Modo demostración: tu código es{" "}
=======
                    {tr("kyc.demoCode")}{" "}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                    <strong style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 2 }}>{codeHint.code}</strong>
                  </div>
                )}
                <input style={st.codeInput} type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyPhone()} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
<<<<<<< HEAD
                    onClick={sendPhoneCode} disabled={busy}>Reenviar código</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={verifyPhone}>
                    {busy ? "Verificando..." : "Verificar teléfono"}
=======
                    onClick={sendPhoneCode} disabled={busy}>{tr("reg.resendCode")}</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={verifyPhone}>
                    {busy ? tr("verify.checking") : tr("kyc.verifyPhone")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
                  </button>
                </div>
              </>
            )}

            <button style={st.skip} onClick={() => setStep(3)}>
<<<<<<< HEAD
              {phoneRequired
                ? "Omitir por ahora · lo completo después desde Ajustes"
                : "Continuar sin verificar el teléfono"}
=======
              {tr(phoneRequired ? "kyc.skipForNow" : "kyc.continueNoPhone")}
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </button>
          </>
        )}

        {/* PASO 3: CONFIRMACIÓN — con el estado REAL del backend */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: status?.fullyVerified ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={st.title}>
<<<<<<< HEAD
              {status?.fullyVerified ? "Cuenta verificada" : "Verificación en curso"}
            </h2>
            <p style={st.sub}>
              {status?.fullyVerified
                ? "Ya podés publicar tu auto y reservar en Freewheel."
                : "Te falta completar algún paso. Podés terminarlo cuando quieras desde Ajustes."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380, margin: "0 auto" }}>
              {[
                ["Email confirmado", checklist.emailVerified, true],
                ["DNI y licencia enviados", checklist.documentsSubmitted, true],
                ["Fecha de nacimiento", checklist.dateOfBirthProvided, true],
                ["Teléfono confirmado", checklist.phoneVerified, phoneRequired],
              ].map(([label, ok, required]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: ok ? "#166534" : required ? "#9a3412" : "#6b7280", background: ok ? "#f0fdf4" : required ? "#fff7ed" : "#f9fafb", border: `1px solid ${ok ? "#bbf7d0" : required ? "#fed7aa" : "#e5e7eb"}`, borderRadius: 8, padding: "8px 12px" }}>
                  <span>{label}{!required && !ok ? " (opcional)" : ""}</span>
                  <span>{ok ? "Listo" : required ? "Pendiente" : "Sin completar"}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button style={st.btnGhost} onClick={() => { setCode(""); setCodeSent(false); setStep(2); }}>Verificar teléfono</button>
              <button style={st.btnPrimary} onClick={finish}>Continuar</button>
=======
              {tr(status?.fullyVerified ? "kyc.accountVerified" : "kyc.inProgress")}
            </h2>
            <p style={st.sub}>
              {status?.fullyVerified
                ? tr("kyc.verifiedNote")
                : tr("kyc.missingSteps")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380, margin: "0 auto" }}>
              {[
                ["kyc.ckEmail", checklist.emailVerified, true],
                ["kyc.ckDocs", checklist.documentsSubmitted, true],
                ["kyc.ckBirth", checklist.dateOfBirthProvided, true],
                ["kyc.ckPhone", checklist.phoneVerified, phoneRequired],
              ].map(([label, ok, required]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: ok ? "#166534" : required ? "#9a3412" : "#6b7280", background: ok ? "#f0fdf4" : required ? "#fff7ed" : "#f9fafb", border: `1px solid ${ok ? "#bbf7d0" : required ? "#fed7aa" : "#e5e7eb"}`, borderRadius: 8, padding: "8px 12px" }}>
                  <span>{tr(label)}{!required && !ok ? ` (${tr("common.optional")})` : ""}</span>
                  <span>{ok ? tr("kyc.ready") : required ? tr("profile.pending") : tr("kyc.notDone")}</span>
                </div>
              ))}
            </div>
            {/* Qué le faltó a la última revisión. Sin esto la pantalla dice "en
                revisión" y no hay forma de saber si hay que corregir un dato,
                sacar mejor una foto o simplemente esperar. */}
            {motivos.length > 0 && !status?.fullyVerified && (
              <div style={{
                textAlign: "left", maxWidth: 380, margin: "18px auto 0",
                background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                  {tr("kyc.reviewNotes")}
                </div>
                {motivos.map((motivo) => (
                  <div key={motivo.code} style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
                    · {textoDeMotivo(motivo)}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              <button style={st.btnGhost} onClick={() => { setCode(""); setCodeSent(false); setStep(2); }}>{tr("kyc.verifyPhone")}</button>
              {puedeReintentar && (
                <button style={{ ...st.btnGhost, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={reintentarRevision}>
                  {busy ? tr("verify.checking") : tr("kyc.retryReview")}
                </button>
              )}
              <button style={st.btnPrimary} onClick={finish}>{tr("common.continue")}</button>
>>>>>>> 837a25de31f8ed7993b3ceb5ec2eab71b1c03c9a
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
