import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  SupportedLanguage,
} from './supportedLanguages';

/**
 * Maps loose locale strings and ISO country codes onto our supported
 * languages. Isolated here so detection logic stays out of components.
 */

const LATAM_COUNTRIES = new Set([
  'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE',
  'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO', 'CU',
]);

/** ISO 3166-1 alpha-2 country → language. Unmapped countries → en-US. */
export function countryToLanguage(country: string | null | undefined): SupportedLanguage {
  if (!country) return DEFAULT_LANGUAGE;
  const c = country.toUpperCase();
  if (c === 'BR') return 'pt-BR';
  if (c === 'PT') return 'pt-PT';
  if (c === 'US') return 'en-US';
  if (c === 'GB' || c === 'UK') return 'en-GB';
  if (c === 'ES' || LATAM_COUNTRIES.has(c)) return 'es-ES';
  if (c === 'FR') return 'fr-FR';
  if (c === 'IT') return 'it-IT';
  if (c === 'NL') return 'nl-NL';
  return DEFAULT_LANGUAGE;
}

/**
 * Maps a BCP-47-ish locale tag (e.g. "pt-BR", "es-419", "en") to a supported
 * language, or null when nothing sensible matches (so detection can fall
 * through to the next source).
 */
export function localeToLanguage(locale: string | null | undefined): SupportedLanguage | null {
  if (!locale) return null;
  const tag = locale.replace('_', '-');

  // Exact match first.
  if (isSupportedLanguage(tag)) return tag;

  const [langRaw, regionRaw] = tag.split('-');
  const lang = langRaw.toLowerCase();
  const region = regionRaw?.toUpperCase();

  switch (lang) {
    case 'en':
      return region === 'GB' || region === 'UK' ? 'en-GB' : 'en-US';
    case 'pt':
      return region === 'PT' ? 'pt-PT' : 'pt-BR';
    case 'es':
      // Only European Spanish is supported; all Spanish locales map to es-ES.
      return 'es-ES';
    case 'fr':
      return 'fr-FR';
    case 'it':
      return 'it-IT';
    case 'nl':
      return 'nl-NL';
    default:
      return null;
  }
}

/** First supported language among the browser's ordered preferences. */
export function resolveFromNavigator(): SupportedLanguage | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const candidate of candidates) {
    const mapped = localeToLanguage(candidate);
    if (mapped) return mapped;
  }
  return null;
}
