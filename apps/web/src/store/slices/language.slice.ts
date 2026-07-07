import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE, SupportedLanguage } from '../../i18n/supportedLanguages';
import { LanguageSource } from '../../i18n/detect';

export interface LanguageState {
  currentLanguage: SupportedLanguage;
  detectedLanguage?: SupportedLanguage;
  source: LanguageSource;
  /**
   * True once a language has been resolved (detected or chosen). Persisted, so
   * subsequent visits skip auto-detection and honour the stored preference.
   */
  resolved: boolean;
}

const initialState: LanguageState = {
  currentLanguage: DEFAULT_LANGUAGE,
  source: 'fallback',
  resolved: false,
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    /** Result of the automatic detection pipeline (first visit only). */
    languageDetected(
      state,
      action: PayloadAction<{ language: SupportedLanguage; source: LanguageSource }>,
    ) {
      state.currentLanguage = action.payload.language;
      state.detectedLanguage = action.payload.language;
      state.source = action.payload.source;
      state.resolved = true;
    },
    /** Explicit user choice — always wins and sticks. */
    languageChanged(state, action: PayloadAction<SupportedLanguage>) {
      state.currentLanguage = action.payload;
      state.source = 'manual';
      state.resolved = true;
    },
  },
});

export const { languageDetected, languageChanged } = languageSlice.actions;
export default languageSlice.reducer;
