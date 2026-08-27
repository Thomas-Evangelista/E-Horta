import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * URL do banco de testes isolado (spec 22: "Utilizar banco de testes isolado").
 * O postgres do docker-compose é reutilizado, mas com database própria.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://ehorta:ehorta_dev_2024@localhost:5432/e_horta_test';

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });

/** Aplica as migrations ao banco de testes. */
export function migrateTestDatabase(): void {
  const prismaBin =
    process.env.PRISMA_BIN ??
    (existsSync(resolve(__dirname, '../node_modules/.bin/prisma'))
      ? resolve(__dirname, '../node_modules/.bin/prisma')
      : 'prisma');

  execSync(
    `${prismaBin} migrate deploy --schema=../../../prisma/schema.prisma`,
    {
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test' },
      stdio: 'inherit',
    },
  );
}

/**
 * Seed determinístico para testes: categorias, produtos e estoque com
 * valores fixos (sem aleatoriedade), garantindo asserções estáveis.
 */
export async function seedTestDatabase(): Promise<void> {
  const catVerduras = await prisma.category.upsert({
    where: { slug: 'verduras' },
    update: {},
    create: { name: 'Verduras', slug: 'verduras', description: 'Folhas', sortOrder: 1 },
  });

  const catLegumes = await prisma.category.upsert({
    where: { slug: 'legumes' },
    update: {},
    create: { name: 'Legumes', slug: 'legumes', description: 'Legumes', sortOrder: 2 },
  });

  const created = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'tomate' },
      update: {},
      create: {
        categoryId: catLegumes.id,
        name: 'Tomate',
        slug: 'tomate',
        description: 'Tomate maduro',
        shortDescription: 'Tomate maduro',
        sku: 'LEG-001',
        unit: 'KG',
        price: 8.99,
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'alface' },
      update: {},
      create: {
        categoryId: catVerduras.id,
        name: 'Alface',
        slug: 'alface',
        description: 'Alface fresca',
        shortDescription: 'Alface fresca',
        sku: 'VER-001',
        unit: 'UN',
        price: 3.99,
        isFeatured: true,
      },
    }),
  ]);

  const [tomate, alface] = created;

  await prisma.inventory.upsert({
    where: { productId: tomate.id },
    update: { quantity: 20, reservedQuantity: 0, minimumStock: 5 },
    create: {
      productId: tomate.id,
      quantity: 20,
      reservedQuantity: 0,
      minimumStock: 5,
    },
  });
  await prisma.inventory.upsert({
    where: { productId: alface.id },
    update: { quantity: 10, reservedQuantity: 0, minimumStock: 5 },
    create: {
      productId: alface.id,
      quantity: 10,
      reservedQuantity: 0,
      minimumStock: 5,
    },
  });

  return;
}

/** Limpa os dados mutáveis entre execuções (mantém o schema). */
export async function cleanTestDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
      "refresh_tokens", "notifications", "reviews", "order_items", "orders",
      "payments", "cart_items", "carts", "addresses", "webhook_events",
      "audit_logs", "inventory", "promotions", "users"
      RESTART IDENTITY CASCADE`,
  );
  await prisma.$disconnect();
}

/** Cliente Prisma apontando para o banco de testes (para consultas no teste). */
export function getTestPrisma(): PrismaClient {
  return prisma;
}

/** Retorna o produto "tomate" com seu estoque disponível (0 reserved). */
export async function seedAdminUser(): Promise<void> {
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@ehorta.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@ehorta.com.br',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
}
