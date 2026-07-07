#!/bin/sh
# Generates the runtime config consumed by the CRA app (window._env_) from the
# container's environment variables. Placed in /docker-entrypoint.d/ so the
# official nginx image runs it automatically before starting nginx.
set -e

config_file="/usr/share/nginx/html/env-config.js"

cat > "$config_file" <<EOF
window._env_ = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-}"
};
EOF

echo "noryth-web: wrote ${config_file} (REACT_APP_API_URL=${REACT_APP_API_URL:-<empty>})"
