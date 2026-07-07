/**
 * The languages Noryth speaks. `code` is the i18next language key and the value
 * persisted in Redux; `label` is the human-readable endonym shown in the
 * selector (kept in each language's own tongue, not translated).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'pt-PT', label: 'Português (Portugal)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'nl-NL', label: 'Nederlands' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as SupportedLanguage[];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US';

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGE_CODES.includes(value as SupportedLanguage);
}

export function labelFor(code: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
