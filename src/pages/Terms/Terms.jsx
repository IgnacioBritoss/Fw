// ============================================================================
//  Terms — Términos y Condiciones
// ----------------------------------------------------------------------------
//  Página de solo texto con los términos legales de uso de Freewheel. Se accede
//  desde el checkbox del registro.
//
//  El contenido ya no está escrito en el JSX: es una lista de secciones con
//  CLAVES de traducción. Antes eran diez bloques de texto en castellano dentro
//  del componente, así que la página quedaba en castellano en los cinco idiomas
//  —y unos términos legales que no se entienden no sirven para nada—.
// ============================================================================
import { Link } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useI18n } from "../../i18n/core";

const s = {
  page: { minHeight:"100vh", background:"var(--fw-surface-2)", padding:"40px 24px" },
  container: { maxWidth:760, margin:"0 auto", background:"var(--fw-surface)", borderRadius:16, padding:"40px 48px", boxShadow:"0 4px 24px rgba(0,0,0,.07)" },
  containerMobile: { background:"var(--fw-surface)", borderRadius:12, padding:"24px 20px" },
  back: { display:"inline-flex", alignItems:"center", gap:6, color:"var(--fw-blue)", fontWeight:600, fontSize:14, textDecoration:"none", marginBottom:28 },
  h1: { fontSize:28, fontWeight:800, color:"var(--fw-text)", marginBottom:6 },
  date: { fontSize:13, color:"var(--fw-text-4)", marginBottom:36 },
  h2: { fontSize:17, fontWeight:700, color:"var(--fw-text)", marginTop:32, marginBottom:10 },
  p: { fontSize:14, color:"var(--fw-text-2)", lineHeight:1.8, marginBottom:12 },
  ul: { fontSize:14, color:"var(--fw-text-2)", lineHeight:1.8, paddingLeft:20, marginBottom:12 },
  divider: { border:"none", borderTop:"1px solid var(--fw-line-soft)", margin:"32px 0" },
  highlight: { background:"var(--fw-blue-bg)", border:"1px solid var(--fw-blue-line)", borderRadius:8, padding:"12px 16px", fontSize:14, color:"var(--fw-blue-text)", marginBottom:16 },
};

// Cada sección: el número, su título, y o un párrafo (p) o una lista (items).
const SECTIONS = [
  { n: 1, title: "terms.s1", p: "terms.s1p" },
  { n: 2, title: "terms.s2", p: "terms.s2p" },
  { n: 3, title: "terms.s3", items: ["terms.s3a", "terms.s3b", "terms.s3c", "terms.s3d", "terms.s3e"] },
  { n: 4, title: "terms.s4", items: ["terms.s4a", "terms.s4b", "terms.s4c", "terms.s4d"] },
  { n: 5, title: "terms.s5", p: "terms.s5p" },
  { n: 6, title: "terms.s6", items: ["terms.s6a", "terms.s6b", "terms.s6c"] },
  { n: 7, title: "terms.s7", p: "terms.s7p" },
  { n: 8, title: "terms.s8", items: ["terms.s8a", "terms.s8b", "terms.s8c", "terms.s8d"] },
  { n: 9, title: "terms.s9", p: "terms.s9p" },
];

const CONTACT_EMAIL = "britosignacio106@gmail.com";

export default function Terms() {
  const { isMobile } = useIsMobile();
  const { t: tr } = useI18n();

  return (
    <div style={s.page}>
      <div style={isMobile ? s.containerMobile : s.container}>
        <Link to="/register" style={s.back}>{tr("terms.back")}</Link>

        <h1 style={s.h1}>{tr("terms.title")}</h1>
        <div style={s.date}>{tr("terms.updated")}</div>

        <div style={s.highlight}>{tr("terms.intro")}</div>

        {SECTIONS.map(section => (
          <div key={section.n}>
            <h2 style={s.h2}>{section.n}. {tr(section.title)}</h2>
            {section.p && <p style={s.p}>{tr(section.p)}</p>}
            {section.items && (
              <ul style={s.ul}>
                {section.items.map(item => <li key={item}>{tr(item)}</li>)}
              </ul>
            )}
          </div>
        ))}

        <h2 style={s.h2}>10. {tr("terms.s10")}</h2>
        <p style={s.p}>{tr("terms.s10p")} <strong>{CONTACT_EMAIL}</strong>.</p>

        <hr style={s.divider} />
        <p style={{ ...s.p, color:"var(--fw-text-4)", fontSize:13 }}>{tr("terms.rights")}</p>
      </div>
    </div>
  );
}
