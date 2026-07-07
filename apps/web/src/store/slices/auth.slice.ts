import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResponse } from '../../types/auth';
import { User } from '../../types/user';

export interface AuthState {
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

/**
 * Authentication state. Persisted (token + user) so the session survives a
 * reload. The AuthProvider is the only thing that dispatches these actions.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<AuthResponse>) {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
    },
    userLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.user = null;
      state.token = null;
    },
  },
});

export const { credentialsReceived, userLoaded, loggedOut } = authSlice.actions;
export default authSlice.reducer;
