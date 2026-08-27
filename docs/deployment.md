# Deploy

O **E-Horta** é implantado com **Docker Compose** (`docker-compose.yml`),
orquestrando todos os serviços (PostgreSQL, Redis, MinIO, API, Web e Admin).

## Implantação local (Docker)

```bash
pnpm docker:up        # sobe/recria a stack completa (--build)
pnpm docker:seed      # seed inicial (idempotente) — se necessário
pnpm docker:down      # para e remove os containers
pnpm docker:logs      # logs de todos os serviços
```

`docker:up` roda `docker compose down --remove-orphans && docker compose up -d --build`.

| Serviço   | Container    | Porta (host) |
|-----------|--------------|--------------|
| PostgreSQL| e-horta-postgres | 5432 |
| Redis     | e-horta-redis    | 6379 |
| MinIO     | e-horta-minio    | 9000 / 9001 (console) |
| API       | e-horta-api      | 8080 |
| Web       | e-horta-web      | 3000 |
| Admin     | e-horta-admin    | 3001 |

## Imagens (Dockerfiles)

As aplicações são construídas com imagens multi-stage:

- `apps/api/Dockerfile` — NestJS (standalone) + `prisma migrate deploy` no boot
- `apps/web/Dockerfile` — Next.js standalone (`HOSTNAME=0.0.0.0`)
- `apps/admin/Dockerfile` — Next.js standalone

As imagens `web`/`admin` recebem os args de build:

```
NEXT_PUBLIC_API_URL  ex.: http://localhost:8080/api/v1
NEXT_PUBLIC_SITE_URL ex.: http://localhost:3000 (web) / :3001 (admin)
```

O `web`/`admin` usam `API_SERVER_URL` para fetches server-side (SSR/metadata)
— em compose, `http://api:8080/api/v1`.

## Variáveis de ambiente

Para **local**:


```bash
cp .env.example .env
```

Para **produção**, configure (nunca commitar .env):

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do PostgreSQL |
| `REDIS_URL` | URL do Redis (BullMQ) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | chaves JWT (>= 32 chars) |
| `CORS_ORIGIN` | origem(s) permitida(s) para o CORS do frontend |
| `PAYMENT_PROVIDER` | `sandbox` (dev) ou provedor real |
| `PAYMENT_API_KEY` | chave da API de pagamento |
| `PAYMENT_WEBHOOK_SECRET` | segredo de assinatura HMAC do webhook |
| `ENABLE_SANDBOX_SIMULATE` | `true` habilita o endpoint sandbox (só dev!); **`false` em produção** |
| `S3_*` | endpoint/bucket/credenciais MinIO/S3 |
| `SMTP_*` | credenciais SMTP para e-mails (notificações) |

> Importante: em produção, mantenha `NODE_ENV=production` (desabilita o Swagger)
> e `ENABLE_SANDBOX_SIMULATE=false`.

## Banco de dados

No boot da API em produção, as migrations são aplicadas automaticamente
(`start:migrate`). Para gerenciar localmente, use os scripts `pnpm db:*`
(ver `docs/database.md`).

## CI/CD

A pipeline (GitHub Actions — `.github/workflows/ci.yml`) é:

```
install → lint → typecheck → unit tests → integration tests → build → e2e
```

Um PR **não** é aprovado se lint, TypeScript, testes ou build falharem
(ver `specs/23-ci-cd-documentacao.md` e `docs/../README.md`).

## Passos para um deploy real

1. Preparar infraestrutura (host/VM com Docker + Compose v2)
2. Definir/exportar as variáveis de ambiente de produção
3. `git clone` e `docker compose up -d --build`
4. Aplicar seed inicial em `1`x (`pnpm db:seed`) se necessário
5. Configurar domínios/reverso proxy para as portas 3000/3001/8080
6. Validar health checks (`/health` e `/ready`) e o site
