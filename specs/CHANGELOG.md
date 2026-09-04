# Changelog — E-Horta API

Registro de modificações do projeto, organizado por fase de implementação.

---

## Fase 28 (parcial) — Avaliações, notificações paginadas, dashboard com tendências e acessibilidade

**Escopo:** itens antecipados do roadmap de `specs/28-otimizacao-performance-acessibilidade.md` (seção de acessibilidade e parte de performance de UX), implementados junto com melhorias de avaliações/notificações que não estavam previamente registradas.

### Avaliações (API + Web)

- `products.service.ts`: nova `attachRatings()` — anexa média e contagem de avaliações aprovadas (`Review.status = APPROVED`) aos produtos retornados por `findAll`, `findFeatured`, `findBestSellers`, `findOnPromotion` e `findRecommendations`, usada para exibir nota nos cards de produto ([`product-card.tsx`](../apps/web/src/components/product/product-card.tsx)).
- `use-reviews.ts`: novos hooks `useProductReviews` (lista + `ReviewSummaryDTO` com distribuição de notas) e `useMyReviews`/`useDeleteReview` (minhas avaliações, com exclusão); novo componente [`review-summary.tsx`](../apps/web/src/components/product/review-summary.tsx) na página de produto.

### Notificações vinculadas a pedidos e paginação

- Migration `20260904000916_add_notification_order_id`: coluna `order_id` (nullable, `ON DELETE SET NULL`) em `notifications`, permitindo que uma notificação linke para o pedido de origem.
- `notifications.service.ts`/`notifications.processor.ts`: passam a gravar `orderId` ao notificar eventos de pedido.
- `use-notifications.ts`: `useNotifications` migrado de `useQuery` para `useInfiniteQuery` (paginação de 20 em 20) na página [`notificacoes`](../apps/web/src/app/(store)/notificacoes/page.tsx).

### Dashboard admin — tendências e pedidos recentes

- `admin.service.ts`/`admin-dashboard.controller.ts`: novos endpoints `GET /admin/dashboard/trends` (série diária de pedidos/receita, 1-90 dias) e `GET /admin/dashboard/recent-orders` (últimos pedidos).
- Novo componente [`dashboard-trend-chart.tsx`](../apps/web/src/components/admin/dashboard-trend-chart.tsx) (biblioteca `recharts`, nova dependência de `apps/web`) exibido em `/admin`.

### Acessibilidade (spec 28) e PWA

- Novo [`skip-link.tsx`](../apps/web/src/components/ui/skip-link.tsx) ("Pular para o conteúdo") no layout da loja e do admin, com `id="conteudo-principal"` no `<main>` de ambos.
- `aria-current`/`aria-label` adicionados na navegação do admin (`sidebar.tsx`, `pagination.tsx`) e no componente de paginação compartilhado ([`ui/pagination.tsx`](../apps/web/src/components/ui/pagination.tsx), que virou `<nav aria-label="Paginação">`).
- Novo [`ConfirmDialog`](../apps/web/src/components/admin/ui/confirm-dialog.tsx) substitui `window.confirm()` nas exclusões do admin (categorias, produtos, promoções) — mais acessível e consistente com o design system.
- Novo [`install-prompt.tsx`](../apps/web/src/components/pwa/install-prompt.tsx): banner de instalação do PWA a partir do evento `beforeinstallprompt`.
- Nova página de listagem [`(store)/produtos`](../apps/web/src/app/(store)/produtos/produtos-content.tsx) com paginação/filtros usando os novos componentes `ui/pagination` e `ui/select`.

### Verificação

- `pnpm lint` / `pnpm typecheck`: sem erros. Ver `specs/28-otimizacao-performance-acessibilidade.md` para os itens restantes do roadmap (cache Redis, rate limiting, otimização de imagens, etc.), ainda não iniciados.

---

## Fase 27 — Fluxo de senha completo + gestão de status de usuários no Admin

**Escopo:** completar o ciclo de senha (Recuperar/Redefinir via e-mail + Alterar senha) e adicionar a gestão de status de clientes no painel administrativo.

### Recuperação e redefinição de senha (API)

- Novo modelo Prisma `PasswordResetToken` (`prisma/schema.prisma`): campos `id`, `userId`, `tokenHash` (SHA-256), `expiresAt`, `usedAt`, `createdAt`; índice em `userId`; relação `onDelete: Cascade` com `User`. Migration `20260903193944_y` (nome genérico por engano no `prisma migrate dev --name`; conteúdo é a criação de `password_reset_tokens`).
- `apps/api/src/modules/auth/auth.validation.ts`: adicionado `changePasswordSchema` (`currentPassword` ≥ 1, `newPassword` 8-128, `confirmPassword` + refines de correspondência e de diferença da atual) e tipos `ForgotPasswordDto`/`ResetPasswordDto`/`ChangePasswordDto`.
- `apps/api/src/modules/auth/auth.service.ts`:
  - `forgotPassword(dto)`: sucesso silencioso para conta inexistente/inativa (anti-enumeração); token `randomBytes(32)` hash em SHA-256, inserido com expiração de 1h via `$executeRaw`; envia e-mail com link `${SITE_URL}/redefinir-senha?token=...`.
  - `resetPassword(dto)`: valida token válido/não usado; em transação atualiza `password_hash`, marca token usado e revoga `refresh_tokens`.
  - `changePassword(userId, dto)`: valida senha atual (bcrypt), atualiza `password_hash`, revoga `refresh_tokens` e audita `PASSWORD_CHANGED`.
- `apps/api/src/modules/auth/auth.controller.ts`: 3 novos endpoints — `POST /auth/forgot-password` (público), `POST /auth/reset-password` (público), `POST /auth/change-password` (autenticado).
- `config.validation.ts` + `.env`/`.env.example`: nova variável `SITE_URL` (default `http://localhost:3000`) para montar o link de redefinição.
- `notifications.module.ts`: passou a exportar `MailerService` (necessário para injeção no `AuthService`).

### Recuperação/redefinição na loja (web)

- `(store)/esqueci-senha/`: formulário de e-mail → tela de confirmação ("Se este e-mail estiver cadastrado...") com link de volta ao login.
- `(store)/redefinir-senha/`: lê `?token=`, campos Nova senha + Confirmação com `PasswordStrengthMeter`; sucesso redireciona para `/login`; token ausente mostra "Solicitar novo link".
- Link "Esqueci minha senha?" adicionado em `(store)/login/login-content.tsx`.

### Alterar senha na conta (web)

- `hooks/use-account.ts`: novo `useChangePassword()` (POST `/auth/change-password`).
- `(store)/conta/page.tsx`: nova seção colapsável "Alterar senha" (senha atual + nova + confirmação com `PasswordStrengthMeter`); ao salvar, limpa a sessão na store e informa para logar novamente.

### Gestão de status no Admin (web)

- `(admin)/usuarios/page.tsx`: coluna "Ações" com botão "Gerenciar" (apenas `role = CUSTOMER`), modal de confirmação com ações Ativar/Inativar/Bloquear conforme o status atual, e `useMutation` para `PATCH /admin/users/:id/status` com invalidação de `queryKeys.users(...)` e toast de sucesso/erro. Os endpoints de lista e status já existiam na API (`admin-users.controller.ts` + `users.service.findAllForAdmin`/`updateStatusForAdmin`).

### Verificação

- `pnpm lint`: 0 erros. `pnpm typecheck` (api + web): OK. `pnpm test` — API: 226/226, Web (vitest): 118/118.

---

## Fase 26 — Fusão do Admin no Web (frontend único) *(atual)*

**Escopo:** eliminar `apps/admin` como app Next.js separado — motivado pela
sobrecarga de RAM ao rodar 2 servidores Next.js + API simultaneamente num
notebook com 8GB. Detalhe completo da decisão em `AGENTS.md`
("Solicitações de Alteração", 2026-09-01).

- `apps/admin` removido; suas rotas passaram a viver em
  `apps/web/src/app/admin/**` (`/admin`, `/admin/login`, `/admin/produtos`,
  `/admin/pedidos`, `/admin/categorias`, `/admin/estoque`, `/admin/promocoes`,
  `/admin/usuarios`, `/admin/avaliacoes`) — prefixo `/admin` evita colisão com
  as rotas de storefront de mesmo nome.
- Rotas de storefront movidas para o route group `apps/web/src/app/(store)/**`;
  layout raiz virou minimalista (`html`/`body`/Providers) e cada seção
  (`(store)` e `admin`) ganhou layout/`ToastProvider` próprios.
- `stores/session.ts`, `lib/api-client.ts` (com `apiUpload` portado) e
  `lib/errors.ts` unificados na versão do `web` — o `admin` tinha uma classe
  `ApiError` duplicada e códigos de erro amigável que não batiam com os
  retornados pela API (bug pré-existente, corrigido na fusão).
- `AdminShell` passou a exigir `user.role === 'ADMIN'` (antes só checava se
  havia *algum* usuário logado — falha que a fusão introduziria, já que
  storefront e admin agora compartilham a mesma sessão).
- Componentes e libs com identidade visual própria do admin mantidos
  namespaced em `components/admin/**` e `lib/admin/**` (sem merge forçado com
  os componentes do storefront).
- `formatNumber`/`formatDateTime` incorporados a `lib/format.ts`; scripts
  `dev:admin`/`build:admin` e o step "Build Admin" do CI removidos.
- Docs atualizadas: `README.md`, `specs/17-admin.md`, `specs/02-arquitetura-projeto.md`,
  `specs/18-frontend.md`.
- **Verificação:** `pnpm typecheck`, `pnpm lint` e `pnpm test` (web) sem erros —
  19 arquivos de teste, 118/118 testes passando; smoke test do dev server
  confirmando `/`, `/admin`, `/admin/login` e `/admin/produtos` sem colisão de
  rota.

---

## Fase 25 — Observabilidade

**Escopo:** instrumentação do backend (item planejado na Fase 24): correlação de
requisições, logging estruturado, métricas no formato Prometheus e healthcheck
por dependência. Sem dependências novas (registry próprio + `ioredis` já
utilizado).

### Novo módulo `observability` (`apps/api/src/modules/observability/`)

- **Request-id** (`request-id.middleware.ts` + `request-context.ts`):
  - Middleware global: aceita `X-Request-Id` do cliente (primeiro segmento) ou
    gera UUID, devolve o mesmo valor no header de resposta e publica o contexto
    (`requestId`, `ip`, `method`, `url`) via `AsyncLocalStorage` por toda a
    requisição.
- **Logging estruturado** (`structured.logger.ts` + `logging.interceptor.ts`):
  - Em produção (`NODE_ENV=production`) cada linha de log é um JSON com
    `{ level, timestamp, pid, context, requestId, message }` no stdout; em dev,
    texto legível.
  - Interceptor global: uma linha por requisição com `requestId`, método, rota,
    status, duração (ms) e `userId` quando autenticado (capturado nos eventos
    `finish`/`close` da resposta, refletindo o status final incl. erros).
- **Métricas** (`metrics.service.ts` + `metrics.controller.ts`) — registry
  próprio no formato de exposição do Prometheus (text 0.0.4), sem libs externas:
  - `GET /api/v1/metrics` (público): `http_requests_total{method,route,status}`
    e histograma `http_request_duration_seconds{method}`; o scrape do
    `/metrics` **não** alimenta as próprias métricas.
  - Gauges de processo: `nodejs_heap_bytes`, `nodejs_heap_total_bytes`,
    `nodejs_rss_bytes`, `nodejs_uptime_seconds`, `process_start_time_seconds`.
  - Gauges de dependência: `ehorta_database_up` e `ehorta_redis_up`
    (atualizados pelo healthcheck).

### Healthcheck por dependência

- `health.service.ts` agora inclui **Redis** (cliente descartável de
  `checkRedis`, com `lazyConnect`, timeout curto e desconexão garantida) além de
  banco e memória; `/health` retorna `checks.database|redis|memory` com latência
  e `/ready` verifica banco **e** Redis.

### Wiring

- `observability.module.ts` registra o middleware e o interceptor globalmente
  (`APP_INTERCEPTOR`) e exporta `MetricsService` (consumido pelo `HealthModule`).
- `main.ts` aplica `app.useLogger(new StructuredLogger(...))` — JSON em
  produção, texto em dev.

### Testes

- Novos: `metrics.service.spec.ts`, `logging.interceptor.spec.ts`,
  `request-id.middleware.spec.ts`, `structured.logger.spec.ts`,
  `health.service.spec.ts` (com `ioredis` mockado).
- Integração (`test/app.e2e-spec.ts`): bloco **Saúde e observabilidade** —
  `/health` com redis, `/metrics` no formato Prometheus sem autenticação,
  propagação e geração de `X-Request-Id`.
- Suíte final: lint 0 erros, typecheck ok nos 3 workspaces, 29 testes de
  integração + 218 testes unitários passando, `nest build` ok.

---

## Fase 24 — Auditoria Completa e Bloqueio de Usuário

**Escopo:** fechar as lacunas de auditoria (spec `24-regras-negocio-fluxos.md` §47
e `e-horta.md` §47) e adicionar o gerenciamento de status de usuários no admin.

### `AuditService` + `AuditModule` (novo módulo `@Global()`)

- `apps/api/src/modules/audit/audit.service.ts` — registro centralizado de auditoria:
  - `record({ action, entity, entityId, metadata, userId, ip, userAgent, db? })`.
  - Aceita um cliente de transação (`db`) para participar do mesmo commit da mutação.
  - `findAll({ page, limit, action })` — listagem paginada para o painel admin
    (com o e-mail do usuário via relação com `User`).
- `AuditContext` (param decorator) em
  `apps/api/src/common/decorators/audit-context.decorator.ts` — extrai do request o
  `userId` (autenticado), `ip` e `user-agent`, agora **populados** nos registros
  (antes as colunas `ip`/`user_agent` nunca eram preenchidas).
- Registrado em `app.module.ts` e exportado em `common/decorators/index.ts`.

### Novos registros de auditoria (spec §47)

| Ação | Onde | Detalhes |
|------|------|----------|
| `PRODUCT_CREATED` | `products.service.ts` `create` | nome, sku, preço, ativo |
| `PRODUCT_UPDATED` | `products.service.ts` `update` | campos alterados |
| `PRICE_CHANGED` | `products.service.ts` `update` | `from`/`to` (só se o preço mudou) |
| `STOCK_CHANGED` | `inventory.service.ts` `updateStock` | quantidade de/para, mínimo |
| `PROMOTION_CREATED` | `promotions.service.ts` `createPromotion` | código, nome, tipo, valor |
| `PROMOTION_UPDATED` | `promotions.service.ts` `updatePromotion` | estado `from`/`to` (inclui `isActive`) |
| `USER_BLOCKED` / `USER_ACTIVATED` / `USER_INACTIVATED` | `users.service.ts` `updateStatusForAdmin` | de/para, e-mail |
| `USER_DELETED` (refatorado) | `users.service.ts` `deleteAccount` | agora com contexto `ip`/`userAgent` |
| `USER_CREATED` | `auth.service.ts` `register` | e-mail e perfil do novo usuário |
| `ORDER_STATUS_CHANGED` | `orders.service.ts` `updateStatusForAdmin` | `from`/`to`, motivo; via transação (`db`) |

Os controllers admin e o controller público de produtos/inventário passam o
`AuditContext()` do request para os services (antes nenhuma ação de produto,
estoque ou promoção era auditada). As transições de pedido e o novo registro de
usuário também publicam eventos de auditoria com `ip`/`userAgent`.

### Listagem de auditoria (novo endpoint)

- `GET /api/v1/admin/audit` (`admin-audit.controller.ts`) — listagem paginada
  para o painel admin, disponível somente para `ADMIN`.
  - Query validada por `auditQuerySchema` (`audit.validation.ts`):
    `page` (padrão 1), `limit` (padrão 50, máx. 100) e `action` (filtro opcional).
  - Devolve envelope `{ data, meta, error }` com o e-mail do responsável em cada
    registro.

### Bloqueio/status de usuário no admin (novo endpoint)

- `PATCH /api/v1/admin/users/:id/status` (`admin-users.controller.ts`) — ativa,
  inativa ou bloqueia um usuário `CUSTOMER`.
  - Body validado por `updateUserStatusSchema` (`users.validation.ts`).
  - `users.service.ts updateStatusForAdmin`:
    - impede alterar o próprio usuário ou perfis `ADMIN`/`OPERATOR`;
    - grava o registro de auditoria correspondente.
    - disponível somente para `ADMIN` (guard `@Roles('ADMIN')`).

### Observações

- Fase concluída. Itens planejados para a próxima rodada (fora do escopo atual):
  observabilidade, promoções no admin, filtros/paginação extras, PWA e
  acessibilidade.
- Testes atualizados/adicionados para o novo construtor com `AuditService`:
  - atualizados: `inventory.service.spec.ts`, `promotions.service.spec.ts`,
    `promotions.service.admin.spec.ts`, `orders.service.spec.ts`,
    `auth.service.spec.ts`;
  - novos: `audit.service.spec.ts` e `users.service.spec.ts`;
  - integração (`test/app.e2e-spec.ts`): bloco novo cobrindo status de usuário
    e listagem/filtro da auditoria, incluindo o impedimento de login de usuário
    bloqueado e o registro com `ip`/`user-agent`.
- Suíte final: lint 0 erros, typecheck ok nos 3 workspaces, 25 testes de
  integração + 196 testes unitários passando.

---

## Fase 23 — CI/CD e Documentação

**Escopo:** implementar a pipeline de CI/CD (spec `23-ci-cd-documentacao.md`) e a
documentação técnica do projeto (README + `docs/`).

### CI/CD (`.github/workflows/ci.yml`)

Pipeline conforme o spec:

```
install → lint → typecheck → unit tests → integration tests → build → e2e
```

Jobs:

- **`quality`** — instala dependências, gera o Prisma Client, roda `lint`,
  `typecheck` e os testes unitários de todos os workspaces, e faz o `build` da
  API, do Web e do Admin.
- **`integration`** — provisiona o **PostgreSQL** (banco `e_horta_test`) e o
  **Redis** como serviços do GitHub Actions e roda os testes de integração da
  API (`apps/api/test:e2e`), respeitando a URL de teste via variáveis de
  ambiente.
- **`e2e`** — instala o Chromium do Playwright, prepara o `.env` a partir do
  `.env.example` e roda os cenários E2E completos (sobe a stack via Docker
  Compose dentro do runner).

Regras de aprovação: um PR **não** é aprovado se lint, TypeScript, testes ou
build falharem.

### Documentação

- `README.md` — revisado com a seção de documentação.
- `docs/architecture.md` — arquitetura do monorepo, backend e frontend.
- `docs/api.md` — endpoints REST por módulo + nota sobre o Swagger.
- `docs/database.md` — schema Prisma, enums e relacionamentos.
- `docs/deployment.md` — deploy via Docker Compose e variáveis de ambiente.
- `docs/business-rules.md` — regras de negócio (Fase 24) e fluxos.

### Observações

- O **Swagger** (`/api/docs`) e o endpoint de sandbox de pagamento já estavam
  disponíveis em desenvolvimento e seguem **desabilitados em produção**
  (`NODE_ENV=production` e `ENABLE_SANDBOX_SIMULATE=false`).
- O `.env` de testes (`apps/api/test/.env`) permanece **gitignored**; no CI, as
  variáveis de integração são fornecidas via ambiente do workflow.

---

## Fase 22.2 — Testes: unidade/integração da API, frontend e E2E

**Escopo:** preencher as lacunas de cobertura da Fase 22 (spec `22-testes.md`): testes
unitários da API, testes de integração (Supertest + banco isolado), testes frontend restantes
e cenários E2E Playwright.

### API — Testes unitários (4 arquivos novos)

- `common/utils/order-transitions.spec.ts` (7) — máquina de estados do pedido.
- `modules/auth/auth.service.spec.ts` (14) — register/login/refresh/logout (bcrypt mockado).
- `modules/inventory/inventory.service.spec.ts` (13) — CRUD, low-stock, reserva (overselling),
  release (`GREATEST(0,...)`) e confirmReductions — chamadas tipadas com `TransactionClient`.
- `common/guards/roles.guard.spec.ts` (5) — autorização por `@Roles`.

### API — Testes de integração (Supertest + banco isolado)

- `test/app.e2e-spec.ts` — 19 testes E2E da API cobrindo: auth (register/login/logout/refresh),
  produtos, carrinho (inclusive `Estoque insuficiente`), checkout completo (endereço → frete →
  pedido → baixa de estoque), aprovação sandbox PIX e autorização admin.
- `test/test-db.setup.ts` — helpers: `migrateTestDatabase`, `seedTestDatabase` (determinístico),
  `cleanTestDatabase` e `getTestPrisma`.
- **Banco de testes isolado `e_horta_test`** — o `ConfigModule` agora, quando `NODE_ENV=test`,
  carrega apenas `test/.env` (banco/secret/sandbox de teste), ignorando o `.env` compartilhado.
- `ENABLE_SANDBOX_SIMULATE` adicionado ao schema de validação de config (antes era removido ao
  validar, desabilitando o endpoint sandbox).

### Frontend — Unit tests restantes (Vitest)

- `apps/web/src/lib/__tests__/api-client.test.ts` (10) — headers, query, serialização de body,
  refresh em 401, `onSessionExpired`, erros de rede/envelope.
- `apps/web/src/lib/__tests__/seo.test.ts` (15) — `siteUrl`, `toSeoNumber`, `buildProductJsonLd`
  e os fetchers (slug, resumo de avaliações, categorias, sitemap).
- `apps/admin/src/lib/__tests__/api-client.test.ts` (9) — GET/POST, query, refresh/retry,
  `SESSION_EXPIRED`, erros (`MALFORMED`, envelope) e `apiUpload` (FormData).

### E2E — Cenários Playwright adicionais

- `e2e/negativos.spec.ts` + `e2e/fixtures.ts`:
  - **Pagamento recusado** — fluxo completo via API e simulate `outcome: 'failed'`: pedido
    permanece `PENDING_PAYMENT` e pagamento `FAILED`.
  - **Produto indisponível** — zera o estoque via API admin (login `admin@ehorta.com.br`) e valida
    na UI: "Indisponível no momento" e botão de adicionar desabilitado (estoque restaurado ao fim).
  - helpers: `loginAsAdmin`, `registerViaApi`, `purchaseViaApi`, `fetchFirstProduct` (com `slug`).

### Verificação

- Lint 0 erros · typecheck limpo (api/web/admin) · E2E com typecheck limpo e 7/7 cenários descobertos
- Testes: API **179** unit + **19** integração · Web **94** · Admin **36** · E2E **7** cenários
- Dados de teste `e2e-*` removidos do banco principal `e_horta` (poluição dos primeiros executes)

---

## Fase 22.1 — Testes de Unidade no Frontend + consolidação

**Escopo:** spec `22-testes.md` no frontend (Vitest + React Testing Library) e reestruturação
do Docker já iniciadas; consolidação do trabalho em andamento.

### Frontend (web e admin) — Vitest + RTL

- **Setup compartilhado** por app: `vitest.config.ts` (jsdom, alias `@`, TZ UTC, `css:false`)
  e `vitest.setup.ts` (jest-dom, `cleanup`, mock de `matchMedia`, `requestAnimationFrame` e
  `framer-motion` para renderização determinística em jsdom, respeitando `prefers-reduced-motion`)
- Scripts `test` / `test:watch` adicionados aos dois `package.json`
- **Web — 69 testes** em 12 arquivos: Button, Badge, PasswordStrengthMeter, ProductCard,
  ToastProvider, e libs puras (form-errors, format, order-status, password-strength, cart-token,
  errors, api-types)
- **Admin — 27 testes** em 6 arquivos: Pagination, EmptyState, e libs (constants, errors, format,
  zod-helpers)
- **Playwright E2E** (`e2e/`, spec `22`): fluxo principal de compra (`compra.spec.ts`) e cenários
  negativos (`negativos.spec.ts`), com `fixtures.ts` (registro, endereço, produto) e
  `playwright.config.ts` (workers 1, retries 1, baseURL web, webServer sobe a stack com
  `db:deploy` + `db:seed`)
- Scripts/artefatos: `pnpm test` (roda testes de todos os workspaces), `pnpm test:e2e`,
  `playwright-report/` ignorado

### Docker (refino da Fase 16)

- **Imagem `admin`** (`apps/admin/Dockerfile`) no mesmo padrão standalone do web (porta 3001)
- `docker-compose.yml` agora com **serviço `admin`**; stack completa sobe com um único
  `docker compose up -d` (profile `app` removido)
- Portas expostas apenas em **`127.0.0.1`** (postgres, redis, minio, api, web, admin)
- `restart: unless-stopped` removido (amigável ao desenvolvimento local)
- `ENABLE_SANDBOX_SIMULATE` substitui a lógica anterior do sandbox de pagamento — o endpoint
  `POST /payments/sandbox/:id/simulate` fica habilitado só quando `true` (em vez de depender do
  `NODE_ENV`)
- Scripts raiz: `docker:up` (derruba e reconstrói a stack completa), `docker:down`, `docker:logs`;
  `db:deploy`; `dev:all` (hot-reload dos 3 apps)

### Verificação

- Migration `20260826184841_init` valida o schema: remove índices únicos redundantes de `reviews`
  (`reviews_user_id_idx`, `reviews_product_id_idx`) — `migrate deploy` limpo, sem drift
- Artefato de build `apps/admin/tsconfig.tsbuildinfo` removido do rastreamento (`*.tsbuildinfo`
  no `.gitignore`)
- Lint 0 erros (82 warnings pré-existentes) · typecheck limpo (api/web/admin)
- Testes: API **135/135** · Web **69/69** · Admin **27/27**

---

## Fase 16 — Infraestrutura: Docker da Aplicação *(atual)*

**Escopo:** spec `21-infraestrutura.md` (seção Docker). Imagens de produção da api e web orquestradas pelo compose.

### Imagens

- **`apps/api/Dockerfile`** multi-stage: `deps` (instala workspace por manifest, cache de layer) → `build` (`prisma generate` + `nest build`) → `prod-deps` (closure de produção via `pnpm deploy` + regenerate do client) → `runner` alpine non-root
  - Migrações aplicadas automaticamente no boot (`prisma migrate deploy && node dist/main.js`)
  - HEALTHCHECK em `/api/v1/health`; toolchain nativa (bcrypt) apenas nos stages de build
- **`apps/web/Dockerfile`**: `output: 'standalone'`; `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL` como build args; runner non-root com standalone + static + public

### Compose

- Serviços `api`, `web` e `admin` sob **profile `app`** — `docker compose up -d` trazendo só a infra; stack completa com `--profile app`
  - *(posterior: profile removido — um único `docker compose up -d` sobe a stack completa, sem `restart: unless-stopped` em desenvolvimento)*
- Scripts raiz novos: `docker:up` (encerra containers existentes e reconstrói a stack), `docker:down`, `docker:logs`
- `.dockerignore` na raiz (node_modules, .next, dist, .env, logs)

### Fetch server-side

- **Nova env `API_SERVER_URL`**: fetches de SSR/metadata/sitemap podem mirar a URL interna da rede Docker (`http://api:8080/api/v1`) em vez da pública — corrigia "Produto não encontrado" dentro do container
- `prisma` movido para dependencies da api + script `start:migrate`

### Verificação

- Build das duas imagens ok; stack completa no ar (api healthy)
- Smoke pelos containers: health, home com hero SSR, `/produtos/mandioca` com `<title>`/canonical, `/categorias/verduras`, login admin E2E
- Dev local restaurado após o teste (`compose down` derruba o projeto inteiro — infra recriada)

---

## Melhorias de Interface *(pós-Fase 15)*

**Escopo:** revisão geral de UX/acessibilidade sem quebras.

- **Bottom nav mobile:** item "Buscar" trocado por "Carrinho" — em <640px o carrinho estava inacessível; busca permanece no header
- **Hero banner:** entrada animada + cesta flutuante + halos decorativos (client component, respeita `prefers-reduced-motion`)
- **Carrossel de produtos:** setas desabilitam nos extremos da rolagem
- **Chips de categoria:** fade gradiente indicando rolagem horizontal
- **Carrinho:** estado de erro com botão "Tentar novamente"
- **Notificações:** tempo relativo ("agora", "há 5 min", "ontem") via `formatRelativeTime`
- **Acessibilidade:** removido `focus-visible:outline-none` do link-imagem do ProductCard; toast fecha com ícone `X`
- **CSS global:** `::selection` temática e tap-highlight transparente; skeleton de produto mais fiel ao card
- Verificação: lint 0 erros · typecheck limpo · build ok · 12 rotas respondendo 200

---

## Fase 15 — SEO, Performance e PWA

**Escopo:** spec `20-performance-seo.md` no frontend. Páginas públicas indexáveis, dados estruturados e base PWA.

### SEO

- **Página de produto** (`/produtos/[slug]`) convertida para Server Component com `generateMetadata`:
  - `title`, `description`, `canonical`, Open Graph com imagem do produto
  - UI interativa extraída para `produto-content.tsx` (client island)
  - **JSON-LD `Product`**: preço BRL, disponibilidade (estoque − reservado), `aggregateRating` via endpoint de resumo de avaliações
- **Página de categoria** (`/categorias/[slug]`) no mesmo padrão (`categoria-content.tsx`)
- **Layouts de rota** com metadata estática: carrinho, checkout, conta, pedidos e notificações marcados `noindex`; categorias indexável com canonical
- **`robots.ts`**: bloqueia áreas privadas e busca; aponta para o sitemap
- **`sitemap.ts`** dinâmico: home + categorias + produtos (revalida a cada 1h)
- Layout raiz com `metadataBase`, Open Graph padrão (`pt_BR`) e `applicationName`

### PWA

- **`manifest.ts`**: nome, cores do tema, display standalone, ícone SVG
- Ícone do app em `app/icon.svg` (favicon automático) e `public/icons/icon.svg`
- Service worker/offline deliberadamente adiado conforme a spec ("arquitetura não deve impedir essa evolução")

### Performance

- Imagem principal do produto com `fetchPriority="high"`; demais imagens já usavam `loading="lazy"`
- Fetches server-side de metadata com `revalidate` (60s produto / 300s categoria e sitemap)

### Variável nova

- `NEXT_PUBLIC_SITE_URL` — URL canônica do frontend (metadataBase, sitemap, robots)

### Verificação

- Lint 0 erros · typecheck limpo · build ok
- Smoke: HTML servido contém `<title>`, OG tags e JSON-LD do produto; `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` respondem 200

---

## Fase 14 — Detalhe do Pedido, Avaliações e Notificações

**Escopo:** specs `11-pedidos.md`, `15-avaliacoes.md`, `16-notificacoes.md` no frontend.

### Pedido

- **`/pedidos/[id]`**: linha do tempo animada (realizado → pago → preparo → rota → entregue), banner próprio para cancelados (data + motivo), itens com link para o produto, resumo financeiro, endereço snapshot, pagamento, observações
- Ações: **cancelar** (formulário com motivo opcional; apenas quando a API permite) e **repetir pedido** (toast com adicionados/indisponíveis + redirect ao carrinho)
- Correção: cards da lista `/pedidos` apontavam para a própria página; agora abrem o detalhe
- Labels de status centralizados em `lib/order-status.ts` (incluía status inexistentes como `PENDING`)

### Avaliações

- `ReviewForm` na página do produto: seletor de estrelas (1–5) com labels, comentário opcional, estado de sucesso
- Gate de compra respeitado (`REVIEW_PURCHASE_REQUIRED` → mensagem amigável); duplicada bloqueada pela API
- Pedidos entregues exibem "Avaliar" por item com deep-link `?avaliar=1#avaliar`
- CTA "Entre na sua conta" com redirect de volta ao produto

### Notificações

- Sino no header com badge de não lidas (polling 60s, apenas autenticado)
- **`/notificacoes`**: lista com destaque para não lidas, marcar uma/todas como lidas, empty state
- Hooks novos: `use-orders.ts`, `use-notifications.ts`, `use-reviews.ts`

### API

- Itens de `GET /orders/:id` (cliente e admin) passam a incluir `slug` do produto
- **Bugfix pré-existente:** transições admin não sincronizavam `Order.shippingStatus` (ficava `PENDING` mesmo entregue); agora atualizado na mesma transação conforme mapa de status

### Verificação

- Lint 0 erros · typecheck limpo · build ok · Testes: **135/135**
- E2E real: cadastro → carrinho → frete → checkout PIX → pagamento aprovado → review criada (duplicada bloqueada) → 3 notificações geradas → read/read-all → cancelamento pós-pagamento bloqueado → rotas web 200
- Sync de `shippingStatus` validado: `PROCESSING` no preparo, `SHIPPED` em rota

---

## Fase 13 — Conta Completa e Correções de UX

**Motivação:** relatos do usuário — pedidos não abriam, menu mobile ainda rolava, categorias feia. Continuação: gestão de perfil e endereços (spec `06-usuarios-enderecos.md` no frontend).

### Correções

- **Bottom nav**: agora renderizado via **portal em `document.body`** — imune a qualquer ancestral que crie containing block; indicador de aba ativa no topo
- **/pedidos**: estado de erro visível com botão "Tentar novamente" (antes erro virava "Nenhum pedido" silenciosamente); `refetchOnMount`; status `PAYMENT_APPROVED` traduzido; ícones por status
- **Categorias redesenhada**: header com emoji, cards coloridos por categoria com emoji mapeado, hover lift + escala no ícone, seta de ação, entrada em cascata animada, grid responsivo 2→4 colunas
- **form-errors**: CONFLICT de telefone agora mapeia para o campo phone (não email)

### Funcionalidades (Conta)

- **Perfil editável**: nome e telefone via `PATCH /users/me`, formulário inline colapsável, sessão sincronizada (`setUser`)
- **Meus endereços**: listar, adicionar (formulário compartilhado `AddressForm`), remover, definir padrão (estrela) — badge "Padrão" destacado
- Hooks novos (`use-account.ts`): updateProfile, deleteAddress, setDefaultAddress
- Checkout reutiliza `AddressForm` extraído

### Verificação

- **Não funcionais**: lint 0 erros (82 warnings pré-existentes) · typecheck limpo · build ok
- **Funcionais**: E2E 14/14 PASS — cadastro+telefone, renomear perfil, atualizar telefone, CRUD de 3 endereços, padrão único transferido corretamente, remoção, 4 rotas web 200
- Descoberta de teste: API bloqueia telefone duplicado (CONFLICT) — comportamento correto que revelou o bug de mapeamento corrigido acima

---

## Fase 12 — Checkout no Frontend

**Escopo:** specs `10-checkout.md` (frontend), `13-entrega.md`, `12-pagamentos.md`; ajustes de UX mobile e textos

### Correções solicitadas pelo usuário

- **Bottom nav mobile**: posição fixa blindada via `style` inline (à prova de falha de CSS) + `env(safe-area-inset-bottom)` para iPhone
- **Textos**: removido dev-speak do usuário final ("chega na próxima fase"); "Voltar para a home"→"Voltar ao início"; `/pedidos` com copy real

### Funcionalidades

- Página `/checkout` (protegida, redirect com `?redirect=`): fluxo em 4 seções numeradas
  1. **Endereço**: radio cards + formulário de novo endereço colapsável animado (RHF+Zod)
  2. **Entrega**: quote automática ao selecionar endereço (`POST /shipping/quote`), opções com prazo/valor, grátis destacado
  3. **Pagamento**: PIX/Cartão/Dinheiro + observações (500 chars)
  4. **Resumo**: cupom aplicar/remover (`/cart/coupon`), subtotal/desconto/frete — frontend nunca calcula total
- Confirmação animada: nº do pedido, total da API, status do pagamento; PIX pendente exibe código copiável + botão "Já paguei" (sandbox simulate)
- Hooks novos (`use-checkout.ts`): addresses, shipping quote, coupon, checkout, payments sandbox/view
- `/pedidos` real: lista pedidos (`GET /orders`) com status traduzido, entrada animada em cascata; vazio mantém empty state

### Verificação

- **Não funcionais**: lint 0 erros (82 warnings pré-existentes) · typecheck limpo · build ok · ESLint dedicado nos arquivos novos: limpo
- **Funcionais**: E2E 24/24 PASS — admin cria cupom 10%, cadastro+endereço, carrinho anônimo com merge no login, cupom aplicado, frete 2 opções, checkout EXPRESS/PIX, conferência subtotal−desconto+frete=total pela API (16,47−1,65+14,90=29,72), pagamento sandbox aprovado, `GET /orders` lista pedido, carrinho esvaziado pós-checkout, negativos (endereço inexistente→erro, quote sem auth→401), rotas web 200

---

## Fase 11.1 — Fluxo de Cadastro/Login (hotfix + UX)

**Motivação:** bug reportado pelo usuário — cadastro não concluía; sem indicador de força de senha; fluxo de usuário inexistente.

### Correções

- **Bug crítico**: formulário de cadastro não enviava `confirmPassword` (obrigatório na API) → 400 em todo cadastro. Agora enviado e validado client-side ("Senhas não conferem")
- `registerRequest` aceita `confirmPassword`; guards `/conta` e `/pedidos` redirecionam de volta com `?redirect=` após login

### User Flow

- **Erros da API mapeados por campo**: `lib/form-errors.ts` converte `details[].field` (VALIDATION_ERROR), CONFLICT→email, credenciais inválidas→password, em erros inline do React Hook Form
- **Estado de sucesso animado**: check verde com spring + "Bem-vindo(a), {nome}" e auto-redirect (~1,2–1,6s)
- **`?redirect=` suportado** em login e cadastro (links cruzados preservam o destino)
- Páginas auth divididas em `page.tsx` (Suspense p/ `useSearchParams`) + `*-content.tsx`

### Força de senha

- `lib/password-strength.ts`: heurística 4 requisitos (8+ chars, maiúsc+minúsc, dígito, símbolo) + bônus 12+ chars → Fraca/Média/Forte
- `PasswordStrengthMeter`: 4 segmentos animados com cor por nível, checklist de requisitos com ✓/○, `aria-live`/`role=status`, respeita `reduced-motion`
- Nota UX: "senha123" é Fraca de propósito (sem maiúscula/símbolo) para incentivar senhas melhores

### Verificação

- **Não funcionais**: lint 0 erros · typecheck limpo · build ok · ESLint dedicado nos arquivos novos: limpo
- **Funcionais**: E2E 7/7 PASS — cadastro com payload exato do frontend (201), ausência de confirmPassword→400 field `confirmPassword`, email duplicado→409 CONFLICT, senha curta→400 field `password`, login pós-cadastro, `/login?redirect` e `/cadastro?redirect` renderizam
- Medidor: 7/7 casos de classificação (vazio/fraca/média/forte)

---

## Fase 11 — Carrinho no Frontend *(atual)*

**Escopo:** spec `09-carrinho.md` no frontend, animações da `19-design-ui.md`

### Funcionalidades

- **Carrinho anônimo**: `x-cart-token` persistido em localStorage; token emitido em `meta.cartToken` capturado automaticamente pelo wrapper `cartRequest`
- **Merge ao autenticar**: login/cadastro enviam o token anônimo e descartam-no após o merge; queries de carrinho invalidadas em login/logout
- Página `/carrinho`: itens com stepper de quantidade (limitado ao estoque), remoção, esvaziar, resumo com subtotal/desconto/total, alerta de estoque insuficiente bloqueando checkout
- Botões funcionais: `+` no ProductCard (feedback visual ✓ verde por 1,5s) e seletor de quantidade + total dinâmico na página de produto
- Badge do carrinho no header com contador animado

### Animações (spec 19)

- `framer-motion` com **`MotionConfig reducedMotion="user"`** global — respeita `prefers-reduced-motion`
- Badge do carrinho: spring pop a cada mudança de contagem
- Toasts: entrada/saída com fade + slide (`AnimatePresence`)
- Itens do carrinho: entrada fade/slide, saída colapsando altura
- Micro-interações: `whileTap` nos botões de adicionar

### Verificação

- **Não funcionais**: lint 0 erros · typecheck limpo · build 11 rotas · First Load JS ~165 kB (framer-motion code-split por página)
- **Funcionais** (E2E contra API real): criação de carrinho anônimo + emissão de token, adicionar/atualizar/remover/esvaziar, subtotal conferido item a item, rejeição de qtd <1 e >999 (VALIDATION_ERROR), rejeição de estoque insuficiente em POST e PATCH, merge login→carrinho do usuário, acesso autenticado, todas as rotas web 200

---

## Fase 10 — Frontend Base (`apps/web`)

**Escopo:** specs `18-frontend.md` e `19-design-ui.md` (base), com layout de referência visual em `specs/exemplo-layout.jpeg`

### Setup

- App Next.js 15 (App Router) + React 19 + TypeScript strict no monorepo pnpm
- Tailwind CSS v4 com design tokens em CSS (`@theme`), paleta extraída da referência: fundo creme, superfícies brancas, **accent laranja/âmbar**, verde folha secundário
- TanStack Query v5 (data fetching/cache), Zustand v5 com persist (sessão), React Hook Form + Zod (formulários), Lucide (ícones)
- `@e-horta/tsconfig/nextjs.json` reaproveitado; `transpilePackages` para os pacotes compartilhados

### Estrutura

- `lib/api-client.ts` — cliente HTTP com envelope `{ data, meta, error }`, refresh automático de access token em 401 e mapeamento de erros da spec 19 em mensagens amigáveis
- `stores/session.ts` — sessão persistida (user + tokens) ligada ao api-client sem dependência circular
- Componentes: `ui/` (Button, Input, Badge, Skeleton), `layout/` (Header com busca, BottomNav mobile-first com 5 itens, Container), `product/` (ProductCard, ProductCarousel, ProductGrid), `feedback/` (Toaster acessível), `home/` (HeroBanner, CategoryChips)
- Acessibilidade WCAG 2.2 AA como meta: labels, aria-live, foco visível, navegação por teclado, `prefers-reduced-motion`

### Páginas

- Home mobile-first: banner, chips de categorias, carrosséis Ofertas/Destaques/Mais vendidos
- Busca com paginação, categorias (lista + por slug), detalhe do produto (galeria, avaliações, recomendações)
- Login/Cadastro (RHF+Zod espelhando validações da API), Conta (dados + logout), Pedidos e Carrinho como placeholders de próxima fase

### Bugfixes na API descobertos nos smoke tests

- `products.service.findBySlug`: `include` + `select` simultâneos em `reviews` quebravam o detalhe do produto (500)
- `auth.service`: queries cruas sem cast `::uuid` (registro/login 500 e refresh 401 após migração de UUID nativo)

### Verificação

- Build de produção: 11 rotas geradas · Lint: 0 erros · Typecheck: limpo
- Testes API: **135/135** · Smoke E2E local: auth completo (register/login/me/refresh/logout) + todas as rotas do web respondendo 200 contra a API real

---

## Fase 9 — Avaliações (Reviews) e Notificações

**Escopo:** specs `15-avaliacoes.md` e `16-notificacoes.md`

### Módulo Reviews (`apps/api/src/modules/reviews/`)

- `reviews.controller.ts` / `reviews.service.ts` / `reviews.validation.ts`
- Rotas públicas:
  - `GET /api/v1/products/:productId/reviews` — listagem paginada de avaliações aprovadas
  - `GET /api/v1/products/:productId/reviews/summary` — média e contagem por nota
  - `GET /api/v1/products/:slug` inclui o summary no detalhe do produto
- Rotas autenticadas:
  - `POST /api/v1/products/:productId/reviews` — criação com **regra de comprador verificado**: só avalia quem tem pedido em status elegível (`PURCHASED_ORDER_STATUSES`, incluindo `DELIVERED`); rating validado entre 1 e 5
  - `GET /api/v1/reviews/me` — avaliações do usuário logado
  - `DELETE /api/v1/reviews/:id` — exclusão pelo autor
- Moderação admin (`admin-reviews.controller.ts`):
  - `GET /api/v1/admin/reviews` — fila de moderação
  - `PATCH /api/v1/admin/reviews/:id/status` — aprovar/rejeitar

### Módulo Notifications (`apps/api/src/modules/notifications/`)

- `notification-events.ts` — catálogo dos 7 eventos da spec 16:
  `ACCOUNT_CREATED`, `ORDER_CREATED`, `PAYMENT_APPROVED`, `PAYMENT_FAILED`,
  `ORDER_PREPARING`, `ORDER_OUT_FOR_DELIVERY`, `ORDER_DELIVERED`
- Canais:
  - **E-mail** via `mailer.service.ts` (nodemailer)
  - **Notificações internas** persistidas na tabela `Notification`
- Fila assíncrona **BullMQ + Redis** com worker dedicado (`notifications.processor.ts`)
- **Fallback inline**: sem Redis disponível, as notificações são processadas sincronamente (com skip quando o DB também falha), sem quebrar o fluxo principal
- Rotas autenticadas:
  - `GET /api/v1/notifications` — listagem paginada
  - `GET /api/v1/notifications/unread-count` — contador de não lidas
  - `PATCH /api/v1/notifications/:id/read` — marcar como lida
  - `PATCH /api/v1/notifications/read-all` — marcar todas
- Integrações nos fluxos existentes:
  - `auth.service`: dispara `ACCOUNT_CREATED` no registro
  - `checkout.service`: dispara `ORDER_CREATED` na criação do pedido
  - `payments.service`: dispara `PAYMENT_APPROVED`/`PAYMENT_FAILED` após resolução do pagamento (capturado dentro da transação, notificado fora dela)
  - `orders.service`: dispara eventos de status na transição admin (`PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`)

### Migrações

- `20260823120000_review_unique_per_user`:
  - Deduplica histórico e cria índice único `(user_id, product_id)` — uma avaliação por usuário/produto, mantendo a mais recente
  - Índice composto `(product_id, status)` para a listagem pública
- `20260824000000_native_uuid_ids`:
  - Converte colunas de ID/FK de `TEXT` para `UUID` nativo em todas as tabelas
  - Corrige falha `operator does not exist: text = uuid` em queries cruas (checkout, webhooks, admin)

### Dependências novas

- `bullmq`, `ioredis`, `nodemailer`, `@types/nodemailer`, `tsx`

### Verificação

- Lint: 0 erros · Typecheck: limpo · Testes: **135/135** em 12 suítes
- Smoke test: `/api/v1/health` ok (DB conectado)

---

## Fase 8 — Admin

- Dashboard administrativo (`admin-dashboard.controller`)
- CRUD completo de produtos, categorias, promoções e estoque com validações Zod dedicadas
- Gestão de pedidos com máquina de estados (`order-transitions`) aplicada nas transições de status
- Listagem de usuários
- Testes: `admin.service.spec`, `promotions.service.admin.spec`, expansão de `orders.service.spec`

## Fase 7 — Pedidos: tracking, cancelamento e repeat

- Utilitário `order-transitions.ts` centralizando transições válidas de status
- `POST /orders/:id/cancel` — cancelamento pelo cliente com devolução de estoque
- `POST /orders/:id/repeat` — replicar pedido antigo no carrinho
- Migração `20260822000000_order_cancellation`

## Fase 6 — Pagamentos

- Gateway sandbox Pix (`providers/sandbox-pix.provider.ts`) atrás de interface trocável
- Webhooks idempotentes (`webhooks.controller`)
- Retries de pagamento e lifecycle do carrinho (migração `20260821150000_payment_retries_cart_lifecycle`)
- Bugfixes P1: filtros de exceção, serviço de inventário, checkout e auth

## Fase 5 — Checkout

- Cotação de frete (`shipping/`)
- Cupons e promoções com `promotion-calculator` centralizando regras de desconto
- Checkout transacional: cria pedido + itens + baixa de estoque atomicamente
- Base do módulo de pedidos
- Migração `20260821000000_add_cart_coupon`

## Fase 4 — Carrinho

- Carrinho com suporte anônimo (`optional-jwt-auth.guard`) e merge ao fazer login
- Jest configurado (unit + e2e) com os primeiros testes de serviço
- Validação Zod em todos os endpoints

## Correção intermediária

- Correções de runtime bloqueando startup da API e fluxo de auth (JWT guard, refresh tokens)
- Migration inicial `init` adicionada ao repositório

## Fase 3 — Catálogo

- Categorias com busca por slug
- Produtos: busca, filtragem, destaques, mais vendidos, promoções, recomendações e detalhe por slug
- Serviço de inventário com controle de estoque

## Fase 2 — Auth, Usuários e Endereços

- Registro/login com JWT + refresh tokens rotativos
- Guards (`jwt-auth`, `roles`), decorators (`public`, `roles`, `current-user`)
- `ZodValidationPipe` e filtro global de exceções
- Perfil do usuário (ver/editar/excluir conta)
- CRUD de endereços com endereço padrão

## Fase 1 — Fundação

- Monorepo pnpm workspace: `apps/api`, `packages/{eslint-config, tsconfig, types, validation}`
- Bootstrap NestJS com validação de env (Zod) e health check
- Schema Prisma completo + seed inicial
- Docker Compose (PostgreSQL + Redis)
- Specs funcionais (00–24) versionadas em `specs/`
