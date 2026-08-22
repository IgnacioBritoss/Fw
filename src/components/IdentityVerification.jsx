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
import { uploadIdentityDocument } from "../services/cloudinary";
import { prepararFotoDocumento } from "../services/documentPhoto";
import { checkDocument } from "../services/groq";
import PhoneInput from "./PhoneInput";
import { useI18n } from "../i18n/core";
import Spinner from "./Spinner";
import { buscarPais, normalizePhone, PAIS_POR_DEFECTO, PAISES } from "../services/phone";
import { useVerificationStatus } from "../hooks/useVerificationStatus";
import {
  accionSugerida, claveDelError, cuilCoincideConDni, dniDelCuil, motivoDeRevision,
  normalizarCuil, normalizarDni, problemaDeIdentidad,
} from "../services/identity";
import {
  confirmPhoneCode, requestPhoneCode,
  retryIdentityReview, submitIdentity, updateMe,
} from "../services/api";

// Las cuatro fotos, en el orden en que se suben. La tupla es: la clave con la que
// se guardan en pantalla, la casilla que hay que pedirle al backend y el campo con
// el que viaja en el envío. Estar las tres cosas juntas es lo que evita el error
// clásico de mandar el dorso en `dniFrontUrl`, que el servidor rechaza con
// DOCUMENT_SLOT_MISMATCH.
const CASILLAS = [
  ["dniFront", { document: "dni", side: "front" }, "dniFrontUrl"],
  ["dniBack", { document: "dni", side: "back" }, "dniBackUrl"],
  ["licFront", { document: "license", side: "front" }, "licenseFrontUrl"],
  ["licBack", { document: "license", side: "back" }, "licenseBackUrl"],
];

// Los pasos se guardan como CLAVES y se traducen al dibujar el Stepper.
const STEPS = ["kyc.stepIdentity", "kyc.stepLicense", "kyc.stepPhone", "kyc.stepDone"];

// Para partir un número guardado en país + resto hay que probar los prefijos
// LARGOS PRIMERO: si no, "+1809..." se parte como Estados Unidos (+1) y el resto
// del número queda con un 809 pegado adelante.
const PAISES_ORDENADOS = [...PAISES].sort((a, b) => b.dial.length - a.dial.length);

// En celular: menos aire, campos de 16px (con menos, Safari en iPhone hace zoom
// solo al tocarlos) y botones de ancho completo, alcanzables con el pulgar.
const styles = (isMobile) => ({
  card: { maxWidth: 720, margin: "0 auto", background: "var(--fw-surface)", borderRadius: 18, padding: isMobile ? 18 : 32, boxShadow: "0 4px 24px rgba(0,0,0,.06)", border: "1px solid var(--fw-line-soft)" },
  title: { fontSize: 22, fontWeight: 800, color: "var(--fw-text)", marginBottom: 4 },
  sub: { fontSize: 14, color: "var(--fw-text-3)", marginBottom: 24 },
  btnPrimary: { padding: isMobile ? "14px 22px" : "12px 22px", width: isMobile ? "100%" : undefined, background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 24, fontSize: isMobile ? 15 : 14, fontWeight: 700, cursor: "pointer" },
  btnGhost: { padding: isMobile ? "14px 22px" : "12px 22px", width: isMobile ? "100%" : undefined, background: "var(--fw-surface)", color: "var(--fw-text-2)", border: "1.5px solid var(--fw-border)", borderRadius: 24, fontSize: isMobile ? 15 : 14, fontWeight: 600, cursor: "pointer" },
  skip: { display: "block", width: "100%", marginTop: 16, padding: 6, background: "none", border: "none", color: "var(--fw-text-4)", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "center", textDecoration: "underline" },
  error: { background: "var(--fw-red-bg)", border: "1.5px solid var(--fw-red-line)", borderRadius: 8, padding: "10px 14px", color: "var(--fw-red-text-2)", fontSize: 13, marginBottom: 16 },
  info: { background: "var(--fw-blue-bg)", border: "1.5px solid var(--fw-blue-line)", borderRadius: 8, padding: "10px 14px", color: "var(--fw-blue-text)", fontSize: 13, marginBottom: 16 },
  input: { width: "100%", padding: isMobile ? "13px 14px" : "11px 14px", borderRadius: 8, border: "1.5px solid var(--fw-border)", fontSize: isMobile ? 16 : 14, outline: "none", color: "var(--fw-text)", boxSizing: "border-box" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "var(--fw-text-2)", marginBottom: 6 },
  codeInput: { width: "100%", padding: 14, borderRadius: 8, border: "1.5px solid var(--fw-border)", fontSize: isMobile ? 23 : 26, fontWeight: 700, letterSpacing: isMobile ? 8 : 10, textAlign: "center", outline: "none", color: "var(--fw-text)", boxSizing: "border-box", marginBottom: 12 },
  codeBox: { background: "var(--fw-surface-2)", border: "1.5px dashed var(--fw-border-2)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--fw-text-2)", marginBottom: 16, lineHeight: 1.6 },
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
function PhotoCard({ id, label, hint, kind, value, review, avisoClave, onChange }) {
  const { t: tr } = useI18n();
  const border =
    review?.state === "invalid" ? "1.5px solid var(--fw-red)"
      : review?.state === "ok" ? "1.5px solid #16a34a"
        : value ? "1.5px solid #0f6ce6" : "1px solid #e5e7eb";

  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div onClick={() => document.getElementById(id)?.click()}
        style={{ border, borderRadius: 14, padding: 14, cursor: "pointer", background: "var(--fw-surface)" }}>
        {/* El archivo se entrega crudo: quien lo recibe lo reencoda a JPEG y lo
            achica al tamaño que el lector de códigos necesita. Antes se leía acá
            como dataURL y se subía tal cual, así que la foto de un iPhone (HEIC)
            llegaba al envío y volvía rechazada por formato. */}
        <input id={id} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Se limpia el input para que elegir DOS VECES la misma foto vuelva a
            // disparar el evento (si no, el navegador lo considera "sin cambios").
            e.target.value = "";
            if (file) onChange(file, kind);
          }} />
        <div style={{ position: "relative", width: "100%", height: 120, borderRadius: 10, overflow: "hidden", background: value ? "var(--fw-chip)" : "var(--fw-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          {value ? (
            <img src={value} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 13, color: "var(--fw-text-4)" }}>{tr("kyc.pickPhoto")}</span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fw-text)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginTop: 2 }}>{hint}</div>
      </div>

      {/* Resultado de la revisión automática de esta foto */}
      {review?.state === "checking" && (
        <Spinner size={13} label={tr("kyc.checkingPhoto")} />
      )}
      {review?.state === "ok" && (
        <div style={{ fontSize: 12, color: "var(--fw-green-text-2)", marginTop: 6, fontWeight: 600 }}>
          {tr("kyc.photoOk")}
        </div>
      )}
      {review?.state === "invalid" && (
        <div style={{ fontSize: 12, color: "var(--fw-red-text-2)", marginTop: 6, fontWeight: 600 }}>
          {tr("kyc.photoBad")} {review.reasonKey ? tr(review.reasonKey) : review.reason}
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
        <div style={{ fontSize: 12, color: "var(--fw-amber-text)", marginTop: 6, lineHeight: 1.5 }}>
          {tr("kyc.photoUnknown")}
          {review.reasonKey ? ` (${tr(review.reasonKey)})` : review.reason ? ` (${review.reason})` : ""}
        </div>
      )}

      {/* Aviso de calidad. NO bloquea: una foto justa igual puede aprobarse, y
          trabar el envío por unos píxeles sería peor. Pero decirlo antes ahorra
          el intento entero, porque una foto chica es la causa número uno de que
          la solicitud quede pendiente sin poder leer el código del DNI. */}
      {avisoClave && (
        <div style={{ fontSize: 12, color: "var(--fw-amber-text)", marginTop: 6, lineHeight: 1.5 }}>
          {tr(avisoClave)}
        </div>
      )}
    </div>
  );
}

// Barra de pasos de arriba.
function Stepper({ current, steps, isMobile }) {
  const { t: tr } = useI18n();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: isMobile ? 26 : 40, flexWrap: "wrap" }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              background: i < current ? "var(--fw-green)" : i === current ? "var(--fw-blue)" : "var(--fw-surface)",
              color: i <= current ? "#fff" : "var(--fw-text-4)",
              border: i > current ? "1.5px solid var(--fw-border)" : "none",
            }}>{i < current ? "✓" : i + 1}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: i === current ? "var(--fw-text)" : "var(--fw-text-4)" }}>{tr(label)}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: isMobile ? 22 : 90, height: 2, margin: isMobile ? "0 4px" : "0 10px", marginBottom: 24, background: i < current ? "var(--fw-green)" : i === current ? "var(--fw-blue)" : "var(--fw-surface-3)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function IdentityVerification({ onDone, onCancel }) {
  const { t: tr } = useI18n();
  const { isMobile } = useIsMobile();
  const st = styles(isMobile);
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);       // 0=DNI, 1=licencia, 2=teléfono, 3=confirmación
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
  // Cada foto se guarda como { blob, preview, avisoClave }: el blob es el JPEG
  // que se sube y la previa es la versión liviana que se dibuja y que va a la
  // revisión de la IA. Las dos viven SOLO en memoria: guardarlas en el navegador
  // dejaría el DNI de la persona en el disco, y el flujo no lo necesita.
  const [docs, setDocs] = useState({ dniFront: null, dniBack: null, licFront: null, licBack: null });
  const [reviews, setReviews] = useState({}); // resultado de la revisión por foto
  const [docsConfirmed, setDocsConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  // Cuántas fotos van subidas, para que la espera no sea una barra muda. Subir
  // cuatro archivos de 2 MB desde un celular tarda, y sin esto parece colgado.
  const [progreso, setProgreso] = useState(null);
  // Mientras el envío corre del otro lado. Es una pantalla aparte porque el
  // pedido puede tardar 50 segundos: ahí adentro el servidor lee los códigos de
  // barras y cruza todo contra la cuenta.
  const [revisando, setRevisando] = useState(false);

  // El checklist real del backend, con revalidación al volver a la pestaña y
  // consulta periódica mientras haya una solicitud esperando veredicto.
  const { status, refrescar: refrescarStatus, aplicar: aplicarStatus } = useVerificationStatus();

  // El teléfono acepta cualquier país en E.164: el código va aparte del número.
  const [paisTel, setPaisTel] = useState(PAIS_POR_DEFECTO);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeHint, setCodeHint] = useState(null); // por dónde llegó y, en demo, cuál es

  // El DNI, el CUIL y el domicilio salen del perfil, y la sesión guardada en el
  // navegador puede ser de antes de que esos campos existieran. Sin releerlo, los
  // campos aparecen vacíos aunque estén cargados y hay que retipear todo.
  useEffect(() => { refreshUser(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // El teléfono que ya tiene la cuenta, separado en país + número. Se hace en un
  // efecto y no en el estado inicial porque el perfil llega del servidor un
  // instante después del primer dibujado.
  useEffect(() => {
    const guardado = String(user?.phone || "").replace(/\D/g, "");
    if (!guardado) return;
    // El país más largo que encaje: +1809 (Dominicana) tiene que ganarle a +1.
    const pais = PAISES_ORDENADOS.find((p) => guardado.startsWith(p.dial));
    if (!pais) return;
    setPaisTel(pais.iso);
    setPhone(guardado.slice(pais.dial.length));
  }, [user?.phone]);

  const checklist = status?.checklist || {};
  // El backend informa si el teléfono es obligatorio. Hoy no lo es, porque el
  // envío por SMS es un servicio pago.
  const phoneRequired = status?.phoneRequired === true;

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

  /**
   * Qué botón ofrecer con estos motivos. Una lista de códigos no es una
   * respuesta: la persona necesita saber cuál es el único paso que le sirve, y no
   * es siempre el mismo. "El CUIL no corresponde al DNI" se arregla escribiendo
   * bien un número —volver a sacar las fotos no lo cambia— y "no pudimos leer el
   * código del DNI" se arregla con otra foto, no tocando el perfil.
   */
  const accion = !status?.fullyVerified && motivos.length
    ? accionSugerida(status?.lastReview?.reasonCodes ?? [])
    : null;

  /** Vuelve al principio con las cuatro casillas vacías, para sacar otras fotos. */
  const rehacerFotos = () => {
    setDocs({ dniFront: null, dniBack: null, licFront: null, licBack: null });
    setReviews({});
    setDocsConfirmed(false);
    setError(""); setInfo("");
    setStep(0);
  };

  /**
   * Guarda la foto elegida y dispara su revisión automática.
   *
   * Primero se NORMALIZA: se reencoda a JPEG y se achica a 2400px. Los dos pasos
   * son necesarios y no cosméticos —el backend solo acepta jpg/png/webp, así que
   * un HEIC de iPhone se rechazaba al final del trámite, y por encima de 2400px
   * el archivo pesa de más sin que el lector de códigos gane nada.
   */
  const handlePhoto = (key) => async (file, kind) => {
    setError("");
    setReviews(r => ({ ...r, [key]: { state: "checking" } }));

    let foto;
    try {
      foto = await prepararFotoDocumento(file);
    } catch (err) {
      // Un formato que este navegador no sabe decodificar (HEIC en Chrome de
      // escritorio es el caso típico). Se dice cuál es el problema en vez de
      // subirlo igual para que lo rechace el servidor tres pantallas después.
      setDocs(d => ({ ...d, [key]: null }));
      setReviews(r => ({ ...r, [key]: null }));
      setError(err.message || tr("kyc.errPhotoFormat"));
      return;
    }

    setDocs(d => ({ ...d, [key]: foto }));

    const result = await checkDocument(foto.preview, kind).catch(() => null);
    setReviews(r => ({
      ...r,
      [key]: result?.matches === true ? { state: "ok" }
        : result?.matches === false ? { state: "invalid", reason: result.reason || "", reasonKey: result.reasonKey }
          // No se pudo revisar: se muestra el motivo real. Si el servidor no
          // tiene la clave de la IA no es lo mismo que si la foto era ilegible,
          // y antes las dos cosas llegaban como el mismo aviso genérico.
          : { state: "unknown", code: result?.code, reason: result?.reason || "", reasonKey: result?.reasonKey },
    }));
  };

  /**
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

    // Si los tres datos ya son los que tiene la cuenta, no hay nada que guardar.
    // Importa: este guardado se dispara también al enviar los documentos, y
    // repetir el PATCH después de que la cuenta quedó verificada devuelve 403
    // IDENTITY_FIELDS_LOCKED, o sea un error por hacer nada.
    const sinCambios =
      normalizarDni(datos.dni) === normalizarDni(user?.dni) &&
      normalizarCuil(datos.cuil) === normalizarCuil(user?.cuil) &&
      datos.address.trim() === String(user?.address ?? "").trim();
    if (sinCambios) return true;

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
   */
  const submitDocuments = async () => {
    // LA REVISIÓN NO CORRE SIN ESTOS DATOS. El backend acepta las cuatro fotos con
    // un 201 aunque falten el DNI, el CUIL y el domicilio, pero entonces no tiene
    // contra qué cotejarlas y la solicitud queda pendiente PARA SIEMPRE, sin
    // motivo ni forma de darse cuenta desde afuera. Es el error de integración
    // más probable de todo el flujo, así que se corta acá.
    if (!(await guardarDatos())) { setStep(0); return; }

    // Las cuatro tienen que estar. Se puede llegar acá con una casilla vacía: si
    // una foto se vuelve a elegir y el navegador no puede decodificarla, esa
    // casilla se limpia, y el botón de este paso solo mira las dos de la licencia.
    const faltante = CASILLAS.find(([key]) => !docs[key]?.blob);
    if (faltante) { setError(tr("kyc.errMissingPhoto")); setStep(0); return; }

    setBusy(true); setError(""); setInfo("");
    setProgreso({ hecho: 0, total: CASILLAS.length });
    try {
      // De a una y no las cuatro en paralelo: cada subida necesita su propia
      // firma, hay un tope de 10 firmas cada 5 minutos, y así se puede decir por
      // cuál va. En paralelo, un fallo a mitad de camino deja tres subidas
      // huérfanas y ningún progreso que mostrar.
      const urls = {};
      for (const [key, casilla, campo] of CASILLAS) {
        urls[campo] = await uploadIdentityDocument(docs[key].blob, casilla);
        setProgreso({ hecho: Object.keys(urls).length, total: CASILLAS.length });
      }

      setProgreso(null);
      setRevisando(true);
      const submission = await submitIdentity(urls);
      const fresh = await refrescarStatus();
      await refreshUser();

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
        setStep(3);
        return;
      }

      // Si no quedó verificada en el momento, es porque la revisión automática no
      // pudo decidir y la solicitud está esperando a un administrador. Decirlo,
      // en vez de un "enviada correctamente" que deja pensando si falta algo.
      setInfo(
        (fresh ?? {}).fullyVerified || submission?.status === "VERIFIED"
          ? tr("kyc.approvedNote")
          : tr("kyc.pendingNote"),
      );
      // Al resultado, no al teléfono. Antes, después de enviar se caía en el paso
      // del teléfono —que es OPCIONAL— y los motivos de una revisión que no pudo
      // decidir quedaban una pantalla más adelante: la persona leía "documentación
      // enviada", veía un formulario de teléfono y nunca se enteraba de que el
      // código del DNI no se había podido leer y había que sacar otra foto. El
      // teléfono sigue a un clic, desde el botón del propio resultado.
      setStep(3);
    } catch (err) {
      // SE ACABÓ EL TIEMPO DEL LADO DE ACÁ, PERO EL ENVÍO YA SALIÓ. La revisión
      // corre dentro del pedido y puede tardar casi un minuto: que el navegador
      // corte no significa que haya fallado, y tratarlo como un error hacía que
      // la persona reenviara las cuatro fotos encima de una solicitud que estaba
      // por aprobarse. Se va a preguntar cómo quedó de verdad.
      if (err?.timedOut) {
        const fresh = await refrescarStatus();
        await refreshUser();
        if (fresh?.fullyVerified) setInfo(tr("kyc.approvedNote"));
        else if (fresh?.lastReview?.outcome === "rejected") setError(tr("kyc.rejectedNote"));
        else setInfo(tr("kyc.pendingNote"));
        setStep(3);
        return;
      }
      if (err?.status === 429) { setError(tr("kyc.errTooMany")); return; }
      const clave = claveDelError(err);
      setError(clave ? tr(clave) : err.message || tr("kyc.errSend"));
    } finally {
      setBusy(false);
      setProgreso(null);
      setRevisando(false);
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
    setBusy(true); setError(""); setInfo(""); setRevisando(true);
    try {
      // review-retry devuelve el mismo objeto que GET /verification/me/status, así
      // que se aplica directo en vez de pedirlo otra vez.
      const fresh = await retryIdentityReview();
      aplicarStatus(fresh);
      await refreshUser();
      setInfo(fresh?.fullyVerified ? tr("kyc.approvedNote") : tr("kyc.retryPending"));
    } catch (err) {
      // Igual que en el envío: el corte por tiempo no dice que haya fallado.
      if (err?.timedOut) {
        const fresh = await refrescarStatus();
        await refreshUser();
        setInfo(fresh?.fullyVerified ? tr("kyc.approvedNote") : tr("kyc.retryPending"));
        return;
      }
      if (err?.status === 429) { setError(tr("kyc.errTooManyRetries")); return; }
      const clave = claveDelError(err);
      setError(clave ? tr(clave) : err.message || tr("kyc.errRetry"));
    } finally {
      setBusy(false);
      setRevisando(false);
    }
  };

  // Guarda el teléfono (si cambió) y pide el código de verificación.
  const sendPhoneCode = async () => {
    setPhoneTouched(true);
    // Cualquier país en E.164. Antes se forzaba el 54 adelante, así que una
    // persona con un teléfono español no podía completar este paso ni queriendo.
    const full = normalizePhone(buscarPais(paisTel).dial, phone);
    if (!full) {
      setError(tr("kyc.errPhone"));
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
          ? tr("kyc.codeToEmail", { email: result.sentTo })
          : tr("kyc.codeBySms"),
      );
    } catch (err) {
      setError(err.message || tr("email.errSend"));
    } finally {
      setBusy(false);
    }
  };

  // Confirma el código del teléfono.
  const verifyPhone = async () => {
    if (code.length !== 6) { setError(tr("reg.errCode")); return; }
    setBusy(true); setError(""); setInfo("");
    try {
      // confirm devuelve el mismo objeto que GET /verification/me/status.
      aplicarStatus(await confirmPhoneCode(code));
      await refreshUser();
      setStep(3);
    } catch (err) {
      setError(err.message || tr("kyc.errBadCode"));
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

  // ── PANTALLA BLOQUEANTE: subiendo y revisando ─────────────────────────────
  // Va aparte y sin botón de cancelar a propósito. El envío corre la revisión
  // ENTERA adentro del pedido y puede tardar casi un minuto; con el formulario a
  // la vista, esa espera parece la pantalla colgada y la gente recarga, que es lo
  // único que sí puede romper el trámite.
  if (progreso || revisando) {
    return (
      <div>
        <Stepper current={step} steps={STEPS} isMobile={isMobile} />
        <div style={{ ...st.card, textAlign: "center", padding: isMobile ? 28 : 44 }}>
          <Spinner size={26} />
          <h2 style={{ ...st.title, marginTop: 18 }}>
            {tr(progreso ? "kyc.uploadingTitle" : "kyc.reviewingTitle")}
          </h2>
          <p style={{ ...st.sub, marginBottom: 0 }}>
            {progreso
              ? tr("kyc.uploadingNote", { hecho: progreso.hecho + 1, total: progreso.total })
              : tr("kyc.reviewingNote")}
          </p>
          {progreso && (
            <div style={{ height: 6, borderRadius: 3, background: "var(--fw-surface-3)", overflow: "hidden", maxWidth: 320, margin: "18px auto 0" }}>
              <div style={{ height: "100%", width: `${(progreso.hecho / progreso.total) * 100}%`, background: "var(--fw-blue)", transition: "width .3s" }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Stepper current={step} steps={STEPS} isMobile={isMobile} />
      <div style={st.card}>
        {error && <div style={st.error}>{error}</div>}
        {info && <div style={st.info}>{info}</div>}

        {/* PASO 0: DNI */}
        {step === 0 && (
          <>
            <h2 style={st.title}>{tr("kyc.identityTitle")}</h2>
            <p style={st.sub}>{tr("kyc.identitySub")}</p>

            {/* Ya hay documentos esperando revisión.
                Esto es lo que hace que corregir un dato sirva: la revisión coteja
                los datos de la cuenta contra los documentos ya enviados, así que
                si lo que falló fue el CUIL o el domicilio se arregla acá y se
                vuelve a revisar. Sin este botón habría que sacar y subir otra vez
                las cuatro fotos para cambiar un dígito. */}
            {puedeReintentar && (
              <div style={{ background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 12, padding: isMobile ? 13 : 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-amber-text)", marginBottom: 6 }}>
                  {tr("kyc.alreadySent")}
                </div>
                {motivos.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {motivos.map((motivo) => (
                      <div key={motivo.code} style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
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
            <div style={{ background: "var(--fw-surface-2)", border: "1px solid var(--fw-line-soft)", borderRadius: 12, padding: isMobile ? 14 : 18, marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)", marginBottom: 3 }}>
                {tr("kyc.dataTitle")}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fw-text-3)", marginBottom: 14, lineHeight: 1.5 }}>
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
                    <div style={{ fontSize: 11.5, color: "var(--fw-amber-text)", marginTop: 5, lineHeight: 1.5 }}>
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
                kind="DNI_FRONT" value={docs.dniFront?.preview} avisoClave={docs.dniFront?.avisoClave}
                review={reviews.dniFront} onChange={handlePhoto("dniFront")} />
              <PhotoCard id="iv-dni-back" label={tr("kyc.dniBack")} hint={tr("kyc.dniBackHint")}
                kind="DNI_BACK" value={docs.dniBack?.preview} avisoClave={docs.dniBack?.avisoClave}
                review={reviews.dniBack} onChange={handlePhoto("dniBack")} />
            </div>
            <div style={{ borderTop: "1px solid var(--fw-line-soft)", paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fw-text)", marginBottom: 12 }}>{tr("kyc.tips")}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["kyc.tip1", "kyc.tip2", "kyc.tip3"].map(tip => (
                  <div key={tip} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--fw-bg)", borderRadius: 20, padding: "7px 14px", fontSize: 12, color: "var(--fw-text-2)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--fw-green)" }} />{tr(tip)}
                  </div>
                ))}
              </div>
            </div>
            {/* Si la IA no pudo revisar una foto, no se avanza sin que la persona
                lo confirme. Es la alternativa a dejarlo pasar en silencio (lo de
                antes) y a trabar la verificación del todo cuando el servicio de IA
                está caído. */}
            {sinRevisar > 0 && (
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 10, padding: "11px 13px", marginBottom: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={docsConfirmed}
                  onChange={(e) => setDocsConfirmed(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
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
            </div>
          </>
        )}

        {/* PASO 1: LICENCIA */}
        {step === 1 && (
          <>
            <h2 style={st.title}>{tr("kyc.licenseTitle")}</h2>
            <p style={st.sub}>{tr("kyc.licenseSub")}</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <PhotoCard id="iv-lic-front" label={tr("kyc.licFront")} hint={tr("kyc.licFrontHint")}
                kind="LICENSE_FRONT" value={docs.licFront?.preview} avisoClave={docs.licFront?.avisoClave}
                review={reviews.licFront} onChange={handlePhoto("licFront")} />
              <PhotoCard id="iv-lic-back" label={tr("kyc.licBack")} hint={tr("kyc.licBackHint")}
                kind="LICENSE_BACK" value={docs.licBack?.preview} avisoClave={docs.licBack?.avisoClave}
                review={reviews.licBack} onChange={handlePhoto("licBack")} />
            </div>
            <div style={{ fontSize: 12, color: "var(--fw-text-4)", marginBottom: 20 }}>
              {tr("kyc.dataNote")}
            </div>
                        {/* Si la IA no pudo revisar una foto, no se avanza sin que la persona
                lo confirme. Es la alternativa a dejarlo pasar en silencio (lo de
                antes) y a trabar la verificación del todo cuando el servicio de IA
                está caído. */}
            {sinRevisar > 0 && (
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 10, padding: "11px 13px", marginBottom: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={docsConfirmed}
                  onChange={(e) => setDocsConfirmed(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
                  {tr(sinRevisar === 1 ? "kyc.confirmOne" : "kyc.confirmMany", { count: sinRevisar })}
                </span>
              </label>
            )}
            <div style={st.actions}>
              <button style={st.btnGhost} onClick={() => setStep(0)}>{tr("common.back")}</button>
              <button style={{ ...st.btnPrimary, opacity: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? 1 : 0.5, cursor: licenseReady && !hasInvalid && !isChecking && !busy && !faltaConfirmar ? "pointer" : "not-allowed" }}
                disabled={!licenseReady || hasInvalid || isChecking || busy || faltaConfirmar} onClick={submitDocuments}>
                {busy ? tr("kyc.sending") : tr("kyc.sendAndContinue")}
              </button>
            </div>
          </>
        )}

        {/* PASO 2: TELÉFONO (opcional) */}
        {step === 2 && (
          <>
            <h2 style={st.title}>{tr("kyc.phoneTitle")}</h2>
            <p style={st.sub}>
              {tr(phoneRequired ? "kyc.phoneRequired" : "kyc.phoneOptional")}
            </p>

            {checklist.phoneVerified ? (
              <div style={{ ...st.info, marginBottom: 20 }}>{tr("kyc.phoneDone")}</div>
            ) : !codeSent ? (
              <>
                <PhoneInput label={tr("auth.phone")} value={phone} showError={phoneTouched}
                  pais={paisTel} onPaisChange={setPaisTel}
                  onChange={setPhone} style={{ marginBottom: 16 }} />
                {/* Por dónde llega el código lo decide el backend (`phoneCodeChannel`)
                    y hoy es el EMAIL, porque no hay pasarela de SMS contratada. Si
                    mañana la hay, este texto cambia solo: decirlo fijo acá dejaría
                    a la gente mirando el celular a la espera de un mensaje que no
                    va a llegar, o al revés. */}
                <div style={st.codeBox}>
                  {tr(status?.phoneCodeChannel === "sms" ? "kyc.smsNoteSms" : "kyc.smsNote")}
                </div>
                <div style={st.actions}>
                  <button style={st.btnGhost} onClick={() => setStep(1)}>{tr("common.back")}</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={sendPhoneCode}>
                    {busy ? tr("common.sending") : tr("email.sendCode")}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Modo demostración: el backend devuelve el código y se muestra
                    acá, para poder completar el circuito sin esperar el mail. */}
                {codeHint?.code && (
                  <div style={st.codeBox}>
                    {tr("kyc.demoCode")}{" "}
                    <strong style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 2 }}>{codeHint.code}</strong>
                  </div>
                )}
                <input style={st.codeInput} type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyPhone()} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button style={{ background: "none", border: "none", color: "var(--fw-blue)", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
                    onClick={sendPhoneCode} disabled={busy}>{tr("reg.resendCode")}</button>
                  <button style={{ ...st.btnPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={verifyPhone}>
                    {busy ? tr("verify.checking") : tr("kyc.verifyPhone")}
                  </button>
                </div>
              </>
            )}

            <button style={st.skip} onClick={() => setStep(3)}>
              {tr(phoneRequired ? "kyc.skipForNow" : "kyc.continueNoPhone")}
            </button>
          </>
        )}

        {/* PASO 3: CONFIRMACIÓN — con el estado REAL del backend */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: status?.fullyVerified ? "linear-gradient(135deg,var(--fw-green),#15803d)" : "linear-gradient(135deg,#0f6ce6,#0b55c0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={st.title}>
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
                // `identityDataProvided` estaba en el checklist del backend y no se
                // mostraba. Es justo el ítem que, sin cumplir, deja la solicitud
                // pendiente para siempre: verlo es lo que permite entender por qué
                // "mandé todo" y la cuenta sigue sin verificarse.
                ["kyc.ckData", checklist.identityDataProvided, true],
                ["kyc.ckDocs", checklist.documentsSubmitted, true],
                ["kyc.ckBirth", checklist.dateOfBirthProvided, true],
                ["kyc.ckPhone", checklist.phoneVerified, phoneRequired],
              ].map(([label, ok, required]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: ok ? "var(--fw-green-text-2)" : required ? "var(--fw-orange-text)" : "var(--fw-text-3)", background: ok ? "var(--fw-green-bg)" : required ? "var(--fw-orange-bg)" : "var(--fw-surface-2)", border: `1px solid ${ok ? "var(--fw-green-line)" : required ? "var(--fw-orange-line)" : "var(--fw-border)"}`, borderRadius: 8, padding: "8px 12px" }}>
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
                background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fw-amber-text)", marginBottom: 6 }}>
                  {tr("kyc.reviewNotes")}
                </div>
                {motivos.map((motivo) => (
                  <div key={motivo.code} style={{ fontSize: 12.5, color: "var(--fw-amber-text)", lineHeight: 1.6 }}>
                    · {textoDeMotivo(motivo)}
                  </div>
                ))}
              </div>
            )}

            {/* Los documentos vencidos, la edad y un DNI ya usado por otra cuenta
                no se arreglan desde la app: ofrecer "reintentar" ahí es mandar a
                la persona a chocar contra la misma pared. Se dice qué pasa y por
                dónde seguir. */}
            {accion === "soporte" && (
              <div style={{ maxWidth: 380, margin: "18px auto 0", fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.6 }}>
                {tr("kyc.ctaSupportNote")}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
              {!checklist.phoneVerified && (
                <button style={st.btnGhost} onClick={() => { setCode(""); setCodeSent(false); setStep(2); }}>{tr("kyc.verifyPhone")}</button>
              )}

              {/* Un solo camino a la vez, el que corresponde a los motivos. */}
              {accion === "datos" && (
                <button style={st.btnPrimary} onClick={() => { setError(""); setInfo(""); setStep(0); }}>
                  {tr("kyc.ctaFixData")}
                </button>
              )}
              {accion === "fotos" && (
                <button style={st.btnPrimary} onClick={rehacerFotos}>
                  {tr("kyc.ctaRetakePhotos")}
                </button>
              )}
              {accion !== "soporte" && accion !== "datos" && accion !== "fotos" && puedeReintentar && (
                <button style={{ ...st.btnGhost, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={reintentarRevision}>
                  {busy ? tr("verify.checking") : tr("kyc.retryReview")}
                </button>
              )}

              <button style={accion ? st.btnGhost : st.btnPrimary} onClick={finish}>{tr("common.continue")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
