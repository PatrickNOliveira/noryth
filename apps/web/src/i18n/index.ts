import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES } from './supportedLanguages';

import enUS from './resources/en-US.json';
import enGB from './resources/en-GB.json';
import ptBR from './resources/pt-BR.json';
import ptPT from './resources/pt-PT.json';
import esES from './resources/es-ES.json';
import frFR from './resources/fr-FR.json';
import itIT from './resources/it-IT.json';
import nlNL from './resources/nl-NL.json';

/**
 * i18next configuration.
 *
 * A single `common` namespace for now — the resource files are already grouped
 * by area (auth, dashboard…) so they can be split into dedicated namespaces
 * later without touching call sites.
 *
 * The real source of truth for the chosen language is the Redux `language`
 * slice (persisted). The browser LanguageDetector only provides an initial
 * guess; `LanguageProvider` reconciles Redux → i18next after rehydration.
 * Detector caching is disabled so it never fights Redux Persist.
 */
export const I18N_NAMESPACE = 'common';

const resources = {
  'en-US': { common: enUS },
  'en-GB': { common: enGB },
  'pt-BR': { common: ptBR },
  'pt-PT': { common: ptPT },
  'es-ES': { common: esES },
  'fr-FR': { common: frFR },
  'it-IT': { common: itIT },
  'nl-NL': { common: nlNL },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    nonExplicitSupportedLngs: false,
    lowerCaseLng: false,
    ns: [I18N_NAMESPACE],
    defaultNS: I18N_NAMESPACE,
    detection: {
      // Redux Persist owns persistence; the detector only guesses initially.
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
