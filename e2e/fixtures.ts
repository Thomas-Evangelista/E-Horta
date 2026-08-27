import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1';
export const API_ORIGIN = `${API_BASE}/`;

export interface TestUser {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export function randomUser(): TestUser {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'Teste E2E',
    email: `e2e-${stamp}@example.com`,
    phone: `119${stamp.slice(-8)}`,
    password: 'SenhaForte123!',
  };
}

export async function registerUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/cadastro');
  await page.getByLabel('Nome completo', { exact: true }).fill(user.name);
  await page.getByLabel('E-mail', { exact: true }).fill(user.email);
  await page.getByLabel('Telefone (opcional)', { exact: true }).fill(user.phone);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByLabel('Confirmar senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Conta criada!' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function addProductToCart(page: Page, slug: string, quantity = 1): Promise<void> {
  await page.goto(`/produtos/${slug}`);
  if (quantity > 1) {
    const increase = page.getByRole('button', { name: 'Aumentar quantidade' });
    for (let i = 1; i < quantity; i += 1) await increase.click();
  }
  await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionado!', exact: true })).toBeVisible();
}

export async function goToCheckout(page: Page): Promise<void> {
  await page.goto('/carrinho');
  await page.getByRole('button', { name: 'Finalizar compra' }).click();
  await page.waitForURL('**/checkout');
}

export async function createDefaultAddress(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Novo endereço' }).click();
  await page.getByLabel('CEP', { exact: true }).fill('01310100');
  await page.getByLabel('Número', { exact: true }).fill('100');
  await page.getByLabel('Rua', { exact: true }).fill('Av. Paulista');
  await page.getByLabel('Bairro', { exact: true }).fill('Bela Vista');
  await page.getByLabel('Cidade', { exact: true }).fill('São Paulo');
  await page.getByLabel('UF', { exact: true }).fill('SP');
  await page.getByRole('button', { name: 'Salvar endereço' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Opção de entrega' })).toBeVisible();
}

export const apiUrl = (path: string): string => `${API_BASE}${path}`;

export async function loginAsAdmin(
  request: APIRequestContext,
): Promise<string> {
  const res = await request.post(apiUrl('/auth/login'), {
    data: { email: 'admin@ehorta.com.br', password: 'admin123' },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    data?: { tokens?: { accessToken?: string } };
  };
  const token = body.data?.tokens?.accessToken;
  expect(token).toBeTruthy();
  return token as string;
}

export async function registerViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<{ token: string }> {
  const res = await request.post(apiUrl('/auth/register'), {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    data?: { tokens?: { accessToken?: string } };
  };
  const token = body.data?.tokens?.accessToken;
  expect(token).toBeTruthy();
  return { token: token as string };
}

export interface FetchedProduct {
  id: string;
  name: string;
  slug?: string;
}

export interface ApiCheckout {
  token: string;
  orderId: string;
  paymentId: string;
  productId: string;
}

/** Executa o fluxo completo de compra via API e devolve o pedido/pagamento criado. */
export async function purchaseViaApi(
  request: APIRequestContext,
  quantity: number,
): Promise<ApiCheckout> {
  const user = randomUser();
  const { token } = await registerViaApi(request, user);
  const product = await fetchFirstProduct(request);

  const cart = await request.post(apiUrl('/cart/items'), {
    data: { productId: product.id, quantity },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(cart.ok()).toBeTruthy();

  const addr = await request.post(apiUrl('/addresses'), {
    data: {
      zipCode: '01310100',
      street: 'Av. Paulista',
      number: '100',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      isDefault: true,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(addr.ok()).toBeTruthy();

  const listAddr = await request.get(apiUrl('/addresses'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(listAddr.ok()).toBeTruthy();
  const addrBody = (await listAddr.json()) as { data?: Array<{ id: string }> };
  const addressId = addrBody.data?.[0]?.id;
  expect(addressId).toBeTruthy();

  const check = await request.post(apiUrl('/checkout'), {
    data: { addressId, shippingMethod: 'STANDARD', paymentMethod: 'PIX' },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(check.ok()).toBeTruthy();
  const checkBody = (await check.json()) as { data?: { order?: { id: string } } };
  const orderId = checkBody.data?.order?.id;
  expect(orderId).toBeTruthy();

  const pay = await request.get(apiUrl(`/payments/order/${orderId}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(pay.ok()).toBeTruthy();
  const payBody = (await pay.json()) as { data?: { paymentId?: string } };
  const paymentId = payBody.data?.paymentId;
  expect(paymentId).toBeTruthy();

  return { token, orderId: orderId as string, paymentId: paymentId as string, productId: product.id };
}

export async function fetchFirstProduct(request: APIRequestContext): Promise<{ id: string; name: string; slug: string }> {
  const response = await request.get(apiUrl('/products?limit=1&available=true'));
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data?: Array<{ id: string; name: string; slug: string }>;
  };
  const product = body.data?.[0];
  expect(product).toBeTruthy();
  return product!;
}