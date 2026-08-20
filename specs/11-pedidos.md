# 11 — Pedidos

## Entidades

### Order

```
id
orderNumber
userId
status
paymentStatus
shippingStatus
subtotal
discount
shippingFee
total
addressSnapshot
createdAt
updatedAt
```

### OrderItem

```
id
orderId
productId
productNameSnapshot
skuSnapshot
unitPrice
quantity
total
```

## Snapshots

Utilizar snapshots para preservar as informações do momento da compra.

Se o nome ou preço do produto mudar posteriormente, o pedido antigo não deve mudar.

## Status do Pedido

### Status Possíveis

```
PENDING_PAYMENT
PAYMENT_APPROVED
PREPARING
READY_FOR_DELIVERY
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

### Fluxo Normal

```
PENDING_PAYMENT → PAYMENT_APPROVED → PREPARING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
```

### Regras

- Não permitir transições inválidas (ex: `DELIVERED → PREPARING` deve ser bloqueado)
- As transições devem ser controladas pelo backend
- Depois de pago, alterações sensíveis devem ser controladas pelo fluxo administrativo
