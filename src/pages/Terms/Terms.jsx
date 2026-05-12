import { Link } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";

const s = {
  page: { minHeight:"100vh", background:"#f9fafb", padding:"40px 24px" },
  container: { maxWidth:760, margin:"0 auto", background:"#fff", borderRadius:16, padding:"40px 48px", boxShadow:"0 4px 24px rgba(0,0,0,.07)" },
  containerMobile: { background:"#fff", borderRadius:12, padding:"24px 20px" },
  back: { display:"inline-flex", alignItems:"center", gap:6, color:"#2563eb", fontWeight:600, fontSize:14, textDecoration:"none", marginBottom:28 },
  h1: { fontSize:28, fontWeight:800, color:"#111827", marginBottom:6 },
  date: { fontSize:13, color:"#9ca3af", marginBottom:36 },
  h2: { fontSize:17, fontWeight:700, color:"#111827", marginTop:32, marginBottom:10 },
  p: { fontSize:14, color:"#374151", lineHeight:1.8, marginBottom:12 },
  ul: { fontSize:14, color:"#374151", lineHeight:1.8, paddingLeft:20, marginBottom:12 },
  divider: { border:"none", borderTop:"1px solid #f3f4f6", margin:"32px 0" },
  highlight: { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"12px 16px", fontSize:14, color:"#1e40af", marginBottom:16 },
};

export default function Terms() {
  const { isMobile } = useIsMobile();

  return (
    <div style={s.page}>
      <div style={isMobile ? s.containerMobile : s.container}>
        <Link to="/register" style={s.back}>← Volver al registro</Link>

        <h1 style={s.h1}>Términos y Condiciones</h1>
        <div style={s.date}>Última actualización: mayo 2026</div>

        <div style={s.highlight}>
          Al crear una cuenta en Freewheel, aceptás estos términos en su totalidad.
        </div>

        <h2 style={s.h2}>1. Aceptación de los términos</h2>
        <p style={s.p}>Al registrarte y usar Freewheel, aceptás quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, no podés usar el servicio.</p>

        <h2 style={s.h2}>2. Descripción del servicio</h2>
        <p style={s.p}>Freewheel es una plataforma que conecta personas que quieren alquilar su auto con personas que necesitan uno. Freewheel actúa como intermediario y no es propietario de los vehículos publicados.</p>

        <h2 style={s.h2}>3. Registro y cuenta</h2>
        <ul style={s.ul}>
          <li>Debés tener al menos 18 años para registrarte.</li>
          <li>La información que proporcionás debe ser veraz y actualizada.</li>
          <li>Sos responsable de mantener la confidencialidad de tu contraseña.</li>
          <li>No podés crear más de una cuenta personal.</li>
          <li>Freewheel puede suspender cuentas que violen estos términos.</li>
        </ul>

        <h2 style={s.h2}>4. Publicación de vehículos</h2>
        <ul style={s.ul}>
          <li>El vehículo debe estar en condiciones aptas para circular.</li>
          <li>Debés tener seguro vigente y documentación en regla.</li>
          <li>La información del vehículo debe ser precisa y actualizada.</li>
          <li>Freewheel puede moderar o eliminar publicaciones que incumplan las normas.</li>
        </ul>

        <h2 style={s.h2}>5. Reservas y pagos</h2>
        <p style={s.p}>Las reservas son acuerdos entre propietario y arrendatario. Freewheel facilita la transacción pero no garantiza el cumplimiento de ninguna de las partes. Los precios son fijados por los propietarios.</p>

        <h2 style={s.h2}>6. Responsabilidades</h2>
        <ul style={s.ul}>
          <li>El propietario es responsable del estado del vehículo al momento de la entrega.</li>
          <li>El arrendatario es responsable por daños durante el período de alquiler.</li>
          <li>Freewheel no es responsable por accidentes, robos o daños a terceros.</li>
        </ul>

        <h2 style={s.h2}>7. Privacidad y datos personales</h2>
        <p style={s.p}>Tus datos son tratados conforme a nuestra política de privacidad. No vendemos tu información a terceros. Usamos tus datos únicamente para operar el servicio y mejorar la plataforma.</p>

        <h2 style={s.h2}>8. Conducta prohibida</h2>
        <ul style={s.ul}>
          <li>Usar la plataforma para actividades ilegales.</li>
          <li>Publicar información falsa o engañosa.</li>
          <li>Acosar o amenazar a otros usuarios.</li>
          <li>Evadir comisiones realizando acuerdos fuera de la plataforma.</li>
        </ul>

        <h2 style={s.h2}>9. Modificaciones</h2>
        <p style={s.p}>Freewheel puede actualizar estos términos en cualquier momento. Te notificaremos por email ante cambios significativos.</p>

        <h2 style={s.h2}>10. Contacto</h2>
        <p style={s.p}>Para consultas sobre estos términos escribinos a <strong>britosignacio106@gmail.com</strong>.</p>

        <hr style={s.divider} />
        <p style={{ ...s.p, color:"#9ca3af", fontSize:13 }}>© 2026 Freewheel. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}