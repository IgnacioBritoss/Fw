// ============================================================================
//  Avatar — La foto de perfil, o las iniciales si todavía no hay foto
// ----------------------------------------------------------------------------
//  Un solo lugar que decide cómo se ve una persona en toda la app. Antes cada
//  pantalla dibujaba su propio círculo con la inicial y ninguna miraba
//  `profilePhotoUrl`, así que una foto de perfil subida no aparecía en ninguna
//  parte.
//
//  Si la imagen no carga (URL vieja, borrada de Cloudinary) cae sola en las
//  iniciales en vez de dejar el hueco roto del navegador.
// ============================================================================
import { useState } from "react";

export default function Avatar({
  src,
  initials = "U",
  size = 48,
  ring = 0,
  style,
  alt = "",
}) {
  // Se guarda CUÁL foto falló, no un booleano: así, si la persona sube una foto
  // nueva, se vuelve a intentar sola sin necesidad de un efecto que resetee el
  // estado (un setState dentro de un efecto dispara un render en cascada).
  const [brokenSrc, setBrokenSrc] = useState(null);
  const broken = Boolean(src) && brokenSrc === src;

  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...(ring ? { border: `${ring}px solid #fff`, boxShadow: "0 4px 16px rgba(0,0,0,.12)" } : {}),
    ...style,
  };

  if (src && !broken) {
    return (
      <div style={{ ...base, background: "#ece9e3" }}>
        <img
          src={src}
          alt={alt}
          onError={() => setBrokenSrc(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      ...base,
      background: "#ece9e3",
      color: "#111827",
      fontWeight: 800,
      fontSize: Math.max(11, Math.round(size * 0.34)),
      letterSpacing: ".01em",
    }}>
      {initials}
    </div>
  );
}
