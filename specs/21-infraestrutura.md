# 21 — Infraestrutura

## Variáveis de Ambiente

Criar `.env.example`:

```
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

## Docker

Criar ambiente local com:

```
web
api
postgres
redis
```

Opcional:

```
minio
```

para simular S3 localmente.

Comando:

```bash
docker compose up -d
```

## Database Seed

Criar seed inicial contendo:

### Categorias

```
Verduras
Legumes
Tubérculos
Frutas
```

### Produtos de Exemplo

```
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

### Usuário Administrativo

Criar usuário administrativo inicial somente para ambiente de desenvolvimento.

**Nunca utilizar senha administrativa fixa em produção.**
