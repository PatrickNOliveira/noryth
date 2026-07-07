import { api } from './api';
import { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';
import { User } from '../types/user';

/** Thin, typed wrapper over the /auth endpoints. */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};
