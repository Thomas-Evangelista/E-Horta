# 22 — Testes

## Testes Unitários

Cobrir principalmente:

- Cálculo de carrinho
- Cálculo de desconto
- Cálculo de frete
- Validação de estoque
- Reserva de estoque
- Transição de pedido
- Autorização
- Autenticação
- Validação de cupons
- Processamento de webhook
- Idempotência

### Ferramentas

- Backend: **Jest**
- Frontend: **Vitest** + **React Testing Library**

## Testes de Integração

Testar fluxos:

```
register
login
products
cart
checkout
order
payment webhook
inventory
```

- Utilizar banco de testes isolado
- Backend: **Jest** + **Supertest**

## Testes E2E

### Fluxo Principal

```
Abrir Home → Buscar tomate → Abrir produto → Adicionar → Abrir carrinho → Checkout → Endereço → Pagamento → Pedido criado
```

### Cenários Adicionais

- Estoque insuficiente
- Pagamento recusado
- Cupom inválido
- Usuário não autenticado
- Produto indisponível

### Ferramenta

- **Playwright**
