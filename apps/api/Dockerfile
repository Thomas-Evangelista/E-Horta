# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl \
    && corepack enable
WORKDIR /repo

# ---------- deps: instala todas as dependências do workspace (cache por manifest) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build: gera client Prisma e compila o Nest ----------
FROM deps AS build
# ferramentas nativas p/ bcrypt caso não haja prebuild musl
RUN apk add --no-cache python3 make g++
COPY prisma ./prisma
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @e-horta/api exec prisma generate --schema=../../prisma/schema.prisma \
    && pnpm --filter @e-horta/api build

# ---------- prod-deps: closure de produção standalone (@e-horta/api não depende de workspaces) ----------
FROM deps AS prod-deps
COPY prisma ./prisma
RUN apk add --no-cache python3 make g++ \
    && pnpm --filter @e-horta/api deploy /out \
    && cp -r /repo/prisma /out/prisma \
    && cd /out \
    && node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=prod-deps --chown=node:node /out ./
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
# schema necessário para `prisma migrate deploy` no start
COPY --from=build --chown=node:node /repo/prisma ./prisma
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
