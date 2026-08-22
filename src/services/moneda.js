// ============================================================================
//  moneda — Mostrar los precios en la moneda de quien mira
// ----------------------------------------------------------------------------
//  POR QUÉ: los precios se cargan y se cobran en pesos argentinos, y así tienen
//  que quedar. Pero alguien de afuera que ve "$38.000" no tiene idea de si eso
//  es caro o barato: le falta la referencia. Es lo mismo que hace Airbnb, y por
//  eso tiene el selector de moneda al lado del de idioma.
//
//  ES SOLO PARA MIRAR. La reserva, el pago y lo que le queda al dueño siguen
//  siendo en pesos: convertir de verdad significaría cobrar en otra moneda, y
//  eso no lo decide una pantalla. Por eso el selector avisa que el cobro es en
//  pesos y que la conversión es aproximada.
//
//  DE DÓNDE SALE LA COTIZACIÓN: se pide a un servicio público y gratuito
//  (open.er-api.com, sin clave) una vez por día y se guarda en el navegador. Si
//  no contesta —o si no hay internet— se usa la tabla de abajo. Una cotización
//  vieja de un día no cambia nada acá: lo que importa es el orden de magnitud,
//  no el centavo.
// ============================================================================

/** Cuántos pesos vale UNA unidad de cada moneda. Respaldo, no verdad revelada. */
const PESOS_POR_UNIDAD = {
  ARS: 1,
  USD: 1470,
  EUR: 1600,
  BRL: 270,
  CLP: 1.55,
  UYU: 37,
  PYG: 0.2,
  GBP: 1870,
};

/**
 * Las monedas que se ofrecen, en el orden en que aparecen.
 *
 * Primero el peso, que es la moneda real de la operación. Después el dólar y el
 * euro, que son las dos referencias que entiende cualquiera. Y al final las de
 * los países de donde más gente puede venir a alquilar un auto acá.
 */
export const MONEDAS = [
  { code: "ARS", simbolo: "$", locale: "es-AR" },
  { code: "USD", simbolo: "US$", locale: "en-US" },
  { code: "EUR", simbolo: "€", locale: "de-DE" },
  { code: "BRL", simbolo: "R$", locale: "pt-BR" },
  // El peso chileno usa el mismo signo que el argentino: acá lleva el código
  // adelante, o "$26.000" no diría nada.
  { code: "CLP", simbolo: "CLP$", locale: "es-CL" },
  { code: "UYU", simbolo: "$U", locale: "es-UY" },
  { code: "PYG", simbolo: "₲", locale: "es-PY" },
  { code: "GBP", simbolo: "£", locale: "en-GB" },
];

export const MONEDA_POR_DEFECTO = "ARS";

const CLAVE_ELEGIDA = "fw_moneda";
const CLAVE_TASAS = "fw_tasas";
const UN_DIA = 24 * 60 * 60 * 1000;

export function esMonedaValida(code) {
  return MONEDAS.some((m) => m.code === code);
}

/** La que había quedado elegida la vez pasada. */
export function monedaGuardada() {
  try {
    const guardada = localStorage.getItem(CLAVE_ELEGIDA);
    return esMonedaValida(guardada) ? guardada : MONEDA_POR_DEFECTO;
  } catch {
    // Navegador con el almacenamiento bloqueado: no es un error, se sigue.
    return MONEDA_POR_DEFECTO;
  }
}

export function guardarMoneda(code) {
  try { localStorage.setItem(CLAVE_ELEGIDA, code); } catch { /* ver arriba */ }
}

/** Las cotizaciones que se hayan bajado, si no están vencidas. */
function tasasGuardadas() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_TASAS) || "null");
    if (!crudo || Date.now() - crudo.cuando > UN_DIA) return null;
    return crudo.pesosPorUnidad;
  } catch {
    return null;
  }
}

/**
 * Trae las cotizaciones del día. Devuelve SIEMPRE una tabla usable: la que bajó,
 * la que estaba guardada, o la de respaldo.
 *
 * El servicio devuelve cuántas unidades de cada moneda entran en un peso; acá se
 * usa al revés —cuántos pesos vale una unidad— porque es como se piensa la
 * cuenta y como está escrita la tabla de respaldo.
 */
export async function traerTasas() {
  const guardadas = tasasGuardadas();
  if (guardadas) return guardadas;

  try {
    const r = await fetch("https://open.er-api.com/v6/latest/ARS");
    if (!r.ok) throw new Error(String(r.status));
    const datos = await r.json();
    const porPeso = datos?.rates;
    if (!porPeso) throw new Error("sin cotizaciones");

    const pesosPorUnidad = { ARS: 1 };
    for (const { code } of MONEDAS) {
      const valor = Number(porPeso[code]);
      // Se descarta cualquier valor raro en vez de dejar pasar un precio absurdo.
      if (code !== "ARS" && Number.isFinite(valor) && valor > 0) {
        pesosPorUnidad[code] = 1 / valor;
      }
    }
    try {
      localStorage.setItem(CLAVE_TASAS, JSON.stringify({ cuando: Date.now(), pesosPorUnidad }));
    } catch { /* ver arriba */ }
    return { ...PESOS_POR_UNIDAD, ...pesosPorUnidad };
  } catch {
    return PESOS_POR_UNIDAD;
  }
}

export const TASAS_DE_RESPALDO = PESOS_POR_UNIDAD;

/**
 * Redondeo con la pinta de un precio.
 *
 * Convertir 38.000 pesos a dólares da 25,85: escrito así parece calculado con
 * lupa, cuando en realidad es una cuenta aproximada. Se redondea a algo redondo
 * según el tamaño del número —de a 1, de a 10, de a 100— para que se lea como
 * lo que es: una referencia.
 */
function redondearLindo(n) {
  if (!Number.isFinite(n) || n === 0) return 0;
  const abs = Math.abs(n);
  const paso = abs >= 100000 ? 1000 : abs >= 10000 ? 100 : abs >= 1000 ? 10 : 1;
  return Math.round(n / paso) * paso;
}

/**
 * El precio escrito, ya convertido.
 *
 * `monto` viene siempre en pesos: es como está guardado todo en la base.
 */
export function formatearPrecio(monto, code = MONEDA_POR_DEFECTO, tasas = PESOS_POR_UNIDAD) {
  const numero = Number(monto);
  if (!Number.isFinite(numero)) return "";

  const moneda = MONEDAS.find((m) => m.code === code) || MONEDAS[0];
  const pesosPorUnidad = Number(tasas?.[moneda.code]) || PESOS_POR_UNIDAD[moneda.code] || 1;
  const valor = redondearLindo(numero / pesosPorUnidad);

  /*
    EL SÍMBOLO SE PONE ACÁ, NO SE LO PIDE AL NAVEGADOR.

    Con el formato de moneda de Intl, el dólar en inglés sale "$26": el mismo
    signo que el peso. En una app argentina, donde al lado hay precios en pesos,
    eso es justo lo contrario de lo que se busca —alguien de afuera tiene que
    poder distinguir de un vistazo en qué está mirando el precio— y lo mismo
    pasa con el peso chileno y el uruguayo. Por eso el símbolo sale de la tabla,
    donde el dólar es "US$", el uruguayo "$U" y el chileno lleva su código.

    De Intl se usa solo el número, que es lo que hace bien: la separación de
    miles como se escribe en cada lugar.
  */
  let escrito;
  try {
    escrito = new Intl.NumberFormat(moneda.locale, { maximumFractionDigits: 0 }).format(valor);
  } catch {
    escrito = String(Math.round(valor));
  }
  return `${moneda.simbolo}${escrito}`;
}
