import { expect, request, test } from '@playwright/test';
import {
  API_BASE,
  addProductToCart,
  apiUrl,
  createDefaultAddress,
  fetchFirstProduct,
  goToCheckout,
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
});