# E-Horta

Plataforma de e-commerce de hortaliças e produtos frescos.

- **API** — NestJS + PostgreSQL (Prisma) + Redis (BullMQ)
- **Web** — Next.js 15 (loja do cliente + painel administrativo em `/admin`)

Rodado **sem Docker**, direto no Windows (PowerShell): PostgreSQL, Redis e MinIO instalados nativamente; cada app/serviço sobe em um terminal separado.

## Pré-requisitos

- **Node.js >= 20** e **pnpm >= 9** (`corepack enable` habilita a versão fixada em `packageManager`).
- **PostgreSQL** para Windows ([instalador oficial](https://www.postgresql.org/download/windows/)), rodando como serviço do Windows (inicia sozinho no boot; gerencie em `services.msc` como "postgresql-x64-..."). Crie o usuário `root`/senha `admin123` (mesmas credenciais de `.env.example`) e os dois bancos usados pelo projeto:
  ```powershell
  psql -U postgres -c "CREATE ROLE root WITH LOGIN SUPERUSER PASSWORD 'admin123';"
  psql -U postgres -c "CREATE DATABASE e_horta OWNER root;"
  psql -U postgres -c "CREATE DATABASE e_horta_test OWNER root;"
  ```
- **Redis**: não há build oficial para Windows. Use o [Memurai](https://www.memurai.com/) (compatível com Redis, roda como serviço do Windows) ou o Redis via WSL apenas para esse serviço, se preferir. Confirme que responde em `localhost:6379`.
- **MinIO** (opcional, só para upload de imagens): baixe o binário Windows em https://dl.min.io/server/minio/release/windows-amd64/minio.exe e rode-o num terminal (veja abaixo).

## Como rodar

### 1. Setup (uma vez)

```powershell
copy .env.example .env
pnpm setup
```

Instala dependências, gera o Prisma Client, aplica as migrations e roda o seed no banco `e_horta` (os bancos `e_horta`/`e_horta_test` precisam já existir — passo anterior).

### 2. Subir o projeto

PostgreSQL e Redis já rodam como serviço do Windows em segundo plano (não precisam de terminal). Abra um terminal para **cada** comando abaixo e deixe rodando:

```powershell
.\minio.exe server .\minio-data --console-address ":9001"   # (opcional) upload de imagens
pnpm dev:api       # API           -> http://localhost:8080
pnpm dev:web       # Loja + Admin  -> http://localhost:3000
```

Todos juntos num terminal só (logs misturados): `pnpm dev:all`.

### Acessos

| Serviço        | URL                          |
|----------------|------------------------------|
| API            | http://localhost:8080       |
| Docs (Swagger) | http://localhost:8080/api/docs |
| Web (Loja)     | http://localhost:3000       |
| Admin          | http://localhost:3000/admin |
| MinIO Console  | http://localhost:9001       |

Login de teste (do seed): `admin@ehorta.com.br` / `admin123` (funciona tanto em `/login` quanto em `/admin/login`, mas o acesso ao painel exige `role = ADMIN`).

## Banco de dados

```bash
pnpm setup         # instala deps + gera Prisma Client + migrations + seed
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
  web/      # Loja Next.js (3000) + Admin em /admin (mesmo app/porta)
packages/   # Tipos, validações, tsconfig, eslint compartilhados
prisma/     # Schema, migrations e seed
```

## Docs

- [`docs/architecture.md`](docs/architecture.md) — arquitetura
- [`docs/api.md`](docs/api.md) — endpoints REST
- [`docs/database.md`](docs/database.md) — schema Prisma
- [`docs/deployment.md`](docs/deployment.md) — deploy e variáveis de ambiente
- [`docs/business-rules.md`](docs/business-rules.md) — regras de negócio
