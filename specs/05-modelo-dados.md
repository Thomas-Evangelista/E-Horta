# 05 — Modelo de Dados

## Modelos Principais

```
User
Address
Category
Product
ProductImage
Inventory
Cart
CartItem
Promotion
PromotionUsage
Order
OrderItem
Payment
Shipping
Review
Notification
WebhookEvent
AuditLog
```

## Definições

- Relacionamentos definidos através do Prisma
- UUID para IDs públicos

## Índices

```
User.email
User.phone
Product.slug
Product.sku
Product.categoryId
Order.userId
Order.status
Order.createdAt
Cart.userId
Inventory.productId
WebhookEvent.provider + eventId (único)
```

## Tratamento de Dinheiro

Nunca utilizar float para dinheiro. Utilizar `Decimal` ou representação inteira em centavos.

Exemplo: R$ 6,90 → armazenado como 690 ou Decimal equivalente.

Toda operação financeira deve evitar problemas de precisão.

## Transações

Operações críticas devem utilizar database transactions.

Exemplo de criação do pedido:

```
BEGIN
  ↓
  validar carrinho
  ↓
  validar estoque
  ↓
  reservar estoque
  ↓
  criar pedido
  ↓
  criar order items
  ↓
  converter carrinho
  ↓
  registrar pagamento
  ↓
COMMIT
```

Se qualquer etapa falhar: `ROLLBACK`.

## Concorrência de Estoque

O sistema deve impedir overselling (dois clientes comprando o último item simultaneamente).

Implementar controle transacional/locking adequado. Nunca confiar apenas em `if quantity > 0` fora de uma transação.

## Cache (Redis)

Redis pode armazenar:

- Featured products
- Categorias
- Popular products
- Shipping configuration

Nunca cachear informações privadas de forma insegura.

Ao atualizar produto/categoria:

```
database update → invalidate cache
```
