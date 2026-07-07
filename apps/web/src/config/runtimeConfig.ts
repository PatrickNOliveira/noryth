/**
 * Runtime configuration.
 *
 * CRA inlines `process.env.REACT_APP_*` at BUILD time, which is wrong for a
 * single Docker image deployed to many environments. So the container writes a
 * `window._env_` object (see the web Dockerfile entrypoint) that is read here
 * first, falling back to the build-time value and finally a dev default.
 */
interface RuntimeEnv {
  REACT_APP_API_URL?: string;
}

declare global {
  interface Window {
    _env_?: RuntimeEnv;
  }
}

function resolveApiUrl(): string {
  const runtime =
    typeof window !== 'undefined' ? window._env_?.REACT_APP_API_URL : undefined;
  if (runtime && runtime.trim().length > 0) return runtime;

  const buildTime = process.env.REACT_APP_API_URL;
  if (buildTime && buildTime.trim().length > 0) return buildTime;

  return 'http://localhost:3333/api';
}

export const runtimeConfig = {
  apiUrl: resolveApiUrl(),
};
