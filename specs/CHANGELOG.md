# Changelog — E-Horta API

Registro de modificações do projeto, organizado por fase de implementação.

---

## Fase 13 — Conta Completa e Correções de UX *(atual)*

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
