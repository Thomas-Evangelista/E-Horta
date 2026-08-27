import { expect, test } from '@playwright/test';
import {
  createDefaultAddress,
  goToCheckout,
  randomUser,
  registerUser,
} from './fixtures';

test.describe('Fluxo principal de compra', () => {
  test('busca tomate, adiciona ao carrinho, finaliza e aprova pagamento PIX', async ({ page }) => {
    const user = randomUser();
    await registerUser(page, user);

    // Busca pelo header
    await page.goto('/');
    await page.getByPlaceholder('Buscar produtos...').fill('tomate');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/busca\?q=tomate/);
    await expect(page.getByText(/resultados para/i)).toBeVisible();

    // Abre o produto
    const productLink = page.getByRole('link', { name: /tomate/i }).first();
    await productLink.click();
    await expect(page.getByRole('heading', { name: 'Tomate' })).toBeVisible();

    // Adiciona ao carrinho
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Adicionado!', exact: true })).toBeVisible();

    // Carrinho → checkout
    await goToCheckout(page);
    await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible();

    // Endereço → entrega calculada
    await createDefaultAddress(page);

    // Finaliza com PIX e aprova o pagamento
    await page.getByRole('button', { name: /Finalizar compra · PIX/i }).click();
    await expect(page.getByRole('heading', { name: 'Pedido confirmado!' })).toBeVisible();

    await page.getByRole('button', { name: 'Já paguei' }).click();
    await expect(page.getByText('Pagamento aprovado').first()).toBeVisible();
  });
});