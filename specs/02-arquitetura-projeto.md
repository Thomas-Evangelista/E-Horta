# 02 — Arquitetura do Projeto

## Monorepo

Utilizar **pnpm workspaces**.

## Estrutura

```
e-horta/
│
├── apps/
│   │
│   ├── web/                    # Frontend (Next.js)
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
│   ├── api/                    # Backend (NestJS)
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
│   └── admin/                  # Admin (Next.js)
│
├── packages/
│   ├── ui/                     # Componentes compartilhados
│   ├── types/                  # Tipos compartilhados
│   ├── validation/             # Schemas Zod compartilhados
│   ├── eslint-config/
│   └── tsconfig/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
├── docs/
│
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Arquitetura Backend — Modular

Cada módulo deve seguir a separação:

```
controller → service → repository → dto → entity/model → mapper → tests
```

### Estrutura de Módulos

```
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

### Regras

- Não colocar regra de negócio dentro dos controllers.
- Controllers devem: receber request → validar entrada → chamar service → retornar response.
- A regra de negócio deve permanecer nos services/use cases.
