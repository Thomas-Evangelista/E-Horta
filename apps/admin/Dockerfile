# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat \
    && corepack enable
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY packages ./packages
COPY apps/admin ./apps/admin
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @e-horta/admin build

# ---------- runner (standalone) ----------
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3001 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/admin
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/static /app/apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public /app/apps/admin/public
USER node
EXPOSE 3001
CMD ["node", "server.js"]
