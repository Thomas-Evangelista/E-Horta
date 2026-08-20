# 04 — Autenticação, Autorização e Segurança

## Autenticação JWT

### Fluxo

```
Login → Access Token → Refresh Token
```

- Access token com validade curta
- Refresh token com rotação
- Nunca armazenar senha em texto puro
- Utilizar Argon2id ou bcrypt com configuração segura

### Endpoints

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me
```

## RBAC — Controle de Acesso Baseado em Roles

### Roles

| Role | Permissões |
|------|-----------|
| CUSTOMER | Comprar, visualizar pedidos, alterar dados próprios |
| OPERATOR | Visualizar pedidos, atualizar status, controlar operações |
| ADMIN | Acesso completo: produtos, categorias, estoque, promoções, usuários, pedidos, configurações |

### Regras

- Nunca confiar na role enviada pelo frontend
- A autorização deve ser validada no backend
- Toda operação administrativa deve ser autorizada no backend

## Segurança

Implementar:

- Helmet
- CORS configurado
- Rate limiting
- Validação de payload
- Sanitização
- Proteção contra SQL injection via ORM
- Proteção contra XSS
- Cookies seguros quando aplicável
- HTTPS em produção
- Secrets via environment
- Logs sem dados sensíveis

### Nunca Logar

- Senha
- Token
- CVV
- Dados completos de cartão
- Secrets

## LGPD

O projeto deverá ser preparado para LGPD.

### Implementar

- Política de privacidade
- Consentimento quando necessário
- Finalidade de coleta
- Exclusão de conta
- Exportação de dados quando aplicável
- Minimização de dados
- Controle de acesso
- Logs de auditoria

### Endpoint de Exclusão

```
DELETE /api/v1/users/me
```

Quando a exclusão física não for possível por obrigação legal, aplicar anonimização adequada.

## Auditoria

### Entidade AuditLog

Registrar ações administrativas importantes:

```
USER_CREATED
PRODUCT_CREATED
PRODUCT_UPDATED
PRICE_CHANGED
STOCK_CHANGED
ORDER_STATUS_CHANGED
PROMOTION_CREATED
USER_BLOCKED
```

### Campos

```
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

## Logging

### Logger Estruturado

Cada request deve possuir `requestId`.

Logs devem permitir rastrear:

```
request → user → endpoint → status → duration → error
```

Separar: INFO, WARN, ERROR, DEBUG.

Nunca colocar secrets nos logs.

## Observabilidade

### Health Checks

```
GET /health
GET /ready
```

Health check deve verificar: aplicação, PostgreSQL, Redis.

Preparar arquitetura para: métricas, health checks, logs estruturados, tracing futuramente.
