// ============================================================================
//  KYC — Verificación de identidad (DNI + licencia + teléfono)
// ----------------------------------------------------------------------------
//  "KYC" = Know Your Customer (conocé a tu cliente). Es el mismo flujo que
//  aparece al final del registro, accesible por separado desde Perfil/Ajustes
//  para completarlo después.
//
//  La lógica vive en el componente IdentityVerification, que es el que sube las
//  fotos y las envía al backend. Antes esta pantalla solo escribía una marca en
//  el navegador: se veía "Verificado" pero el servidor seguía rechazando
//  publicar y reservar con un 403.
// ============================================================================
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import IdentityVerification from "../../components/IdentityVerification";
import BrandLogo from "../../components/Logo";
import { useI18n } from "../../i18n/core";

const Logo = () => <BrandLogo size={17} />;

export default function KYC() {
  const { t: tr } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile } = useIsMobile();
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";

  return (
    <div style={{ minHeight:"100vh", background:"#ececec", display:"flex", flexDirection:"column" }}>
      {/* Barra superior */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: isMobile ? "14px 16px" : "20px 32px", gap:10, flexWrap:"wrap", background:"#fff", borderBottom:"1px solid #ececec" }}>
        <Logo />
        {/* El rótulo del medio se saca en celular: con 390px de ancho, logo +
            rótulo + link no entran en una fila y se apilan raro. */}
        {!isMobile && (
          <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", letterSpacing:".08em" }}>{tr("reg.accountEyebrow")}</div>
        )}
        <div style={{ fontSize:13, color:"#2563eb", fontWeight:600, cursor:"pointer" }} onClick={() => navigate("/")}>{tr("common.goHome")}</div>
      </div>

      <div style={{ flex:1, padding: isMobile ? "22px 14px 40px" : "40px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto 20px" }}>
          <div style={{ fontSize: isMobile ? 19 : 22, fontWeight:800, color:"#111827", marginBottom:4 }}>
            {firstName ? tr("kyc.letsVerifyName", { name: firstName }) : tr("kyc.letsVerify")}
          </div>
          <div style={{ fontSize:14, color:"#6b7280" }}>
            {tr("kyc.onceOnly")}
          </div>
        </div>

        <IdentityVerification
          onDone={() => navigate("/profile")}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
