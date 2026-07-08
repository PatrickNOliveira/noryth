#!/usr/bin/env bash
#
# setup-nginx-https.sh — idempotent Nginx reverse proxy (+ optional HTTPS) for Noryth.
#
# Routes:
#   noryth.io / www.noryth.io -> http://127.0.0.1:8080  (web)
#   api.noryth.io             -> http://127.0.0.1:3000  (api, WebSocket-ready)
#   assets.noryth.io          -> http://127.0.0.1:9000  (MinIO object storage)
#
# It NEVER touches Postgres or MinIO data — it only reverse-proxies MinIO's
# S3 port so public object URLs can be served over HTTPS. Run it on the VPS (as
# root, or as a user with sudo). Safe to run repeatedly.
#
# Environment:
#   APP_DOMAIN         apex domain             (default: noryth.io)
#   API_DOMAIN         api subdomain           (default: api.noryth.io)
#   ASSETS_DOMAIN      assets/MinIO subdomain  (default: assets.noryth.io)
#   ENABLE_HTTPS       "true" to obtain/enable HTTPS (default: false)
#   LETSENCRYPT_EMAIL  email for Let's Encrypt (required when ENABLE_HTTPS=true)
#
# HTTPS is obtained via Certbot with the webroot challenge (renewal-safe; it does
# not rewrite this config). When ENABLE_HTTPS != "true" the script only sets up
# HTTP and never contacts Let's Encrypt. When ENABLE_HTTPS == "true" and the
# certificate cannot be issued (e.g. DNS not propagated), the script FAILS
# clearly so the deploy surfaces the problem.
set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:-noryth.io}"
API_DOMAIN="${API_DOMAIN:-api.noryth.io}"
ASSETS_DOMAIN="${ASSETS_DOMAIN:-assets.noryth.io}"
ENABLE_HTTPS="${ENABLE_HTTPS:-false}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

WEB_UPSTREAM="127.0.0.1:8080"
API_UPSTREAM="127.0.0.1:3000"
ASSETS_UPSTREAM="127.0.0.1:9000"
SITE_AVAILABLE="/etc/nginx/sites-available/noryth.conf"
SITE_ENABLED="/etc/nginx/sites-enabled/noryth.conf"
WEBROOT="/var/www/certbot"
CERT_LIVE="/etc/letsencrypt/live/${APP_DOMAIN}"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

log() { echo "[noryth-nginx] $*"; }

install_packages() {
  local need=""
  command -v nginx >/dev/null 2>&1 || need="$need nginx"
  command -v certbot >/dev/null 2>&1 || need="$need certbot python3-certbot-nginx"
  if [ -n "$need" ]; then
    log "installing packages:$need"
    $SUDO apt-get update -y
    # `env` so the inline var works whether or not $SUDO is set — `sudo VAR=x cmd`
    # would treat VAR=x as the command name.
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y $need
  else
    log "nginx and certbot already installed"
  fi
}

write_websocket_map() {
  # Must live in http context (conf.d/*.conf is auto-included there).
  $SUDO tee /etc/nginx/conf.d/noryth-websocket.conf >/dev/null <<'EOF'
# Maps the Upgrade header so the API can proxy WebSocket connections.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF
}

# Base HTTP config: serves the app, proxies the API, and exposes the ACME
# challenge webroot for both certificate issuance and renewal.
write_http_config() {
  $SUDO tee "$SITE_AVAILABLE" >/dev/null <<EOF
# Managed by scripts/vps/setup-nginx-https.sh — do not edit by hand.

server {
    listen 80;
    listen [::]:80;
    server_name ${APP_DOMAIN} www.${APP_DOMAIN};

    client_max_body_size 25m;

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        proxy_pass http://${WEB_UPSTREAM};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};

    client_max_body_size 25m;

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        proxy_pass http://${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${ASSETS_DOMAIN};

    # Large uploads/downloads through MinIO; stream instead of buffering.
    client_max_body_size 100m;

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        proxy_pass http://${ASSETS_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF
}

# Full config with HTTP->HTTPS redirect and TLS server blocks. Uses a single
# certificate (issued for apex + www + api + assets) referenced by all blocks.
write_https_config() {
  $SUDO tee "$SITE_AVAILABLE" >/dev/null <<EOF
# Managed by scripts/vps/setup-nginx-https.sh — do not edit by hand.

server {
    listen 80;
    listen [::]:80;
    server_name ${APP_DOMAIN} www.${APP_DOMAIN} ${API_DOMAIN} ${ASSETS_DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${APP_DOMAIN} www.${APP_DOMAIN};

    ssl_certificate ${CERT_LIVE}/fullchain.pem;
    ssl_certificate_key ${CERT_LIVE}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 25m;

    location / {
        proxy_pass http://${WEB_UPSTREAM};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${API_DOMAIN};

    ssl_certificate ${CERT_LIVE}/fullchain.pem;
    ssl_certificate_key ${CERT_LIVE}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 25m;

    location / {
        proxy_pass http://${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${ASSETS_DOMAIN};

    ssl_certificate ${CERT_LIVE}/fullchain.pem;
    ssl_certificate_key ${CERT_LIVE}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 100m;

    location / {
        proxy_pass http://${ASSETS_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF
}

enable_site_and_reload() {
  $SUDO ln -sfn "$SITE_AVAILABLE" "$SITE_ENABLED"
  $SUDO rm -f /etc/nginx/sites-enabled/default
  $SUDO nginx -t
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx
}

obtain_certificate() {
  if [ -z "$LETSENCRYPT_EMAIL" ]; then
    log "ERROR: ENABLE_HTTPS=true but LETSENCRYPT_EMAIL is empty."
    return 1
  fi
  log "requesting certificate for ${APP_DOMAIN}, www.${APP_DOMAIN}, ${API_DOMAIN}, ${ASSETS_DOMAIN}"
  # --keep-until-expiring: no-op if the cert already covers all names.
  # --expand: add newly requested names (e.g. assets) to the existing cert.
  if $SUDO certbot certonly --webroot -w "$WEBROOT" \
      --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" \
      --keep-until-expiring --expand \
      -d "$APP_DOMAIN" -d "www.$APP_DOMAIN" -d "$API_DOMAIN" -d "$ASSETS_DOMAIN" \
      --deploy-hook "systemctl reload nginx"; then
    log "certificate ready (issued/expanded/kept)"
    return 0
  fi
  return 1
}

main() {
  log "APP_DOMAIN=${APP_DOMAIN} API_DOMAIN=${API_DOMAIN} ASSETS_DOMAIN=${ASSETS_DOMAIN} ENABLE_HTTPS=${ENABLE_HTTPS}"
  install_packages
  $SUDO mkdir -p "$WEBROOT"
  write_websocket_map
  $SUDO systemctl enable --now nginx >/dev/null 2>&1 || true

  # Always ensure a working HTTP config first (needed for ACME + as fallback).
  write_http_config
  enable_site_and_reload

  if [ "$ENABLE_HTTPS" = "true" ]; then
    # Idempotent: issues, expands (to add assets) or keeps the certificate.
    if ! obtain_certificate; then
      log "ERROR: could not obtain/renew the certificate."
      log "Check DNS for ${APP_DOMAIN}, www.${APP_DOMAIN}, ${API_DOMAIN}, ${ASSETS_DOMAIN}"
      log "and that ports 80/443 are open, then re-run."
      exit 1
    fi
    write_https_config
    enable_site_and_reload
    log "HTTPS enabled (web, api, assets)."
  else
    log "ENABLE_HTTPS is not 'true' — serving HTTP only (Nginx ready for HTTPS later)."
  fi

  log "done."
}

main "$@"
