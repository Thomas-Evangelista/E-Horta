# E-Horta

Plataforma de e-commerce de hortaliças e produtos frescos.

## Stack

- **API** — NestJS (REST + Swagger) · PostgreSQL (Prisma) · Redis (BullMQ)
- **Web** — Next.js 15 (App Router), loja do cliente
- **Admin** — Next.js 15, painel administrativo
- **Infra** — Docker Compose (PostgreSQL, Redis, MinIO)

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) + Docker Compose v2

## Estrutura

```
e-horta/
├── apps/
│   ├── api/          # Backend NestJS (porta 8080)
│   ├── web/          # Frontend Next.js - loja (porta 3000)
│   └── admin/        # Frontend Next.js - admin (porta 3001)
├── packages/
│   ├── types/        # Tipos TypeScript compartilhados
│   ├── validation/   # Validações Zod compartilhadas
│   ├── tsconfig/     # Configurações TypeScript
│   └── eslint-config # Configurações ESLint
├── prisma/           # Schema, migrations e seed
├── specs/            # Especificações das fases
└── docker-compose.yml
```

## Como rodar

### Opção 1: Docker (tudo em containers) — recomendado

```bash
pnpm docker:up
```

O comando faz:

1. **Encerra e remove containers existentes** — se houver algum do projeto em execução, para antes de subir de novo (evita containers duplicados/antigos);
2. Constrói e sobe o stack completo — PostgreSQL, Redis, MinIO, API, Web e Admin.

As migrations são aplicadas automaticamente no boot da API. Para popular o banco com o seed (idempotente), rode uma vez:

```bash
pnpm db:seed
```

Ao final, acesse:

| Serviço       | URL                          |
|---------------|------------------------------|
| API           | http://localhost:8080       |
| Docs (Swagger)| http://localhost:8080/api/docs |
| Web           | http://localhost:3000       |
| Admin         | http://localhost:3001       |
| MinIO Console | http://localhost:9001       |

Parar/suspender tudo:

```bash
pnpm docker:down
```

Acompanhar os logs:

```bash
pnpm docker:logs
```

> **Nota:** em desenvolvimento os containers são criados sem política de restart
> (`restart: unless-stopped` foi removido) e sem `--profile`. Ou seja, um único
> `docker compose up -d` sobe **todos** os serviços, inclusive o Web.

### Opção 2: Infra via Docker + apps locais (hot-reload)

Subir apenas a infraestrutura e rodar as aplicações no host com watch:

```bash
docker compose up -d postgres redis minio
cp .env.example .env   # se ainda não existir
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Em seguida, em 3 terminais:

```bash
pnpm dev:api     # API (porta 8080)
pnpm dev:web     # Web (porta 3000)
pnpm dev:admin   # Admin (porta 3001)
```

Todos de uma vez com o script `dev:all` (log de todos no mesmo terminal).

## Banco de dados

```bash
pnpm db:generate   # Gerar Prisma Client
pnpm db:migrate    # Criar/aplicar migrations (dev)
pnpm db:deploy     # Aplicar migrations pendentes (sem criar novas)
pnpm db:seed       # Popular o banco com dados iniciais
pnpm db:reset      # Resetar o banco (roda seed ao final)
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

Em Docker, a `DATABASE_URL`/`REDIS_URL` internas do compose apontam para os
containers (`postgres:5432`, `redis:6379`); as do `.env` são usadas pelos apps
rodando no host (localhost).

## Login de teste (seed)

Após o seed, o usuário admin criado é:

- **Email:** `admin@ehorta.com.br`
- **Senha:** `Admin123!`

## Comandos úteis

| Comando              | Descrição                                   |
|----------------------|---------------------------------------------|
| `pnpm docker:up`     | Sobe tudo via Docker (para antigos e recria)|
| `pnpm docker:down`   | Para e remove os containers                 |
| `pnpm docker:logs`   | Logs de todos os serviços                   |
| `pnpm dev:api`       | API em dev (watch)                          |
| `pnpm dev:web`       | Web em dev (watch)                          |
| `pnpm dev:admin`     | Admin em dev (watch)                        |
| `pnpm dev:all`       | API + Web + Admin em paralelo               |
| `pnpm build`         | Build da API                                |
| `pnpm build:web`     | Build do Web                                |
| `pnpm build:admin`   | Build do Admin                              |
| `pnpm lint`          | Verificar lint                              |
| `pnpm lint:fix`      | Corrigir lint                               |
| `pnpm format`        | Formatar código                             |
| `pnpm typecheck`     | Verificar tipos                             |
| `pnpm test`          | Rodar testes                                |

## Solução de problemas

- **Web/Admin não respondem:** confira se outra aplicação (ex.: `pnpm dev:web`
  rodando fora do Docker) não está ocupando as portas 3000/3001. Os containers
  escutam em `127.0.0.1` e só sobem junto com o compose.
- **Porta 5432 em uso:** se o PostgreSQL do host já usa 5432, altere o mapeamento
  em `docker-compose.yml` e a `DATABASE_URL` do `.env` de forma coerente.
- **Erros de migração/seed:** rode `pnpm docker:down` e depois `pnpm docker:up`
  novamente — o script recria os containers do zero.
- **Imagem Web não sobe:** o container define `HOSTNAME=0.0.0.0` (o Next
  standalone usa essa variável para o bind). Não é necessário configurar nada.