// ============================================================================
//  tarjeta.js — Reconocer y revisar una tarjeta ANTES de mandarla a cobrar
// ----------------------------------------------------------------------------
//  Acá no se cobra nada ni se habla con nadie: son las cuentas que decide el
//  navegador mientras alguien escribe los números. Qué tarjeta es, si el número
//  puede existir, si la fecha sirve, cuántos dígitos tiene el código de atrás y
//  si el nombre que dice el plástico es el de la cuenta.
//
//  ── POR QUÉ REVISAR ACÁ SI DESPUÉS REVISA EL BANCO ────────────────────────
//  Porque el banco tarda y cobra el viaje. Un número al que le falta un dígito
//  no necesita dar la vuelta al mundo para que alguien conteste "rechazada":
//  eso se sabe en el momento, con el dedo todavía en el teclado, y se avisa
//  ahí. Lo que el banco decide —si hay plata, si la tarjeta está activa, si el
//  dueño la denunció— no se puede adivinar desde acá y no se intenta.
//
//  ── EL NÚMERO COMPLETO NO SE GUARDA. NI ACÁ NI EN NINGÚN LADO ─────────────
//  Estas funciones reciben el número, contestan, y se olvidan. Lo único que
//  sobrevive a la pantalla son los últimos cuatro dígitos y la marca, que es
//  exactamente lo que muestra cualquier aplicación cuando dice "Visa ···· 4242".
//  El cobro lo hace Stripe con sus propios campos (ver ContadorDeTarjeta y
//  services/stripe.js): el número entero nunca pasa por este código.
// ============================================================================

/*
  LAS MARCAS SE RECONOCEN POR LOS PRIMEROS DÍGITOS.

  No es una convención nuestra: los primeros seis dígitos de cualquier tarjeta
  del mundo son el emisor, y los rangos están repartidos. Un 4 adelante es Visa
  y nada más que Visa; el 51 al 55 y el 2221 al 2720 son Mastercard; el 34 y el
  37, American Express.

  Por eso la marca aparece apenas se escribe el primer dígito, antes de terminar
  el número: no hace falta el número entero para saber de qué tarjeta se trata,
  y que el logo aparezca solo mientras uno escribe es lo que hace que la
  pantalla se sienta viva en vez de un formulario que contesta al final.
*/
const MARCAS = [
  {
    id: "visa",
    nombre: "Visa",
    // El 4 alcanza. Visa no comparte ese dígito con nadie.
    empieza: (n) => /^4/.test(n),
    largos: [13, 16, 19],
    codigo: 3,
    grupos: [4, 4, 4, 4],
  },
  {
    id: "mastercard",
    nombre: "Mastercard",
    // Dos rangos: el viejo (51-55) y el que se abrió en 2017 (2221-2720).
    empieza: (n) => /^5[1-5]/.test(n) || enRango(n, 2221, 2720, 4),
    largos: [16],
    codigo: 3,
    grupos: [4, 4, 4, 4],
  },
  {
    id: "amex",
    nombre: "American Express",
    empieza: (n) => /^3[47]/.test(n),
    // La única de las tres que no tiene 16 dígitos ni código de 3: son 15 y 4.
    // Escribir "el código son tres números" en la pantalla sería mentirle a
    // quien tiene una Amex en la mano.
    largos: [15],
    codigo: 4,
    grupos: [4, 6, 5],
  },
];

/** Una marca desconocida sigue siendo una tarjeta: se acepta con lo estándar. */
const OTRA = {
  id: "otra",
  nombre: "Tarjeta",
  largos: [12, 13, 14, 15, 16, 17, 18, 19],
  codigo: 3,
  grupos: [4, 4, 4, 4],
};

/**
 * Si los primeros dígitos caen adentro de un rango numérico.
 *
 * Se compara con los dígitos que HAY, no con los que faltan: escribiendo "2"
 * todavía puede terminar siendo una Mastercard (2221) o cualquier otra cosa
 * (2999), así que mientras no haya suficientes dígitos para decidir, no se
 * decide. Anunciar "Mastercard" en el primer 2 y borrarlo en el tercero sería
 * peor que no decir nada.
 */
function enRango(numero, desde, hasta, digitos) {
  if (numero.length < digitos) return false;
  const cabeza = Number(numero.slice(0, digitos));
  return cabeza >= desde && cabeza <= hasta;
}

/*
  Solo los dígitos: se escribe con espacios, guiones o como salga.

  El `??` en vez de `||` no es un detalle de estilo. Con `||`, el número CERO
  —que llega cuando alguien teclea "00" en el mes— es falso y se convertía en
  texto vacío, así que un mes que no existe se anunciaba como un campo sin
  llenar. Dos avisos distintos colapsados en uno por un operador.
*/
export const soloDigitos = (texto) => String(texto ?? "").replace(/\D/g, "");

/**
 * Qué tarjeta es, a partir de lo que se haya escrito hasta ahora.
 *
 * Devuelve siempre algo: sin dígitos suficientes contesta `OTRA`, que es "no sé
 * todavía" y no "está mal". Misma regla que en el resto de la app: sin dato no
 * se bloquea.
 */
export function marcaDeLaTarjeta(numero) {
  const n = soloDigitos(numero);
  if (!n) return OTRA;
  return MARCAS.find(m => m.empieza(n)) || OTRA;
}

/**
 * EL CONTROL DE LUHN: la cuenta que traen adentro todas las tarjetas.
 *
 * El último dígito de una tarjeta no es parte del número: es un control, y sale
 * de una cuenta sobre los anteriores. O sea que un número con un dígito mal
 * tecleado o dos cambiados de lugar —que son los dos errores que comete una
 * persona escribiendo dieciséis números— casi siempre falla esta cuenta.
 *
 * Es lo que permite decir "revisá el número" en el momento, sin preguntarle a
 * nadie, en vez de mandarlo a cobrar y esperar un rechazo que no explica nada.
 */
export function pasaLuhn(numero) {
  const n = soloDigitos(numero);
  if (n.length < 12) return false;
  let suma = 0;
  let duplicar = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (duplicar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

/**
 * El número escrito con los espacios de la marca.
 *
 * No es decoración: dieciséis dígitos seguidos no se pueden releer ni corregir,
 * y todo el mundo compara contra el plástico, que viene agrupado de a cuatro.
 * Amex viene 4-6-5 y por eso los grupos salen de la marca y no de una constante.
 */
export function numeroConEspacios(numero) {
  const n = soloDigitos(numero);
  const { grupos, largos } = marcaDeLaTarjeta(n);
  const tope = Math.max(...largos);
  const recortado = n.slice(0, tope);
  const partes = [];
  let desde = 0;
  for (const tamaño of grupos) {
    if (desde >= recortado.length) break;
    partes.push(recortado.slice(desde, desde + tamaño));
    desde += tamaño;
  }
  // Lo que sobra de un número más largo que los grupos previstos (Visa de 19)
  // se agrega entero en vez de perderse.
  if (desde < recortado.length) partes.push(recortado.slice(desde));
  return partes.join(" ");
}

/** Los cuatro de atrás, que son los únicos que se guardan. */
export const ultimosCuatro = (numero) => soloDigitos(numero).slice(-4);

/**
 * El número entero, revisado.
 *
 * Los tres motivos de rechazo son distintos a propósito: "faltan números" no es
 * lo mismo que "el número no existe", y quien está escribiendo necesita saber
 * cuál de las dos cosas le pasa. Un solo mensaje para todo obliga a adivinar.
 */
export function revisarNumero(numero) {
  const n = soloDigitos(numero);
  const marca = marcaDeLaTarjeta(n);
  if (!n) return { ok: false, motivo: "vacio", marca };
  if (!marca.largos.includes(n.length)) return { ok: false, motivo: "largo", marca };
  if (!pasaLuhn(n)) return { ok: false, motivo: "invalido", marca };
  return { ok: true, motivo: null, marca };
}

/**
 * El vencimiento, contra la fecha de hoy.
 *
 * `hoy` entra por parámetro y no se lee adentro: una prueba que dependa del
 * reloj de la máquina pasa hoy y falla en enero. Acá las fechas se eligen.
 *
 * Una tarjeta vence el ÚLTIMO día de su mes, así que el mes en curso todavía
 * sirve: rechazar una tarjeta que vence este mes sería rechazar una tarjeta
 * que anda.
 */
export function revisarVencimiento(mes, anio, hoy = new Date()) {
  const textoMes = soloDigitos(mes);
  const textoAnio = soloDigitos(anio);
  // Vacío se mira sobre el TEXTO y no sobre el número: un "00" tecleado es un
  // mes que no existe, no un campo sin llenar, y son dos avisos distintos.
  if (!textoMes || !textoAnio) return { ok: false, motivo: "vacio" };
  const m = Number(textoMes);
  let a = Number(textoAnio);
  if (m < 1 || m > 12) return { ok: false, motivo: "mes" };
  // "26" y "2026" son la misma fecha escrita de dos maneras, y las dos se
  // escriben: el plástico dice 26 y el teclado numérico invita a poner 2026.
  if (a < 100) a += 2000;
  const limite = new Date(a, m, 1);           // el 1 del mes siguiente
  const referencia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  if (limite <= referencia) return { ok: false, motivo: "vencida" };
  // Más de veinte años adelante no es una tarjeta: es un año mal tecleado.
  if (a > hoy.getFullYear() + 20) return { ok: false, motivo: "lejos" };
  return { ok: true, motivo: null, mes: m, anio: a };
}

/** El código de atrás: tres dígitos, o cuatro si es Amex. */
export function revisarCodigo(codigo, marca) {
  const c = soloDigitos(codigo);
  const largo = marca?.codigo || 3;
  if (!c) return { ok: false, motivo: "vacio", largo };
  if (c.length !== largo) return { ok: false, motivo: "largo", largo };
  return { ok: true, motivo: null, largo };
}

// ── EL NOMBRE DEL PLÁSTICO CONTRA EL NOMBRE DE LA CUENTA ───────────────────

/**
 * Deja un nombre comparable: sin acentos, sin puntos, en mayúsculas.
 *
 * El plástico dice "MARTINA REY" y la cuenta "Martina Rey"; una dice "PEÑA" y
 * la otra "Peña". Comparar los textos tal cual haría que la mitad de los
 * nombres reales no coincidieran consigo mismos.
 */
export function normalizarNombre(texto) {
  return String(texto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Si el nombre de la tarjeta es el de la cuenta.
 *
 *   "igual"     son el mismo nombre escrito igual
 *   "parecido"  es la misma persona con un nombre de más o de menos
 *   "distinto"  no es la misma persona
 *   "sindato"   falta alguno de los dos y no hay nada que comparar
 *
 * ── POR QUÉ "PARECIDO" ES UNA RESPUESTA Y NO UN FRACASO ───────────────────
 * Porque los nombres de las tarjetas están recortados. En el plástico entran
 * unos veinte caracteres, así que a "María Fernanda González Pérez" el banco le
 * imprime "M F GONZALEZ" o "MARIA GONZALEZ" y ninguno de los dos es igual al
 * nombre de la cuenta. Exigir el texto exacto sería rechazar la tarjeta de
 * quien la tiene en la mano, que es el peor error posible acá.
 *
 * Lo que sí se rechaza es otro apellido: ahí no hay recorte que lo explique.
 *
 * Las iniciales sueltas se ignoran: una letra sola no dice nada de quién es
 * —"M" está en medio millón de nombres— así que ni suma ni resta.
 */
export function coincideElNombre(nombreTarjeta, nombreCuenta) {
  const tarjeta = normalizarNombre(nombreTarjeta);
  const cuenta = normalizarNombre(nombreCuenta);
  if (!tarjeta || !cuenta) return "sindato";
  if (tarjeta === cuenta) return "igual";

  const deLaCuenta = cuenta.split(" ");
  const deLaTarjeta = tarjeta.split(" ").filter(p => p.length > 1);
  if (!deLaTarjeta.length) return "sindato";

  // Una parte del nombre de la tarjeta "está" en la cuenta si es una de sus
  // palabras o si la cuenta la tiene abreviada en esa inicial.
  const esta = (parte) => deLaCuenta.some(p => p === parte || (p.length === 1 && parte.startsWith(p)));
  return deLaTarjeta.every(esta) ? "parecido" : "distinto";
}

/**
 * Todo junto: la revisión completa del formulario.
 *
 * Devuelve los errores por campo en vez de un solo "está mal", porque la
 * pantalla tiene que poder marcar EL campo que falla. Un cartel general arriba
 * obliga a buscar cuál de los cuatro es.
 */
export function revisarTarjeta({ numero, mes, anio, codigo, nombre }, { nombreCuenta, hoy } = {}) {
  const numeroRevisado = revisarNumero(numero);
  const marca = numeroRevisado.marca;
  const vencimiento = revisarVencimiento(mes, anio, hoy);
  const codigoRevisado = revisarCodigo(codigo, marca);
  const nombreLimpio = normalizarNombre(nombre);
  const coincidencia = coincideElNombre(nombre, nombreCuenta);

  const errores = {};
  if (!numeroRevisado.ok) errores.numero = `tarjeta.error.numero.${numeroRevisado.motivo}`;
  if (!vencimiento.ok) errores.vencimiento = `tarjeta.error.vencimiento.${vencimiento.motivo}`;
  if (!codigoRevisado.ok) errores.codigo = `tarjeta.error.codigo.${codigoRevisado.motivo}`;
  if (!nombreLimpio) errores.nombre = "tarjeta.error.nombre.vacio";
  else if (coincidencia === "distinto") errores.nombre = "tarjeta.error.nombre.distinto";

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    marca,
    coincidencia,
    // Lo que se guarda si todo dio bien: la marca, los cuatro últimos, el
    // vencimiento y el nombre. El número entero no está y no va a estar.
    tarjeta: {
      marca: marca.id,
      nombreMarca: marca.nombre,
      ultimos: ultimosCuatro(numero),
      mes: vencimiento.mes ?? null,
      anio: vencimiento.anio ?? null,
      nombre: nombreLimpio,
    },
  };
}

/**
 * UNA TARJETA QUE EL PROCESADOR YA TIENE GUARDADA, traducida a la nuestra.
 *
 * ── Qué problema resuelve ─────────────────────────────────────────────────
 * El alquiler se paga en TRES tramos —seña, saldo, depósito— y cada uno es un
 * cobro aparte. Sin esto, la misma persona escribe el mismo número, el mismo
 * vencimiento y el mismo código tres veces en la misma pantalla y en el mismo
 * minuto. Cada vez que se escribe es una vez más que se puede tipear mal, y la
 * tercera es la del depósito, que es la que más se abandona: justo la que deja
 * el auto entregado sin garantía.
 *
 * El servidor (GET /payments/methods) devuelve lo que Stripe guardó: un
 * identificador y las señas de la tarjeta. NO el número, que no existe de este
 * lado. Con el identificador se confirma el cobro sin volver a pedir nada.
 *
 * ── Por qué hace falta traducir ───────────────────────────────────────────
 * Stripe nombra las marcas a su manera y tiene más de las tres que esta
 * pantalla dibuja: "discover", "jcb", "unionpay", "unknown". Todas esas son
 * `otra` acá, que es la pintura gris y el logo de dos rayas — una tarjeta que
 * no reconocemos sigue siendo una tarjeta.
 *
 * Devuelve null cuando falta lo imprescindible: sin identificador no se puede
 * cobrar con ella, y sin los últimos cuatro no se la puede mostrar sin mentir.
 */
export function tarjetaGuardada(cruda) {
  const id = String(cruda?.id ?? "").trim();
  const ultimos = soloDigitos(cruda?.last4).slice(-4);
  if (!id || ultimos.length !== 4) return null;

  const marca = String(cruda?.brand ?? "").toLowerCase();
  const mes = Number(cruda?.expMonth);
  const anio = Number(cruda?.expYear);

  return {
    id,
    marca: MARCAS.find(m => m.id === marca)?.id || OTRA.id,
    ultimos,
    // Sin vencimiento la tarjeta igual sirve para cobrar: el vencimiento acá
    // es para mostrarlo y para descartar las vencidas, no para autorizar nada.
    mes: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null,
    anio: Number.isInteger(anio) && anio > 0 ? anio : null,
  };
}

/**
 * La lista del servidor, limpia y sin las que ya vencieron.
 *
 * Las vencidas se sacan acá y no se muestran tachadas: ofrecer pagar con una
 * tarjeta que el banco va a rechazar es hacerle perder el tiempo a alguien con
 * un cartel de "rechazada" al final. Stripe las sigue devolviendo porque
 * guardarlas es su trabajo; decidir cuál se ofrece es el nuestro.
 *
 * `hoy` entra por parámetro por lo mismo de siempre: una prueba atada al reloj
 * de la máquina pasa hoy y falla en enero.
 */
export function tarjetasGuardadas(lista, hoy = new Date()) {
  return (Array.isArray(lista) ? lista : [])
    .map(t => tarjetaGuardada(t))
    .filter(t => t && !estaVencida(t, hoy));
}

/** "Visa ···· 4242", que es como lo dice cualquier aplicación. */
export function comoSeLee(tarjeta) {
  if (!tarjeta) return "";
  const marca = MARCAS.find(m => m.id === tarjeta.marca)?.nombre || OTRA.nombre;
  return `${marca} ···· ${tarjeta.ultimos || "----"}`;
}

/**
 * EL NÚMERO COMO SE VE EN LA TARJETA cuando solo se conocen los últimos cuatro.
 *
 * "•••• •••• •••• 4242", y con Amex "•••• •••••• •4242", porque Amex no tiene
 * 16 dígitos ni se agrupa de a cuatro: son 15 y van 4-6-5. Dibujar una Amex con
 * cuatro grupos de cuatro es dibujar una tarjeta que no existe, y se nota al
 * lado del plástico.
 *
 * El largo sale de los grupos de la marca, que suman exactamente el largo
 * habitual. Los otros largos que admite una marca —Visa acepta 13 y 19— no se
 * usan acá: esto es un dibujo, no una validación, y no hay forma de saber cuál
 * era sin el número, que no lo tenemos ni lo queremos.
 */
export function numeroEnmascarado(tarjeta) {
  const ultimos = soloDigitos(tarjeta?.ultimos).slice(-4);
  if (ultimos.length !== 4) return "";
  const marca = MARCAS.find(m => m.id === tarjeta?.marca) || OTRA;
  const largo = marca.grupos.reduce((suma, g) => suma + g, 0);
  const completo = "•".repeat(Math.max(0, largo - 4)) + ultimos;

  const partes = [];
  let desde = 0;
  for (const g of marca.grupos) {
    partes.push(completo.slice(desde, desde + g));
    desde += g;
  }
  return partes.join(" ");
}

/** El vencimiento como se escribe: 04/28. */
export function vencimientoComoSeLee(tarjeta) {
  if (!tarjeta?.mes || !tarjeta?.anio) return "";
  return `${String(tarjeta.mes).padStart(2, "0")}/${String(tarjeta.anio).slice(-2)}`;
}

/** Si una tarjeta guardada ya venció (el vencimiento pasa, la tarjeta queda). */
export function estaVencida(tarjeta, hoy = new Date()) {
  if (!tarjeta?.mes || !tarjeta?.anio) return false;
  return !revisarVencimiento(tarjeta.mes, tarjeta.anio, hoy).ok;
}
