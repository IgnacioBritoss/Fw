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
    color: "var(--fw-text-2)", marginBottom: 6,
  },
  input: {
    width: "100%",
    // 16px en celular: menos que eso y iOS hace zoom al tocar el campo.
    padding: isMobile ? "13px 14px" : "11px 14px",
    borderRadius: 8, border: "1.5px solid var(--fw-border)",
    fontSize: isMobile ? 16 : 14,
    outline: "none", color: "var(--fw-text)", boxSizing: "border-box",
    background: "var(--fw-surface)",
  },
  btn: {
    width: "100%",
    // 48px de alto es el mínimo para que un dedo le pegue sin apuntar.
    padding: isMobile ? 15 : 13,
    background: "var(--fw-blue)", color: "#fff", border: "none", borderRadius: 10,
    fontSize: isMobile ? 16 : 15, fontWeight: 700, cursor: "pointer",
  },
  btnGhost: {
    width: "100%", padding: isMobile ? 14 : 12,
    background: "var(--fw-surface)", border: "1.5px solid var(--fw-border)", borderRadius: 10,
    fontSize: isMobile ? 15 : 14, fontWeight: 600, color: "var(--fw-text-2)",
    cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  error: {
    background: "var(--fw-red-bg)", border: "1.5px solid var(--fw-red-line)", borderRadius: 8,
    padding: "10px 14px", color: "var(--fw-red-text-2)", fontSize: 13,
    marginBottom: 16, lineHeight: 1.6,
  },
  notice: {
    background: "var(--fw-amber-bg)", border: "1.5px solid var(--fw-amber-line)", borderRadius: 8,
    padding: "10px 14px", color: "var(--fw-amber-text)", fontSize: 13,
    marginBottom: 16, lineHeight: 1.6,
  },
});
