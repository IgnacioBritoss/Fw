// ============================================================================
//  i18n — El proveedor de idioma
// ----------------------------------------------------------------------------
//  Este archivo exporta SOLO el componente proveedor. Todo lo demás (la lista de
//  idiomas, el hook useI18n, los diccionarios) vive en core.js: la regla de
//  recarga en caliente de React pide que un archivo con componentes no exporte
//  además constantes ni funciones.
//
//  Uso:
//    // en main.jsx
//    <I18nProvider><App /></I18nProvider>
//
//    // en cualquier pantalla
//    import { useI18n } from "../../i18n/core";
//    const { t } = useI18n();
//    <h1>{t("home.title")}</h1>
//    <p>{t("home.availableCount", { count: 15 })}</p>
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DICTIONARIES,
  I18nContext,
  STORAGE_KEY,
  idiomaInicial,
  translate,
} from "./core";

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(idiomaInicial);

  // El atributo lang del <html> importa de verdad: es lo que usan el corrector
  // ortográfico del navegador, los lectores de pantalla para elegir la voz, y
  // los buscadores para saber en qué idioma está la página.
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* no es grave */ }
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
