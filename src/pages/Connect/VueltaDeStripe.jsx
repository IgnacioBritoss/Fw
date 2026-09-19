// ============================================================================
//  VueltaDeStripe — A dónde cae el dueño cuando termina su alta de cobro
// ----------------------------------------------------------------------------
//  ── POR QUÉ ESTA PANTALLA TIENE QUE EXISTIR ───────────────────────────────
//  Porque el servidor ya mandaba gente acá. Al crear el alta le pasa a Stripe
//  dos direcciones de VUELTA, y las arma con la dirección de esta aplicación:
//
//      returnUrl:  FRONTEND_URL/connect/return
//      refreshUrl: FRONTEND_URL/connect/refresh
//
//  (payments.service.ts, createOwnerOnboarding). O sea que Stripe devolvía a la
//  persona a dos direcciones que en esta aplicación NO EXISTÍAN: terminaba su
//  alta y caía en la pantalla de "no encontramos lo que buscás". Sin ninguna
//  señal de si lo que acababa de hacer sirvió.
//
//  Las dos vueltas son distintas y por eso se contestan distinto:
//
//   · /connect/return   terminó (o cerró) el formulario de Stripe. Acá NO se
//     cree lo que diga la dirección: se le vuelve a preguntar al servidor cómo
//     quedó la cuenta. Volver por esta puerta no garantiza que haya completado
//     nada —se llega igual apretando "volver al sitio" a mitad de camino— así
//     que la única fuente honesta es el estado.
//
//   · /connect/refresh  el enlace de Stripe venció antes de que terminara.
//     No es un error de nadie y no hay nada que revisar: lo que corresponde es
//     darle uno nuevo, que es lo que hace el botón.
// ============================================================================
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/core";
import CobrosDelDueno from "../../components/CobrosDelDueno";

const s = {
  page: { maxWidth: 560, margin: "0 auto", padding: "40px 24px" },
  title: { fontSize: 22, fontWeight: 800, color: "var(--fw-text)", letterSpacing: "-.4px", marginBottom: 6 },
  sub: { fontSize: 14, color: "var(--fw-text-3)", marginBottom: 24, lineHeight: 1.6 },
  volver: {
    marginTop: 18, padding: "12px 22px", background: "transparent",
    border: "1.5px solid var(--fw-border)", color: "var(--fw-text-2)",
    borderRadius: 10, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
  },
};

export default function VueltaDeStripe() {
  const { t: tr } = useI18n();
  const navigate = useNavigate();
  const vencido = useLocation().pathname.endsWith("/refresh");

  return (
    <div style={s.page}>
      <div style={s.title}>{tr(vencido ? "cobros.vuelta.vencidoTitulo" : "cobros.vuelta.titulo")}</div>
      <div style={s.sub}>{tr(vencido ? "cobros.vuelta.vencidoDetalle" : "cobros.vuelta.detalle")}</div>

      {/*
        El mismo bloque que en Ajustes, y no una copia con otro texto.

        Es el que le pregunta al servidor cómo quedó la cuenta y el que ofrece
        retomar si falta algo. Escribir acá una versión propia significaría
        mantener dos veces la misma respuesta, y que un día digan cosas
        distintas sobre lo mismo.
      */}
      <CobrosDelDueno />

      <button type="button" style={s.volver} onClick={() => navigate("/dashboard")}>
        {tr("cobros.vuelta.alPanel")}
      </button>
    </div>
  );
}
