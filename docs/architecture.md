# Arquitetura

## Visão Geral

O **E-Horta** é uma plataforma de e-commerce de hortaliças e produtos frescos,
organizada como um monorepo (pnpm workspaces). Segue uma arquitetura
**backend/frontend separados** com comunicação via REST, visando segurança,
testabilidade, manutenção e escalabilidade.

```
        ┌─────────────┐     REST + JSON     ┌──────────────┐
        │  Web (Next) │ ──────────────────▶ │              │
        │  loja :3000 │                     │   API        │
        └─────────────┘                     │  NestJS :8080 │──▶ PostgreSQL (Prisma)
        ┌─────────────┐     REST + JSON     │              │──▶ Redis (BullMQ)
        │ Admin (Next)│ ──────────────────▶ │              │──▶ MinIO (imagens S3)
        │ painel :3001│                     └──────────────┘
        └─────────────┘
```

## Monorepo

Gerenciado com **pnpm workspaces** (arquivo `pnpm-workspace.yaml`).

| Pasta         | Descrição                                           |
|---------------|-----------------------------------------------------|
| `apps/api`    | Backend NestJS (REST + Swagger), porta `8080`       |
| `apps/web`    | Frontend Next.js 15 (App Router) — loja do cliente  |
| `apps/admin`  | Frontend Next.js 15 — painel administrativo         |
| `packages/types`       | Tipos TypeScript compartilhados              |
| `packages/validation`  | Validações Zod compartilhadas               |
| `packages/tsconfig`    | Configurações TypeScript                     |
| `packages/eslint-config`| Configurações ESLint                       |
| `prisma`       | Schema, migrations e seed                         |
| `specs`        | Especificações por fase                            |
| `docs`         | Documentação técnica                              |
| `e2e`          | Testes E2E (Playwright)                           |

## Backend (NestJS)

Organizado por **módulos funcionais** em `apps/api/src/modules`:

- `auth` — registro, login, JWT, refresh, logout, usuário atual
- `users` — perfil, edição e exclusão de conta
- `addresses` — endereços de entrega
- `categories` — catálogo de categorias (público + admin)
- `products` — catálogo de produtos (público + admin)
- `inventory` — estoque (leitura pública, escrita admin)
- `cart` — carrinho e itens
- `checkout` — criação do pedido (valida todas as regras)
- `orders` — pedidos, cancelamento e repetição
- `payments` / `webhooks` — gateway de pagamento e webhook (idempotente)
- `shipping` — cotação de frete
- `promotions` — cupons para o carrinho
- `reviews` — avaliações de produtos
- `notifications` — notificações por usuário (fila BullMQ)
- `admin/*` — painel administrativo (dashboard, produtos, categorias, estoque,
  pedidos, promoções, usuários, avaliações)
- `health` — health checks (`/health` e `/ready`)

### Infraestrutura técnica da API

- **Validação**: `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted`
  e transform, além de schemas **Zod** (config de ambiente) e **class-validator**
  (DTOs).
- **Configuração**: `@nestjs/config` com validação por Zod. Em `NODE_ENV=test`,
  carrega apenas `apps/api/test/.env` (banco isolado).
- **Segurança**: `helmet`, CORS restrito, autenticação JWT e guard de roles
  (`RolesGuard`) nas rotas administrativas.
- **Autorização**: todo endpoint administrativo é protegido no backend
  (Regra 8 da Fase 24).
- **Fila**: BullMQ + Redis para notificações.

### Padrão de camadas

Cada módulo segue o padrão Service/Use Case com injeção de dependência:

```
Controller (roteamento + DTOs)
   └─ Service (regras de negócio)
        └─ PrismaService / Repositório
```

## Frontend (Next.js)

Duas aplicações Next.js 15 com App Router:

- **Web**: loja pública — home, catálogo, busca, categorias, produto, carrinho,
  checkout, conta e pedidos.
- **Admin**: painel administrativo — dashboard, gestão de produtos, categorias,
  estoque, pedidos, promoções, usuários e avaliações.

Ambas falam com a API via um cliente HTTP compartilhado (centrado em
`lib/api-client`), tratando o envelope `{ data, meta, error }`.

## Princípios de Arquitetura

- **Backend é a fonte da verdade**: preço, promoções e estoque são sempre
  calculados/validados no backend (Regras 1, 2 e 7 da Fase 24).
- **Separação de responsabilidades** entre frontend e backend.
- **Injeção de dependência** e padrão de serviço por módulo.
- **TypeScript strict** em todo o monorepo.
- **Snapshot de dados** em pedidos (produtos e endereço) — Regra 6.

## Fluxo de execução (dev local)

`README.md` documenta dois modos: stack completa via `docker compose` ou
infraestrutura via Docker + apps no host (hot-reload).
