# Deploy

O **E-Horta** roda **sem Docker**: PostgreSQL, Redis e MinIO são instalados
nativamente no host, e cada aplicação (API, Web, Admin) é executada
individualmente, uma em cada terminal.

## Execução local

### 1. Infraestrutura (serviços do sistema / foreground)

```bash
pnpm infra:postgres   # PostgreSQL (serviço do SO)
pnpm infra:redis      # Redis (serviço do SO)
pnpm infra:minio      # MinIO (foreground, terminal próprio)
```

| Serviço   | Porta (host)              |
|-----------|---------------------------|
| PostgreSQL| 5432                      |
| Redis     | 6379                      |
| MinIO     | 9000 (API) / 9001 (console) |
| API       | 8080                      |
| Web       | 3000                      |
| Admin     | 3001                      |

### 2. Aplicações (um terminal para cada)

```bash
pnpm dev:api      # API (porta 8080)
pnpm dev:web      # Web (porta 3000)
pnpm dev:admin    # Admin (porta 3001)
```

## Banco de dados

As migrations são aplicadas manualmente em dev:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Variáveis de ambiente

Para **local**:

```bash
cp .env.example .env
```

Configure as variáveis (nunca commitar .env):

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do PostgreSQL (`postgresql://root:admin123@localhost:5432/e_horta`) |
| `REDIS_URL` | URL do Redis (BullMQ, `redis://localhost:6379`) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | chaves JWT (>= 32 chars) |
| `CORS_ORIGIN` | origem(s) permitida(s) para o CORS do frontend |
| `PAYMENT_PROVIDER` | `sandbox` (dev) ou provedor real |
| `PAYMENT_API_KEY` | chave da API de pagamento |
| `PAYMENT_WEBHOOK_SECRET` | segredo de assinatura HMAC do webhook |
| `ENABLE_SANDBOX_SIMULATE` | `true` habilita o endpoint sandbox (só dev!); **`false` em produção** |
| `S3_*` | endpoint/bucket/credenciais MinIO/S3 (`http://localhost:9000`) |
| `SMTP_*` | credenciais SMTP para e-mails (notificações) |

> Importante: em produção, mantenha `NODE_ENV=production` (desabilita o Swagger)
> e `ENABLE_SANDBOX_SIMULATE=false`.

## CI/CD

A pipeline (GitHub Actions — `.github/workflows/ci.yml`) é:

```
install → lint → typecheck → unit tests → integration tests → build → e2e
```

Um PR **não** é aprovado se lint, TypeScript, testes ou build falharem
(ver `specs/23-ci-cd-documentacao.md`).

## Passos para um deploy real

1. Preparar infraestrutura (host com PostgreSQL, Redis e MinIO)
2. Definir/exportar as variáveis de ambiente de produção
3. Buildar e iniciar cada app (`nest build` + `next build`, depois `start`)
4. Aplicar seed inicial em `1`x (`pnpm db:seed`) se necessário
5. Configurar domínios/reverso proxy para as portas 3000/3001/8080
6. Validar health checks (`/health` e `/ready`) e o site
