# AGENTS.md — Memória do Projeto E-Horta

Arquivo de memória persistente do projeto. Toda **solicitação de alteração** feita
pelo usuário deve ser registrada aqui na seção [Solicitações de Alteração](#solicitações-de-alteração),
antes ou durante a execução, para manter o histórico acessível em futuras sessões.

---

## Visão geral

Plataforma de e-commerce de hortaliças e produtos frescos. Monorepo pnpm com 3 apps:

| App     | Stack                    | Porta |
|---------|--------------------------|-------|
| `api`   | NestJS 10 + PostgreSQL (Prisma) + Redis (BullMQ) + MinIO | 8080 |
| `web`   | Next.js 15 (loja do cliente)                            | 3000 |
| `admin` | Next.js 15 (painel administrativo)                      | 3001 |

- Saudável: `http://localhost:8080/health` · `/ready`
- Docs (Swagger): `http://localhost:8080/api/docs`
- Login de teste (seed): `admin@ehorta.com.br` / `admin123`

## Estrutura

```
apps/
  api/      # Backend NestJS (8080) — módulos em apps/api/src/modules/
  web/      # Loja Next.js (3000)
  admin/    # Admin Next.js (3001)
packages/   # Tipos, validações, tsconfig, eslint compartilhados
prisma/     # Schema, migrations e seed
scripts/    # Scripts de start/setup (um por serviço) + setup.sh
specs/      # Especificações por fase + CHANGELOG.md
docs/       # architecture, api, database, deployment, business-rules
e2e/        # testes Playwright (config playwright.config.ts)
```

## Comandos

| Comando                | Descrição                                          |
|------------------------|----------------------------------------------------|
| `pnpm setup`           | Cria `.env`, bancos, migrations e seed (uma vez)   |
| `pnpm dev:all`         | Sobe API + Web + Admin juntos (logs misturados)    |
| `pnpm dev:api`         | App **separado**: API → 8080, Web → 3000, Admin → 3001 |
| `pnpm infra:postgres` / `infra:redis` / `infra:minio` | Serviços do sistema |
| `pnpm db:generate` / `migrate` / `deploy` / `seed` / `reset` | Prisma        |
| `pnpm lint`            | ESLint em todo o monorepo (0 erros exigido)        |
| `pnpm typecheck`       | `tsc --noEmit` em todos os workspaces              |
| `pnpm test`            | Jest (unit/integração)                             |
| `pnpm test:e2e`        | Playwright (E2E)                                   |

Verificação obrigatória ao final de cada alteração: **lint + typecheck** (+ testes
quando aplicável).

## Convenções

- **Idioma**: documentação e mensagens de commit em português. Código em inglês.
  Mensagens de commit: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- **Commits por fase**: cada entrega grande é um commit descritivo (ver `git log`).
- **Packages compartilhados**: tipos/validações vão em `packages/` (`@e-horta/types`,
  `@e-horta/validation`), não duplicados nos apps.
- **API**: módulos em `apps/api/src/modules/<nome>/` com `*.service.ts`,
  `*.controller.ts`, `*.module.ts`, DTOs com `class-validator`/`zod`, Swagger.
- **Sem Docker por padrão**: PostgreSQL/Redis/MinIO no host; ver `scripts/`.
- Fases e histórico completo em `specs/CHANGELOG.md` — atualizar ao finalizar uma fase.

---

## Solicitações de Alteração

Registro cronológico (mais recente primeiro) de todas as solicitações de mudança.
Ao receber uma nova solicitação, adicione uma entrada neste formato:

```markdown
### YYYY-MM-DD — <título curto da solicitação>

- **Status**: `pendente` | `em andamento` | `concluída`
- **Origem**: pedido do usuário (fase/commit se aplicável)
- **Solicitação**: descrição objetiva do que foi pedido
- **Decisões**: escolhas tomadas, trade-offs, arquivos/apis afetadas
- **Ações tomadas**: resumo das mudanças implementadas (opens, módulos, testes)
- **Verificação**: como foi validada (lint/typecheck/testes/E2E)
```

### 2026-08-28 — Correção do login (impossibilidade de entrar na home do admin)
- **Status**: `concluída`
- **Solicitação**: ao tentar logar na aplicação ocorre erro; corrigir a tela de login e confirmar se falta algo para acessar a home do administrador; se faltar, concluir.
- **Decisões**: a API estava saudável (login via curl retornava 200). O erro era exclusivamente no fluxo frontend (apps/admin) + CORS. Senha real do seed é `admin123` (docs corrigidas).
- **Ações tomadas**:
  - CORS multi-origem: `main.ts` passa a aceitar `CORS_ORIGIN` separado por vírgula; `.env`/`.env.example` incluem `http://localhost:3001` (admin), que antes era bloqueado (só 3000).
  - `apps/admin/src/lib/api-client.ts`: `new URL(path, BASE)` descartava o prefixo `/api/v1` → corrigido para concatenação (padrão do web); token agora é lido dinamicamente da store (getter) a cada requisição, alinhado com o web.
  - `apps/admin/src/app/login/page.tsx`: a resposta do login é `{ user, tokens }`, mas o código lia `accessToken`/`refreshToken` no topo → tokens sempre `undefined` e sessão sem auth. Corrigido para `tokens.accessToken`.
  - `apps/admin/src/stores/session.ts`: `refreshTokens` passava os tokens como `user` no `setSession`; agora preserva o usuário e atualiza só os tokens.
  - Placeholder do login admin corrigido (`admin@ehorta.com.br`).
- **Verificação**: browser E2E (Playwright) — admin `http://localhost:3001` loga e carrega Dashboard com KPIs sem erros; web `http://localhost:3000` loga e redireciona; `pnpm lint`/`typecheck` OK; testes: API 218, admin 37, web OK.

### 2026-08-28 — Suporte a PWA (ícones, service worker e manifest)
- **Status**: `concluída`
- **Solicitação**: habilitar PWA na loja (apps/web) com ícones, service worker e manifest aprimorado.
- **Ações tomadas**: commit `e14c356` — assets de ícones, manifest e service worker no app `web`.
- **Verificação**: build do app web validado.