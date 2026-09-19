// ============================================================================
//  comprobante.js — Qué dice el ticket del alquiler, decidido en un solo lugar
// ----------------------------------------------------------------------------
//  Cuando el alquiler queda pagado, la pantalla imprime un comprobante. Acá
//  vive QUÉ renglones tiene y en qué orden; el dibujo —el papel, la impresora,
//  la tipografía de máquina— está en components/Comprobante.
//
//  ── POR QUÉ ESTO NO ESTÁ ADENTRO DEL COMPONENTE ───────────────────────────
//  Porque un comprobante es una cuenta, y una cuenta o cierra o no cierra. Las
//  reglas que decide este archivo son las que se pueden equivocar:
//
//   · El DEPÓSITO no suma al total. Es una retención: se bloquea en la tarjeta
//     y vuelve. Sumarlo sería cobrar doscientos dólares de más en el papel que
//     queda como constancia, y es exactamente el error que nadie mira dos
//     veces porque el número "parece" bien.
//   · Un tramo sin monto NO EXISTE. Una reserva sin depósito no lleva un
//     renglón de depósito en cero.
//   · Los cargos en cero tampoco se escriben. Un ticket enumera lo que se
//     cobró; "Seguro $0" no es información, es ruido en el único lugar donde
//     cada renglón tendría que significar algo.
//
//  Escrito adentro del componente, esto se prueba mirando la pantalla. Acá se
//  prueba con `npm test`, que es lo que hace que siga estando bien dentro de
//  tres cambios.
//
//  Los renglones salen con la CLAVE de traducción y el número crudo, no con el
//  texto ya armado: quién traduce y quién formatea la plata es la pantalla, que
//  es la que sabe en qué idioma está y qué moneda usa la reserva.
// ============================================================================

/**
 * EL NÚMERO DEL COMPROBANTE, sacado del identificador de la reserva.
 *
 * Un identificador entero son treinta y seis caracteres y nadie los lee ni los
 * dicta por teléfono. Los primeros ocho alcanzan de sobra para encontrar una
 * reserva entre las de una persona, que es para lo único que sirve un número
 * de comprobante: poder nombrarlo.
 *
 * En mayúsculas porque va sobre papel de máquina, donde todo es mayúscula.
 */
export function numeroDeComprobante(bookingId) {
  const limpio = String(bookingId ?? "").replace(/[^0-9a-zA-Z]/g, "");
  if (!limpio) return "";
  return `FW-${limpio.slice(0, 8).toUpperCase()}`;
}

/** Un importe que vale la pena escribir: existe y no es cero. */
const seEscribe = (monto) => monto != null && Number(monto) !== 0;

/**
 * LOS RENGLONES DEL COMPROBANTE, en el orden en que se imprimen.
 *
 * Cada uno es `{ tipo, clave, valor?, monto? }`:
 *
 *   · "dato"      un texto (el auto, las fechas): `valor` ya viene armado.
 *   · "monto"     un importe: `monto` crudo, lo formatea la pantalla.
 *   · "total"     el importe grande, el que cierra la cuenta.
 *   · "retenido"  el depósito: es plata bloqueada, no cobrada, y va DESPUÉS
 *                 del total justamente para que no parezca parte de él.
 *   · "corte"     una línea de puntos.
 *
 * @param datos.booking  la reserva, con sus instantáneas de precio
 * @param datos.payment  el estado de pago del servidor, si se tiene (manda él:
 *                       los montos los calcula el servidor)
 * @param datos.dias     los días del alquiler, que la pantalla ya calculó
 */
export function lineasDelComprobante({ booking, payment, dias } = {}) {
  const b = booking ?? {};
  const p = payment ?? {};

  const total = p.total ?? b.totalPriceSnapshot ?? 0;
  const sena = p.sena ?? b.senaAmountSnapshot;
  const saldo = p.balance ?? b.balanceAmountSnapshot;
  const deposito = p.deposit ?? b.depositSnapshot;
  const comision = p.commission ?? b.platformFeeSnapshot;
  const seguro = p.insurance ?? b.insuranceSnapshot;
  const porDia = b.pricePerDaySnapshot;

  const lineas = [];
  const agregar = (linea) => { if (linea) lineas.push(linea); };

  const vehiculo = vehiculoComoSeLee(b);
  agregar(vehiculo ? { tipo: "dato", clave: "payment.vehicle", valor: vehiculo } : null);
  agregar(b.startDate ? { tipo: "fecha", clave: "payment.from", valor: b.startDate } : null);
  agregar(b.endDate ? { tipo: "fecha", clave: "payment.to", valor: b.endDate } : null);
  agregar(dias ? { tipo: "dato", clave: "payment.days", valor: String(dias) } : null);

  agregar({ tipo: "corte" });

  /*
    EL ALQUILER: LO QUE SUMA, NO EL PRECIO DE UN DÍA.

    El renglón dice "Alquiler x 7" y al lado va el SUBTOTAL de esos siete días.
    Poner ahí el precio por día era un renglón que se lee como una cuenta y no
    cierra: "x 7" al lado de $38.225 dice que el resultado es 38.225.

    El subtotal lo trae la reserva; multiplicar es el último recurso, para las
    reservas viejas que no lo tienen guardado.
  */
  const subtotal = b.rentalSubtotalSnapshot
    ?? (seEscribe(porDia) && dias ? porDia * dias : null);
  agregar(seEscribe(subtotal)
    ? { tipo: "monto", clave: "comprobante.alquiler", monto: subtotal, multiplicador: dias }
    : null);
  agregar(seEscribe(comision) ? { tipo: "monto", clave: "car.fee", monto: comision } : null);
  agregar(seEscribe(seguro) ? { tipo: "monto", clave: "payment.insurance", monto: seguro } : null);

  agregar({ tipo: "corte" });
  agregar({ tipo: "total", clave: "payment.totalPaid", monto: total });

  // Cómo se pagó ese total: en dos tramos, y el papel lo dice.
  agregar(seEscribe(sena) ? { tipo: "monto", clave: "payment.sena", monto: sena } : null);
  agregar(seEscribe(saldo) ? { tipo: "monto", clave: "payment.balance", monto: saldo } : null);

  /*
    EL DEPÓSITO VA ABAJO DEL TOTAL Y NO SUMA.

    Es una retención: la plata queda bloqueada en la tarjeta y vuelve cuando se
    devuelve el auto. Meterlo arriba, entre los cargos, haría que el comprobante
    diga que se cobraron doscientos dólares que no se cobraron.
  */
  if (seEscribe(deposito)) {
    agregar({ tipo: "corte" });
    agregar({ tipo: "retenido", clave: "payment.guarantee", monto: deposito });
  }

  return lineas;
}

/** "Toyota Corolla 2022", con lo que haya: sin marca no se inventa nada. */
export function vehiculoComoSeLee(booking) {
  const v = booking?.listing?.vehicle || booking?.vehicle || {};
  return [v.brand, v.model, v.year].filter(Boolean).join(" ");
}
