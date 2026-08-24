// ============================================================================
//  precio.js — Sacarle un precio usable a lo que contestó la IA
// ----------------------------------------------------------------------------
//  El botón "Sugerir con IA" del formulario de publicar le pide al modelo que
//  estime cuánto vale el auto usado y que de ahí saque el alquiler por día.
//  Este archivo se ocupa de lo que viene después: leer esa respuesta y quedarse
//  con un número que se pueda cargar en el campo.
//
//  POR QUÉ EXISTE. Antes esto eran cuatro líneas adentro del formulario y el
//  botón contestaba "la IA devolvió un precio fuera de lo razonable" casi
//  siempre. La culpa no era del modelo: era de cómo se leía la respuesta.
//
//   1. LOS NÚMEROS VENÍAN COMO TEXTO. Un modelo que contesta en castellano
//      escribe "45.000", y `Number("45.000")` da CUARENTA Y CINCO. Cuarenta y
//      cinco pesos por día no pasa ningún control, así que la respuesta —que
//      estaba perfecta— se tiraba a la basura. Con "$45.000" es peor todavía:
//      da NaN.
//
//   2. SE TIRABA TODO POR UN CAMPO. Si el modelo se confundía de moneda y
//      contestaba el alquiler en dólares, o metía el valor del auto en el campo
//      del alquiler, se descartaba la respuesta ENTERA, incluida la estimación
//      del valor del auto, que estaba bien y alcanza para calcular el alquiler.
//
//  Ahora se prueban varios caminos en orden y se usa el primero que dé un
//  número creíble. Solo si ninguno sirve se avisa que no se pudo.
//
//  Está en un archivo aparte, y no adentro de la pantalla, porque son cuentas
//  que se pueden probar sin navegador y sin gastar cuota de IA: las pruebas
//  están en precio.test.js.
// ============================================================================

/** Un alquiler por día en pesos, de lo más barato a lo más caro imaginable. */
export const PISO_POR_DIA = 3_000;
export const TECHO_POR_DIA = 3_000_000;

/**
 * Abajo de esto no se sugiere ningún precio.
 *
 * No es que la cuenta esté mal: un auto viejo puede dar $5.000 por día y la
 * estimación es correcta. El problema es otro. Nadie entrega su auto, con el
 * riesgo que eso tiene, por esa plata; y ver ese número al lado de la foto del
 * auto propio se siente como una opinión sobre el auto, no como un dato.
 *
 * Así que abajo de este piso la app no propone nada: deja el campo vacío y
 * explica, sin números que duelan, que por los años del auto la sugerencia
 * automática no sirve y que el precio lo ponga el dueño. Sugerir algo que nadie
 * va a aceptar no ayuda a publicar; ofende y encima no sirve.
 */
export const PISO_RENTABLE = 25_000;

/** Cuánto puede valer un auto usado en pesos. La banda es ancha a propósito. */
export const PISO_DEL_AUTO = 500_000;
export const TECHO_DEL_AUTO = 1_000_000_000;

/**
 * Qué porción del valor del auto se cobra por día.
 *
 * Es el medio de la banda que se le pide al modelo (0,15% a 0,30%). Se usa solo
 * cuando hay que calcular el alquiler a partir del valor, o sea cuando el modelo
 * estimó bien el auto pero se equivocó al pasar eso a un precio por día.
 */
export const PORCION_POR_DIA = 0.0022;

/**
 * Convierte a número algo que puede venir como número o como texto.
 *
 * El caso que importa es el texto en castellano: "45.000" son cuarenta y cinco
 * mil, no cuarenta y cinco. Y "$ 45.000 ARS" también.
 *
 * La regla para el punto y la coma:
 *  · Si están los dos, manda el ÚLTIMO: es el separador decimal.
 *      "45.000,50" → 45000.5   ·   "45,000.50" → 45000.5
 *  · Si está uno solo y lo siguen exactamente tres dígitos, es de miles.
 *      "45.000" → 45000        ·   "45,000" → 45000
 *  · Si no, es decimal.
 *      "45.5" → 45.5           ·   "0,3" → 0.3
 *
 * Devuelve null si no hay ningún número adentro, para que quien llama pueda
 * distinguir "no vino" de "vino cero".
 */
export function aNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;

  // Se tira todo lo que no sea dígito, punto, coma o el signo de menos.
  const limpio = valor.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(limpio)) return null;

  const ultimoPunto = limpio.lastIndexOf(".");
  const ultimaComa = limpio.lastIndexOf(",");
  let decimal = -1;

  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    decimal = Math.max(ultimoPunto, ultimaComa);
  } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
    const unico = Math.max(ultimoPunto, ultimaComa);
    const atras = limpio.length - unico - 1;
    // Tres dígitos atrás y ningún otro separador: es de miles.
    if (atras !== 3) decimal = unico;
  }

  const enteros = (decimal >= 0 ? limpio.slice(0, decimal) : limpio).replace(/[.,]/g, "");
  const decimales = decimal >= 0 ? limpio.slice(decimal + 1).replace(/[.,]/g, "") : "";
  const n = Number(decimales ? `${enteros}.${decimales}` : enteros);
  return Number.isFinite(n) ? n : null;
}

/** ¿Este número puede ser un alquiler por día en pesos? */
export function esPrecioCreible(precio, valorDelAuto = null) {
  if (!Number.isFinite(precio) || precio < PISO_POR_DIA || precio > TECHO_POR_DIA) return false;
  // Con el valor del auto a mano se puede pedir más: un alquiler diario está
  // entre el 0,05% y el 1,5% de lo que vale el auto. Fuera de eso, alguno de los
  // dos números está mal, y conviene calcularlo en vez de creerle.
  if (Number.isFinite(valorDelAuto) && valorDelAuto >= PISO_DEL_AUTO) {
    const porcion = precio / valorDelAuto;
    if (porcion < 0.0005 || porcion > 0.015) return false;
  }
  return true;
}

/**
 * Devuelve la respuesta de la IA con un `precio_recomendado` usable.
 *
 * `origen` dice de dónde salió el número, para poder avisarlo en pantalla:
 *   · "ia"        → lo dijo el modelo y era creíble.
 *   · "rango"     → faltaba, y se usó el medio entre el mínimo y el máximo.
 *   · "valor"     → no servía, y se calculó a partir del valor del auto. Es lo
 *                   que salva el caso del modelo que contesta en dólares o que
 *                   pone el valor del auto en el campo del alquiler.
 *   · "bajoElPiso" → la cuenta dio bien pero da menos de lo que nadie aceptaría.
 *                   Ahí `precio_recomendado` viene en null A PROPÓSITO y NO se
 *                   devuelve ningún número: ni el precio, ni el rango, ni lo que
 *                   sale el auto. La pantalla explica la situación con palabras.
 *                   Ver PISO_RENTABLE.
 *
 * Lanza solo si no quedó ningún camino.
 */
export function precioUsable(respuesta) {
  const datos = respuesta || {};
  const valor = aNumero(datos.valor_estimado);
  const valorCreible = Number.isFinite(valor) && valor >= PISO_DEL_AUTO && valor <= TECHO_DEL_AUTO
    ? valor : null;

  const min = aNumero(datos.precio_min);
  const max = aNumero(datos.precio_max);

  const candidatos = [
    ["ia", aNumero(datos.precio_recomendado)],
    ["rango", Number.isFinite(min) && Number.isFinite(max) ? Math.round((min + max) / 2) : null],
    ["valor", valorCreible ? Math.round(valorCreible * PORCION_POR_DIA) : null],
  ];

  for (const [origen, precio] of candidatos) {
    if (precio !== null && esPrecioCreible(precio, valorCreible)) {
      /*
        LA CUENTA DIO BIEN Y EL NÚMERO NO SIRVE.

        Un auto de veinte años puede dar $5.000 por día, y la estimación está
        correcta. Pero nadie deja su auto en manos de un desconocido por esa
        plata, y ese número al lado de la foto del auto propio no se lee como un
        dato: se lee como una opinión sobre el auto.

        Así que no se devuelve NADA. Ni el precio, ni el rango, ni lo que sale el
        auto: son justo los números que molestan. Solo la marca de que quedó por
        debajo del piso, y la pantalla lo cuenta con palabras.
      */
      if (Math.round(precio) < PISO_RENTABLE) {
        return {
          justificacion: null,
          valor_estimado: null,
          precio_min: null,
          precio_max: null,
          precio_recomendado: null,
          origen: "bajoElPiso",
        };
      }
      return {
        ...datos,
        valor_estimado: valorCreible ?? datos.valor_estimado,
        precio_min: Number.isFinite(min) ? min : datos.precio_min,
        precio_max: Number.isFinite(max) ? max : datos.precio_max,
        precio_recomendado: Math.round(precio),
        origen,
      };
    }
  }

  const err = new Error("La respuesta de la IA no trae ningún precio usable.");
  err.precioRaro = true;
  throw err;
}
