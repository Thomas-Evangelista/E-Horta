# 01 — Stack Tecnológica

Utilizar **TypeScript** em todo o projeto.

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod (validação)
- TanStack Query (data fetching, cache, mutations)
- Zustand (estado local/global de UI)
- Lucide React (ícones)
- Framer Motion (animações)

## Backend

- Node.js
- NestJS
- TypeScript
- REST API
- Swagger/OpenAPI (documentação)
- Prisma ORM
- Zod / class-validator (validação)
- JWT (autenticação)
- Argon2 ou bcrypt (senhas)

## Banco de Dados

- PostgreSQL

## Cache

- Redis

Usado para: cache, rate limiting, sessões temporárias, locks de operações críticas, filas (BullMQ).

## Filas

- BullMQ + Redis

Tarefas assíncronas: envio de e-mails, notificações, processamento de pedidos, atualização de status, processamento de webhooks, tarefas administrativas.

## Storage

Armazenamento compatível S3 para imagens de produtos, categorias e documentos. Não armazenar imagens diretamente no PostgreSQL.

## Infraestrutura

- Docker
- Docker Compose (ambiente local)
- Nginx ou reverse proxy equivalente
- PostgreSQL
- Redis

## Testes

**Frontend:**
- Vitest
- React Testing Library
- Playwright (E2E)

**Backend:**
- Jest
- Supertest

## Qualidade

- ESLint
- Prettier
- Husky
- lint-staged
- TypeScript strict mode
