# 09 — Carrinho

## Entidades

### Cart

```
id
userId
status
createdAt
updatedAt
```

**Status:**

```
ACTIVE
CONVERTED
ABANDONED
```

### CartItem

```
id
cartId
productId
quantity
unitPrice
createdAt
updatedAt
```

## Operações — Endpoints

```
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
DELETE /api/v1/cart
```

### Adicionar Item

Request:

```json
{
  "productId": "uuid",
  "quantity": 2
}
```

O backend deverá:

1. Validar produto
2. Verificar disponibilidade
3. Buscar preço atual
4. Atualizar quantidade
5. Recalcular totais
6. Retornar carrinho atualizado

### Regras Importantes

- O preço exibido no carrinho deve ser recalculado pelo backend
- Nunca confiar no preço enviado pelo frontend
- Carrinho pode ser alterado até o início do checkout

## Carrinho Anônimo

Implementar suporte a carrinho anônimo utilizando identificador seguro no cliente.

Quando o usuário realizar login:

```
cart anonymous + cart user → merge → cart final
```

Resolver conflitos de quantidade respeitando estoque.
