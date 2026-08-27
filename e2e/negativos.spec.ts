import { expect, request, test } from '@playwright/test';
import {
  API_BASE,
  addProductToCart,
  apiUrl,
  createDefaultAddress,
  fetchFirstProduct,
  goToCheckout,
  loginAsAdmin,
  purchaseViaApi,
  randomUser,
  registerUser,
} from './fixtures';

test.describe('Cenários negativos', () => {
  test('redireciona o checkout para login quando não autenticado', async ({ page }) => {
    await addProductToCart(page, 'tomate');
    await page.goto('/checkout');
    await expect(page).toHaveURL(/login\?redirect=%2Fcheckout/);
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  });

  test('mostra erro para cupom inválido no checkout', async ({ page }) => {
    const user = randomUser();
    await registerUser(page, user);
    await addProductToCart(page, 'tomate');
    await goToCheckout(page);
    await createDefaultAddress(page);

    await page.getByLabel('Código do cupom').fill('CUPOM-INEXISTENTE');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Cupom não encontrado').first()).toBeVisible();
  });

  test('exibe mensagem quando a busca não retorna resultados', async ({ page }) => {
    await page.goto('/busca?q=xyzabc999');
    await expect(page.getByText('Nenhum produto encontrado.')).toBeVisible();
  });

  test('rejeita quantidade acima do estoque disponível via API', async () => {
    const context = await request.newContext({ baseURL: new URL(API_BASE).origin });
    const product = await fetchFirstProduct(context);

    const cartResponse = await context.get(apiUrl('/cart'));
    expect(cartResponse.ok()).toBeTruthy();
    const cartBody = (await cartResponse.json()) as { meta?: { cartToken?: string } };
    const cartToken = cartBody.meta?.cartToken;
    expect(cartToken).toBeTruthy();

    const addResponse = await context.post(apiUrl('/cart/items'), {
      data: { productId: product.id, quantity: 999 },
      headers: cartToken ? { 'x-cart-token': cartToken } : undefined,
    });
    expect(addResponse.status()).toBe(400);
    const body = (await addResponse.json()) as { error?: { message?: string } };
    expect(body.error?.message).toContain('Estoque insuficiente');
  });

  test('recusa o pagamento via sandbox e mantém o pedido pendente', async () => {
    const context = await request.newContext({ baseURL: new URL(API_BASE).origin });
    const { token, orderId, paymentId } = await purchaseViaApi(context, 2);

    const sim = await context.post(apiUrl(`/payments/sandbox/${paymentId}/simulate`), {
      data: { outcome: 'failed' },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sim.status()).toBe(201);
    const simBody = (await sim.json()) as {
      data?: { orderStatus?: string; paymentStatus?: string };
    };
    expect(simBody.data?.orderStatus).toBe('PENDING_PAYMENT');
    expect(simBody.data?.paymentStatus).toBe('FAILED');

    const orders = await context.get(apiUrl('/orders'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(orders.ok()).toBeTruthy();
    const ordersBody = (await orders.json()) as {
      data?: Array<{ id: string; status: string; paymentStatus: string }>;
    };
    const order = ordersBody.data?.find((o) => o.id === orderId);
    expect(order?.status).toBe('PENDING_PAYMENT');
    expect(order?.paymentStatus).toBe('FAILED');
  });

  test('mostra produto indisponível quando o estoque é zerado', async ({ page }) => {
    const context = await request.newContext({ baseURL: new URL(API_BASE).origin });
    const adminToken = await loginAsAdmin(context);
    const product = await fetchFirstProduct(context);

    const patch = await context.patch(apiUrl(`/inventory/${product.id}`), {
      data: { quantity: 0 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(patch.ok()).toBeTruthy();

    try {
      await page.goto(`/produtos/${product.slug}`);
      await expect(page.getByText('Indisponível no momento').first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
      ).toBeDisabled();
    } finally {
      await context.patch(apiUrl(`/inventory/${product.id}`), {
        data: { quantity: 10 },
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
});