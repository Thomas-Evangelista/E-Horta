# E-Horta

Plataforma de e-commerce de hortaliças e produtos frescos.

- **API** — NestJS + PostgreSQL (Prisma) + Redis (BullMQ)
- **Web** — Next.js 15 (loja do cliente)
- **Admin** — Next.js 15 (painel administrativo)

Rodado **sem Docker**: PostgreSQL, Redis e MinIO instalados no host; cada app em um terminal.

## Pré-requisitos

Antes do `pnpm setup`, instale e prepare os serviços que os scripts em `scripts/` esperam encontrar prontos:

- **Node.js >= 20** e **pnpm >= 9** (`corepack enable` habilita a versão fixada em `packageManager`).
- **PostgreSQL** (Ubuntu/Debian: `sudo apt-get install postgresql`) com um usuário `root`/senha `admin123` (mesmas credenciais de `.env.example`):
  ```bash
  sudo -u postgres psql -c "CREATE ROLE root WITH LOGIN SUPERUSER PASSWORD 'admin123';"
  ```
- **Redis** (Ubuntu/Debian: `sudo apt-get install redis-server`).
- **MinIO** (opcional, só para upload de imagens):
  ```bash
  mkdir -p ~/.local/bin
  curl -Lo ~/.local/bin/minio https://dl.min.io/server/minio/release/linux-amd64/minio
  chmod +x ~/.local/bin/minio
  ```

> Ambiente WSL2: se o VS Code/terminal ficar lento ou travando com os serviços rodando, aumente a memória alocada à distro em `C:\Users\<usuário>\.wslconfig` (seção `[wsl2]`, chave `memory`) e rode `wsl --shutdown` no PowerShell para aplicar.

## Como rodar

### 1. Setup (uma vez)

```bash
pnpm setup
```

Cria o `.env`, o banco `e_horta` (+ `e_horta_test` para testes), executa as migrations e o seed.

### 2. Subir o projeto

Abra um terminal para **cada** comando abaixo e deixe rodando:

```bash
pnpm infra:minio   # (opcional) MinIO de upload de imagens
pnpm dev:api       # API     -> http://localhost:8080
pnpm dev:web       # Loja    -> http://localhost:3000
pnpm dev:admin     # Admin   -> http://localhost:3001
```

Todos juntos num terminal só (logs misturados): `pnpm dev:all`.

> PostgreSQL e Redis são serviços do sistema e já devem estar ativos. Se precisar iniciá-los: `pnpm infra:postgres` e `pnpm infra:redis` (usam suas credenciais: Postgres usuário `root` / senha `admin123`).

### Acessos

| Serviço        | URL                          |
|----------------|------------------------------|
| API            | http://localhost:8080       |
| Docs (Swagger) | http://localhost:8080/api/docs |
| Web (Loja)     | http://localhost:3000       |
| Admin          | http://localhost:3001       |
| MinIO Console  | http://localhost:9001       |

Login de teste (do seed): `admin@ehorta.com.br` / `admin123`

## Banco de dados

```bash
pnpm db:setup      # cria bancos + migrations + seed
pnpm db:generate   # gera o Prisma Client
pnpm db:migrate    # aplica migrations (dev)
pnpm db:seed       # popula o banco (idempotente)
pnpm db:reset      # zera o banco e roda o seed
```

Conexão padrão: `postgresql://root:admin123@localhost:5432/e_horta` (definida em `DATABASE_URL` no `.env`).

## Estrutura

```
apps/
  api/      # Backend NestJS (8080)
  web/      # Loja Next.js (3000)
  admin/    # Admin Next.js (3001)
packages/   # Tipos, validações, tsconfig, eslint compartilhados
prisma/     # Schema, migrations e seed
scripts/    # Scripts de start (um por serviço)
```

## Docs

- [`docs/architecture.md`](docs/architecture.md) — arquitetura
- [`docs/api.md`](docs/api.md) — endpoints REST
- [`docs/database.md`](docs/database.md) — schema Prisma
- [`docs/deployment.md`](docs/deployment.md) — deploy e variáveis de ambiente
- [`docs/business-rules.md`](docs/business-rules.md) — regras de negócio
