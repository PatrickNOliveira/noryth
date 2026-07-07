import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  /** Global blocking spinner flag (e.g. during auth bootstrap). */
  globalLoading: boolean;
  /** Transient, non-persisted error banner message. */
  toast: string | null;
}

const initialState: UiState = {
  globalLoading: false,
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
    showToast(state, action: PayloadAction<string>) {
      state.toast = action.payload;
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { setGlobalLoading, showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
