# syntax=docker/dockerfile:1
# Multi-stage build for the Noryth web app (React CRA served by Nginx).
# Build context is the repository root (see deploy workflow / .dockerignore).

# ── Stage 1: build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/web/package.json ./
RUN npm install

COPY apps/web/ ./
# REACT_APP_API_URL is intentionally NOT baked here — it is injected at runtime
# via env-config.js (see docker-entrypoint.sh), so one image serves any env.
RUN npm run build

# ── Stage 2: runtime (Nginx) ──────────────────────────────────
FROM nginx:1.27-alpine AS runner

# SPA config with React Router fallback.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Static build output.
COPY --from=builder /app/build /usr/share/nginx/html

# Runtime env injection: the nginx image runs /docker-entrypoint.d/*.sh on boot.
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.d/40-noryth-env.sh
RUN chmod +x /docker-entrypoint.d/40-noryth-env.sh

EXPOSE 80
# Default nginx image CMD (nginx -g 'daemon off;') is used.
