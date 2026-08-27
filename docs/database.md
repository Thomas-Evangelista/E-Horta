# Banco de Dados

- **SGBD**: PostgreSQL 16 (`postgres:16-alpine` no Docker)
- **ORM**: Prisma (`prisma/schema.prisma`)
- **Migrations**: `prisma/migrations`
- **Convenção**: tabelas em snake_case via `@@map`; colunas snake_case via `@map`

## Conectando

A URL é definida pela variável `DATABASE_URL`. No Docker compose há um banco
principal (`e_horta`) e há um **banco de testes isolado** (`e_horta_test`),
usado pelos testes de integração da API (spec 22).

```bash
pnpm db:generate   # Gerar Prisma Client
pnpm db:migrate    # Criar/aplicar migrations (dev)
pnpm db:deploy     # Aplicar migrations pendentes (sem criar novas)
pnpm db:seed       # Popular o banco com dados iniciais
pnpm db:reset      # Resetar o banco (roda seed ao final)
```

## Enums

| Enum            | Valores |
|-----------------|---------|
| `UserRole`      | `CUSTOMER`, `OPERATOR`, `ADMIN` |
| `UserStatus`    | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `ProductUnit`   | `UN`, `KG`, `G`, `PACK`, `BUNCH` |
| `CartStatus`    | `ACTIVE`, `CONVERTED`, `ABANDONED` |
| `PromotionType` | `PERCENTAGE`, `FIXED`, `FREE_SHIPPING` |
| `OrderStatus`   | `PENDING_PAYMENT`, `PAYMENT_APPROVED`, `PREPARING`, `READY_FOR_DELIVERY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `APPROVED`, `FAILED`, `REFUNDED`, `CANCELLED` |
| `PaymentMethod` | `PIX`, `CARD`, `CASH` |
| `ShippingStatus`| `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `RETURNED` |
| `ReviewStatus`  | `PENDING`, `APPROVED`, `REJECTED` |

## Modelos

### User (`users`)
Conta de usuário: `name`, `email` (único), `phone` (único), `passwordHash`,
`role`, `status`. Relaciona-se com endereços, pedidos, carrinho, avaliações,
notificações, audit logs e refresh tokens.

### Address (`addresses`)
Endereço de entrega vinculado ao `user_id`, com `zipCode`, `street`, `number`,
`neighborhood`, `city`, `state`, `country`, `isDefault`.

### Category (`categories`)
Categoria do catálogo com `slug` único, `imageUrl`, `isActive`, `sortOrder`.

### Product (`products`)
Produto vinculado a uma `category_id`, com `slug` e `sku` únicos, `unit`,
`weight`, `price`, `compareAtPrice`, `costPrice`, `imageUrl`, `isActive`,
`isFeatured`. Possui inventário, itens de carrinho/pedido, imagens e avaliações.

### ProductImage (`product_images`)
Imagens adicionais de um produto (URL, `alt`, `sortOrder`).

### Inventory (`inventory`)
Estoque por produto (1:1): `quantity`, `reservedQuantity`, `minimumStock`.
**Regra 2** — nunca deve permitir estoque negativo.

### Cart (`carts`) + CartItem (`cart_items`)
Carrinho (1:1 com usuário, opcional), com `couponId` opcional e `status`.
Itens referenciam produto e congelam `unitPrice`.

### Promotion (`promotions`) + PromotionUsage (`promotion_usages`)
Cupons/promoções: `code` único, `type` (porcentagem/fixo/frete grátis), `value`,
`minimumOrderValue`, `maxDiscount`, período `startsAt/endsAt`, `usageLimit`/
`usageCount`, `isActive`. Usos registrados por pedido/usuário.

### Order (`orders`), OrderItem (`order_items`), Payment (`payments`), Shipping (`shippings`)
- **Order**: `orderNumber` único, `user_id`, `status`, `paymentStatus`,
  `shippingStatus`, `subtotal`, `discount`, `shippingFee`, `total`,
  **`addressSnapshot` (JSON)** — Regra 6 (snapshot). Aceita `notes`,
  `cancelledAt`, `cancellationReason`.
- **OrderItem**: snapshot de `productName`/`sku`, `unitPrice`, `quantity`,
  `total` por item.
- **Payment**: método (`PIX`/`CARD`/`CASH`), `status`, `transactionId`,
  `amount`, `metadata`, `paidAt`.
- **Shipping**: `method`, `status`, `trackingCode`, `estimatedDays`,
  `shippedAt`, `deliveredAt`.

### Review (`reviews`)
Avaliação `rating` (1-5) + `comment`, `status` (moderação), com `orderId`
opcional para compra verificada. `@@unique([userId, productId])`.

### Notification (`notifications`)
Notificação por usuário (`title`, `message`, `read`).

### RefreshToken (`refresh_tokens`)
Hash do refresh token por usuário com `expiresAt`.

### WebhookEvent (`webhook_events`)
Eventos de webhook processados, com `@@unique([provider, eventId])` para
garantir **idempotência** (Regra 5).

### AuditLog (`audit_logs`)
Trilha de auditoria: `action`, `entity`, `entityId`, `metadata`, `ip`,
`userAgent`.

## Relacionamentos (resumo)

```
User 1──N Address
User 1──1 Cart
Cart 1──N CartItem N──1 Product
Category 1──N Product
Product 1──1 Inventory
Product 1──N ProductImage
Product 1──N Review
User 1──N Order
Order 1──N OrderItem N──1 Product
Order 1──N Payment
Order 1──1 Shipping
Promotion 1──N PromotionUsage
User 1──N Notification
User 1──1 RefreshToken
WebhookEvent (independente)
AuditLog N──1 User
```
