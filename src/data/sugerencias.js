// ============================================================================
//  sugerencias.js — Lo que el buscador ofrece mientras se escribe
// ----------------------------------------------------------------------------
//  Dos listas: dónde buscar y qué auto buscar. Son para AYUDAR A ESCRIBIR, no
//  para limitar: el campo acepta cualquier texto, y si lo que se escribe no está
//  en la lista simplemente no se sugiere nada y la búsqueda sale igual.
//
//  POR QUÉ UNA LISTA FIJA Y NO SOLO LOS AUTOS PUBLICADOS: al principio no hay
//  casi publicaciones, así que sacar las sugerencias de lo publicado dejaría el
//  campo mudo justo cuando más falta hace. La lista fija da algo desde el primer
//  día; el buscador además le suma las marcas y modelos que sí están publicados,
//  así que crece sola.
//
//  El orden importa: cuando varias entradas empiezan igual se completa con la
//  PRIMERA, así que van antes las más buscadas. "Fi" completa a Fiat y no a
//  Fiat 600, y "Su" a Suran y no a Suzuki.
// ============================================================================

/**
 * Dónde. Ciudades y zonas de Argentina donde hay o va a haber autos.
 *
 * Sin provincia ni país al lado: quien escribe "Cór" quiere ver "Córdoba" y no
 * "Córdoba, Córdoba, Argentina". El filtro del servidor busca por texto, así que
 * cuanto más corto lo que queda escrito, más autos encuentra.
 */
export const ZONAS = [
  "Buenos Aires",
  "CABA",
  "Palermo",
  "Belgrano",
  "Recoleta",
  "Caballito",
  "Villa Urquiza",
  "Núñez",
  "San Isidro",
  "Vicente López",
  "Tigre",
  "Olivos",
  "Martínez",
  "Quilmes",
  "Lomas de Zamora",
  "La Plata",
  "Mar del Plata",
  "Pinamar",
  "Villa Gesell",
  "Córdoba",
  "Villa Carlos Paz",
  "Rosario",
  "Santa Fe",
  "Mendoza",
  "San Rafael",
  "Bariloche",
  "San Martín de los Andes",
  "Neuquén",
  "Salta",
  "Jujuy",
  "Tucumán",
  "Corrientes",
  "Posadas",
  "Puerto Iguazú",
  "Ushuaia",
  "El Calafate",
  "Mar de Ajó",
  "Necochea",
  "Bahía Blanca",
  "Paraná",
];

/**
 * Qué auto. Marcas primero y después los modelos más alquilados del país.
 *
 * La marca sola sirve para ver todo lo de esa marca; el modelo, para ir directo.
 * Por eso están los dos y no solo uno.
 */
export const AUTOS = [
  /*
    EL ORDEN ES EL DE LO MÁS BUSCADO, no marcas y después modelos.

    Cuando varias entradas empiezan igual se completa con la PRIMERA, así que el
    orden decide qué se ofrece. Agrupado por marcas primero, "Su" completaba a
    "Suzuki" —una marca que acá casi no se alquila— en vez de a "Suran", que es
    uno de los autos más comunes del país. Lo mismo pasaba con varios.

    Así que primero van las marcas grandes y los modelos que se alquilan de
    verdad, y las marcas de nicho después.
  */
  // Marcas grandes
  "Fiat", "Volkswagen", "Chevrolet", "Renault", "Peugeot", "Toyota", "Ford",
  "Citroën", "Nissan", "Honda",
  // Los modelos que se alquilan
  "Suran", "Sandero", "Logan", "Duster", "Kangoo", "Clio", "Megane",
  "Gol", "Gol Trend", "Polo", "Virtus", "Vento", "Amarok", "Tiguan", "T-Cross",
  "Cronos", "Argo", "Mobi", "Toro", "Pulse", "Palio", "Uno", "Siena",
  "Onix", "Prisma", "Cruze", "Tracker", "S10", "Spin", "Corsa", "Agile",
  "208", "308", "2008", "3008", "Partner", "Expert",
  "Etios", "Corolla", "Yaris", "Hilux", "SW4", "RAV4",
  "Ka", "Fiesta", "Focus", "EcoSport", "Ranger", "Territory",
  "C3", "C4", "Berlingo",
  "Versa", "March", "Kicks", "Frontier",
  "Fit", "City", "HR-V", "CR-V",
  "Renegade", "Compass",
  "Vitara", "Swift",
  "Creta", "Tucson", "HB20",
  "Cerato", "Sportage",
  "Fiat 600",
  // Marcas de nicho, al final: comparten las primeras letras con modelos mucho
  // más buscados.
  "Jeep", "Suzuki", "Hyundai", "Kia",
  "Mercedes-Benz", "BMW", "Audi", "Volvo", "Subaru", "Mitsubishi",
];

/**
 * Busca con qué seguir lo que se está escribiendo.
 *
 * Devuelve el RESTO, no la palabra entera: quien escribió "su" recibe "ran", que
 * es lo que hay que mostrar en gris a continuación. Devuelve "" si no hay con
 * qué seguir.
 *
 * Compara sin acentos y sin distinguir mayúsculas —quien escribe "cordoba" tiene
 * que llegar a "Córdoba"—, pero devuelve el resto TAL CUAL está escrito en la
 * lista, con sus acentos.
 */
const sinAcentos = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function completar(texto, lista) {
  const vacio = { resto: "", completa: "" };
  const escrito = String(texto ?? "");
  // Con menos de dos letras hay demasiadas opciones y la sugerencia manotea.
  if (escrito.trim().length < 2) return vacio;

  const clave = sinAcentos(escrito);
  const encontrada = lista.find((op) => {
    const plano = sinAcentos(op);
    return plano.startsWith(clave) && plano.length > clave.length;
  });
  if (!encontrada) return vacio;

  return {
    // `resto` es lo que se dibuja en gris a continuación de lo escrito. Se corta
    // por la cantidad de caracteres tecleados: la versión sin acentos tiene el
    // mismo largo que la original, así que el índice sirve para las dos.
    resto: encontrada.slice(escrito.length),
    /*
      `completa` es con qué se reemplaza TODO al aceptar, y es la de la lista con
      sus acentos —"Córdoba" y no "cordoba"—.

      Conservar lo tecleado sería más prolijo visualmente, pero deja escrito un
      nombre que no existe: quien escribe "cordo" y aprieta Tab tiene que quedar
      con "Córdoba", que es lo que el filtro va a buscar. Se ve un salto mínimo
      al aceptar y en cambio el valor queda bien.
    */
    completa: encontrada,
  };
}
