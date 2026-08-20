import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'verduras' },
      update: {},
      create: {
        name: 'Verduras',
        slug: 'verduras',
        description: 'Folhas e verduras frescas',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'legumes' },
      update: {},
      create: {
        name: 'Legumes',
        slug: 'legumes',
        description: 'Legumes frescos e variados',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'tuberculos' },
      update: {},
      create: {
        name: 'Tubérculos',
        slug: 'tuberculos',
        description: 'Tubérculos e raízes',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'frutas' },
      update: {},
      create: {
        name: 'Frutas',
        slug: 'frutas',
        description: 'Frutas frescas e naturais',
        sortOrder: 4,
      },
    }),
  ]);

  console.log('✅ Categories created');

  const [verduras, legumes, tuberculos, frutas] = categories;

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'alface' },
      update: {},
      create: {
        categoryId: verduras.id,
        name: 'Alface',
        slug: 'alface',
        description: 'Alface fresca, crocante e saborosa. Ideal para saladas.',
        shortDescription: 'Alface fresca para saladas',
        sku: 'VER-001',
        unit: 'UN',
        price: 3.99,
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'rucula' },
      update: {},
      create: {
        categoryId: verduras.id,
        name: 'Rúcula',
        slug: 'rucula',
        description: 'Rúcula fresca com sabor forte e picante.',
        shortDescription: 'Rúcula fresca e picante',
        sku: 'VER-002',
        unit: 'BUNCH',
        price: 4.49,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'couve' },
      update: {},
      create: {
        categoryId: verduras.id,
        name: 'Couve',
        slug: 'couve',
        description: 'Couve fresca, rica em nutrientes.',
        shortDescription: 'Couve fresca e nutritiva',
        sku: 'VER-003',
        unit: 'BUNCH',
        price: 3.99,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'tomate' },
      update: {},
      create: {
        categoryId: legumes.id,
        name: 'Tomate',
        slug: 'tomate',
        description: 'Tomate maduro, ideal para saladas e molhos.',
        shortDescription: 'Tomate maduro e suculento',
        sku: 'LEG-001',
        unit: 'KG',
        price: 8.99,
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'cenoura' },
      update: {},
      create: {
        categoryId: legumes.id,
        name: 'Cenoura',
        slug: 'cenoura',
        description: 'Cenoura fresca, crocante e doce.',
        shortDescription: 'Cenoura fresca e crocante',
        sku: 'LEG-002',
        unit: 'KG',
        price: 5.49,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'abobrinha' },
      update: {},
      create: {
        categoryId: legumes.id,
        name: 'Abobrinha',
        slug: 'abobrinha',
        description: 'Abobrinha fresca, versátil na cozinha.',
        shortDescription: 'Abobrinha fresca e versátil',
        sku: 'LEG-003',
        unit: 'UN',
        price: 4.99,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'batata' },
      update: {},
      create: {
        categoryId: tuberculos.id,
        name: 'Batata',
        slug: 'batata',
        description: 'Batata fresca, ideal para diversos pratos.',
        shortDescription: 'Batata fresca e versátil',
        sku: 'TUB-001',
        unit: 'KG',
        price: 6.99,
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'batata-doce' },
      update: {},
      create: {
        categoryId: tuberculos.id,
        name: 'Batata-doce',
        slug: 'batata-doce',
        description: 'Batata-doce natural, rica em fibras.',
        shortDescription: 'Batata-doce nutritiva',
        sku: 'TUB-002',
        unit: 'KG',
        price: 7.99,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'mandioca' },
      update: {},
      create: {
        categoryId: tuberculos.id,
        name: 'Mandioca',
        slug: 'mandioca',
        description: 'Mandioca fresca, perfeita para assar ou fritar.',
        shortDescription: 'Mandioca fresca e natural',
        sku: 'TUB-003',
        unit: 'KG',
        price: 5.99,
      },
    }),
    prisma.product.upsert({
      where: { slug: 'banana' },
      update: {},
      create: {
        categoryId: frutas.id,
        name: 'Banana',
        slug: 'banana',
        description: 'Banana madura, doce e saborosa.',
        shortDescription: 'Banana madura e saborosa',
        sku: 'FRU-001',
        unit: 'KG',
        price: 6.49,
        isFeatured: true,
      },
    }),
  ]);

  console.log('✅ Products created');

  // Inventory for all products
  for (const product of products) {
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 50) + 10,
        minimumStock: 5,
      },
    });
  }

  console.log('✅ Inventory created');

  // Admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@ehorta.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@ehorta.com.br',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created');
  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
