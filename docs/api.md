# API

A API é um backend **NestJS** (porta `8080`) com prefixo global **`/api/v1`**.
A documentação interativa **OpenAPI/Swagger** está disponível em
`http://localhost:8080/api/docs` (em ambiente de desenvolvimento — não exposta
em produção).

## Padrão de resposta

Todas as respostas usam um envelope único:

```json
{
  "data": { },
  "meta": { },
  "error": null
}
```

- `data` — payload (objeto ou array)
- `meta` — metadados (ex.: paginação)
- `error` — mensagem/objeto de erro, ou `null` em sucesso

Erros de validação/negócio retornam `error` preenchido com status HTTP adequado
(400, 401, 403, 404, 409, 422, 500...).

## Autenticação

Rotas protegidas exigem o header:

```
Authorization: Bearer <accessToken>
```

O fluxo:

- `POST /auth/register` — cria conta (admin é seedado com `admin@ehorta.com.br`)
- `POST /auth/login` — retorna `{ accessToken, refreshToken }`
- `POST /auth/refresh` — renova o access token com o refresh token
- `POST /auth/logout` — invalida o refresh token
- `GET /auth/me` — usuário autenticado

## Endpoints por módulo

### Health
| Método | Rota                | Acesso |
|--------|---------------------|--------|
| GET    | `/api/v1/health`    | Público |
| GET    | `/api/v1/ready`     | Público |

### Auth
| Método | Rota                          | Acesso |
|--------|-------------------------------|--------|
| POST   | `/api/v1/auth/register`       | Público |
| POST   | `/api/v1/auth/login`          | Público |
| POST   | `/api/v1/auth/refresh`        | Público |
| POST   | `/api/v1/auth/logout`         | Autenticado |
| GET    | `/api/v1/auth/me`             | Autenticado |

### Users
| Método | Rota             | Acesso |
|--------|------------------|--------|
| GET    | `/api/v1/users/me` | Autenticado |
| PATCH  | `/api/v1/users/me` | Autenticado |
| DELETE | `/api/v1/users/me` | Autenticado |

### Addresses
| Método | Rota                          | Acesso |
|--------|-------------------------------|--------|
| GET    | `/api/v1/addresses`           | Autenticado |
| POST   | `/api/v1/addresses`           | Autenticado |
| PATCH  | `/api/v1/addresses/:id`       | Autenticado |
| DELETE | `/api/v1/addresses/:id`       | Autenticado |
| PATCH  | `/api/v1/addresses/:id/default`| Autenticado |

### Categories
| Método | Rota                     | Acesso |
|--------|--------------------------|--------|
| GET    | `/api/v1/categories`     | Público |
| GET    | `/api/v1/categories/:slug`| Público |
| POST   | `/api/v1/categories`     | Admin |
| PATCH  | `/api/v1/categories/:id` | Admin |
| DELETE | `/api/v1/categories/:id` | Admin |

### Products
| Método | Rota                                | Acesso |
|--------|-------------------------------------|--------|
| GET    | `/api/v1/products`                  | Público |
| GET    | `/api/v1/products/search`           | Público |
| GET    | `/api/v1/products/featured`         | Público |
| GET    | `/api/v1/products/best-sellers`     | Público |
| GET    | `/api/v1/products/promotions`       | Público |
| GET    | `/api/v1/products/:slug`            | Público |
| GET    | `/api/v1/products/:id/recommendations`| Público |
| POST   | `/api/v1/products`                  | Admin |
| PATCH  | `/api/v1/products/:id`              | Admin |
| DELETE | `/api/v1/products/:id`              | Admin |

### Inventory
| Método | Rota                          | Acesso |
|--------|-------------------------------|--------|
| GET    | `/api/v1/inventory`           | Público |
| GET    | `/api/v1/inventory/low-stock` | Público |
| PATCH  | `/api/v1/inventory/:productId`| Admin |

### Cart
| Método | Rota                          | Acesso |
|--------|-------------------------------|--------|
| GET    | `/api/v1/cart`                | Autenticado |
| POST   | `/api/v1/cart/items`          | Autenticado |
| PATCH  | `/api/v1/cart/items/:id`      | Autenticado |
| DELETE | `/api/v1/cart/items/:id`      | Autenticado |
| DELETE | `/api/v1/cart`                | Autenticado |

### Checkout
| Método | Rota                  | Acesso |
|--------|-----------------------|--------|
| POST   | `/api/v1/checkout`    | Autenticado |

O `POST /checkout` **exige `addressId`** (UUID), `shippingMethod` (enum
`standard`/`express`) e `paymentMethod` (`PIX`/`CARD`/`CASH`), e valida
usuário, endereço, estoque, preços, frete e promoções antes de criar o pedido.

### Orders
| Método | Rota                       | Acesso |
|--------|----------------------------|--------|
| GET    | `/api/v1/orders`           | Autenticado |
| GET    | `/api/v1/orders/:id`       | Autenticado (dono) |
| POST   | `/api/v1/orders/:id/cancel`| Autenticado (dono) |
| POST   | `/api/v1/orders/:id/repeat`| Autenticado (dono) |

### Payments
| Método | Rota                                  | Acesso |
|--------|---------------------------------------|--------|
| GET    | `/api/v1/payments/order/:orderId`     | Autenticado (dono) |
| POST   | `/api/v1/payments/order/:orderId/retry`| Autenticado |
| POST   | `/api/v1/payments/sandbox/:paymentId/simulate`| Sandbox (ver nota) |

> A rota `simulate` só existe quando `ENABLE_SANDBOX_SIMULATE=true` e é usada
> em testes/desenvolvimento para simular a confirmação do gateway.

### Webhooks
| Método | Rota                       | Acesso |
|--------|----------------------------|--------|
| POST   | `/api/v1/webhooks/payments`| Assinado (HMAC) |

O webhook é **idempotente** (Regra 5): usa `provider + event_id` para não
processar o mesmo evento duas vezes.

### Shipping
| Método | Rota                   | Acesso |
|--------|------------------------|--------|
| POST   | `/api/v1/shipping/quote`| Autenticado |

### Promotions (cupom no carrinho)
| Método | Rota                         | Acesso |
|--------|------------------------------|--------|
| POST   | `/api/v1/cart/coupon`        | Autenticado |
| DELETE | `/api/v1/cart/coupon`        | Autenticado |

### Reviews
| Método | Rota                                   | Acesso |
|--------|----------------------------------------|--------|
| GET    | `/api/v1/products/:productId/reviews`  | Público |
| GET    | `/api/v1/products/:productId/reviews/summary`| Público |
| POST   | `/api/v1/products/:productId/reviews`  | Autenticado (compra verificada) |
| GET    | `/api/v1/reviews/me`                   | Autenticado |
| DELETE | `/api/v1/reviews/:id`                  | Autenticado (dono) |

### Notifications
| Método | Rota                           | Acesso |
|--------|--------------------------------|--------|
| GET    | `/api/v1/notifications`        | Autenticado |
| GET    | `/api/v1/notifications/unread-count`| Autenticado |
| PATCH  | `/api/v1/notifications/:id/read`| Autenticado |
| PATCH  | `/api/v1/notifications/read-all`| Autenticado |

### Admin
| Método | Rota                                | Acesso |
|--------|-------------------------------------|--------|
| GET    | `/api/v1/admin/dashboard`           | Admin |
| GET    | `/api/v1/admin/products`            | Admin |
| POST   | `/api/v1/admin/products`            | Admin |
| PATCH  | `/api/v1/admin/products/:id`        | Admin |
| DELETE | `/api/v1/admin/products/:id`        | Admin |
| GET    | `/api/v1/admin/categories`          | Admin |
| POST   | `/api/v1/admin/categories`          | Admin |
| PATCH  | `/api/v1/admin/categories/:id`      | Admin |
| DELETE | `/api/v1/admin/categories/:id`      | Admin |
| GET    | `/api/v1/admin/inventory`           | Admin |
| GET    | `/api/v1/admin/inventory/low-stock` | Admin |
| GET    | `/api/v1/admin/orders`              | Admin |
| GET    | `/api/v1/admin/orders/:id`          | Admin |
| PATCH  | `/api/v1/admin/orders/:id/status`   | Admin |
| GET    | `/api/v1/admin/promotions`          | Admin |
| GET    | `/api/v1/admin/promotions/:id`      | Admin |
| POST   | `/api/v1/admin/promotions`          | Admin |
| PATCH  | `/api/v1/admin/promotions/:id`      | Admin |
| DELETE | `/api/v1/admin/promotions/:id`      | Admin |
| GET    | `/api/v1/admin/users`               | Admin |
| GET    | `/api/v1/admin/reviews`             | Admin |
| PATCH  | `/api/v1/admin/reviews/:id/status`  | Admin |

> A lista completa e atual de parâmetros/body/erros é mantida pelo **Swagger**:
> `http://localhost:8080/api/docs`.
