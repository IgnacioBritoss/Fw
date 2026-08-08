// ============================================================================
//  i18n/core — Los idiomas, el contexto y el hook
// ----------------------------------------------------------------------------
//  Está separado de index.jsx porque ese archivo exporta un COMPONENTE (el
//  proveedor) y la regla de recarga en caliente de React pide que un archivo con
//  componentes no exporte además constantes ni funciones: si lo hace, al guardar
//  un cambio se recarga la página entera en vez de solo el componente.
//
//  Así que acá va todo lo que NO es un componente, y en index.jsx solo el
//  proveedor.
//
//  POR QUÉ ESTÁ HECHO A MANO Y NO CON UNA LIBRERÍA: las librerías de traducción
//  (react-i18next y compañía) traen carga de idiomas por red, detección por
//  navegador, plurales por reglas CLDR y bastante más. Acá se necesita una sola
//  cosa: cambiar el idioma desde Ajustes y que todos los textos cambien. Para eso
//  alcanza esto, que se lee entero en dos minutos, en vez de sumar una
//  dependencia grande a un proyecto que se entrega y se defiende.
// ============================================================================
import { createContext, useContext } from "react";
import es from "./es";
import en from "./en";
import pt from "./pt";
import it from "./it";
import zh from "./zh";

/** Los idiomas disponibles, con el nombre escrito EN SU PROPIO IDIOMA. */
export const LANGUAGES = [
  { code: "es", label: "Español", flagless: "ES" },
  { code: "en", label: "English", flagless: "EN" },
  { code: "pt", label: "Português", flagless: "PT" },
  { code: "it", label: "Italiano", flagless: "IT" },
  { code: "zh", label: "中文", flagless: "ZH" },
];

export const DICTIONARIES = { es, en, pt, it, zh };
export const STORAGE_KEY = "fw_lang";

/**
 * Busca un texto y reemplaza los huecos.
 *
 * Los huecos se escriben {así} en el diccionario: "Quedan {count} lugares".
 *
 * Si falta la traducción, cae en castellano en vez de mostrar la clave pelada
 * ("home.title"). Es a propósito: una pantalla a medio traducir se sigue
 * entendiendo, una pantalla con claves crudas no.
 */
export function translate(lang, key, vars) {
  const texto = DICTIONARIES[lang]?.[key] ?? es[key] ?? key;
  if (!vars) return texto;
  return Object.entries(vars).reduce(
    (acc, [nombre, valor]) => acc.split(`{${nombre}}`).join(String(valor)),
    texto,
  );
}

/** El idioma guardado, o castellano: la app se hizo en Argentina. */
export function idiomaInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado && DICTIONARIES[guardado]) return guardado;
  } catch { /* sin acceso a localStorage: se usa el de por defecto */ }
  return "es";
}

export const I18nContext = createContext(null);

/** Hook de atajo. Cualquier componente hace `const { t } = useI18n();`. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Sin proveedor arriba (por ejemplo en una prueba unitaria): castellano.
    return {
      t: (key, vars) => translate("es", key, vars),
      lang: "es",
      setLang: () => {},
    };
  }
  return ctx;
}

/**
 * Traducción para el código que NO es un componente de React —los servicios que
 * hablan con el backend, por ejemplo—, donde no hay hook al que llamar.
 * Lee el idioma guardado en el navegador, que es el mismo que puso el selector.
 */
export function tSync(key, vars) {
  return translate(idiomaInicial(), key, vars);
}
