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
//  Hay DOS CLASES DE FILA acá, y se distinguen por un solo campo, `fuente`:
//
//   · CON `fuente` → los números salieron de la ficha técnica oficial de la
//     terminal, bajada por scripts/fichas.mjs. Si el modelo ya no se vende, la
//     ficha se bajó del archivo de internet, y la fila dice "(archivada)" con
//     el año de la copia. De cada ficha se carga SOLO lo que la ficha imprime:
//     donde no da la cilindrada, queda `null`, aunque uno se la sepa de memoria.
//
//   · SIN `fuente` → valor de catálogo de la versión más vendida de esa
//     generación, cargado a mano. Es lo que había antes de que existiera el
//     scraper y es lo que todavía queda en los modelos cuya ficha no apareció.
//
//  El front muestra la diferencia: con ficha nombra la ficha, sin ficha avisa
//  "sin verificar contra la ficha oficial". No es lo mismo y no se mezcla.
//
//  Qué tan firme es cada cosa, en las filas sin ficha:
//
//   · categoría, combustible, asientos, puertas  → son del modelo. Firmes.
//   · baúl, cilindrada, potencia                 → son de la versión indicada
//                                                  en `version`. Firmes para
//                                                  esa versión.
//   · consumo                                    → el que más varía entre
//                                                  versiones y entre ciclos de
//                                                  medición. Orientativo.
//   · peso                                       → NO se carga sin ficha. De
//                                                  seis que había puesto de
//                                                  memoria, acerté cero.
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
  //  Todo lo de Fiat sale de las fichas oficiales bajadas por scripts/fichas.mjs
  //  desde fiat.com.ar/content/dam/fiat/argentina/ficha-tecnica.
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: 2022, version: "1.3 Firefly Drive",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1136,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: 2022, version: "1.8 E-TorQ Precision",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1747, hp: 130, baulL: 525, consumoL100: null, pesoKg: 1225,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Cronos", desde: 2018, hasta: 2022, version: "1.8 E-TorQ Precision AT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1747, hp: 130, baulL: 525, consumoL100: null, pesoKg: 1258,
    camara: true, sensores: true, bluetooth: true,
    fuente: "Ficha técnica oficial Fiat Argentina, MY21" },
  { marca: "Fiat", modelo: "Cronos", desde: 2023, hasta: null, version: "1.3 Attractive MT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1121,
    fuente: "Ficha técnica oficial Fiat Argentina, MY23" },
  { marca: "Fiat", modelo: "Cronos", desde: 2023, hasta: null, version: "1.3 Drive MT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1155,
    fuente: "Ficha técnica oficial Fiat Argentina, MY23" },
  { marca: "Fiat", modelo: "Cronos", desde: 2023, hasta: null, version: "1.3 Drive CVT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1183,
    fuente: "Ficha técnica oficial Fiat Argentina, MY23" },
  { marca: "Fiat", modelo: "Cronos", desde: 2023, hasta: null, version: "1.3 Precision CVT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: 525, consumoL100: null, pesoKg: 1196,
    fuente: "Ficha técnica oficial Fiat Argentina, MY23" },
  { marca: "Fiat", modelo: "Argo", desde: 2018, hasta: null, version: "1.3 Firefly Drive",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 99, baulL: 300, consumoL100: 6.1, pesoKg: 1114,
    fuente: "Ficha técnica oficial Fiat Argentina, Argo MY21" },
  { marca: "Fiat", modelo: "Argo", desde: 2018, hasta: null, version: "1.8 E-TorQ Precision MT",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1747, hp: 130, baulL: 300, consumoL100: null, pesoKg: 1207,
    fuente: "Ficha técnica oficial Fiat Argentina, Argo MY21" },
  { marca: "Fiat", modelo: "Argo", desde: 2018, hasta: null, version: "1.8 E-TorQ Precision AT",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1747, hp: 130, baulL: 300, consumoL100: null, pesoKg: 1223,
    fuente: "Ficha técnica oficial Fiat Argentina, Argo MY21" },
  { marca: "Fiat", modelo: "Mobi", desde: 2016, hasta: 2021, version: "1.0 Fire Like",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 70, baulL: 235, consumoL100: null, pesoKg: 885,
    fuente: "Ficha técnica oficial Fiat Argentina, Mobi MY20" },
  { marca: "Fiat", modelo: "Mobi", desde: 2022, hasta: null, version: "1.0 Fire Trekking",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 70, baulL: 247, consumoL100: null, pesoKg: 952,
    fuente: "Ficha técnica oficial Fiat Argentina, Mobi 2022" },
  { marca: "Fiat", modelo: "Pulse", desde: 2022, hasta: null, version: "1.3 GSE Drive MT",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 99, baulL: 370, consumoL100: null, pesoKg: 1140,
    fuente: "Ficha técnica oficial Fiat Argentina, Pulse" },
  { marca: "Fiat", modelo: "Pulse", desde: 2022, hasta: null, version: "1.0 Turbo Impetus CVT",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 120, baulL: 370, consumoL100: null, pesoKg: 1234,
    fuente: "Ficha técnica oficial Fiat Argentina, Pulse" },
  { marca: "Fiat", modelo: "Toro", desde: 2016, hasta: 2022, version: "1.8 E-TorQ Freedom",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1747, hp: 130, baulL: 937, consumoL100: null, pesoKg: 1660,
    fuente: "Ficha técnica oficial Fiat Argentina, Toro MY21" },
  { marca: "Fiat", modelo: "Toro", desde: 2016, hasta: 2022, version: "2.0 Multijet Volcano 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 1956, hp: 170, baulL: 937, consumoL100: null, pesoKg: 1876,
    fuente: "Ficha técnica oficial Fiat Argentina, Toro MY21" },
  { marca: "Fiat", modelo: "Toro", desde: 2023, hasta: null, version: "1.3 Turbo Freedom",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 175, baulL: 937, consumoL100: null, pesoKg: 1732,
    fuente: "Ficha técnica oficial Fiat Argentina, Toro MY23" },
  { marca: "Fiat", modelo: "Toro", desde: 2023, hasta: null, version: "2.0 Multijet Volcano 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 1956, hp: 170, baulL: 937, consumoL100: null, pesoKg: 1905,
    fuente: "Ficha técnica oficial Fiat Argentina, Toro MY23" },
  { marca: "Fiat", modelo: "Strada", desde: 2020, hasta: null, version: "1.4 Fire Endurance cabina plus",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 2, puertas: 2,
    cc: 1368, hp: 85, baulL: null, consumoL100: null, pesoKg: 1083,
    fuente: "Ficha técnica oficial Fiat Argentina, Strada MY21" },
  { marca: "Fiat", modelo: "Strada", desde: 2020, hasta: null, version: "1.3 Firefly Volcano cabina doble",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1332, hp: 99, baulL: null, consumoL100: null, pesoKg: 1172,
    fuente: "Ficha técnica oficial Fiat Argentina, Strada MY21" },
  { marca: "Fiat", modelo: "Uno", desde: 2011, hasta: 2021, version: "1.4 Attractive",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1368, hp: 87, baulL: 280, consumoL100: null, pesoKg: 988,
    fuente: "Ficha técnica oficial Fiat Argentina, Uno MY20" },
  { marca: "Fiat", modelo: "Fiorino", desde: 2014, hasta: 2024, version: "1.4 Fire Endurance",
    categoria: "VAN", combustible: "GASOLINE", asientos: 2, puertas: 4,
    cc: 1368, hp: 85, baulL: 650, consumoL100: null, pesoKg: 1138,
    fuente: "Ficha técnica oficial Fiat Argentina, Fiorino 2022" },
  { marca: "Fiat", modelo: "Fiorino", desde: 2025, hasta: null, version: "1.3 Firefly Endurance",
    categoria: "VAN", combustible: "GASOLINE", asientos: 2, puertas: 4,
    cc: 1332, hp: 99, baulL: 650, consumoL100: null, pesoKg: 1203,
    fuente: "Ficha técnica oficial Fiat Argentina, Fiorino MY26" },
  { marca: "Fiat", modelo: "Palio", desde: 2012, hasta: 2017, version: "1.4 Attractive",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1368, hp: 85, baulL: 280, consumoL100: 7.0, pesoKg: null },
  { marca: "Fiat", modelo: "Siena", desde: 2012, hasta: 2017, version: "1.4 Attractive",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1368, hp: 85, baulL: 500, consumoL100: 7.0, pesoKg: null },
  { marca: "Fiat", modelo: "Fastback", desde: 2023, hasta: null, version: "1.3 turbo Audace",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 176, baulL: 600, consumoL100: 7.0, pesoKg: null },

  // ── Toyota ──────────────────────────────────────────────────────────────
  { marca: "Toyota", modelo: "Hilux", desde: 2016, hasta: null, version: "2.4 TDI SR doble cabina 4x2",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2393, hp: 150, baulL: null, consumoL100: null, pesoKg: 1890,
    camara: true, bluetooth: true,
    fuente: "Ficha técnica oficial Toyota Argentina, 24/04/2025" },
  /*
    La 2.8 NO dio siempre 204 CV. La ficha de 2017 —la que está en el archivo
    de internet— da 177 CV para el mismo motor, igual que la de la SW4 de 2018.
    Los 204 llegaron con el restyling de 2021. Estaba cargada como 204 para
    todo el rango 2016 en adelante, que es decirle a un dueño de una Hilux 2018
    que tiene 27 CV que no tiene.

    Un detalle de esa ficha de 2017: imprime la cilindrada de la 2.8 como
    "2.775". Las otras dos fichas de Toyota —la SW4 2018 y la Hilux 2025, mismo
    motor 1GD— dicen 2.755, que es el valor real. Queda 2755: es un error de
    tipeo del folleto, no un dato distinto.
  */
  { marca: "Toyota", modelo: "Hilux", desde: 2016, hasta: 2020, version: "2.8 TDI SR doble cabina 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2755, hp: 177, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Toyota Argentina, Hilux 2017 (archivada)" },
  { marca: "Toyota", modelo: "Hilux", desde: 2021, hasta: null, version: "2.8 TDI SRX doble cabina 4x4",
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
  { marca: "Toyota", modelo: "SW4", desde: 2016, hasta: 2020, version: "2.8 TDI SRX 4x4 7 asientos",
    categoria: "SUV", combustible: "DIESEL", asientos: 7, puertas: 5,
    cc: 2755, hp: 177, baulL: null, consumoL100: null, pesoKg: 2120,
    fuente: "Ficha técnica oficial Toyota Argentina, SW4 2018 (archivada)" },
  { marca: "Toyota", modelo: "SW4", desde: 2021, hasta: null, version: "2.8 TDI SRX 4x4",
    categoria: "SUV", combustible: "DIESEL", asientos: 7, puertas: 5,
    cc: 2755, hp: 204, baulL: null, consumoL100: null, pesoKg: null },
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
  { marca: "Volkswagen", modelo: "Amarok", desde: 2011, hasta: 2022, version: "3.0 V6 TDI Highline 4x4 AT",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2967, hp: 258, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Amarok V6 MY22 (archivada)" },
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
  { marca: "Volkswagen", modelo: "Vento", desde: 2022, hasta: null, version: "2.0 TSI GLI 350",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1984, hp: 230, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Nuevo Vento GLI 2023 (archivada)" },
  { marca: "Volkswagen", modelo: "Tera", desde: 2025, hasta: null, version: "1.6 MSI Trend",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1598, hp: 110, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Tera MY26" },
  { marca: "Volkswagen", modelo: "Tera", desde: 2025, hasta: null, version: "1.0 TSI Comfort",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 999, hp: 101, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Volkswagen Argentina, Tera MY26" },
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
  { marca: "Chevrolet", modelo: "Onix", desde: 2013, hasta: 2019, version: "1.4 Activ",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1389, hp: 98, baulL: 280, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Onix Activ 2016 (archivada)" },
  { marca: "Chevrolet", modelo: "Onix Plus", desde: 2020, hasta: null, version: "1.0 turbo LT MT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 999, hp: 116, baulL: 469, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Onix Plus MY27" },
  { marca: "Chevrolet", modelo: "Cruze", desde: 2016, hasta: null, version: "1.4 turbo LT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1399, hp: 153, baulL: 440, consumoL100: 6.8, pesoKg: null },
  { marca: "Chevrolet", modelo: "Tracker", desde: 2020, hasta: null, version: "1.2 turbo LT AT",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1199, hp: 132, baulL: 393, consumoL100: null, pesoKg: 1240,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Tracker MY26" },
  { marca: "Chevrolet", modelo: "Spin", desde: 2013, hasta: null, version: "1.8 LT MT 5 asientos",
    categoria: "VAN", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1796, hp: 106, baulL: 710, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Spin MY26" },
  { marca: "Chevrolet", modelo: "Spin", desde: 2013, hasta: null, version: "1.8 Premier AT 7 asientos",
    categoria: "VAN", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1796, hp: 106, baulL: 710, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Spin MY26" },
  { marca: "Chevrolet", modelo: "S10", desde: 2012, hasta: null, version: "2.8 TD LT doble cabina",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2776, hp: 200, baulL: null, consumoL100: 8.6, pesoKg: null },
  { marca: "Chevrolet", modelo: "Prisma", desde: 2013, hasta: 2019, version: "1.4 LT",
    categoria: "SEDAN", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1389, hp: 98, baulL: 500, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Prisma 2013 (archivada)" },
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
  { marca: "Chevrolet", modelo: "Montana", desde: 2023, hasta: null, version: "1.2 turbo LT AT",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 1199, hp: 132, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Chevrolet Argentina, Montana MY26" },

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
  /*
    Las cilindradas de estas dos filas estaban en null y ahora salieron de la
    misma ficha de siempre. No es que la ficha cambió: la línea dice
    "Cilindrada (cm3) 2,488 2,198 3,198", con la coma de miles a la inglesa, y
    el lector la tiraba entera. Con el arreglo del parche anterior se leen.
  */
  { marca: "Ford", modelo: "Ranger", desde: 2012, hasta: 2022, version: "2.2 TDCi XL cabina simple",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 3, puertas: 2,
    cc: 2198, hp: 160, baulL: null, consumoL100: null, pesoKg: 1778,
    fuente: "Ficha técnica oficial Ford Argentina, Ranger 2020 (archivada)" },
  { marca: "Ford", modelo: "Ranger", desde: 2012, hasta: 2022, version: "3.2 TDCi Limited AT 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 3198, hp: 200, baulL: null, consumoL100: null, pesoKg: 2227,
    fuente: "Ficha técnica oficial Ford Argentina, Ranger 2020 (archivada)" },
  { marca: "Ford", modelo: "Ranger", desde: 2023, hasta: null, version: "2.0 TDCi XL doble cabina",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 1996, hp: 170, baulL: null, consumoL100: null, pesoKg: 1880,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Ranger XL" },
  { marca: "Ford", modelo: "Ranger", desde: 2023, hasta: null, version: "2.0 TDCi XLT 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    // Los 210 CV y los 2.249 kg son los mismos en la ficha de 2023 y en la
    // actual. La cilindrada tambien estaba escrita con la coma inglesa.
    cc: 1996, hp: 210, baulL: null, consumoL100: null, pesoKg: 2249,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Ranger" },
  { marca: "Ford", modelo: "Ranger", desde: 2023, hasta: null, version: "3.0 V6 Limited 4x4",
    categoria: "PICKUP", combustible: "DIESEL", asientos: 5, puertas: 4,
    cc: 2993, hp: 250, baulL: null, consumoL100: null, pesoKg: 2297,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Ranger" },
  { marca: "Ford", modelo: "Ranger Raptor", desde: 2023, hasta: null, version: "3.0 V6 biturbo nafta",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    cc: 2956, hp: 397, baulL: null, consumoL100: null, pesoKg: 2495,
    fuente: "Ficha técnica oficial Ford Argentina, Ranger Raptor 2025" },
  { marca: "Ford", modelo: "Territory", desde: 2021, hasta: null, version: "1.8 turbo SEL",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1764, hp: 185, baulL: 448, consumoL100: null, pesoKg: 1675,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Territory" },
  { marca: "Ford", modelo: "Territory", desde: 2025, hasta: null, version: "1.5 híbrida Trend",
    categoria: "SUV", combustible: "HYBRID", asientos: 5, puertas: 5,
    // La ficha da la cilindrada del 1.8 naftero, no la del híbrido.
    cc: null, hp: 150, baulL: 448, consumoL100: null, pesoKg: 1815,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Territory" },
  { marca: "Ford", modelo: "Maverick", desde: 2022, hasta: null, version: "2.0 turbo Lariat",
    categoria: "PICKUP", combustible: "GASOLINE", asientos: 5, puertas: 4,
    // El consumo sale de la ficha de 2021, que lo imprime y la actual no.
    cc: 1999, hp: 253, baulL: null, consumoL100: 7.2, pesoKg: null,
    fuente: "Ficha técnica oficial Ford Argentina, Maverick 2021 (archivada)" },
  { marca: "Ford", modelo: "Maverick", desde: 2025, hasta: null, version: "2.5 híbrida Lariat",
    categoria: "PICKUP", combustible: "HYBRID", asientos: 5, puertas: 4,
    // Los 163 CV son del motor naftero; la ficha no publica la potencia
    // combinada con el eléctrico, así que no se inventa una.
    cc: null, hp: 163, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Ford Argentina, Nueva Maverick 2025" },
  { marca: "Ford", modelo: "Bronco Sport", desde: 2021, hasta: null, version: "1.5 turbo Big Bend",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1496, hp: 184, baulL: 849, consumoL100: null, pesoKg: 1659,
    fuente: "Ficha técnica oficial Ford Argentina, Bronco Sport" },
  { marca: "Ford", modelo: "Bronco Sport", desde: 2021, hasta: null, version: "2.0 turbo Badlands",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    // La ficha imprime una sola cilindrada, la del 1.5. La Badlands es la 2.0.
    cc: null, hp: 253, baulL: 849, consumoL100: null, pesoKg: 1843,
    fuente: "Ficha técnica oficial Ford Argentina, Bronco Sport" },
  { marca: "Ford", modelo: "EcoSport", desde: 2013, hasta: 2021, version: "1.5 Dragon SE",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    // La ficha de 2021 es más limpia que la de 2019: tiene tres columnas
    // (SE manual, Titanium manual, Titanium automática) en vez de diez, y
    // trae la cilindrada y el consumo. Los 1.216 kg que estaban acá son el
    // peso de la versión S, no de la SE: la SE pesa 1.227.
    cc: 1497, hp: 123, baulL: 362, consumoL100: 9.0, pesoKg: 1227,
    fuente: "Ficha técnica oficial Ford Argentina, EcoSport 2021 (archivada)" },
  { marca: "Ford", modelo: "EcoSport", desde: 2013, hasta: 2021, version: "2.0 GDI Titanium 4x4",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: null, hp: 170, baulL: 362, consumoL100: null, pesoKg: 1432,
    fuente: "Ficha técnica oficial Ford Argentina, EcoSport 2019 (archivada)" },
  /*
    El Ka queda sin `fuente` a propósito, aunque la ficha de 2020 apareció y
    confirma sus 1.499 cc y sus 123 CV: el baúl y el consumo que tiene cargados
    NO están en esa ficha, y una fila con `fuente` dice que TODOS sus números
    salieron de ahí. Antes de ponerle el cartel, mejor que siga diciendo lo que
    es. El Ka Freestyle sí, porque de esa ficha salió todo lo que tiene.
  */
  { marca: "Ford", modelo: "Ka", desde: 2015, hasta: 2021, version: "1.5 SE",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1499, hp: 123, baulL: 257, consumoL100: 6.4, pesoKg: null },
  { marca: "Ford", modelo: "Ka Freestyle", desde: 2018, hasta: 2021, version: "1.5 SEL",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1499, hp: 123, baulL: null, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Ford Argentina, Ka Freestyle 2021 (archivada)" },
  /*
    El Focus III salió de la lista de precios en 2019 y es de los autos que más
    abundan usados, así que la ficha estaba solo en el archivo de internet. Dos
    cosas que yo tenía mal y la ficha corrige: la 2.0 da 170 CV, no 178, y el
    baúl del cinco puertas es de 316 litros, no 372 (372 es el Focus II).
  */
  { marca: "Ford", modelo: "Focus", desde: 2013, hasta: 2019, version: "1.6 S hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: null, hp: 125, baulL: 316, consumoL100: null, pesoKg: 1354,
    fuente: "Ficha técnica oficial Ford Argentina, Focus 2018 (archivada)" },
  { marca: "Ford", modelo: "Focus", desde: 2013, hasta: 2019, version: "2.0 SE Plus AT hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: null, hp: 170, baulL: 316, consumoL100: null, pesoKg: 1401,
    fuente: "Ficha técnica oficial Ford Argentina, Focus 2018 (archivada)" },
  { marca: "Ford", modelo: "Fiesta", desde: 2011, hasta: 2019, version: "1.6 SE hatchback",
    categoria: "HATCHBACK", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1596, hp: 120, baulL: 281, consumoL100: 6.8, pesoKg: null },

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
  { marca: "Jeep", modelo: "Renegade", desde: 2016, hasta: 2021, version: "1.8 E-TorQ Sport",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1747, hp: 130, baulL: 320, consumoL100: null, pesoKg: null,
    fuente: "Ficha técnica oficial Jeep Argentina, Renegade 2022" },
  { marca: "Jeep", modelo: "Renegade", desde: 2022, hasta: null, version: "1.3 T270 Sport AT6",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 175, baulL: 314, consumoL100: null, pesoKg: 1536,
    fuente: "Ficha técnica oficial Jeep Argentina, Renegade nafta" },
  { marca: "Jeep", modelo: "Compass", desde: 2017, hasta: null, version: "1.3 T270 Sport AT6 4x2",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1332, hp: 175, baulL: 390, consumoL100: null, pesoKg: 1918,
    fuente: "Ficha técnica oficial Jeep Argentina, Compass nafta 2024" },
  { marca: "Jeep", modelo: "Compass", desde: 2017, hasta: null, version: "2.0 GME Limited AT6 4x4",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1995, hp: 272, baulL: 390, consumoL100: null, pesoKg: 1970,
    fuente: "Ficha técnica oficial Jeep Argentina, Compass 2026" },
  { marca: "Jeep", modelo: "Commander", desde: 2022, hasta: null, version: "1.3 T270 Limited AT6 4x2",
    categoria: "SUV", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1332, hp: 175, baulL: 233, consumoL100: null, pesoKg: 1685,
    fuente: "Ficha técnica oficial Jeep Argentina, Commander" },
  { marca: "Jeep", modelo: "Commander", desde: 2022, hasta: null, version: "2.0 GME Overland AT9 4x4",
    categoria: "SUV", combustible: "GASOLINE", asientos: 7, puertas: 5,
    cc: 1995, hp: 272, baulL: 233, consumoL100: null, pesoKg: 1885,
    fuente: "Ficha técnica oficial Jeep Argentina, Commander" },
  { marca: "Jeep", modelo: "Wrangler", desde: 2018, hasta: null, version: "2.0 turbo Rubicon AT8 4x4",
    categoria: "SUV", combustible: "GASOLINE", asientos: 5, puertas: 5,
    cc: 1995, hp: 272, baulL: 548, consumoL100: null, pesoKg: 1796,
    fuente: "Ficha técnica oficial Jeep Argentina, Wrangler" },

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
  ford: {
    // Escrito sin el espacio. "freestyle" solo NO se mapea a propósito: hubo
    // un Ka Freestyle y una EcoSport Freestyle, y no se puede saber cuál es.
    kafreestyle: "ka freestyle",
  },
};
