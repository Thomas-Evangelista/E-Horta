# Regras de Negócio

Regras principais e fluxos definidos na especificação da Fase 24,
implementadas no backend (fonte da verdade).

## Regras Principais

### Regra 1 — Preço
O frontend **nunca** define o preço final. O backend sempre consulta o preço
atual no momento do cálculo (checkout).

### Regra 2 — Estoque
Nunca permitir estoque negativo. O checkout valida e reserva estoque; estoque
insuficiente impede a criação do pedido.

### Regra 3 — Checkout
O pedido só pode ser criado após validar: **usuário, endereço, estoque, preços,
frete e promoções** — tudo no backend.

### Regra 4 — Pagamento
Pagamento confirmado somente através de resposta confiável do **gateway/webhook**.
Nada de marcar como pago sem confirmação externa.

### Regra 5 — Webhook
Webhook deve ser **idempotente** — usa `provider + event_id` (tabela
`webhook_events`) para não processar o mesmo evento duas vezes.

### Regra 6 — Pedido
O pedido deve possuir **snapshot** dos produtos (nome/sku/preço) e do endereço
(`address_snapshot`), preservando o histórico mesmo que o catálogo mude.

### Regra 7 — Promoção
Promoções são **calculadas pelo backend** (valor, mínimo, teto de desconto e
limite de uso).

### Regra 8 — Autorização
Toda operação administrativa é **autorizada no backend** (roles `ADMIN`/
`OPERATOR` via `RolesGuard`).

### Regra 9 — Carrinho
O carrinho pode ser alterado até o **início do checkout**. No checkout o
carrinho é convertido e congelado (status `CONVERTED`).

### Regra 10 — Pedido Pago
Depois de pago, alterações sensíveis (preço/estoque) são controladas pelo
**fluxo administrativo**, não pelo usuário.

## Fluxos

### Fluxo completo de compra

```
CLIENTE → HOME → BUSCA/CATEGORIA → PRODUTO → ADICIONAR → CARRINHO → CHECKOUT
  → VALIDAR USUÁRIO → VALIDAR ENDEREÇO → VALIDAR ESTOQUE → CALCULAR PREÇOS
  → APLICAR CUPOM → CALCULAR ENTREGA → RESERVAR ESTOQUE → CRIAR PEDIDO
  → CRIAR PAGAMENTO → AGUARDAR CONFIRMAÇÃO → WEBHOOK → PAGAMENTO APROVADO
  → CONFIRMAR ESTOQUE → PEDIDO = PAYMENT_APPROVED → SEPARAÇÃO → ENTREGA
  → PEDIDO = DELIVERED
```

### Fluxo de pagamento recusado

```
Checkout → Criar pagamento → Pagamento recusado → Pedido permanece PENDING_PAYMENT
  → Liberar reserva de estoque → Informar usuário → Permitir nova tentativa (retry)
```

> Não criar outro pedido automaticamente para cada tentativa de pagamento.

### Fluxo de estoque insuficiente

```
Checkout → Validar estoque → Estoque insuficiente → Não criar pedido
  → Retornar OUT_OF_STOCK → Frontend informa produto/quantidade → Usuário ajusta carrinho
```

### Fluxo de usuário não autenticado

Navegação pública permite visualizar produtos, buscar e navegar categorias.
Ao iniciar o checkout:

```
Carrinho → Login/Cadastro → Checkout
```

O carrinho é preservado durante o processo.

## Estados dos Pedidos

| `OrderStatus` | Significado |
|---------------|-------------|
| `PENDING_PAYMENT` | Aguardando confirmação de pagamento |
| `PAYMENT_APPROVED` | Pagamento confirmado |
| `PREPARING` | Em preparação/separacão |
| `READY_FOR_DELIVERY` | Pronto para entrega |
| `OUT_FOR_DELIVERY` | Saiu para entrega |
| `DELIVERED` | Entregue |
| `CANCELLED` | Cancelado |

Pagamento `failed` mantém o pedido em `PENDING_PAYMENT` (permite retry) com
status de pagamento `FAILED`.

## Definition of Done

Uma funcionalidade é concluída quando:

- Backend implementado ✅
- Endpoint documentado (Swagger + `docs/api.md`) ✅
- Validação implementada ✅
- Autorização implementada quando necessário ✅
- Frontend integrado ✅
- Loading / Empty state / Error state / Success state ✅
- Testes implementados ✅
- TypeScript sem erros ✅
- ESLint sem erros ✅
- Responsividade e acessibilidade consideradas ✅
- Documentação atualizada ✅
