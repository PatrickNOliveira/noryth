import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeName } from '../../theme/themes';

export interface ThemeState {
  /**
   * `null` means "no explicit preference yet" — the app falls back to the
   * operating-system preference until the user chooses.
   */
  mode: ThemeName | null;
}

const initialState: ThemeState = {
  mode: null,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
