// ============================================================================
//  EditorDePortada — Elegir el dibujo y el color de la portada del perfil
// ----------------------------------------------------------------------------
//  La portada era un degradado azul escrito a mano, igual para todas las
//  cuentas. Acá se elige el dibujo y el color, y lo elegido se ve en los dos
//  lados: en el perfil propio y en la ficha que abre otra persona desde una
//  publicación. Ver services/portada.js, que es donde se dibujan.
//
//  ── POR QUÉ SE APLICA AL TOQUE Y NO CON UN BOTÓN "GUARDAR" ────────────────
//  Porque lo que se está eligiendo es algo que se MIRA. Con un botón de
//  guardar, la única forma de saber cómo quedó la portada sería guardar cada
//  combinación y después arrepentirse, que es el camino largo de la misma
//  decisión. Tocando un dibujo, la portada de arriba cambia en el acto.
//
//  Se guarda solo, igual que el ajuste de quién ve la foto. Si el guardado
//  falla, quien llama vuelve a lo anterior y lo dice: no se deja una pantalla
//  mostrando algo que no quedó guardado.
//
//  ── LAS MUESTRAS SE DIBUJAN CON EL COLOR ELEGIDO ──────────────────────────
//  No con un color fijo de catálogo. Es la diferencia entre ver ocho dibujos y
//  ver TU portada de ocho maneras: con muestras azules, elegir "rayas" y que
//  salgan verdes sería adivinar.
// ============================================================================
import { useRef } from "react";
import { useI18n } from "../i18n/core";
import { COLORES, DIBUJOS, fondoDePortada } from "../services/portadaDePerfil";
import Spinner from "./Spinner";

export default function EditorDePortada({
  dibujo, color, foto, onCambiar, onElegirFoto, onQuitarFoto,
  subiendoFoto = false, deshabilitado = false, onCerrar,
}) {
  const { t: tr } = useI18n();
  const archivo = useRef(null);

  const rotulo = {
    fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
    textTransform: "uppercase", color: "var(--fw-text-4)", marginBottom: 9,
  };

  return (
    <div style={{
      marginTop: 14, padding: 16, borderRadius: 14,
      background: "var(--fw-surface-2)", border: "1px solid var(--fw-border)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fw-text)" }}>
            {tr("portada.titulo")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fw-text-4)", marginTop: 2, lineHeight: 1.5 }}>
            {tr("portada.sub")}
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            flexShrink: 0, background: "var(--fw-surface)", color: "var(--fw-text-2)",
            border: "1px solid var(--fw-border-2)", borderRadius: 8,
            padding: "7px 14px", fontSize: 12.5, fontWeight: 700,
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          {tr("portada.listo")}
        </button>
      </div>

      {/* ── La foto ──────────────────────────────────────────────────────── */}
      {/*
        VA PRIMERO, ARRIBA DE LOS DIBUJOS, porque es la que manda: con una foto
        puesta el dibujo no se ve. Ponerla abajo haría que alguien eligiera un
        dibujo, no viera ningún cambio, y no entendiera por qué.
      */}
      <div style={rotulo}>{tr("portada.foto")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input
          ref={archivo}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const elegido = e.target.files?.[0];
            // Se limpia siempre: sin esto, elegir DOS VECES la misma foto no
            // dispara el evento y parece que el botón no anduvo.
            e.target.value = "";
            if (elegido) onElegirFoto?.(elegido);
          }}
          style={{ display: "none" }}
        />
        <button
          type="button"
          disabled={deshabilitado || subiendoFoto}
          onClick={() => archivo.current?.click()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--fw-surface)", color: "var(--fw-text-2)",
            border: "1px solid var(--fw-border-2)", borderRadius: 8,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
            fontFamily: "inherit",
            cursor: deshabilitado || subiendoFoto ? "default" : "pointer",
            opacity: deshabilitado || subiendoFoto ? .6 : 1,
          }}
        >
          {subiendoFoto
            ? <><Spinner size={13} /> {tr("portada.subiendo")}</>
            : (foto ? tr("portada.cambiarFoto") : tr("portada.subirFoto"))}
        </button>
        {foto && !subiendoFoto && (
          <button
            type="button"
            disabled={deshabilitado}
            onClick={onQuitarFoto}
            style={{
              background: "var(--fw-surface)", color: "var(--fw-red-text-2)",
              border: "1px solid var(--fw-border-2)", borderRadius: 8,
              padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
              fontFamily: "inherit", cursor: deshabilitado ? "default" : "pointer",
              opacity: deshabilitado ? .6 : 1,
            }}
          >
            {tr("portada.quitarFoto")}
          </button>
        )}
        <div style={{ fontSize: 11.5, color: "var(--fw-text-4)", lineHeight: 1.45, minWidth: 0 }}>
          {foto ? tr("portada.conFoto") : tr("portada.fotoNota")}
        </div>
      </div>

      {/*
        ── Los dibujos y los colores ──────────────────────────────────────

        Con una foto puesta se ven apagados pero SIGUEN ANDANDO. No se bloquean
        a propósito: lo que se elija acá queda guardado abajo de la foto y
        aparece el día que la saque. Bloquearlos obligaría a quitar la foto para
        poder preparar lo que va a quedar después, que es al revés de como
        alguien prueba cosas.
      */}
      <div style={{ opacity: foto ? .55 : 1 }}>
      {/* ── Los dibujos ──────────────────────────────────────────────────── */}
      <div style={rotulo}>{tr("portada.dibujo")}</div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
        gap: 9, marginBottom: 18,
      }}>
        {DIBUJOS.map((clave) => {
          const elegido = clave === dibujo;
          return (
            <button
              key={clave}
              type="button"
              disabled={deshabilitado}
              onClick={() => onCambiar(clave, color)}
              aria-pressed={elegido}
              title={tr(`portada.${clave}`)}
              style={{
                padding: 0, border: "none", background: "none",
                cursor: deshabilitado ? "default" : "pointer",
                fontFamily: "inherit", textAlign: "left",
                opacity: deshabilitado ? .6 : 1,
              }}
            >
              <div style={{
                ...fondoDePortada(clave, color),
                height: 44, borderRadius: 9,
                // El elegido se marca con un anillo y no con un borde: un borde
                // cambia el tamaño de la muestra y las ocho dejan de estar
                // alineadas. También va más grueso que un simple contorno,
                // porque sobre un dibujo de color un hilo de 1px no se ve.
                boxShadow: elegido
                  ? "0 0 0 2px var(--fw-surface-2), 0 0 0 4px var(--fw-blue)"
                  : "inset 0 0 0 1px rgba(0,0,0,.08)",
              }} />
              <div style={{
                fontSize: 11, marginTop: 5, lineHeight: 1.3,
                color: elegido ? "var(--fw-text)" : "var(--fw-text-3)",
                fontWeight: elegido ? 700 : 500,
              }}>
                {tr(`portada.${clave}`)}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Los colores ──────────────────────────────────────────────────── */}
      <div style={rotulo}>{tr("portada.color")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>
        {COLORES.map((uno) => {
          const elegido = uno.toLowerCase() === (color || "").toLowerCase();
          return (
            <button
              key={uno}
              type="button"
              disabled={deshabilitado}
              onClick={() => onCambiar(dibujo, uno)}
              aria-pressed={elegido}
              aria-label={uno}
              title={uno}
              style={{
                width: 30, height: 30, minHeight: 30, padding: 0,
                borderRadius: "50%", background: uno, border: "none",
                cursor: deshabilitado ? "default" : "pointer",
                opacity: deshabilitado ? .6 : 1,
                boxShadow: elegido
                  ? "0 0 0 2px var(--fw-surface-2), 0 0 0 4px var(--fw-blue)"
                  : "inset 0 0 0 1px rgba(0,0,0,.18)",
              }}
            />
          );
        })}

        {/*
          CUALQUIER OTRO COLOR.

          Ocho sugeridos alcanzan para la mayoría, pero son una sugerencia y no
          un límite. El cuadradito es el selector del propio navegador: no hay
          nada que programar y en el celular abre la rueda de colores del
          sistema, que es mejor que cualquier cosa que pudiéramos dibujar.

          Va con `onInput` además de `onChange`: en algunos navegadores,
          arrastrando por la rueda solo salta `input` hasta que se cierra, y la
          portada de arriba se quedaba quieta mientras la persona elegía.
        */}
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          fontSize: 12.5, color: "var(--fw-text-3)", cursor: deshabilitado ? "default" : "pointer",
          padding: "5px 10px 5px 5px", borderRadius: 999,
          border: "1px dashed var(--fw-border-2)",
        }}>
          <input
            type="color"
            value={color}
            disabled={deshabilitado}
            onInput={(e) => onCambiar(dibujo, e.target.value)}
            onChange={(e) => onCambiar(dibujo, e.target.value)}
            style={{
              width: 26, height: 26, padding: 0, border: "none",
              borderRadius: "50%", background: "none",
              cursor: deshabilitado ? "default" : "pointer",
            }}
          />
          {tr("portada.otroColor")}
        </label>
      </div>
      </div>
    </div>
  );
}
