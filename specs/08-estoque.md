# 08 — Estoque

## Entidade Inventory

### Campos

```
id
productId
quantity
reservedQuantity
minimumStock
updatedAt
```

### Estoque Disponível

```
available = quantity - reservedQuantity
```

### Regras

- Nunca permitir estoque negativo

## Reserva de Estoque

### Fluxo durante o Checkout

```
Produto → Verificar estoque → Reservar estoque → Criar pedido → Pagamento
```

### Se o pagamento falhar

```
Liberar reserva
```

### Se o pagamento for confirmado

```
Confirmar baixa do estoque
```

### Regras

- A operação deve utilizar transação de banco e mecanismo de concorrência para impedir overselling
- Não confiar somente na validação feita no frontend
- Nunca confiar apenas em `if quantity > 0` fora de uma transação
