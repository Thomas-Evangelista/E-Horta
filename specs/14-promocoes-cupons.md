# 14 — Promoções e Cupons

## Módulo Independente

### Entidade Promotion

```
id
code
name
type
value
minimumOrderValue
maxDiscount
startsAt
endsAt
usageLimit
usageCount
isActive
```

### Tipos

```
PERCENTAGE
FIXED
FREE_SHIPPING
```

### Regras de Validação

- Promoção precisa estar ativa
- Data deve estar dentro do período
- Código deve ser válido
- Limite de uso deve ser respeitado
- Pedido mínimo deve ser respeitado
- Desconto máximo deve ser respeitado

O desconto sempre deve ser calculado no backend.

## Cupom — Endpoints

```
POST /api/v1/cart/coupon
DELETE /api/v1/cart/coupon
```

### Regras

- Nunca confiar no desconto enviado pelo cliente
- Promoções são calculadas pelo backend
