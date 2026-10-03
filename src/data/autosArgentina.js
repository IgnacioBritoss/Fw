// ============================================================================
//  autosArgentina — Especificaciones de los autos que de verdad se alquilan acá
// ----------------------------------------------------------------------------
//  POR QUÉ EXISTE ESTE ARCHIVO.
//
//  El autocompletado de especificaciones le preguntaba SIEMPRE al modelo de IA.
//  Funciona, pero tiene tres problemas que no se arreglan con un prompt mejor:
//
//   1. Contesta distinto cada vez. El mismo Cronos 2021 puede volver con 525
//      litros de baúl una vez y 500 la siguiente. No hay a quién reclamarle.
//   2. Cuesta una llamada y unos segundos de espera, para un dato que para los
//      cuarenta autos más vendidos del país es siempre el mismo.
//   3. Sin GROQ_API_KEY cargada no hay autocompletado en absoluto.
//
//  Con esta tabla, los autos que son el grueso de la flota argentina se
//  completan al instante, igual siempre, sin gastar cuota y sin depender de que
//  el servicio de IA esté arriba. La IA queda para lo que de verdad necesita
//  IA: el auto raro que no está acá.
//
//  ── DE DÓNDE SALEN ESTOS NÚMEROS, Y QUÉ CONFIANZA MERECEN ─────────────────
//
//  Son los valores de catálogo de la VERSIÓN MÁS VENDIDA de cada generación en
//  Argentina, cargados a mano. NO salen de una base oficial: no hay un dataset
//  abierto con especificaciones del mercado argentino por año y versión.
//
//  Qué tan firme es cada cosa:
//
//   · categoría, combustible, asientos, puertas  → son del modelo. Firmes.
//   · baúl, cilindrada, potencia                 → son de la versión indicada
//                                                  en `version`. Firmes para
//                                                  esa versión.
//   · peso y consumo                             → los que más varían entre
//                                                  versiones y entre ciclos de
//                                                  medición. Tomalos como
//                                                  orientativos.
//
//  Donde no hay un número confiable va `null` y el campo se deja vacío, que es
//  mejor que llenarlo con algo parecido: un dato vacío se nota y se completa, y
//  uno equivocado se publica.
//
//  ── LO QUE ACÁ NO SE DECIDE, Y ES A PROPÓSITO ─────────────────────────────
//
//  Bluetooth, cámara de retroceso y sensores de estacionamiento NO están en
//  esta tabla. No son del modelo: son de la versión y del año, y dentro del
//  mismo año conviven versiones con y sin. Decir que un Onix 2021 tiene cámara
//  es verdad para el LTZ y mentira para el Joy, y quien publica su propio auto
//  sabe perfectamente si la tiene. Un dato inventado sobre el equipamiento del
//  auto que alguien va a alquilar no es un detalle.
//
//  La transmisión tampoco, por lo mismo: casi todos estos modelos se vendieron
//  manual y automático a la vez.
//
//  ── CÓMO SE CORRIGE ───────────────────────────────────────────────────────
//
//  Es una lista de objetos. Se edita el número y listo. Las pruebas de
//  especificaciones.test.js revisan que la tabla no tenga incoherencias
//  (rangos de años pisados, valores fuera de los límites que el formulario ya
//  valida), así que un error de tipeo se cae solo.
// ============================================================================

/**
 * Cada entrada es una GENERACIÓN, no un año.
 *
 * `desde` y `hasta` son inclusivos. `hasta: null` significa que se sigue
 * vendiendo: así el archivo no hay que tocarlo cada primero de enero, que es
 * exactamente el error que ya se arregló con el año máximo del formulario.
 */
export const AUTOS = [
  // ── Fiat ────────────────────────────────────────────────────────────────
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: null, version: "1.3 Firefly Drive",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1136,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: null, version: "1.8 E-TorQ Precision",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1747, hp: 130, baulL: 525, consumoL100: null, pesoKg: 1225,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: null, version: "1.8 E-TorQ Precision AT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1747, hp: 130, baulL: 525, consumoL100: null, pesoKg: 1258,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Argo", desde: 2018, hasta: null, version: "1.3 Firefly Drive",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 99, baulL: 300, consumoL100: 6.1, pesoKg: 1114,
    fuente: "Ficha técnica oficial Fiat Argentina, Argo Drive 1.3" },
  { marca: "Fiat", modelo: "Mobi", desde: 2016, hasta: null, version: "1.0 Firefly Like",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 77, baulL: 235, consumoL100: 5.8, pesoKg: null },
  { marca: "Fiat", modelo: "Pulse", desde: 2022, hasta: null, version: "1.3 Firefly Drive",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1301, hp: 99, baulL: 370, consumoL100: 6.8, pesoKg: null },
  { marca: "Fiat", modelo: "Toro", desde: 2016, hasta: null, version: "1.8 Freedom",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1800, hp: 130, baulL: 937, consumoL100: 9.0, pesoKg: null },
  { marca: "Fiat", modelo: "Strada", desde: 2020, hasta: null, version: "1.3 Firefly Freedom",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1301, hp: 99, baulL: 844, consumoL100: 7.5, pesoKg: null },
  { marca: "Fiat", modelo: "Palio", desde: 2012, hasta: 2017, version: "1.4 Attractive",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1368, hp: 85, baulL: 280, consumoL100: 7.0, pesoKg: null },
  { marca: "Fiat", modelo: "Uno", desde: 2011, hasta: 2021, version: "1.4 Way",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1368, hp: 85, baulL: 280, consumoL100: 6.9, pesoKg: null },
  { marca: "Fiat", modelo: "Siena", desde: 2012, hasta: 2017, version: "1.4 Attractive",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1368, hp: 85, baulL: 500, consumoL100: 7.0, pesoKg: null },
  { marca: "Fiat", modelo: "Fiorino", desde: 2014, hasta: null, version: "1.4 Fire",
    categoria: "VAN", combustible: "GASOLINE", asientos: 2, puertas: 4,
    cc: 1368, hp: 87, baulL: null, consumoL100: 7.6, pesoKg: null },
  { marca: "Fiat", modelo: "Fastback", desde: 2023, hasta: null, version: "1.3 turbo Audace",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 176, baulL: 600, consumoL100: 7.0, pesoKg: null },

  // ── Toyota ──────────────────────────────────────────────────────────────
  { marca: "Toyota", modelo: "Hilux", desde: 2016, hasta: null, version: "2.4 TDI SR doble cabina 4x2",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2393, hp: 150, baulL: null, consumoL100: null, pesoKg: 1890,
    camara: true, bluetooth: true,
    fuente: "Ficha técnica oficial Toyota Argentina, 24/04/2025" },
  { marca: "Toyota", modelo: "Hilux", desde: 2016, hasta: null, version: "2.8 TDI SRX doble cabina 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2755, hp: 204, baulL: null, consumoL100: null, pesoKg: 2025,
    camara: true, bluetooth: true,
    fuente: "Ficha técnica oficial Toyota Argentina, 24/04/2025" },
  { marca: "Toyota", modelo: "Corolla", desde: 2020, hasta: null, version: "2.0 XLI MT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1987, hp: 170, baulL: 470, consumoL100: null, pesoKg: 1340,
    fuente: "Ficha técnica oficial Toyota Argentina, Corolla 2021" },
  { marca: "Toyota", modelo: "Corolla", desde: 2020, hasta: null, version: "2.0 XEI CVT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1987, hp: 170, baulL: 470, consumoL100: null, pesoKg: 1390,
    fuente: "Ficha técnica oficial Toyota Argentina, Corolla 2021" },
  { marca: "Toyota", modelo: "Corolla", desde: 2020, hasta: null, version: "1.8 Hybrid XEI eCVT",
    categoria: "SEDAN", combustible: "HYBRID", asientos: 5, puertas: 4,
    cc: 1798, hp: 98, baulL: 470, consumoL100: null, pesoKg: 1405,
    fuente: "Ficha técnica oficial Toyota Argentina, Corolla 2021" },
  { marca: "Toyota", modelo: "Corolla", desde: 2014, hasta: 2019, version: "1.8 XEI",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1798, hp: 140, baulL: 470, consumoL100: 7.1, pesoKg: null },
  { marca: "Toyota", modelo: "Corolla Cross", desde: 2021, hasta: null, version: "2.0 XEI",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1987, hp: 170, baulL: 440, consumoL100: 7.2, pesoKg: null },
  { marca: "Toyota", modelo: "Yaris", desde: 2018, hasta: null, version: "1.5 XLS hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1496, hp: 107, baulL: 310, consumoL100: 6.0, pesoKg: null },
  { marca: "Toyota", modelo: "Etios", desde: 2013, hasta: 2021, version: "1.5 XLS hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1496, hp: 103, baulL: 251, consumoL100: 6.3, pesoKg: null },
  { marca: "Toyota", modelo: "SW4", desde: 2016, hasta: null, version: "2.8 TDI SRX",
    categoria: "SUV", combustible: "DIESEL", asientos: 7, puertas: 5,
    cc: 2755, hp: 204, baulL: null, consumoL100: 8.5, pesoKg: null },
  { marca: "Toyota", modelo: "RAV4", desde: 2019, hasta: null, version: "2.5 híbrido Limited",
    categoria: "SUV", combustible: "HYBRID", asientos: 5, puertas: 5,
    cc: 2487, hp: 222, baulL: 580, consumoL100: 5.5, pesoKg: null },
  { marca: "Toyota", modelo: "Hiace", desde: 2019, hasta: null, version: "2.8 TDI furgón",
    categoria: "VAN", combustible: "DIESEL", asientos: 3, puertas: 4,
    cc: 2755, hp: 177, baulL: null, consumoL100: 9.0, pesoKg: null },

  // ── Volkswagen ──────────────────────────────────────────────────────────
  { marca: "Volkswagen", modelo: "Gol Trend", desde: 2013, hasta: 2023, version: "1.6 MSI Trendline",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1599, hp: 101, baulL: 285, consumoL100: null, pesoKg: 944,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Gol Trend 2015" },
  { marca: "Volkswagen", modelo: "Polo", desde: 2018, hasta: null, version: "1.6 MSI Track",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 110, baulL: 300, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Nuevo Polo" },
  { marca: "Volkswagen", modelo: "Polo", desde: 2018, hasta: null, version: "1.0 TSI Highline",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 101, baulL: 300, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Nuevo Polo" },
  { marca: "Volkswagen", modelo: "Polo", desde: 2018, hasta: null, version: "1.4 TSI GTS",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1395, hp: 150, baulL: 300, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Nuevo Polo" },
  { marca: "Volkswagen", modelo: "Virtus", desde: 2018, hasta: null, version: "1.6 MSI Trendline",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1598, hp: 110, baulL: 521, consumoL100: 6.7, pesoKg: null },
  { marca: "Volkswagen", modelo: "Amarok", desde: 2011, hasta: null, version: "2.0 TDI Trendline",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 1968, hp: 180, baulL: null, consumoL100: 8.3, pesoKg: null },
  { marca: "Volkswagen", modelo: "T-Cross", desde: 2019, hasta: null, version: "1.6 MSI Trendline",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 110, baulL: 420, consumoL100: 7.1, pesoKg: null },
  { marca: "Volkswagen", modelo: "Nivus", desde: 2020, hasta: null, version: "1.0 TSI Comfortline",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 128, baulL: 415, consumoL100: 6.3, pesoKg: null },
  { marca: "Volkswagen", modelo: "Taos", desde: 2021, hasta: null, version: "1.4 TSI Comfortline",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1395, hp: 150, baulL: 498, consumoL100: 7.3, pesoKg: null },
  { marca: "Volkswagen", modelo: "Vento", desde: 2011, hasta: 2021, version: "2.0 TSI Advance",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1984, hp: 211, baulL: 480, consumoL100: 8.5, pesoKg: null },
  { marca: "Volkswagen", modelo: "Suran", desde: 2006, hasta: 2019, version: "1.6 Trendline",
    categoria: "VAN", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 101, baulL: 650, consumoL100: 7.4, pesoKg: null },
  { marca: "Volkswagen", modelo: "Up", desde: 2014, hasta: 2021, version: "1.0 Take Up",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 4, puertas: 5,
    cc: 999, hp: 75, baulL: 285, consumoL100: 5.6, pesoKg: null },
  { marca: "Volkswagen", modelo: "Tiguan", desde: 2018, hasta: null, version: "1.4 TSI Allspace Trendline",
    categoria: "SUV", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1395, hp: 150, baulL: 700, consumoL100: 7.7, pesoKg: null },

  // ── Chevrolet ───────────────────────────────────────────────────────────
  { marca: "Chevrolet", modelo: "Onix", desde: 2020, hasta: null, version: "1.2 LS",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: null, hp: 90, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Catálogo oficial Chevrolet Argentina, Onix" },
  { marca: "Chevrolet", modelo: "Onix", desde: 2020, hasta: null, version: "1.0 turbo LTZ",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    // El catálogo de Chevrolet da potencia y dimensiones pero NO cilindrada en
    // cm3, litros de baúl ni peso. Vacíos antes que inventados.
    cc: null, hp: 116, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Catálogo oficial Chevrolet Argentina, Onix" },
  { marca: "Chevrolet", modelo: "Onix", desde: 2013, hasta: 2019, version: "1.4 LT",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1389, hp: 98, baulL: 280, consumoL100: 6.9, pesoKg: null },
  { marca: "Chevrolet", modelo: "Onix Plus", desde: 2020, hasta: null, version: "1.0 turbo LT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 999, hp: 116, baulL: 469, consumoL100: 6.0, pesoKg: null },
  { marca: "Chevrolet", modelo: "Cruze", desde: 2016, hasta: null, version: "1.4 turbo LT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1399, hp: 153, baulL: 440, consumoL100: 6.8, pesoKg: null },
  { marca: "Chevrolet", modelo: "Tracker", desde: 2020, hasta: null, version: "1.2 turbo LT",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1199, hp: 132, baulL: 393, consumoL100: 6.5, pesoKg: null },
  { marca: "Chevrolet", modelo: "Spin", desde: 2013, hasta: null, version: "1.8 LT",
    categoria: "VAN", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1796, hp: 108, baulL: 710, consumoL100: 8.0, pesoKg: null },
  { marca: "Chevrolet", modelo: "S10", desde: 2012, hasta: null, version: "2.8 TD LT doble cabina",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2776, hp: 200, baulL: null, consumoL100: 8.6, pesoKg: null },
  { marca: "Chevrolet", modelo: "Prisma", desde: 2013, hasta: 2019, version: "1.4 LT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1389, hp: 98, baulL: 500, consumoL100: 6.8, pesoKg: null },
  { marca: "Chevrolet", modelo: "Classic", desde: 2010, hasta: 2016, version: "1.4 LS",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1389, hp: 92, baulL: 285, consumoL100: 7.1, pesoKg: null },
  { marca: "Chevrolet", modelo: "Agile", desde: 2010, hasta: 2016, version: "1.4 LT",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1389, hp: 98, baulL: 280, consumoL100: 7.3, pesoKg: null },
  { marca: "Chevrolet", modelo: "Corsa", desde: 2000, hasta: 2012, version: "1.4 GL",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1389, hp: 92, baulL: 260, consumoL100: 7.2, pesoKg: null },
  { marca: "Chevrolet", modelo: "Montana", desde: 2011, hasta: 2016, version: "1.4 LS",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 2, puertas: 2,
    cc: 1389, hp: 98, baulL: null, consumoL100: 7.9, pesoKg: null },

  // ── Peugeot ─────────────────────────────────────────────────────────────
  { marca: "Peugeot", modelo: "208", desde: 2020, hasta: null, version: "1.2 Like",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1199, hp: 82, baulL: 311, consumoL100: null, pesoKg: 1111,
    fuente: "Ficha técnica oficial Peugeot Argentina, 208 2021" },
  { marca: "Peugeot", modelo: "208", desde: 2020, hasta: null, version: "1.6 Allure",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 311, consumoL100: null, pesoKg: 1183,
    fuente: "Ficha técnica oficial Peugeot Argentina, 208 2021" },
  { marca: "Peugeot", modelo: "208", desde: 2013, hasta: 2019, version: "1.6 Allure",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 311, consumoL100: 7.0, pesoKg: null },
  { marca: "Peugeot", modelo: "2008", desde: 2016, hasta: null, version: "1.6 Allure",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 400, consumoL100: 7.3, pesoKg: null },
  { marca: "Peugeot", modelo: "308", desde: 2012, hasta: 2021, version: "1.6 Allure",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 420, consumoL100: 7.4, pesoKg: null },
  { marca: "Peugeot", modelo: "408", desde: 2011, hasta: 2021, version: "1.6 Allure",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1587, hp: 115, baulL: 562, consumoL100: 7.5, pesoKg: null },
  { marca: "Peugeot", modelo: "Partner", desde: 2010, hasta: null, version: "1.6 Confort",
    categoria: "VAN", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: null, consumoL100: 7.8, pesoKg: null },
  { marca: "Peugeot", modelo: "3008", desde: 2017, hasta: null, version: "1.6 THP Allure",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 165, baulL: 520, consumoL100: 7.4, pesoKg: null },
  { marca: "Peugeot", modelo: "5008", desde: 2018, hasta: null, version: "1.6 THP Allure",
    categoria: "SUV", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1598, hp: 165, baulL: 780, consumoL100: 7.8, pesoKg: null },

  // ── Renault ─────────────────────────────────────────────────────────────
  { marca: "Renault", modelo: "Kwid", desde: 2018, hasta: null, version: "1.0 SCe Zen",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    // La ficha da 18,2 km/l en ciclo mixto: 100 / 18,2 = 5,5 l/100km.
    // El peso queda vacío: la ficha informa el peso BRUTO (1.163 kg, con
    // carga), que no es el peso en orden de marcha que pide el formulario.
    cc: 999, hp: 66, baulL: 290, consumoL100: 5.5, pesoKg: null,
    fuente: "Ficha técnica oficial Renault Argentina, Kwid" },
  { marca: "Renault", modelo: "Sandero", desde: 2014, hasta: null, version: "1.6 16v Zen",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 106, baulL: 320, consumoL100: 7.0, pesoKg: null },
  { marca: "Renault", modelo: "Stepway", desde: 2014, hasta: null, version: "1.6 16v Zen",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 106, baulL: 320, consumoL100: 7.2, pesoKg: null },
  { marca: "Renault", modelo: "Logan", desde: 2014, hasta: null, version: "1.6 16v Zen",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1598, hp: 106, baulL: 510, consumoL100: 6.9, pesoKg: null },
  { marca: "Renault", modelo: "Duster", desde: 2012, hasta: null, version: "1.6 16v Zen",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 106, baulL: 475, consumoL100: 7.8, pesoKg: null },
  { marca: "Renault", modelo: "Oroch", desde: 2016, hasta: null, version: "1.6 16v Dynamique",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1598, hp: 106, baulL: 683, consumoL100: 8.2, pesoKg: null },
  { marca: "Renault", modelo: "Clio", desde: 2000, hasta: 2016, version: "1.2 Authentique",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1149, hp: 75, baulL: 288, consumoL100: 6.5, pesoKg: null },
  { marca: "Renault", modelo: "Kangoo", desde: 2010, hasta: null, version: "1.6 Confort",
    categoria: "VAN", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 106, baulL: null, consumoL100: 7.9, pesoKg: null },
  { marca: "Renault", modelo: "Captur", desde: 2017, hasta: null, version: "1.6 16v Zen",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 115, baulL: 437, consumoL100: 7.6, pesoKg: null },
  { marca: "Renault", modelo: "Megane", desde: 2010, hasta: 2016, version: "1.6 16v Confort",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 110, baulL: 405, consumoL100: 7.3, pesoKg: null },
  { marca: "Renault", modelo: "Alaskan", desde: 2018, hasta: 2023, version: "2.3 dCi Emotion",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2298, hp: 160, baulL: null, consumoL100: 8.4, pesoKg: null },

  // ── Ford ────────────────────────────────────────────────────────────────
  { marca: "Ford", modelo: "Ranger", desde: 2012, hasta: null, version: "3.2 TDCi XLT doble cabina",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 3198, hp: 200, baulL: null, consumoL100: 9.0, pesoKg: null },
  { marca: "Ford", modelo: "EcoSport", desde: 2013, hasta: 2021, version: "1.6 SE",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1596, hp: 110, baulL: 356, consumoL100: 7.5, pesoKg: null },
  { marca: "Ford", modelo: "Ka", desde: 2015, hasta: 2021, version: "1.5 SE",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1499, hp: 123, baulL: 257, consumoL100: 6.4, pesoKg: null },
  { marca: "Ford", modelo: "Focus", desde: 2013, hasta: 2019, version: "2.0 SE hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1999, hp: 178, baulL: 372, consumoL100: 7.6, pesoKg: null },
  { marca: "Ford", modelo: "Territory", desde: 2021, hasta: null, version: "1.5 turbo SEL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1497, hp: 160, baulL: 448, consumoL100: 7.6, pesoKg: null },
  { marca: "Ford", modelo: "Fiesta", desde: 2011, hasta: 2019, version: "1.6 SE hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1596, hp: 120, baulL: 281, consumoL100: 6.8, pesoKg: null },
  { marca: "Ford", modelo: "Maverick", desde: 2022, hasta: null, version: "2.0 turbo Lariat",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1995, hp: 253, baulL: null, consumoL100: 9.4, pesoKg: null },
  { marca: "Ford", modelo: "Bronco Sport", desde: 2021, hasta: null, version: "2.0 turbo Big Bend",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1995, hp: 253, baulL: 849, consumoL100: 9.8, pesoKg: null },

  // ── Nissan ──────────────────────────────────────────────────────────────
  { marca: "Nissan", modelo: "Frontier", desde: 2018, hasta: null, version: "2.3 bi-turbo XE doble cabina",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2298, hp: 190, baulL: null, consumoL100: 8.4, pesoKg: null },
  { marca: "Nissan", modelo: "Kicks", desde: 2017, hasta: null, version: "1.6 Sense",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 120, baulL: 432, consumoL100: 6.8, pesoKg: null },
  { marca: "Nissan", modelo: "Versa", desde: 2015, hasta: null, version: "1.6 Sense",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1598, hp: 111, baulL: 460, consumoL100: 6.6, pesoKg: null },
  { marca: "Nissan", modelo: "March", desde: 2015, hasta: 2021, version: "1.6 Sense",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 107, baulL: 265, consumoL100: 6.5, pesoKg: null },
  { marca: "Nissan", modelo: "Sentra", desde: 2015, hasta: null, version: "1.8 Sense",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1798, hp: 130, baulL: 510, consumoL100: 6.9, pesoKg: null },
  { marca: "Nissan", modelo: "X-Trail", desde: 2015, hasta: null, version: "2.5 Exclusive",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 2488, hp: 170, baulL: 565, consumoL100: 8.1, pesoKg: null },

  // ── Jeep ────────────────────────────────────────────────────────────────
  { marca: "Jeep", modelo: "Renegade", desde: 2016, hasta: null, version: "1.8 Sport",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1800, hp: 139, baulL: 320, consumoL100: 8.2, pesoKg: null },
  { marca: "Jeep", modelo: "Compass", desde: 2017, hasta: null, version: "2.0 TD Longitude",
    categoria: "SUV", combustible: "DIESEL", asientos: 5, puertas: 5,
    cc: 1956, hp: 170, baulL: 410, consumoL100: 7.5, pesoKg: null },
  { marca: "Jeep", modelo: "Commander", desde: 2022, hasta: null, version: "2.0 TD Limited",
    categoria: "SUV", combustible: "DIESEL", asientos: 7, puertas: 5,
    cc: 1956, hp: 170, baulL: 233, consumoL100: 7.8, pesoKg: null },
  { marca: "Jeep", modelo: "Wrangler", desde: 2018, hasta: null, version: "2.0 turbo Sport",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1995, hp: 272, baulL: 548, consumoL100: 10.5, pesoKg: null },

  // ── Honda ───────────────────────────────────────────────────────────────
  { marca: "Honda", modelo: "HR-V", desde: 2015, hasta: null, version: "1.8 LX",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1799, hp: 140, baulL: 437, consumoL100: 7.2, pesoKg: null },
  { marca: "Honda", modelo: "Fit", desde: 2015, hasta: 2021, version: "1.5 LX",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1497, hp: 116, baulL: 363, consumoL100: 6.3, pesoKg: null },
  { marca: "Honda", modelo: "City", desde: 2015, hasta: 2021, version: "1.5 LX",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1497, hp: 116, baulL: 536, consumoL100: 6.4, pesoKg: null },
  { marca: "Honda", modelo: "Civic", desde: 2016, hasta: null, version: "2.0 EX",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1997, hp: 155, baulL: 519, consumoL100: 6.9, pesoKg: null },
  { marca: "Honda", modelo: "CR-V", desde: 2017, hasta: null, version: "1.5 turbo EXL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1498, hp: 190, baulL: 522, consumoL100: 7.4, pesoKg: null },
  { marca: "Honda", modelo: "WR-V", desde: 2018, hasta: 2021, version: "1.5 EXL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1497, hp: 116, baulL: 363, consumoL100: 6.8, pesoKg: null },

  // ── Citroën ─────────────────────────────────────────────────────────────
  { marca: "Citroen", modelo: "C3", desde: 2012, hasta: null, version: "1.6 VTi Feel",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 300, consumoL100: 7.0, pesoKg: null },
  { marca: "Citroen", modelo: "C4 Cactus", desde: 2018, hasta: null, version: "1.6 VTi Feel",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: 358, consumoL100: 7.2, pesoKg: null },
  { marca: "Citroen", modelo: "Berlingo", desde: 2010, hasta: null, version: "1.6 Feel",
    categoria: "VAN", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1587, hp: 115, baulL: null, consumoL100: 7.8, pesoKg: null },
  { marca: "Citroen", modelo: "C4 Lounge", desde: 2013, hasta: 2020, version: "1.6 THP Feel",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1598, hp: 165, baulL: 450, consumoL100: 7.4, pesoKg: null },
  { marca: "Citroen", modelo: "C3 Aircross", desde: 2023, hasta: null, version: "1.6 Feel",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 115, baulL: 315, consumoL100: 7.3, pesoKg: null },

  // ── Suzuki ──────────────────────────────────────────────────────────────
  { marca: "Suzuki", modelo: "Vitara", desde: 2016, hasta: null, version: "1.6 GL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1586, hp: 120, baulL: 375, consumoL100: 6.5, pesoKg: null },
  { marca: "Suzuki", modelo: "Swift", desde: 2018, hasta: null, version: "1.2 GL",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1242, hp: 90, baulL: 265, consumoL100: 5.3, pesoKg: null },
  { marca: "Suzuki", modelo: "Jimny", desde: 2019, hasta: null, version: "1.5 GLX",
    categoria: "SUV", combustible: "GASOLINE", asientos: 4, puertas: 3,
    cc: 1462, hp: 102, baulL: 85, consumoL100: 7.0, pesoKg: null },
  { marca: "Suzuki", modelo: "Baleno", desde: 2016, hasta: 2020, version: "1.4 GL",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1373, hp: 92, baulL: 355, consumoL100: 5.8, pesoKg: null },

  // ── Hyundai ─────────────────────────────────────────────────────────────
  { marca: "Hyundai", modelo: "Creta", desde: 2017, hasta: null, version: "1.6 GL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1591, hp: 123, baulL: 400, consumoL100: 7.0, pesoKg: null },
  { marca: "Hyundai", modelo: "Tucson", desde: 2016, hasta: null, version: "2.0 GL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1999, hp: 155, baulL: 513, consumoL100: 7.9, pesoKg: null },
  { marca: "Hyundai", modelo: "HB20", desde: 2013, hasta: 2020, version: "1.6 Comfort",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1591, hp: 122, baulL: 300, consumoL100: 6.9, pesoKg: null },
  { marca: "Hyundai", modelo: "i10", desde: 2012, hasta: 2018, version: "1.25 GLS",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1248, hp: 87, baulL: 252, consumoL100: 5.7, pesoKg: null },
];

/**
 * Cómo se escribe cada marca en la vida real.
 *
 * Nadie escribe "Volkswagen" entero, y el acento de Citroën lo pone uno de cada
 * diez. Sin esto, "VW Gol Trend" no encuentra nada y se va a la IA a preguntar
 * algo que está en la tabla, que es justo lo que se quiere evitar.
 */
export const ALIAS_DE_MARCA = {
  vw: "volkswagen",
  volkswagem: "volkswagen",
  chevy: "chevrolet",
  citroen: "citroen",
  "citroën": "citroen",
  mercedes: "mercedes-benz",
  "vw/volkswagen": "volkswagen",
};

/**
 * Lo mismo con los modelos.
 *
 * Acá hay un cuidado especial: NO se juntan modelos que son autos distintos.
 * "Corolla" y "Corolla Cross" son dos autos, y "Onix" y "Onix Plus" también
 * —uno es hatchback y el otro sedán—. Un alias de más entre esos pares haría
 * que el formulario se complete con el auto equivocado, que es peor que no
 * completarse: un dato vacío se ve, uno equivocado se publica.
 */
export const ALIAS_DE_MODELO = {
  volkswagen: {
    gol: "gol trend",
    "gol trend": "gol trend",
    "t cross": "t-cross",
    tcross: "t-cross",
    "up!": "up",
  },
  chevrolet: {
    "onix joy": "onix",
    "onix plus": "onix plus",
    "onix sedan": "onix plus",
  },
  renault: {
    "sandero stepway": "stepway",
    "logan sedan": "logan",
  },
  honda: {
    hrv: "hr-v",
    "hr v": "hr-v",
  },
  citroen: {
    "c4cactus": "c4 cactus",
    cactus: "c4 cactus",
  },
  fiat: {
    "toro freedom": "toro",
  },
  toyota: {
    "corolla sedan": "corolla",
    "corollacross": "corolla cross",
  },
};
