// ============================================================================
//  Home — Pantalla de INICIO
// ----------------------------------------------------------------------------
//  Es la portada de la app. Muestra:
//   - Un "hero" con buscador por ubicación Y FECHAS (retiro / devolución).
//   - Categorías de autos (Sedan, SUV, etc.), que ahora filtran de verdad.
//   - La grilla de autos, en Lista o en Mapa, con el corazón de favoritos.
//
//  Qué se arregló acá:
//   · Las fechas del buscador eran texto fijo ("18 dic · 10:00"): no filtraban
//     nada. Ahora son dos selectores reales y el backend descarta los autos ya
//     reservados u ocupados en ese rango.
//   · Las categorías comparaban contra un campo que el backend no devolvía, así
//     que las tarjetas quedaban sin precio ("Ver autos →") y al tocarlas no
//     aparecía ningún auto. Ahora la categoría se guarda en el vehículo.
//   · Los autos de ejemplo se mezclaban siempre con los publicados. Ahora solo
//     aparecen si todavía no hay ninguna publicación.
//   · El corazón de favoritos no se podía tocar: el clic abría la publicación.
// ============================================================================
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useListings } from "../../hooks/useListings";
import { CATEGORIES, filterCars, priceOf, categoryLabel, transmissionLabel, fuelLabel } from "../../services/listings";
import FavoriteButton from "../../components/FavoriteButton";
import { firstBookableInput } from "../../services/dates";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addMonths, format } from "date-fns";
import AutocompleteInput from "../../components/AutocompleteInput";
import { AUTOS, ZONAS } from "../../data/sugerencias";
import { agruparPorPantalla, centroDe, htmlDelMonton } from "../../services/mapaClusters";
import MapCarPopup from "../../components/MapCarPopup";
import { useCurrency } from "../../context/CurrencyContext";
import { localeFor } from "../../i18n/dates";
import { useI18n } from "../../i18n/core";
import Spinner from "../../components/Spinner";
import LandingBanner from "../../components/LandingBanner";

// El mínimo de los selectores de fecha es MAÑANA: no hay alquileres para el
// mismo día (ver services/dates.js).

/**
 * La lupa del buscador.
 *
 * Dibujada acá y no un emoji: los emojis los pinta el sistema operativo, así que
 * la misma lupa sale distinta en Windows, en Android y en iPhone, y no hay forma
 * de que combine con el resto. Un trazo de 2.2 y las puntas redondeadas para que
 * a 20px se lea como una lupa y no como un charquito.
 */
const LupaIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export default function Home() {
  const { t: tr, lang } = useI18n();
  const { precio } = useCurrency();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();

  /*
    DOS CAMPOS Y NO UNO.

    Antes había un solo "Dónde" que decía "Ciudad, barrio o modelo": el mismo
    cuadro para dos cosas que no se buscan igual. Un lugar filtra por zona en el
    servidor; una marca filtra por texto entre los autos. Metidos en un campo,
    escribir "Palermo" y escribir "Suran" iban por el mismo camino y uno de los
    dos siempre salía mal.

    Separados, cada uno va a donde corresponde: `where` a la zona y `q` al auto.
    La pantalla de Buscar ya los recibía por separado; el inicio no se los
    mandaba.
  */
  const [zona, setZona] = useState("");
  const [search, setSearch] = useState("");
  // ¿Está abierto el calendario? Una sola vez para los dos campos de fecha,
  // porque es un solo calendario con el rango entero, como el de Airbnb.
  const [calendario, setCalendario] = useState(false);
  /*
    EN COMPUTADORA LA LISTA Y EL MAPA VAN LOS DOS A LA VEZ.

    Antes eran excluyentes: se elegía uno y el otro desaparecía. Buscar un auto
    es justamente cruzar las dos cosas —"este me gusta, ¿dónde queda?"— y con el
    botón había que ir y volver perdiendo el lugar cada vez. Y al volver a la
    lista quedaba el hueco gris de donde había estado el mapa.

    `foco` es sobre cuál está el mouse: el de abajo del cursor se agranda y el
    otro se achica, sin llegar a desaparecer. Así se tiene un mapa grande cuando
    se está mirando el mapa y una lista cómoda cuando se está mirando la lista,
    sin apretar nada.

    En el teléfono no: dos columnas en 390px no son dos columnas. Ahí sigue el
    botón de siempre y `view` manda.
  */
  const [foco, setFoco] = useState(null);
  const [cat, setCat] = useState("");            // "" = todas las categorías
  const [pickup, setPickup] = useState("");      // fecha de retiro (YYYY-MM-DD)
  const [dropoff, setDropoff] = useState("");    // fecha de devolución
  const [view, setView] = useState("lista");

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  // Si la librería ya está cargada al montar, se arranca con eso puesto en vez
  // de montar primero en falso y corregirlo con un efecto.
  const [mapLoaded, setMapLoaded] = useState(() => typeof window !== "undefined" && !!window.L);

  /*
    EL GLOBO DEL PIN, DIBUJADO POR REACT.

    Leaflet pone el globo donde va y lo mantiene pegado al punto cuando se
    arrastra el mapa; el contenido lo dibuja React adentro de este div suelto,
    con un portal. El portal es lo que hace posible el corazón de favoritos y el
    pasador de fotos: al seguir colgando del árbol de React, la tarjeta hereda la
    sesión, los favoritos y el idioma. Con una cadena de HTML, como estaba antes,
    nada de eso existe.

    Un solo div para todos los pines: hay un solo globo abierto por vez.
  */
  const [pinAbierto, setPinAbierto] = useState(null);
  // El globo que está abierto ahora mismo. Ver la nota de `popupclose`.
  const globoRef = useRef(null);
  const [nodoGlobo] = useState(() =>
    (typeof document === "undefined" ? null : document.createElement("div")));

  /**
   * Filtros que se envían al backend: SOLO las fechas, porque son las únicas que
   * necesitan mirar la base (reservas y bloqueos) para saber qué auto está libre.
   *
   * La categoría y el texto se filtran en el navegador. Así las tarjetas de
   * categoría pueden seguir mostrando el precio de TODAS las categorías (si se
   * filtrara en el servidor, al elegir "Sedan" el resto quedaría en "Sin autos")
   * y el filtro también funciona sobre los autos de ejemplo.
   */
  const serverFilters = useMemo(() => {
    const filters = { limit: 50 };
    // Un solo día (retiro = devolución) es una búsqueda válida: se pregunta si el
    // auto está libre ESE día. Antes se exigía devolución posterior al retiro y
    // con fechas iguales no se mandaba ninguna, así que no se filtraba nada y
    // aparecían autos que estaban ocupados justo ese día.
    if (pickup && dropoff && new Date(dropoff) >= new Date(pickup)) {
      filters.startDate = new Date(`${pickup}T10:00:00`).toISOString();
      filters.endDate = new Date(`${dropoff}T10:00:00`).toISOString();
    }
    return filters;
  }, [pickup, dropoff]);

  const { cars, loading, error, showingMocks } = useListings(serverFilters);

  // Sobre lo que trajo el backend se aplican la categoría y la búsqueda por
  // texto, que responden sin esperar otra vuelta al servidor.
  const filtered = useMemo(
    () => filterCars(cars, { text: search, category: cat }),
    [cars, search, cat],
  );

  /*
    El auto del globo, pero SOLO si sigue en la lista.

    Cambiar un filtro puede dejar afuera justo el auto que estaba abierto: el pin
    desaparece y el globo quedaría flotando sobre un punto que ya no existe. Se
    resuelve mirando la lista en el momento de dibujar, y no con un efecto que
    corrija el estado después: así no hay ningún render intermedio con el globo
    huérfano en pantalla.
  */
  const pinVisible = pinAbierto && filtered.some((c) => c.id === pinAbierto.id)
    ? pinAbierto
    : null;

  /*
    El aviso de las fechas se CALCULA a partir de las fechas, no se guarda aparte.

    Antes era un estado que un efecto mantenía al día. Un estado que solo copia
    lo que ya está en otros dos siempre puede quedar desfasado un render —el
    aviso viejo con las fechas nuevas— y encima obliga a dibujar de nuevo la
    pantalla para nada.
  */
  const dateError = useMemo(() => {
    if (pickup && dropoff && new Date(dropoff) < new Date(pickup)) return tr("home.dateBackwards");
    if ((pickup && !dropoff) || (!pickup && dropoff)) return tr("home.dateIncomplete");
    return "";
  }, [pickup, dropoff, tr]);

  // Carga la librería del mapa (Leaflet) una sola vez.
  useEffect(() => {
    if (window.L) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  /** ¿Hay mapa en pantalla? En computadora siempre; en el teléfono, si lo eligió. */
  const hayMapa = !isMobile || view === "mapa";

  // En el teléfono, al volver a la lista se destruye el mapa para liberar memoria.
  useEffect(() => {
    if (!hayMapa && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    }
  }, [hayMapa]);

  // Dibuja en el mapa un pin + un círculo de "zona aproximada" por cada auto
  // filtrado, con un popup que lleva al detalle. Borra los pines anteriores.
  const addMarkers = useCallback((map, L) => {
    if (!map || !L) return;
    Object.values(markersRef.current).forEach(m => {
      try {
        map.removeLayer(m.marker || m);
        if (m.circle) map.removeLayer(m.circle);
      } catch { /* la capa ya no estaba en el mapa */ }
    });
    markersRef.current = {};

    /*
      LOS QUE QUEDAN ENCIMA SE MUESTRAN COMO UNO.

      Alejando el mapa, varios autos del mismo barrio se pisan y no se puede
      tocar ninguno. Se agrupan por la distancia EN PANTALLA con el zoom actual
      —no en kilómetros: dos autos a 500m están encima a zoom de ciudad y
      separados a zoom de barrio— y cada montón se dibuja con el número adentro.
      Al acercarse se vuelven a separar solos.
    */
    const grupos = agruparPorPantalla(map, filtered);

    grupos.filter((g) => g.length > 1).forEach((grupo) => {
      const centro = centroDe(grupo);
      const icono = L.divIcon({
        className: "", html: htmlDelMonton(grupo.length), iconAnchor: [26, 26],
      });
      const monton = L.marker(centro, { icon: icono });
      // Tocarlo acerca hasta que el montón se abre. `fitBounds` con los puntos
      // del grupo deja el zoom justo donde dejan de pisarse.
      monton.on("click", () => {
        map.fitBounds(grupo.map((c) => [c.lat, c.lng]), { padding: [60, 60], maxZoom: 17 });
      });
      monton.addTo(map);
      markersRef.current[`monton-${centro.join(",")}`] = { marker: monton };
    });

    grupos.filter((g) => g.length === 1).map((g) => g[0]).forEach(car => {
      if (!car.lat || !car.lng) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:#0f6ce6;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;"></div>`,
        iconAnchor: [7, 7],
      });
      const circle = L.circle([car.lat, car.lng], {
        radius: 600, color: "#0f6ce6", fillColor: "#bfdbfe",
        fillOpacity: 0.18, weight: 1.5, interactive: false,
      }).addTo(map);
      const marker = L.marker([car.lat, car.lng], { icon });
      // El globo NO se abre solo con bindPopup: primero se avisa cuál es el auto
      // para que React dibuje la tarjeta, y recién después se abre. Al revés,
      // Leaflet mediría un globo todavía vacío y le saldría del tamaño
      // equivocado.
      marker.on("click", () => setPinAbierto(car));
      marker.addTo(map);
      markersRef.current[car.id] = { marker, circle };
    });
  }, [filtered]);

  /*
    El dibujante SIEMPRE al día.

    `addMarkers` se rehace cada vez que cambia la lista filtrada, pero el oyente
    de `zoomend` se registra una sola vez, al crear el mapa: se quedaría con la
    versión de ese momento. Después de cambiar un filtro, mover el zoom traería
    de vuelta los autos viejos. Guardando la última versión en una referencia, el
    oyente siempre llama a la de ahora.
  */
  const dibujarRef = useRef(addMarkers);
  useEffect(() => { dibujarRef.current = addMarkers; }, [addMarkers]);

  /*
    CREAR EL MAPA: hay que esperar DOS cosas, no una.

    Hacen falta la librería y el div donde va el mapa, y ninguna de las dos está
    lista al montar: la librería baja de internet, y el div todavía no existe
    porque mientras carga la lista en su lugar está el cartel de "cargando".

    Antes se probaba una sola vez, 150ms después de tener la librería. Si en ese
    momento el div no estaba —que es lo normal cuando el backend tarda un poco
    más que eso— el mapa no se creaba nunca, y como el efecto que dibuja los
    pines ya había pasado con la lista todavía vacía, el mapa terminaba en
    blanco: sin un solo punto, y sin nada que lo volviera a intentar.

    Ahora se reintenta hasta que las dos estén, y apenas el mapa queda hecho se
    dibujan los pines con la lista de ESE momento —por eso `dibujarRef` y no
    `addMarkers` directo, que sería la versión vieja.
  */
  useEffect(() => {
    if (!hayMapa) return;
    const intentar = () => {
      if (mapInstanceRef.current) return true;
      const L = window.L;
      if (!L || !mapRef.current) return false;
      // scrollWheelZoom: false — ver la nota en components/MapView.jsx.
      const map = L.map(mapRef.current, { center: [-34.6037, -58.3816], zoom: isMobile ? 11 : 12, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      mapInstanceRef.current = map;
      /*
        Al cambiar el zoom hay que volver a agrupar: lo que estaba junto se
        separa y al revés. `zoomend` y no `zoom`, que se dispara en cada cuadro
        de la animación y redibujaría los pines cincuenta veces por gesto.
      */
      map.on("zoomend", () => dibujarRef.current(map, L));
      /*
        Al cerrar el globo hay que soltar el auto elegido, o al volver a tocar el
        MISMO pin el estado no cambiaría y no se abriría de nuevo.

        Pero SOLO si el que se cerró es el que está abierto. Abrir un globo
        cierra el anterior, y ese cierre también avisa por acá: sin la
        comparación, tocar un segundo pin abriría su globo y el aviso de cierre
        del primero lo apagaría en el acto.
      */
      map.on("popupclose", (e) => {
        if (e?.popup && e.popup !== globoRef.current) return;
        globoRef.current = null;
        setPinAbierto(null);
      });
      dibujarRef.current(map, L);
      return true;
    };
    if (intentar()) return;
    const iv = setInterval(() => { if (intentar()) clearInterval(iv); }, 100);
    return () => clearInterval(iv);
  }, [hayMapa, mapLoaded, isMobile, loading]);

  // Y de nuevo cada vez que cambia la lista filtrada.
  useEffect(() => {
    if (!hayMapa || !mapInstanceRef.current || !window.L) return;
    addMarkers(mapInstanceRef.current, window.L);
  }, [filtered, addMarkers, hayMapa]);

  /*
    Abre el globo con la tarjeta YA dibujada.

    Este efecto corre después del render, así que cuando Leaflet mide el globo
    para acomodarlo, adentro del div ya está la foto, el corazón y el precio. Si
    se abriera en el mismo clic —que es lo que hace `bindPopup`— mediría un div
    vacío y el globo quedaría chico y mal ubicado.
  */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L || !nodoGlobo) return;
    if (!pinVisible) { map.closePopup(); return; }
    // Se anota cuál es el nuestro ANTES de abrirlo: abrirlo cierra el anterior y
    // dispara su aviso de cierre, que con la referencia ya cambiada se ignora.
    const globo = window.L.popup({ closeButton: true, maxWidth: 240, minWidth: 208, autoPan: true })
      .setLatLng([pinVisible.lat, pinVisible.lng])
      .setContent(nodoGlobo);
    globoRef.current = globo;
    globo.openOn(map);
  }, [pinVisible, nodoGlobo]);


  /*
    AL CAMBIAR EL ANCHO DE LA COLUMNA HAY QUE AVISARLE AL MAPA.

    Leaflet calcula qué pedazos del mapa (tiles) bajar según el tamaño que tenía
    el contenedor cuando se creó. Si el contenedor cambia de ancho y nadie le
    avisa, la parte nueva queda SIN PEDAZOS: gris. Es exactamente el gris que se
    veía al ir y volver entre lista y mapa.

    `invalidateSize` es el aviso. Se llama después de que termina la animación de
    las columnas —350ms—, porque durante la transición el ancho todavía se está
    moviendo y medirlo antes da un número que ya no vale.
  */
  useEffect(() => {
    if (!hayMapa || !mapInstanceRef.current) return;
    const t = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 380);
    return () => clearTimeout(t);
  }, [foco, hayMapa]);

  /**
   * Precio más barato de cada categoría, calculado con los autos que hay. Es lo
   * que llena el "Desde $X" de las tarjetas de categoría, que antes quedaban
   * siempre vacías porque el dato de categoría no llegaba.
   */
  const priceByCategory = useMemo(() => {
    const result = {};
    cars.forEach(car => {
      if (!car.category || car.available === false) return;
      const price = priceOf(car);
      if (!price) return;
      result[car.category] = result[car.category] ? Math.min(result[car.category], price) : price;
    });
    return result;
  }, [cars]);

  const countByCategory = useMemo(() => {
    const result = {};
    cars.forEach(car => {
      if (!car.category || car.available === false) return;
      result[car.category] = (result[car.category] || 0) + 1;
    });
    return result;
  }, [cars]);

  /*
    Las sugerencias del campo del auto: la lista fija MÁS lo que hay publicado.

    La lista fija sola envejece —un modelo nuevo tarda en entrar— y lo publicado
    solo no alcanza, porque al principio hay dos autos. Juntas, la lista da algo
    desde el primer día y lo publicado la mantiene al día sin que nadie la toque.

    Se sacan repetidos comparando en minúsculas: "Fiat" de la lista y "fiat"
    escrito por un dueño son lo mismo, y aparecer dos veces no ayuda a nadie.
  */
  const sugerenciasDeAutos = useMemo(() => {
    const vistas = new Set(AUTOS.map((a) => a.toLowerCase()));
    const extra = [];
    for (const car of cars) {
      for (const dato of [car.brand, car.model]) {
        const limpio = String(dato || "").trim();
        if (!limpio || vistas.has(limpio.toLowerCase())) continue;
        vistas.add(limpio.toLowerCase());
        extra.push(limpio);
      }
    }
    // Lo publicado va al final: la lista curada está ordenada por lo más común,
    // y eso es lo que conviene ofrecer primero.
    return [...AUTOS, ...extra];
  }, [cars]);

  /** Qué dice el campo de fechas cuando está cerrado. */
  const textoDeFechas = () => {
    if (!pickup) return tr("home.datesPlaceholder");
    const desde = format(new Date(`${pickup}T12:00:00`), "d MMM", { locale: localeFor(lang) });
    if (!dropoff) return desde;
    const hasta = format(new Date(`${dropoff}T12:00:00`), "d MMM", { locale: localeFor(lang) });
    return `${desde} - ${hasta}`;
  };

  /**
   * Lo que devuelve el calendario de rango: [inicio, fin], y el fin viene null
   * mientras se está eligiendo la primera punta.
   *
   * El calendario se cierra solo al completar el rango. Es lo que uno espera
   * —ya no queda nada por elegir— y ahorra el toque en "Listo".
   */
  const elegirRango = ([desde, hasta]) => {
    const aTexto = (d) => (d ? format(d, "yyyy-MM-dd") : "");
    setPickup(aTexto(desde));
    setDropoff(aTexto(hasta));
    if (desde && hasta) setCalendario(false);
  };

  // Manda al buscador con los filtros ya puestos, para no perderlos al cambiar
  // de pantalla.
  const goToSearch = () => {
    const params = new URLSearchParams();
    if (zona) params.set("where", zona);
    if (search) params.set("q", search);
    if (cat) params.set("category", cat);
    if (pickup) params.set("from", pickup);
    if (dropoff) params.set("to", dropoff);
    navigate(`/buscar${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // ─────────────────────────────────────────── Estilos
  const t = {
    content: { padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1320, margin: "0 auto" },
    /*
      El bloque azul de arriba.

      ANTES: un degradado de tres colores que arrancaba en azul noche y terminaba
      en un azul eléctrico, con un resplandor blanco encima, esquinas de 20px y
      adentro una píldora redonda que decía "● BUENOS DÍAS, IGNACIO". Cuatro
      recursos apilados para decir dos cosas. El degradado además tiraba a violeta
      en el medio, que no es el azul de la marca.

      AHORA: un solo azul, plano, el mismo del resto de la app. Y el saludo
      afuera: lo que se viene a hacer acá es buscar un auto.

      DE BORDE A BORDE. Los márgenes negativos le devuelven al bloque el relleno
      que le pone el contenedor de la página, arriba y a los dos costados, así
      llega hasta el borde y hasta la barra. Sin eso quedaba una tarjeta azul
      flotando con dos franjas blancas al costado. Y sin redondeo: una franja que
      corta la página no tiene esquinas.
    */
    hero: {
      borderRadius: 0, background: "#0b55c0", color: "#fff", position: "relative",
      padding: isMobile ? "26px 18px" : "44px 36px",
      marginTop: isMobile ? -20 : -28,
      marginLeft: isMobile ? -16 : -32,
      marginRight: isMobile ? -16 : -32,
      marginBottom: isMobile ? 24 : 32,
    },
    /*
      La tarjeta blanca del buscador. En escritorio no lleva relleno propio: el
      relleno vive en cada celda, y así el botón de la punta puede ocupar el alto
      completo en vez de quedar como un rectángulo flotando adentro de otro.
      `overflow: hidden` recorta el botón contra el redondeo de la tarjeta.
    */
    searchRow: isMobile
      ? { display: "flex", flexDirection: "column", gap: 2, background: "#fff", borderRadius: 18, padding: 8, marginTop: 20 }
      /*
        SIN `overflow: hidden`.

        Estaba para recortar las puntas cuadradas del botón azul y que la fila
        quedara con sus 4px de redondeo. El problema es que también recorta lo que
        SALE de la fila, y ahora sale algo: el calendario se abre para abajo y
        quedaba cortado en el borde, se veía apenas la última fila de días.

        El redondeo del botón se resuelve en el botón, que es donde correspondía.
      */
      // Bien redondeada: la barra pasa a leerse como una sola pieza y no como
      // tres cajas pegadas. La lupa va adentro, así que el redondeo grande no
      // choca contra ninguna punta cuadrada.
      : { display: "flex", alignItems: "stretch", background: "#fff", borderRadius: 999, marginTop: 26 },
    // En celular cada campo ocupa todo el ancho y se separa con una línea abajo
    // en vez de a la derecha, que es lo que se lee bien apilado.
    // El renglón de cada campo estaba altísimo (etiqueta + campo de 14px con
    // padding generoso), así que las tres filas del buscador se comían media
    // pantalla del teléfono y había que scrolear para ver los autos.
    searchCell: isMobile
      ? { width: "100%", padding: "7px 12px", borderBottom: "1px solid #f1f1f1", boxSizing: "border-box" }
      // El primer campo lleva más aire a la izquierda: con el redondeo grande,
      // pegado al borde el texto se mete adentro de la curva.
      : { flex: 1, minWidth: 140, padding: "16px 20px", borderRight: "1px solid #eee" },
    searchLabel: { fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 2 },
    searchInput: { border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent", width: "100%" },
    sectionTitle: { fontSize: 19, fontWeight: 800, color: "#111827", letterSpacing: "-.3px" },
    /*
      La tarjeta del auto.

      El redondeo baja de 16 a 6: con 16 la tarjeta, la foto, la etiqueta, las
      dos píldoras y el botón eran todos el MISMO rectángulo de puntas redondas
      repetido cinco veces, uno adentro del otro. Ahora el borde suave queda
      para la tarjeta y nada más.
    */
    carCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 6, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" },
    /*
      Las dos fichas de datos (combustible, asientos) ya no son píldoras sueltas:
      son dos celdas de una misma barra, separadas por una línea. Se leen como una
      ficha técnica y no como dos etiquetas decorativas.
    */
    fichaFila: { display: "flex", border: "1px solid #ececec", borderRadius: 4, marginBottom: 14, overflow: "hidden" },
    fichaCelda: { flex: 1, fontSize: 11.5, color: "#4b5563", padding: "7px 10px", textAlign: "center", borderLeft: "1px solid #ececec" },
    reservar: { background: "#111827", color: "#fff", border: "none", borderRadius: 4, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    stepCard: { background: "#fff", border: "1px solid #ececec", borderRadius: 14, padding: 20 },
    banner: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#92400e", marginBottom: 20 },
  };

  // ─────────────────────────────────────────── Subcomponentes
  // Tarjeta individual de un auto en la grilla (foto, datos, precio y botón).
  const CarCard = ({ car }) => (
    <div style={t.carCard} onClick={() => navigate(`/cars/${car.id}`)}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/11", background: "#e5e7eb" }}>
        {car.photos?.length > 0
          ? <img src={car.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>{tr("common.noPhoto")}</div>}
        {/* La categoría va PEGADA a la esquina de la foto, no flotando a 12px de
            los dos bordes con forma de píldora. Apoyada en la esquina se lee como
            parte de la foto; flotando parecía un globito encima. */}
        {car.category && (
          <div style={{ position: "absolute", top: 0, left: 0, background: "rgba(17,24,39,.9)", color: "#fff", padding: "5px 11px", borderBottomRightRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: ".02em" }}>{categoryLabel(tr, car.category)}</div>
        )}
        {/* Corazón: es un botón que corta el clic, así no abre la publicación. */}
        <FavoriteButton listingId={car.id} disabled={car.isMock} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{car.brand} {car.model} {car.year}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          {car.location && `${car.location} · `}
          {car.rating > 0 && `${car.rating} ★ · `}{transmissionLabel(tr, car.transmissionCode)}
        </div>
        {/* Ficha técnica: celdas de una misma barra, separadas por una línea. La
            primera no lleva línea a la izquierda, que si no queda doble contra el
            borde de la barra. */}
        {(car.fuelCode || car.seats) && (
          <div style={t.fichaFila}>
            {car.fuelCode && (
              <span style={{ ...t.fichaCelda, borderLeft: "none" }}>{fuelLabel(tr, car.fuelCode)}</span>
            )}
            {car.seats && (
              <span style={{ ...t.fichaCelda, ...(car.fuelCode ? {} : { borderLeft: "none" }) }}>
                {tr("common.seats", { count: car.seats })}
              </span>
            )}
          </div>
        )}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{precio(priceOf(car))}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{tr("common.perDay")}</span></div>
          <button style={t.reservar} onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}>{tr("home.book")}</button>
        </div>
      </div>
    </div>
  );

  /*
    Las dos secciones de abajo son PEDAZOS DE JSX, no componentes.

    Estaban escritas como componentes definidos adentro de Home, y eso significa
    que en cada dibujado React ve un tipo de componente nuevo: desmonta el
    anterior y monta uno de cero. Guardadas como JSX se dibujan igual, pero sin
    ese desmontar y montar por cada tecla que se escribe en el buscador.
  */
  const seccionCategorias = (
    <>
      <div style={{ ...t.sectionTitle, marginBottom: 16 }}>{tr("home.categories")}</div>
      {/* Cuatro columnas y no seis: son ocho categorías, así quedan dos filas
          parejas de cuatro. Con seis columnas quedaban seis arriba y las que
          sobraban solas abajo, que se ve como si faltara algo. En el celular,
          dos por fila. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
        {CATEGORIES.map((c) => {
          const min = priceByCategory[c.id];
          const count = countByCategory[c.id] || 0;
          const active = cat === c.id;
          return (
            <div key={c.id}
              onClick={() => setCat(active ? "" : c.id)}
              style={{
                background: "#fff",
                border: active ? "1.5px solid #0f6ce6" : "1px solid #ececec",
                borderRadius: 14, padding: "20px 18px", cursor: "pointer",
                transition: "transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1), border-color .35s ease",
                boxShadow: active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)"; if (!active) e.currentTarget.style.borderColor = "#bfd8fb"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = active ? "0 6px 20px rgba(37,99,235,.12)" : "0 1px 3px rgba(0,0,0,.04)"; if (!active) e.currentTarget.style.borderColor = "#ececec"; }}
            >
              <div style={{ width: 28, height: 3, borderRadius: 2, background: active ? "#0f6ce6" : "#e5e7eb", marginBottom: 16, transition: "background .35s ease" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-.2px" }}>{tr(c.key)}</div>
              {/* Ahora sí hay dato: precio mínimo real y cantidad de autos. */}
              <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#0f6ce6" : "#9ca3af", marginTop: 4 }}>
                {min ? tr("home.from", { price: precio(min) }) : count > 0 ? `${count}` : tr("home.noneYet")}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const seccionPasos = (
    <>
      <div style={{ ...t.sectionTitle, marginBottom: 4 }}>{tr("home.firstTime")}</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>{tr("home.firstTimeSub")}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
        {[
          ["01", "home.step1", "home.step1Sub"],
          ["02", "home.step2", "home.step2Sub"],
          ["03", "home.step3", "home.step3Sub"],
          ["04", "home.step4", "home.step4Sub"],
        ].map(([n, ti, d]) => (
          <div key={n} style={t.stepCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#0f6ce6", marginBottom: 8 }}>{n}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{tr(ti)}</div>
            <div style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>{tr(d)}</div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div style={t.content}>
      {/* Hero */}
      {/*
        data-no-invert: en modo oscuro la página entera se invierte, y este bloque
        YA es oscuro (azul noche con letras blancas), así que la inversión lo dejaba
        celeste con letras negras — justo al revés de lo que tiene que ser. Con esta
        marca se lo vuelve a invertir y conserva sus colores reales.
        La tarjeta blanca del buscador que va adentro se oscurece por CSS
        (.fw-hero-search en theme.css), porque acá el filtro ya no la alcanza.
      */}
      <div style={t.hero} data-no-invert>
        <div>
          <div style={{ fontSize: isMobile ? 27 : 42, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>{tr("home.title")}</div>
          <div style={{ fontSize: 14.5, opacity: .85, marginTop: 12 }}>{tr("home.subtitle")}</div>

          <div className="fw-hero-search" style={t.searchRow}>
            {/*
              ZONA. El campo va completando lo que se escribe: "cór" ofrece
              "Córdoba" y con Tab queda puesto. Ver AutocompleteInput.
            */}
            <div className="fw-plain-field" style={t.searchCell}>
              <div style={t.searchLabel}>{tr("home.where")}</div>
              <AutocompleteInput
                value={zona} onChange={setZona} opciones={ZONAS}
                onEnter={goToSearch}
                placeholder={tr("home.zonePlaceholder")}
                inputStyle={{ color: "#111827" }}
              />
            </div>

            {/* MARCA O MODELO, con las mismas ayudas pero su propia lista. */}
            <div className="fw-plain-field" style={t.searchCell}>
              <div style={t.searchLabel}>{tr("home.carLabel")}</div>
              <AutocompleteInput
                value={search} onChange={setSearch} opciones={sugerenciasDeAutos}
                onEnter={goToSearch}
                placeholder={tr("home.carPlaceholder")}
                inputStyle={{ color: "#111827" }}
              />
            </div>

            {/*
              FECHAS: UN SOLO CAMPO CON EL RANGO ENTERO.

              Antes eran dos campos `type="date"`, o sea dos calendarios del
              sistema que se abren de a uno. Elegir del 22 al 29 eran cuatro
              gestos —abrir, elegir, abrir el otro, elegir— y en el segundo
              calendario ya no se veía qué día se había elegido en el primero,
              que es justamente lo que hace falta para decidir.

              Ahora es un botón que abre DOS MESES juntos y se marcan las dos
              puntas de un tirón, con el rango pintado en el medio.
            */}
            <div className="fw-plain-field" style={{ ...t.searchCell, ...(isMobile ? { borderBottom: "none" } : {}), position: "relative" }}>
              <div style={t.searchLabel}>{tr("home.dates")}</div>
              <button type="button" onClick={() => setCalendario((v) => !v)}
                aria-expanded={calendario}
                style={{
                  ...t.searchInput, textAlign: "left", cursor: "pointer", padding: 0,
                  color: pickup ? "#111827" : "#9ca3af",
                }}>
                {textoDeFechas()}
              </button>

              {calendario && (
                <>
                  {/* Tocar afuera cierra. Va detrás del panel y delante de todo
                      lo demás, que es lo que hace que "afuera" sea afuera. */}
                  <div onClick={() => setCalendario(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)",
                    // En el teléfono se pega a la izquierda del campo, que ocupa
                    // todo el ancho; en computadora se centra bajo el campo.
                    left: isMobile ? 0 : "50%",
                    transform: isMobile ? "none" : "translateX(-50%)",
                    zIndex: 41, background: "#fff", borderRadius: 14,
                    boxShadow: "0 12px 40px rgba(0,0,0,.18)", padding: 14,
                    border: "1px solid #ececec",
                    /*
                      `max-content` es lo que pone los dos meses UNO AL LADO DEL
                      OTRO. Un elemento absoluto sin ancho se encoge hasta el
                      ancho de su contenedor —la casilla de fechas, unos 330px—,
                      y ahí los dos meses de 250px no entran, así que el
                      calendario los apilaba en vertical y quedaba larguísimo.

                      El tope es para que en una pantalla angosta el panel no se
                      salga por el costado.
                    */
                    width: "max-content",
                    maxWidth: "calc(100vw - 32px)",
                  }}>
                    <DatePicker
                      selectsRange
                      startDate={pickup ? new Date(`${pickup}T12:00:00`) : null}
                      endDate={dropoff ? new Date(`${dropoff}T12:00:00`) : null}
                      onChange={elegirRango}
                      minDate={new Date(`${firstBookableInput()}T12:00:00`)}
                      // Hasta seis meses: es lo mismo que acepta la reserva, así
                      // que no se puede elegir acá una fecha que después se
                      // rechace al reservar.
                      maxDate={addMonths(new Date(), 6)}
                      monthsShown={isMobile ? 1 : 2}
                      inline
                      locale={localeFor(lang)}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 }}>
                      <button type="button" onClick={() => { setPickup(""); setDropoff(""); }}
                        style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                        {tr("home.clearDates")}
                      </button>
                      <button type="button" onClick={() => setCalendario(false)}
                        style={{ background: "#0f6ce6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {tr("common.ready")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Acá había un select "Tipo" con el diseño por defecto del
                navegador. Se quitó: justo abajo está "Explorá por categoría",
                que hace exactamente lo mismo y se ve mucho mejor. */}
            {/*
              LA LUPA, no un botón con la palabra "Buscar autos".

              El botón azul con texto era la pieza más pesada de la barra y
              repetía algo que ya se entiende: en una barra con dónde, qué y
              cuándo, lo único que falta es buscar. La lupa lo dice sin ocupar
              media barra, y es lo que la gente ya busca con el ojo.

              El dibujo es propio y no un emoji: los emojis los pinta el sistema
              operativo, así que la misma lupa sale distinta en Windows, en
              Android y en iPhone, y ninguna de las tres combina con el resto.

              En el teléfono se queda ancho y con la palabra: ahí la barra está
              apilada, un círculo suelto abajo de todo no se lee como el cierre
              de nada.
            */}
            <button
              onClick={goToSearch}
              aria-label={tr("home.searchCars")}
              title={tr("home.searchCars")}
              style={{
                background: "#0f6ce6", color: "#fff", border: "none",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                ...(isMobile
                  ? { width: "100%", padding: "14px", marginTop: 8, borderRadius: 999 }
                  : {
                      width: 46, height: 46, borderRadius: "50%",
                      flexShrink: 0, alignSelf: "center", marginRight: 8,
                    }),
              }}>
              <LupaIcon />
              {isMobile && tr("home.searchCars")}
            </button>
          </div>
          {dateError && (
            <div style={{ marginTop: 12, fontSize: 13, background: "rgba(255,255,255,.16)", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>{dateError}</div>
          )}
        </div>
      </div>

      {/* Avisos de estado: datos de ejemplo o backend caído */}
      {showingMocks && (
        <div style={t.banner}>{tr("home.sampleCars")}</div>
      )}
      {error && !showingMocks && (
        <div style={{ ...t.banner, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>{error}</div>
      )}

      {seccionCategorias}

      {/* Encabezado de la grilla */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={t.sectionTitle}>
            {cat ? `${tr("home.available")} · ${categoryLabel(tr, cat)}` : tr("home.available")}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {loading ? tr("common.loading") : tr("home.availableCount", { count: filtered.length })}
            {pickup && dropoff && !dateError && " en las fechas elegidas"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(cat || search || pickup || dropoff) && (
            <button onClick={() => { setCat(""); setSearch(""); setPickup(""); setDropoff(""); }}
              style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151" }}>
              {tr("search.clearFilters")}
            </button>
          )}
          {/* Sólo en el teléfono: en computadora están los dos a la vez y elegir
              uno no significa nada. */}
          {isMobile && [["lista", tr("home.list")], ["mapa", tr("home.map")]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 600,
              border: view === k ? "2px solid #0f6ce6" : "1.5px solid #e5e7eb",
              background: view === k ? "#0f6ce6" : "#fff", color: view === k ? "#fff" : "#374151",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <Spinner block label={tr("common.loading")} />
      ) : (
        /*
          LOS DOS A LA VEZ, y el de abajo del mouse se agranda.

          Las proporciones: en reposo mitad y mitad, y con el mouse encima el que
          se mira pasa a 1.7 contra 1. No se lleva todo el ancho a propósito: el
          otro tiene que seguir a la vista, si no volvería a ser el botón de
          antes con una animación.

          La transición va sobre `grid-template-columns`, que los navegadores
          animan. Cuando termina hay que avisarle al mapa que cambió de tamaño
          (ver `invalidateSize` más arriba), o la parte nueva queda gris.
        */
        <div
          // Marca para poder encontrarlo desde las pruebas sin depender de los
          // estilos, que cambian.
          data-fw-split
          style={{
            display: isMobile ? "block" : "grid",
            gridTemplateColumns: foco === "lista" ? "1.7fr 1fr"
              : foco === "mapa" ? "1fr 1.7fr" : "1fr 1fr",
            transition: "grid-template-columns .35s cubic-bezier(.4,0,.2,1)",
            gap: 16, alignItems: "start",
          }}
        >
          {/* La lista. En el teléfono se muestra solo si está elegida. */}
          {(!isMobile || view === "lista") && (
            <div
              onMouseEnter={() => !isMobile && setFoco("lista")}
              onMouseLeave={() => !isMobile && setFoco(null)}
              style={{
                display: "grid",
                // Una sola columna en el teléfono. Con dos, cada tarjeta quedaba
                // en 170px: el nombre se partía en dos renglones y el precio con
                // el botón no entraban en la misma fila.
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(230px,1fr))",
                gap: isMobile ? 12 : 16,
                ...(isMobile ? {} : { maxHeight: "calc(100vh - 240px)", overflowY: "auto", paddingRight: 4 }),
              }}
            >
              {filtered.map(car => <CarCard key={car.id} car={car} />)}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#9ca3af" }}>
                  {tr("home.noResults")}
                  {(cat || pickup) && <div style={{ fontSize: 13, marginTop: 8 }}>{tr("home.tryOther")}</div>}
                </div>
              )}
            </div>
          )}

          {/* El mapa. */}
          {hayMapa && (
            <div
              onMouseEnter={() => !isMobile && setFoco("mapa")}
              onMouseLeave={() => !isMobile && setFoco(null)}
              style={{ position: isMobile ? "static" : "sticky", top: 90 }}
            >
              <div ref={mapRef} style={{
                height: isMobile ? "60vh" : "calc(100vh - 240px)",
                borderRadius: 16, overflow: "hidden", zIndex: 0, border: "1px solid #e5e7eb",
              }} />
              {/* La tarjeta del globo: vive en el árbol de React aunque se vea
                  adentro del mapa. */}
              {nodoGlobo && pinVisible
                && createPortal(
                  // `key`: al tocar otro pin el componente se rehace, y las fotos
                  // arrancan de la primera sin ningún efecto de por medio.
                  <MapCarPopup key={pinVisible.id} car={pinVisible} precio={precio} />,
                  nodoGlobo,
                )}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 28 }} />
      {seccionPasos}

      {/*
        Abajo de todo, la propaganda que lleva a la presentación del proyecto.

        Va última a propósito: quien entra a la app viene a buscar un auto, y la
        landing es para leer sobre Freewheel cuando ya se miró lo demás. Y sin
        nada después: cierra la página, como el pie de un sitio.
      */}
      <LandingBanner />
    </div>
  );
}
