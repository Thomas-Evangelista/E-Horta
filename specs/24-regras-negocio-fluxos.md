# 24 — Regras de Negócio, Fluxos e Ordem de Implementação

## Regras de Negócio Principais

### Regra 1 — Preço
O frontend **nunca** define o preço final. O backend sempre consulta o preço atual.

### Regra 2 — Estoque
Nunca permitir estoque negativo.

### Regra 3 — Checkout
O pedido só pode ser criado após validar: usuário, endereço, estoque, preços, frete e promoções.

### Regra 4 — Pagamento
Pagamento confirmado somente através de resposta confiável do gateway/webhook.

### Regra 5 — Webhook
Webhook deve ser idempotente.

### Regra 6 — Pedido
Pedido deve possuir snapshot dos produtos e endereço.

### Regra 7 — Promoção
Promoções são calculadas pelo backend.

### Regra 8 — Autorização
Toda operação administrativa deve ser autorizada no backend.

### Regra 9 — Carrinho
Carrinho pode ser alterado até o início do checkout.

### Regra 10 — Pedido Pago
Depois de pago, alterações sensíveis devem ser controladas pelo fluxo administrativo.

---

## Fluxos

### Fluxo Completo de Compra

```
CLIENTE → HOME → BUSCA/CATEGORIA → PRODUTO → ADICIONAR → CARRINHO → CHECKOUT
  → VALIDAR USUÁRIO → VALIDAR ENDEREÇO → VALIDAR ESTOQUE → CALCULAR PREÇOS
  → APLICAR CUPOM → CALCULAR ENTREGA → RESERVAR ESTOQUE → CRIAR PEDIDO
  → CRIAR PAGAMENTO → AGUARDAR CONFIRMAÇÃO → WEBHOOK → PAGAMENTO APROVADO
  → CONFIRMAR ESTOQUE → PEDIDO = PAYMENT_APPROVED → SEPARAÇÃO → ENTREGA
  → PEDIDO = DELIVERED
```

### Fluxo de Pagamento Recusado

```
Checkout → Criar pagamento → Pagamento recusado → Pedido permanece pendente/falha
  → Liberar reserva → Informar usuário → Permitir nova tentativa
```

Não criar outro pedido automaticamente para cada tentativa de pagamento.

### Fluxo de Estoque Insuficiente

```
Checkout → Validar estoque → Estoque insuficiente → Não criar pedido
  → Retornar OUT_OF_STOCK → Frontend informa produto/quantidade → Usuário ajusta carrinho
```

### Fluxo de Usuário Não Autenticado

Permitir navegação pública: visualizar produtos, buscar, navegar categorias.

Ao iniciar checkout:

```
Carrinho → Login/Cadastro → Checkout
```

Preservar o carrinho durante o processo.

---

## Ordem de Implementação

### Fase 1 — Fundação
Monorepo, Next.js, NestJS, PostgreSQL, Prisma, Redis, Docker, ESLint, Prettier, CI.

### Fase 2 — Autenticação
Cadastro, login, JWT, refresh, roles, usuário, endereço.

### Fase 3 — Catálogo
Categorias, produtos, imagens, busca, filtros, paginação.

### Fase 4 — Carrinho
Carrinho, itens, quantidade, estoque, preços.

### Fase 5 — Checkout
Endereço, frete, descontos, criação do pedido.

### Fase 6 — Pagamento
Abstração de gateway, Pix, webhook, idempotência.

### Fase 7 — Pedidos
Status, acompanhamento, histórico, repetir pedido.

### Fase 8 — Administração
Dashboard, produtos, categorias, estoque, pedidos, promoções, usuários.

### Fase 9 — Qualidade
Testes, acessibilidade, performance, SEO, observabilidade.

---

## Definition of Done

Uma funcionalidade somente será considerada concluída quando:

- Backend implementado
- Endpoint documentado
- Validação implementada
- Autorização implementada quando necessário
- Frontend integrado
- Loading implementado
- Empty state implementado
- Error state implementado
- Success state implementado
- Testes implementados
- TypeScript sem erros
- ESLint sem erros
- Responsividade validada
- Acessibilidade considerada
- Documentação atualizada

---

## Critérios de Aceite do MVP

### Cliente

1. Acessar a Home
2. Navegar pelas categorias
3. Buscar produtos
4. Visualizar um produto
5. Adicionar produto
6. Alterar quantidade
7. Visualizar o carrinho
8. Criar uma conta
9. Cadastrar endereço
10. Escolher entrega
11. Escolher pagamento
12. Criar pedido
13. Receber confirmação
14. Visualizar pedido
15. Acompanhar status

### Administrador

1. Acessar painel
2. Cadastrar categoria
3. Cadastrar produto
4. Alterar preço
5. Alterar estoque
6. Visualizar pedidos
7. Alterar status do pedido
8. Visualizar clientes

---

## Padrão de Código

Utilizar:

```
TypeScript strict
Clean Code
SOLID quando aplicável
DRY sem abstração excessiva
Separation of Concerns
Dependency Injection
Repository Pattern quando necessário
Service/Use Case Pattern
DTOs
Schema Validation
```

- Preferir funções pequenas e componentes pequenos
- Nomes devem ser claros
- Evitar `any` exceto quando tecnicamente inevitável e devidamente justificado

---

## Entrega Esperada (Codex)

### Antes de implementar cada módulo:

1. Analisar a arquitetura
2. Verificar dependências
3. Implementar banco
4. Implementar backend
5. Criar testes
6. Implementar frontend
7. Integrar API
8. Executar lint
9. Executar typecheck
10. Executar testes
11. Corrigir problemas
12. Documentar

### Regras

- Não gerar código fictício ou endpoints que não existam
- Não criar mocks permanentes onde uma implementação real seja esperada
- Quando uma integração externa ainda não estiver configurada, criar uma interface/adapter claramente identificada
- Não tentar implementar toda a aplicação em uma única alteração
- Trabalhar em incrementos pequenos e verificáveis

### Primeiro Objetivo

Criar fundação completa antes de qualquer funcionalidade:

```
Monorepo → Next.js → NestJS → PostgreSQL → Prisma → Redis → Docker Compose
→ TypeScript strict → ESLint → Prettier → Swagger → Health Check → CI
```

Depois implementar módulos na ordem:

```
Auth → Users → Addresses → Categories → Products → Inventory → Cart
→ Checkout → Orders → Payments → Shipping → Promotions → Notifications → Admin
```

### Conflitos

- Quando houver conflito entre implementação rápida e regra de negócio: priorizar a regra de negócio
- Quando houver dúvida arquitetural: preferir a solução mais simples que mantenha segurança, testabilidade, manutenção, escalabilidade e separação entre frontend e backend
