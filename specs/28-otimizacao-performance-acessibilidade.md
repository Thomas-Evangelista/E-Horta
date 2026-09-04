# 28 — Otimização, Performance e Acessibilidade

**Status:** parcialmente implementada — já concluídos: skip link, `aria-*` em paginação/navegação do admin, `ConfirmDialog` acessível, PWA install prompt, **rate limiting global da API**, **cache Redis do catálogo** e **índices Prisma** (ver `specs/CHANGELOG.md`, "Fase 28 (continuação)" — 2026-09-04). Itens restantes dos primeiros do roadmap — **Performance — Frontend** (imagens/prefetch), PWA completo e restante de **Acessibilidade** — ainda não iniciados.
**Objetivo:** fechar os gaps de performance, PWA e acessibilidade identificados nas fases anteriores, preparando o projeto para produção.

---

## 1. Performance — Backend

### Cache Redis para catálogo — ✅ concluído

- `CacheService` (cache-aside) sobre `ioredis`, injetado em `products.service` e `categories.service`, sem dependência de `@nestjs/cache-manager`.
- Cachear: `GET /products` (60s), `GET /categories` (300s), `GET /products/:slug` (60s)
- Invalidar cache quando admin cria/edita/deleta produto ou categoria (`delByPrefix` no fim dos writes)
- Keys com prefixo `cache:` + namespace: `cache:products:list:*`, `cache:products:{slug}`, `cache:categories:list:*`, `cache:categories:{slug}`
- Ver `apps/api/src/modules/cache/` e `specs/CHANGELOG.md`.

### Índices Prisma — ✅ concluído

- Avaliar queries mais lentas via `pg_stat_statements` ou logs de duração
- Adicionar índices compostos para:
  - `orders`: `(user_id, created_at)`, `(status, created_at)`
  - `audit_logs`: `(action, created_at)`, `(user_id, created_at)`
  - `reviews`: `(product_id, status)` (já existia) + `(status, created_at)` (moderação admin)
  - `notifications`: `(user_id, created_at)` (lista paginada da conta)
- `prisma migrate dev` + validação com `EXPLAIN` (planner usa os índices — ver migration `20260904194831_add_performance_indexes`)

### Rate limiting — ✅ concluído

- `@nestjs/throttler@6.5.0` com throttling global (`RateLimitGuard` custom registrado como `APP_GUARD`):
  - 100 req/min para rotas públicas
  - 200 req/min para rotas autenticadas
  - 30 req/min para rotas de auth (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`)
- Exceções: `/health`, `/ready`, `/metrics`
- Detalhes/documentação: `apps/api/src/common/throttler/` e `specs/CHANGELOG.md`.

---

## 2. Performance — Frontend

### Otimização de imagens

- Substituir todas as `<img>` por `<Image>` do Next.js com:
  - `sizes` responsivo (ex: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`)
  - `placeholder="blur"` com `blurDataURL` (placeholder de 10px)
  - `priority="true"` apenas na imagem hero/above-the-fold
- Conversão automática para WebP/AVIF via Next.js Image Optimization

### Prefetch de rotas

- Adicionar `<Link prefetch>` nas rotas críticas do fluxo de compra:
  - `/carrinho` (do ProductCard)
  - `/checkout` (do carrinho)
  - `/conta` (do header)
- Usar `router.prefetch()` em interactions (hover no botão de adicionar ao carrinho)

### Bundle optimization

- Rodar `next build --analyze` para identificar bundles grandes
- Mover libs pesadas para dynamic imports (`next/dynamic`)
- Verificar tree-shaking de `lucide-react` (importar só ícones usados)
- Meta: First Load JS < 150kB para todas as rotas públicas

---

## 3. PWA Completo

### Service Worker

- Instalar `next-pwa` ou configurar Workbox manualmente
- Estratégias de cache:
  - **Cache first** para assets estáticos (CSS, JS, imagens)
  - **Network first** para páginas HTML (fallback offline)
  - **Stale while revalidate** para dados da API (produtos, categorias)
- Páginas offline disponíveis: home, catálogo, detalhe do produto (última versão)
- Background sync para adicionar ao carrinho quando voltar online

### Manifest aprimorado

- Adicionar `screenshots` ao manifest para prompt de instalação
- `start_url`: `/`
- `display`: `standalone`
- `theme_color`: cor primária do tema
- Ícones: 192x192, 512x512 (masks para Android)

### Prompt de instalação

- Criar componente `InstallPrompt` que aparece após 3 visitas
- Botão "Instalar E-Horta" no footer ou como toast discreto
- Respeitar `localStorage` para não mostrar novamente após dismiss

---

## 4. Acessibilidade — WCAG 2.2 AA

### Auditoria automatizada

- Instalar `@axe-core/react` para desenvolvimento
- Rodar Lighthouse accessibility audit em todas as rotas públicas
- Meta: score ≥ 95 em todas as rotas

### Correções específicas

#### Contraste de cores

- Verificar todas as combinações de cores com ferramenta de contraste
- Ajustar cores que não atingem 4.5:1 (texto) ou 3:1 (grande texto)
- Cores problemáticas prováveis: `text-ink-400` em fundo claro, badges

#### Navegação por teclado

- Modais: implementar **focus trap** (Tab cycled dentro do modal)
- Dropdowns: fechar com Escape, navegar com setas
- Carrinho stepper: funcionar com setas (quantity +/-)
- Skip link no topo de todas as páginas (`#conteudo-principal`)

#### ARIA e semântica

- `aria-live="polite"` em todos os estados dinâmicos (toast, loading, erro)
- `aria-label` em botões de ícone (ex: "Adicionar ao carrinho", "Remover item")
- `role="alert"` em erros de formulário
- `aria-current="page"` no link de navegação ativo
- Headings hierarchy: garantir H1 único por página, sem pular níveis

#### Formulários

- `aria-describedby` conectando erro ao campo
- `aria-invalid` em campos com erro
- `aria-required` em campos obrigatórios
- Labels associados via `htmlFor`/`id`

### Componentes específicos

- **PasswordStrengthMeter**: `aria-live="polite"` + `role="status"`
- **Stepper do carrinho**: `aria-label="Quantidade"` + `aria-valuenow`
- **Timeline do pedido**: `role="list"` + `aria-label="Andamento do pedido"`
- **Toasts**: `role="alert"` + `aria-live="assertive"`
- **Modais admin**: focus trap + restore focus no close

---

## 5. UX Polish

### Substituir `confirm()` por modais acessíveis

- Criar `ConfirmDialog` component (reutilizável) com:
  - Título, mensagem, botões Confirm/Cancel
  - Focus trap + Escape para fechar
  - Variantes: `danger` (excluir), `warning` (inativar), `info` (genérico)
- Substituir todas as ocorrências de `confirm()` no admin:
  - `promocoes/page.tsx` — deletar promoção
  - `usuarios/page.tsx` — gerenciar status
  - `produtos/page.tsx` — ativar/desativar
  - `pedidos/[id]/page.tsx` — cancelar pedido

### Loading skeletons consistentes

- Criar `TableSkeleton` para todas as listagens admin
- Criar `FormSkeleton` para formulários de edição
- Criar `DetailSkeleton` para páginas de detalhe
- Aplicar em: produtos, pedidos, categorias, promoções, usuários, auditoria

### Empty states com illustration

- Criar ilustrações SVG simples para cada empty state:
  - Sem produtos, sem pedidos, sem promoções, sem categorias
  - Incluir CTA relevante ("Criar primeira promoção", "Cadastrar produto")
- Padronizar componente `EmptyState` com: illustration, título, descrição, CTA

### Toasts padronizados

- Posição: bottom-right (mobile: bottom-center)
- Duração: sucesso 3s, erro 5s, info 4s
- Máximo 3 visíveis ao mesmo tempo
- Dismiss por swipe (mobile) ou clique no X
- Ícone consistente por tipo (check, alert, info)

---

## 6. Testes

### Testes de acessibilidade

- Instalar `jest-axe` para testes unitários
- Instalar `@axe-core/playwright` para E2E
- Testar: home, produto, carrinho, checkout, login, cadastro
- Meta: zero violações WCAG 2.2 AA

### Testes E2E atualizados

- Adicionar cenários de:
  - Navegação por teclado completa (tab through checkout)
  - Offline: cached pages still render
  - Performance: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Atualizar cobertura

- Novos componentes: `ConfirmDialog`, `InstallPrompt`, `SkipLink`
- Hooks: `use-cache` (se criado)

---

## Ordem de Execução

1. **Rate limiting** (API) — rápido, impacto imediato
2. **Cache Redis** (API) — melhoria de performance visível
3. **Índices Prisma** — queries lentas
4. **Otimização de imagens** (frontend) — impacto em LCP
5. **PWA completo** (service worker) — funcionalidade offline
6. **Acessibilidade** (componentes) — contraste, ARIA, focus
7. **UX polish** (modais, skeletons, toasts) — experiência final
8. **Testes** — validar tudo

---

## Verificação

Ao final da fase:

- `pnpm lint`: 0 erros
- `pnpm typecheck`: limpo
- `pnpm test`: todos passando
- Lighthouse accessibility: ≥ 95 em todas as rotas públicas
- Lighthouse performance: ≥ 90 na home e produto
- PWA: service worker registrado, offline funcional
- Navegação por teclado: checkout completo sem mouse
