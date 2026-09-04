# AGENTS.md — Memória do Projeto E-Horta

Arquivo de memória persistente do projeto. Toda **solicitação de alteração** feita
pelo usuário deve ser registrada aqui na seção [Solicitações de Alteração](#solicitações-de-alteração),
antes ou durante a execução, para manter o histórico acessível em futuras sessões.

---

## Visão geral

Plataforma de e-commerce de hortaliças e produtos frescos. Monorepo pnpm com 2 apps:

| App     | Stack                    | Porta |
|---------|--------------------------|-------|
| `api`   | NestJS 10 + PostgreSQL (Prisma) + Redis (BullMQ) + MinIO | 8080 |
| `web`   | Next.js 15 (loja do cliente em `/` + painel administrativo em `/admin`) | 3000 |

- Saudável: `http://localhost:8080/health` · `/ready`
- Docs (Swagger): `http://localhost:8080/api/docs`
- Login de teste (seed): `admin@ehorta.com.br` / `admin123` (acesso a `/admin` exige `role = ADMIN`)

## Estrutura

```
apps/
  api/      # Backend NestJS (8080) — módulos em apps/api/src/modules/
  web/      # Loja Next.js (3000) — rotas de storefront em src/app/(store)/,
            # painel admin em src/app/admin/ (componentes/libs exclusivos
            # namespaced em src/components/admin/ e src/lib/admin/)
packages/   # Tipos, validações, tsconfig, eslint compartilhados
prisma/     # Schema, migrations e seed
specs/      # Especificações por fase + CHANGELOG.md
docs/       # architecture, api, database, deployment, business-rules
e2e/        # testes Playwright (config playwright.config.ts)
```

## Comandos

| Comando                | Descrição                                          |
|------------------------|----------------------------------------------------|
| `pnpm setup`           | Instala deps + gera Prisma Client + migrations + seed (uma vez) |
| `pnpm dev:all`         | Sobe API + Web juntos (logs misturados)            |
| `pnpm dev:api` / `dev:web` | App **separado**, um terminal cada: API → 8080, Web (+Admin em `/admin`) → 3000 |
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
- **Sem Docker por padrão**: PostgreSQL/Redis/MinIO instalados nativamente no host (Windows); ver `README.md`.
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

### 2026-09-03 — Fluxo de senha completo (recuperar/redefinir/alterar) + gestão de status no Admin

- **Status**: `concluída`
- **Origem**: pedido do usuário (avançar para a próxima fase após análise do projeto; escopo escolhido: "Fluxo de Senha completo" = recuperar/redefinir via e-mail + alterar senha + gestão de status de usuários no admin)
- **Solicitação**: completar o ciclo de senha da loja (esqueci/redefinir senha por e-mail e alteração de senha autenticada) e permitir ao administrador ativar/inativar/bloquear clientes.
- **Decisões**:
  - Token de redefinição: `randomBytes(32)` em texto plano enviado por e-mail e armazenado apenas como **hash SHA-256** (`tokenHash`) na tabela `PasswordResetToken`, com expiração de 1h (defensivo: senha/reset nunca em texto plano no banco). Uso da tabela via `$executeRaw`/`$queryRaw` (sem alterar o client do Prisma schema de forma acoplada).
  - `forgotPassword` usa sucesso silencioso (conta inexistente/inativa retorna a mesma mensagem) para evitar enumeração de e-mails.
  - `resetPassword` e `changePassword` rodam em transação e **revogam todos os `refresh_tokens`** do usuário (logout de todos os dispositivos ao trocar senha).
  - `SITE_URL` adicionada à config validada (default `http://localhost:3000`) para montar o link de redefinição; `MailerService` passou a ser exportado por `NotificationsModule`.
  - Páginas `esqueci-senha` e `redefinir-senha` usam `Suspense` + componente client por causa do `useSearchParams` (requisito do Next.js 15 para builds estáticos/hidratação).
  - "Alterar senha" na `/conta` limpa a sessão local após sucesso (senha nova exige novo login; reforça segurança).
  - Gestão de status no admin: apenas `role = CUSTOMER` recebe a coluna "Ações" (a API já rejeita mudar status de perfis administrativos e do próprio admin). Modal oferece Ativar/Inativar/Bloquear conforme o status atual, via `PATCH /admin/users/:id/status` (endpoint já existia).
- **Ações tomadas**: novo modelo Prisma + migration; 3 endpoints de auth; métodos de serviço com envio de e-mail; páginas `esqueci-senha`/`redefinir-senha`; link no login; `useChangePassword` + seção "Alterar senha" na conta; coluna "Ações" + modal + mutation no admin de usuários; `SITE_URL` em `.env`/`.env.example`; `specs/CHANGELOG.md` (Fase 27).
- **Verificação**: `pnpm lint` 0 erros; `pnpm typecheck` (api + web) OK; `pnpm test` — API 226/226, Web (vitest) 118/118.

### 2026-09-03 — Remoção da pasta scripts/ (scripts bash exclusivos de Linux/WSL)

- **Status**: `concluída`
- **Origem**: pedido do usuário (voltou a usar VS Code nativo no Windows após travamentos no WSL/Ubuntu; `scripts/*.sh` não rodam fora de Linux)
- **Solicitação**: remover a pasta `scripts/` e seus arquivos `.sh` (bash/systemctl/apt-get, específicos de Linux) e passar a subir cada serviço/app diretamente, um por terminal.
- **Decisões**: sem wrapper de shell script — cada serviço de infra (PostgreSQL, Redis, MinIO) roda nativo no Windows (serviço do SO ou binário `.exe` num terminal) e cada app sobe via `pnpm dev:api`/`pnpm dev:web` direto.
- **Ações tomadas**: apagada a pasta `scripts/`; `package.json` raiz — removidos `db:setup`, `infra:postgres`, `infra:redis`, `infra:minio`, `dev:minio` (chamavam `bash scripts/*.sh`); `setup` reescrito sem bash (`pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed`); `README.md` e `docs/deployment.md` reescritos com pré-requisitos e passos nativos do Windows (PostgreSQL/Redis/MinIO para Windows, comandos `psql`/PowerShell); referências a `scripts/` removidas de `README.md`/`AGENTS.md`.
- **Verificação**: `pnpm setup`/`pnpm dev:api`/`pnpm dev:web` continuam funcionando via pnpm puro (sem dependência de bash); não há mais referências a `scripts/` ou `.sh` no repo.

### 2026-09-01 — Fusão do app admin dentro do app web (elimina apps/admin)

- **Status**: `concluída`
- **Origem**: pedido do usuário (motivado pela sobrecarga de RAM ao rodar 2 servidores Next.js + API simultaneamente num notebook com 8GB)
- **Solicitação**: unificar o servidor Web e o Admin num único app Next.js, já que não havia motivo para mantê-los separados; reescrever specs/docs afetados.
- **Decisões**:
  - `apps/admin` foi extinto; suas rotas viraram `apps/web/src/app/admin/**` (`/admin`, `/admin/login`, `/admin/produtos`, etc.), evitando colisão com as rotas de storefront de mesmo nome (`/produtos`, `/pedidos`...).
  - Rotas de storefront movidas para o route group `apps/web/src/app/(store)/**`; layout raiz (`app/layout.tsx`) ficou minimalista (html/body/Providers), Header/BottomNav/Footer passaram para `(store)/layout.tsx`, e `admin/layout.tsx` ganhou metadata e `ToastProvider` próprios.
  - Sessão (`stores/session.ts`), cliente HTTP (`lib/api-client.ts`) e erros (`lib/errors.ts`) foram **unificados** usando as versões do `web` (o `admin` tinha uma classe `ApiError` duplicada e um mapa de mensagens amigáveis com códigos que não batiam com os códigos reais da API — bug pré-existente, corrigido na fusão). `apiUpload` (usado no upload de imagens de produto) foi portado para o `api-client.ts` unificado.
  - Componentes e libs exclusivos do admin (com estilo visual próprio, ex.: `Button` com variante `danger`, toasts em formato pill) foram mantidos namespaced em `components/admin/**` e `lib/admin/**` em vez de forçar merge com os componentes do storefront — evita risco de quebrar visual/API de um lado ao ajustar o outro.
  - `AdminShell` passou a checar `user.role === 'ADMIN'` (antes só checava se havia *algum* usuário logado — falha de segurança que a fusão introduziria, já que agora storefront e admin compartilham a mesma sessão).
  - `formatNumber`/`formatDateTime` (só existiam no admin) foram incorporados a `lib/format.ts`; `formatDiscount`/`constants.ts`/`query-keys.ts` do admin mantidos em `lib/admin/` por terem assinatura/namespacing incompatíveis com as versões do storefront.
- **Ações tomadas**: ver commit correspondente — moveu ~30 arquivos de `apps/admin` para `apps/web`, criou layouts `(store)` e `admin`, atualizou `package.json` raiz (removeu `dev:admin`/`build:admin`), `.github/workflows/ci.yml` (removeu step "Build Admin"), `README.md`, `specs/17-admin.md`, `specs/02-arquitetura-projeto.md`, `specs/18-frontend.md`.
- **Verificação**: `pnpm lint`, `pnpm typecheck`, `pnpm test` (web) rodados após a fusão — ver resultado no fim desta sessão.

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