# Changelog — E-Horta API

Registro de modificações do projeto, organizado por fase de implementação.

---

## Fase 9 — Avaliações (Reviews) e Notificações *(atual)*

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
