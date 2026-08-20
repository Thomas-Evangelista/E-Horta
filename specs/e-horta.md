# SPEC TÉCNICA — E-Horta

## 1. VISÃO GERAL

### Nome do projeto

**E-Horta**

### Slogan

**Fresquinho na sua porta.**

### Objetivo

Construir uma plataforma de e-commerce full stack, mobile-first, especializada na venda de hortaliças e produtos frescos.

O sistema deverá permitir que clientes:

* criem uma conta;
* pesquisem produtos;
* naveguem por categorias;
* visualizem detalhes;
* adicionem produtos ao carrinho;
* alterem quantidades;
* informem endereço;
* escolham entrega;
* escolham forma de pagamento;
* realizem pagamento;
* acompanhem pedidos;
* consultem histórico;
* repitam pedidos anteriores.

O sistema também deverá possuir uma área administrativa para:

* cadastrar produtos;
* gerenciar categorias;
* controlar estoque;
* acompanhar pedidos;
* atualizar status;
* gerenciar preços;
* gerenciar promoções;
* visualizar clientes;
* controlar disponibilidade.

O projeto deverá ser desenvolvido como uma aplicação real, preparada para produção, e não como protótipo.

---

# 2. OBJETIVOS DE PRODUTO

## Objetivo principal

Reduzir ao máximo a quantidade de ações necessárias para realizar uma compra.

Fluxo principal:

```text
Home
  ↓
Produto
  ↓
Adicionar
  ↓
Carrinho
  ↓
Checkout
  ↓
Pagamento
  ↓
Pedido confirmado
```

Para usuários autenticados:

```text
Home
  ↓
Adicionar produtos
  ↓
Carrinho
  ↓
Finalizar compra
```

## Princípios

1. Mobile-first
2. Poucos cliques
3. Interface simples
4. Checkout curto
5. API REST
6. Segurança desde o início
7. Arquitetura modular
8. Código tipado
9. Testes automatizados
10. Acessibilidade
11. Performance
12. Observabilidade
13. Escalabilidade

---

# 3. STACK PRINCIPAL

Utilizar TypeScript em todo o projeto.

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Hook Form
* Zod
* TanStack Query
* Zustand
* Lucide React
* Framer Motion

## Backend

* Node.js
* NestJS
* TypeScript
* REST API
* Swagger/OpenAPI
* Prisma ORM
* Zod/class-validator para validação
* JWT
* bcrypt/Argon2 para senhas

## Banco de dados

* PostgreSQL

## Cache

* Redis

Utilizar Redis para:

* cache;
* rate limiting;
* sessões temporárias quando necessário;
* locks de operações críticas;
* filas, caso seja utilizado BullMQ.

## Filas

* BullMQ
* Redis

Utilizar filas para tarefas assíncronas:

* envio de e-mails;
* notificações;
* processamento de pedidos;
* atualização de status;
* processamento de webhooks;
* tarefas administrativas.

## Storage

Utilizar armazenamento compatível com S3 para:

* imagens dos produtos;
* imagens de categorias;
* documentos eventualmente necessários.

Não armazenar imagens diretamente no PostgreSQL.

## Infraestrutura

* Docker
* Docker Compose para ambiente local
* Nginx ou reverse proxy equivalente
* PostgreSQL
* Redis

## Testes

Frontend:

* Vitest
* React Testing Library
* Playwright

Backend:

* Jest
* Supertest

## Qualidade

* ESLint
* Prettier
* Husky
* lint-staged
* TypeScript strict mode

---

# 4. ARQUITETURA DO PROJETO

Utilizar monorepo.

Estrutura:

```text
e-horta/
│
├── apps/
│   │
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── types/
│   │   └── tests/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   └── main.ts
│   │   └── test/
│   │
│   └── admin/
│
├── packages/
│   │
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── eslint-config/
│   └── tsconfig/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
│
├── docs/
│
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Utilizar **pnpm workspaces**.

---

# 5. ARQUITETURA BACKEND

O backend deverá seguir arquitetura modular.

Estrutura:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── addresses/
│   ├── categories/
│   ├── products/
│   ├── inventory/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── payments/
│   ├── shipping/
│   ├── promotions/
│   ├── notifications/
│   ├── reviews/
│   └── admin/
│
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   ├── exceptions/
│   └── utils/
│
├── config/
├── database/
└── main.ts
```

Cada módulo deve possuir separação entre:

```text
controller
service
repository
dto
entity/model
mapper
tests
```

Não colocar regra de negócio dentro dos controllers.

Controllers devem:

1. receber request;
2. validar entrada;
3. chamar service;
4. retornar response.

A regra de negócio deve permanecer nos services/use cases.

---

# 6. API REST

Base URL:

```text
/api/v1
```

Todas as respostas devem utilizar JSON.

Exemplo:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Para erro:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Existem campos inválidos.",
    "details": []
  }
}
```

Utilizar HTTP status codes corretamente.

### Principais

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

# 7. VERSIONAMENTO DA API

Todas as APIs devem possuir versão.

Exemplo:

```text
/api/v1/products
/api/v1/orders
/api/v1/cart
```

Nunca quebrar contratos existentes sem criar uma nova versão.

---

# 8. AUTENTICAÇÃO

Implementar autenticação baseada em JWT.

Fluxo:

```text
Login
 ↓
Access Token
 ↓
Refresh Token
```

Access token deve possuir validade curta.

Refresh token deve possuir rotação.

Nunca armazenar senha em texto puro.

Utilizar Argon2id ou bcrypt com configuração segura.

Endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me
```

---

# 9. ROLES

Criar RBAC.

Roles:

```text
CUSTOMER
ADMIN
OPERATOR
```

Customer:

* comprar;
* visualizar pedidos;
* alterar dados próprios.

Operator:

* visualizar pedidos;
* atualizar status;
* controlar operações.

Admin:

* acesso completo;
* produtos;
* categorias;
* estoque;
* promoções;
* usuários;
* pedidos;
* configurações.

Nunca confiar na role enviada pelo frontend.

A autorização deve ser validada no backend.

---

# 10. USUÁRIO

Entidade:

```text
User
```

Campos:

```text
id
name
email
phone
passwordHash
role
status
createdAt
updatedAt
```

Status:

```text
ACTIVE
INACTIVE
BLOCKED
```

E-mail deve ser único.

Telefone deve ser normalizado.

---

# 11. ENDEREÇOS

Um usuário pode possuir múltiplos endereços.

Entidade:

```text
Address
```

Campos:

```text
id
userId
label
zipCode
street
number
complement
neighborhood
city
state
country
isDefault
createdAt
updatedAt
```

Exemplos de label:

```text
Casa
Trabalho
Outro
```

Regra:

Um usuário pode possuir somente um endereço padrão.

---

# 12. CATEGORIAS

Entidade:

```text
Category
```

Campos:

```text
id
name
slug
description
imageUrl
isActive
sortOrder
createdAt
updatedAt
```

Categorias iniciais:

```text
Verduras
Legumes
Tubérculos
Frutas
```

Permitir subcategorias futuramente.

---

# 13. PRODUTOS

Entidade:

```text
Product
```

Campos:

```text
id
categoryId
name
slug
description
shortDescription
sku
unit
weight
price
compareAtPrice
costPrice
imageUrl
isActive
isFeatured
createdAt
updatedAt
```

Unidades possíveis:

```text
UN
KG
G
PACK
BUNCH
```

Exemplos:

```text
Alface
1 unidade

Tomate
500 g

Batata
1 kg
```

---

# 14. PREÇO

Nunca utilizar float para dinheiro.

Utilizar:

```text
Decimal
```

ou representação inteira em centavos.

Exemplo:

```text
R$ 6,90
```

armazenado como:

```text
690
```

ou Decimal equivalente.

Toda operação financeira deve evitar problemas de precisão.

---

# 15. ESTOQUE

Entidade:

```text
Inventory
```

Campos:

```text
id
productId
quantity
reservedQuantity
minimumStock
updatedAt
```

Estoque disponível:

```text
available = quantity - reservedQuantity
```

Nunca permitir estoque negativo.

---

# 16. RESERVA DE ESTOQUE

Durante o checkout:

```text
Produto
 ↓
Verificar estoque
 ↓
Reservar estoque
 ↓
Criar pedido
 ↓
Pagamento
```

Se o pagamento falhar:

```text
Liberar reserva
```

Se o pagamento for confirmado:

```text
Confirmar baixa do estoque
```

A operação deve utilizar transação de banco e mecanismo de concorrência para impedir overselling.

Não confiar somente na validação feita no frontend.

---

# 17. CARRINHO

Entidades:

```text
Cart
CartItem
```

Cart:

```text
id
userId
status
createdAt
updatedAt
```

Status:

```text
ACTIVE
CONVERTED
ABANDONED
```

CartItem:

```text
id
cartId
productId
quantity
unitPrice
createdAt
updatedAt
```

Regra importante:

O preço exibido no carrinho deve ser recalculado pelo backend.

Nunca confiar no preço enviado pelo frontend.

---

# 18. OPERAÇÕES DO CARRINHO

Endpoints:

```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
DELETE /api/v1/cart
```

Ao adicionar:

```json
{
  "productId": "uuid",
  "quantity": 2
}
```

O backend deverá:

1. validar produto;
2. verificar disponibilidade;
3. buscar preço atual;
4. atualizar quantidade;
5. recalcular totais;
6. retornar carrinho atualizado.

---

# 19. CHECKOUT

Endpoint:

```text
POST /api/v1/checkout
```

O checkout deverá:

1. validar usuário;
2. validar endereço;
3. validar produtos;
4. validar estoque;
5. recalcular preços;
6. aplicar promoções;
7. calcular entrega;
8. criar reserva;
9. criar pedido;
10. iniciar pagamento;
11. retornar dados do pagamento.

O frontend nunca deve calcular o valor final.

---

# 20. PEDIDOS

Entidades:

```text
Order
OrderItem
```

Order:

```text
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

OrderItem:

```text
id
orderId
productId
productNameSnapshot
skuSnapshot
unitPrice
quantity
total
```

Utilizar snapshots para preservar as informações do momento da compra.

Se o nome ou preço do produto mudar posteriormente, o pedido antigo não deve mudar.

---

# 21. STATUS DO PEDIDO

```text
PENDING_PAYMENT
PAYMENT_APPROVED
PREPARING
READY_FOR_DELIVERY
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

Fluxo normal:

```text
PENDING_PAYMENT
        ↓
PAYMENT_APPROVED
        ↓
PREPARING
        ↓
READY_FOR_DELIVERY
        ↓
OUT_FOR_DELIVERY
        ↓
DELIVERED
```

Não permitir transições inválidas.

Exemplo:

```text
DELIVERED → PREPARING
```

deve ser bloqueado.

As transições devem ser controladas pelo backend.

---

# 22. PAGAMENTOS

Criar uma abstração:

```text
PaymentProvider
```

Não acoplar a aplicação diretamente a um único gateway.

Interface conceitual:

```text
createPayment()
getPayment()
cancelPayment()
refundPayment()
```

Formas iniciais:

```text
PIX
CARD
CASH
```

A implementação do gateway deve ser configurável através de variáveis de ambiente.

---

# 23. PIX

Fluxo:

```text
Checkout
 ↓
Criar cobrança Pix
 ↓
Retornar QR Code
 ↓
Usuário paga
 ↓
Gateway envia webhook
 ↓
Backend valida webhook
 ↓
Pagamento aprovado
 ↓
Atualizar pedido
 ↓
Confirmar estoque
```

Nunca considerar um pagamento confirmado somente porque o frontend informou sucesso.

O status oficial deve vir do gateway/webhook.

---

# 24. WEBHOOKS

Criar:

```text
POST /api/v1/webhooks/payments
```

Requisitos:

* validar assinatura;
* validar evento;
* impedir processamento duplicado;
* utilizar idempotência;
* registrar evento;
* atualizar pagamento;
* atualizar pedido;
* atualizar estoque.

Criar entidade:

```text
WebhookEvent
```

Campos:

```text
id
provider
eventId
eventType
payload
processedAt
createdAt
```

`provider + eventId` deve ser único.

---

# 25. IDEMPOTÊNCIA

Operações críticas devem suportar idempotency key.

Principalmente:

```text
POST /checkout
POST /payments
POST /orders
```

Exemplo:

```http
Idempotency-Key: UUID
```

Se a mesma requisição for enviada novamente, não criar pedido duplicado.

---

# 26. ENTREGA

Criar módulo:

```text
shipping
```

A primeira versão poderá trabalhar com regras configuráveis.

Exemplo:

```text
Entrega padrão
R$ 9,90
1–2 dias

Entrega expressa
R$ 14,90
Mesmo dia
```

As regras devem ser configuráveis.

Nunca deixar o frontend determinar o valor do frete.

Endpoint:

```text
POST /api/v1/shipping/quote
```

Request:

```json
{
  "addressId": "uuid",
  "items": []
}
```

Response:

```json
{
  "options": [
    {
      "id": "standard",
      "name": "Entrega padrão",
      "price": 9.9,
      "estimatedDays": 2
    }
  ]
}
```

---

# 27. PROMOÇÕES

Criar módulo independente.

Entidade:

```text
Promotion
```

Campos:

```text
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

Tipos:

```text
PERCENTAGE
FIXED
FREE_SHIPPING
```

Regras:

* promoção precisa estar ativa;
* data deve estar dentro do período;
* código deve ser válido;
* limite de uso deve ser respeitado;
* pedido mínimo deve ser respeitado;
* desconto máximo deve ser respeitado.

O desconto sempre deve ser calculado no backend.

---

# 28. CUPOM

Endpoint:

```text
POST /api/v1/cart/coupon
DELETE /api/v1/cart/coupon
```

Nunca confiar no desconto enviado pelo cliente.

---

# 29. PRODUTOS EM DESTAQUE

Suportar:

```text
featured
best sellers
promotions
recently purchased
```

Endpoints:

```text
GET /api/v1/products/featured
GET /api/v1/products/best-sellers
GET /api/v1/products/promotions
GET /api/v1/products/recommendations
```

---

# 30. BUSCA

Criar:

```text
GET /api/v1/products/search?q=tomate
```

Permitir busca por:

* nome;
* SKU;
* categoria.

Implementar inicialmente busca PostgreSQL.

Preparar arquitetura para futuramente utilizar:

* Elasticsearch;
* Meilisearch;
* OpenSearch.

---

# 31. PAGINAÇÃO

Todas as listagens devem possuir paginação.

Preferencialmente cursor pagination para grandes conjuntos.

Para primeira versão:

```text
page
limit
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Limitar `limit` no backend.

---

# 32. FILTROS

Produtos devem aceitar:

```text
category
minPrice
maxPrice
search
featured
available
promotion
sort
page
limit
```

Exemplo:

```text
GET /api/v1/products?category=verduras&available=true&sort=price_asc
```

---

# 33. REVIEWS

Criar módulo de avaliações.

Entidade:

```text
Review
```

Campos:

```text
id
userId
productId
orderItemId
rating
comment
status
createdAt
updatedAt
```

Somente usuários que compraram o produto poderão avaliar.

Rating:

```text
1 a 5
```

---

# 34. NOTIFICAÇÕES

Criar módulo:

```text
notifications
```

Suportar inicialmente:

* e-mail;
* notificações internas.

Eventos:

```text
Conta criada
Pedido criado
Pagamento aprovado
Pedido preparado
Pedido saiu para entrega
Pedido entregue
Pagamento falhou
```

Utilizar fila assíncrona.

---

# 35. ADMIN

Criar aplicação administrativa separada.

Dashboard:

```text
Pedidos hoje
Vendas hoje
Pedidos pendentes
Produtos com estoque baixo
Produtos ativos
Clientes
```

Tela de produtos:

* listar;
* criar;
* editar;
* ativar/desativar;
* alterar preço;
* alterar estoque;
* upload de imagens.

Tela de pedidos:

* listar;
* filtrar;
* visualizar;
* atualizar status.

Tela de categorias:

* criar;
* editar;
* ordenar;
* ativar/desativar.

Tela de promoções:

* criar;
* editar;
* ativar;
* desativar.

---

# 36. API ADMIN

Endpoints:

```text
GET    /api/v1/admin/dashboard

GET    /api/v1/admin/products
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id

GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status

GET    /api/v1/admin/users
GET    /api/v1/admin/inventory

POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
```

Todos devem possuir autorização baseada em role.

---

# 37. FRONTEND — ESTRUTURA

Utilizar Next.js App Router.

Estrutura:

```text
app/
├── page.tsx
├── login/
├── cadastro/
├── categorias/
├── produtos/
│   └── [slug]/
├── busca/
├── carrinho/
├── checkout/
├── pedidos/
│   ├── page.tsx
│   └── [id]/
├── conta/
└── layout.tsx
```

Componentes:

```text
components/
├── ui/
├── layout/
├── product/
├── cart/
├── checkout/
├── order/
├── forms/
└── feedback/
```

---

# 38. FRONTEND STATE MANAGEMENT

Utilizar:

### TanStack Query

Para:

* GET de API;
* cache;
* mutations;
* invalidação;
* loading;
* error;
* refetch.

### Zustand

Para estado local/global de UI:

* carrinho temporário quando necessário;
* preferências;
* filtros;
* UI state.

Não duplicar indiscriminadamente dados da API no Zustand.

A API deve ser a fonte de verdade.

---

# 39. FORMULÁRIOS

Utilizar:

```text
React Hook Form
+
Zod
```

Validação no frontend para UX.

Validação obrigatória novamente no backend para segurança.

Nunca confiar somente no frontend.

---

# 40. LAYOUT MOBILE

Tela:

```text
┌─────────────────────────┐
│ Olá, João        🛒     │
│ Entregar em...          │
├─────────────────────────┤
│ 🔎 Buscar produtos      │
├─────────────────────────┤
│ Banner                  │
├─────────────────────────┤
│ Categorias              │
│ 🥬 🥕 🥔 🍅             │
├─────────────────────────┤
│ Ofertas                 │
│ ┌──────┐ ┌──────┐       │
│ │foto  │ │foto  │       │
│ │nome  │ │nome  │       │
│ │preço │ │preço │       │
│ │ +    │ │ +    │       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ Mais vendidos           │
├─────────────────────────┤
│                         │
├─────────────────────────┤
│ 🏠  📂  🔎  📦  👤     │
└─────────────────────────┘
```

---

# 41. DESIGN SYSTEM

Criar tokens:

```text
colors
typography
spacing
radius
shadow
z-index
breakpoints
```

Utilizar Tailwind como camada de implementação.

Criar componentes acessíveis e reutilizáveis.

---

# 42. ACESSIBILIDADE

Seguir WCAG 2.2 AA como referência de implementação.

Obrigatório:

* HTML semântico;
* labels;
* aria-label quando necessário;
* foco visível;
* navegação por teclado;
* contraste adequado;
* suporte a leitores de tela;
* mensagens de erro acessíveis;
* estados de loading acessíveis;
* não depender apenas de cor;
* botões com tamanho adequado;
* imagens com alt;
* heading hierarchy.

---

# 43. ANIMAÇÕES

Utilizar Framer Motion com moderação.

Animações:

### Adicionar produto

```text
Produto
↓
micro scale
↓
contador do carrinho
↓
toast
```

### Modal

Fade + scale.

### Drawer

Slide.

### Página

Fade curto.

### Checkout

Transições suaves.

Respeitar:

```text
prefers-reduced-motion
```

Usuários que solicitarem redução de movimento não devem receber animações desnecessárias.

---

# 44. UX DE ERROS

Criar tratamento global de erros.

Categorias:

```text
NETWORK_ERROR
VALIDATION_ERROR
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
NOT_FOUND
CONFLICT
OUT_OF_STOCK
PAYMENT_ERROR
SHIPPING_ERROR
UNKNOWN_ERROR
```

Nunca exibir stack trace para usuário.

Exibir mensagem amigável.

Registrar detalhes técnicos somente nos logs.

---

# 45. SEGURANÇA

Implementar:

* Helmet;
* CORS configurado;
* rate limiting;
* validação de payload;
* sanitização;
* proteção contra SQL injection via ORM;
* proteção contra XSS;
* cookies seguros quando aplicável;
* HTTPS em produção;
* secrets via environment;
* logs sem dados sensíveis.

Nunca logar:

* senha;
* token;
* CVV;
* dados completos de cartão;
* secrets.

---

# 46. LGPD

O projeto deverá ser preparado para LGPD.

Implementar:

* política de privacidade;
* consentimento quando necessário;
* finalidade de coleta;
* exclusão de conta;
* exportação de dados quando aplicável;
* minimização de dados;
* controle de acesso;
* logs de auditoria.

Criar endpoint:

```text
DELETE /api/v1/users/me
```

Quando a exclusão física não for possível por obrigação legal, aplicar anonimização adequada.

---

# 47. AUDITORIA

Criar:

```text
AuditLog
```

Registrar ações administrativas importantes:

```text
USER_CREATED
PRODUCT_CREATED
PRODUCT_UPDATED
PRICE_CHANGED
STOCK_CHANGED
ORDER_STATUS_CHANGED
PROMOTION_CREATED
USER_BLOCKED
```

Campos:

```text
id
userId
action
entity
entityId
metadata
ip
userAgent
createdAt
```

Não armazenar informações sensíveis desnecessárias.

---

# 48. LOGGING

Utilizar logger estruturado.

Cada request deve possuir:

```text
requestId
```

Logs devem permitir rastrear:

```text
request
user
endpoint
status
duration
error
```

Separar:

```text
INFO
WARN
ERROR
DEBUG
```

Nunca colocar secrets nos logs.

---

# 49. OBSERVABILIDADE

Preparar arquitetura para:

* métricas;
* health checks;
* logs estruturados;
* tracing futuramente.

Endpoints:

```text
GET /health
GET /ready
```

Health check deve verificar:

* aplicação;
* PostgreSQL;
* Redis.

---

# 50. BANCO DE DADOS

Modelos principais:

```text
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

Relacionamentos devem ser definidos através do Prisma.

Utilizar UUID para IDs públicos.

Criar índices para:

```text
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
WebhookEvent.provider + eventId
```

---

# 51. TRANSAÇÕES

Operações críticas devem utilizar database transactions.

Exemplo de criação do pedido:

```text
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

Se qualquer etapa falhar:

```text
ROLLBACK
```

---

# 52. CONCORRÊNCIA DE ESTOQUE

O sistema deve impedir:

```text
Cliente A compra último item
Cliente B compra último item simultaneamente
```

Implementar controle transacional/locking adequado.

Nunca confiar apenas em:

```text
if quantity > 0
```

fora de uma transação.

---

# 53. CACHE

Redis pode armazenar:

```text
featured products
categories
popular products
shipping configuration
```

Nunca cachear de maneira insegura informações privadas.

Ao atualizar produto/categoria:

```text
database update
↓
invalidate cache
```

---

# 54. PERFORMANCE

Frontend:

* imagens WebP/AVIF;
* lazy loading;
* responsive images;
* code splitting;
* Server Components quando apropriado;
* cache;
* prefetch controlado.

Backend:

* paginação;
* índices;
* cache;
* queries eficientes;
* evitar N+1;
* processamento assíncrono.

Objetivo:

Experiência rápida em redes móveis.

---

# 55. SEO

Implementar SEO para páginas públicas.

Produtos:

```text
title
description
canonical
Open Graph
structured data
```

Categorias também devem ser indexáveis.

Utilizar dados estruturados de produto quando aplicável.

---

# 56. RESPONSIVIDADE

Breakpoints:

```text
mobile
tablet
desktop
large desktop
```

Não criar layouts separados desnecessariamente.

Utilizar CSS responsivo.

---

# 57. PWA

Preparar o frontend para PWA futuramente.

Estrutura compatível com:

* manifest;
* service worker;
* instalação;
* offline básico.

A primeira versão não precisa implementar offline completo, mas a arquitetura não deve impedir essa evolução.

---

# 58. VARIÁVEIS DE AMBIENTE

Criar:

```text
.env.example
```

Exemplo:

```text
DATABASE_URL=
REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

PAYMENT_PROVIDER=
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

NEXT_PUBLIC_API_URL=
```

Nunca versionar `.env`.

---

# 59. DOCKER

Criar ambiente local com:

```text
web
api
postgres
redis
```

Opcional:

```text
minio
```

para simular S3 localmente.

Comando esperado:

```bash
docker compose up -d
```

---

# 60. DATABASE SEED

Criar seed inicial contendo:

Categorias:

```text
Verduras
Legumes
Tubérculos
Frutas
```

Produtos de exemplo:

```text
Alface
Rúcula
Couve
Tomate
Cenoura
Abobrinha
Batata
Batata-doce
Mandioca
Banana
```

Criar usuário administrativo inicial somente para ambiente de desenvolvimento.

Nunca utilizar senha administrativa fixa em produção.

---

# 61. TESTES UNITÁRIOS

Cobrir principalmente:

* cálculo de carrinho;
* cálculo de desconto;
* cálculo de frete;
* validação de estoque;
* reserva de estoque;
* transição de pedido;
* autorização;
* autenticação;
* validação de cupons;
* processamento de webhook;
* idempotência.

---

# 62. TESTES DE INTEGRAÇÃO

Testar:

```text
register
login
products
cart
checkout
order
payment webhook
inventory
```

Utilizar banco de testes isolado.

---

# 63. E2E

Criar fluxo principal:

```text
Abrir Home
 ↓
Buscar tomate
 ↓
Abrir produto
 ↓
Adicionar
 ↓
Abrir carrinho
 ↓
Checkout
 ↓
Endereço
 ↓
Pagamento
 ↓
Pedido criado
```

Também testar:

```text
estoque insuficiente
pagamento recusado
cupom inválido
usuário não autenticado
produto indisponível
```

---

# 64. CI/CD

Criar pipeline:

```text
install
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
 ↓
e2e
```

Pull Request não deve ser aprovado se:

* lint falhar;
* TypeScript falhar;
* testes falharem;
* build falhar.

---

# 65. DOCUMENTAÇÃO

Criar:

```text
README.md
docs/architecture.md
docs/api.md
docs/database.md
docs/deployment.md
docs/business-rules.md
```

A API deverá possuir documentação OpenAPI/Swagger.

Disponibilizar:

```text
/api/docs
```

em ambiente de desenvolvimento.

---

# 66. CONTRATO DA API

Criar schemas consistentes.

Exemplo:

```json
{
  "data": {
    "id": "uuid",
    "name": "Tomate italiano",
    "price": 6.9
  },
  "meta": {}
}
```

Listagem:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Erro:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Produto sem estoque disponível.",
    "details": {
      "productId": "uuid"
    }
  }
}
```

---

# 67. REGRAS DE NEGÓCIO PRINCIPAIS

## Regra 1 — preço

O frontend nunca define o preço final.

O backend sempre consulta o preço atual.

## Regra 2 — estoque

Nunca permitir estoque negativo.

## Regra 3 — checkout

O pedido só pode ser criado após validar:

* usuário;
* endereço;
* estoque;
* preços;
* frete;
* promoções.

## Regra 4 — pagamento

Pagamento confirmado somente através de resposta confiável do gateway/webhook.

## Regra 5 — webhook

Webhook deve ser idempotente.

## Regra 6 — pedido

Pedido deve possuir snapshot dos produtos e endereço.

## Regra 7 — promoção

Promoções são calculadas pelo backend.

## Regra 8 — autorização

Toda operação administrativa deve ser autorizada no backend.

## Regra 9 — carrinho

Carrinho pode ser alterado até o início do checkout.

## Regra 10 — pedido pago

Depois de pago, alterações sensíveis devem ser controladas pelo fluxo administrativo.

---

# 68. FLUXO COMPLETO DE COMPRA

```text
CLIENTE
  ↓
HOME
  ↓
BUSCA/CATEGORIA
  ↓
PRODUTO
  ↓
ADICIONAR
  ↓
CARRINHO
  ↓
CHECKOUT
  ↓
VALIDAR USUÁRIO
  ↓
VALIDAR ENDEREÇO
  ↓
VALIDAR ESTOQUE
  ↓
CALCULAR PREÇOS
  ↓
APLICAR CUPOM
  ↓
CALCULAR ENTREGA
  ↓
RESERVAR ESTOQUE
  ↓
CRIAR PEDIDO
  ↓
CRIAR PAGAMENTO
  ↓
AGUARDAR CONFIRMAÇÃO
  ↓
WEBHOOK
  ↓
PAGAMENTO APROVADO
  ↓
CONFIRMAR ESTOQUE
  ↓
PEDIDO = PAYMENT_APPROVED
  ↓
SEPARAÇÃO
  ↓
ENTREGA
  ↓
PEDIDO = DELIVERED
```

---

# 69. FLUXO DE PAGAMENTO RECUSADO

```text
Checkout
 ↓
Criar pagamento
 ↓
Pagamento recusado
 ↓
Pedido permanece pendente/falha
 ↓
Liberar reserva
 ↓
Informar usuário
 ↓
Permitir nova tentativa
```

Não criar outro pedido automaticamente para cada tentativa de pagamento.

---

# 70. FLUXO DE ESTOQUE INSUFICIENTE

```text
Checkout
 ↓
Validar estoque
 ↓
Estoque insuficiente
 ↓
Não criar pedido
 ↓
Retornar OUT_OF_STOCK
 ↓
Frontend informa produto/quantidade
 ↓
Usuário ajusta carrinho
```

---

# 71. FLUXO DE USUÁRIO NÃO AUTENTICADO

Permitir navegação pública.

O usuário poderá:

* visualizar produtos;
* buscar;
* navegar categorias.

Ao iniciar checkout:

```text
Carrinho
 ↓
Login/Cadastro
 ↓
Checkout
```

Preservar o carrinho durante o processo.

---

# 72. CARRINHO ANÔNIMO

Implementar inicialmente suporte a carrinho anônimo utilizando identificador seguro no cliente.

Quando o usuário realizar login:

```text
cart anonymous
+
cart user
↓
merge
↓
cart final
```

Resolver conflitos de quantidade respeitando estoque.

---

# 73. OBSERVAÇÕES IMPORTANTES PARA O CODEX

Não implementar tudo como um único arquivo ou módulo gigante.

Não colocar regras de negócio em componentes React.

Não colocar SQL diretamente em controllers.

Não duplicar regras de cálculo no frontend e backend.

O backend é a fonte de verdade para:

* preço;
* estoque;
* desconto;
* frete;
* pedido;
* pagamento.

Criar abstrações somente quando houver necessidade real.

Evitar overengineering.

Priorizar código simples, testável e modular.

---

# 74. ORDEM DE IMPLEMENTAÇÃO

Implementar em fases.

## Fase 1 — Fundação

* monorepo;
* Next.js;
* NestJS;
* PostgreSQL;
* Prisma;
* Redis;
* Docker;
* ESLint;
* Prettier;
* CI.

## Fase 2 — Autenticação

* cadastro;
* login;
* JWT;
* refresh;
* roles;
* usuário;
* endereço.

## Fase 3 — Catálogo

* categorias;
* produtos;
* imagens;
* busca;
* filtros;
* paginação.

## Fase 4 — Carrinho

* carrinho;
* itens;
* quantidade;
* estoque;
* preços.

## Fase 5 — Checkout

* endereço;
* frete;
* descontos;
* criação do pedido.

## Fase 6 — Pagamento

* abstração de gateway;
* Pix;
* webhook;
* idempotência.

## Fase 7 — Pedidos

* status;
* acompanhamento;
* histórico;
* repetir pedido.

## Fase 8 — Administração

* dashboard;
* produtos;
* categorias;
* estoque;
* pedidos;
* promoções;
* usuários.

## Fase 9 — Qualidade

* testes;
* acessibilidade;
* performance;
* SEO;
* observabilidade.

---

# 75. DEFINITION OF DONE

Uma funcionalidade somente será considerada concluída quando:

* backend implementado;
* endpoint documentado;
* validação implementada;
* autorização implementada quando necessário;
* frontend integrado;
* loading implementado;
* empty state implementado;
* error state implementado;
* success state implementado;
* testes implementados;
* TypeScript sem erros;
* ESLint sem erros;
* responsividade validada;
* acessibilidade considerada;
* documentação atualizada.

---

# 76. CRITÉRIOS DE ACEITE DO MVP

O MVP estará pronto quando um usuário conseguir:

1. acessar a Home;
2. navegar pelas categorias;
3. buscar produtos;
4. visualizar um produto;
5. adicionar produto;
6. alterar quantidade;
7. visualizar o carrinho;
8. criar uma conta;
9. cadastrar endereço;
10. escolher entrega;
11. escolher pagamento;
12. criar pedido;
13. receber confirmação;
14. visualizar pedido;
15. acompanhar status.

O administrador deverá conseguir:

1. acessar painel;
2. cadastrar categoria;
3. cadastrar produto;
4. alterar preço;
5. alterar estoque;
6. visualizar pedidos;
7. alterar status do pedido;
8. visualizar clientes.

---

# 77. PADRÃO DE CÓDIGO

Utilizar:

```text
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

Preferir funções pequenas e componentes pequenos.

Nomes devem ser claros.

Evitar:

```text
any
```

exceto quando tecnicamente inevitável e devidamente justificado.

---

# 78. ENTREGA ESPERADA DO CODEX

O Codex deverá construir o sistema incrementalmente.

Antes de implementar cada módulo:

1. analisar a arquitetura;
2. verificar dependências;
3. implementar banco;
4. implementar backend;
5. criar testes;
6. implementar frontend;
7. integrar API;
8. executar lint;
9. executar typecheck;
10. executar testes;
11. corrigir problemas;
12. documentar.

Não gerar código fictício ou endpoints que não existam.

Não criar mocks permanentes onde uma implementação real seja esperada.

Quando uma integração externa ainda não estiver configurada, criar uma interface/adapter claramente identificada, permitindo substituição posterior sem alterar a regra de negócio.

---

# 79. PRIMEIRO OBJETIVO DO CODEX

Começar pela fundação do projeto.

Criar:

```text
Monorepo
Next.js
NestJS
PostgreSQL
Prisma
Redis
Docker Compose
TypeScript strict
ESLint
Prettier
Swagger
Health Check
CI
```

Depois implementar:

```text
Auth
Users
Addresses
Categories
Products
Inventory
Cart
Checkout
Orders
Payments
Shipping
Promotions
Notifications
Admin
```

Não tentar implementar toda a aplicação em uma única alteração.

Trabalhar em incrementos pequenos e verificáveis.

---

# 80. COMANDO INICIAL PARA O CODEX

Ao iniciar o desenvolvimento, primeiro faça uma análise do repositório atual.

Se o projeto estiver vazio, inicialize a arquitetura definida nesta SPEC.

Antes de escrever funcionalidades:

1. crie a estrutura do monorepo;
2. configure o TypeScript;
3. configure lint e prettier;
4. configure Docker;
5. configure PostgreSQL;
6. configure Redis;
7. configure Prisma;
8. configure NestJS;
9. configure Next.js;
10. configure variáveis de ambiente;
11. crie health checks;
12. crie documentação inicial;
13. execute os testes/build/lint;
14. somente depois avance para autenticação.

Sempre preserve a arquitetura descrita nesta SPEC.

Quando houver conflito entre implementação rápida e regra de negócio, priorize a regra de negócio.

Quando houver dúvida arquitetural, prefira a solução mais simples que mantenha:

* segurança;
* testabilidade;
* manutenção;
* escalabilidade;
* separação entre frontend e backend;
* compatibilidade com API REST.

O resultado final deve ser um e-commerce full stack real, organizado e preparado para produção.
