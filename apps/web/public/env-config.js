// Runtime configuration for the Noryth web app.
// This default file is overwritten at container startup from the container's
// REACT_APP_API_URL env var (see apps/web/docker-entrypoint.sh). Keeping it
// empty here lets local development fall back to the build-time .env value.
window._env_ = {
  REACT_APP_API_URL: ''
};
