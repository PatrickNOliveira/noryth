import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { languageChanged } from '../store/slices/language.slice';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/supportedLanguages';

/**
 * Single entry point for reading and changing the app language. Changing it
 * updates Redux (persisted) and i18next together, so the UI re-renders
 * immediately — no reload.
 */
export function useLanguage() {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const language = useAppSelector((s) => s.language.currentLanguage);
  const source = useAppSelector((s) => s.language.source);

  const setLanguage = useCallback(
    (code: SupportedLanguage) => {
      if (code === language) return;
      dispatch(languageChanged(code));
      void i18n.changeLanguage(code);
    },
    [dispatch, i18n, language],
  );

  return { language, source, languages: SUPPORTED_LANGUAGES, setLanguage };
}
