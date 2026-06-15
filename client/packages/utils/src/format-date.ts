import { isWeb } from './platform';

/**
 * Locale mapping for supported countries.
 */
const LOCALE_MAP: Record<string, string> = {
  'es-CO': 'es-CO',
  'es-AR': 'es-AR',
  'es-MX': 'es-MX',
  'es-UY': 'es-UY',
  'fi-FI': 'fi-FI',
  'en-US': 'en-US',
  'en-AU': 'en-AU',
};

/**
 * Default locale
 */
const DEFAULT_LOCALE = 'en-US';

export type DateFormatStyle = 'short' | 'medium' | 'long';

const DATE_OPTIONS: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { month: 'short', day: 'numeric' },
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
};

/**
 * Formats an ISO date string according to the given locale and style.
 * Both locale and style are required to enforce explicit locale handling.
 *
 * @param iso - ISO 8601 date string
 * @param locale - BCP 47 locale tag (e.g. "es-CO", "en-US")
 * @param style - "short" | "medium" | "long"
 *
 * @example
 * formatDate("2026-03-31T00:00:00Z", "es-CO", "medium") // "31 mar 2026"
 * formatDate("2026-03-31T00:00:00Z", "en-US", "medium") // "Mar 31, 2026"
 * formatDate("2026-03-31T00:00:00Z", "en-AU", "medium") // "31 Mar 2026"
 */
export function formatDate(
  iso: string,
  locale: string,
  style: DateFormatStyle,
): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale;
  const options = DATE_OPTIONS[style];

  try {
    return new Intl.DateTimeFormat(resolvedLocale, options).format(
      new Date(iso),
    );
  } catch {
    return new Date(iso).toLocaleDateString(DEFAULT_LOCALE, options);
  }
}

/**
 * Formats a calendar date (no time component) without any timezone shift.
 *
 * Use this for "date-only" values like an expense's occurrence date
 * ("2026-03-31"). Parsing such a string with `new Date()` treats it as UTC
 * midnight, which `formatDate` then renders in the local timezone — shifting
 * the day backwards in negative-offset zones (e.g. "2026-03-31" → "Mar 30" in
 * America/Bogotá). This parses the Y-M-D parts into a LOCAL date so the day is
 * preserved exactly as stored.
 *
 * @param date - "YYYY-MM-DD" (a leading date part with an optional time is
 *               accepted; anything after "T" is ignored)
 * @param locale - BCP 47 locale tag
 * @param style - "short" | "medium" | "long"
 */
export function formatDateOnly(
  date: string,
  locale: string,
  style: DateFormatStyle,
): string {
  const datePart = date.split('T')[0] ?? date;
  const [year, month, day] = datePart.split('-').map(Number);

  // Unexpected shape — fall back to instant formatting rather than throwing.
  if (!year || !month || !day) {
    return formatDate(date, locale, style);
  }

  const resolvedLocale = LOCALE_MAP[locale] ?? locale;
  const options = DATE_OPTIONS[style];
  const localDate = new Date(year, month - 1, day);

  try {
    return new Intl.DateTimeFormat(resolvedLocale, options).format(localDate);
  } catch {
    return localDate.toLocaleDateString(DEFAULT_LOCALE, options);
  }
}

/**
 * Returns the user's locale from the platform.
 *
 * - Web: navigator.language (e.g. "es-CO", "en-US")
 * - Mobile: uses React Native's Platform to detect,
 *           falls back to "en-US" if unavailable
 */
export function getUserLocale(): string {
  if (isWeb() && typeof navigator !== 'undefined') {
    if (navigator.languages.length > 0) {
      return navigator.languages[0] ?? DEFAULT_LOCALE;
    }

    return navigator.language ?? DEFAULT_LOCALE;
  }

  // Mobile: React Native does not expose navigator.language natively.
  // For full mobile support, integrate expo-localization and call
  // Localization.getLocales()[0].languageTag
  // For now, fallback to en-US on mobile.
  return DEFAULT_LOCALE;
}

/**
 * Returns the supported locales list.
 */
export function getSupportedLocales(): string[] {
  return Object.keys(LOCALE_MAP);
}
