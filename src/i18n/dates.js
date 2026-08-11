// ============================================================================
//  dates.js — Fechas en el idioma elegido
// ----------------------------------------------------------------------------
//  Toda la app formateaba fechas con `{ locale: es }` de date-fns y con patrones
//  escritos a mano en castellano ("d 'de' MMMM yyyy"). Con la app en inglés las
//  fechas seguían diciendo "12 de marzo de 2025".
//
//  Acá vive UNA sola tabla de locales y cinco formatos, así ninguna pantalla
//  vuelve a escribir el suyo:
//   · longDate  → 12 de marzo de 2025 / 12 March 2025 / 2025年3月12日
//   · shortDate → 12 mar 2025
//   · monthYear → marzo 2025
//   · dayMonth  → 12 mar (sin el año: para algo de hace unos días)
//   · timeOfDay → 14:35 / 2:35 PM (en inglés se escribe con AM/PM)
// ============================================================================
import { format } from "date-fns";
import { es, enUS, ptBR, it, zhCN } from "date-fns/locale";

const LOCALES = { es, en: enUS, pt: ptBR, it, zh: zhCN };

// El patrón largo cambia con el idioma: en castellano y portugués va el "de",
// en inglés e italiano no, y en chino el orden es año-mes-día.
const LONG_PATTERNS = {
  es: "d 'de' MMMM yyyy",
  pt: "d 'de' MMMM 'de' yyyy",
  en: "d MMMM yyyy",
  it: "d MMMM yyyy",
  zh: "yyyy年M月d日",
};

const MONTH_YEAR_PATTERNS = {
  es: "MMMM yyyy",
  pt: "MMMM yyyy",
  en: "MMMM yyyy",
  it: "MMMM yyyy",
  zh: "yyyy年M月",
};

const SHORT_PATTERNS = {
  es: "d MMM yyyy",
  pt: "d MMM yyyy",
  en: "d MMM yyyy",
  it: "d MMM yyyy",
  zh: "yyyy年M月d日",
};

// Día y mes, sin año: para algo que pasó hace poco, donde el año sobra.
const DAY_MONTH_PATTERNS = {
  es: "d MMM",
  pt: "d MMM",
  en: "d MMM",
  it: "d MMM",
  zh: "M月d日",
};

// La hora. En inglés se escribe con AM/PM; en el resto, de 0 a 23.
const TIME_PATTERNS = {
  es: "HH:mm",
  pt: "HH:mm",
  en: "h:mm a",
  it: "HH:mm",
  zh: "HH:mm",
};

/** El locale de date-fns que corresponde al idioma elegido. */
export const localeFor = (lang) => LOCALES[lang] || es;

// Las tres se tragan una fecha inválida sin romper la pantalla: devuelven "".
const safeFormat = (value, pattern, lang) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return format(date, pattern, { locale: localeFor(lang) });
};

export const longDate = (value, lang) => safeFormat(value, LONG_PATTERNS[lang] || LONG_PATTERNS.es, lang);
export const shortDate = (value, lang) => safeFormat(value, SHORT_PATTERNS[lang] || SHORT_PATTERNS.es, lang);
export const monthYear = (value, lang) => safeFormat(value, MONTH_YEAR_PATTERNS[lang] || MONTH_YEAR_PATTERNS.es, lang);
export const dayMonth = (value, lang) => safeFormat(value, DAY_MONTH_PATTERNS[lang] || DAY_MONTH_PATTERNS.es, lang);
export const timeOfDay = (value, lang) => safeFormat(value, TIME_PATTERNS[lang] || TIME_PATTERNS.es, lang);
