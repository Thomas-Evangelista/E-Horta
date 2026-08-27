import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  migrateTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  getTestPrisma,
} from './test-db.setup';

// Em NODE_ENV=test (definido pelo Jest), o ConfigModule carrega apenas
// test/.env — banco isolado, webhook assinado e sandbox habilitado.

const API = '/api/v1';

interface AuthResult {
  token: string;
  userId: string;
}

async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: false });
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

async function registerAndLogin(email: string): Promise<AuthResult> {
  const password = 'SenhaForte123!';
  const register = await request(app.getHttpServer())
    .post(`${API}/auth/register`)
    .send({
      name: 'Usuário Teste',
      email,
      password,
      confirmPassword: password,
    });
  expect(register.status).toBe(201);

  const { data } = register.body;
  const userId = data.user.id;

  const login = await request(app.getHttpServer())
    .post(`${API}/auth/login`)
    .send({ email, password });
  expect(login.status).toBe(200);

  return { token: login.body.data.tokens.accessToken, userId };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

let app: INestApplication;
const prisma = getTestPrisma();

beforeAll(async () => {
  migrateTestDatabase();
  await seedTestDatabase();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanTestDatabase();
});

describe('Auth — register/login/refresh/logout (E2E)', () => {
  const email = 'e2e-auth@example.com';
  let token: string;

  it('registra um novo usuário', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/register`)
      .send({ name: 'Auth Teste', email, password: 'SenhaForte123!', confirmPassword: 'SenhaForte123!' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    token = res.body.data.tokens.accessToken;
  });

  it('rejeita e-mail duplicado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/register`)
      .send({ name: 'Auth Teste', email, password: 'SenhaForte123!', confirmPassword: 'SenhaForte123!' });
    expect(res.status).toBe(409);
  });

  it('loga com credenciais válidas', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email, password: 'SenhaForte123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it('rejeita senha inválida', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email, password: 'senha-errada' });
    expect(res.status).toBe(401);
  });

  it('acessa /me com o token', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/auth/me`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
  });

  it('nega /me sem token', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('faz logout e invalida o refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email, password: 'SenhaForte123!' });
    const refreshToken = login.body.data.tokens.refreshToken;

    await request(app.getHttpServer())
      .post(`${API}/auth/logout`)
      .set(auth(token));

    const refresh = await request(app.getHttpServer())
      .post(`${API}/auth/refresh`)
      .send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});

describe('Produtos (E2E)', () => {
  it('lista produtos públicos', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/products?limit=10`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('retorna detalhe do produto por slug', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/products/tomate`);
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('tomate');
    expect(res.body.data.price).toBeDefined();
  });

  it('retorna 404 para produto inexistente', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/products/nao-existe`);
    expect(res.status).toBe(404);
  });
});

describe('Carrinho (E2E)', () => {
  let token: string;
  let productId: string;

  beforeAll(async () => {
    const { token: t } = await registerAndLogin(`e2e-cart-${Date.now()}@example.com`);
    token = t;
    const product = await prisma.product.findUniqueOrThrow({
      where: { slug: 'tomate' },
    });
    productId = product.id;
  });

  it('adiciona item ao carrinho autenticado', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/cart/items`)
      .set(auth(token))
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items.some((i: any) => i.productId === productId)).toBe(true);
  });

  it('rejeita quantidade acima do estoque', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/cart/items`)
      .set(auth(token))
      .send({ productId, quantity: 999 });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error?.message)).toContain('Estoque insuficiente');
  });

  it('calcula subtotal corretamente', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/cart`).set(auth(token));
    const items = res.body.data.items as Array<{ quantity: number; unitPrice: number }>;
    const expected = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    expect(res.body.data.subtotal).toBeCloseTo(expected, 2);
  });
});

describe('Checkout completo: endereço → frete → checkout → pagamento → pedido (E2E)', () => {
  let token: string;
  let productId: string;
  const email = `e2e-checkout-${Date.now()}@example.com`;

  beforeAll(async () => {
    const r = await registerAndLogin(email);
    token = r.token;
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: 'tomate' } });
    productId = product.id;
    await request(app.getHttpServer())
      .post(`${API}/cart/items`)
      .set(auth(token))
      .send({ productId, quantity: 3 });
  });

  it('cria endereço', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/addresses`)
      .set(auth(token))
      .send({
        zipCode: '01310100',
        street: 'Av. Paulista',
        number: '100',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        isDefault: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
  });

  it('calcula opções de frete', async () => {
    const addresses = await request(app.getHttpServer())
      .get(`${API}/addresses`)
      .set(auth(token));
    const addressId = addresses.body.data[0].id;

    const res = await request(app.getHttpServer())
      .post(`${API}/shipping/quote`)
      .set(auth(token))
      .send({ addressId, items: [{ productId, quantity: 3 }] });
    expect(res.status).toBe(200);
    const methods = res.body.data.options.map((o: any) => o.method);
    expect(methods).toEqual(expect.arrayContaining(['STANDARD', 'EXPRESS']));
  });

  it('cria o pedido no checkout (PIX) e baixa estoque', async () => {
    const addresses = await request(app.getHttpServer())
      .get(`${API}/addresses`)
      .set(auth(token));
    const addressId = addresses.body.data[0].id;

    const before = await prisma.inventory.findUniqueOrThrow({ where: { productId } });

    const res = await request(app.getHttpServer())
      .post(`${API}/checkout`)
      .set(auth(token))
      .send({ addressId, shippingMethod: 'STANDARD', paymentMethod: 'PIX' });
    expect(res.status).toBe(201);
    const order = res.body.data.order;
    expect(order.id).toBeTruthy();
    expect(order.status).toBe('PENDING_PAYMENT');

    const after = await prisma.inventory.findUniqueOrThrow({ where: { productId } });
    expect(after.reservedQuantity - before.reservedQuantity).toBe(3);
  });

  it('aprova o pagamento via sandbox e move o pedido para PAYMENT_APPROVED', async () => {
    const orders = await request(app.getHttpServer())
      .get(`${API}/orders`)
      .set(auth(token));
    const orderId = orders.body.data[0].id;

    const payment = await request(app.getHttpServer())
      .get(`${API}/payments/order/${orderId}`)
      .set(auth(token));
    const paymentId = payment.body.data.paymentId;

    const sim = await request(app.getHttpServer())
      .post(`${API}/payments/sandbox/${paymentId}/simulate`)
      .set(auth(token))
      .send({ outcome: 'approved' });
    expect(sim.status).toBe(201);
    expect(sim.body.data.orderStatus).toBe('PAYMENT_APPROVED');

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('PAYMENT_APPROVED');

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId } });
    expect(inventory.quantity).toBe(17); // 20 - 3 (baixa definitiva)
  });

  it('lista os pedidos do usuário', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/orders`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Autorização admin (E2E)', () => {
  it('nega acesso admin a cliente', async () => {
    const { token } = await registerAndLogin(`e2e-cust-${Date.now()}@example.com`);
    const res = await request(app.getHttpServer())
      .get(`${API}/admin/dashboard`)
      .set(auth(token));
    expect(res.status).toBe(403);
  });
});
