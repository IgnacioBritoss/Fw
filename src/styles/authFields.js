// ============================================================================
//  authFields.js — Estilos compartidos de los formularios de entrada
// ----------------------------------------------------------------------------
//  Los usan Login, Registro, Recuperar contraseña, Restablecer, Verificar email y
//  Completar perfil. Estaban repetidos y con valores distintos en cada archivo,
//  así que un arreglo en uno no llegaba a los otros.
//
//  EL DETALLE IMPORTANTE DEL CELULAR: en iPhone, Safari hace zoom solo cuando uno
//  toca un campo con letra menor a 16px, y después la página queda corrida a lo
//  ancho y hay que pellizcar para volver. Los campos de estas pantallas tenían
//  14px, y eso es la mitad de por qué registrarse desde el teléfono era un
//  desastre. Acá van a 16px en pantalla chica.
// ============================================================================

/** Estilos de campos y botones, según si es celular o no. */
export const authFields = (isMobile) => ({
  label: {
    display: "block", fontSize: 13, fontWeight: 500,
    color: "#374151", marginBottom: 6,
  },
  input: {
    width: "100%",
    // 16px en celular: menos que eso y iOS hace zoom al tocar el campo.
    padding: isMobile ? "13px 14px" : "11px 14px",
    borderRadius: 8, border: "1.5px solid #e5e7eb",
    fontSize: isMobile ? 16 : 14,
    outline: "none", color: "#111827", boxSizing: "border-box",
    background: "#fff",
  },
  btn: {
    width: "100%",
    // 48px de alto es el mínimo para que un dedo le pegue sin apuntar.
    padding: isMobile ? 15 : 13,
    background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 10,
    fontSize: isMobile ? 16 : 15, fontWeight: 700, cursor: "pointer",
  },
  btnGhost: {
    width: "100%", padding: isMobile ? 14 : 12,
    background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10,
    fontSize: isMobile ? 15 : 14, fontWeight: 600, color: "#374151",
    cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  error: {
    background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8,
    padding: "10px 14px", color: "#b91c1c", fontSize: 13,
    marginBottom: 16, lineHeight: 1.6,
  },
  notice: {
    background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 8,
    padding: "10px 14px", color: "#92400e", fontSize: 13,
    marginBottom: 16, lineHeight: 1.6,
  },
});
