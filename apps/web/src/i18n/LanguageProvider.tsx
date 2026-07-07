import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { languageDetected } from '../store/slices/language.slice';
import { detectInitialLanguage } from './detect';
import { isSupportedLanguage } from './supportedLanguages';

/**
 * Reconciles the persisted Redux language with i18next and runs first-visit
 * detection.
 *
 * - Whenever `currentLanguage` changes (persist rehydrate, detection, manual
 *   choice), i18next is switched to match — this is what makes changes apply
 *   instantly, without a reload.
 * - If no language has ever been resolved (`resolved === false`), the detection
 *   pipeline (browser → IP → fallback) runs once and the result is stored.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { i18n } = useTranslation();
  const currentLanguage = useAppSelector((s) => s.language.currentLanguage);
  const resolved = useAppSelector((s) => s.language.resolved);

  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      void i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  useEffect(() => {
    // Run detection on first visit, or if a persisted language is no longer
    // supported (e.g. a language removed in a later release).
    if (resolved && isSupportedLanguage(currentLanguage)) return;
    let cancelled = false;
    detectInitialLanguage().then((result) => {
      if (!cancelled) dispatch(languageDetected(result));
    });
    return () => {
      cancelled = true;
    };
    // Run once on first mount; the guard above prevents redundant re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
