# syntax=docker/dockerfile:1
# Multi-stage build for the Noryth API (NestJS).
# Build context is the repository root (see deploy workflow / .dockerignore).

# ── Stage 1: build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (incl. dev) to compile TypeScript.
COPY apps/api/package.json ./
RUN npm install

# Compile to dist/ then drop dev dependencies for a lean runtime tree.
COPY apps/api/ ./
RUN npm run build \
  && npm prune --omit=dev

# ── Stage 2: runtime ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Lets tsconfig-paths map @shared/@modules to the compiled dist/ tree.
ENV TS_NODE_PROJECT=tsconfig.prod.json

# Copy only what runtime needs.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.prod.json ./tsconfig.prod.json

EXPOSE 3000

# Resolve path aliases at runtime, then boot the compiled server.
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
