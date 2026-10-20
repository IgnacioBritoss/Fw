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
  /*
    EL AVISO DE QUE LA SESIÓN VENCIÓ. NO ES UN ERROR.

    Era un recuadro ámbar con borde grueso, igual que el de error pero de otro
    color. Y ahí estaba el problema: que una sesión venza no es que algo salió
    mal, es lo que TIENE que pasar cada tanto —es la medida de seguridad
    funcionando—. Pintarlo como una advertencia le dice a alguien que acaba de
    abrir la página que hizo algo mal cuando no hizo nada, y encima es el
    recuadro genérico que podría ser de cualquier sitio.

    Ahora: el azul de la marca, sin borde, con la barrita de acento a la
    izquierda y el icono. Informa, no alarma, y se ve de acá y no de ningún
    lado.
  */
  notice: {
    display: "flex", alignItems: "flex-start", gap: 11,
    background: "var(--fw-blue-bg)",
    // La barra de acento en vez de un borde completo: un borde cerrado
    // convierte cualquier cosa en una alerta. Un acento al costado es lo que
    // usan las notas al margen, que es lo que esto es.
    borderLeft: "3px solid var(--fw-blue)",
    borderRadius: "4px 10px 10px 4px",
    padding: "12px 14px", marginBottom: 16,
  },
  noticeIcono: {
    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
    background: "var(--fw-blue)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  noticeTitulo: {
    fontSize: 13.5, fontWeight: 700, color: "var(--fw-blue-text)",
    lineHeight: 1.35,
  },
  noticeTexto: {
    fontSize: 12.5, color: "var(--fw-text-3)", lineHeight: 1.55, marginTop: 2,
  },
});
