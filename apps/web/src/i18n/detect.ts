import { geoLanguageService } from '../services/geoLanguage.service';
import { countryToLanguage, resolveFromNavigator } from './languageMapping';
import { DEFAULT_LANGUAGE, SupportedLanguage } from './supportedLanguages';

export type LanguageSource = 'persisted' | 'browser' | 'ip' | 'fallback' | 'manual';

export interface DetectionResult {
  language: SupportedLanguage;
  source: Exclude<LanguageSource, 'persisted' | 'manual'>;
}

/**
 * Resolves the initial language when the user has no persisted preference.
 * Priority (persisted is handled upstream by the Redux slice):
 *
 *   1. Browser preferences (navigator.languages)
 *   2. Approximate region via IP (GeoLanguageService — optional)
 *   3. Fallback to the default language
 */
export async function detectInitialLanguage(): Promise<DetectionResult> {
  const fromBrowser = resolveFromNavigator();
  if (fromBrowser) {
    return { language: fromBrowser, source: 'browser' };
  }

  const country = await geoLanguageService.detectCountry();
  if (country) {
    return { language: countryToLanguage(country), source: 'ip' };
  }

  return { language: DEFAULT_LANGUAGE, source: 'fallback' };
}
