import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { loggedOut } from '../store/slices/auth.slice';
import { runtimeConfig } from '../config/runtimeConfig';

/**
 * Single Axios client for the whole app. No screen or hook calls `fetch` or
 * builds its own client — everything goes through here so base URL, auth and
 * error handling live in one place.
 */
export const api = axios.create({
  baseURL: runtimeConfig.apiUrl,
});
// Note: Content-Type is intentionally NOT forced here. Axios infers it per
// request — `application/json` for plain objects, and `multipart/form-data`
// with the correct boundary for FormData (cover image uploads).

/**
 * Request interceptor: attach the persisted JWT and advertise the user's
 * language so the backend can localize responses in a future story.
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const state = store.getState();
  const token = state.auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Accept-Language'] = state.language.currentLanguage;
  return config;
});

/** Normalized error surfaced to callers. */
export interface ApiError {
  status: number;
  message: string;
}

function extractMessage(error: AxiosError): string {
  const data = error.response?.data as
    | { message?: string | string[] }
    | undefined;
  const message = data?.message;
  if (Array.isArray(message)) return message[0];
  if (typeof message === 'string') return message;
  return error.message || 'Ocorreu um erro inesperado';
}

/**
 * Response interceptor: log the user out on 401 and reshape errors into a
 * predictable {@link ApiError}.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      store.dispatch(loggedOut());
    }
    const normalized: ApiError = {
      status: error.response?.status ?? 0,
      message: extractMessage(error),
    };
    return Promise.reject(normalized);
  },
);
